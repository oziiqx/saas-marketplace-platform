import "server-only";
import { createHash } from "node:crypto";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { ApiKey, User } from "@prisma/client";

const KEY_BODY = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40);
const PREFIX_LIVE = "sk_live_";

export type GeneratedApiKey = {
  /** Shown to the user exactly once. */
  raw: string;
  prefix: string;
  lastFour: string;
  hashedKey: string;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(`${env.API_KEY_HASH_PEPPER}:${raw}`).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const body = KEY_BODY();
  const raw = `${PREFIX_LIVE}${body}`;
  return {
    raw,
    prefix: PREFIX_LIVE,
    lastFour: body.slice(-4),
    hashedKey: hashApiKey(raw),
  };
}

export type VerifiedApiKey = {
  key: ApiKey;
  user: Pick<User, "id" | "email" | "role" | "status">;
};

export type ApiKeyVerification =
  | { ok: true; result: VerifiedApiKey }
  | { ok: false; status: 401 | 403; reason: string };

/**
 * Resolve a raw `Authorization: Bearer sk_live_…` value to an API key + owner.
 * Constant-ish: always hashes, single indexed lookup.
 */
export async function verifyApiKey(raw: string | null | undefined): Promise<ApiKeyVerification> {
  if (!raw || !raw.startsWith(PREFIX_LIVE)) {
    return { ok: false, status: 401, reason: "Missing or malformed API key" };
  }

  const key = await db.apiKey.findUnique({
    where: { hashedKey: hashApiKey(raw) },
    include: { user: { select: { id: true, email: true, role: true, status: true } } },
  });

  if (!key) return { ok: false, status: 401, reason: "Invalid API key" };
  if (key.status !== "ACTIVE") return { ok: false, status: 403, reason: `API key ${key.status.toLowerCase()}` };
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    await db.apiKey.update({ where: { id: key.id }, data: { status: "EXPIRED" } });
    return { ok: false, status: 403, reason: "API key expired" };
  }
  if (key.user.status !== "ACTIVE") {
    return { ok: false, status: 403, reason: "Account not active" };
  }

  // Fire-and-forget last-used bump (avoid blocking the request path).
  void db.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { ok: true, result: { key, user: key.user } };
}

export function maskApiKey(prefix: string, lastFour: string): string {
  return `${prefix}${"•".repeat(32)}${lastFour}`;
}
