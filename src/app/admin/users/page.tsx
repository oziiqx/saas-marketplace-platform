import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { userColumns } from "@/components/admin/user-columns";
import { listUsers } from "@/server/queries/admin";
import { parseListQuery } from "@/lib/pagination";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const result = await listUsers(query);

  return (
    <>
      <PageHeader
        title="Users"
        description={`${result.total.toLocaleString()} accounts · sortable, filterable, URL-addressable`}
      />
      <DataTable
        columns={userColumns}
        data={result.rows}
        total={result.total}
        pageCount={result.pageCount}
        searchPlaceholder="Search name or email…"
        facets={[
          {
            column: "role",
            title: "Role",
            options: [
              { label: "Admin", value: "ADMIN" },
              { label: "Seller", value: "SELLER" },
              { label: "Customer", value: "CUSTOMER" },
            ],
          },
          {
            column: "status",
            title: "Status",
            options: [
              { label: "Active", value: "ACTIVE" },
              { label: "Pending", value: "PENDING_VERIFICATION" },
              { label: "Suspended", value: "SUSPENDED" },
              { label: "Deactivated", value: "DEACTIVATED" },
            ],
          },
        ]}
      />
    </>
  );
}
