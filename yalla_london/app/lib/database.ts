/**
 * Database Service - Phase-4C Implementation
 * Uses lazy initialization to avoid build-time errors.
 */

// Re-export from centralized prisma module
export { prisma } from '@/lib/prisma';

/**
 * Get Prisma client instance (for backwards compatibility)
 */
export function getPrismaClient() {
  // Import dynamically to avoid build-time instantiation
  return require('@/lib/prisma').prisma;
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
    
    // Test basic connection
    await client.$queryRaw`SELECT 1`;
    
    // Check migration status (simplified check)
    const result = await client.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      ) as has_migrations_table
    ` as any[];
    
    const hasMigrationsTable = result[0]?.has_migrations_table;
    const migrateStatus = hasMigrationsTable ? 'Valid' : 'No migrations table';
    
    return {
      connected: true,
      migrateStatus
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      connected: false,
      migrateStatus: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  const client = getPrismaClient();
  if (client && typeof client.$disconnect === 'function') {
    await client.$disconnect();
  }
}
