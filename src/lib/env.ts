import { z } from "zod";

/**
 * Runtime environment contract. Validated once, at module load.
 * Set `SKIP_ENV_VALIDATION=1` for lint/typecheck in CI without a real env.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth.js
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required (run `npx auth secret`)"),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Payments
  PAYMENTS_DEFAULT_PROVIDER: z
    .enum(["mock", "stripe", "paypal", "payu"])
    .default("mock"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYU_POS_ID: z.string().optional(),
  PAYU_MD5_KEY: z.string().optional(),
  PAYU_OAUTH_CLIENT_ID: z.string().optional(),
  PAYU_OAUTH_CLIENT_SECRET: z.string().optional(),

  // API platform
  API_KEY_HASH_PEPPER: z.string().min(1).default("dev-only-insecure-pepper"),
  API_DEFAULT_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(120),

  // Seed
  SEED_USER_PASSWORD: z.string().default("Password123!"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION) {
    return EnvSchema.partial().parse(process.env) as Env;
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
