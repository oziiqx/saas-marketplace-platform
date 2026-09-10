import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/config/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Marketplace", href: "/catalog" },
      { label: "API reference", href: "/#api" },
    ],
  },
  {
    title: "For sellers",
    links: [
      { label: "Become a seller", href: "/sign-up" },
      { label: "Seller portal", href: "/seller" },
      { label: "Payouts", href: "/#" },
      { label: "Refund policy", href: "/#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#" },
      { label: "Blog", href: "/#" },
      { label: "Careers", href: "/#" },
      { label: "Contact", href: "/#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">{siteConfig.description}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-sm font-medium">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page text-muted-foreground flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. A portfolio project - not a real company.
          </p>
          <p>Next.js 16 · TypeScript · Prisma · Auth.js · Tailwind v4</p>
        </div>
      </div>
    </footer>
  );
}
