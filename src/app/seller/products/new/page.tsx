import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductWizard } from "@/components/seller/product-wizard";
import { NoStorefront } from "@/components/seller/no-storefront";
import { getSellerContext } from "@/lib/auth/seller";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const { profile } = await getSellerContext();
  if (!profile) {
    return (
      <>
        <PageHeader title="New product" />
        <NoStorefront />
      </>
    );
  }

  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Digital product builder"
        description="A five-step wizard - basics, media, pricing tiers, SEO, then review."
      />
      <ProductWizard categories={categories} />
    </>
  );
}
