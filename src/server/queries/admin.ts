import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildOrderBy, buildPageResult, type PageResult, type ParsedListQuery } from "@/lib/pagination";

// --- Users ------------------------------------------------------------------

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  ordersCount: number;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export async function listUsers(query: ParsedListQuery): Promise<PageResult<AdminUserRow>> {
  const where: Prisma.UserWhereInput = {
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: "insensitive" } },
            { name: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.filters.role ? { role: { in: query.filters.role as Prisma.EnumRoleFilter["in"] } } : {}),
    ...(query.filters.status
      ? { status: { in: query.filters.status as Prisma.EnumUserStatusFilter["in"] } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: buildOrderBy(
        query.sortBy,
        query.sortDir,
        ["createdAt", "email", "name", "role", "status", "lastLoginAt"] as const,
        "createdAt",
      ),
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return buildPageResult(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image,
      role: r.role,
      status: r.status,
      twoFactorEnabled: r.twoFactorEnabled,
      ordersCount: r._count.orders,
      createdAt: r.createdAt,
      lastLoginAt: r.lastLoginAt,
    })),
    total,
    query,
  );
}

// --- Orders ----------------------------------------------------------------

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: string;
  provider: string;
  totalCents: number;
  currency: string;
  itemCount: number;
  placedAt: Date;
};

export async function listOrders(query: ParsedListQuery): Promise<PageResult<AdminOrderRow>> {
  const where: Prisma.OrderWhereInput = {
    ...(query.q
      ? {
          OR: [
            { orderNumber: { contains: query.q, mode: "insensitive" } },
            { billingEmail: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.filters.status
      ? { status: { in: query.filters.status as Prisma.EnumOrderStatusFilter["in"] } }
      : {}),
    ...(query.filters.provider
      ? { provider: { in: query.filters.provider as Prisma.EnumPaymentProviderFilter["in"] } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: buildOrderBy(
        query.sortBy,
        query.sortDir,
        ["placedAt", "totalCents", "status", "orderNumber"] as const,
        "placedAt",
      ),
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        orderNumber: true,
        billingEmail: true,
        status: true,
        provider: true,
        totalCents: true,
        currency: true,
        placedAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return buildPageResult(
    rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      customerEmail: r.billingEmail,
      status: r.status,
      provider: r.provider,
      totalCents: r.totalCents,
      currency: r.currency,
      itemCount: r._count.items,
      placedAt: r.placedAt,
    })),
    total,
    query,
  );
}

// --- Products -------------------------------------------------------------

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  sellerName: string;
  status: string;
  priceFromCents: number;
  salesCount: number;
  ratingAverage: number;
  createdAt: Date;
};

export async function listProducts(query: ParsedListQuery): Promise<PageResult<AdminProductRow>> {
  const where: Prisma.ProductWhereInput = {
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
        ["createdAt", "name", "salesCount", "priceFromCents", "status"] as const,
        "createdAt",
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
        createdAt: true,
        seller: { select: { storeName: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return buildPageResult(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      sellerName: r.seller.storeName,
      status: r.status,
      priceFromCents: r.priceFromCents,
      salesCount: r.salesCount,
      ratingAverage: Number(r.ratingAverage),
      createdAt: r.createdAt,
    })),
    total,
    query,
  );
}

// --- System logs ---------------------------------------------------------

export type SystemLogRow = {
  id: string;
  level: string;
  source: string;
  message: string;
  context: unknown;
  createdAt: Date;
};

export async function listSystemLogs(query: ParsedListQuery): Promise<PageResult<SystemLogRow>> {
  const where: Prisma.SystemLogWhereInput = {
    ...(query.q ? { message: { contains: query.q, mode: "insensitive" } } : {}),
    ...(query.filters.level
      ? { level: { in: query.filters.level as Prisma.EnumLogLevelFilter["in"] } }
      : {}),
    ...(query.filters.source ? { source: { in: query.filters.source } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.systemLog.findMany({
      where,
      orderBy: { createdAt: query.sortDir },
      skip: query.skip,
      take: query.take,
    }),
    db.systemLog.count({ where }),
  ]);

  return buildPageResult(rows as SystemLogRow[], total, query);
}

// --- Audit logs --------------------------------------------------------

export async function listAuditLogs(query: ParsedListQuery) {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" } },
            { actorEmail: { contains: query.q, mode: "insensitive" } },
            { entityType: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.filters.action ? { action: { in: query.filters.action } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: query.sortDir },
      skip: query.skip,
      take: query.take,
    }),
    db.auditLog.count({ where }),
  ]);

  return buildPageResult(rows, total, query);
}

export async function getAdminOverviewCounts() {
  const [users, sellers, products, orders, openRefunds, failedWebhooks] = await Promise.all([
    db.user.count(),
    db.sellerProfile.count(),
    db.product.count(),
    db.order.count(),
    db.refund.count({ where: { status: "REQUESTED" } }),
    db.webhookEvent.count({ where: { status: "FAILED" } }),
  ]);
  return { users, sellers, products, orders, openRefunds, failedWebhooks };
}
