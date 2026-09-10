import "server-only";
import { db } from "@/lib/db";
import { requireRole, type SessionUser } from "@/lib/auth/session";
import type { SellerProfile } from "@prisma/client";

export type SellerContext = {
  user: SessionUser;
  profile: SellerProfile | null;
};

/** Seller pages: SELLER or ADMIN may enter; ADMINs may not have a storefront. */
export async function getSellerContext(): Promise<SellerContext> {
  const user = await requireRole("SELLER", "ADMIN");
  const profile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  return { user, profile };
}
