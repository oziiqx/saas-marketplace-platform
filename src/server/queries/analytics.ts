import "server-only";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import {
  arpuCents,
  arrCents,
  computeChurn,
  computeMrrCents,
  densifyDailySeries,
  growthRate,
  monthlyEquivalentCents,
  projectAnnualRunRate,
  type MrrLine,
} from "@/lib/analytics";
import { toCents } from "@/lib/money";

export type KpiSummary = {
  mrrCents: number;
  arrCents: number;
  arpuCents: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  netMrrRetention: number;
  customerChurnRate: number;
  grossRevenueChurnRate: number;
  projectedArrCents: number;
  newUsers30d: number;
  newUsersPrev30d: number;
  userGrowthRate: number;
  grossVolume30dCents: number;
  refunds30dCents: number;
};

/** Everything the Admin analytics header needs, in one call. */
export async function getKpiSummary(): Promise<KpiSummary> {
  const now = new Date();
  const d30 = subDays(now, 30);
  const d60 = subDays(now, 60);

  const [subs, newUsers30d, newUsersPrev30d, paidAgg, refundAgg, canceledLast30] =
    await Promise.all([
      db.subscription.findMany({
        where: { status: { in: ["ACTIVE", "PAST_DUE", "TRIALING"] } },
        select: { status: true, quantity: true, plan: { select: { priceCents: true, interval: true } } },
      }),
      db.user.count({ where: { createdAt: { gte: d30 } } }),
      db.user.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: "PAID", issuedAt: { gte: d30 } },
      }),
      db.refund.aggregate({
        _sum: { amountCents: true },
        where: { status: "PROCESSED", processedAt: { gte: d30 } },
      }),
      db.subscription.findMany({
        where: { canceledAt: { gte: d30 }, status: "CANCELED" },
        select: { plan: { select: { priceCents: true, interval: true } }, quantity: true },
      }),
    ]);

  const lines: MrrLine[] = subs.map((s) => ({
    status: s.status,
    quantity: s.quantity,
    priceCents: s.plan.priceCents,
    interval: s.plan.interval === "YEAR" ? "YEAR" : "MONTH",
  }));

  const mrr = computeMrrCents(lines);
  const activeSubscriptions = subs.filter((s) => s.status === "ACTIVE" || s.status === "PAST_DUE").length;
  const trialingSubscriptions = subs.filter((s) => s.status === "TRIALING").length;

  const churnedMrr = canceledLast30.reduce(
    (sum, s) =>
      sum +
      monthlyEquivalentCents(s.plan.priceCents, s.plan.interval === "YEAR" ? "YEAR" : "MONTH") *
        s.quantity,
    0,
  );
  const startMrr = mrr + churnedMrr;
  const churn = computeChurn({
    startCustomers: activeSubscriptions + canceledLast30.length,
    churnedCustomers: canceledLast30.length,
    startMrrCents: startMrr,
    churnedMrrCents: churnedMrr,
  });

  const userGrowthRate = growthRate(newUsers30d, newUsersPrev30d);

  return {
    mrrCents: mrr,
    arrCents: arrCents(mrr),
    arpuCents: arpuCents(mrr, activeSubscriptions),
    activeSubscriptions,
    trialingSubscriptions,
    netMrrRetention: churn.netMrrRetention,
    customerChurnRate: churn.customerChurnRate,
    grossRevenueChurnRate: churn.grossRevenueChurnRate,
    projectedArrCents: projectAnnualRunRate(mrr, Math.max(0, userGrowthRate / 3)),
    newUsers30d,
    newUsersPrev30d,
    userGrowthRate,
    grossVolume30dCents: toCents(paidAgg._sum.totalCents),
    refunds30dCents: toCents(refundAgg._sum.amountCents),
  };
}

export type RevenueSeriesPoint = {
  date: string;
  mrrCents: number;
  grossRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
};

export async function getRevenueSeries(days = 90): Promise<RevenueSeriesPoint[]> {
  const since = subDays(new Date(), days);
  const stats = await db.dailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return densifyDailySeries(
    stats.map((s) => ({ date: s.date.toISOString().slice(0, 10), value: 1 })),
    days,
  ).map((point) => {
    const row = stats.find((s) => s.date.toISOString().slice(0, 10) === point.date);
    const gross = toCents(row?.grossRevenueCents);
    const refunded = toCents(row?.refundedCents);
    return {
      date: point.date,
      mrrCents: toCents(row?.mrrCents),
      grossRevenueCents: gross,
      refundedCents: refunded,
      netRevenueCents: gross - refunded,
    };
  });
}

export type AcquisitionPoint = { date: string; newUsers: number; activeUsers: number };

export async function getAcquisitionSeries(days = 30): Promise<AcquisitionPoint[]> {
  const since = subDays(new Date(), days);
  const stats = await db.dailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, newUsers: true, activeUsers: true },
  });
  return densifyDailySeries(
    stats.map((s) => ({ date: s.date.toISOString().slice(0, 10), value: s.newUsers })),
    days,
  ).map((p) => {
    const row = stats.find((s) => s.date.toISOString().slice(0, 10) === p.date);
    return { date: p.date, newUsers: p.value, activeUsers: row?.activeUsers ?? 0 };
  });
}

export type ChurnPoint = {
  date: string;
  newSubscriptions: number;
  canceledSubscriptions: number;
  churnRate: number;
};

export async function getChurnSeries(days = 90): Promise<ChurnPoint[]> {
  const since = subDays(new Date(), days);
  const stats = await db.dailyStat.findMany({
    where: { date: { gte: since } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      newSubscriptions: true,
      canceledSubscriptions: true,
      activeSubscriptions: true,
    },
  });
  return stats.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    newSubscriptions: s.newSubscriptions,
    canceledSubscriptions: s.canceledSubscriptions,
    churnRate:
      s.activeSubscriptions > 0 ? s.canceledSubscriptions / s.activeSubscriptions : 0,
  }));
}

export type PlanBreakdown = {
  planName: string;
  slug: string;
  subscribers: number;
  mrrCents: number;
};

export async function getPlanBreakdown(): Promise<PlanBreakdown[]> {
  const plans = await db.plan.findMany({
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
        select: { quantity: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return plans.map((plan) => {
    const subscribers = plan.subscriptions.reduce((sum, s) => sum + s.quantity, 0);
    return {
      planName: plan.name,
      slug: plan.slug,
      subscribers,
      mrrCents:
        monthlyEquivalentCents(plan.priceCents, plan.interval === "YEAR" ? "YEAR" : "MONTH") *
        subscribers,
    };
  });
}

export type TopSeller = {
  id: string;
  storeName: string;
  slug: string;
  revenueCents: number;
  sales: number;
};

export async function getTopSellers(limit = 5): Promise<TopSeller[]> {
  const sellers = await db.sellerProfile.findMany({
    orderBy: { lifetimeRevenueCents: "desc" },
    take: limit,
    select: { id: true, storeName: true, slug: true, lifetimeRevenueCents: true, lifetimeSales: true },
  });
  return sellers.map((s) => ({
    id: s.id,
    storeName: s.storeName,
    slug: s.slug,
    revenueCents: toCents(s.lifetimeRevenueCents),
    sales: s.lifetimeSales,
  }));
}
