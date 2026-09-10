"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { createTotpSecret, totpAuthUri, verifyTotp } from "@/lib/auth/totp";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import {
  enableTwoFactorSchema,
  notificationPreferencesSchema,
  revokeSessionSchema,
  updateProfileSchema,
} from "@/lib/validations/profile";
import { updatePasswordSchema } from "@/lib/validations/auth";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

export async function updateProfileAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, image: parsed.data.image || null },
    });
    revalidatePath("/dashboard/security");
    return ok(null, "Profile updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = updatePasswordSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const record = await db.user.findUnique({ where: { id: user.id } });
    if (!record?.passwordHash) {
      return fail("Set a password via the reset flow first.", { code: "CONFLICT" });
    }
    const okCurrent = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
    if (!okCurrent) {
      return fail("Current password is incorrect.", {
        code: "VALIDATION",
        fieldErrors: { currentPassword: ["Incorrect password"] },
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "security.password_change",
      entityType: "User",
      entityId: user.id,
    });
    return ok(null, "Password changed.");
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Step 1 of 2FA setup - mint a secret + otpauth URI, store it un-activated. */
export async function beginTwoFactorSetupAction(): Promise<
  ActionResult<{ secret: string; otpauthUri: string }>
> {
  try {
    const user = await assertUser();
    const secret = createTotpSecret();
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return ok({ secret, otpauthUri: totpAuthUri(secret, user.email) });
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Step 2 - confirm a live code and flip the flag on. */
export async function confirmTwoFactorSetupAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = enableTwoFactorSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const record = await db.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorSecret) {
      return fail("Start the 2FA setup again.", { code: "CONFLICT" });
    }
    const valid = await verifyTotp(record.twoFactorSecret, parsed.data.token);
    if (!valid) {
      return fail("That code didn't match.", {
        code: "VALIDATION",
        fieldErrors: { token: ["Invalid code"] },
      });
    }

    await db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "security.2fa_enabled",
      entityType: "User",
      entityId: user.id,
    });
    revalidatePath("/dashboard/security");
    return ok(null, "Two-factor authentication is on.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function disableTwoFactorAction(): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "security.2fa_disabled",
      entityType: "User",
      entityId: user.id,
    });
    revalidatePath("/dashboard/security");
    return ok(null, "Two-factor authentication is off.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function revokeSessionAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = revokeSessionSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const result = await db.session.deleteMany({
      where: { id: parsed.data.sessionId, userId: user.id },
    });
    if (result.count === 0) return fail("Session not found.", { code: "NOT_FOUND" });
    revalidatePath("/dashboard/security");
    return ok(null, "Session revoked.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateNotificationPreferencesAction(
  input: unknown,
): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = notificationPreferencesSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    await db.$transaction(
      parsed.data.preferences.map((pref) =>
        db.notificationPreference.upsert({
          where: {
            userId_channel_category: {
              userId: user.id,
              channel: pref.channel,
              category: pref.category,
            },
          },
          create: { userId: user.id, ...pref },
          update: { enabled: pref.enabled },
        }),
      ),
    );
    revalidatePath("/dashboard/security");
    return ok(null, "Notification preferences saved.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/dashboard");
    return ok(null, "All caught up.");
  } catch (error) {
    return toActionFailure(error);
  }
}
