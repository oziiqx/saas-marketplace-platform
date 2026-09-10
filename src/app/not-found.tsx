import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="space-y-4 text-center">
        <Logo className="mx-auto" />
        <p className="text-muted-foreground text-sm">404 - page not found</p>
        <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
