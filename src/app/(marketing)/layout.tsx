import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/rbac";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isAuthed={Boolean(user)} homeHref={user ? ROLE_HOME[user.role] : "/dashboard"} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
