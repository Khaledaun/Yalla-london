/**
 * Database Client - Canonical Entry Point
 *
 * All database imports should use `@/lib/db`.
 * Re-exports the Prisma singleton and provides utility functions.
 */

export { prisma, prisma as db } from "@/lib/prisma";

// Re-export tenant-scoped utilities
export {
  getTenantPrisma,
  getTenantPrismaFromContext,
  withTenantDb,
  tenantTransaction,
  type TenantPrismaClient,
} from "@/lib/db/tenant-queries";

// Re-export assertion helpers
export {
  TenantMismatchError,
  assertTenantOwnership,
  assertExists,
  assertPermission,
  assertOneOf,
  assertFutureDate,
  assertValidSlug,
  assertValidEmail,
  assertNotEmpty,
  assertInRange,
  ResourceNotFoundError,
  UnauthorizedError,
  ValidationError,
  DuplicateError,
  InvalidStateError,
  safeJsonParse,
  mapDatabaseError,
  isApiError,
} from "@/lib/db/assertions";

/**
 * Get Prisma client instance (for dynamic import scenarios)
 */
export function getPrismaClient() {
  return require("@/lib/prisma").prisma;
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  migrateStatus: string;
  error?: string;
}> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;

    const result = (await client.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
      ) as has_migrations_table
    `) as any[];

    const hasMigrationsTable = result[0]?.has_migrations_table;
    return {
      connected: true,
      migrateStatus: hasMigrationsTable ? "Valid" : "No migrations table",
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      connected: false,
      migrateStatus: "Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  const client = getPrismaClient();
  if (client && typeof client.$disconnect === "function") {
    await client.$disconnect();
  }
}
