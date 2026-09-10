import { z } from "zod";

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
  role: z.enum(["ADMIN", "SELLER", "CUSTOMER"]).optional(),
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "DEACTIVATED"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "PENDING",
    "PAID",
    "FULFILLED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "CANCELLED",
    "FAILED",
  ]),
});

export const moderateProductSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]),
  note: z.string().max(1000).optional(),
});

export const updateSellerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING_REVIEW", "ACTIVE", "PAUSED", "BANNED"]),
});
