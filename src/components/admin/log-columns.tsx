"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/admin/status-badge";
import type { SystemLogRow } from "@/server/queries/admin";

function ContextViewer({ log }: { log: SystemLogRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Eye className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{log.source}</DialogTitle>
          <DialogDescription>{format(log.createdAt, "PPpp")}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">{log.message}</p>
        <pre className="bg-muted max-h-72 overflow-auto rounded-md p-3 text-xs">
          {JSON.stringify(log.context, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

export const logColumns: ColumnDef<SystemLogRow, unknown>[] = [
  {
    accessorKey: "level",
    header: () => <ColumnHeader title="Level" />,
    cell: ({ row }) => <StatusBadge status={row.original.level} />,
    size: 90,
  },
  {
    accessorKey: "source",
    header: () => <ColumnHeader title="Source" />,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.source}</span>,
    size: 110,
  },
  {
    accessorKey: "message",
    header: () => <ColumnHeader title="Message" />,
    cell: ({ row }) => <span className="line-clamp-1 text-sm">{row.original.message}</span>,
  },
  {
    accessorKey: "createdAt",
    header: () => <ColumnHeader title="Time" sortKey="createdAt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {format(row.original.createdAt, "MMM d HH:mm:ss")}
      </span>
    ),
    size: 140,
  },
  { id: "actions", cell: ({ row }) => <ContextViewer log={row.original} />, size: 50 },
];
