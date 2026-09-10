import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { CreditCard, Download, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { BillingPanel } from "@/components/dashboard/billing-panel";
import { requireUser } from "@/lib/auth/session";
import { getBillingOverview, getPlans } from "@/server/queries/billing";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser();
  const [overview, plans] = await Promise.all([getBillingOverview(user.id), getPlans()]);

  return (
    <>
      <PageHeader title="Billing" description="Subscription, invoices and payment methods." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lifetime spend" value={formatMoney(overview.lifetimeSpendCents)} icon={Wallet} />
        <StatCard
          label="Open invoices"
          value={String(overview.invoices.filter((i) => i.status === "OPEN").length)}
          icon={CreditCard}
        />
        <StatCard label="Payment methods" value={String(overview.paymentMethods.length)} icon={CreditCard} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BillingPanel
            plans={plans.map((p) => ({ name: p.name, slug: p.slug, priceCents: p.priceCents }))}
            subscription={
              overview.subscription
                ? {
                    id: overview.subscription.id,
                    status: overview.subscription.status,
                    planSlug: overview.subscription.plan.slug,
                    planName: overview.subscription.plan.name,
                    priceCents: overview.subscription.plan.priceCents,
                    currentPeriodEnd: overview.subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: overview.subscription.cancelAtPeriodEnd,
                    trialEndsAt: overview.subscription.trialEndsAt,
                  }
                : null
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.paymentMethods.length === 0 ? (
              <p className="text-muted-foreground text-sm">None on file.</p>
            ) : (
              overview.paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-muted-foreground size-4" />
                    <span className="text-sm capitalize">
                      {pm.brand} ···· {pm.last4}
                    </span>
                  </div>
                  {pm.isDefault ? <Badge variant="muted">default</Badge> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.invoices.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                overview.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">{invoice.number}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(invoice.periodStart, "MMM d")} – {format(invoice.periodEnd, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(invoice.totalCents, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/billing/invoices/${invoice.id}`}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                      >
                        <Download className="size-3.5" />
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
