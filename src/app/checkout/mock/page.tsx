import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { MockCheckout } from "@/components/checkout/mock-checkout";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/checkout/mock");
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  const mode = sp.mode === "subscription" ? "subscription" : "payment";
  if (!ref) notFound();

  let title = "";
  let lines: { label: string; amountCents: number }[] = [];
  let totalCents = 0;

  if (mode === "payment") {
    const order = await db.order.findFirst({
      where: { id: ref, customerId: user.id },
      include: { items: { include: { product: { select: { name: true } }, pricingTier: { select: { name: true } } } } },
    });
    if (!order) notFound();
    if (order.status !== "PENDING") redirect(`/dashboard/orders?order=${order.orderNumber}`);
    title = `Order ${order.orderNumber}`;
    lines = order.items.map((item) => ({
      label: `${item.product.name} - ${item.pricingTier.name} ×${item.quantity}`,
      amountCents: item.totalCents,
    }));
    totalCents = order.totalCents;
  } else {
    const sub = await db.subscription.findFirst({
      where: { id: ref, userId: user.id },
      include: { plan: true },
    });
    if (!sub) notFound();
    title = `${sub.plan.name} plan`;
    lines = [{ label: `${sub.plan.name} subscription`, amountCents: sub.plan.priceCents }];
    totalCents = sub.plan.priceCents;
  }

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <ShieldCheck className="size-3.5" />
            Mock gateway
          </span>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm font-medium">{title}</p>
          <div className="mt-4 space-y-2 text-sm">
            {lines.map((line, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{line.label}</span>
                <span className="tabular-nums">{formatMoney(line.amountCents)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(totalCents)}</span>
            </div>
          </div>

          <div className="mt-6">
            <MockCheckout reference={ref} mode={mode} />
          </div>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          This page stands in for a Stripe / PayPal / PayU hosted checkout. Completing it posts a
          signed webhook to <code>/api/webhooks/mock</code>.
        </p>
      </div>
    </div>
  );
}
