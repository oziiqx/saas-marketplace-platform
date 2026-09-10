import "server-only";
import { db } from "@/lib/db";
import { toCents } from "@/lib/money";

export async function getCustomerDashboard(userId: string) {
  const [orders, activeSubscription, apiKeyCount, unreadNotifications, spend] = await Promise.all([
    db.order.findMany({
      where: { customerId: userId },
      orderBy: { placedAt: "desc" },
      take: 5,
      include: { items: { select: { id: true, product: { select: { name: true, slug: true } } } } },
    }),
    db.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      include: { plan: true },
    }),
    db.apiKey.count({ where: { userId, status: "ACTIVE" } }),
    db.notification.count({ where: { userId, readAt: null } }),
    db.invoice.aggregate({ _sum: { amountPaidCents: true }, where: { userId, status: "PAID" } }),
  ]);

  const libraryCount = await db.orderItem.count({
    where: { order: { customerId: userId, status: { in: ["PAID", "FULFILLED"] } } },
  });

  return {
    recentOrders: orders,
    activeSubscription,
    apiKeyCount,
    unreadNotifications,
    lifetimeSpendCents: toCents(spend._sum.amountPaidCents),
    libraryCount,
  };
}

export async function getPurchasedLibrary(userId: string) {
  return db.orderItem.findMany({
    where: { order: { customerId: userId, status: { in: ["PAID", "FULFILLED"] } } },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { name: true, slug: true, thumbnailUrl: true, seller: { select: { storeName: true } } },
      },
      pricingTier: { select: { name: true, interval: true } },
      order: { select: { orderNumber: true, placedAt: true } },
    },
  });
}

export async function getNotifications(userId: string, take = 30) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
