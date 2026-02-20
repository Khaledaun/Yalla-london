/**
 * Prisma Client Export
 *
 * Uses lazy initialization to avoid errors during build when Prisma client
 * is not fully generated. The client is only instantiated when first accessed.
 */

import { PrismaClient } from "@prisma/client";

// Models that support soft delete (have a deletedAt column).
// IMPORTANT: Keep empty until `prisma migrate deploy` adds the deletedAt
// column to the production database. The column exists in schema.prisma but
// hasn't been migrated yet. Re-enable: ["User", "BlogPost", "MediaAsset"]
const SOFT_DELETE_MODELS: string[] = [];

// Query actions that should respect soft delete filtering
const SOFT_DELETE_ACTIONS = [
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
];

// Declare global type for PrismaClient to prevent multiple instances
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Wraps a PrismaClient with soft-delete behaviour using Prisma Client Extensions.
 * (Prisma 5+ removed $use middleware — $extends is the replacement.)
 *
 * - Read queries on SOFT_DELETE_MODELS automatically exclude deletedAt != null.
 * - delete / deleteMany on SOFT_DELETE_MODELS are converted to update(s) that
 *   set deletedAt = now().
 */
function withSoftDelete(baseClient: PrismaClient) {
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !SOFT_DELETE_MODELS.includes(model)) {
            return query(args);
          }

          // For read queries, automatically exclude soft-deleted records
          if (SOFT_DELETE_ACTIONS.includes(operation)) {
            if (!args) args = {};
            if (!args.where) args.where = {};
            // Only add the filter if not explicitly querying by deletedAt
            if (args.where.deletedAt === undefined) {
              args.where.deletedAt = null;
            }
            return query(args);
          }

          // Convert delete → soft-delete (update)
          if (operation === "delete") {
            const modelKey =
              model.charAt(0).toLowerCase() + model.slice(1);
            return (baseClient as any)[modelKey].update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }

          // Convert deleteMany → soft-delete (updateMany)
          if (operation === "deleteMany") {
            const modelKey =
              model.charAt(0).toLowerCase() + model.slice(1);
            return (baseClient as any)[modelKey].updateMany({
              where: args?.where ?? {},
              data: { deletedAt: new Date() },
            });
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Detect if we're in Next.js build phase (not runtime).
 */
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL && !process.env.PORT);

/**
 * Get or create the Prisma client singleton.
 * Uses lazy initialization to avoid errors during build when Prisma client
 * is not fully generated. Always caches on globalThis to prevent connection
 * pool exhaustion on warm serverless instances.
 */
function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) {
    return globalThis.__prisma;
  }

  try {
    // Enforce a minimal connection pool to avoid exhausting Supabase PgBouncer
    // limits. Each Prisma connection occupies a PgBouncer slot.
    // Prisma defaults to num_cpus*2+1 which quickly exceeds pool_size when
    // multiple Vercel serverless instances are warm.
    // With connection_limit=1, each instance uses exactly 1 PgBouncer slot.
    let dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl && !dbUrl.includes("connection_limit=")) {
      const sep = dbUrl.includes("?") ? "&" : "?";
      dbUrl = `${dbUrl}${sep}connection_limit=1`;
    }
    // Required when using PgBouncer (Supabase pooler) — disables prepared
    // statements which aren't compatible with transaction-mode pooling.
    if (dbUrl && !dbUrl.includes("pgbouncer=")) {
      dbUrl = `${dbUrl}&pgbouncer=true`;
    }
    // Reduce pool timeout to fail fast instead of hanging when pool is full
    if (dbUrl && !dbUrl.includes("pool_timeout=")) {
      dbUrl = `${dbUrl}&pool_timeout=15`;
    }

    const baseClient = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });

    // Wrap with soft-delete extension (Prisma 5+ replaces $use with $extends)
    const client = withSoftDelete(baseClient) as unknown as PrismaClient;

    // Always cache on globalThis — prevents connection pool exhaustion
    // on warm serverless instances (Vercel reuses the process)
    globalThis.__prisma = client;

    return client;
  } catch (error) {
    // Only use mock during build phase — at runtime, surface the real error
    if (isBuildPhase) {
      console.warn(
        "Prisma client not available during build, using mock for compatibility",
      );
      return createMockPrismaClient() as unknown as PrismaClient;
    }

    // At runtime, log the real error and re-throw so callers see the actual problem
    console.error("Failed to initialize Prisma client:", error);
    throw error;
  }
}

/**
 * Creates a mock Prisma client for build-time compatibility.
 * All methods will throw an error if called at runtime.
 */
function createMockPrismaClient(): Record<string, any> {
  const handler: ProxyHandler<object> = {
    get(target, prop) {
      // Return mock methods for common Prisma operations
      if (prop === "$connect" || prop === "$disconnect") {
        return () => Promise.resolve();
      }
      if (prop === "$transaction") {
        return (fn: any) => fn(createMockPrismaClient());
      }
      // Return a proxy for model access (e.g., prisma.user)
      return new Proxy(
        {},
        {
          get() {
            return () => {
              throw new Error(
                "Database operation called without initialized Prisma client. " +
                  "Ensure DATABASE_URL is set and prisma generate has been run.",
              );
            };
          },
        },
      );
    },
  };
  return new Proxy({}, handler);
}

// Create a proxy that lazily initializes the client
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  },
});

// Named exports for compatibility
export { prisma as db };
export default prisma;
