import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { CatalogFacets, CatalogSearchBar } from "@/components/storefront/catalog-controls";
import { DataTablePagination } from "@/components/data-table/pagination";
import { searchCatalog } from "@/server/queries/catalog";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Browse digital products with fuzzy search and faceted filters.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = parseListQuery(sp);
  const sortKey = typeof sp.sort === "string" ? sp.sort : "popular";
  const result = await searchCatalog({ ...query, sortKey });

  const facetGroups = [
    {
      key: "category",
      title: "Category",
      options: result.filters.categories.map((c) => ({ label: c.name, value: c.slug, count: c.count })),
    },
    {
      key: "seller",
      title: "Seller",
      options: result.filters.sellers.slice(0, 12).map((s) => ({ label: s.name, value: s.slug, count: s.count })),
    },
    {
      key: "price",
      title: "Price",
      options: result.filters.priceBuckets.map((b) => ({ label: b.label, value: b.value })),
    },
    {
      key: "billing",
      title: "Billing",
      options: [{ label: "Subscription", value: "subscription" }],
    },
  ];

  return (
    <div className="container-page py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground">
          {result.total.toLocaleString()} digital products from independent sellers.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <CatalogFacets groups={facetGroups} />

        <div className="space-y-6">
          <CatalogSearchBar resultCount={result.total} />

          {result.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border py-20 text-center">
              <PackageOpen className="text-muted-foreground size-8" />
              <p className="font-medium">No products match your filters</p>
              <p className="text-muted-foreground text-sm">Try clearing a filter or searching differently.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {result.rows.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <DataTablePagination total={result.total} pageCount={result.pageCount} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
