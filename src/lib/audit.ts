import { headers } from "next/headers";
import { db } from "@/lib/db";

export type AuditActor = {
  id: string | null;
  email: string | null;
};

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Best-effort request fingerprint for audit / session rows. */
export async function requestFingerprint(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Append an immutable audit record. Called from Server Actions and webhook
 * handlers on every state-changing operation.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { ip, userAgent } = await requestFingerprint();
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actor.id,
        actorEmail: entry.actor.email,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: (entry.metadata ?? {}) as object,
        ip,
        userAgent,
      },
    });
  } catch {
    /* auditing must not break the mutation */
  }
}
