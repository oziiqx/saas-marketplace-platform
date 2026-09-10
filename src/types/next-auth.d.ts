import type { DefaultSession } from "next-auth";
import type { $Enums } from "@prisma/client";

type DomainRole = $Enums.Role;
type DomainStatus = $Enums.UserStatus;

/**
 * Module augmentation: attach our domain fields to the session, user and JWT so
 * `session.user.role` is fully typed everywhere (RSC, actions, middleware).
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: DomainRole;
      status: DomainStatus;
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: DomainRole;
    status: DomainStatus;
    twoFactorEnabled?: boolean;
  }
}

// `next-auth/jwt` only re-exports `@auth/core/jwt`, so augment the source module.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: DomainRole;
    status: DomainStatus;
    twoFactorEnabled: boolean;
    /** epoch ms of the last DB re-validation of role/status */
    refreshedAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: DomainRole;
    status: DomainStatus;
    twoFactorEnabled: boolean;
    refreshedAt?: number;
  }
}
