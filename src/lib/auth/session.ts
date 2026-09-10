import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/result";
import { can, ROLE_HOME, type Permission, type Role } from "@/lib/auth/rbac";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "DEACTIVATED";
  twoFactorEnabled: boolean;
};

/** De-duped per request. Returns the session user or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    image: session.user.image ?? null,
    role: session.user.role,
    status: session.user.status,
    twoFactorEnabled: session.user.twoFactorEnabled,
  };
});

/** Redirects to /sign-in when unauthenticated. */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-in");
  }
  return user;
}

/** Requires one of `roles`; otherwise redirects to the user's own role home. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

/** Requires a fine-grained permission; redirects on failure. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(ROLE_HOME[user.role]);
  return user;
}

/** For Server Actions: throw (caught by `toActionFailure`) instead of redirect. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("You need to sign in to do that.", "UNAUTHENTICATED");
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    throw new AppError("Your account is not active.", "FORBIDDEN");
  }
  return user;
}

export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await assertUser();
  if (!can(user.role, permission)) {
    throw new AppError("You don't have permission to do that.", "FORBIDDEN");
  }
  return user;
}

/** Full DB user record with seller profile - for dashboards that need more. */
export const getFullUser = cache(async () => {
  const session = await getCurrentUser();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.id },
    include: { sellerProfile: true },
  });
});
