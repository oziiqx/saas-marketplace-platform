"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTablePagination } from "@/components/data-table/pagination";
import { formatMoney } from "@/lib/money";
import { resolveRefundAction } from "@/server/actions/refunds";

export type RefundRow = {
  id: string;
  orderNumber: string;
  productName: string;
  amountCents: number;
  currency: string;
  reason: string;
  status: string;
  requestedBy: string;
  createdAt: Date;
};

export function RefundList({
  rows,
  total,
  pageCount,
}: {
  rows: RefundRow[];
  total: number;
  pageCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const resolve = (refundId: string, decision: "APPROVED" | "REJECTED") =>
    startTransition(async () => {
      const r = await resolveRefundAction({ refundId, decision, note: notes[refundId] });
      if (r.ok) toast.success(r.message ?? "Done");
      else toast.error(r.error);
    });

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No refund requests.
          </CardContent>
        </Card>
      ) : (
        rows.map((refund) => (
          <Card key={refund.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {refund.productName}{" "}
                  <span className="text-muted-foreground font-mono text-xs">
                    · {refund.orderNumber}
                  </span>
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {refund.requestedBy} · {format(refund.createdAt, "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={refund.status} />
                <span className="font-medium tabular-nums">
                  {formatMoney(refund.amountCents, refund.currency)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="bg-muted/40 rounded-md border p-3 text-sm">&ldquo;{refund.reason}&rdquo;</p>
              {refund.status === "REQUESTED" ? (
                <>
                  <Textarea
                    placeholder="Internal note (optional)"
                    rows={2}
                    value={notes[refund.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [refund.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolve(refund.id, "APPROVED")} disabled={pending}>
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Approve &amp; refund
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(refund.id, "REJECTED")}
                      disabled={pending}
                    >
                      <X className="size-4" />
                      Reject
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
      <DataTablePagination total={total} pageCount={pageCount} />
    </div>
  );
}
