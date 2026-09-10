"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatMoney } from "@/lib/money";
import { cancelSubscriptionAction, changePlanAction } from "@/server/actions/billing";

type Plan = { name: string; slug: string; priceCents: number };
type Subscription = {
  id: string;
  status: string;
  planSlug: string;
  planName: string;
  priceCents: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
};

export function BillingPanel({
  subscription,
  plans,
}: {
  subscription: Subscription | null;
  plans: Plan[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<string | undefined>();

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active subscription</CardTitle>
          <CardDescription>Pick a plan to unlock the full platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/pricing")}>Browse plans</Button>
        </CardContent>
      </Card>
    );
  }

  const changePlan = () => {
    if (!targetPlan) return;
    startTransition(async () => {
      const result = await changePlanAction({ subscriptionId: subscription.id, planSlug: targetPlan });
      if (result.ok) {
        toast.success(result.message ?? "Plan changed");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const cancel = (atPeriodEnd: boolean) => {
    startTransition(async () => {
      const result = await cancelSubscriptionAction({ subscriptionId: subscription.id, atPeriodEnd });
      if (result.ok) {
        toast.success(result.message ?? "Cancelled");
        setCancelOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {subscription.planName}
            <StatusBadge status={subscription.status} />
          </CardTitle>
          <CardDescription>
            {formatMoney(subscription.priceCents)} / month · renews{" "}
            {format(subscription.currentPeriodEnd, "MMMM d, yyyy")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.cancelAtPeriodEnd ? (
          <Badge variant="warning">
            Cancels {format(subscription.currentPeriodEnd, "MMM d, yyyy")}
          </Badge>
        ) : null}
        {subscription.trialEndsAt ? (
          <Badge variant="secondary">
            Trial ends {format(subscription.trialEndsAt, "MMM d, yyyy")}
          </Badge>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Change plan</p>
            <Select value={targetPlan} onValueChange={setTargetPlan}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter((p) => p.slug !== subscription.planSlug)
                  .map((plan) => (
                    <SelectItem key={plan.slug} value={plan.slug}>
                      {plan.name} - {formatMoney(plan.priceCents, "usd", { maximumFractionDigits: 0 })}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={changePlan} disabled={!targetPlan || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </Button>
          <Button
            variant="ghost"
            className="text-destructive ml-auto"
            onClick={() => setCancelOpen(true)}
            disabled={subscription.status === "CANCELED"}
          >
            Cancel subscription
          </Button>
        </div>
      </CardContent>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              You can keep access until the end of the current period, or end it now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => cancel(true)} disabled={pending}>
              Cancel at period end
            </Button>
            <Button variant="destructive" onClick={() => cancel(false)} disabled={pending}>
              End immediately
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
