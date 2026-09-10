"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatMoney, formatPercent } from "@/lib/money";

const PLATFORM_TAKE_RATE = 0.05;
const LEGACY_TAKE_RATE = 0.12;

export function RoiCalculator() {
  const [monthlyRevenue, setMonthlyRevenue] = useState(25_000);
  const [orders, setOrders] = useState(400);
  const [refundRate, setRefundRate] = useState(4);

  const model = useMemo(() => {
    const revenueCents = monthlyRevenue * 100;
    const legacyFees = revenueCents * LEGACY_TAKE_RATE;
    const ledgerlineFees = revenueCents * PLATFORM_TAKE_RATE;
    const feeSavings = legacyFees - ledgerlineFees;

    // Automated fulfillment + self-serve refunds: ~9 min/order saved, $45/hr blended.
    const opsHoursSaved = (orders * 9) / 60;
    const opsSavings = opsHoursSaved * 45 * 100;

    // Faster refund resolution recovers ~20% of would-be chargebacks (~$15 each).
    const chargebackRecovery = orders * (refundRate / 100) * 0.2 * 1500;

    const monthlySavings = feeSavings + opsSavings + chargebackRecovery;

    return {
      monthlySavingsCents: monthlySavings,
      annualSavingsCents: monthlySavings * 12,
      feeSavingsCents: feeSavings,
      opsSavingsCents: opsSavings,
      chargebackRecoveryCents: chargebackRecovery,
      effectiveMarginGain: monthlySavings / revenueCents,
    };
  }, [monthlyRevenue, orders, refundRate]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-primary size-5" />
          ROI calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Field
            label="Monthly GMV"
            value={formatMoney(monthlyRevenue * 100, "usd", { maximumFractionDigits: 0 })}
          >
            <Slider
              min={2_000}
              max={250_000}
              step={1_000}
              value={[monthlyRevenue]}
              onValueChange={([v]) => setMonthlyRevenue(v)}
            />
          </Field>
          <Field label="Orders / month" value={orders.toLocaleString()}>
            <Slider min={20} max={4_000} step={10} value={[orders]} onValueChange={([v]) => setOrders(v)} />
          </Field>
          <Field label="Refund rate" value={formatPercent(refundRate / 100, 0)}>
            <Slider
              min={0}
              max={20}
              step={1}
              value={[refundRate]}
              onValueChange={([v]) => setRefundRate(v)}
            />
          </Field>
        </div>

        <div className="bg-muted/40 flex flex-col justify-center gap-4 rounded-lg border p-6">
          <div>
            <p className="text-muted-foreground text-sm">Estimated annual savings</p>
            <p className="text-primary text-4xl font-semibold tabular-nums">
              {formatMoney(model.annualSavingsCents, "usd", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-muted-foreground text-xs">
              +{formatPercent(model.effectiveMarginGain)} effective margin ·{" "}
              {formatMoney(model.monthlySavingsCents, "usd", { maximumFractionDigits: 0 })}/mo
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label={`Payment fees (12% → 5%)`} value={model.feeSavingsCents} />
            <Row label="Fulfillment automation" value={model.opsSavingsCents} />
            <Row label="Chargeback recovery" value={model.chargebackRecoveryCents} />
          </dl>
          <p className="text-muted-foreground text-xs">
            Illustrative model for the demo. Assumptions: 5% platform fee, 9 min saved per order at
            $45/hr, 20% of disputes deflected by faster refunds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {formatMoney(value, "usd", { maximumFractionDigits: 0 })}
      </dd>
    </div>
  );
}
