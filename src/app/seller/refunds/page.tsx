import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { RefundList } from "@/components/seller/refund-list";
import { NoStorefront } from "@/components/seller/no-storefront";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import { getSellerContext } from "@/lib/auth/seller";
import { listSellerRefunds } from "@/server/queries/seller";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Refunds" };

export default async function SellerRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await getSellerContext();
  if (!profile) {
    return (
      <>
        <PageHeader title="Refunds" />
        <NoStorefront />
      </>
    );
  }

  const query = parseListQuery(await searchParams);
  const result = await listSellerRefunds(profile.id, query);

  return (
    <>
      <PageHeader title="Refund management" description="Review and resolve buyer refund requests." />
      <div className="mb-4">
        <DataTableToolbar
          searchPlaceholder="Search…"
          facets={[
            {
              column: "status",
              title: "Status",
              options: ["REQUESTED", "APPROVED", "PROCESSED", "REJECTED"].map((s) => ({
                label: s.toLowerCase(),
                value: s,
              })),
            },
          ]}
        />
      </div>
      <RefundList
        total={result.total}
        pageCount={result.pageCount}
        rows={result.rows.map((refund) => ({
          id: refund.id,
          orderNumber: refund.order.orderNumber,
          productName: refund.orderItem?.product.name ?? "-",
          amountCents: refund.amountCents,
          currency: refund.currency,
          reason: refund.reason,
          status: refund.status,
          requestedBy: refund.requestedBy.email,
          createdAt: refund.createdAt,
        }))}
      />
    </>
  );
}
