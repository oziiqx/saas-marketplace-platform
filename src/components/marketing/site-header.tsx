"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, ShoppingCart, XIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { marketingNav } from "@/config/site";
import { cartItemCount, useCartStore } from "@/stores/cart-store";

export function SiteHeader({ isAuthed, homeHref }: { isAuthed: boolean; homeHref: string }) {
  const [open, setOpen] = useState(false);
  const count = useCartStore((s) => cartItemCount(s.lines));

  const cartLink = (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/cart" aria-label="Cart">
        <ShoppingCart className="size-4" />
        {count > 0 ? (
          <Badge className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[10px]">
            {count}
          </Badge>
        ) : null}
      </Link>
    </Button>
  );

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {cartLink}
          <ThemeToggle />
          {isAuthed ? (
            <Button asChild size="sm">
              <Link href={homeHref}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Start free</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {cartLink}
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t md:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-accent rounded-md px-3 py-2 text-sm font-medium"
              >
                {item.title}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 px-3">
              {isAuthed ? (
                <Button asChild size="sm" className="flex-1">
                  <Link href={homeHref}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href="/sign-up">Start free</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
