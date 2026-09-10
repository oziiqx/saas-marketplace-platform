"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInAction } from "@/server/actions/auth";
import { DEMO_ACCOUNTS } from "@/config/demo";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [state, formAction, pending] = useActionState(signInAction, null);
  const [show2fa, setShow2fa] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success("Welcome back");
      router.push(callbackUrl || state.data.redirectTo);
      router.refresh();
    } else if (state.error.includes("6-digit")) {
      setShow2fa(true);
    }
  }, [state, router, callbackUrl]);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">Use a demo account or your own.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {state?.ok === false && state.fieldErrors?.email ? (
            <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {show2fa ? (
          <div className="space-y-2">
            <Label htmlFor="totp">Authenticator code</Label>
            <Input id="totp" name="totp" inputMode="numeric" placeholder="123456" maxLength={6} />
            {state?.ok === false && state.fieldErrors?.totp ? (
              <p className="text-destructive text-sm">{state.fieldErrors.totp[0]}</p>
            ) : null}
          </div>
        ) : null}

        {state?.ok === false && !state.fieldErrors ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        No account?{" "}
        <Link href="/sign-up" className="text-foreground font-medium underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>

      <div className="border-t pt-4">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Demo accounts (password: {DEMO_ACCOUNTS.password})
        </p>
        <div className="grid gap-1.5">
          {DEMO_ACCOUNTS.users.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                const emailInput = document.getElementById("email") as HTMLInputElement | null;
                const pwInput = document.getElementById("password") as HTMLInputElement | null;
                if (emailInput) emailInput.value = acc.email;
                if (pwInput) pwInput.value = DEMO_ACCOUNTS.password;
              }}
              className="hover:bg-accent flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
            >
              <span>{acc.label}</span>
              <span className="text-muted-foreground text-xs">{acc.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
