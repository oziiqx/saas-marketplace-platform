"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE } from "@/config/nav";
import type { Role } from "@/lib/auth/rbac";

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = NAV_BY_ROLE[role];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">
            {section.label}
          </p>
          {section.items.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
