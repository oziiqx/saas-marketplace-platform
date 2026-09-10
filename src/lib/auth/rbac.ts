import type { $Enums } from "@prisma/client";

/**
 * Role-based access control. This module is edge-safe (type-only Prisma import)
 * so it can be shared between `middleware.ts` and server code.
 */
export type Role = $Enums.Role;

export const ROLES = ["ADMIN", "SELLER", "CUSTOMER"] as const satisfies readonly Role[];

/** Landing route after sign-in, by role. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  SELLER: "/seller",
  CUSTOMER: "/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  SELLER: "Seller",
  CUSTOMER: "Customer",
};

/**
 * Route-prefix → allowed roles. Evaluated most-specific-first in middleware.
 * A seller is also a customer (they can buy), so `/dashboard` allows all roles.
 */
export const PROTECTED_PREFIXES: ReadonlyArray<{ prefix: string; roles: readonly Role[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/seller", roles: ["ADMIN", "SELLER"] },
  { prefix: "/dashboard", roles: ["ADMIN", "SELLER", "CUSTOMER"] },
];

export function matchProtectedPrefix(pathname: string) {
  return PROTECTED_PREFIXES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
}

export function roleCanAccessPath(role: Role, pathname: string): boolean {
  const match = matchProtectedPrefix(pathname);
  if (!match) return true;
  return match.roles.includes(role);
}

// --- Fine-grained permissions ------------------------------------------------

export type Permission =
  | "admin:access"
  | "analytics:read"
  | "users:manage"
  | "orders:read:all"
  | "orders:manage:all"
  | "products:read:all"
  | "logs:read"
  | "system:read"
  | "audit:read"
  | "products:create"
  | "products:manage:own"
  | "orders:fulfill:own"
  | "refunds:manage:own"
  | "seller:access"
  | "billing:manage:own"
  | "apikeys:manage:own"
  | "profile:manage:own"
  | "notifications:manage:own";

const SELLER_PERMISSIONS: readonly Permission[] = [
  "seller:access",
  "products:create",
  "products:manage:own",
  "orders:fulfill:own",
  "refunds:manage:own",
  "billing:manage:own",
  "apikeys:manage:own",
  "profile:manage:own",
  "notifications:manage:own",
];

const CUSTOMER_PERMISSIONS: readonly Permission[] = [
  "billing:manage:own",
  "apikeys:manage:own",
  "profile:manage:own",
  "notifications:manage:own",
];

const ADMIN_PERMISSIONS: readonly Permission[] = [
  "admin:access",
  "analytics:read",
  "users:manage",
  "orders:read:all",
  "orders:manage:all",
  "products:read:all",
  "logs:read",
  "system:read",
  "audit:read",
  ...SELLER_PERMISSIONS,
];

export const PERMISSIONS_BY_ROLE: Record<Role, readonly Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  SELLER: SELLER_PERMISSIONS,
  CUSTOMER: CUSTOMER_PERMISSIONS,
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}

export function canAny(role: Role | undefined | null, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
