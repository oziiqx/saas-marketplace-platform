"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDataTableParams } from "@/hooks/use-data-table-params";

export function ColumnHeader({
  title,
  sortKey,
  className,
}: {
  title: string;
  sortKey?: string;
  className?: string;
}) {
  const { params, toggleSort } = useDataTableParams();

  if (!sortKey) return <span className={cn("text-muted-foreground text-xs", className)}>{title}</span>;

  const active = params.sortBy === sortKey;
  const Icon = !active ? ChevronsUpDown : params.sortDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-7 gap-1 px-2 text-xs", active && "text-foreground", className)}
      onClick={() => toggleSort(sortKey)}
    >
      {title}
      <Icon className="size-3.5" />
    </Button>
  );
}
