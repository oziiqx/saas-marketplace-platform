import "server-only";
import { subHours } from "date-fns";
import { db } from "@/lib/db";

export type MetricSeries = {
  name: string;
  unit: string;
  points: { t: string; value: number }[];
  latest: number;
  avg: number;
  p95: number;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function getSystemHealth(hours = 24): Promise<{
  metrics: MetricSeries[];
  apiLatency: { p50: number; p95: number; p99: number; errorRate: number; total: number };
  webhookHealth: { received: number; processed: number; failed: number; ignored: number };
}> {
  const since = subHours(new Date(), hours);

  const [rawMetrics, apiLogs, webhookGroups] = await Promise.all([
    db.systemMetric.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    }),
    db.apiRequestLog.findMany({
      where: { createdAt: { gte: since } },
      select: { durationMs: true, statusCode: true },
    }),
    db.webhookEvent.groupBy({ by: ["status"], _count: true, where: { receivedAt: { gte: since } } }),
  ]);

  const byName = new Map<string, { unit: string; points: { t: string; value: number }[] }>();
  for (const m of rawMetrics) {
    const entry = byName.get(m.name) ?? { unit: m.unit, points: [] };
    entry.points.push({ t: m.recordedAt.toISOString(), value: m.value });
    byName.set(m.name, entry);
  }

  const metrics: MetricSeries[] = [...byName.entries()].map(([name, { unit, points }]) => {
    const values = points.map((p) => p.value);
    return {
      name,
      unit,
      points,
      latest: values.at(-1) ?? 0,
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      p95: percentile(values, 95),
    };
  });

  const latencies = apiLogs.map((l) => l.durationMs);
  const errors = apiLogs.filter((l) => l.statusCode >= 400).length;

  const webhookHealth = { received: 0, processed: 0, failed: 0, ignored: 0 };
  for (const g of webhookGroups) {
    const key = g.status.toLowerCase() as keyof typeof webhookHealth;
    if (key in webhookHealth) webhookHealth[key] = g._count;
  }

  return {
    metrics,
    apiLatency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      errorRate: apiLogs.length ? errors / apiLogs.length : 0,
      total: apiLogs.length,
    },
    webhookHealth,
  };
}

export async function getWebhookEvents(take = 40) {
  return db.webhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take });
}
