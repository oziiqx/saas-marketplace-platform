import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiAuth } from "@/server/api/authenticate";

export const runtime = "nodejs";

/**
 * GET /api/v1/products?limit=&cursor=&q=
 * Public, API-key authenticated (scope: products:read), rate-limited per key.
 */
export const GET = withApiAuth("products:read", async (req) => {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const cursor = url.searchParams.get("cursor");
  const q = url.searchParams.get("q")?.trim();

  const rows = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      priceFromCents: true,
      ratingAverage: true,
      salesCount: true,
      seller: { select: { storeName: true, slug: true } },
      category: { select: { name: true, slug: true } },
      pricingTiers: {
        where: { isActive: true },
        select: { name: true, priceCents: true, currency: true, interval: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.shortDescription,
    price_from_cents: p.priceFromCents,
    rating: Number(p.ratingAverage),
    sales: p.salesCount,
    seller: p.seller,
    category: p.category,
    pricing_tiers: p.pricingTiers.map((t) => ({
      name: t.name,
      price_cents: t.priceCents,
      currency: t.currency,
      interval: t.interval.toLowerCase(),
    })),
  }));

  return NextResponse.json({
    object: "list",
    data,
    has_more: hasMore,
    next_cursor: hasMore ? data[data.length - 1]?.id : null,
  });
});
