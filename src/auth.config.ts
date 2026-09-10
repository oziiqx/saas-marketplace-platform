import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration. No database, no Node-only deps - this file is
 * imported by `middleware.ts`. The Credentials provider, Prisma adapter, and any
 * DB-touching callbacks live in `src/auth.ts`.
 */
const oauthProviders: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: oauthProviders,
  callbacks: {
    /**
     * Carry domain fields onto the token. On sign-in `user` is populated by the
     * adapter (OAuth) or the Credentials `authorize` fn - both include `role`.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.role = user.role;
        token.status = user.status;
        token.twoFactorEnabled = user.twoFactorEnabled ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      session.user.twoFactorEnabled = token.twoFactorEnabled;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
