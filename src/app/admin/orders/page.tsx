import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { orderColumns } from "@/components/admin/order-columns";
import { listOrders } from "@/server/queries/admin";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const result = await listOrders(query);

  return (
    <>
      <PageHeader title="Orders" description={`${result.total.toLocaleString()} orders processed`} />
      <DataTable
        columns={orderColumns}
        data={result.rows}
        total={result.total}
        pageCount={result.pageCount}
        searchPlaceholder="Order number or email…"
        facets={[
          {
            column: "status",
            title: "Status",
            options: [
              "PENDING",
              "PAID",
              "FULFILLED",
              "PARTIALLY_REFUNDED",
              "REFUNDED",
              "CANCELLED",
              "FAILED",
            ].map((s) => ({ label: s.replaceAll("_", " ").toLowerCase(), value: s })),
          },
          {
            column: "provider",
            title: "Provider",
            options: ["MOCK", "STRIPE", "PAYPAL", "PAYU"].map((p) => ({
              label: p.toLowerCase(),
              value: p,
            })),
          },
        ]}
      />
    </>
  );
}
