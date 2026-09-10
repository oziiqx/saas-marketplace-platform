import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FileArchive, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { ReviewForm } from "@/components/storefront/review-form";
import { getProductBySlug } from "@/server/queries/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    keywords: product.seoKeywords,
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.shortDescription,
      images: product.ogImageUrl ? [product.ogImageUrl] : product.thumbnailUrl ? [product.thumbnailUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, user] = await Promise.all([getProductBySlug(slug), getCurrentUser()]);
  if (!product) notFound();

  const hasPurchased = user
    ? Boolean(
        await db.orderItem.findFirst({
          where: {
            productId: product.id,
            order: { customerId: user.id, status: { in: ["PAID", "FULFILLED"] } },
          },
        }),
      )
    : false;

  const rating = Number(product.ratingAverage);

  return (
    <div className="container-page py-10">
      <nav className="text-muted-foreground mb-6 flex items-center gap-1.5 text-sm">
        <Link href="/catalog" className="hover:text-foreground">
          Marketplace
        </Link>
        {product.category ? (
          <>
            <span>/</span>
            <Link href={`/catalog?filters=${encodeURIComponent(JSON.stringify({ category: [product.category.slug] }))}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="bg-muted aspect-[16/10] overflow-hidden rounded-xl border">
            {product.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.thumbnailUrl} alt={product.name} className="size-full object-cover" />
            ) : null}
          </div>
          {product.galleryUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {product.galleryUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-video rounded-lg border object-cover" />
              ))}
            </div>
          ) : null}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {product.description.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {product.assets.length > 0 ? (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">What&apos;s included</p>
              <ul className="space-y-1.5">
                {product.assets.map((asset, i) => (
                  <li key={i} className="text-muted-foreground flex items-center gap-2 text-sm">
                    <FileArchive className="size-4" />
                    {asset.fileName}
                    <span className="text-xs">
                      ({(Number(asset.fileSizeBytes) / 1_000_000).toFixed(1)} MB · v{asset.version})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {product.category ? <Badge variant="muted">{product.category.name}</Badge> : null}
              {product.status === "ARCHIVED" ? <Badge variant="outline">archived</Badge> : null}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{product.shortDescription}</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Star className="fill-warning text-warning size-4" />
                {rating > 0 ? rating.toFixed(1) : "New"}
                <span className="text-muted-foreground">({product.ratingCount})</span>
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{product.salesCount} sold</span>
            </div>
          </div>

          <AddToCart
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              thumbnailUrl: product.thumbnailUrl,
              sellerName: product.seller.storeName,
            }}
            tiers={product.pricingTiers.map((tier) => ({
              id: tier.id,
              name: tier.name,
              description: tier.description,
              priceCents: tier.priceCents,
              currency: tier.currency,
              interval: tier.interval,
              features: tier.features,
            }))}
          />

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{product.seller.storeName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{product.seller.storeName}</p>
                {product.seller.website ? (
                  <a href={product.seller.website} className="text-muted-foreground text-xs hover:underline">
                    {product.seller.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </div>
            </div>
            {product.seller.bio ? (
              <p className="text-muted-foreground mt-2 text-sm">{product.seller.bio}</p>
            ) : null}
          </div>
        </div>
      </div>

      <Separator className="my-10" />

      <div className="max-w-2xl space-y-6">
        <h2 className="text-xl font-semibold">Reviews ({product.ratingCount})</h2>

        {hasPurchased ? <ReviewForm productId={product.id} /> : null}

        <div className="space-y-4">
          {product.reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
          ) : (
            product.reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {(review.user.name ?? "A").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{review.user.name ?? "Anonymous"}</span>
                    {review.isVerifiedPurchase ? (
                      <Badge variant="muted" className="text-[10px]">
                        verified
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < review.rating
                            ? "fill-warning text-warning size-3.5"
                            : "text-muted-foreground size-3.5"
                        }
                      />
                    ))}
                  </div>
                </div>
                {review.title ? <p className="mt-2 text-sm font-medium">{review.title}</p> : null}
                {review.body ? <p className="text-muted-foreground mt-1 text-sm">{review.body}</p> : null}
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  {format(review.createdAt, "MMMM d, yyyy")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
