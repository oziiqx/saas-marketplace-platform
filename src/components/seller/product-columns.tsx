"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";
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
import { updateProductStatusAction } from "@/server/actions/products";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  priceFromCents: number;
  salesCount: number;
  ratingAverage: number;
  tierCount: number;
  updatedAt: Date;
};

function RowActions({ product }: { product: Row }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const setStatus = (status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED") =>
    startTransition(async () => {
      const result = await updateProductStatusAction(product.id, status);
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
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {product.status !== "PUBLISHED" ? (
          <DropdownMenuItem onClick={() => setStatus("PUBLISHED")}>Publish</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setStatus("DRAFT")}>Unpublish (draft)</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setStatus("IN_REVIEW")}>Submit for review</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => setStatus("ARCHIVED")}>
          Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const sellerProductColumns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "name",
    header: () => <ColumnHeader title="Product" sortKey="name" />,
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.name}</p>
        <p className="text-muted-foreground text-xs">{row.original.tierCount} pricing tiers</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ColumnHeader title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "priceFromCents",
    header: () => <ColumnHeader title="From" sortKey="priceFromCents" />,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatMoney(row.original.priceFromCents, "usd", { maximumFractionDigits: 0 })}
      </span>
    ),
  },
  {
    accessorKey: "salesCount",
    header: () => <ColumnHeader title="Sales" sortKey="salesCount" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.salesCount}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: () => <ColumnHeader title="Updated" sortKey="updatedAt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(row.original.updatedAt, { addSuffix: true })}
      </span>
    ),
  },
  { id: "actions", cell: ({ row }) => <RowActions product={row.original} /> },
];
