import { createHmac, timingSafeEqual } from "node:crypto";
import { addDays, addMonths, addYears } from "date-fns";
import { AppError } from "@/lib/result";
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

const API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SEC = 300;

function key(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new AppError("Stripe is not configured (STRIPE_SECRET_KEY missing).", "PROVIDER_ERROR");
  return k;
}

/** Stripe expects application/x-www-form-urlencoded with bracket notation. */
function form(data: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) params.append(k, String(v));
  }
  return params.toString();
}

async function stripeFetch<T>(path: string, body?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } }).error?.message ?? `Stripe error ${res.status}`;
    throw new AppError(message, "PROVIDER_ERROR");
  }
  return json as T;
}

export const stripeProvider: PaymentProviderAdapter = {
  id: "stripe",
  label: "Stripe",
  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY),

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const payload: Record<string, string | number | undefined> = {
      mode: input.mode,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customer.email,
      client_reference_id: input.referenceId,
      "metadata[referenceId]": input.referenceId,
    };
    input.lineItems.forEach((item, i) => {
      payload[`line_items[${i}][quantity]`] = item.quantity;
      payload[`line_items[${i}][price_data][currency]`] = item.currency;
      payload[`line_items[${i}][price_data][unit_amount]`] = item.amountCents;
      payload[`line_items[${i}][price_data][product_data][name]`] = item.name;
      if (input.mode === "subscription") {
        payload[`line_items[${i}][price_data][recurring][interval]`] = "month";
      }
    });

    const session = await stripeFetch<{ id: string; url: string; expires_at: number }>(
      "/checkout/sessions",
      form(payload),
    );
    return {
      provider: "stripe",
      providerSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(session.expires_at * 1000),
    };
  },

  async createSubscription(input: SubscriptionInput): Promise<ProviderSubscription> {
    // Real integration creates a Customer + Subscription with a saved payment
    // method; here we return the projected local state after checkout.
    const now = new Date();
    const trialEndsAt = input.trialDays ? addDays(now, input.trialDays) : null;
    return {
      provider: "stripe",
      providerSubscriptionId: `sub_${input.referenceId}`,
      status: trialEndsAt ? "TRIALING" : "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? (input.interval === "YEAR" ? addYears(now, 1) : addMonths(now, 1)),
      trialEndsAt,
    };
  },

  async cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await stripeFetch(`/subscriptions/${providerSubscriptionId}`, form({ cancel_at_period_end: "true" }));
    } else {
      await fetch(`${API}/subscriptions/${providerSubscriptionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key()}` },
      });
    }
  },

  async refund(input: RefundInput): Promise<ProviderRefund> {
    const refund = await stripeFetch<{ id: string; status: string; amount: number }>(
      "/refunds",
      form({
        payment_intent: input.providerPaymentId,
        amount: input.amountCents,
        reason: "requested_by_customer",
      }),
    );
    return {
      provider: "stripe",
      providerRefundId: refund.id,
      amountCents: refund.amount,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const header = headers.get("stripe-signature");
    if (!secret || !header) return { ok: false, reason: "missing signature or secret" };

    const parts = Object.fromEntries(
      header.split(",").map((kv) => kv.split("=") as [string, string]),
    );
    const timestamp = Number(parts.t);
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SEC) {
      return { ok: false, reason: "timestamp outside tolerance" };
    }
    const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
    const provided = parts.v1 ?? "";
    const match =
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!match) return { ok: false, reason: "signature mismatch" };

    try {
      return { ok: true, payload: JSON.parse(rawBody) as unknown };
    } catch {
      return { ok: false, reason: "invalid json" };
    }
  },

  normalizeEvent(payload: unknown): NormalizedWebhookEvent {
    const evt = payload as { id: string; type: string; created: number; data: { object: Record<string, unknown> } };
    const obj = evt.data?.object ?? {};
    const map: Record<string, NormalizedWebhookEvent["type"]> = {
      "checkout.session.completed": "checkout.completed",
      "payment_intent.succeeded": "payment.succeeded",
      "payment_intent.payment_failed": "payment.failed",
      "customer.subscription.created": "subscription.activated",
      "customer.subscription.updated": "subscription.updated",
      "customer.subscription.deleted": "subscription.canceled",
      "invoice.paid": "invoice.paid",
      "invoice.payment_failed": "invoice.payment_failed",
      "charge.refunded": "refund.succeeded",
    };
    return {
      provider: "stripe",
      eventId: evt.id,
      type: map[evt.type] ?? "unknown",
      referenceId:
        (obj.client_reference_id as string | undefined) ??
        ((obj.metadata as Record<string, string> | undefined)?.referenceId),
      providerObjectId: obj.id as string | undefined,
      amountCents: (obj.amount_total ?? obj.amount ?? obj.amount_paid) as number | undefined,
      currency: obj.currency as string | undefined,
      occurredAt: new Date((evt.created ?? Date.now() / 1000) * 1000),
      raw: payload,
    };
  },
};
