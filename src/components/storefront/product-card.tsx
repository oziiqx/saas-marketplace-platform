import Link from "next/link";
import { Star } from "lucide-react";
import { formatMoney, formatNumberCompact } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogProduct } from "@/server/queries/catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Card className="group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-[16/10] overflow-hidden">
          {product.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="from-primary/20 to-chart-2/20 flex size-full items-center justify-center bg-gradient-to-br text-2xl font-semibold">
              {product.name.slice(0, 1)}
            </div>
          )}
          {product.hasSubscription ? (
            <Badge className="absolute top-2 left-2" variant="secondary">
              Subscription
            </Badge>
          ) : null}
        </div>
      </Link>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {product.categoryName ? (
            <span className="text-muted-foreground text-xs">{product.categoryName}</span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 text-xs">
            <Star className="fill-warning text-warning size-3" />
            {product.ratingAverage.toFixed(1)}
            <span className="text-muted-foreground">({formatNumberCompact(product.ratingCount)})</span>
          </span>
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-1 font-medium">{product.name}</h3>
        </Link>
        <p className="text-muted-foreground line-clamp-2 text-sm">{product.shortDescription}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground text-xs">by {product.sellerName}</span>
          <span className="text-sm font-semibold">
            {product.priceFromCents === 0
              ? "Free"
              : `from ${formatMoney(product.priceFromCents, product.currency, { maximumFractionDigits: 0 })}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
