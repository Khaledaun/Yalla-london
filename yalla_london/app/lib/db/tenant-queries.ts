/**
 * Tenant-Scoped Prisma Client
 *
 * Provides a proxy around Prisma that automatically injects site_id
 * into all queries for tenant isolation.
 *
 * Usage:
 *   const db = getTenantPrisma(siteId);
 *   const posts = await db.blogPost.findMany(); // Auto-filtered by site_id
 */

import { prisma } from '@/lib/prisma';
import { TenantMismatchError } from './assertions';

// Use any for flexibility with mock client during build
type PrismaClientType = any;

// Re-export for backwards compatibility
export { TenantMismatchError };

// Models that require tenant scoping (have site_id column)
const TENANT_SCOPED_MODELS = new Set([
  'blogPost',
  'category',
  'subscriber',
  'affiliatePartner',
  'affiliateClick',
  'conversion',
  'lead',
  'leadActivity',
  'pageView',
  'digitalProduct',
  'purchase',
  'domain',
  'teamMember',
  'contentCredit',
  // Future models:
  'resort',
  'comparison',
  'comparisonResort',
  'product',
]);

// Query methods that need WHERE clause injection
const READ_METHODS = ['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'];
const CREATE_METHODS = ['create', 'createMany', 'createManyAndReturn'];
const UPDATE_METHODS = ['update', 'updateMany', 'upsert'];
const DELETE_METHODS = ['delete', 'deleteMany'];

export interface TenantPrismaClient extends PrismaClientType {
  $tenantId: string;
  $assertTenant: (resourceSiteId: string | null | undefined) => void;
}

/**
 * Creates a tenant-scoped Prisma client that auto-injects site_id
 * into all queries for models that support tenant scoping.
 */
export function getTenantPrisma(siteId: string): TenantPrismaClient {
  if (!siteId) {
    throw new Error('getTenantPrisma requires a valid siteId');
  }

  return new Proxy(prisma, {
    get(target, prop: string) {
      // Return tenant ID
      if (prop === '$tenantId') {
        return siteId;
      }

      // Return assertion helper
      if (prop === '$assertTenant') {
        return (resourceSiteId: string | null | undefined) => {
          if (resourceSiteId && resourceSiteId !== siteId) {
            throw new TenantMismatchError(siteId, resourceSiteId);
          }
        };
      }

      const value = (target as any)[prop];

      // If this is a tenant-scoped model, wrap it
      if (typeof value === 'object' && value !== null && TENANT_SCOPED_MODELS.has(prop)) {
        return createTenantScopedModel(value as any, siteId, prop);
      }

      // Return other properties as-is
      return value;
    },
  }) as unknown as TenantPrismaClient;
}

/**
 * Creates a proxy for a Prisma model that injects site_id into queries
 */
function createTenantScopedModel(model: any, siteId: string, modelName: string) {
  return new Proxy(model, {
    get(target, method: string) {
      const originalMethod = target[method];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      // READ operations - add site_id to WHERE
      if (READ_METHODS.includes(method)) {
        return (args: any = {}) => {
          args.where = { ...args.where, site_id: siteId };
          return originalMethod.call(target, args);
        };
      }

      // CREATE operations - inject site_id into data
      if (CREATE_METHODS.includes(method)) {
        return (args: any) => {
          if (method === 'createMany' || method === 'createManyAndReturn') {
            // Handle array of records
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({ ...d, site_id: siteId }));
            }
          } else {
            // Single record create
            args.data = { ...args.data, site_id: siteId };
          }
          return originalMethod.call(target, args);
        };
      }

      // UPDATE operations - add site_id to WHERE
      if (UPDATE_METHODS.includes(method)) {
        return (args: any) => {
          if (method === 'upsert') {
            // Upsert needs site_id in both where and create
            args.where = { ...args.where, site_id: siteId };
            args.create = { ...args.create, site_id: siteId };
          } else {
            args.where = { ...args.where, site_id: siteId };
          }
          return originalMethod.call(target, args);
        };
      }

      // DELETE operations - add site_id to WHERE
      if (DELETE_METHODS.includes(method)) {
        return (args: any) => {
          args.where = { ...args.where, site_id: siteId };
          return originalMethod.call(target, args);
        };
      }

      // Pass through other methods unchanged
      return originalMethod.bind(target);
    },
  });
}

/**
 * Helper to get tenant Prisma client from request context
 */
export async function getTenantPrismaFromContext(): Promise<TenantPrismaClient> {
  const { getTenantContext } = await import('@/lib/tenant');
  const context = await getTenantContext();
  return getTenantPrisma(context.siteId);
}

/**
 * Execute a callback with tenant-scoped database access
 */
export async function withTenantDb<T>(
  siteId: string,
  callback: (db: TenantPrismaClient) => Promise<T>
): Promise<T> {
  const db = getTenantPrisma(siteId);
  return callback(db);
}

/**
 * Transaction helper that maintains tenant scope
 */
export async function tenantTransaction<T>(
  siteId: string,
  callback: (tx: TenantPrismaClient) => Promise<T>
): Promise<T> {
  return (prisma as any).$transaction(async (tx: any) => {
    // Create tenant-scoped proxy for the transaction
    const tenantTx = new Proxy(tx, {
      get(target: any, prop: string) {
        if (prop === '$tenantId') return siteId;

        if (prop === '$assertTenant') {
          return (resourceSiteId: string | null | undefined) => {
            if (resourceSiteId && resourceSiteId !== siteId) {
              throw new TenantMismatchError(siteId, resourceSiteId);
            }
          };
        }

        const value = target[prop];

        if (typeof value === 'object' && value !== null && TENANT_SCOPED_MODELS.has(prop)) {
          return createTenantScopedModel(value as any, siteId, prop);
        }

        return value;
      },
    }) as unknown as TenantPrismaClient;

    return callback(tenantTx);
  });
}
