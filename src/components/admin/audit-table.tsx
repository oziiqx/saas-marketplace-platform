"use client";

import { format } from "date-fns";
import type { AuditLog } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import { DataTablePagination } from "@/components/data-table/pagination";

export function AuditTable({
  rows,
  total,
  pageCount,
}: {
  rows: AuditLog[];
  total: number;
  pageCount: number;
}) {
  return (
    <div className="space-y-3">
      <DataTableToolbar searchPlaceholder="Search action, actor, entity…" />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  No audit records.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.actorEmail ?? "system"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.entityType}
                    {row.entityId ? (
                      <span className="text-muted-foreground"> · {row.entityId.slice(0, 8)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {row.ip ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {format(row.createdAt, "MMM d HH:mm")}
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
