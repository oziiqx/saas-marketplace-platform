"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startSubscriptionAction } from "@/server/actions/billing";

export type PlanView = {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  features: string[];
  highlight: boolean;
  trialDays: number;
};

export function PricingTable({
  plans,
  isAuthed,
  currentPlanSlug,
}: {
  plans: PlanView[];
  isAuthed: boolean;
  currentPlanSlug?: string | null;
}) {
  const [interval, setInterval] = useState<"MONTH" | "YEAR">("MONTH");
  const [pending, startTransition] = useTransition();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const router = useRouter();

  const priceFor = (plan: PlanView) =>
    interval === "YEAR" ? Math.round(plan.priceCents * 12 * 0.83) : plan.priceCents;

  const subscribe = (slug: string) => {
    setActiveSlug(slug);
    startTransition(async () => {
      const result = await startSubscriptionAction({ planSlug: slug, interval, provider: "mock" });
      if (result.ok) {
        router.push(result.data.checkoutUrl);
      } else {
        toast.error(result.error);
        setActiveSlug(null);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="bg-muted inline-flex rounded-lg p-1 text-sm">
          {(["MONTH", "YEAR"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setInterval(value)}
              className={cn(
                "rounded-md px-4 py-1.5 font-medium transition-colors",
                interval === value ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {value === "MONTH" ? "Monthly" : "Yearly"}
              {value === "YEAR" ? <span className="text-primary ml-1.5 text-xs">−17%</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          return (
            <Card
              key={plan.slug}
              className={cn(
                "relative flex flex-col",
                plan.highlight && "border-primary shadow-lg ring-1 ring-primary/20",
              )}
            >
              {plan.highlight ? (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most popular</Badge>
              ) : null}
              <CardHeader>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>
                <div className="pt-4">
                  <span className="text-3xl font-semibold tabular-nums">
                    {formatMoney(priceFor(plan), plan.currency, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{interval === "MONTH" ? "mo" : "yr"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isAuthed ? (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={pending || isCurrent}
                    onClick={() => subscribe(plan.slug)}
                  >
                    {pending && activeSlug === plan.slug ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {isCurrent ? "Current plan" : `Start ${plan.trialDays}-day trial`}
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link href={`/sign-up?plan=${plan.slug}`}>
                      Start {plan.trialDays}-day trial
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
