"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnHeader } from "@/components/data-table/column-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ROLE_LABEL, type Role } from "@/lib/auth/rbac";
import { adminUpdateUserAction } from "@/server/actions/admin";
import type { AdminUserRow } from "@/server/queries/admin";

function RowActions({ user }: { user: AdminUserRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (data: Parameters<typeof adminUpdateUserAction>[0]) =>
    startTransition(async () => {
      const result = await adminUpdateUserAction(data);
      if (result.ok) toast.success(result.message ?? "Updated");
      else toast.error(result.error);
      setOpen(false);
    });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Change role</DropdownMenuLabel>
        {(["ADMIN", "SELLER", "CUSTOMER"] as Role[]).map((role) => (
          <DropdownMenuItem
            key={role}
            disabled={user.role === role}
            onClick={() => run({ id: user.id, role })}
          >
            {ROLE_LABEL[role]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {user.status !== "ACTIVE" ? (
          <DropdownMenuItem onClick={() => run({ id: user.id, status: "ACTIVE" })}>
            Reactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={() => run({ id: user.id, status: "SUSPENDED" })}>
            Suspend
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const userColumns: ColumnDef<AdminUserRow, unknown>[] = [
  {
    accessorKey: "email",
    header: () => <ColumnHeader title="User" sortKey="email" />,
    cell: ({ row }) => {
      const u = row.original;
      const initials = (u.name ?? u.email).slice(0, 2).toUpperCase();
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {u.image ? <AvatarImage src={u.image} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{u.name ?? "-"}</p>
            <p className="text-muted-foreground truncate text-xs">{u.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: () => <ColumnHeader title="Role" sortKey="role" />,
    cell: ({ row }) => (
      <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>
        {ROLE_LABEL[row.original.role as Role]}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: () => <ColumnHeader title="Status" sortKey="status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "twoFactorEnabled",
    header: () => <ColumnHeader title="2FA" />,
    cell: ({ row }) =>
      row.original.twoFactorEnabled ? (
        <ShieldCheck className="text-success size-4" />
      ) : (
        <span className="text-muted-foreground text-xs">off</span>
      ),
  },
  {
    accessorKey: "ordersCount",
    header: () => <ColumnHeader title="Orders" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.ordersCount}</span>,
  },
  {
    accessorKey: "createdAt",
    header: () => <ColumnHeader title="Joined" sortKey="createdAt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDistanceToNow(row.original.createdAt, { addSuffix: true })}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions user={row.original} />,
  },
];
