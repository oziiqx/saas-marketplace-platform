import type { $Enums } from "@prisma/client";

/**
 * Pure revenue-analytics math. No IO - the DB aggregation lives in
 * `src/server/queries/analytics.ts` and feeds these functions.
 */

export type RecurringInterval = "MONTH" | "YEAR";

const REVENUE_STATUSES: ReadonlySet<$Enums.SubscriptionStatus> = new Set([
  "ACTIVE",
  "PAST_DUE",
]);

/** Normalise any billing interval to a monthly-equivalent amount in cents. */
export function monthlyEquivalentCents(priceCents: number, interval: RecurringInterval): number {
  return interval === "YEAR" ? Math.round(priceCents / 12) : priceCents;
}

export type MrrLine = {
  status: $Enums.SubscriptionStatus;
  quantity: number;
  priceCents: number;
  interval: RecurringInterval;
};

/** Committed MRR: recognise ACTIVE + PAST_DUE, exclude trials and cancellations. */
export function computeMrrCents(lines: readonly MrrLine[]): number {
  return lines.reduce((total, line) => {
    if (!REVENUE_STATUSES.has(line.status)) return total;
    return total + monthlyEquivalentCents(line.priceCents, line.interval) * line.quantity;
  }, 0);
}

export function arrCents(mrrCents: number): number {
  return mrrCents * 12;
}

export function arpuCents(mrrCents: number, activeCustomers: number): number {
  return activeCustomers === 0 ? 0 : Math.round(mrrCents / activeCustomers);
}

/**
 * Customer + revenue churn for a window.
 * `startCount` / `startMrr` are the values at the window's opening.
 */
export type ChurnInput = {
  startCustomers: number;
  churnedCustomers: number;
  startMrrCents: number;
  churnedMrrCents: number;
  expansionMrrCents?: number;
};

export type ChurnMetrics = {
  customerChurnRate: number;
  grossRevenueChurnRate: number;
  netRevenueChurnRate: number;
  netMrrRetention: number;
};

export function computeChurn(input: ChurnInput): ChurnMetrics {
  const expansion = input.expansionMrrCents ?? 0;
  const customerChurnRate =
    input.startCustomers === 0 ? 0 : input.churnedCustomers / input.startCustomers;
  const grossRevenueChurnRate =
    input.startMrrCents === 0 ? 0 : input.churnedMrrCents / input.startMrrCents;
  const netRevenueChurnRate =
    input.startMrrCents === 0
      ? 0
      : (input.churnedMrrCents - expansion) / input.startMrrCents;
  const netMrrRetention =
    input.startMrrCents === 0
      ? 1
      : (input.startMrrCents - input.churnedMrrCents + expansion) / input.startMrrCents;

  return { customerChurnRate, grossRevenueChurnRate, netRevenueChurnRate, netMrrRetention };
}

/** Simple month-over-month growth ratio for KPI deltas. */
export function growthRate(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / previous;
}

/** Compound the trailing period to a naive annual run-rate projection. */
export function projectAnnualRunRate(mrrCents: number, monthlyGrowthRate: number): number {
  let running = mrrCents;
  let total = 0;
  for (let month = 0; month < 12; month += 1) {
    total += running;
    running = Math.round(running * (1 + monthlyGrowthRate));
  }
  return total;
}

export type TimeSeriesPoint = { date: string; value: number };

/** Fill gaps in a sparse day-indexed series so charts render a continuous line. */
export function densifyDailySeries(
  points: readonly TimeSeriesPoint[],
  days: number,
  endDate = new Date(),
): TimeSeriesPoint[] {
  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const out: TimeSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: byDate.get(key) ?? 0 });
  }
  return out;
}
