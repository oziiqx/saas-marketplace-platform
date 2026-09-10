"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/api-keys";
import { recordAudit } from "@/lib/audit";
import { createApiKeySchema, revokeApiKeySchema, updateApiKeySchema } from "@/lib/validations/api-key";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

const MAX_ACTIVE_KEYS = 10;

export async function createApiKeyAction(
  input: unknown,
): Promise<ActionResult<{ id: string; rawKey: string }>> {
  try {
    const user = await assertPermission("apikeys:manage:own");
    const parsed = createApiKeySchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const activeCount = await db.apiKey.count({ where: { userId: user.id, status: "ACTIVE" } });
    if (activeCount >= MAX_ACTIVE_KEYS) {
      return fail(`You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`, {
        code: "CONFLICT",
      });
    }

    const generated = generateApiKey();
    const key = await db.apiKey.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        prefix: generated.prefix,
        hashedKey: generated.hashedKey,
        lastFour: generated.lastFour,
        scopes: parsed.data.scopes,
        rateLimitPerMin: parsed.data.rateLimitPerMin,
        expiresAt: parsed.data.expiresInDays
          ? addDays(new Date(), parsed.data.expiresInDays)
          : null,
      },
    });

    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "apikey.create",
      entityType: "ApiKey",
      entityId: key.id,
      metadata: { scopes: parsed.data.scopes },
    });

    revalidatePath("/dashboard/api-keys");
    return ok(
      { id: key.id, rawKey: generated.raw },
      "API key created. Copy it now - you won't see it again.",
    );
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function revokeApiKeyAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("apikeys:manage:own");
    const parsed = revokeApiKeySchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const key = await db.apiKey.findFirst({ where: { id: parsed.data.id, userId: user.id } });
    if (!key) return fail("Key not found.", { code: "NOT_FOUND" });

    await db.apiKey.update({
      where: { id: key.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "apikey.revoke",
      entityType: "ApiKey",
      entityId: key.id,
    });

    revalidatePath("/dashboard/api-keys");
    return ok(null, "API key revoked.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateApiKeyAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("apikeys:manage:own");
    const parsed = updateApiKeySchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const { id, ...data } = parsed.data;
    const key = await db.apiKey.findFirst({ where: { id, userId: user.id, status: "ACTIVE" } });
    if (!key) return fail("Key not found or already revoked.", { code: "NOT_FOUND" });

    await db.apiKey.update({ where: { id }, data });
    revalidatePath("/dashboard/api-keys");
    return ok(null, "API key updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}
