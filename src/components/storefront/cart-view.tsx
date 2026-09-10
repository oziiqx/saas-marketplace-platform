"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { cartSubtotalCents, useCartStore } from "@/stores/cart-store";
import { checkoutAction } from "@/server/actions/orders";

const PROVIDERS = [
  { value: "mock", label: "Mock (sandbox)" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "payu", label: "PayU" },
];

export function CartView({ isAuthed, email }: { isAuthed: boolean; email: string }) {
  const router = useRouter();
  const { lines, setQuantity, removeLine } = useCartStore();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState("mock");
  const [billingEmail, setBillingEmail] = useState(email);

  const subtotal = cartSubtotalCents(lines);

  const checkout = () => {
    if (!isAuthed) {
      router.push("/sign-in?callbackUrl=/cart");
      return;
    }
    startTransition(async () => {
      const result = await checkoutAction({
        items: lines.map((l) => ({
          productId: l.productId,
          pricingTierId: l.pricingTierId,
          quantity: l.quantity,
        })),
        provider: provider as "mock" | "stripe" | "paypal" | "payu",
        billingEmail,
      });
      if (result.ok) {
        router.push(result.data.checkoutUrl);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border py-20 text-center">
        <ShoppingCart className="text-muted-foreground size-8" />
        <p className="font-medium">Your cart is empty</p>
        <Button asChild size="sm">
          <Link href="/catalog">Browse the marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {lines.map((line) => (
          <Card key={line.pricingTierId}>
            <CardContent className="flex items-center gap-4">
              <div className="bg-muted size-16 shrink-0 overflow-hidden rounded-md">
                {line.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.thumbnailUrl} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${line.productSlug}`} className="font-medium hover:underline">
                  {line.productName}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {line.pricingTierName} · {line.sellerName}
                  {line.interval !== "ONE_TIME" ? (
                    <Badge variant="secondary" className="ml-1">
                      {line.interval.toLowerCase()}
                    </Badge>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setQuantity(line.pricingTierId, line.quantity - 1)}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setQuantity(line.pricingTierId, line.quantity + 1)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <span className="w-20 text-right text-sm font-medium tabular-nums">
                {formatMoney(line.unitPriceCents * line.quantity, line.currency)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => removeLine(line.pricingTierId)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(subtotal)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-email">Billing email</Label>
            <Input
              id="billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Unconfigured providers fall back to the mock gateway.
            </p>
          </div>

          <Button className="w-full" onClick={checkout} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isAuthed ? "Checkout" : "Sign in to checkout"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
