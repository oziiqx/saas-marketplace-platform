import { z } from "zod";

export const API_SCOPES = [
  "products:read",
  "products:write",
  "orders:read",
  "orders:write",
  "analytics:read",
  "webhooks:manage",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export const createApiKeySchema = z.object({
  name: z.string().min(2, "Name this key").max(60),
  scopes: z.array(z.enum(API_SCOPES)).min(1, "Select at least one scope"),
  rateLimitPerMin: z.coerce.number().int().min(10).max(6000).default(120),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const revokeApiKeySchema = z.object({ id: z.string().min(1) });

export const updateApiKeySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60).optional(),
  rateLimitPerMin: z.coerce.number().int().min(10).max(6000).optional(),
  scopes: z.array(z.enum(API_SCOPES)).min(1).optional(),
});
