import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ROLE_LABEL } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";

type Props = {
  user: SessionUser;
  /** Which nav to show; defaults to the user's own role. Admins can view others. */
  navRole?: SessionUser["role"];
  children: React.ReactNode;
};

export function DashboardShell({ user, navRole, children }: Props) {
  const role = navRole ?? user.role;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[16rem_1fr]">
      <aside className="bg-sidebar text-sidebar-foreground hidden border-r lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav role={role} />
        </div>
        <div className="border-t p-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <ExternalLink className="size-4" />
            View storefront
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <MobileNav role={role} />
            <Badge variant="outline" className="hidden sm:inline-flex">
              {ROLE_LABEL[role]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} image={user.image} role={user.role} />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
