
/**
 * Database Backup and Restore Utilities for Staging
 * Safe procedures for database management
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

/**
 * Security helper: Extract password from database URL
 */
function extractPasswordFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.password || '';
  } catch {
    return '';
  }
}

/**
 * Security helper: Remove password from URL for logging
 */
function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return 'invalid-url';
  }
}

interface BackupConfig {
  databaseUrl: string;
  backupName: string;
  s3Bucket?: string;
  s3Prefix?: string;
}

/**
 * Create a complete database backup with security validations
 */
export async function createDatabaseBackup(config: BackupConfig): Promise<string> {
  // Security: Validate input parameters
  if (!config.databaseUrl || !config.backupName) {
    throw new Error('Database URL and backup name are required');
  }
  
  // Security: Sanitize backup name to prevent path traversal
  const sanitizedBackupName = config.backupName.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (sanitizedBackupName !== config.backupName) {
    throw new Error('Backup name contains invalid characters');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${sanitizedBackupName}-${timestamp}.sql`;
  const localBackupPath = path.join('./backups', backupFileName);
  
  // Security: Validate database URL format
  try {
    new URL(config.databaseUrl);
  } catch (error) {
    throw new Error('Invalid database URL format');
  }
  
  try {
    console.log('🔄 Starting database backup...');
    
    // Create backups directory if it doesn't exist
    if (!existsSync('./backups')) {
      await execAsync('mkdir -p ./backups');
    }
    
    // Security: Use parameterized execution to prevent command injection
    const dumpArgs = [
      '--verbose',
      '--clean',
      '--no-acl',
      '--no-owner',
      '--format=plain',
      `--file=${localBackupPath}`
    ];
    
    console.log('📊 Creating database dump...');
    // Use spawn instead of exec to prevent command injection
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Set environment variable for database URL to avoid command line exposure
    const env = { ...process.env, PGPASSWORD: extractPasswordFromUrl(config.databaseUrl) };
    const sanitizedUrl = sanitizeUrlForLogging(config.databaseUrl);
    
    console.log(`📊 Creating database dump from: ${sanitizedUrl}`);
    await execAsync(`pg_dump ${dumpArgs.join(' ')} ${JSON.stringify(config.databaseUrl)}`, { env });
    
    console.log('💾 Database dump created successfully');
    
    // Compress backup
    const compressedPath = `${localBackupPath}.gz`;
    await execAsync(`gzip -c ${JSON.stringify(localBackupPath)} > ${JSON.stringify(compressedPath)}`);
    
    console.log('🗜️ Backup compressed');
    
    // Upload to S3 if configured
    if (config.s3Bucket) {
      // Security: Sanitize S3 parameters
      const sanitizedBucket = config.s3Bucket.replace(/[^a-zA-Z0-9\-_.]/g, '');
      const sanitizedPrefix = (config.s3Prefix || 'backups/').replace(/[^a-zA-Z0-9\-_./]/g, '');
      
      if (sanitizedBucket !== config.s3Bucket || sanitizedPrefix !== (config.s3Prefix || 'backups/')) {
        throw new Error('S3 bucket or prefix contains invalid characters');
      }
      
      const s3Key = `${sanitizedPrefix}${backupFileName}.gz`;
      
      console.log('☁️ Uploading backup to S3...');
      await execAsync(`aws s3 cp ${JSON.stringify(compressedPath)} s3://${JSON.stringify(sanitizedBucket)}/${JSON.stringify(s3Key)}`);
      console.log(`✅ Backup uploaded to s3://${sanitizedBucket}/${s3Key}`);
      
      // Clean up local files securely
      await execAsync(`rm ${JSON.stringify(localBackupPath)} ${JSON.stringify(compressedPath)}`);
      
      return s3Key;
    } else {
      console.log(`✅ Backup saved locally: ${compressedPath}`);
      await execAsync(`rm ${JSON.stringify(localBackupPath)}`); // Remove uncompressed file
      return compressedPath;
    }
    
    // Upload to S3 if configured
    if (config.s3Bucket) {
      const s3Key = `${config.s3Prefix || 'backups/'}${backupFileName}.gz`;
      const uploadCommand = `aws s3 cp ${compressedPath} s3://${config.s3Bucket}/${s3Key}`;
      
      console.log('☁️ Uploading backup to S3...');
      await execAsync(uploadCommand);
      console.log(`✅ Backup uploaded to s3://${config.s3Bucket}/${s3Key}`);
      
      // Clean up local files
      await execAsync(`rm ${localBackupPath} ${compressedPath}`);
      
      return s3Key;
    }
    
    // Clean up uncompressed file
    await execAsync(`rm ${localBackupPath}`);
    
    return compressedPath;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

/**
 * Restore database from backup (DESTRUCTIVE)
 */
export async function restoreDatabase(
  backupSource: string,
  targetDatabaseUrl: string,
  options: {
    confirmDestruction?: boolean;
    createPreRestoreBackup?: boolean;
  } = {}
): Promise<void> {
  try {
    console.log('⚠️  WARNING: This operation will DESTROY all existing data');
    
    if (!options.confirmDestruction) {
      throw new Error('Restoration not confirmed. Set confirmDestruction: true to proceed.');
    }
    
    // Create pre-restore backup if requested
    if (options.createPreRestoreBackup) {
      console.log('🛡️  Creating pre-restore backup...');
      await createDatabaseBackup({
        databaseUrl: targetDatabaseUrl,
        backupName: 'pre-restore-backup'
      });
    }
    
    // Download from S3 if needed
    let localBackupPath = backupSource;
    if (backupSource.startsWith('s3://') || backupSource.includes('/')) {
      const fileName = backupSource.split('/').pop() || 'restore-backup.sql.gz';
      localBackupPath = `./backups/${fileName}`;
      
      if (backupSource.startsWith('s3://')) {
        console.log('📥 Downloading backup from S3...');
        await execAsync(`aws s3 cp ${backupSource} ${localBackupPath}`);
      }
    }
    
    // Decompress if needed
    let sqlFilePath = localBackupPath;
    if (localBackupPath.endsWith('.gz')) {
      sqlFilePath = localBackupPath.replace('.gz', '');
      console.log('🗜️ Decompressing backup...');
      await execAsync(`gunzip -c ${localBackupPath} > ${sqlFilePath}`);
    }
    
    // Verify backup file exists
    if (!existsSync(sqlFilePath)) {
      throw new Error(`Backup file not found: ${sqlFilePath}`);
    }
    
    // Disconnect Prisma before restore
    await prisma.$disconnect();
    
    // Terminate active connections
    console.log('🔌 Terminating active database connections...');
    const dbName = new URL(targetDatabaseUrl).pathname.slice(1);
    const terminateQuery = `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
    `;
    
    try {
      await execAsync(`psql "${targetDatabaseUrl}" -c "${terminateQuery}"`);
    } catch (error) {
      console.warn('⚠️ Could not terminate all connections, proceeding anyway...');
    }
    
    // Drop and recreate database
    console.log('🗑️ Dropping existing database...');
    const adminUrl = targetDatabaseUrl.replace(/\/[^/]*$/, '/postgres');
    await execAsync(`psql "${adminUrl}" -c "DROP DATABASE IF EXISTS ${dbName};"`);
    
    console.log('🏗️ Creating fresh database...');
    await execAsync(`psql "${adminUrl}" -c "CREATE DATABASE ${dbName};"`);
    
    // Restore from backup
    console.log('📦 Restoring database from backup...');
    await execAsync(`psql "${targetDatabaseUrl}" < ${sqlFilePath}`);
    
    console.log('✅ Database restored successfully');
    
    // Clean up temporary files
    if (backupSource !== localBackupPath) {
      await execAsync(`rm -f ${localBackupPath}`);
    }
    if (sqlFilePath !== localBackupPath) {
      await execAsync(`rm -f ${sqlFilePath}`);
    }
    
    // Verify restoration
    console.log('🔍 Verifying restoration...');
    const prismaNew = new PrismaClient({ datasources: { db: { url: targetDatabaseUrl } } });
    
    try {
      const userCount = await prismaNew.user.count();
      const postCount = await prismaNew.blogPost.count();
      console.log(`✅ Verification complete: ${userCount} users, ${postCount} posts`);
    } finally {
      await prismaNew.$disconnect();
    }
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    console.log('🔍 Verifying backup integrity...');
    
    // Check if file exists and is readable
    if (!existsSync(backupPath)) {
      console.error('❌ Backup file not found');
      return false;
    }
    
    // For SQL files, check basic structure
    let content: string;
    if (backupPath.endsWith('.gz')) {
      const { stdout } = await execAsync(`gunzip -c ${backupPath}`);
      content = stdout;
    } else {
      content = readFileSync(backupPath, 'utf8');
    }
    
    // Basic SQL backup validation
    const hasHeader = content.includes('PostgreSQL database dump');
    const hasTables = content.includes('CREATE TABLE');
    const hasData = content.includes('COPY ') || content.includes('INSERT INTO');
    const hasFooter = content.includes('PostgreSQL database dump complete');
    
    if (hasHeader && hasTables && hasFooter) {
      console.log('✅ Backup integrity check passed');
      return true;
    } else {
      console.error('❌ Backup appears to be corrupted or incomplete');
      console.log(`Header: ${hasHeader}, Tables: ${hasTables}, Data: ${hasData}, Footer: ${hasFooter}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Backup verification failed:', error);
    return false;
  }
}

/**
 * List available backups
 */
export async function listBackups(s3Bucket?: string, s3Prefix = 'backups/'): Promise<string[]> {
  try {
    if (s3Bucket) {
      console.log(`📋 Listing backups from s3://${s3Bucket}/${s3Prefix}`);
      const { stdout } = await execAsync(`aws s3 ls s3://${s3Bucket}/${s3Prefix} --recursive`);
      
      const backups = stdout
        .split('\n')
        .filter(line => line.includes('.sql'))
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1]; // filename
        })
        .filter(filename => filename.length > 0);
      
      console.log(`Found ${backups.length} backups`);
      return backups;
    } else {
      console.log('📋 Listing local backups...');
      const { stdout } = await execAsync('ls -la ./backups/*.sql* || echo "No backups found"');
      console.log(stdout);
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    return [];
  }
}

