"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney } from "@/lib/money";
import { requestRefundAction } from "@/server/actions/orders";

export type OrderView = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalCents: number;
  placedAt: Date;
  provider: string;
  items: {
    id: string;
    productName: string;
    tierName: string;
    quantity: number;
    totalCents: number;
    fulfillment: string;
    refundStatus: string | null;
  }[];
};

export function OrderList({ orders }: { orders: OrderView[] }) {
  const [refundItem, setRefundItem] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const submitRefund = () => {
    if (!refundItem) return;
    startTransition(async () => {
      const r = await requestRefundAction({ orderItemId: refundItem.id, reason });
      if (r.ok) {
        toast.success(r.message ?? "Refund requested");
        setRefundItem(null);
        setReason("");
      } else toast.error(r.error);
    });
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          You haven&apos;t placed any orders yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-mono text-sm">{order.orderNumber}</CardTitle>
              <p className="text-muted-foreground text-xs">
                {format(order.placedAt, "MMM d, yyyy")} · {order.provider.toLowerCase()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={order.status} />
              <span className="font-medium tabular-nums">
                {formatMoney(order.totalCents, order.currency)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.tierName} · ×{item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.refundStatus ? (
                    <Badge variant="muted">refund {item.refundStatus.toLowerCase()}</Badge>
                  ) : ["PAID", "FULFILLED", "PARTIALLY_REFUNDED"].includes(order.status) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setRefundItem({ id: item.id, name: item.productName })}
                    >
                      Request refund
                    </Button>
                  ) : null}
                  <span className="tabular-nums">{formatMoney(item.totalCents, order.currency)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={Boolean(refundItem)} onOpenChange={(open) => !open && setRefundItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>{refundItem?.name}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Tell us what went wrong (min. 10 characters)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundItem(null)}>
              Cancel
            </Button>
            <Button onClick={submitRefund} disabled={pending || reason.trim().length < 10}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
