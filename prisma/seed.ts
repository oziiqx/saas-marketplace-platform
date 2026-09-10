/**
 * Deterministic seed - hundreds of realistic records across every table.
 * Run with: `npm run db:seed` (or `npm run setup` for generate + push + seed).
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

faker.seed(20260909);

const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Password123!";
const HASH_PEPPER = process.env.API_KEY_HASH_PEPPER ?? "dev-only-insecure-pepper";

const CATEGORIES = [
  "UI Kits",
  "Icon Sets",
  "Notion Templates",
  "Developer Tools",
  "Fonts",
  "3D Assets",
  "Course Bundles",
  "Audio & SFX",
  "Photography",
  "AI Prompts",
];

const PLANS: Prisma.PlanCreateInput[] = [
  {
    name: "Starter",
    slug: "starter",
    description: "For makers listing their first products.",
    priceCents: 1900,
    interval: "MONTH",
    trialDays: 14,
    sortOrder: 0,
    features: [
      "Up to 10 published products",
      "8% platform fee",
      "Stripe, PayPal & PayU",
      "Basic analytics",
      "2 API keys",
    ],
  },
  {
    name: "Growth",
    slug: "growth",
    description: "For stores scaling past their first $10k months.",
    priceCents: 4900,
    interval: "MONTH",
    trialDays: 14,
    highlight: true,
    sortOrder: 1,
    features: [
      "Up to 250 published products",
      "5% platform fee",
      "Self-serve refunds & disputes",
      "Full analytics engine",
      "10 API keys · 600 rpm",
      "System health console",
    ],
  },
  {
    name: "Scale",
    slug: "scale",
    description: "For high-GMV marketplaces and teams.",
    priceCents: 12900,
    interval: "MONTH",
    trialDays: 30,
    sortOrder: 2,
    features: [
      "Unlimited products",
      "3% platform fee",
      "Multi-currency payouts",
      "Analytics exports & API",
      "Unlimited API keys",
      "1-year audit retention",
    ],
  },
];

function pick<T>(arr: readonly T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function reset() {
  console.log("• clearing tables");
  // order matters - children first
  await db.$transaction([
    db.apiRequestLog.deleteMany(),
    db.apiKey.deleteMany(),
    db.notification.deleteMany(),
    db.notificationPreference.deleteMany(),
    db.invoiceLineItem.deleteMany(),
    db.invoice.deleteMany(),
    db.paymentMethod.deleteMany(),
    db.refund.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.subscription.deleteMany(),
    db.review.deleteMany(),
    db.productAsset.deleteMany(),
    db.pricingTier.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
    db.sellerProfile.deleteMany(),
    db.webhookEvent.deleteMany(),
    db.auditLog.deleteMany(),
    db.systemLog.deleteMany(),
    db.systemMetric.deleteMany(),
    db.dailyStat.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.plan.deleteMany(),
    db.user.deleteMany(),
  ]);
}

async function main() {
  console.log("Seeding Ledgerline…");
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Plans & categories -------------------------------------------------
  await db.plan.createMany({ data: PLANS as Prisma.PlanCreateManyInput[] });
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });

  const categories = await Promise.all(
    CATEGORIES.map((name) =>
      db.category.create({
        data: { name, slug: faker.helpers.slugify(name).toLowerCase() },
      }),
    ),
  );

  // --- Users ------------------------------------------------------------
  console.log("• users");
  const notifPrefs = (): Prisma.NotificationPreferenceCreateWithoutUserInput[] =>
    (["BILLING", "SECURITY", "ORDERS", "PRODUCT", "SYSTEM"] as const).flatMap((category) =>
      (["EMAIL", "IN_APP"] as const).map((channel) => ({ channel, category, enabled: true })),
    );

  const demoAdmin = await db.user.create({
    data: {
      name: "Ada Admin",
      email: "admin@ledgerline.dev",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: daysAgo(200),
      lastLoginAt: daysAgo(0),
      createdAt: daysAgo(220),
      notificationPrefs: { create: notifPrefs() },
    },
  });

  const demoSellerUser = await db.user.create({
    data: {
      name: "Sam Seller",
      email: "seller@ledgerline.dev",
      passwordHash,
      role: "SELLER",
      status: "ACTIVE",
      emailVerified: daysAgo(180),
      lastLoginAt: daysAgo(1),
      createdAt: daysAgo(190),
      notificationPrefs: { create: notifPrefs() },
      sellerProfile: {
        create: {
          storeName: "Pixel Foundry",
          slug: "pixel-foundry",
          bio: "Hand-crafted UI kits and icon sets for product teams.",
          website: "https://pixelfoundry.example.com",
          supportEmail: "help@pixelfoundry.example.com",
          status: "ACTIVE",
          commissionRate: 0.05,
        },
      },
    },
    include: { sellerProfile: true },
  });

  const demoCustomer = await db.user.create({
    data: {
      name: "Cory Customer",
      email: "customer@ledgerline.dev",
      passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: daysAgo(90),
      lastLoginAt: daysAgo(0),
      createdAt: daysAgo(120),
      notificationPrefs: { create: notifPrefs() },
    },
  });

  // Extra sellers
  const sellerProfiles = [demoSellerUser.sellerProfile!];
  for (let i = 0; i < 14; i += 1) {
    const name = faker.person.fullName();
    const store = faker.company.name().replace(/,?\s+(Inc|LLC|Group|Ltd)\.?$/i, "");
    const created = daysAgo(faker.number.int({ min: 60, max: 400 }));
    const user = await db.user.create({
      data: {
        name,
        email: faker.internet.email({ firstName: name.split(" ")[0], provider: "sellers.ledgerline.dev" }).toLowerCase(),
        passwordHash,
        role: "SELLER",
        status: faker.helpers.weightedArrayElement([
          { value: "ACTIVE" as const, weight: 9 },
          { value: "SUSPENDED" as const, weight: 1 },
        ]),
        emailVerified: created,
        createdAt: created,
        lastLoginAt: daysAgo(faker.number.int({ min: 0, max: 20 })),
        notificationPrefs: { create: notifPrefs() },
        sellerProfile: {
          create: {
            storeName: store,
            slug: `${faker.helpers.slugify(store).toLowerCase()}-${faker.string.alphanumeric(4).toLowerCase()}`,
            bio: faker.company.catchPhrase(),
            website: faker.internet.url(),
            status: faker.helpers.weightedArrayElement([
              { value: "ACTIVE" as const, weight: 8 },
              { value: "PENDING_REVIEW" as const, weight: 1 },
              { value: "PAUSED" as const, weight: 1 },
            ]),
            commissionRate: pick([0.03, 0.05, 0.08, 0.1]),
          },
        },
      },
      include: { sellerProfile: true },
    });
    sellerProfiles.push(user.sellerProfile!);
  }

  // Customers
  const customers = [demoCustomer];
  for (let i = 0; i < 200; i += 1) {
    const created = daysAgo(faker.number.int({ min: 0, max: 240 }));
    const name = faker.person.fullName();
    const user = await db.user.create({
      data: {
        name,
        email: faker.internet
          .email({ firstName: name.split(" ")[0], lastName: name.split(" ")[1] ?? "x" })
          .toLowerCase(),
        passwordHash,
        role: "CUSTOMER",
        status: faker.helpers.weightedArrayElement([
          { value: "ACTIVE" as const, weight: 92 },
          { value: "PENDING_VERIFICATION" as const, weight: 5 },
          { value: "DEACTIVATED" as const, weight: 3 },
        ]),
        emailVerified: faker.datatype.boolean(0.85) ? created : null,
        twoFactorEnabled: faker.datatype.boolean(0.15),
        createdAt: created,
        lastLoginAt: faker.datatype.boolean(0.7)
          ? daysAgo(faker.number.int({ min: 0, max: 40 }))
          : null,
        notificationPrefs: { create: notifPrefs() },
      },
    });
    customers.push(user);
  }
  console.log(`  ${customers.length} customers, ${sellerProfiles.length} sellers`);

  // --- Products --------------------------------------------------------
  console.log("• products");
  const products: { id: string; sellerId: string; tiers: { id: string; priceCents: number; interval: string }[]; priceFrom: number }[] = [];

  for (let i = 0; i < 140; i += 1) {
    const seller = pick(sellerProfiles);
    const category = pick(categories);
    const noun = faker.commerce.productName();
    const name = `${noun} ${pick(["Kit", "Pack", "Suite", "Bundle", "Toolkit", "Set"])}`;
    const status = faker.helpers.weightedArrayElement([
      { value: "PUBLISHED" as const, weight: 78 },
      { value: "DRAFT" as const, weight: 10 },
      { value: "IN_REVIEW" as const, weight: 7 },
      { value: "ARCHIVED" as const, weight: 5 },
    ]);
    const createdAt = daysAgo(faker.number.int({ min: 1, max: 300 }));

    const tierCount = faker.number.int({ min: 1, max: 3 });
    const base = faker.number.int({ min: 5, max: 240 }) * 100;
    const tierInputs: Prisma.PricingTierCreateWithoutProductInput[] = Array.from({
      length: tierCount,
    }).map((_, t): Prisma.PricingTierCreateWithoutProductInput => {
      const interval: Prisma.PricingTierCreateWithoutProductInput["interval"] =
        t === tierCount - 1 && faker.datatype.boolean(0.3)
          ? pick(["MONTH", "YEAR"] as const)
          : "ONE_TIME";
      return {
        name: ["Personal", "Team", "Enterprise"][t] ?? `Tier ${t + 1}`,
        description: faker.commerce.productDescription().slice(0, 160),
        priceCents: base + t * faker.number.int({ min: 10, max: 120 }) * 100,
        currency: "usd",
        interval,
        features: faker.helpers.arrayElements(
          [
            "Commercial license",
            "Lifetime updates",
            "Figma source",
            "Priority support",
            "Team seats",
            "SVG + PNG exports",
            "Dark mode variants",
          ],
          faker.number.int({ min: 2, max: 5 }),
        ),
        sortOrder: t,
      };
    });
    const priceFrom = Math.min(...tierInputs.map((t) => t.priceCents));

    const product = await db.product.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        name,
        slug: `${faker.helpers.slugify(name).toLowerCase()}-${faker.string.alphanumeric(5).toLowerCase()}`,
        shortDescription: faker.commerce.productDescription().slice(0, 180),
        description: faker.lorem.paragraphs({ min: 3, max: 6 }, "\n\n"),
        status,
        publishedAt: status === "PUBLISHED" ? createdAt : null,
        createdAt,
        thumbnailUrl: `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/800/500`,
        galleryUrls: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }).map(
          () => `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/1200/800`,
        ),
        seoTitle: `${name} - ${category.name}`,
        seoDescription: faker.company.catchPhrase(),
        seoKeywords: faker.helpers.arrayElements(
          [category.name.toLowerCase(), "design", "template", "download", "premium"],
          3,
        ),
        priceFromCents: priceFrom,
        pricingTiers: { create: tierInputs },
        assets: {
          create: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => ({
            fileName: `${faker.system.commonFileName("zip")}`,
            fileUrl: `https://cdn.ledgerline.dev/assets/${randomUUID()}`,
            fileSizeBytes: BigInt(faker.number.int({ min: 2_000_000, max: 400_000_000 })),
            mimeType: "application/zip",
            version: `${faker.number.int({ min: 1, max: 4 })}.${faker.number.int({ min: 0, max: 9 })}.0`,
          })),
        },
      },
      include: { pricingTiers: true },
    });

    products.push({
      id: product.id,
      sellerId: seller.id,
      priceFrom,
      tiers: product.pricingTiers.map((t) => ({ id: t.id, priceCents: t.priceCents, interval: t.interval })),
    });
  }
  const publishedProducts = products.filter((p) => p.priceFrom >= 0);
  console.log(`  ${products.length} products`);

  // --- Reviews --------------------------------------------------------
  console.log("• reviews");
  let reviewCount = 0;
  for (const product of publishedProducts) {
    const n = faker.number.int({ min: 0, max: 9 });
    const reviewers = faker.helpers.arrayElements(customers, n);
    for (const reviewer of reviewers) {
      const rating = faker.helpers.weightedArrayElement([
        { value: 5, weight: 5 },
        { value: 4, weight: 4 },
        { value: 3, weight: 2 },
        { value: 2, weight: 1 },
        { value: 1, weight: 1 },
      ]);
      await db.review.create({
        data: {
          productId: product.id,
          userId: reviewer.id,
          rating,
          title: faker.helpers.arrayElement(["Great value", "Exactly what I needed", "Solid", "Could be better", "Love it"]),
          body: faker.lorem.sentences({ min: 1, max: 3 }),
          isVerifiedPurchase: faker.datatype.boolean(0.7),
          createdAt: daysAgo(faker.number.int({ min: 0, max: 200 })),
        },
      }).catch(() => undefined);
      reviewCount += 1;
    }
    const agg = await db.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: product.id },
      data: { ratingAverage: agg._avg.rating ?? 0, ratingCount: agg._count },
    });
  }
  console.log(`  ~${reviewCount} reviews`);

  // --- Orders --------------------------------------------------------
  console.log("• orders");
  const providers = ["MOCK", "STRIPE", "PAYPAL", "PAYU"] as const;
  const sellerRevenue = new Map<string, { revenue: number; sales: number }>();
  let orderCount = 0;

  for (let i = 0; i < 460; i += 1) {
    const customer = pick(customers);
    const placedAt = daysAgo(faker.number.int({ min: 0, max: 180 }));
    const lineCount = faker.number.int({ min: 1, max: 3 });
    const chosen = faker.helpers.arrayElements(publishedProducts, lineCount);
    if (chosen.length === 0) continue;

    const items = chosen.map((product) => {
      const tier = pick(product.tiers);
      const quantity = faker.number.int({ min: 1, max: 2 });
      const total = tier.priceCents * quantity;
      return {
        productId: product.id,
        pricingTierId: tier.id,
        sellerId: product.sellerId,
        quantity,
        unitPriceCents: tier.priceCents,
        totalCents: total,
        commissionCents: Math.round(total * 0.07),
      };
    });
    const subtotal = items.reduce((s, it) => s + it.totalCents, 0);

    const status = faker.helpers.weightedArrayElement([
      { value: "PAID" as const, weight: 40 },
      { value: "FULFILLED" as const, weight: 40 },
      { value: "PENDING" as const, weight: 6 },
      { value: "REFUNDED" as const, weight: 5 },
      { value: "PARTIALLY_REFUNDED" as const, weight: 4 },
      { value: "CANCELLED" as const, weight: 3 },
      { value: "FAILED" as const, weight: 2 },
    ]);
    const paid = ["PAID", "FULFILLED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(status);
    const provider = pick(providers);

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
        customerId: customer.id,
        status,
        currency: "usd",
        subtotalCents: subtotal,
        taxCents: 0,
        totalCents: subtotal,
        provider,
        providerPaymentId: paid ? `pi_${faker.string.alphanumeric(20)}` : null,
        billingEmail: customer.email,
        billingName: customer.name,
        billingCountry: faker.location.countryCode(),
        placedAt,
        createdAt: placedAt,
        paidAt: paid ? placedAt : null,
        fulfilledAt: status === "FULFILLED" ? placedAt : null,
        items: {
          create: items.map((it) => ({
            ...it,
            fulfillment: status === "FULFILLED" ? "DELIVERED" : "PENDING",
            licenseKey: paid ? faker.string.alphanumeric(24).toUpperCase() : null,
            createdAt: placedAt,
          })),
        },
      },
    });
    orderCount += 1;

    if (paid) {
      for (const it of items) {
        const agg = sellerRevenue.get(it.sellerId) ?? { revenue: 0, sales: 0 };
        agg.revenue += it.totalCents - it.commissionCents;
        agg.sales += it.quantity;
        sellerRevenue.set(it.sellerId, agg);
        await db.product.update({
          where: { id: it.productId },
          data: { salesCount: { increment: it.quantity } },
        });
      }
    }

    // Refunds for some
    if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED" || faker.datatype.boolean(0.05)) {
      const orderItems = await db.orderItem.findMany({ where: { orderId: order.id } });
      const target = pick(orderItems);
      const refundStatus = faker.helpers.weightedArrayElement([
        { value: "PROCESSED" as const, weight: 5 },
        { value: "REQUESTED" as const, weight: 3 },
        { value: "REJECTED" as const, weight: 2 },
      ]);
      await db.refund.create({
        data: {
          orderId: order.id,
          orderItemId: target.id,
          amountCents: target.totalCents,
          currency: "usd",
          reason: faker.helpers.arrayElement([
            "Bought the wrong tier",
            "Not compatible with my stack",
            "Duplicate purchase",
            "Quality below expectations",
          ]),
          status: refundStatus,
          requestedById: order.customerId,
          processedById: refundStatus === "REQUESTED" ? null : demoAdmin.id,
          processedAt: refundStatus === "REQUESTED" ? null : placedAt,
          providerRefundId: refundStatus === "PROCESSED" ? `re_${faker.string.alphanumeric(18)}` : null,
          createdAt: placedAt,
        },
      });
    }
  }

  for (const [sellerId, agg] of sellerRevenue) {
    await db.sellerProfile.update({
      where: { id: sellerId },
      data: {
        lifetimeRevenueCents: BigInt(agg.revenue),
        lifetimeSales: agg.sales,
      },
    });
  }
  console.log(`  ${orderCount} orders`);

  // --- Subscriptions & invoices --------------------------------------
  console.log("• subscriptions + invoices");
  const subscribers = faker.helpers.arrayElements(customers, 130).concat(demoCustomer);
  let invoiceCount = 0;

  for (const subscriber of subscribers) {
    const plan = faker.helpers.weightedArrayElement([
      { value: plans[0], weight: 5 },
      { value: plans[1], weight: 4 },
      { value: plans[2], weight: 2 },
    ]);
    const startedAt = daysAgo(faker.number.int({ min: 5, max: 300 }));
    const status = faker.helpers.weightedArrayElement([
      { value: "ACTIVE" as const, weight: 60 },
      { value: "TRIALING" as const, weight: 10 },
      { value: "PAST_DUE" as const, weight: 8 },
      { value: "CANCELED" as const, weight: 18 },
      { value: "INCOMPLETE" as const, weight: 4 },
    ]);
    const monthsActive = Math.min(
      12,
      Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24 * 30))),
    );
    const periodStart = daysAgo(faker.number.int({ min: 0, max: 28 }));
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await db.subscription.create({
      data: {
        userId: subscriber.id,
        planId: plan.id,
        status,
        provider: pick(providers),
        providerSubscriptionId: `sub_${faker.string.alphanumeric(20)}`,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: status === "ACTIVE" && faker.datatype.boolean(0.1),
        trialEndsAt: status === "TRIALING" ? faker.date.soon({ days: 10 }) : null,
        canceledAt: status === "CANCELED" ? faker.date.recent({ days: 60 }) : null,
        endedAt: status === "CANCELED" ? faker.date.recent({ days: 60 }) : null,
        createdAt: startedAt,
      },
    });

    const invoiceMonths = status === "CANCELED" ? faker.number.int({ min: 1, max: monthsActive }) : monthsActive;
    for (let m = invoiceMonths; m >= 1; m -= 1) {
      const issuedAt = daysAgo(m * 30 + faker.number.int({ min: 0, max: 4 }));
      const pStart = new Date(issuedAt);
      const pEnd = new Date(issuedAt);
      pEnd.setMonth(pEnd.getMonth() + 1);
      const invStatus =
        m === 1 && status === "PAST_DUE"
          ? "OPEN"
          : faker.helpers.weightedArrayElement([
              { value: "PAID" as const, weight: 92 },
              { value: "VOID" as const, weight: 4 },
              { value: "UNCOLLECTIBLE" as const, weight: 4 },
            ]);
      await db.invoice.create({
        data: {
          number: `INV-${faker.string.numeric(8)}`,
          userId: subscriber.id,
          subscriptionId: sub.id,
          status: invStatus,
          currency: "usd",
          subtotalCents: plan.priceCents,
          totalCents: plan.priceCents,
          amountPaidCents: invStatus === "PAID" ? plan.priceCents : 0,
          provider: sub.provider,
          providerInvoiceId: `in_${faker.string.alphanumeric(18)}`,
          hostedUrl: `https://pay.ledgerline.dev/i/${faker.string.alphanumeric(12)}`,
          periodStart: pStart,
          periodEnd: pEnd,
          issuedAt,
          paidAt: invStatus === "PAID" ? issuedAt : null,
          createdAt: issuedAt,
          lineItems: {
            create: [
              {
                description: `${plan.name} plan - monthly`,
                quantity: 1,
                unitAmountCents: plan.priceCents,
                amountCents: plan.priceCents,
              },
            ],
          },
        },
      });
      invoiceCount += 1;
    }

    // Payment methods
    const pmCount = faker.number.int({ min: 1, max: 2 });
    for (let p = 0; p < pmCount; p += 1) {
      await db.paymentMethod.create({
        data: {
          userId: subscriber.id,
          provider: sub.provider,
          providerPaymentMethodId: `pm_${faker.string.alphanumeric(20)}`,
          brand: pick(["visa", "mastercard", "amex"]),
          last4: faker.finance.creditCardNumber("####"),
          expMonth: faker.number.int({ min: 1, max: 12 }),
          expYear: faker.number.int({ min: 2026, max: 2031 }),
          isDefault: p === 0,
        },
      });
    }
  }
  console.log(`  ${subscribers.length} subscriptions, ${invoiceCount} invoices`);

  // --- API keys + request logs -------------------------------------
  console.log("• api keys + request logs");
  const keyOwners = [demoSellerUser, demoCustomer, demoAdmin, ...faker.helpers.arrayElements(customers, 40)];
  const scopes = ["products:read", "products:write", "orders:read", "analytics:read", "webhooks:manage"];
  for (const owner of keyOwners) {
    const keyCount = faker.number.int({ min: 1, max: 3 });
    for (let k = 0; k < keyCount; k += 1) {
      const raw = `sk_live_${faker.string.alphanumeric(40)}`;
      const created = daysAgo(faker.number.int({ min: 1, max: 180 }));
      const status = faker.helpers.weightedArrayElement([
        { value: "ACTIVE" as const, weight: 8 },
        { value: "REVOKED" as const, weight: 2 },
      ]);
      const key = await db.apiKey.create({
        data: {
          userId: owner.id,
          name: `${pick(["Production", "Staging", "CI", "Zapier", "Internal"])} key`,
          prefix: "sk_live_",
          hashedKey: createHash("sha256").update(`${HASH_PEPPER}:${raw}`).digest("hex"),
          lastFour: raw.slice(-4),
          scopes: faker.helpers.arrayElements(scopes, faker.number.int({ min: 1, max: 4 })),
          rateLimitPerMin: pick([60, 120, 300, 600]),
          status,
          createdAt: created,
          lastUsedAt: status === "ACTIVE" ? daysAgo(faker.number.int({ min: 0, max: 10 })) : null,
          revokedAt: status === "REVOKED" ? faker.date.recent({ days: 30 }) : null,
        },
      });

      if (status === "ACTIVE") {
        const logs = Array.from({ length: faker.number.int({ min: 20, max: 120 }) }).map(() => {
          const code = faker.helpers.weightedArrayElement([
            { value: 200, weight: 80 },
            { value: 201, weight: 6 },
            { value: 400, weight: 5 },
            { value: 401, weight: 3 },
            { value: 429, weight: 3 },
            { value: 500, weight: 3 },
          ]);
          return {
            apiKeyId: key.id,
            userId: owner.id,
            method: pick(["GET", "GET", "GET", "POST"]),
            path: pick(["/api/v1/products", "/api/v1/products", "/api/v1/orders", "/api/v1/analytics"]),
            statusCode: code,
            durationMs: faker.number.int({ min: 12, max: 900 }),
            ip: faker.internet.ipv4(),
            userAgent: "ledgerline-sdk/1.4.0",
            createdAt: faker.date.recent({ days: 14 }),
          };
        });
        await db.apiRequestLog.createMany({ data: logs });
      }
    }
  }

  // --- Observability ----------------------------------------------
  console.log("• audit + system logs + metrics");
  const auditActions = [
    "user.signup",
    "order.create",
    "subscription.start",
    "subscription.cancel",
    "product.create",
    "apikey.create",
    "apikey.revoke",
    "refund.request",
    "admin.user.update",
    "security.2fa_enabled",
  ];
  await db.auditLog.createMany({
    data: Array.from({ length: 320 }).map(() => {
      const actor = pick(customers);
      return {
        actorId: actor.id,
        actorEmail: actor.email,
        action: pick(auditActions),
        entityType: pick(["User", "Order", "Product", "Subscription", "ApiKey", "Refund"]),
        entityId: randomUUID(),
        metadata: {},
        ip: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
        createdAt: faker.date.recent({ days: 90 }),
      };
    }),
  });

  const logSources = ["auth", "billing", "orders", "webhook", "api", "admin", "seed"];
  await db.systemLog.createMany({
    data: Array.from({ length: 420 }).map(() => ({
      level: faker.helpers.weightedArrayElement([
        { value: "INFO" as const, weight: 60 },
        { value: "WARN" as const, weight: 22 },
        { value: "ERROR" as const, weight: 12 },
        { value: "DEBUG" as const, weight: 5 },
        { value: "FATAL" as const, weight: 1 },
      ]),
      source: pick(logSources),
      message: faker.hacker.phrase(),
      context: {},
      requestId: randomUUID(),
      createdAt: faker.date.recent({ days: 30 }),
    })),
  });

  const metricNames: { name: string; unit: string; min: number; max: number }[] = [
    { name: "api.latency_p95", unit: "ms", min: 60, max: 480 },
    { name: "api.latency_p50", unit: "ms", min: 20, max: 140 },
    { name: "server.cpu", unit: "%", min: 8, max: 82 },
    { name: "server.memory", unit: "%", min: 35, max: 78 },
    { name: "db.connections", unit: "count", min: 3, max: 40 },
  ];
  const metricRows: Prisma.SystemMetricCreateManyInput[] = [];
  for (let h = 96; h >= 0; h -= 1) {
    const recordedAt = new Date(Date.now() - h * 15 * 60 * 1000);
    for (const metric of metricNames) {
      metricRows.push({
        name: metric.name,
        unit: metric.unit,
        value: faker.number.float({ min: metric.min, max: metric.max, fractionDigits: 1 }),
        recordedAt,
      });
    }
  }
  await db.systemMetric.createMany({ data: metricRows });

  // --- Webhook events -------------------------------------------
  await db.webhookEvent.createMany({
    data: Array.from({ length: 80 }).map(() => {
      const status = faker.helpers.weightedArrayElement([
        { value: "PROCESSED" as const, weight: 84 },
        { value: "FAILED" as const, weight: 8 },
        { value: "IGNORED" as const, weight: 6 },
        { value: "RECEIVED" as const, weight: 2 },
      ]);
      return {
        provider: pick(providers),
        eventId: `evt_${faker.string.alphanumeric(24)}`,
        eventType: pick([
          "checkout.completed",
          "payment.succeeded",
          "invoice.paid",
          "subscription.updated",
          "refund.succeeded",
        ]),
        status,
        payload: {},
        error: status === "FAILED" ? "handler timeout after 3 attempts" : null,
        attempts: status === "FAILED" ? 3 : 1,
        receivedAt: faker.date.recent({ days: 20 }),
        processedAt: status === "PROCESSED" ? faker.date.recent({ days: 20 }) : null,
      };
    }),
  });

  // --- Notifications ------------------------------------------
  const notifRows: Prisma.NotificationCreateManyInput[] = [];
  for (const customer of faker.helpers.arrayElements(customers, 90).concat(demoCustomer)) {
    const n = faker.number.int({ min: 1, max: 6 });
    for (let x = 0; x < n; x += 1) {
      notifRows.push({
        userId: customer.id,
        category: pick(["BILLING", "ORDERS", "SECURITY", "PRODUCT", "SYSTEM"]),
        title: faker.helpers.arrayElement([
          "Payment received",
          "Your download is ready",
          "New sign-in from Chrome",
          "Invoice available",
          "Price drop on a wishlisted item",
        ]),
        body: faker.lorem.sentence(),
        href: "/dashboard",
        readAt: faker.datatype.boolean(0.55) ? faker.date.recent({ days: 10 }) : null,
        createdAt: faker.date.recent({ days: 25 }),
      });
    }
  }
  await db.notification.createMany({ data: notifRows });

  // --- Daily rollups (120 days) --------------------------------
  console.log("• daily stats");
  let mrr = 180_000;
  const dailyRows: Prisma.DailyStatCreateManyInput[] = [];
  for (let d = 120; d >= 0; d -= 1) {
    const date = daysAgo(d);
    date.setUTCHours(0, 0, 0, 0);
    const newUsers = faker.number.int({ min: 1, max: 14 });
    const newSubs = faker.number.int({ min: 0, max: 6 });
    const canceledSubs = faker.number.int({ min: 0, max: 3 });
    const gross = faker.number.int({ min: 40_000, max: 220_000 });
    const refunded = faker.number.int({ min: 0, max: 18_000 });
    mrr += newSubs * 4_500 - canceledSubs * 4_200 + faker.number.int({ min: -1_500, max: 3_000 });
    dailyRows.push({
      date,
      newUsers,
      activeUsers: faker.number.int({ min: 120, max: 480 }),
      newSubscriptions: newSubs,
      canceledSubscriptions: canceledSubs,
      grossRevenueCents: BigInt(gross),
      refundedCents: BigInt(refunded),
      mrrCents: BigInt(Math.max(50_000, mrr)),
      activeSubscriptions: faker.number.int({ min: 90, max: 160 }),
      churnedRevenueCents: BigInt(canceledSubs * 4_200),
    });
  }
  await db.dailyStat.createMany({ data: dailyRows });

  console.log("\n✓ Seed complete.");
  console.log(`  Sign in: admin@ledgerline.dev / seller@ledgerline.dev / customer@ledgerline.dev`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
