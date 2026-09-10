import { Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function NoStorefront() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
        <Store className="text-muted-foreground size-8" />
        <p className="font-medium">No storefront on this account</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          You&apos;re viewing the seller portal as an admin. Sign in as{" "}
          <span className="font-mono">seller@ledgerline.dev</span> to see a populated storefront.
        </p>
      </CardContent>
    </Card>
  );
}
