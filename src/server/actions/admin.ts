"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  moderateProductSchema,
  updateOrderSchema,
  updateSellerStatusSchema,
  updateUserSchema,
} from "@/lib/validations/admin";
import { ok, fail, toActionFailure, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

export async function adminUpdateUserAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const admin = await assertPermission("users:manage");
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const { id, ...data } = parsed.data;
    if (id === admin.id && data.role && data.role !== "ADMIN") {
      return fail("You can't demote your own admin account.", { code: "CONFLICT" });
    }

    const before = await db.user.findUnique({ where: { id } });
    if (!before) return fail("User not found.", { code: "NOT_FOUND" });

    await db.user.update({ where: { id }, data });

    if (data.status === "SUSPENDED" || data.status === "DEACTIVATED") {
      await db.session.deleteMany({ where: { userId: id } });
    }
    if (data.role === "SELLER" && before.role !== "SELLER") {
      await db.sellerProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          storeName: `${before.name ?? "New"} Store`,
          slug: `store-${id.slice(0, 8)}`,
          status: "ACTIVE",
        },
        update: {},
      });
    }

    await recordAudit({
      actor: { id: admin.id, email: admin.email },
      action: "admin.user.update",
      entityType: "User",
      entityId: id,
      metadata: { before: { role: before.role, status: before.status }, after: data },
    });
    revalidatePath("/admin/users");
    return ok(null, "User updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function adminUpdateOrderStatusAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const admin = await assertPermission("orders:manage:all");
    const parsed = updateOrderSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const order = await db.order.findUnique({ where: { id: parsed.data.id } });
    if (!order) return fail("Order not found.", { code: "NOT_FOUND" });

    await db.order.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        paidAt: parsed.data.status === "PAID" ? (order.paidAt ?? new Date()) : order.paidAt,
      },
    });
    await recordAudit({
      actor: { id: admin.id, email: admin.email },
      action: "admin.order.status",
      entityType: "Order",
      entityId: order.id,
      metadata: { from: order.status, to: parsed.data.status },
    });
    revalidatePath("/admin/orders");
    return ok(null, "Order status updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function adminModerateProductAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const admin = await assertPermission("products:read:all");
    const parsed = moderateProductSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const product = await db.product.findUnique({ where: { id: parsed.data.id } });
    if (!product) return fail("Product not found.", { code: "NOT_FOUND" });

    await db.product.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === "PUBLISHED" ? (product.publishedAt ?? new Date()) : product.publishedAt,
      },
    });
    await Promise.all([
      recordAudit({
        actor: { id: admin.id, email: admin.email },
        action: "admin.product.moderate",
        entityType: "Product",
        entityId: product.id,
        metadata: { to: parsed.data.status, note: parsed.data.note },
      }),
      logger.info("admin", "product moderated", { productId: product.id, status: parsed.data.status }),
    ]);
    revalidatePath("/admin/products");
    return ok(null, "Product updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function adminUpdateSellerStatusAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const admin = await assertPermission("users:manage");
    const parsed = updateSellerStatusSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    await db.sellerProfile.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
    await recordAudit({
      actor: { id: admin.id, email: admin.email },
      action: "admin.seller.status",
      entityType: "SellerProfile",
      entityId: parsed.data.id,
      metadata: { to: parsed.data.status },
    });
    revalidatePath("/admin/users");
    return ok(null, "Seller status updated.");
  } catch (error) {
    return toActionFailure(error);
  }
}
