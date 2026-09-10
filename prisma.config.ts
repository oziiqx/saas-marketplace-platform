import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved datasource/migration configuration out of `schema.prisma`.
 * The runtime client connects through a driver adapter (see `src/lib/db.ts`);
 * the CLI (migrate / db push / studio / seed) reads the URL from here.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
