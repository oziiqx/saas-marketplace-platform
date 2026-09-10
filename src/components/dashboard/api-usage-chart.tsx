"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

export function ApiUsageChart({
  data,
}: {
  data: { date: string; requests: number; errors: number; avgLatencyMs: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
          stroke="var(--color-muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={20}
        />
        <YAxis
          yAxisId="left"
          stroke="var(--color-muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <YAxis yAxisId="right" orientation="right" hide />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Bar yAxisId="left" dataKey="requests" name="Requests" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="left" dataKey="errors" name="Errors" fill="var(--color-chart-5)" radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgLatencyMs"
          name="Avg latency (ms)"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
