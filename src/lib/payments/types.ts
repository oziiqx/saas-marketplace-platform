import type { $Enums } from "@prisma/client";

export type PaymentProviderId = "mock" | "stripe" | "paypal" | "payu";

export const PROVIDER_TO_ENUM: Record<PaymentProviderId, $Enums.PaymentProvider> = {
  mock: "MOCK",
  stripe: "STRIPE",
  paypal: "PAYPAL",
  payu: "PAYU",
};

export const ENUM_TO_PROVIDER: Record<$Enums.PaymentProvider, PaymentProviderId> = {
  MOCK: "mock",
  STRIPE: "stripe",
  PAYPAL: "paypal",
  PAYU: "payu",
};

export type LineItem = {
  name: string;
  description?: string;
  amountCents: number;
  currency: string;
  quantity: number;
};

export type CheckoutSessionInput = {
  referenceId: string; // our Order.id or Subscription.id
  mode: "payment" | "subscription";
  customer: { id: string; email: string; name?: string | null };
  lineItems: LineItem[];
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CheckoutSession = {
  provider: PaymentProviderId;
  providerSessionId: string;
  /** Where the browser is sent to complete payment. */
  checkoutUrl: string;
  expiresAt: Date;
};

export type SubscriptionInput = {
  referenceId: string;
  customer: { id: string; email: string; name?: string | null };
  planSlug: string;
  priceCents: number;
  currency: string;
  interval: "MONTH" | "YEAR";
  trialDays?: number;
};

export type ProviderSubscription = {
  provider: PaymentProviderId;
  providerSubscriptionId: string;
  status: $Enums.SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
};

export type RefundInput = {
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  reason?: string;
};

export type ProviderRefund = {
  provider: PaymentProviderId;
  providerRefundId: string;
  amountCents: number;
  status: "pending" | "succeeded" | "failed";
};

/** Normalised shape every provider webhook is mapped onto. */
export type NormalizedWebhookEvent = {
  provider: PaymentProviderId;
  eventId: string;
  type:
    | "checkout.completed"
    | "payment.succeeded"
    | "payment.failed"
    | "subscription.activated"
    | "subscription.updated"
    | "subscription.canceled"
    | "invoice.paid"
    | "invoice.payment_failed"
    | "refund.succeeded"
    | "unknown";
  referenceId?: string;
  providerObjectId?: string;
  amountCents?: number;
  currency?: string;
  occurredAt: Date;
  raw: unknown;
};

export type WebhookVerification =
  | { ok: true; payload: unknown }
  | { ok: false; reason: string };

export interface PaymentProviderAdapter {
  readonly id: PaymentProviderId;
  readonly label: string;
  /** True when the required credentials are present in the environment. */
  isConfigured(): boolean;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  createSubscription(input: SubscriptionInput): Promise<ProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  refund(input: RefundInput): Promise<ProviderRefund>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification>;
  normalizeEvent(payload: unknown): NormalizedWebhookEvent;
}
