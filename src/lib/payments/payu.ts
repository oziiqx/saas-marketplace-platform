import { createHash } from "node:crypto";
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

const API = "https://secure.snd.payu.com"; // sandbox

function config() {
  const posId = process.env.PAYU_POS_ID;
  const md5 = process.env.PAYU_MD5_KEY;
  const clientId = process.env.PAYU_OAUTH_CLIENT_ID;
  const clientSecret = process.env.PAYU_OAUTH_CLIENT_SECRET;
  if (!posId || !md5 || !clientId || !clientSecret) {
    throw new AppError("PayU is not configured.", "PROVIDER_ERROR");
  }
  return { posId, md5, clientId, clientSecret };
}

async function accessToken(): Promise<string> {
  const { clientId, clientSecret } = config();
  const res = await fetch(`${API}/pl/standard/user/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new AppError("PayU auth failed.", "PROVIDER_ERROR");
  return json.access_token;
}

export const payuProvider: PaymentProviderAdapter = {
  id: "payu",
  label: "PayU",
  isConfigured: () =>
    Boolean(
      process.env.PAYU_POS_ID &&
        process.env.PAYU_MD5_KEY &&
        process.env.PAYU_OAUTH_CLIENT_ID &&
        process.env.PAYU_OAUTH_CLIENT_SECRET,
    ),

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession> {
    const { posId } = config();
    const token = await accessToken();
    const total = input.lineItems.reduce((s, li) => s + li.amountCents * li.quantity, 0);
    const res = await fetch(`${API}/api/v2_1/orders`, {
      method: "POST",
      redirect: "manual",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        customerIp: "127.0.0.1",
        merchantPosId: posId,
        description: `Order ${input.referenceId}`,
        currencyCode: (input.lineItems[0]?.currency ?? "PLN").toUpperCase(),
        totalAmount: String(total),
        extOrderId: input.referenceId,
        continueUrl: input.successUrl,
        notifyUrl: new URL("/api/webhooks/payu", process.env.NEXT_PUBLIC_APP_URL).toString(),
        buyer: { email: input.customer.email, firstName: input.customer.name ?? "Customer" },
        products: input.lineItems.map((li) => ({
          name: li.name,
          unitPrice: String(li.amountCents),
          quantity: String(li.quantity),
        })),
      }),
    });
    const json = (await res.json()) as { redirectUri?: string; orderId?: string };
    if (!json.redirectUri || !json.orderId) throw new AppError("PayU order failed.", "PROVIDER_ERROR");
    return {
      provider: "payu",
      providerSessionId: json.orderId,
      checkoutUrl: json.redirectUri,
      expiresAt: addDays(new Date(), 1),
    };
  },

  async createSubscription(input: SubscriptionInput): Promise<ProviderSubscription> {
    const now = new Date();
    const trialEndsAt = input.trialDays ? addDays(now, input.trialDays) : null;
    return {
      provider: "payu",
      providerSubscriptionId: `payu_sub_${input.referenceId}`,
      status: trialEndsAt ? "TRIALING" : "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? (input.interval === "YEAR" ? addYears(now, 1) : addMonths(now, 1)),
      trialEndsAt,
    };
  },

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const token = await accessToken();
    await fetch(`${API}/api/v2_1/subscriptions/${providerSubscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async refund(input: RefundInput): Promise<ProviderRefund> {
    const token = await accessToken();
    const res = await fetch(`${API}/api/v2_1/orders/${input.providerPaymentId}/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        refund: { description: input.reason ?? "Customer refund", amount: String(input.amountCents) },
      }),
    });
    const json = (await res.json()) as { refund?: { refundId?: string; status?: string } };
    return {
      provider: "payu",
      providerRefundId: json.refund?.refundId ?? `payu_re_${Date.now()}`,
      amountCents: input.amountCents,
      status: json.refund?.status === "FINALIZED" ? "succeeded" : "pending",
    };
  },

  /**
   * PayU signs notifications with `OpenPayu-Signature: signature=<md5>;algorithm=MD5`
   * where the digest is md5(rawBody + MD5_KEY).
   */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const { md5 } = config();
    const header = headers.get("openpayu-signature") ?? headers.get("x-openpayu-signature");
    if (!header) return { ok: false, reason: "missing OpenPayu-Signature" };
    const provided = Object.fromEntries(
      header.split(";").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
    ).signature;
    const expected = createHash("md5").update(rawBody + md5).digest("hex");
    if (provided !== expected) return { ok: false, reason: "signature mismatch" };
    try {
      return { ok: true, payload: JSON.parse(rawBody) as unknown };
    } catch {
      return { ok: false, reason: "invalid json" };
    }
  },

  normalizeEvent(payload: unknown): NormalizedWebhookEvent {
    const evt = payload as { order?: Record<string, unknown> };
    const order = evt.order ?? {};
    const status = String(order.status ?? "");
    const map: Record<string, NormalizedWebhookEvent["type"]> = {
      COMPLETED: "payment.succeeded",
      CANCELED: "payment.failed",
      PENDING: "checkout.completed",
    };
    return {
      provider: "payu",
      eventId: `${order.orderId ?? "unknown"}:${status}`,
      type: map[status] ?? "unknown",
      referenceId: order.extOrderId as string | undefined,
      providerObjectId: order.orderId as string | undefined,
      amountCents: order.totalAmount ? Number(order.totalAmount) : undefined,
      currency: (order.currencyCode as string | undefined)?.toLowerCase(),
      occurredAt: new Date(),
      raw: payload,
    };
  },
};
