"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney } from "@/lib/money";
import { adminUpdateOrderStatusAction } from "@/server/actions/admin";
import type { AdminOrderRow } from "@/server/queries/admin";

const NEXT_STATUSES: AdminOrderRow["status"][] = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "CANCELLED",
  "FAILED",
];

function RowActions({ order }: { order: AdminOrderRow }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        {NEXT_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={order.status === status}
            onClick={() =>
              startTransition(async () => {
                const result = await adminUpdateOrderStatusAction({ id: order.id, status });
                if (result.ok) toast.success(result.message ?? "Updated");
                else toast.error(result.error);
                setOpen(false);
              })
            }
          >
            {status.replaceAll("_", " ").toLowerCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const orderColumns: ColumnDef<AdminOrderRow, unknown>[] = [
  {
    accessorKey: "orderNumber",
    header: () => <ColumnHeader title="Order" sortKey="orderNumber" />,
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-xs font-medium">{row.original.orderNumber}</p>
        <p className="text-muted-foreground text-xs">{row.original.customerEmail}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ColumnHeader title="Status" sortKey="status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "provider",
    header: () => <ColumnHeader title="Provider" />,
    cell: ({ row }) => <span className="text-xs capitalize">{row.original.provider.toLowerCase()}</span>,
  },
  {
    accessorKey: "itemCount",
    header: () => <ColumnHeader title="Items" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.itemCount}</span>,
  },
  {
    accessorKey: "totalCents",
    header: () => <ColumnHeader title="Total" sortKey="totalCents" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.totalCents, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "placedAt",
    header: () => <ColumnHeader title="Placed" sortKey="placedAt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {format(row.original.placedAt, "MMM d, yyyy")}
      </span>
    ),
  },
  { id: "actions", cell: ({ row }) => <RowActions order={row.original} /> },
];
