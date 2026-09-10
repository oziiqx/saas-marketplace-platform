"use client";

import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_SWITCHER } from "@/config/nav";
import { ROLE_LABEL, type Role } from "@/lib/auth/rbac";
import { signOutAction } from "@/server/actions/auth";

type Props = {
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
};

export function UserMenu({ name, email, image, role }: Props) {
  const initials = (name ?? email)
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Avatar>
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="truncate">{name ?? "Account"}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{email}</span>
          <Badge variant="muted" className="mt-1 w-fit">
            {ROLE_LABEL[role]}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_SWITCHER.filter(
          (entry) => entry.role === role || role === "ADMIN" || (role === "SELLER" && entry.role === "CUSTOMER"),
        ).map((entry) => (
          <DropdownMenuItem key={entry.href} asChild>
            <Link href={entry.href}>
              <entry.icon className="size-4" />
              {entry.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/security">
            <UserIcon className="size-4" />
            Profile &amp; security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem variant="destructive" asChild>
              <span>
                <LogOut className="size-4" />
                Sign out
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
