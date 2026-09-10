import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Ledgerline - the marketplace OS for digital products",
    template: "%s · Ledgerline",
  },
  description:
    "Ledgerline is a production-grade SaaS marketplace: multi-role dashboards, a pluggable payment layer, an analytics engine, and a first-class API platform.",
  keywords: ["saas", "marketplace", "digital products", "stripe", "analytics", "next.js"],
  authors: [{ name: "Ledgerline" }],
  openGraph: {
    type: "website",
    title: "Ledgerline - the marketplace OS for digital products",
    description:
      "Multi-role dashboards, pluggable payments, an analytics engine, and an API platform - in one codebase.",
    url: env.NEXT_PUBLIC_APP_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
