import type { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { logColumns } from "@/components/admin/log-columns";
import { AuditTable } from "@/components/admin/audit-table";
import { listSystemLogs, listAuditLogs } from "@/server/queries/admin";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "System logs" };

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = parseListQuery(sp);
  const tab = typeof sp.tab === "string" ? sp.tab : "system";

  const [systemLogs, auditLogs] = await Promise.all([
    tab === "system" ? listSystemLogs(query) : null,
    tab === "audit" ? listAuditLogs(query) : null,
  ]);

  return (
    <>
      <PageHeader title="Logs" description="Structured system logs and the immutable audit trail." />
      <Tabs defaultValue={tab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="system" asChild>
            <a href="?tab=system">System logs</a>
          </TabsTrigger>
          <TabsTrigger value="audit" asChild>
            <a href="?tab=audit">Audit trail</a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          {systemLogs ? (
            <DataTable
              columns={logColumns}
              data={systemLogs.rows}
              total={systemLogs.total}
              pageCount={systemLogs.pageCount}
              searchPlaceholder="Search messages…"
              facets={[
                {
                  column: "level",
                  title: "Level",
                  options: ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"].map((l) => ({
                    label: l.toLowerCase(),
                    value: l,
                  })),
                },
                {
                  column: "source",
                  title: "Source",
                  options: ["auth", "billing", "orders", "webhook", "api", "admin", "seed"].map((s) => ({
                    label: s,
                    value: s,
                  })),
                },
              ]}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="audit">
          {auditLogs ? (
            <AuditTable
              rows={auditLogs.rows}
              total={auditLogs.total}
              pageCount={auditLogs.pageCount}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </>
  );
}
