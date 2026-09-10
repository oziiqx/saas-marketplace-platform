"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { MoreHorizontal, Star } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney } from "@/lib/money";
import { adminModerateProductAction } from "@/server/actions/admin";
import type { AdminProductRow } from "@/server/queries/admin";

function RowActions({ product }: { product: AdminProductRow }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const moderate = (status: "PUBLISHED" | "ARCHIVED" | "IN_REVIEW" | "DRAFT") =>
    startTransition(async () => {
      const result = await adminModerateProductAction({ id: product.id, status });
      if (result.ok) toast.success(result.message ?? "Updated");
      else toast.error(result.error);
      setOpen(false);
    });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/products/${product.slug}`} target="_blank">
            View storefront page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Moderate</DropdownMenuLabel>
        <DropdownMenuItem disabled={product.status === "PUBLISHED"} onClick={() => moderate("PUBLISHED")}>
          Approve &amp; publish
        </DropdownMenuItem>
        <DropdownMenuItem disabled={product.status === "IN_REVIEW"} onClick={() => moderate("IN_REVIEW")}>
          Send back to review
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={product.status === "ARCHIVED"}
          onClick={() => moderate("ARCHIVED")}
        >
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const productColumns: ColumnDef<AdminProductRow, unknown>[] = [
  {
    accessorKey: "name",
    header: () => <ColumnHeader title="Product" sortKey="name" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.original.name}</p>
        <p className="text-muted-foreground truncate text-xs">{row.original.sellerName}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ColumnHeader title="Status" sortKey="status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "priceFromCents",
    header: () => <ColumnHeader title="From" sortKey="priceFromCents" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatMoney(row.original.priceFromCents, "usd", { maximumFractionDigits: 0 })}</span>
    ),
  },
  {
    accessorKey: "salesCount",
    header: () => <ColumnHeader title="Sales" sortKey="salesCount" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.salesCount}</span>,
  },
  {
    accessorKey: "ratingAverage",
    header: () => <ColumnHeader title="Rating" />,
    cell: ({ row }) =>
      row.original.ratingAverage > 0 ? (
        <span className="flex items-center gap-1 text-sm">
          <Star className="fill-warning text-warning size-3.5" />
          {row.original.ratingAverage.toFixed(1)}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">-</span>
      ),
  },
  {
    accessorKey: "createdAt",
    header: () => <ColumnHeader title="Created" sortKey="createdAt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{format(row.original.createdAt, "MMM d, yyyy")}</span>
    ),
  },
  { id: "actions", cell: ({ row }) => <RowActions product={row.original} /> },
];
