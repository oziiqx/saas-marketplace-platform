import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, Package, RotateCcw, ShoppingCart, Star, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoStorefront } from "@/components/seller/no-storefront";
import { getSellerContext } from "@/lib/auth/seller";
import { getSellerDashboard } from "@/server/queries/seller";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerDashboardPage() {
  const { profile } = await getSellerContext();
  if (!profile) {
    return (
      <>
        <PageHeader title="Seller dashboard" />
        <NoStorefront />
      </>
    );
  }

  const data = await getSellerDashboard(profile.id);

  return (
    <>
      <PageHeader
        title={profile.storeName}
        description={`Storefront /${profile.slug}`}
        actions={
          <Button asChild size="sm">
            <Link href="/seller/products/new">New product</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net revenue (30d)"
          value={formatMoney(data.net30dCents, "usd", { maximumFractionDigits: 0 })}
          icon={DollarSign}
          hint={`${formatMoney(data.commission30dCents, "usd", { maximumFractionDigits: 0 })} platform fee`}
        />
        <StatCard label="Orders (30d)" value={String(data.orders30d)} icon={ShoppingCart} />
        <StatCard
          label="Lifetime revenue"
          value={formatMoney(data.lifetimeRevenueCents, "usd", { maximumFractionDigits: 0 })}
          icon={TrendingUp}
          hint={`${data.lifetimeSales} sales`}
        />
        <StatCard label="Open refunds" value={String(data.pendingRefunds)} icon={RotateCcw} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
            <CardDescription>Product status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {["PUBLISHED", "DRAFT", "IN_REVIEW", "ARCHIVED"].map((status) => (
              <div key={status} className="rounded-lg border p-4">
                <p className="text-muted-foreground text-xs capitalize">
                  {status.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {data.productCounts[status] ?? 0}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Top products</CardTitle>
              <CardDescription>By units sold</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/seller/products">All products</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No products yet.</p>
            ) : (
              data.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="text-muted-foreground size-4" />
                    <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:underline">
                      {product.name}
                    </Link>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    {product.ratingAverage > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="fill-warning text-warning size-3" />
                        {product.ratingAverage.toFixed(1)}
                      </span>
                    ) : null}
                    <Badge variant="muted">{product.salesCount} sold</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
