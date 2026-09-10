import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/payments";
import { PROVIDER_TO_ENUM, type PaymentProviderId } from "@/lib/payments/types";
import { processWebhookEvent } from "@/server/webhooks/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: PaymentProviderId[] = ["mock", "stripe", "paypal", "payu"];

export async function POST(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await ctx.params;
  if (!VALID.includes(providerParam as PaymentProviderId)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  const providerId = providerParam as PaymentProviderId;
  const adapter = getPaymentProvider(providerId);

  const rawBody = await request.text();
  const verification = await adapter.verifyWebhook(rawBody, request.headers);
  if (!verification.ok) {
    await logger.warn("webhook", "signature verification failed", {
      provider: providerId,
      reason: verification.reason,
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const event = adapter.normalizeEvent(verification.payload);

  // Idempotency: unique (provider, eventId).
  const existing = await db.webhookEvent.findUnique({
    where: { provider_eventId: { provider: PROVIDER_TO_ENUM[providerId], eventId: event.eventId } },
  });
  if (existing?.status === "PROCESSED") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const record = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider: PROVIDER_TO_ENUM[providerId], eventId: event.eventId } },
    create: {
      provider: PROVIDER_TO_ENUM[providerId],
      eventId: event.eventId,
      eventType: event.type,
      payload: verification.payload as object,
      status: "RECEIVED",
      attempts: 1,
    },
    update: { attempts: { increment: 1 } },
  });

  try {
    await processWebhookEvent(event);
    await db.webhookEvent.update({
      where: { id: record.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await db.webhookEvent.update({
      where: { id: record.id },
      data: { status: "FAILED", error: message },
    });
    await logger.error("webhook", "processing failed", { provider: providerId, message });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
