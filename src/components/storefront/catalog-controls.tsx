"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataTableParams } from "@/hooks/use-data-table-params";
import { useDebounce } from "@/hooks/use-debounce";

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

type FacetGroup = { key: string; title: string; options: { label: string; value: string; count?: number }[] };

export function CatalogFacets({ groups }: { groups: FacetGroup[] }) {
  const { params, toggleFilter, setParams } = useDataTableParams();

  return (
    <aside className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-sm font-medium">{group.title}</p>
          <div className="space-y-1.5">
            {group.options.map((option) => {
              const active = (params.filters[group.key] ?? []).includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleFilter(group.key, option.value)}
                  className="hover:text-foreground text-muted-foreground flex w-full items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      "border-input flex size-4 items-center justify-center rounded border",
                      active && "bg-primary border-primary",
                    )}
                  >
                    {active ? <span className="bg-primary-foreground size-1.5 rounded-sm" /> : null}
                  </span>
                  <span className="flex-1 truncate text-left">{option.label}</span>
                  {option.count !== undefined ? (
                    <span className="text-muted-foreground/70 text-xs">{option.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {Object.keys(params.filters).length > 0 ? (
        <Button variant="ghost" size="sm" className="px-2" onClick={() => setParams({ filters: {} })}>
          <X className="size-3.5" />
          Clear filters
        </Button>
      ) : null}
    </aside>
  );
}

export function CatalogSearchBar({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { params, setParams, isPending } = useDataTableParams();
  const [term, setTerm] = useState(params.q);
  const debounced = useDebounce(term, 350);

  useEffect(() => {
    if (debounced !== params.q) setParams({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const sort = searchParams.get("sort") ?? "popular";
  const setSort = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "popular") sp.delete("sort");
    else sp.set("sort", value);
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Fuzzy search products…"
          className="pl-9"
        />
        {isPending ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="muted">{resultCount.toLocaleString()} results</Badge>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
