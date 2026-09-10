"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { assertUser, assertPermission } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/payments";
import { PROVIDER_TO_ENUM } from "@/lib/payments/types";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { checkoutSchema, requestRefundSchema } from "@/lib/validations/billing";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

const orderNo = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8);

export async function checkoutAction(
  input: unknown,
): Promise<ActionResult<{ orderId: string; checkoutUrl: string }>> {
  try {
    const user = await assertUser();
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const tierIds = parsed.data.items.map((i) => i.pricingTierId);
    const tiers = await db.pricingTier.findMany({
      where: { id: { in: tierIds }, isActive: true },
      include: { product: { select: { id: true, name: true, sellerId: true, status: true } } },
    });
    if (tiers.length !== tierIds.length) {
      return fail("One or more items are no longer available.", { code: "CONFLICT" });
    }

    const sellerIds = [...new Set(tiers.map((t) => t.product.sellerId))];
    const sellers = await db.sellerProfile.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, commissionRate: true },
    });
    const commissionBySeller = new Map(sellers.map((s) => [s.id, Number(s.commissionRate)]));

    const itemsData = parsed.data.items.map((item) => {
      const tier = tiers.find((t) => t.id === item.pricingTierId);
      if (!tier) throw new Error("tier vanished");
      const unit = tier.priceCents;
      const total = unit * item.quantity;
      const rate = commissionBySeller.get(tier.product.sellerId) ?? 0.1;
      return {
        productId: tier.product.id,
        pricingTierId: tier.id,
        sellerId: tier.product.sellerId,
        quantity: item.quantity,
        unitPriceCents: unit,
        totalCents: total,
        commissionCents: Math.round(total * rate),
      };
    });

    const subtotal = itemsData.reduce((s, i) => s + i.totalCents, 0);
    const tax = Math.round(subtotal * 0.0);
    const provider = getPaymentProvider(parsed.data.provider);

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-${orderNo()}`,
        customerId: user.id,
        status: "PENDING",
        currency: tiers[0]?.currency ?? "usd",
        subtotalCents: subtotal,
        taxCents: tax,
        totalCents: subtotal + tax,
        provider: PROVIDER_TO_ENUM[provider.id],
        billingEmail: parsed.data.billingEmail,
        billingName: parsed.data.billingName,
        billingCountry: parsed.data.billingCountry,
        items: { create: itemsData },
      },
    });

    const session = await provider.createCheckoutSession({
      referenceId: order.id,
      mode: "payment",
      customer: { id: user.id, email: parsed.data.billingEmail, name: parsed.data.billingName },
      lineItems: tiers.map((tier) => {
        const qty = parsed.data.items.find((i) => i.pricingTierId === tier.id)?.quantity ?? 1;
        return {
          name: `${tier.product.name} - ${tier.name}`,
          amountCents: tier.priceCents,
          currency: tier.currency,
          quantity: qty,
        };
      }),
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/orders?status=success&order=${order.orderNumber}`,
      cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/cart?status=cancelled`,
    });

    await Promise.all([
      recordAudit({
        actor: { id: user.id, email: user.email },
        action: "order.create",
        entityType: "Order",
        entityId: order.id,
        metadata: { total: order.totalCents, provider: provider.id },
      }),
      logger.info("orders", "order created", { orderId: order.id, total: order.totalCents }),
    ]);

    return ok({ orderId: order.id, checkoutUrl: session.checkoutUrl });
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function requestRefundAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = requestRefundSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const item = await db.orderItem.findFirst({
      where: { id: parsed.data.orderItemId, order: { customerId: user.id } },
      include: { order: true },
    });
    if (!item) return fail("Order item not found.", { code: "NOT_FOUND" });
    if (!["PAID", "FULFILLED", "PARTIALLY_REFUNDED"].includes(item.order.status)) {
      return fail("This order can't be refunded in its current state.", { code: "CONFLICT" });
    }

    const existing = await db.refund.findFirst({
      where: { orderItemId: item.id, status: { in: ["REQUESTED", "APPROVED"] } },
    });
    if (existing) return fail("A refund request is already open for this item.", { code: "CONFLICT" });

    const refund = await db.refund.create({
      data: {
        orderId: item.orderId,
        orderItemId: item.id,
        amountCents: item.totalCents,
        currency: item.order.currency,
        reason: parsed.data.reason,
        requestedById: user.id,
      },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "refund.request",
      entityType: "Refund",
      entityId: refund.id,
      metadata: { orderItemId: item.id },
    });

    revalidatePath("/dashboard/orders");
    return ok(null, "Refund requested. The seller will review it shortly.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function fulfillOrderItemAction(orderItemId: string): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("orders:fulfill:own");
    const profile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) return fail("Seller profile required.", { code: "FORBIDDEN" });

    const item = await db.orderItem.findFirst({
      where: { id: orderItemId, sellerId: profile.id },
      include: { order: true },
    });
    if (!item) return fail("Order item not found.", { code: "NOT_FOUND" });

    await db.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { fulfillment: "DELIVERED" },
      });
      const remaining = await tx.orderItem.count({
        where: { orderId: item.orderId, fulfillment: { not: "DELIVERED" } },
      });
      if (remaining === 0) {
        await tx.order.update({
          where: { id: item.orderId },
          data: { status: "FULFILLED", fulfilledAt: new Date() },
        });
      }
    });

    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "order.fulfill_item",
      entityType: "OrderItem",
      entityId: item.id,
    });
    revalidatePath("/seller/orders");
    return ok(null, "Marked as delivered.");
  } catch (error) {
    return toActionFailure(error);
  }
}
