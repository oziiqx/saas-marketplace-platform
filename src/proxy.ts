import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { matchProtectedPrefix, roleCanAccessPath, ROLE_HOME } from "@/lib/auth/rbac";

const { auth } = NextAuth(authConfig);

const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

/**
 * Route protection at the edge:
 *  1. logged-in users are bounced away from the auth pages to their role home
 *  2. protected prefixes (/admin, /seller, /dashboard) require a session
 *  3. suspended / deactivated accounts are parked on /suspended
 *  4. RBAC - a role that cannot access the prefix is redirected to its own home
 */
export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = Boolean(session?.user);

  if (AUTH_PAGES.has(path)) {
    if (isLoggedIn && session) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.user.role], nextUrl));
    }
    return NextResponse.next();
  }

  const protectedMatch = matchProtectedPrefix(path);
  if (!protectedMatch) return NextResponse.next();

  if (!isLoggedIn || !session) {
    const signInUrl = new URL("/sign-in", nextUrl);
    signInUrl.searchParams.set("callbackUrl", `${path}${nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  const { role, status } = session.user;

  if (status === "SUSPENDED" || status === "DEACTIVATED") {
    if (path !== "/suspended") return NextResponse.redirect(new URL("/suspended", nextUrl));
    return NextResponse.next();
  }

  if (!roleCanAccessPath(role, path)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
