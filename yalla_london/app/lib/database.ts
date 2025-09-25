/**
 * Database Service - Phase-4C Implementation
 * Single source of truth with proper SSL configuration
 */

import { PrismaClient } from '@prisma/client';

// Global Prisma client instance
let prisma: PrismaClient | null = null;

/**
 * Get Prisma client instance
 * Uses pooler URL for app traffic, direct URL for migrations
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Fail fast if DATABASE_URL is missing
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Log which URL type is being used (no secrets in logs)
    const isDirectUrl = process.env.DATABASE_URL === process.env.DIRECT_URL;
    const urlType = isDirectUrl ? 'direct' : 'pooler';
    console.log(`Database: Using ${urlType} URL for Prisma client`);

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Remove ssl: { rejectUnauthorized: false }
      // Use sslmode=require in URLs as documented
    });
  }

  return prisma;
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
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
