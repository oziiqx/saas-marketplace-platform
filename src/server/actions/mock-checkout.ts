"use server";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { assertUser } from "@/lib/auth/session";
import { signMockWebhook } from "@/lib/payments/mock";
import { absoluteUrl } from "@/lib/utils";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";

/**
 * Simulates the payment provider redirecting back after a successful charge:
 * builds a signed webhook payload and posts it to our own `/api/webhooks/mock`
 * endpoint - so the full verify → dedupe → process pipeline runs for real.
 */
export async function completeMockPaymentAction(
  ref: string,
  mode: "payment" | "subscription",
  outcome: "success" | "failed" = "success",
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const user = await assertUser();

    let amountCents = 0;
    let redirectTo = "/dashboard";

    if (mode === "payment") {
      const order = await db.order.findFirst({ where: { id: ref, customerId: user.id } });
      if (!order) return fail("Order not found.", { code: "NOT_FOUND" });
      amountCents = order.totalCents;
      redirectTo = `/dashboard/orders?status=${outcome}&order=${order.orderNumber}`;
    } else {
      const sub = await db.subscription.findFirst({ where: { id: ref, userId: user.id } });
      if (!sub) return fail("Subscription not found.", { code: "NOT_FOUND" });
      redirectTo = `/dashboard/billing?status=${outcome}`;
    }

    const body = JSON.stringify({
      id: `evt_mock_${randomUUID()}`,
      type: outcome === "success" ? (mode === "payment" ? "payment.succeeded" : "checkout.completed") : "payment.failed",
      occurredAt: new Date().toISOString(),
      data: {
        referenceId: ref,
        objectId: `obj_mock_${randomUUID()}`,
        amountCents,
        currency: "usd",
      },
    });

    const res = await fetch(absoluteUrl("/api/webhooks/mock"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-mock-signature": signMockWebhook(body) },
      body,
    });

    if (!res.ok) {
      return fail("The mock gateway rejected the callback.", { code: "PROVIDER_ERROR" });
    }

    return ok({ redirectTo });
  } catch (error) {
    return toActionFailure(error);
  }
}
