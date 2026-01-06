/**
 * Database Module
 *
 * Centralized database access with tenant scoping.
 */

// Assertion helpers (import first to avoid circular dependency)
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
} from './assertions';

// Tenant-scoped Prisma client
export {
  getTenantPrisma,
  getTenantPrismaFromContext,
  withTenantDb,
  tenantTransaction,
  type TenantPrismaClient,
} from './tenant-queries';

// Re-export base Prisma client for global queries (admin only)
export { prisma } from '@/lib/prisma';
