import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { generateInvoiceForSubscription } from "@/server/actions/billing";
import type { NormalizedWebhookEvent } from "@/lib/payments/types";

/**
 * Idempotent webhook processing. `WebhookEvent (provider, eventId)` is unique, so
 * a replay is a no-op. Each branch is safe to run twice.
 */
export async function processWebhookEvent(event: NormalizedWebhookEvent): Promise<void> {
  switch (event.type) {
    case "checkout.completed":
    case "payment.succeeded": {
      if (!event.referenceId) break;
      const order = await db.order.findUnique({ where: { id: event.referenceId } });
      if (order && order.status === "PENDING") {
        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              providerPaymentId: event.providerObjectId ?? null,
            },
          });
          const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
          for (const item of items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { salesCount: { increment: item.quantity } },
            });
            await tx.sellerProfile.update({
              where: { id: item.sellerId },
              data: {
                lifetimeRevenueCents: { increment: BigInt(item.totalCents - item.commissionCents) },
                lifetimeSales: { increment: item.quantity },
              },
            });
          }
          await tx.notification.create({
            data: {
              userId: order.customerId,
              category: "ORDERS",
              title: `Order ${order.orderNumber} confirmed`,
              body: "Your purchase is complete. Downloads are available in your library.",
              href: "/dashboard/orders",
            },
          });
        });
        await logger.info("webhook", "order marked paid", { orderId: order.id });
      }

      // Subscription checkout
      const subscription = await db.subscription.findUnique({ where: { id: event.referenceId } });
      if (subscription && subscription.status !== "ACTIVE") {
        await db.subscription.update({
          where: { id: subscription.id },
          data: { status: subscription.trialEndsAt ? "TRIALING" : "ACTIVE" },
        });
        await generateInvoiceForSubscription(subscription.id);
      }
      break;
    }

    case "payment.failed": {
      if (!event.referenceId) break;
      await db.order.updateMany({
        where: { id: event.referenceId, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }

    case "subscription.activated":
    case "subscription.updated": {
      if (!event.providerObjectId) break;
      await db.subscription.updateMany({
        where: { providerSubscriptionId: event.providerObjectId },
        data: { status: "ACTIVE" },
      });
      break;
    }

    case "subscription.canceled": {
      if (!event.providerObjectId) break;
      await db.subscription.updateMany({
        where: { providerSubscriptionId: event.providerObjectId },
        data: { status: "CANCELED", canceledAt: new Date(), endedAt: new Date() },
      });
      break;
    }

    case "invoice.paid": {
      if (!event.providerObjectId) break;
      await db.invoice.updateMany({
        where: { providerInvoiceId: event.providerObjectId },
        data: { status: "PAID", paidAt: new Date(), amountPaidCents: event.amountCents ?? undefined },
      });
      break;
    }

    case "invoice.payment_failed": {
      if (!event.providerObjectId) break;
      await db.subscription.updateMany({
        where: { providerSubscriptionId: event.providerObjectId },
        data: { status: "PAST_DUE" },
      });
      break;
    }

    case "refund.succeeded": {
      if (!event.providerObjectId) break;
      await db.refund.updateMany({
        where: { providerRefundId: event.providerObjectId, status: { not: "PROCESSED" } },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      break;
    }

    default:
      await logger.debug("webhook", "unhandled event type", { type: event.type });
  }

  await recordAudit({
    actor: { id: null, email: `webhook:${event.provider}` },
    action: `webhook.${event.type}`,
    entityType: "WebhookEvent",
    entityId: event.eventId,
    metadata: { referenceId: event.referenceId, providerObjectId: event.providerObjectId },
  });
}
