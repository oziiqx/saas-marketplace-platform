import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Generic list-query contract used by every admin/seller data table.
 * `filters` is a JSON string of `Record<string, string | string[]>`.
 */
export const listQuerySchema = paginationSchema.merge(sortSchema).extend({
  q: z.string().trim().max(120).optional(),
  filters: z.string().optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseFilters(raw: string | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) out[key] = value.map(String);
      else if (value != null && value !== "") out[key] = [String(value)];
    }
    return out;
  } catch {
    return {};
  }
}

export const cuidSchema = z.string().min(1);

export const idParamSchema = z.object({ id: cuidSchema });
