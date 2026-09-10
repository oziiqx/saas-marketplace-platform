import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, KeyRound, Library, Receipt, Bell, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireUser } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/server/queries/dashboard";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getCustomerDashboard(user.id);

  return (
    <>
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0] ?? "there"}`} description="Your account at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lifetime spend" value={formatMoney(data.lifetimeSpendCents)} icon={CreditCard} />
        <StatCard label="Products owned" value={String(data.libraryCount)} icon={Library} />
        <StatCard label="Active API keys" value={String(data.apiKeyCount)} icon={KeyRound} />
        <StatCard label="Unread notifications" value={String(data.unreadNotifications)} icon={Bell} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Your last 5 purchases</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders">
                All orders <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            ) : (
              data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium">{order.orderNumber}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {order.items.map((i) => i.product.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(order.totalCents, order.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activeSubscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{data.activeSubscription.plan.name}</span>
                  <StatusBadge status={data.activeSubscription.status} />
                </div>
                <p className="text-muted-foreground text-sm">
                  {formatMoney(data.activeSubscription.plan.priceCents)} / mo · renews{" "}
                  {format(data.activeSubscription.currentPeriodEnd, "MMM d, yyyy")}
                </p>
                {data.activeSubscription.cancelAtPeriodEnd ? (
                  <Badge variant="warning">Cancels at period end</Badge>
                ) : null}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/dashboard/billing">Manage billing</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">You&apos;re on the free plan.</p>
                <Button asChild size="sm" className="w-full">
                  <Link href="/pricing">See plans</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Billing & invoices", href: "/dashboard/billing", icon: Receipt },
          { title: "API keys", href: "/dashboard/api-keys", icon: KeyRound },
          { title: "Security center", href: "/dashboard/security", icon: CreditCard },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/50 h-full transition-colors">
              <CardContent className="flex items-center gap-3">
                <item.icon className="text-muted-foreground size-5" />
                <span className="font-medium">{item.title}</span>
                <ArrowRight className="text-muted-foreground ml-auto size-4" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
