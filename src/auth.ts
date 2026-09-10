import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotp } from "@/lib/auth/totp";
import { signInSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

const STALE_TOKEN_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "2FA code", type: "text" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, totp } = parsed.data;

        const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user?.passwordHash) return null;

        const passwordOk = await verifyPassword(password, user.passwordHash);
        if (!passwordOk) return null;

        if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
          throw new Error("This account is not active. Contact support.");
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!totp) throw new Error("2FA_REQUIRED");
          const valid = await verifyTotp(user.twoFactorSecret, totp);
          if (!valid) throw new Error("Invalid 2FA code");
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await logger.info("auth", "credentials sign-in", { userId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Extends the edge-safe jwt callback with a periodic DB re-validation so a
     * role change or suspension takes effect within ~5 minutes without forcing
     * a full re-login. Runs only in the Node runtime (route handler / actions).
     */
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      const resolved = token instanceof Promise ? await token : token;

      const isStale =
        params.trigger === "update" ||
        !resolved.refreshedAt ||
        Date.now() - resolved.refreshedAt > STALE_TOKEN_MS;

      if (isStale && resolved.id) {
        const fresh = await db.user.findUnique({
          where: { id: resolved.id },
          select: { role: true, status: true, twoFactorEnabled: true },
        });
        if (fresh) {
          resolved.role = fresh.role;
          resolved.status = fresh.status;
          resolved.twoFactorEnabled = fresh.twoFactorEnabled;
          resolved.refreshedAt = Date.now();
        }
      }
      return resolved;
    },
  },
});
