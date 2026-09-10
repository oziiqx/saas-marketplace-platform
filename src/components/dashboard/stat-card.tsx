import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** Signed ratio, e.g. 0.12 for +12%. */
  delta?: number;
  deltaInverse?: boolean;
};

export function StatCard({ label, value, icon: Icon, hint, delta, deltaInverse }: Props) {
  const positive = (delta ?? 0) >= 0;
  const good = deltaInverse ? !positive : positive;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {Icon ? <Icon className="text-muted-foreground size-4" /> : null}
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {delta !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                good ? "text-success" : "text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {formatPercent(Math.abs(delta))}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
