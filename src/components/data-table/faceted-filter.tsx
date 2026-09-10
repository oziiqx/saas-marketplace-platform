"use client";

import { Check, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useDataTableParams } from "@/hooks/use-data-table-params";

export type FacetOption = { label: string; value: string };

export function FacetedFilter({
  column,
  title,
  options,
}: {
  column: string;
  title: string;
  options: FacetOption[];
}) {
  const { params, toggleFilter } = useDataTableParams();
  const selected = new Set(params.filters[column] ?? []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="size-4" />
          {title}
          {selected.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selected.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => {
            const isSelected = selected.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleFilter(column, option.value)}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <span
                  className={cn(
                    "border-primary flex size-4 items-center justify-center rounded-[4px] border",
                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
