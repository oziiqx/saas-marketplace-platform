"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/pagination";
import {
  DataTableToolbar,
  type FacetConfig,
} from "@/components/data-table/toolbar";
import { useDataTableParams } from "@/hooks/use-data-table-params";

type Props<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  total: number;
  pageCount: number;
  facets?: FacetConfig[];
  searchPlaceholder?: string;
  emptyMessage?: string;
};

/**
 * Server-driven data table: sorting, paging, search and faceted filters are all
 * URL params consumed by the RSC. TanStack Table handles column/render mechanics
 * only (`manual*` everything).
 */
export function DataTable<TData>({
  columns,
  data,
  total,
  pageCount,
  facets,
  searchPlaceholder,
  emptyMessage = "No results.",
}: Props<TData>) {
  const { isPending } = useDataTableParams();
  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <DataTableToolbar facets={facets} searchPlaceholder={searchPlaceholder} />
      <div className={cn("rounded-lg border transition-opacity", isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination total={total} pageCount={pageCount} />
    </div>
  );
}
