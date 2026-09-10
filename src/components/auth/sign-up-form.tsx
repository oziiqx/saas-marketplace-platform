"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpAction } from "@/server/actions/auth";

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const [role, setRole] = useState<"CUSTOMER" | "SELLER">("CUSTOMER");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Account created");
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const fieldError = (name: string) =>
    state?.ok === false ? state.fieldErrors?.[name]?.[0] : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">Start a 14-day trial. No card required.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["CUSTOMER", "SELLER"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm transition-colors",
              role === value ? "border-primary bg-primary/5" : "hover:bg-accent",
            )}
          >
            <p className="font-medium">{value === "CUSTOMER" ? "Buy products" : "Sell products"}</p>
            <p className="text-muted-foreground text-xs">
              {value === "CUSTOMER" ? "Customer account" : "Opens a seller storefront"}
            </p>
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
          {fieldError("name") ? <p className="text-destructive text-sm">{fieldError("name")}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {fieldError("email") ? <p className="text-destructive text-sm">{fieldError("email")}</p> : null}
        </div>
        {role === "SELLER" ? (
          <div className="space-y-2">
            <Label htmlFor="storeName">Store name</Label>
            <Input id="storeName" name="storeName" required />
            {fieldError("storeName") ? (
              <p className="text-destructive text-sm">{fieldError("storeName")}</p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          {fieldError("password") ? (
            <p className="text-destructive text-sm">{fieldError("password")}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              8+ characters with an uppercase letter and a number.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          {fieldError("confirmPassword") ? (
            <p className="text-destructive text-sm">{fieldError("confirmPassword")}</p>
          ) : null}
        </div>

        {state?.ok === false && !state.fieldErrors ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-foreground font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
