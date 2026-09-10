import { z } from "zod";

export const pricingTierSchema = z.object({
  name: z.string().min(2, "Name the tier").max(60),
  description: z.string().max(200).optional().or(z.literal("")),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  currency: z.string().length(3).default("usd"),
  interval: z.enum(["ONE_TIME", "MONTH", "YEAR"]).default("ONE_TIME"),
  trialDays: z.coerce.number().int().min(0).max(90).optional(),
  features: z.array(z.string().min(1)).max(12).default([]),
});
export type PricingTierInput = z.infer<typeof pricingTierSchema>;

/** Step 1 - the basics. */
export const productBasicsSchema = z.object({
  name: z.string().min(3, "At least 3 characters").max(120),
  categoryId: z.string().min(1, "Pick a category"),
  shortDescription: z.string().min(20, "Give buyers a one-liner").max(280),
  description: z.string().min(50, "Describe what's included").max(8000),
});

/** Step 2 - assets & media. */
export const productMediaSchema = z.object({
  thumbnailUrl: z.url("Provide an image URL").optional().or(z.literal("")),
  galleryUrls: z.array(z.url()).max(8).default([]),
  assets: z
    .array(
      z.object({
        fileName: z.string().min(1),
        fileUrl: z.string().min(1),
        fileSizeBytes: z.coerce.number().int().nonnegative(),
        mimeType: z.string().min(1),
        version: z.string().default("1.0.0"),
      }),
    )
    .min(1, "Upload at least one deliverable"),
});

/** Step 3 - pricing. */
export const productPricingSchema = z.object({
  pricingTiers: z.array(pricingTierSchema).min(1, "Add at least one pricing tier"),
});

/** Step 4 - SEO. */
export const productSeoSchema = z.object({
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(320).optional().or(z.literal("")),
  seoKeywords: z.array(z.string().min(1)).max(15).default([]),
  ogImageUrl: z.url().optional().or(z.literal("")),
});

/** Whole wizard payload for the final submit / Server Action. */
export const createProductSchema = productBasicsSchema
  .merge(productMediaSchema)
  .merge(productPricingSchema)
  .merge(productSeoSchema)
  .extend({
    status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED"]).default("DRAFT"),
  });
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().min(1),
});

export const productReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export const WIZARD_STEPS = ["basics", "media", "pricing", "seo", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
