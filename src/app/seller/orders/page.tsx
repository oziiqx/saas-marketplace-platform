import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { FulfillmentList } from "@/components/seller/fulfillment-list";
import { NoStorefront } from "@/components/seller/no-storefront";
import { getSellerContext } from "@/lib/auth/seller";
import { listSellerOrderItems } from "@/server/queries/seller";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Orders" };

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await getSellerContext();
  if (!profile) {
    return (
      <>
        <PageHeader title="Orders" />
        <NoStorefront />
      </>
    );
  }

  const query = parseListQuery(await searchParams);
  const result = await listSellerOrderItems(profile.id, query);

  return (
    <>
      <PageHeader title="Order fulfillment" description="Deliver digital goods and track access." />
      <FulfillmentList
        total={result.total}
        pageCount={result.pageCount}
        rows={result.rows.map((item) => ({
          id: item.id,
          orderNumber: item.order.orderNumber,
          orderStatus: item.order.status,
          buyerEmail: item.order.billingEmail,
          productName: item.product.name,
          tierName: item.pricingTier.name,
          quantity: item.quantity,
          totalCents: item.totalCents,
          fulfillment: item.fulfillment,
          placedAt: item.order.placedAt,
        }))}
      />
    </>
  );
}
