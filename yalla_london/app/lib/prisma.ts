/**
 * Prisma Client Export
 *
 * Uses lazy initialization to avoid errors during build when Prisma client
 * is not fully generated. The client is only instantiated when first accessed.
 */

import { PrismaClient } from "@prisma/client";

// Models that support soft delete (have a deletedAt column)
const SOFT_DELETE_MODELS = ["User", "BlogPost", "MediaAsset"];

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
 * Adds soft delete middleware to Prisma client.
 * Automatically filters out records where deletedAt is not null.
 */
function addSoftDeleteMiddleware(client: PrismaClient): void {
  client.$use(async (params, next) => {
    if (params.model && SOFT_DELETE_MODELS.includes(params.model)) {
      // For read queries, automatically exclude soft-deleted records
      if (params.action && SOFT_DELETE_ACTIONS.includes(params.action)) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        // Only add the filter if not explicitly querying by deletedAt
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      // For delete operations, convert to soft delete
      if (params.action === "delete") {
        params.action = "update";
        params.args.data = { deletedAt: new Date() };
      }
      if (params.action === "deleteMany") {
        params.action = "updateMany";
        if (!params.args) params.args = {};
        if (!params.args.data) params.args.data = {};
        params.args.data.deletedAt = new Date();
      }
    }

    return next(params);
  });
}

/**
 * Get or create the Prisma client singleton.
 * Uses lazy initialization to avoid build-time errors.
 */
function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) {
    return globalThis.__prisma;
  }

  try {
    const client = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });

    // Add soft delete middleware
    addSoftDeleteMiddleware(client);

    // Store on globalThis in development to prevent multiple instances
    if (process.env.NODE_ENV !== "production") {
      globalThis.__prisma = client;
    }

    return client;
  } catch (error) {
    // During build, Prisma client may not be available
    // Return a mock that will throw helpful errors at runtime
    console.warn(
      "Prisma client not available, using mock client for build compatibility",
    );
    return createMockPrismaClient() as unknown as PrismaClient;
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
