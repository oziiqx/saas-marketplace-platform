import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Cell = boolean | string;

const TIERS = ["Starter", "Growth", "Scale"] as const;

const GROUPS: { group: string; rows: { label: string; values: [Cell, Cell, Cell] }[] }[] = [
  {
    group: "Marketplace",
    rows: [
      { label: "Published products", values: ["10", "250", "Unlimited"] },
      { label: "Platform fee", values: ["8%", "5%", "3%"] },
      { label: "Multi-tier pricing (one-time + recurring)", values: [true, true, true] },
      { label: "SEO metadata & OG images", values: [true, true, true] },
    ],
  },
  {
    group: "Payments",
    rows: [
      { label: "Stripe, PayPal & PayU", values: [true, true, true] },
      { label: "Automated invoices & receipts", values: [true, true, true] },
      { label: "Self-serve refunds & disputes", values: [false, true, true] },
      { label: "Multi-currency payouts", values: [false, true, true] },
    ],
  },
  {
    group: "Platform",
    rows: [
      { label: "Analytics engine (MRR/ARR/churn)", values: ["Basic", "Full", "Full + exports"] },
      { label: "API keys", values: ["2", "10", "Unlimited"] },
      { label: "Rate limit / key", values: ["60 rpm", "600 rpm", "Custom"] },
      { label: "Audit log retention", values: ["7 days", "90 days", "1 year"] },
      { label: "System health & webhooks console", values: [false, true, true] },
    ],
  },
];

function renderCell(value: Cell) {
  if (value === true) return <Check className="text-primary mx-auto size-4" />;
  if (value === false) return <Minus className="text-muted-foreground mx-auto size-4" />;
  return <span className="text-sm">{value}</span>;
}

export function FeatureMatrix() {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">Feature</TableHead>
            {TIERS.map((tier) => (
              <TableHead key={tier} className="text-center">
                {tier}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {GROUPS.map((group) => (
            <Fragment key={group.group}>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={4} className="text-xs font-semibold tracking-wide uppercase">
                  {group.group}
                </TableCell>
              </TableRow>
              {group.rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium whitespace-normal">{row.label}</TableCell>
                  {row.values.map((value, i) => (
                    <TableCell key={i} className="text-center">
                      {renderCell(value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
