import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyApiKey, type VerifiedApiKey } from "@/lib/api-keys";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import type { ApiScope } from "@/lib/validations/api-key";

export type AuthedApiContext = {
  auth: VerifiedApiKey;
  requestId: string;
};

type Handler = (req: Request, ctx: AuthedApiContext) => Promise<Response>;

/**
 * Wrap a public API route handler with: bearer-key auth, scope check,
 * per-key fixed-window rate limiting, and request-log persistence.
 */
export function withApiAuth(requiredScope: ApiScope, handler: Handler) {
  return async (req: Request): Promise<Response> => {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(req.url);

    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const verification = await verifyApiKey(bearer);

    if (!verification.ok) {
      return json({ error: verification.reason }, verification.status, { "X-Request-Id": requestId });
    }

    const { key } = verification.result;
    if (!key.scopes.includes(requiredScope)) {
      await logRequest({ req, url, key, userId: verification.result.user.id, status: 403, start });
      return json({ error: `Missing scope: ${requiredScope}` }, 403, { "X-Request-Id": requestId });
    }

    const limit = rateLimit(`apikey:${key.id}`, key.rateLimitPerMin);
    if (!limit.success) {
      await logRequest({ req, url, key, userId: verification.result.user.id, status: 429, start });
      return json({ error: "Rate limit exceeded" }, 429, {
        ...rateLimitHeaders(limit),
        "X-Request-Id": requestId,
      });
    }

    try {
      const response = await handler(req, { auth: verification.result, requestId });
      await logRequest({
        req,
        url,
        key,
        userId: verification.result.user.id,
        status: response.status,
        start,
      });
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(rateLimitHeaders(limit))) headers.set(k, v);
      headers.set("X-Request-Id", requestId);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      await logRequest({ req, url, key, userId: verification.result.user.id, status: 500, start });
      const message = error instanceof Error ? error.message : "internal error";
      return json({ error: message }, 500, { "X-Request-Id": requestId });
    }
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return NextResponse.json(body, { status, headers });
}

async function logRequest(args: {
  req: Request;
  url: URL;
  key: { id: string };
  userId: string;
  status: number;
  start: number;
}): Promise<void> {
  try {
    await db.apiRequestLog.create({
      data: {
        apiKeyId: args.key.id,
        userId: args.userId,
        method: args.req.method,
        path: args.url.pathname,
        statusCode: args.status,
        durationMs: Date.now() - args.start,
        ip: args.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: args.req.headers.get("user-agent"),
      },
    });
  } catch {
    /* logging is best-effort */
  }
}
