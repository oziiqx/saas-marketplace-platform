import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getPurchasedLibrary } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const items = await getPurchasedLibrary(user.id);

  return (
    <>
      <PageHeader title="Library" description="Everything you've purchased, ready to download." />
      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center text-sm">
            Your library is empty.
            <Button asChild size="sm">
              <Link href="/catalog">Browse the marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="gap-0 overflow-hidden py-0">
              <div className="bg-muted aspect-[16/10]">
                {item.product.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.thumbnailUrl}
                    alt={item.product.name}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/products/${item.product.slug}`} className="line-clamp-1 font-medium">
                    {item.product.name}
                  </Link>
                  {item.pricingTier.interval !== "ONE_TIME" ? (
                    <Badge variant="secondary">{item.pricingTier.interval.toLowerCase()}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  {item.product.seller.storeName} · {item.pricingTier.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  Order {item.order.orderNumber} · {format(item.order.placedAt, "MMM d, yyyy")}
                </p>
                <Button size="sm" variant="outline" className="w-full" disabled>
                  <Download className="size-4" />
                  Download (demo)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
