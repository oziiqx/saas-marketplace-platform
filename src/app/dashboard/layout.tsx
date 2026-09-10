import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CUSTOMER", "SELLER", "ADMIN");
  return (
    <DashboardShell user={user} navRole="CUSTOMER">
      {children}
    </DashboardShell>
  );
}
