/**
 * Fixed-window rate limiter with an in-process Map.
 *
 * Good enough for a single-node deployment and the demo. For horizontal scale,
 * swap `buckets` for Redis (`INCR` + `PEXPIRE`) - the call sites don't change.
 */
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window resets. */
  resetAt: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(identifier, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const success = existing.count <= limit;
  return {
    success,
    limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: success ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
  if (!result.success) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}

/** Periodic sweep so the Map can't grow unbounded. */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, win] of buckets) {
      if (win.resetAt <= now) buckets.delete(key);
    }
  }, 120_000);
  // Don't keep the event loop alive for this.
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
