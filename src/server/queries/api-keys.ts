import "server-only";
import { subDays } from "date-fns";
import { db } from "@/lib/db";

export async function listApiKeys(userId: string) {
  const keys = await db.apiKey.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { requestLogs: true } },
    },
  });
  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    lastFour: k.lastFour,
    scopes: k.scopes,
    rateLimitPerMin: k.rateLimitPerMin,
    status: k.status,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
    totalRequests: k._count.requestLogs,
  }));
}

export async function getApiUsageSeries(userId: string, days = 14) {
  const since = subDays(new Date(), days);
  const logs = await db.apiRequestLog.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true, statusCode: true, durationMs: true },
  });

  const byDay = new Map<string, { total: number; errors: number; latencySum: number }>();
  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? { total: 0, errors: 0, latencySum: 0 };
    bucket.total += 1;
    if (log.statusCode >= 400) bucket.errors += 1;
    bucket.latencySum += log.durationMs;
    byDay.set(key, bucket);
  }

  const out: { date: string; requests: number; errors: number; avgLatencyMs: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = subDays(new Date(), i).toISOString().slice(0, 10);
    const bucket = byDay.get(d);
    out.push({
      date: d,
      requests: bucket?.total ?? 0,
      errors: bucket?.errors ?? 0,
      avgLatencyMs: bucket && bucket.total ? Math.round(bucket.latencySum / bucket.total) : 0,
    });
  }
  return out;
}

export async function getRecentApiRequests(userId: string, take = 25) {
  return db.apiRequestLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { apiKey: { select: { name: true, prefix: true, lastFour: true } } },
  });
}
