"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission, assertUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { parsePriceToCents } from "@/lib/money";
import {
  createProductSchema,
  productReviewSchema,
  updateProductSchema,
} from "@/lib/validations/product";
import { ok, fail, toActionFailure, AppError, type ActionResult } from "@/lib/result";
import { validationFailure } from "@/server/actions/_helpers";

async function requireSellerProfile(userId: string) {
  const profile = await db.sellerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("You need a seller profile first.", "FORBIDDEN");
  if (profile.status === "BANNED") throw new AppError("Your seller account is suspended.", "FORBIDDEN");
  return profile;
}

function tiersToCreateInput(tiers: ReturnType<typeof createProductSchema.parse>["pricingTiers"]) {
  return tiers.map((tier, index) => ({
    name: tier.name,
    description: tier.description || null,
    priceCents: parsePriceToCents(tier.price),
    currency: tier.currency,
    interval: tier.interval,
    trialDays: tier.trialDays ?? null,
    features: tier.features,
    sortOrder: index,
  }));
}

export async function createProductAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await assertPermission("products:create");
    const profile = await requireSellerProfile(user.id);

    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const data = parsed.data;

    const tierInputs = tiersToCreateInput(data.pricingTiers);
    const priceFromCents = Math.min(...tierInputs.map((t) => t.priceCents));
    const baseSlug = slugify(data.name);
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const product = await db.product.create({
      data: {
        sellerId: profile.id,
        categoryId: data.categoryId,
        name: data.name,
        slug,
        shortDescription: data.shortDescription,
        description: data.description,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        thumbnailUrl: data.thumbnailUrl || null,
        galleryUrls: data.galleryUrls,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords,
        ogImageUrl: data.ogImageUrl || null,
        priceFromCents,
        pricingTiers: { create: tierInputs },
        assets: {
          create: data.assets.map((a) => ({
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileSizeBytes: BigInt(a.fileSizeBytes),
            mimeType: a.mimeType,
            version: a.version,
          })),
        },
      },
    });

    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      metadata: { status: data.status },
    });

    revalidatePath("/seller/products");
    revalidatePath("/catalog");
    return ok({ id: product.id, slug: product.slug }, "Product created.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateProductStatusAction(
  productId: string,
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED",
): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("products:manage:own");
    const profile = await requireSellerProfile(user.id);
    const product = await db.product.findFirst({ where: { id: productId, sellerId: profile.id } });
    if (!product) return fail("Product not found.", { code: "NOT_FOUND" });

    await db.product.update({
      where: { id: productId },
      data: {
        status,
        publishedAt: status === "PUBLISHED" ? (product.publishedAt ?? new Date()) : product.publishedAt,
      },
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "product.status_change",
      entityType: "Product",
      entityId: productId,
      metadata: { from: product.status, to: status },
    });
    revalidatePath("/seller/products");
    revalidatePath(`/products/${product.slug}`);
    return ok(null, `Product is now ${status.toLowerCase()}.`);
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateProductAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertPermission("products:manage:own");
    const profile = await requireSellerProfile(user.id);
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const { id, pricingTiers, assets: _assets, ...rest } = parsed.data;
    const product = await db.product.findFirst({ where: { id, sellerId: profile.id } });
    if (!product) return fail("Product not found.", { code: "NOT_FOUND" });

    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: rest.name,
          shortDescription: rest.shortDescription,
          description: rest.description,
          categoryId: rest.categoryId,
          thumbnailUrl: rest.thumbnailUrl || undefined,
          seoTitle: rest.seoTitle || undefined,
          seoDescription: rest.seoDescription || undefined,
          seoKeywords: rest.seoKeywords,
        },
      });

      if (pricingTiers?.length) {
        const tierInputs = tiersToCreateInput(pricingTiers);
        await tx.pricingTier.deleteMany({ where: { productId: id } });
        await tx.pricingTier.createMany({
          data: tierInputs.map((t) => ({ ...t, productId: id })),
        });
        await tx.product.update({
          where: { id },
          data: { priceFromCents: Math.min(...tierInputs.map((t) => t.priceCents)) },
        });
      }
    });

    revalidatePath("/seller/products");
    return ok(null, "Product saved.");
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function submitReviewAction(input: unknown): Promise<ActionResult<null>> {
  try {
    const user = await assertUser();
    const parsed = productReviewSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const purchased = await db.orderItem.findFirst({
      where: {
        productId: parsed.data.productId,
        order: { customerId: user.id, status: { in: ["PAID", "FULFILLED"] } },
      },
    });

    const review = await db.review.upsert({
      where: { productId_userId: { productId: parsed.data.productId, userId: user.id } },
      create: {
        productId: parsed.data.productId,
        userId: user.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        isVerifiedPurchase: Boolean(purchased),
      },
      update: {
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
      },
    });

    const agg = await db.review.aggregate({
      where: { productId: parsed.data.productId },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: parsed.data.productId },
      data: {
        ratingAverage: agg._avg.rating ?? 0,
        ratingCount: agg._count,
      },
    });

    revalidatePath("/catalog");
    return ok(null, review ? "Thanks for your review!" : "Review saved.");
  } catch (error) {
    return toActionFailure(error);
  }
}
