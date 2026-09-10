import "server-only";
import { db } from "@/lib/db";

export async function getSecurityData(userId: string) {
  const [user, sessions, prefs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        twoFactorEnabled: true,
        passwordHash: true,
        lastLoginAt: true,
      },
    }),
    db.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
    db.notificationPreference.findMany({ where: { userId }, orderBy: [{ category: "asc" }] }),
  ]);

  return {
    user: user ? { ...user, hasPassword: Boolean(user.passwordHash), passwordHash: undefined } : null,
    sessions,
    preferences: prefs,
  };
}
