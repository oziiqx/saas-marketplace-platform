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

const API = "https://api-m.sandbox.paypal.com";

function creds(): { id: string; secret: string } {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new AppError("PayPal is not configured.", "PROVIDER_ERROR");
  return { id, secret };
}

async function accessToken(): Promise<string> {
  const { id, secret } = creds();
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new AppError("PayPal auth failed.", "PROVIDER_ERROR");
  return json.access_token;
}

async function ppFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) throw new AppError(`PayPal error ${res.status}`, "PROVIDER_ERROR");
  return json as T;
}

export const paypalProvider: PaymentProviderAdapter = {
  id: "paypal",
  label: "PayPal",
  isConfigured: () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const total = input.lineItems.reduce((s, li) => s + li.amountCents * li.quantity, 0);
    const currency = (input.lineItems[0]?.currency ?? "usd").toUpperCase();
    const order = await ppFetch<{ id: string; links: { rel: string; href: string }[] }>(
      "/v2/checkout/orders",
      {
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: input.referenceId,
              amount: { currency_code: currency, value: (total / 100).toFixed(2) },
            },
          ],
          application_context: { return_url: input.successUrl, cancel_url: input.cancelUrl },
        }),
      },
    );
    const approve = order.links.find((l) => l.rel === "approve")?.href;
    if (!approve) throw new AppError("PayPal did not return an approval link.", "PROVIDER_ERROR");
    return {
      provider: "paypal",
      providerSessionId: order.id,
      checkoutUrl: approve,
      expiresAt: addDays(new Date(), 1),
    };
  },

  async createSubscription(input: SubscriptionInput): Promise<ProviderSubscription> {
    const now = new Date();
    const trialEndsAt = input.trialDays ? addDays(now, input.trialDays) : null;
    return {
      provider: "paypal",
      providerSubscriptionId: `I-${input.referenceId.toUpperCase()}`,
      status: trialEndsAt ? "TRIALING" : "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? (input.interval === "YEAR" ? addYears(now, 1) : addMonths(now, 1)),
      trialEndsAt,
    };
  },

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await ppFetch(`/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
  },

  async refund(input: RefundInput): Promise<ProviderRefund> {
    const refund = await ppFetch<{ id: string; status: string }>(
      `/v2/payments/captures/${input.providerPaymentId}/refund`,
      {
        method: "POST",
        body: JSON.stringify({
          amount: {
            value: (input.amountCents / 100).toFixed(2),
            currency_code: input.currency.toUpperCase(),
          },
        }),
      },
    );
    return {
      provider: "paypal",
      providerRefundId: refund.id,
      amountCents: input.amountCents,
      status: refund.status === "COMPLETED" ? "succeeded" : "pending",
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return { ok: false, reason: "PAYPAL_WEBHOOK_ID missing" };
    try {
      const verification = await ppFetch<{ verification_status: string }>(
        "/v1/notifications/verify-webhook-signature",
        {
          method: "POST",
          body: JSON.stringify({
            auth_algo: headers.get("paypal-auth-algo"),
            cert_url: headers.get("paypal-cert-url"),
            transmission_id: headers.get("paypal-transmission-id"),
            transmission_sig: headers.get("paypal-transmission-sig"),
            transmission_time: headers.get("paypal-transmission-time"),
            webhook_id: webhookId,
            webhook_event: JSON.parse(rawBody) as unknown,
          }),
        },
      );
      return verification.verification_status === "SUCCESS"
        ? { ok: true, payload: JSON.parse(rawBody) as unknown }
        : { ok: false, reason: "verification_status != SUCCESS" };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "verify failed" };
    }
  },

  normalizeEvent(payload: unknown): NormalizedWebhookEvent {
    const evt = payload as {
      id: string;
      event_type: string;
      create_time: string;
      resource: Record<string, unknown>;
    };
    const map: Record<string, NormalizedWebhookEvent["type"]> = {
      "CHECKOUT.ORDER.APPROVED": "checkout.completed",
      "PAYMENT.CAPTURE.COMPLETED": "payment.succeeded",
      "PAYMENT.CAPTURE.DENIED": "payment.failed",
      "PAYMENT.CAPTURE.REFUNDED": "refund.succeeded",
      "BILLING.SUBSCRIPTION.ACTIVATED": "subscription.activated",
      "BILLING.SUBSCRIPTION.UPDATED": "subscription.updated",
      "BILLING.SUBSCRIPTION.CANCELLED": "subscription.canceled",
    };
    const amount = (evt.resource?.amount ?? {}) as { value?: string; currency_code?: string };
    return {
      provider: "paypal",
      eventId: evt.id,
      type: map[evt.event_type] ?? "unknown",
      referenceId: (evt.resource?.custom_id ?? evt.resource?.reference_id) as string | undefined,
      providerObjectId: evt.resource?.id as string | undefined,
      amountCents: amount.value ? Math.round(Number(amount.value) * 100) : undefined,
      currency: amount.currency_code?.toLowerCase(),
      occurredAt: new Date(evt.create_time ?? Date.now()),
      raw: payload,
    };
  },
};
