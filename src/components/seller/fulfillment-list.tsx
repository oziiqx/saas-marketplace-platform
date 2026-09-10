"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import { DataTablePagination } from "@/components/data-table/pagination";
import { formatMoney } from "@/lib/money";
import { fulfillOrderItemAction } from "@/server/actions/orders";

export type FulfillmentRow = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  buyerEmail: string;
  productName: string;
  tierName: string;
  quantity: number;
  totalCents: number;
  fulfillment: string;
  placedAt: Date;
};

export function FulfillmentList({
  rows,
  total,
  pageCount,
}: {
  rows: FulfillmentRow[];
  total: number;
  pageCount: number;
}) {
  const [pending, startTransition] = useTransition();

  const fulfill = (id: string) =>
    startTransition(async () => {
      const r = await fulfillOrderItemAction(id);
      if (r.ok) toast.success(r.message ?? "Delivered");
      else toast.error(r.error);
    });

  return (
    <div className="space-y-3">
      <DataTableToolbar
        searchPlaceholder="Order number…"
        facets={[
          {
            column: "fulfillment",
            title: "Fulfillment",
            options: [
              { label: "pending", value: "PENDING" },
              { label: "delivered", value: "DELIVERED" },
              { label: "access revoked", value: "ACCESS_REVOKED" },
            ],
          },
        ]}
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Order</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No order items.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-mono text-xs">{row.orderNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(row.placedAt, "MMM d, yyyy")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{row.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.tierName} · ×{row.quantity}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.buyerEmail}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.totalCents)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.fulfillment} />
                  </TableCell>
                  <TableCell className="text-right">
                    {row.fulfillment === "PENDING" &&
                    ["PAID", "FULFILLED"].includes(row.orderStatus) ? (
                      <Button size="sm" variant="outline" onClick={() => fulfill(row.id)} disabled={pending}>
                        {pending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <PackageCheck className="size-4" />
                        )}
                        Deliver
                      </Button>
                    ) : row.fulfillment === "DELIVERED" ? (
                      <CheckCircle2 className="text-success ml-auto size-4" />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination total={total} pageCount={pageCount} />
    </div>
  );
}
