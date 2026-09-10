import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  totp: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code")
    .optional()
    .or(z.literal("")),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Tell us your name").max(80),
    email: z.email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string(),
    role: z.enum(["CUSTOMER", "SELLER"]).default("CUSTOMER"),
    storeName: z.string().max(80).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role !== "SELLER" || (data.storeName?.trim().length ?? 0) >= 2, {
    message: "Store name is required for sellers",
    path: ["storeName"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const twoFactorSetupSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
