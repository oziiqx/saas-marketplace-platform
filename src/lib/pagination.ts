import { listQuerySchema, parseFilters, type ListQuery } from "@/lib/validations/common";

export type PageResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ParsedListQuery = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  q?: string;
  sortBy?: string;
  sortDir: "asc" | "desc";
  filters: Record<string, string[]>;
};

/** Normalise `searchParams` (from a Server Component) into DB-ready paging. */
export function parseListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ParsedListQuery {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (v === undefined) continue;
    flat[k] = Array.isArray(v) ? (v[0] ?? "") : v;
  }
  const parsed: ListQuery = listQuerySchema.parse(flat);
  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    skip: (parsed.page - 1) * parsed.pageSize,
    take: parsed.pageSize,
    q: parsed.q,
    sortBy: parsed.sortBy,
    sortDir: parsed.sortDir,
    filters: parseFilters(parsed.filters),
  };
}

export function buildPageResult<T>(
  rows: T[],
  total: number,
  query: Pick<ParsedListQuery, "page" | "pageSize">,
): PageResult<T> {
  return {
    rows,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Safe `orderBy` builder - only whitelisted columns can be sorted, so a crafted
 * `?sortBy=` can't reach into relations.
 */
export function buildOrderBy<TField extends string>(
  sortBy: string | undefined,
  sortDir: "asc" | "desc",
  allowed: readonly TField[],
  fallback: TField,
): Record<string, "asc" | "desc"> {
  const field = allowed.includes(sortBy as TField) ? (sortBy as TField) : fallback;
  return { [field]: sortDir };
}
