import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  ScrollText,
  Activity,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Receipt,
  Store,
  PackagePlus,
  RotateCcw,
  Library,
  BarChart3,
} from "lucide-react";
import type { Role } from "@/lib/auth/rbac";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const ADMIN_NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Analytics", href: "/admin", icon: BarChart3, exact: true },
      { title: "System health", href: "/admin/health", icon: Activity },
    ],
  },
  {
    label: "Database studio",
    items: [
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "System logs", href: "/admin/logs", icon: ScrollText },
    ],
  },
];

const SELLER_NAV: NavSection[] = [
  {
    label: "Store",
    items: [
      { title: "Dashboard", href: "/seller", icon: LayoutDashboard, exact: true },
      { title: "Products", href: "/seller/products", icon: Package },
      { title: "New product", href: "/seller/products/new", icon: PackagePlus },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Orders", href: "/seller/orders", icon: ShoppingCart },
      { title: "Refunds", href: "/seller/refunds", icon: RotateCcw },
    ],
  },
];

const CUSTOMER_NAV: NavSection[] = [
  {
    label: "Account",
    items: [
      { title: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { title: "Library", href: "/dashboard/library", icon: Library },
      { title: "Orders", href: "/dashboard/orders", icon: Receipt },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
      { title: "API keys", href: "/dashboard/api-keys", icon: KeyRound },
      { title: "Security", href: "/dashboard/security", icon: ShieldCheck },
    ],
  },
];

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  ADMIN: ADMIN_NAV,
  SELLER: SELLER_NAV,
  CUSTOMER: CUSTOMER_NAV,
};

export const ROLE_SWITCHER: { role: Role; label: string; href: string; icon: LucideIcon }[] = [
  { role: "ADMIN", label: "Admin console", href: "/admin", icon: ShieldCheck },
  { role: "SELLER", label: "Seller portal", href: "/seller", icon: Store },
  { role: "CUSTOMER", label: "My account", href: "/dashboard", icon: LayoutDashboard },
];
