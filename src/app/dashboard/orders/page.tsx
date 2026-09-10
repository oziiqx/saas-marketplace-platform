import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrderList } from "@/components/dashboard/order-list";
import { requireUser } from "@/lib/auth/session";
import { getCustomerOrders } from "@/server/queries/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await getCustomerOrders(user.id);

  return (
    <>
      <PageHeader title="Orders" description="Your purchase history and refund requests." />
      <OrderList orders={orders} />
    </>
  );
}
