import "server-only";
import { db } from "@/lib/db";
import type { OrderView } from "@/components/dashboard/order-list";

export async function getCustomerOrders(userId: string): Promise<OrderView[]> {
  const orders = await db.order.findMany({
    where: { customerId: userId },
    orderBy: { placedAt: "desc" },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          pricingTier: { select: { name: true } },
          refunds: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    totalCents: order.totalCents,
    placedAt: order.placedAt,
    provider: order.provider,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      tierName: item.pricingTier.name,
      quantity: item.quantity,
      totalCents: item.totalCents,
      fulfillment: item.fulfillment,
      refundStatus: item.refunds[0]?.status ?? null,
    })),
  }));
}
