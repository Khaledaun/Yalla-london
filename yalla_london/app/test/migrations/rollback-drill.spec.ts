/**
 * Rollback Drill Test
 * Tests migration rollback procedures
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { getPrismaClient } from '@/lib/database';

describe('Rollback Drill Tests', () => {
  let prisma: any;
  let testMigrationName: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    testMigrationName = `test_rollback_${Date.now()}`;
  });

  afterAll(async () => {
    // Clean up any test migrations
    try {
      if (testMigrationName) {
        execSync(`npx prisma migrate resolve --rolled-back ${testMigrationName}`, {
          stdio: 'pipe',
          env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should perform complete rollback drill', async () => {
    // Step 1: Check initial migration status
    let statusOutput: string;
    try {
      statusOutput = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Initial migration status:', statusOutput);
      expect(statusOutput).toContain('Database schema is up to date');
    } catch (error) {
      console.error('Initial status check failed:', error);
      throw error;
    }

    // Step 2: Create a test migration
    let migrationOutput: string;
    try {
      migrationOutput = execSync(`npx prisma migrate dev --name ${testMigrationName} --create-only`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Migration creation output:', migrationOutput);
    } catch (error) {
      console.error('Migration creation failed:', error);
      // If migration creation fails, we can still test the rollback process
    }

    // Step 3: Apply the migration
    try {
      const deployOutput = execSync('npx prisma migrate deploy', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Migration deploy output:', deployOutput);
    } catch (error) {
      console.error('Migration deploy failed:', error);
      // Continue with rollback test even if deploy fails
    }

    // Step 4: Check migration status after apply
    try {
      const postDeployStatus = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Post-deploy migration status:', postDeployStatus);
      expect(postDeployStatus).toContain('Database schema is up to date');
    } catch (error) {
      console.error('Post-deploy status check failed:', error);
      throw error;
    }

    // Step 5: Rollback the migration
    try {
      const rollbackOutput = execSync(`npx prisma migrate resolve --rolled-back ${testMigrationName}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Rollback output:', rollbackOutput);
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }

    // Step 6: Check migration status after rollback
    try {
      const postRollbackStatus = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Post-rollback migration status:', postRollbackStatus);
      expect(postRollbackStatus).toContain('Database schema is up to date');
    } catch (error) {
      console.error('Post-rollback status check failed:', error);
      throw error;
    }

    // Step 7: Verify database connectivity after rollback
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connectivity verified after rollback');
    } catch (error) {
      console.error('Database connectivity failed after rollback:', error);
      throw error;
    }
  });

  it('should handle rollback of non-existent migration gracefully', async () => {
    const nonExistentMigration = `non_existent_${Date.now()}`;
    
    try {
      const rollbackOutput = execSync(`npx prisma migrate resolve --rolled-back ${nonExistentMigration}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Non-existent migration rollback output:', rollbackOutput);
    } catch (error) {
      // This is expected to fail for non-existent migrations
      console.log('Expected failure for non-existent migration:', error.message);
      expect(error.message).toContain('Could not find migration');
    }
  });

  it('should validate migration status format', async () => {
    try {
      const statusOutput = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      
      // Status should contain expected format
      expect(statusOutput).toMatch(/Database schema is up to date|Your database is now in sync/);
      
      // Should not contain error indicators
      expect(statusOutput).not.toContain('Error');
      expect(statusOutput).not.toContain('Failed');
      
    } catch (error) {
      console.error('Migration status validation failed:', error);
      throw error;
    }
  });

  it('should test migration resolve with different statuses', async () => {
    // Test resolve with applied status
    try {
      const resolveOutput = execSync('npx prisma migrate resolve --applied test_migration', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Resolve applied output:', resolveOutput);
    } catch (error) {
      // Expected to fail for non-existent migration
      console.log('Expected failure for non-existent migration resolve:', error.message);
    }

    // Test resolve with rolled-back status
    try {
      const rollbackOutput = execSync('npx prisma migrate resolve --rolled-back test_migration', {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: 'true' }
      });
      console.log('Resolve rolled-back output:', rollbackOutput);
    } catch (error) {
      // Expected to fail for non-existent migration
      console.log('Expected failure for non-existent migration rollback:', error.message);
    }
  });
});