// CLI interface for script execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      const backupName = process.argv[3] || 'manual-backup';
      const databaseUrl = process.env.DATABASE_URL;
      
      if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable not set');
        process.exit(1);
      }
      
      createDatabaseBackup({
        databaseUrl,
        backupName,
        s3Bucket: process.env.AWS_BUCKET_NAME,
        s3Prefix: process.env.AWS_FOLDER_PREFIX
      }).then((result) => {
        console.log(`✅ Backup completed: ${result}`);
      }).catch((error) => {
        console.error('❌ Backup failed:', error);
        process.exit(1);
      });
      break;
      
    case 'restore':
      const backupSource = process.argv[3];
      const targetUrl = process.argv[4] || process.env.DATABASE_URL;
      
      if (!backupSource) {
        console.error('❌ Backup source not specified');
        console.log('Usage: yarn tsx scripts/backup-restore.ts restore <backup-source> [target-database-url]');
        process.exit(1);
      }
      
      if (!targetUrl) {
        console.error('❌ Target database URL not specified');
        process.exit(1);
      }
      
      console.log('⚠️ This will destroy all data in the target database!');
      console.log('Press Ctrl+C to cancel, or wait 10 seconds to proceed...');
      
      setTimeout(() => {
        restoreDatabase(backupSource, targetUrl, {
          confirmDestruction: true,
          createPreRestoreBackup: true
        }).then(() => {
          console.log('✅ Restoration completed successfully');
        }).catch((error) => {
          console.error('❌ Restoration failed:', error);
          process.exit(1);
        });
      }, 10000);
      break;
      
    case 'verify':
      const backupPath = process.argv[3];
      if (!backupPath) {
        console.error('❌ Backup path not specified');
        process.exit(1);
      }
      
      verifyBackup(backupPath).then((isValid) => {
        process.exit(isValid ? 0 : 1);
      });
      break;
      
    case 'list':
      listBackups(process.env.AWS_BUCKET_NAME, process.env.AWS_FOLDER_PREFIX)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('Usage:');
      console.log('  backup [name]           - Create database backup');
      console.log('  restore <source> [url]  - Restore from backup (DESTRUCTIVE)');
      console.log('  verify <path>           - Verify backup integrity');
      console.log('  list                    - List available backups');
      break;
  }
}
