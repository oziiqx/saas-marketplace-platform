"use server";

import { AuthError } from "next-auth";
import { unstable_rethrow as rethrow } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { slugify } from "@/lib/utils";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { ok, fail, type ActionResult } from "@/lib/result";
import { ROLE_HOME } from "@/lib/auth/rbac";
import { validationFailure } from "@/server/actions/_helpers";

export async function signInAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    rethrow(error);
    if (error instanceof AuthError) {
      const cause = (error.cause as { err?: Error } | undefined)?.err?.message;
      if (cause === "2FA_REQUIRED") {
        return fail("Enter your 6-digit authenticator code.", { code: "VALIDATION" });
      }
      if (cause === "Invalid 2FA code") {
        return fail("That code didn't match. Try again.", {
          code: "VALIDATION",
          fieldErrors: { totp: ["Invalid code"] },
        });
      }
      return fail("Invalid email or password.", { code: "UNAUTHENTICATED" });
    }
    return fail("Could not sign you in. Please try again.");
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { role: true },
  });
  return ok({ redirectTo: user ? ROLE_HOME[user.role] : "/dashboard" });
}

export async function signUpAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const raw = Object.fromEntries(formData);
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const { name, email, password, role, storeName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return fail("An account with that email already exists.", {
      code: "CONFLICT",
      fieldErrors: { email: ["Email already registered"] },
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      status: "ACTIVE",
      emailVerified: new Date(),
      notificationPrefs: {
        create: (["BILLING", "SECURITY", "ORDERS", "PRODUCT", "SYSTEM"] as const).flatMap((category) =>
          (["EMAIL", "IN_APP"] as const).map((channel) => ({ channel, category, enabled: true })),
        ),
      },
      ...(role === "SELLER" && storeName
        ? {
            sellerProfile: {
              create: {
                storeName,
                slug: `${slugify(storeName)}-${Math.random().toString(36).slice(2, 6)}`,
                status: "PENDING_REVIEW",
              },
            },
          }
        : {}),
    },
  });

  await Promise.all([
    recordAudit({
      actor: { id: user.id, email: user.email },
      action: "user.signup",
      entityType: "User",
      entityId: user.id,
      metadata: { role },
    }),
    logger.info("auth", "user signed up", { userId: user.id, role }),
  ]);

  try {
    await signIn("credentials", { email: normalizedEmail, password, redirect: false });
  } catch (error) {
    rethrow(error);
    return ok({ redirectTo: "/sign-in" });
  }

  return ok({ redirectTo: ROLE_HOME[role] });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
