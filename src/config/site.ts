export const siteConfig = {
  name: "Ledgerline",
  tagline: "The marketplace OS for digital products",
  description:
    "Multi-role dashboards, a pluggable payment layer, a real analytics engine and a first-class API platform - one production-grade Next.js codebase.",
  url: "https://ledgerline.example.com",
  links: {
    github: "https://github.com",
    docs: "/docs",
  },
} as const;

export const marketingNav = [
  { title: "Product", href: "/#features" },
  { title: "Pricing", href: "/pricing" },
  { title: "Marketplace", href: "/catalog" },
  { title: "ROI calculator", href: "/#roi" },
] as const;
