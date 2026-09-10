import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}
