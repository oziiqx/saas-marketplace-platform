import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Your cart</h1>
      <CartView isAuthed={Boolean(user)} email={user?.email ?? ""} />
    </div>
  );
}
