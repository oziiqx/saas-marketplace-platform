import "server-only";
import { env } from "@/lib/env";
import { AppError } from "@/lib/result";
import { mockProvider } from "@/lib/payments/mock";
import { stripeProvider } from "@/lib/payments/stripe";
import { paypalProvider } from "@/lib/payments/paypal";
import { payuProvider } from "@/lib/payments/payu";
import type { PaymentProviderAdapter, PaymentProviderId } from "@/lib/payments/types";

export * from "@/lib/payments/types";

const REGISTRY: Record<PaymentProviderId, PaymentProviderAdapter> = {
  mock: mockProvider,
  stripe: stripeProvider,
  paypal: paypalProvider,
  payu: payuProvider,
};

/**
 * Resolve a provider adapter. Falls back to `mock` when the requested provider
 * has no credentials, so local/demo checkout always works.
 */
export function getPaymentProvider(id?: PaymentProviderId): PaymentProviderAdapter {
  const requested = id ?? env.PAYMENTS_DEFAULT_PROVIDER;
  const adapter = REGISTRY[requested];
  if (!adapter) throw new AppError(`Unknown payment provider: ${requested}`, "PROVIDER_ERROR");
  if (!adapter.isConfigured()) return mockProvider;
  return adapter;
}

export function requirePaymentProvider(id: PaymentProviderId): PaymentProviderAdapter {
  const adapter = REGISTRY[id];
  if (!adapter?.isConfigured()) {
    throw new AppError(`Payment provider "${id}" is not configured.`, "PROVIDER_ERROR");
  }
  return adapter;
}

export function listProviders(): { id: PaymentProviderId; label: string; configured: boolean }[] {
  return (Object.keys(REGISTRY) as PaymentProviderId[]).map((id) => ({
    id,
    label: REGISTRY[id].label,
    configured: REGISTRY[id].isConfigured(),
  }));
}
