import "server-only";
import { subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildOrderBy, buildPageResult, type PageResult, type ParsedListQuery } from "@/lib/pagination";
import { toCents } from "@/lib/money";

export async function getSellerDashboard(sellerId: string) {
  const d30 = subDays(new Date(), 30);
  const [seller, productCounts, revenue30d, orders30d, pendingRefunds, topProducts] =
    await Promise.all([
      db.sellerProfile.findUnique({ where: { id: sellerId } }),
      db.product.groupBy({ by: ["status"], where: { sellerId }, _count: true }),
      db.orderItem.aggregate({
        _sum: { totalCents: true, commissionCents: true },
        where: { sellerId, order: { status: { in: ["PAID", "FULFILLED"] } }, createdAt: { gte: d30 } },
      }),
      db.orderItem.count({ where: { sellerId, createdAt: { gte: d30 } } }),
      db.refund.count({ where: { orderItem: { sellerId }, status: "REQUESTED" } }),
      db.product.findMany({
        where: { sellerId },
        orderBy: { salesCount: "desc" },
        take: 5,
        select: { id: true, name: true, slug: true, salesCount: true, priceFromCents: true, ratingAverage: true },
      }),
    ]);

  const gross30d = toCents(revenue30d._sum.totalCents);
  const commission30d = toCents(revenue30d._sum.commissionCents);

  return {
    seller,
    productCounts: Object.fromEntries(productCounts.map((p) => [p.status, p._count])) as Record<
      string,
      number
    >,
    gross30dCents: gross30d,
    net30dCents: gross30d - commission30d,
    commission30dCents: commission30d,
    orders30d,
    pendingRefunds,
    topProducts: topProducts.map((p) => ({ ...p, ratingAverage: Number(p.ratingAverage) })),
    lifetimeRevenueCents: toCents(seller?.lifetimeRevenueCents),
    lifetimeSales: seller?.lifetimeSales ?? 0,
  };
}

export async function listSellerProducts(
  sellerId: string,
  query: ParsedListQuery,
): Promise<PageResult<{
  id: string;
  name: string;
  slug: string;
  status: string;
  priceFromCents: number;
  salesCount: number;
  ratingAverage: number;
  tierCount: number;
  updatedAt: Date;
}>> {
  const where: Prisma.ProductWhereInput = {
    sellerId,
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.filters.status
      ? { status: { in: query.filters.status as Prisma.EnumProductStatusFilter["in"] } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: buildOrderBy(
        query.sortBy,
        query.sortDir,
        ["updatedAt", "name", "salesCount", "priceFromCents"] as const,
        "updatedAt",
      ),
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        priceFromCents: true,
        salesCount: true,
        ratingAverage: true,
        updatedAt: true,
        _count: { select: { pricingTiers: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return buildPageResult(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      priceFromCents: r.priceFromCents,
      salesCount: r.salesCount,
      ratingAverage: Number(r.ratingAverage),
      tierCount: r._count.pricingTiers,
      updatedAt: r.updatedAt,
    })),
    total,
    query,
  );
}

export async function listSellerOrderItems(sellerId: string, query: ParsedListQuery) {
  const where: Prisma.OrderItemWhereInput = {
    sellerId,
    ...(query.q ? { order: { orderNumber: { contains: query.q, mode: "insensitive" } } } : {}),
    ...(query.filters.fulfillment
      ? { fulfillment: { in: query.filters.fulfillment as Prisma.EnumFulfillmentStatusFilter["in"] } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.orderItem.findMany({
      where,
      orderBy: { createdAt: query.sortDir },
      skip: query.skip,
      take: query.take,
      include: {
        order: { select: { orderNumber: true, status: true, billingEmail: true, placedAt: true } },
        product: { select: { name: true, slug: true } },
        pricingTier: { select: { name: true } },
      },
    }),
    db.orderItem.count({ where }),
  ]);

  return buildPageResult(rows, total, query);
}

export async function listSellerRefunds(sellerId: string, query: ParsedListQuery) {
  const where: Prisma.RefundWhereInput = {
    orderItem: { sellerId },
    ...(query.filters.status
      ? { status: { in: query.filters.status as Prisma.EnumRefundStatusFilter["in"] } }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.refund.findMany({
      where,
      orderBy: { createdAt: query.sortDir },
      skip: query.skip,
      take: query.take,
      include: {
        order: { select: { orderNumber: true } },
        orderItem: { select: { product: { select: { name: true } } } },
        requestedBy: { select: { name: true, email: true } },
      },
    }),
    db.refund.count({ where }),
  ]);
  return buildPageResult(rows, total, query);
}
