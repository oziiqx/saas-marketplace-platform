import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireUser } from "@/lib/auth/session";
import { getInvoiceForUser } from "@/server/queries/billing";
import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoiceForUser(user.id, id);
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/billing">
            <ArrowLeft className="size-4" />
            Billing
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="bg-card rounded-xl border p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{siteConfig.name}</p>
            <p className="text-muted-foreground text-sm">Invoice {invoice.number}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Billed to</p>
            <p className="font-medium">{invoice.user.name ?? invoice.user.email}</p>
            <p className="text-muted-foreground">{invoice.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Issued</p>
            <p className="font-medium">{format(invoice.issuedAt, "MMMM d, yyyy")}</p>
            <p className="text-muted-foreground mt-1">
              Period {format(invoice.periodStart, "MMM d")} – {format(invoice.periodEnd, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-center font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(item.amountCents, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 text-right font-medium">
                Total
              </td>
              <td className="pt-3 text-right text-base font-semibold tabular-nums">
                {formatMoney(invoice.totalCents, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="text-muted-foreground mt-8 text-xs">
          This is a demo invoice generated from seeded data. No payment was processed.
        </p>
      </div>
    </div>
  );
}
