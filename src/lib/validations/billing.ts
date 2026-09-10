import { z } from "zod";

export const startSubscriptionSchema = z.object({
  planSlug: z.string().min(1),
  interval: z.enum(["MONTH", "YEAR"]).default("MONTH"),
  provider: z.enum(["mock", "stripe", "paypal", "payu"]).default("mock"),
});
export type StartSubscriptionInput = z.infer<typeof startSubscriptionSchema>;

export const changePlanSchema = z.object({
  subscriptionId: z.string().min(1),
  planSlug: z.string().min(1),
});

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  atPeriodEnd: z.boolean().default(true),
  reason: z.string().max(500).optional(),
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        pricingTierId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(20).default(1),
      }),
    )
    .min(1, "Your cart is empty"),
  provider: z.enum(["mock", "stripe", "paypal", "payu"]).default("mock"),
  billingEmail: z.email(),
  billingName: z.string().min(2).max(120).optional(),
  billingCountry: z.string().length(2).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const requestRefundSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().min(10, "Tell us what went wrong").max(1000),
});

export const resolveRefundSchema = z.object({
  refundId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(1000).optional(),
});
