import type { Metadata } from "next";
import { format } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeysManager } from "@/components/dashboard/api-keys-manager";
import { ApiUsageChart } from "@/components/dashboard/api-usage-chart";
import { requireUser } from "@/lib/auth/session";
import { listApiKeys, getApiUsageSeries, getRecentApiRequests } from "@/server/queries/api-keys";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const user = await requireUser();
  const [keys, usage, recent] = await Promise.all([
    listApiKeys(user.id),
    getApiUsageSeries(user.id, 14),
    getRecentApiRequests(user.id, 20),
  ]);

  const hasTraffic = usage.some((u) => u.requests > 0);

  return (
    <>
      <PageHeader
        title="API keys"
        description="Generate scoped, rate-limited keys for the Ledgerline API."
      />

      <ApiKeysManager keys={keys} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quickstart</CardTitle>
          <CardDescription>Every request is authenticated, scoped and rate-limited.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted overflow-x-auto rounded-md p-4 text-xs leading-relaxed">
{`curl ${env.NEXT_PUBLIC_APP_URL}/api/v1/products?limit=5 \\
  -H "Authorization: Bearer sk_live_..."

# → 200 OK
# X-RateLimit-Limit: 120
# X-RateLimit-Remaining: 119`}
          </pre>
        </CardContent>
      </Card>

      {hasTraffic ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usage - last 14 days</CardTitle>
            <CardDescription>Requests, errors and average latency across all keys</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiUsageChart data={usage} />
          </CardContent>
        </Card>
      ) : null}

      {recent.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recent.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between border-b py-1.5 text-sm last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={req.statusCode >= 400 ? "destructive" : "muted"}
                    className="w-12 justify-center font-mono text-[11px]"
                  >
                    {req.statusCode}
                  </Badge>
                  <span className="font-mono text-xs">
                    {req.method} {req.path}
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <span>{req.apiKey?.name ?? "-"}</span>
                  <span>{req.durationMs}ms</span>
                  <span>{format(req.createdAt, "MMM d HH:mm")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
