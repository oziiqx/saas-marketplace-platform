"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type DataTableParams = {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  q: string;
  filters: Record<string, string[]>;
};

/**
 * URL-as-state for the server-driven data tables. Every control (paging, sort,
 * search, faceted filters) is a query param, so state survives refresh, is
 * shareable, and the RSC re-fetches on navigation.
 */
export function useDataTableParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const params = useMemo<DataTableParams>(() => {
    let filters: Record<string, string[]> = {};
    try {
      filters = searchParams.get("filters")
        ? (JSON.parse(searchParams.get("filters") as string) as Record<string, string[]>)
        : {};
    } catch {
      filters = {};
    }
    return {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
      sortBy: searchParams.get("sortBy"),
      sortDir: (searchParams.get("sortDir") as "asc" | "desc") ?? "desc",
      q: searchParams.get("q") ?? "",
      filters,
    };
  }, [searchParams]);

  const setParams = useCallback(
    (next: Partial<DataTableParams>) => {
      const sp = new URLSearchParams(searchParams.toString());
      const merged = { ...params, ...next };

      const write = (key: string, value: string | number | null) => {
        if (value === null || value === "" || value === undefined) sp.delete(key);
        else sp.set(key, String(value));
      };

      // Any change other than paging resets to page 1.
      if (!("page" in next)) merged.page = 1;

      write("page", merged.page === 1 ? null : merged.page);
      write("pageSize", merged.pageSize === 20 ? null : merged.pageSize);
      write("sortBy", merged.sortBy);
      write("sortDir", merged.sortDir === "desc" ? null : merged.sortDir);
      write("q", merged.q || null);
      write(
        "filters",
        Object.keys(merged.filters).length ? JSON.stringify(merged.filters) : null,
      );

      startTransition(() => {
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router, searchParams],
  );

  const toggleFilter = useCallback(
    (column: string, value: string) => {
      const current = new Set(params.filters[column] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      const filters = { ...params.filters };
      if (current.size === 0) delete filters[column];
      else filters[column] = [...current];
      setParams({ filters });
    },
    [params.filters, setParams],
  );

  const toggleSort = useCallback(
    (column: string) => {
      if (params.sortBy !== column) return setParams({ sortBy: column, sortDir: "desc" });
      if (params.sortDir === "desc") return setParams({ sortBy: column, sortDir: "asc" });
      return setParams({ sortBy: null, sortDir: "desc" });
    },
    [params.sortBy, params.sortDir, setParams],
  );

  return { params, setParams, toggleFilter, toggleSort, isPending };
}
