import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + readiness probe. Also records a latency sample for the health board. */
export async function GET() {
  const start = performance.now();
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const latencyMs = Math.round(performance.now() - start);

  if (dbOk) {
    void db.systemMetric
      .create({ data: { name: "healthcheck.db_latency", value: latencyMs, unit: "ms" } })
      .catch(() => undefined);
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      uptime_seconds: Math.round(process.uptime()),
      db: { ok: dbOk, latency_ms: latencyMs },
      timestamp: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 },
  );
}
