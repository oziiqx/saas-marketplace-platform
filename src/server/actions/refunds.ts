"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getPaymentProvider } from "@/lib/payments";
import { ENUM_TO_PROVIDER } from "@/lib/payments/types";
import { recordAudit } from "@/lib/audit";
import { resolveRefundSchema } from "@/lib/validations/billing";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

/**
 * Approve/reject a refund. Sellers may resolve refunds on their own items;
 * admins may resolve any. Approval calls the payment provider and flips the
 * order status.
 */
export async function resolveRefundAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = resolveRefundSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const refund = await db.refund.findUnique({
      where: { id: parsed.data.refundId },
      include: { orderItem: true, order: true },
    });
    if (!refund) return fail("Refund not found.", { code: "NOT_FOUND" });
    if (refund.status !== "REQUESTED") {
      return fail("This refund has already been resolved.", { code: "CONFLICT" });
    }

    const isAdmin = can(user.role, "orders:manage:all");
    if (!isAdmin) {
      const profile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
      if (!profile || refund.orderItem?.sellerId !== profile.id) {
        return fail("You can't resolve this refund.", { code: "FORBIDDEN" });
      }
    }

    if (parsed.data.decision === "REJECTED") {
      await db.refund.update({
        where: { id: refund.id },
        data: { status: "REJECTED", processedById: user.id, processedAt: new Date() },
      });
      await recordAudit({
        actor: { id: user.id, email: user.email },
        action: "refund.reject",
        entityType: "Refund",
        entityId: refund.id,
        metadata: { note: parsed.data.note },
      });
      revalidatePath("/seller/refunds");
      revalidatePath("/admin/orders");
      return ok(null, "Refund rejected.");
    }

    const provider = getPaymentProvider(ENUM_TO_PROVIDER[refund.order.provider]);
    let providerRefundId: string | null = null;
    if (refund.order.providerPaymentId) {
      const result = await provider.refund({
        providerPaymentId: refund.order.providerPaymentId,
        amountCents: refund.amountCents,
        currency: refund.currency,
        reason: refund.reason,
      });
      providerRefundId = result.providerRefundId;
    }

    await db.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: "PROCESSED",
          processedById: user.id,
          processedAt: new Date(),
          providerRefundId,
        },
      });

      const items = await tx.orderItem.findMany({ where: { orderId: refund.orderId } });
      const refundedAgg = await tx.refund.aggregate({
        where: { orderId: refund.orderId, status: "PROCESSED" },
        _sum: { amountCents: true },
      });
      const orderTotal = items.reduce((s, i) => s + i.totalCents, 0);
      const refunded = refundedAgg._sum.amountCents ?? 0;

      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: refunded >= orderTotal ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });

      if (refund.orderItem) {
        await tx.orderItem.update({
          where: { id: refund.orderItem.id },
          data: { fulfillment: "ACCESS_REVOKED" },
        });
        await tx.sellerProfile.update({
          where: { id: refund.orderItem.sellerId },
          data: { lifetimeRevenueCents: { decrement: BigInt(refund.amountCents) } },
        });
      }
    });

    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "refund.approve",
      entityType: "Refund",
      entityId: refund.id,
      metadata: { amountCents: refund.amountCents, providerRefundId },
    });

    revalidatePath("/seller/refunds");
    revalidatePath("/admin/orders");
    revalidatePath("/dashboard/orders");
    return ok(null, "Refund processed.");
  } catch (error) {
    return toActionFailure(error);
  }
}
