import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env, isProd } from "@/lib/env";

/**
 * Prisma 7 connects through a driver adapter rather than a bundled Rust engine.
 * We hold a single `pg` Pool for the process and reuse the client across HMR
 * reloads in development to avoid exhausting connections.
 */
const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: isProd ? ["error"] : ["error", "warn"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!isProd) {
  globalForPrisma.prisma = db;
}
