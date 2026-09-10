import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/rbac";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Demo project. Do not use real credentials.
        </p>
      </div>

      <div className="bg-muted relative hidden overflow-hidden lg:block">
        <div className="bg-primary/20 absolute -right-24 -top-24 size-96 rounded-full blur-3xl" />
        <div className="bg-chart-2/20 absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl" />
        <div className="relative flex h-full flex-col justify-center p-12">
          <blockquote className="max-w-md space-y-4">
            <p className="text-2xl font-medium leading-snug text-balance">
              &ldquo;A marketplace platform is 20% features and 80% the plumbing nobody sees. This
              codebase is the plumbing, done right.&rdquo;
            </p>
            <footer className="text-muted-foreground text-sm">
              - the architecture notes in <Link href="/" className="underline">README.md</Link>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
