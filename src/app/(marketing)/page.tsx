import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Boxes,
  KeyRound,
  ShieldCheck,
  Activity,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";
import { Section } from "@/components/marketing/section";
import { FeatureMatrix } from "@/components/marketing/feature-matrix";
import { PricingTable } from "@/components/marketing/pricing-table";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { Faq } from "@/components/marketing/faq";
import { ProductCard } from "@/components/storefront/product-card";
import { getPlans } from "@/server/queries/billing";
import { getFeaturedProducts } from "@/server/queries/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatNumberCompact } from "@/lib/money";

export default async function LandingPage() {
  const [plans, featured, user, counts] = await Promise.all([
    getPlans(),
    getFeaturedProducts(3),
    getCurrentUser(),
    Promise.all([db.product.count({ where: { status: "PUBLISHED" } }), db.user.count(), db.order.count()]),
  ]);
  const [productCount, userCount, orderCount] = counts;

  const features = [
    { icon: ShieldCheck, title: "RBAC everywhere", body: "Edge middleware, server-action assertions and per-role layouts - ADMIN, SELLER, CUSTOMER." },
    { icon: CreditCard, title: "Pluggable payments", body: "One adapter interface, four providers (Stripe, PayPal, PayU, Mock), signed webhooks, idempotent processing." },
    { icon: BarChart3, title: "Analytics engine", body: "MRR/ARR, ARPU, gross & net revenue churn, NRR - computed, not faked, with daily rollups." },
    { icon: Boxes, title: "Database studio", body: "Server-driven tables with multi-column sort, faceted filters, and URL-addressable state." },
    { icon: KeyRound, title: "API platform", body: "Hashed API keys, per-key rate limits and scopes, request logs, a real /api/v1." },
    { icon: Activity, title: "Observability", body: "Immutable audit log, structured system logs, latency percentiles and webhook health." },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-primary/10 absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="container-page relative py-20 text-center sm:py-28">
          <Reveal>
            <Badge variant="outline" className="mb-5 gap-1.5">
              <Sparkles className="size-3.5" />
              Portfolio project · Next.js 16 · TypeScript · Prisma
            </Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              The marketplace OS for{" "}
              <span className="text-primary">digital products</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg text-balance">
              Multi-role dashboards, a pluggable payment layer, a real analytics engine and a
              first-class API platform - one production-grade codebase you can read end to end.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/sign-up"}>
                  {user ? "Go to dashboard" : "Start free trial"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/catalog">Browse the marketplace</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <dl className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-6">
              {[
                { label: "Products seeded", value: productCount },
                { label: "Accounts", value: userCount },
                { label: "Orders processed", value: orderCount },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {formatNumberCompact(stat.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <Section
        id="features"
        eyebrow="Architecture"
        title="Everything a real SaaS marketplace needs"
        description="Not a template - a working system. Each capability is implemented, typed and testable."
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.05}>
              <Card className="h-full">
                <CardContent className="space-y-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.body}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Feature matrix */}
      <Section
        eyebrow="Compare"
        title="Feature matrix"
        description="Capabilities by plan tier - the same data model that drives billing."
        className="bg-muted/30 border-y"
      >
        <FeatureMatrix />
      </Section>

      {/* ROI */}
      <Section
        id="roi"
        eyebrow="Business case"
        title="Model your savings"
        description="An interactive calculator - every number recomputes as you drag."
      >
        <div className="mx-auto max-w-4xl">
          <RoiCalculator />
        </div>
      </Section>

      {/* Featured products */}
      {featured.length > 0 ? (
        <Section
          eyebrow="Marketplace"
          title="Fresh from the catalog"
          description="Seeded with realistic products, pricing tiers, reviews and sellers."
          className="bg-muted/30 border-y"
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link href="/catalog">
                See all {formatNumberCompact(productCount)} products
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {/* Pricing */}
      <Section
        id="pricing"
        eyebrow="Pricing"
        title="Plans that scale with GMV"
        description="Prices come straight from the Plan table - change the seed, change the page."
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
        />
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="Questions" className="bg-muted/30 border-y">
        <Faq />
      </Section>

      {/* CTA */}
      <section className="container-page py-20">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-8 py-14 text-center">
          <Workflow className="absolute -right-6 -bottom-6 size-40 opacity-10" />
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Read the code. Run it locally. Ship your own.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance opacity-90">
            Clone the repo, `docker compose up`, seed, and you have hundreds of realistic records to
            explore across three role-based dashboards.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
