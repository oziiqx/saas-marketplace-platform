"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { completeMockPaymentAction } from "@/server/actions/mock-checkout";

export function MockCheckout({
  reference,
  mode,
}: {
  reference: string;
  mode: "payment" | "subscription";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const clearCart = useCartStore((s) => s.clear);

  const complete = (outcome: "success" | "failed") => {
    startTransition(async () => {
      const result = await completeMockPaymentAction(reference, mode, outcome);
      if (result.ok) {
        if (outcome === "success" && mode === "payment") clearCart();
        toast[outcome === "success" ? "success" : "error"](
          outcome === "success" ? "Payment complete" : "Payment failed (simulated)",
        );
        router.push(result.data.redirectTo);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => complete("success")} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Pay now (simulate success)
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => complete("failed")}
        disabled={pending}
      >
        Simulate a declined card
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => router.push("/cart")} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
