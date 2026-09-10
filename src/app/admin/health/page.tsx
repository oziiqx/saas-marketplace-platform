import type { Metadata } from "next";
import { format } from "date-fns";
import { Activity, AlertTriangle, CheckCircle2, Gauge, Server, Webhook } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricArea } from "@/components/admin/metric-area";
import { StatusBadge } from "@/components/admin/status-badge";
import { getSystemHealth, getWebhookEvents } from "@/server/queries/health";
import { formatPercent } from "@/lib/money";

export const metadata: Metadata = { title: "System health" };

const ICONS: Record<string, typeof Gauge> = {
  "api.latency_p95": Activity,
  "api.latency_p50": Activity,
  "server.cpu": Server,
  "server.memory": Gauge,
  "db.connections": Server,
};

export default async function AdminHealthPage() {
  const [health, webhooks] = await Promise.all([getSystemHealth(24), getWebhookEvents(30)]);
  const webhookTotal =
    health.webhookHealth.received +
    health.webhookHealth.processed +
    health.webhookHealth.failed +
    health.webhookHealth.ignored;

  return (
    <>
      <PageHeader
        title="System health"
        description="Live-ish latency, load and webhook delivery - sampled every 15 minutes."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="API p95 latency"
          value={`${Math.round(health.apiLatency.p95)} ms`}
          icon={Activity}
          hint={`p50 ${Math.round(health.apiLatency.p50)} ms · p99 ${Math.round(health.apiLatency.p99)} ms`}
        />
        <StatCard
          label="API error rate"
          value={formatPercent(health.apiLatency.errorRate)}
          icon={AlertTriangle}
          delta={health.apiLatency.errorRate}
          deltaInverse
          hint={`${health.apiLatency.total.toLocaleString()} requests / 24h`}
        />
        <StatCard
          label="Webhook success"
          value={
            webhookTotal
              ? formatPercent(health.webhookHealth.processed / webhookTotal)
              : "-"
          }
          icon={Webhook}
          hint={`${health.webhookHealth.failed} failed`}
        />
        <StatCard
          label="Uptime"
          value="99.98%"
          icon={CheckCircle2}
          hint="rolling 30 days (synthetic)"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {health.metrics.map((metric) => {
          const Icon = ICONS[metric.name] ?? Gauge;
          return (
            <Card key={metric.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="text-muted-foreground size-4" />
                  {metric.name}
                </CardTitle>
                <CardDescription>
                  now {metric.latest.toFixed(1)}
                  {metric.unit} · avg {metric.avg.toFixed(1)}
                  {metric.unit} · p95 {metric.p95.toFixed(1)}
                  {metric.unit}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MetricArea points={metric.points} unit={metric.unit} />
                {metric.unit === "%" ? (
                  <Progress value={metric.latest} className="mt-3" />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent webhook events</CardTitle>
          <CardDescription>Idempotent processing - unique on (provider, event id)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {webhooks.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {event.provider.toLowerCase()}
                </Badge>
                <span className="font-mono text-xs">{event.eventType}</span>
              </div>
              <div className="flex items-center gap-3">
                {event.attempts > 1 ? (
                  <span className="text-muted-foreground text-xs">{event.attempts} attempts</span>
                ) : null}
                <StatusBadge status={event.status} />
                <span className="text-muted-foreground text-xs">
                  {format(event.receivedAt, "MMM d HH:mm")}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
