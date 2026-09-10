import { createHmac, randomUUID } from "node:crypto";
import { addDays, addMonths, addYears } from "date-fns";
import { env } from "@/lib/env";
import { sleep } from "@/lib/utils";
import type {
  CheckoutSession,
  CheckoutSessionInput,
  NormalizedWebhookEvent,
  PaymentProviderAdapter,
  ProviderRefund,
  ProviderSubscription,
  RefundInput,
  SubscriptionInput,
  WebhookVerification,
} from "@/lib/payments/types";

const SECRET = env.AUTH_SECRET;

/**
 * Fully functional in-memory provider. Lets the whole checkout / subscription /
 * refund / webhook flow run with zero external credentials - used in dev, tests
 * and the live demo. Signs its own webhook payloads with HMAC so the verify path
 * is exercised for real.
 */
export const mockProvider: PaymentProviderAdapter = {
  id: "mock",
  label: "Mock (sandbox)",
  isConfigured: () => true,

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    await sleep(120);
    const providerSessionId = `cs_mock_${randomUUID()}`;
    const url = new URL("/checkout/mock", env.NEXT_PUBLIC_APP_URL);
    url.searchParams.set("session", providerSessionId);
    url.searchParams.set("ref", input.referenceId);
    url.searchParams.set("mode", input.mode);
    return {
      provider: "mock",
      providerSessionId,
      checkoutUrl: url.toString(),
      expiresAt: addDays(new Date(), 1),
    };
  },

  async createSubscription(input: SubscriptionInput): Promise<ProviderSubscription> {
    await sleep(120);
    const now = new Date();
    const trialEndsAt = input.trialDays ? addDays(now, input.trialDays) : null;
    const periodEnd =
      input.interval === "YEAR" ? addYears(now, 1) : addMonths(now, 1);
    return {
      provider: "mock",
      providerSubscriptionId: `sub_mock_${randomUUID()}`,
      status: trialEndsAt ? "TRIALING" : "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? periodEnd,
      trialEndsAt,
    };
  },

  async cancelSubscription(): Promise<void> {
    await sleep(80);
  },

  async refund(input: RefundInput): Promise<ProviderRefund> {
    await sleep(100);
    return {
      provider: "mock",
      providerRefundId: `re_mock_${randomUUID()}`,
      amountCents: input.amountCents,
      status: "succeeded",
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const signature = headers.get("x-mock-signature");
    const expected = createHmac("sha256", SECRET).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      return { ok: false, reason: "signature mismatch" };
    }
    try {
      return { ok: true, payload: JSON.parse(rawBody) as unknown };
    } catch {
      return { ok: false, reason: "invalid json" };
    }
  },

  normalizeEvent(payload: unknown): NormalizedWebhookEvent {
    const evt = payload as Record<string, unknown>;
    const data = (evt.data ?? {}) as Record<string, unknown>;
    return {
      provider: "mock",
      eventId: String(evt.id ?? randomUUID()),
      type: (evt.type as NormalizedWebhookEvent["type"]) ?? "unknown",
      referenceId: data.referenceId ? String(data.referenceId) : undefined,
      providerObjectId: data.objectId ? String(data.objectId) : undefined,
      amountCents: typeof data.amountCents === "number" ? data.amountCents : undefined,
      currency: data.currency ? String(data.currency) : undefined,
      occurredAt: evt.occurredAt ? new Date(String(evt.occurredAt)) : new Date(),
      raw: payload,
    };
  },
};

/** Helper for tests / the mock checkout page to sign a synthetic event. */
export function signMockWebhook(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}
