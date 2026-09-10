import "server-only";
import { db } from "@/lib/db";
import { toCents } from "@/lib/money";

export async function getPlans() {
  return db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function getBillingOverview(userId: string) {
  const [subscription, invoices, paymentMethods, lifetimeSpend] = await Promise.all([
    db.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "INCOMPLETE"] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: 24,
      include: { lineItems: true },
    }),
    db.paymentMethod.findMany({ where: { userId }, orderBy: { isDefault: "desc" } }),
    db.invoice.aggregate({ _sum: { amountPaidCents: true }, where: { userId, status: "PAID" } }),
  ]);

  return {
    subscription,
    invoices,
    paymentMethods,
    lifetimeSpendCents: toCents(lifetimeSpend._sum.amountPaidCents),
  };
}

export async function getInvoiceForUser(userId: string, invoiceId: string) {
  return db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { lineItems: true, user: { select: { name: true, email: true } }, subscription: { include: { plan: true } } },
  });
}
