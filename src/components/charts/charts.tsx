"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatMoneyCompact, formatNumberCompact, formatPercent } from "@/lib/money";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function shortDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatter: (value: number, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label ? shortDate(label) : ""}</p>
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">
              {formatter(Number(entry.value ?? 0), String(entry.dataKey ?? ""))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueAreaChart({
  data,
}: {
  data: { date: string; mrrCents: number; netRevenueCents: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={32} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} width={56} {...axisProps} />
        <Tooltip
          content={<ChartTooltip formatter={(v) => formatMoneyCompact(v)} />}
          cursor={{ stroke: "var(--color-border)" }}
        />
        <Area
          type="monotone"
          dataKey="mrrCents"
          name="MRR"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#mrr)"
        />
        <Area
          type="monotone"
          dataKey="netRevenueCents"
          name="Net revenue"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          fillOpacity={0}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AcquisitionBarChart({
  data,
}: {
  data: { date: string; newUsers: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axisProps} />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip
          content={<ChartTooltip formatter={(v) => formatNumberCompact(v)} />}
          cursor={{ fill: "var(--color-muted)" }}
        />
        <Bar dataKey="newUsers" name="New users" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChurnLineChart({
  data,
}: {
  data: { date: string; churnRate: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={32} {...axisProps} />
        <YAxis tickFormatter={(v: number) => formatPercent(v, 0)} width={44} {...axisProps} />
        <Tooltip content={<ChartTooltip formatter={(v) => formatPercent(v)} />} />
        <Line
          type="monotone"
          dataKey="churnRate"
          name="Churn rate"
          stroke="var(--color-chart-5)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlanDonut({
  data,
}: {
  data: { planName: string; mrrCents: number }[];
}) {
  const total = data.reduce((s, d) => s + d.mrrCents, 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="mrrCents"
          nameKey="planName"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={entry.planName} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v) => `${formatMoneyCompact(v)} (${formatPercent(total ? v / total : 0, 0)})`}
            />
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MiniSparkline({
  data,
  dataKey,
  color = "var(--color-chart-1)",
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.15} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const chartPalette = CHART_COLORS;
