/**
 * Database Module
 *
 * Centralized database access with tenant scoping.
 */

// Tenant-scoped Prisma client
export {
  getTenantPrisma,
  getTenantPrismaFromContext,
  withTenantDb,
  tenantTransaction,
  TenantMismatchError,
  type TenantPrismaClient,
} from './tenant-queries';

// Assertion helpers
export {
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

// Re-export base Prisma client for global queries (admin only)
export { prisma } from '@/lib/prisma';
