import "server-only";
import Fuse from "fuse.js";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildPageResult, type PageResult, type ParsedListQuery } from "@/lib/pagination";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  priceFromCents: number;
  currency: string;
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
  categoryName: string | null;
  categorySlug: string | null;
  sellerName: string;
  sellerSlug: string;
  hasSubscription: boolean;
};

const CATALOG_SELECT = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  thumbnailUrl: true,
  priceFromCents: true,
  ratingAverage: true,
  ratingCount: true,
  salesCount: true,
  category: { select: { name: true, slug: true } },
  seller: { select: { storeName: true, slug: true } },
  pricingTiers: { select: { currency: true, interval: true }, where: { isActive: true } },
} satisfies Prisma.ProductSelect;

type RawCatalogRow = Prisma.ProductGetPayload<{ select: typeof CATALOG_SELECT }>;

function toCatalogProduct(row: RawCatalogRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    thumbnailUrl: row.thumbnailUrl,
    priceFromCents: row.priceFromCents,
    currency: row.pricingTiers[0]?.currency ?? "usd",
    ratingAverage: Number(row.ratingAverage),
    ratingCount: row.ratingCount,
    salesCount: row.salesCount,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    sellerName: row.seller.storeName,
    sellerSlug: row.seller.slug,
    hasSubscription: row.pricingTiers.some((t) => t.interval !== "ONE_TIME"),
  };
}

export type CatalogFilters = {
  categories: { name: string; slug: string; count: number }[];
  sellers: { name: string; slug: string; count: number }[];
  priceBuckets: { label: string; value: string; count: number }[];
};

const SORT_MAP: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  popular: { salesCount: "desc" },
  rating: { ratingAverage: "desc" },
  newest: { publishedAt: "desc" },
  "price-asc": { priceFromCents: "asc" },
  "price-desc": { priceFromCents: "desc" },
};

const PRICE_BUCKETS: Record<string, Prisma.IntFilter> = {
  "0-2500": { lt: 2500 },
  "2500-10000": { gte: 2500, lt: 10000 },
  "10000-50000": { gte: 10000, lt: 50000 },
  "50000+": { gte: 50000 },
};

/**
 * Storefront listing: DB-level faceted filters + sort + pagination, then an
 * in-memory Fuse.js fuzzy pass over the current page-set when `q` is present.
 */
export async function searchCatalog(
  query: ParsedListQuery & { sortKey?: string },
): Promise<PageResult<CatalogProduct> & { filters: CatalogFilters }> {
  const priceOr = (query.filters.price ?? [])
    .map((b) => PRICE_BUCKETS[b])
    .filter(Boolean) as Prisma.IntFilter[];

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(query.filters.category ? { category: { slug: { in: query.filters.category } } } : {}),
    ...(query.filters.seller ? { seller: { slug: { in: query.filters.seller } } } : {}),
    ...(priceOr.length ? { OR: priceOr.map((priceFromCents) => ({ priceFromCents })) } : {}),
    ...(query.filters.billing?.includes("subscription")
      ? { pricingTiers: { some: { interval: { not: "ONE_TIME" }, isActive: true } } }
      : {}),
  };

  const orderBy = SORT_MAP[query.sortKey ?? "popular"] ?? SORT_MAP.popular;

  // When fuzzy searching, pull a wider candidate set and re-rank client-side.
  const useFuzzy = Boolean(query.q && query.q.length >= 2);
  const take = useFuzzy ? 200 : query.take;
  const skip = useFuzzy ? 0 : query.skip;

  const [rows, total, categoryGroups, sellerGroups] = await Promise.all([
    db.product.findMany({ where, orderBy, skip, take, select: CATALOG_SELECT }),
    db.product.count({ where }),
    db.category.findMany({
      select: { name: true, slug: true, _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
      orderBy: { name: "asc" },
    }),
    db.sellerProfile.findMany({
      where: { status: "ACTIVE" },
      select: {
        storeName: true,
        slug: true,
        _count: { select: { products: { where: { status: "PUBLISHED" } } } },
      },
      orderBy: { storeName: "asc" },
      take: 25,
    }),
  ]);

  let items = rows.map(toCatalogProduct);
  let effectiveTotal = total;

  if (useFuzzy && query.q) {
    const fuse = new Fuse(items, {
      keys: [
        { name: "name", weight: 0.6 },
        { name: "shortDescription", weight: 0.25 },
        { name: "sellerName", weight: 0.15 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
    const ranked = fuse.search(query.q).map((r) => r.item);
    effectiveTotal = ranked.length;
    items = ranked.slice(query.skip, query.skip + query.take);
  }

  const filters: CatalogFilters = {
    categories: categoryGroups
      .filter((c) => c._count.products > 0)
      .map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
    sellers: sellerGroups
      .filter((s) => s._count.products > 0)
      .map((s) => ({ name: s.storeName, slug: s.slug, count: s._count.products })),
    priceBuckets: [
      { label: "Under $25", value: "0-2500" },
      { label: "$25 – $100", value: "2500-10000" },
      { label: "$100 – $500", value: "10000-50000" },
      { label: "$500+", value: "50000+" },
    ].map((b) => ({ ...b, count: 0 })),
  };

  return { ...buildPageResult(items, effectiveTotal, query), filters };
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: { in: ["PUBLISHED", "ARCHIVED"] } },
    include: {
      seller: { select: { storeName: true, slug: true, bio: true, website: true } },
      category: { select: { name: true, slug: true } },
      pricingTiers: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      assets: { select: { fileName: true, fileSizeBytes: true, mimeType: true, version: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });
}

export async function getFeaturedProducts(limit = 6): Promise<CatalogProduct[]> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ salesCount: "desc" }, { ratingAverage: "desc" }],
    take: limit,
    select: CATALOG_SELECT,
  });
  return rows.map(toCatalogProduct);
}
