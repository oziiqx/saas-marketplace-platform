import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Tell us your name").max(80),
  image: z.url("Provide a valid image URL").optional().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const notificationPreferenceSchema = z.object({
  channel: z.enum(["EMAIL", "IN_APP", "WEBHOOK"]),
  category: z.enum(["BILLING", "SECURITY", "ORDERS", "PRODUCT", "SYSTEM", "MARKETING"]),
  enabled: z.boolean(),
});

export const notificationPreferencesSchema = z.object({
  preferences: z.array(notificationPreferenceSchema),
});

export const revokeSessionSchema = z.object({ sessionId: z.string().min(1) });

export const enableTwoFactorSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
