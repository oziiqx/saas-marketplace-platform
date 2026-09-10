"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { useCartStore } from "@/stores/cart-store";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: "ONE_TIME" | "MONTH" | "YEAR";
  features: string[];
};

type ProductMeta = {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  sellerName: string;
};

export function AddToCart({ product, tiers }: { product: ProductMeta; tiers: Tier[] }) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);
  const lines = useCartStore((s) => s.lines);
  const [selected, setSelected] = useState(tiers[0]?.id ?? "");

  const tier = tiers.find((t) => t.id === selected) ?? tiers[0];
  const inCart = lines.some((l) => l.pricingTierId === selected);

  if (!tier) return null;

  const add = (checkout: boolean) => {
    addLine({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnailUrl: product.thumbnailUrl,
      sellerName: product.sellerName,
      pricingTierId: tier.id,
      pricingTierName: tier.name,
      unitPriceCents: tier.priceCents,
      currency: tier.currency,
      interval: tier.interval,
    });
    if (checkout) router.push("/cart");
    else toast.success(`${tier.name} added to cart`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tiers.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelected(option.id)}
            className={cn(
              "flex w-full items-start justify-between gap-3 rounded-lg border p-4 text-left transition-colors",
              selected === option.id ? "border-primary bg-primary/5" : "hover:bg-accent",
            )}
          >
            <div>
              <p className="flex items-center gap-2 font-medium">
                {option.name}
                {option.interval !== "ONE_TIME" ? (
                  <Badge variant="secondary">{option.interval.toLowerCase()}</Badge>
                ) : null}
              </p>
              {option.description ? (
                <p className="text-muted-foreground text-sm">{option.description}</p>
              ) : null}
              {option.features.length > 0 ? (
                <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                  {option.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5">
                      <Check className="text-primary size-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <span className="shrink-0 font-semibold tabular-nums">
              {formatMoney(option.priceCents, option.currency, { maximumFractionDigits: 0 })}
              {option.interval !== "ONE_TIME" ? (
                <span className="text-muted-foreground text-xs">
                  /{option.interval === "MONTH" ? "mo" : "yr"}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" variant="outline" onClick={() => add(false)} disabled={inCart}>
          <ShoppingCart className="size-4" />
          {inCart ? "In cart" : "Add to cart"}
        </Button>
        <Button className="flex-1" onClick={() => add(true)}>
          Buy now
        </Button>
      </div>
    </div>
  );
}
