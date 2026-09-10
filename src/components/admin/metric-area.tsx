"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format } from "date-fns";

export function MetricArea({
  points,
  unit,
}: {
  points: { t: string; value: number }[];
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`m-${unit}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
        <Tooltip
          labelFormatter={(v) => (v ? format(new Date(String(v)), "HH:mm") : "")}
          formatter={(value) => [`${Number(value).toFixed(1)}${unit}`, ""]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-chart-1)"
          strokeWidth={1.5}
          fill={`url(#m-${unit})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
