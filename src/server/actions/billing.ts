"use server";

import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { addMonths, addYears } from "date-fns";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/payments";
import { PROVIDER_TO_ENUM } from "@/lib/payments/types";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
  cancelSubscriptionSchema,
  changePlanSchema,
  startSubscriptionSchema,
} from "@/lib/validations/billing";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

const invoiceNumber = customAlphabet("0123456789", 8);

export async function startSubscriptionAction(
  input: unknown,
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    const user = await assertPermission("billing:manage:own");
    const parsed = startSubscriptionSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const plan = await db.plan.findUnique({ where: { slug: parsed.data.planSlug } });
    if (!plan || !plan.isActive) return fail("That plan is not available.", { code: "NOT_FOUND" });

    const existing = await db.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    });
    if (existing) {
      return fail("You already have an active subscription. Change your plan instead.", {
        code: "CONFLICT",
      });
    }

    const provider = getPaymentProvider(parsed.data.provider);
    const priceCents =
      parsed.data.interval === "YEAR" ? Math.round(plan.priceCents * 12 * 0.83) : plan.priceCents;

    const providerSub = await provider.createSubscription({
      referenceId: `${user.id}:${plan.slug}`,
      customer: { id: user.id, email: user.email, name: user.name },
      planSlug: plan.slug,
      priceCents,
      currency: plan.currency,
      interval: parsed.data.interval,
      trialDays: plan.trialDays,
    });

    const subscription = await db.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: providerSub.status,
        provider: PROVIDER_TO_ENUM[provider.id],
        providerSubscriptionId: providerSub.providerSubscriptionId,
        currentPeriodStart: providerSub.currentPeriodStart,
        currentPeriodEnd: providerSub.currentPeriodEnd,
        trialEndsAt: providerSub.trialEndsAt,
      },
    });

    const session = await provider.createCheckoutSession({
      referenceId: subscription.id,
      mode: "subscription",
      customer: { id: user.id, email: user.email, name: user.name },
      lineItems: [
        {
          name: `${plan.name} plan`,
          amountCents: priceCents,
          currency: plan.currency,
          quantity: 1,
        },
      ],
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=success`,
      cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/pricing?status=cancelled`,
    });

    await Promise.all([
      recordAudit({
        actor: { id: user.id, email: user.email },
        action: "subscription.start",
        entityType: "Subscription",
        entityId: subscription.id,
        metadata: { plan: plan.slug, provider: provider.id, interval: parsed.data.interval },
      }),
      logger.info("billing", "subscription started", { userId: user.id, plan: plan.slug }),
    ]);

    revalidatePath("/dashboard/billing");
    return ok({ checkoutUrl: session.checkoutUrl });
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function changePlanAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("billing:manage:own");
    const parsed = changePlanSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const [subscription, plan] = await Promise.all([
      db.subscription.findFirst({ where: { id: parsed.data.subscriptionId, userId: user.id } }),
      db.plan.findUnique({ where: { slug: parsed.data.planSlug } }),
    ]);
    if (!subscription) return fail("Subscription not found.", { code: "NOT_FOUND" });
    if (!plan) return fail("Plan not found.", { code: "NOT_FOUND" });

    await db.subscription.update({
      where: { id: subscription.id },
      data: { planId: plan.id, cancelAtPeriodEnd: false },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "subscription.change_plan",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: { to: plan.slug },
    });
    revalidatePath("/dashboard/billing");
    return ok(null, `Switched to the ${plan.name} plan.`);
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function cancelSubscriptionAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("billing:manage:own");
    const parsed = cancelSubscriptionSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const subscription = await db.subscription.findFirst({
      where: { id: parsed.data.subscriptionId, userId: user.id },
    });
    if (!subscription) return fail("Subscription not found.", { code: "NOT_FOUND" });

    const provider = getPaymentProvider();
    if (subscription.providerSubscriptionId) {
      await provider.cancelSubscription(subscription.providerSubscriptionId, parsed.data.atPeriodEnd);
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: parsed.data.atPeriodEnd
        ? { cancelAtPeriodEnd: true }
        : { status: "CANCELED", canceledAt: new Date(), endedAt: new Date() },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "subscription.cancel",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: { atPeriodEnd: parsed.data.atPeriodEnd, reason: parsed.data.reason },
    });

    revalidatePath("/dashboard/billing");
    return ok(
      null,
      parsed.data.atPeriodEnd
        ? "Your plan will end at the close of the current period."
        : "Subscription cancelled.",
    );
  } catch (error) {
    return toActionFailure(error);
  }
}

/** Dev helper the Mock checkout page calls to "pay" an invoice and activate. */
export async function generateInvoiceForSubscription(subscriptionId: string): Promise<void> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return;

  const now = new Date();
  const periodEnd = subscription.plan.interval === "YEAR" ? addYears(now, 1) : addMonths(now, 1);
  const amount = subscription.plan.priceCents;

  await db.invoice.create({
    data: {
      number: `INV-${invoiceNumber()}`,
      userId: subscription.userId,
      subscriptionId: subscription.id,
      status: "PAID",
      currency: subscription.plan.currency,
      subtotalCents: amount,
      totalCents: amount,
      amountPaidCents: amount,
      provider: subscription.provider,
      periodStart: now,
      periodEnd,
      paidAt: now,
      lineItems: {
        create: [
          {
            description: `${subscription.plan.name} plan`,
            quantity: 1,
            unitAmountCents: amount,
            amountCents: amount,
          },
        ],
      },
    },
  });
}
