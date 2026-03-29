/**
 * Prisma Client Export — Singleton
 *
 * Uses lazy initialization to avoid errors during build when Prisma client
 * is not fully generated. The client is only instantiated when first accessed.
 *
 * CRITICAL: Never create `new PrismaClient()` anywhere else in the app/
 * directory. Always import from `@/lib/db` or `@/lib/prisma`. Creating
 * additional PrismaClient instances leaks connections and exhausts the
 * Supabase PgBouncer pool (MaxClientsInSessionMode error).
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
    // Enforce a SMALL connection pool per serverless instance.
    // Supabase PgBouncer in session mode has a hard pool_size limit (typically
    // 15-20 for Pro). Each Vercel serverless instance holds connections for its
    // lifetime. With cockpit auto-refresh + crons + button clicks, multiple
    // instances run simultaneously:
    //   ~5 warm instances × 3 connections = 15 (fits within pool_size)
    // Previously connection_limit=8 caused "MaxClientsInSessionMode: max clients
    // reached" because 3+ instances × 8 = 24 > pool_size.
    //
    // pool_timeout=15 gives queries enough time to wait when all 3 slots are
    // busy (was 5s from DATABASE_URL, causing P2024 timeouts on every cron cluster).
    //
    // IMPORTANT: We REPLACE existing values rather than skip — the DATABASE_URL
    // from Supabase often has pool_timeout=5 which is too aggressive for our
    // concurrent cron pattern.
    let dbUrl = process.env.DATABASE_URL || "";

    // ── CRITICAL: Fix Supabase pooler port ──
    // Supabase pooler hostname (*.pooler.supabase.com) must use port 6543, not 5432.
    // Port 5432 on the pooler hostname is unreliable — TCP connections fail
    // intermittently with "Can't reach database server". This has caused 3+ hours
    // of outages on March 21, 2026.
    // Direct connections (*.db.supabase.co) correctly use 5432.
    if (dbUrl.includes("pooler.supabase.com") && dbUrl.includes(":5432")) {
      dbUrl = dbUrl.replace(":5432", ":6543");
      console.warn("[prisma] Fixed Supabase pooler port: 5432 → 6543");
    }

    // Replace or append connection_limit
    if (dbUrl.includes("connection_limit=")) {
      dbUrl = dbUrl.replace(/connection_limit=\d+/, "connection_limit=3");
    } else {
      const sep = dbUrl.includes("?") ? "&" : "?";
      dbUrl = `${dbUrl}${sep}connection_limit=3`;
    }
    // Replace or append pool_timeout
    if (dbUrl.includes("pool_timeout=")) {
      dbUrl = dbUrl.replace(/pool_timeout=\d+/, "pool_timeout=15");
    } else {
      dbUrl = `${dbUrl}&pool_timeout=15`;
    }
    // Required when using PgBouncer (Supabase pooler) — disables prepared
    // statements which aren't compatible with transaction-mode pooling.
    if (dbUrl && !dbUrl.includes("pgbouncer=")) {
      dbUrl = `${dbUrl}&pgbouncer=true`;
    }
    // Replace or append connect_timeout
    if (dbUrl.includes("connect_timeout=")) {
      dbUrl = dbUrl.replace(/connect_timeout=\d+/, "connect_timeout=10");
    } else {
      dbUrl = `${dbUrl}&connect_timeout=10`;
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

    // Eagerly start the engine connection so the first query doesn't race
    // against engine initialization. On Vercel cold starts, the lazy proxy
    // triggers engine init + $queryRaw simultaneously, causing:
    // "Engine is not yet connected. Backtrace [{ fn: start_thread }]"
    // $connect() is idempotent — safe to call multiple times.
    // Retry $connect up to 3 times with 500ms backoff.
    // Single-attempt $connect fails on Vercel cold starts when Supabase pooler
    // is under load (March 21 2026: 3258ms latency, intermittent TCP drops).
    (async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await baseClient.$connect();
          return;
        } catch (err) {
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, attempt * 500));
          } else {
            console.warn("[prisma] $connect failed after 3 attempts:", err instanceof Error ? err.message : err);
          }
        }
      }
    })().catch(() => {});

    // Release connections when the serverless process exits so the
    // PgBouncer slot is freed for other instances.
    if (typeof process !== "undefined") {
      process.on("beforeExit", () => {
        baseClient.$disconnect().catch(() => {});
      });
    }

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
