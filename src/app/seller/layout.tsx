import { requireRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SELLER", "ADMIN");
  return (
    <DashboardShell user={user} navRole="SELLER">
      {children}
    </DashboardShell>
  );
}
