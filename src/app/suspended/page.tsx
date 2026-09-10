import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

export default function SuspendedPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold">Account not active</h1>
        <p className="text-muted-foreground">
          This account has been suspended or deactivated. If you think this is a mistake, contact
          support.
        </p>
        <div className="flex justify-center gap-2">
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
