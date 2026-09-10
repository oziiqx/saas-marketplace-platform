"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataTableParams } from "@/hooks/use-data-table-params";
import { useDebounce } from "@/hooks/use-debounce";
import { FacetedFilter, type FacetOption } from "@/components/data-table/faceted-filter";

export type FacetConfig = { column: string; title: string; options: FacetOption[] };

export function DataTableToolbar({
  searchPlaceholder = "Search…",
  facets = [],
}: {
  searchPlaceholder?: string;
  facets?: FacetConfig[];
}) {
  const { params, setParams, isPending } = useDataTableParams();
  const [term, setTerm] = useState(params.q);
  const debounced = useDebounce(term, 350);

  useEffect(() => {
    if (debounced !== params.q) setParams({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const hasFilters = params.q.length > 0 || Object.keys(params.filters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-8"
        />
        {isPending ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>

      {facets.map((facet) => (
        <FacetedFilter key={facet.column} {...facet} />
      ))}

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => {
            setTerm("");
            setParams({ q: "", filters: {} });
          }}
        >
          Reset
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
