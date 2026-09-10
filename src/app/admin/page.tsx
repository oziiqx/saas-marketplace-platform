import type { Metadata } from "next";
import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  Users,
  Repeat,
  ArrowUpRight,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RevenueAreaChart,
  AcquisitionBarChart,
  ChurnLineChart,
  PlanDonut,
} from "@/components/charts/charts";
import {
  getKpiSummary,
  getRevenueSeries,
  getAcquisitionSeries,
  getChurnSeries,
  getPlanBreakdown,
  getTopSellers,
} from "@/server/queries/analytics";
import { getAdminOverviewCounts } from "@/server/queries/admin";
import { formatMoney, formatMoneyCompact, formatNumberCompact, formatPercent } from "@/lib/money";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [kpi, revenue, acquisition, churn, plans, topSellers, counts] = await Promise.all([
    getKpiSummary(),
    getRevenueSeries(90),
    getAcquisitionSeries(30),
    getChurnSeries(60),
    getPlanBreakdown(),
    getTopSellers(5),
    getAdminOverviewCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Revenue, retention and acquisition across the platform."
        actions={
          counts.openRefunds + counts.failedWebhooks > 0 ? (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="size-3.5" />
              {counts.openRefunds} refunds · {counts.failedWebhooks} webhook failures
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatMoney(kpi.mrrCents, "usd", { maximumFractionDigits: 0 })}
          icon={DollarSign}
          hint={`ARR ${formatMoneyCompact(kpi.arrCents)}`}
        />
        <StatCard
          label="Net MRR retention"
          value={formatPercent(kpi.netMrrRetention)}
          icon={Repeat}
          delta={kpi.netMrrRetention - 1}
          hint="trailing 30 days"
        />
        <StatCard
          label="Revenue churn"
          value={formatPercent(kpi.grossRevenueChurnRate)}
          icon={TrendingDown}
          delta={kpi.grossRevenueChurnRate}
          deltaInverse
          hint={`${formatPercent(kpi.customerChurnRate)} of customers`}
        />
        <StatCard
          label="New users (30d)"
          value={formatNumberCompact(kpi.newUsers30d)}
          icon={Users}
          delta={kpi.userGrowthRate}
          hint={`vs ${kpi.newUsersPrev30d} prior`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recurring revenue</CardTitle>
            <CardDescription>MRR vs net revenue - last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={revenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR by plan</CardTitle>
            <CardDescription>
              {formatMoneyCompact(plans.reduce((s, p) => s + p.mrrCents, 0))} committed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanDonut data={plans} />
            <ul className="mt-2 space-y-1 text-sm">
              {plans.map((plan) => (
                <li key={plan.slug} className="flex items-center justify-between">
                  <span>{plan.planName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {plan.subscribers} · {formatMoneyCompact(plan.mrrCents)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User acquisition</CardTitle>
            <CardDescription>New signups per day - last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <AcquisitionBarChart data={acquisition} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Churn rate</CardTitle>
            <CardDescription>Daily cancellations ÷ active subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <ChurnLineChart data={churn} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sellers</CardTitle>
            <CardDescription>By lifetime net revenue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSellers.map((seller, i) => (
              <div key={seller.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-5 text-sm tabular-nums">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{seller.storeName}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatNumberCompact(seller.sales)} sales
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoneyCompact(seller.revenueCents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform totals</CardTitle>
            <CardDescription>Live counts from the database</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { label: "Users", value: counts.users, href: "/admin/users", icon: Users },
              { label: "Sellers", value: counts.sellers, href: "/admin/users", icon: ShoppingBag },
              { label: "Products", value: counts.products, href: "/admin/products", icon: ShoppingBag },
              { label: "Orders", value: counts.orders, href: "/admin/orders", icon: ShoppingBag },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:bg-accent group rounded-lg border p-4 transition-colors"
              >
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  {item.label}
                  <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatNumberCompact(item.value)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
