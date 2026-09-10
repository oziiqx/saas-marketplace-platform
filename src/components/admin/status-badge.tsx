import { Badge } from "@/components/ui/badge";

type Variant = React.ComponentProps<typeof Badge>["variant"];

const MAP: Record<string, Variant> = {
  // user
  ACTIVE: "success",
  PENDING_VERIFICATION: "warning",
  PENDING_REVIEW: "warning",
  SUSPENDED: "destructive",
  DEACTIVATED: "muted",
  BANNED: "destructive",
  PAUSED: "muted",
  // product
  PUBLISHED: "success",
  DRAFT: "muted",
  IN_REVIEW: "warning",
  ARCHIVED: "outline",
  // order
  PAID: "success",
  FULFILLED: "success",
  PENDING: "warning",
  PARTIALLY_REFUNDED: "warning",
  REFUNDED: "muted",
  CANCELLED: "outline",
  FAILED: "destructive",
  // refund / subscription / invoice
  REQUESTED: "warning",
  APPROVED: "success",
  PROCESSED: "success",
  REJECTED: "destructive",
  TRIALING: "secondary",
  PAST_DUE: "warning",
  CANCELED: "muted",
  INCOMPLETE: "outline",
  UNPAID: "destructive",
  OPEN: "warning",
  VOID: "muted",
  UNCOLLECTIBLE: "destructive",
  // log level
  INFO: "secondary",
  DEBUG: "muted",
  WARN: "warning",
  ERROR: "destructive",
  FATAL: "destructive",
  IGNORED: "muted",
  RECEIVED: "secondary",
  // fulfillment
  DELIVERED: "success",
  ACCESS_REVOKED: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={MAP[status] ?? "outline"} className="font-mono text-[11px]">
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
