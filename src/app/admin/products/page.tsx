import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { productColumns } from "@/components/admin/product-columns";
import { listProducts } from "@/server/queries/admin";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const result = await listProducts(query);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${result.total.toLocaleString()} products · moderate, publish, archive`}
      />
      <DataTable
        columns={productColumns}
        data={result.rows}
        total={result.total}
        pageCount={result.pageCount}
        searchPlaceholder="Search products…"
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
