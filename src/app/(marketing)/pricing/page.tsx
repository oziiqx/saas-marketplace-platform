import type { Metadata } from "next";
import { Section } from "@/components/marketing/section";
import { FeatureMatrix } from "@/components/marketing/feature-matrix";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { getPlans } from "@/server/queries/billing";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Plans that scale with your GMV. 14-day trial, no card required.",
};

export default async function PricingPage() {
  const [plans, user] = await Promise.all([getPlans(), getCurrentUser()]);

  const currentPlanSlug = user
    ? (
        await db.subscription.findFirst({
          where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
          include: { plan: { select: { slug: true } } },
        })
      )?.plan.slug ?? null
    : null;

  return (
    <>
      <Section
        eyebrow="Pricing"
        title="Simple, GMV-aligned pricing"
        description="Every plan includes the full payment layer, the API platform and role-based dashboards."
      >
        <PricingTable
          plans={plans.map((p) => ({
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceCents: p.priceCents,
            currency: p.currency,
            features: p.features,
            highlight: p.highlight,
            trialDays: p.trialDays,
          }))}
          isAuthed={Boolean(user)}
          currentPlanSlug={currentPlanSlug}
        />
      </Section>

      <Section title="Compare every feature" className="bg-muted/30 border-y">
        <FeatureMatrix />
      </Section>

      <Section title="Questions" eyebrow="FAQ">
        <Faq />
      </Section>
    </>
  );
}
