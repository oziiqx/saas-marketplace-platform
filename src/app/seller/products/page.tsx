import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { sellerProductColumns } from "@/components/seller/product-columns";
import { NoStorefront } from "@/components/seller/no-storefront";
import { getSellerContext } from "@/lib/auth/seller";
import { listSellerProducts } from "@/server/queries/seller";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Products" };

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await getSellerContext();
  if (!profile) {
    return (
      <>
        <PageHeader title="Products" />
        <NoStorefront />
      </>
    );
  }

  const query = parseListQuery(await searchParams);
  const result = await listSellerProducts(profile.id, query);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${result.total} products in ${profile.storeName}`}
        actions={
          <Button asChild size="sm">
            <Link href="/seller/products/new">
              <Plus className="size-4" />
              New product
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={sellerProductColumns}
        data={result.rows}
        total={result.total}
        pageCount={result.pageCount}
        searchPlaceholder="Search your products…"
        facets={[
          {
            column: "status",
            title: "Status",
            options: ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => ({
              label: s.replaceAll("_", " ").toLowerCase(),
              value: s,
            })),
          },
        ]}
      />
    </>
  );
}
