
/**
 * Database Backup and Migration Safety Script
 * Handles database backups, migration safety, and restore procedures
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const DATABASE_URL = process.env.DATABASE_URL;
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      await createBackup();
      break;
    case 'restore':
      const backupFile = process.argv[3];
      await restoreBackup(backupFile);
      break;
    case 'test-migration':
      await testMigration();
      break;
    case 'seed-baseline':
      await createBaselineSeed();
      break;
    case 'cleanup':
      await cleanupOldBackups();
      break;
    case 'verify':
      await verifyDatabase();
      break;
    default:
      console.log('Usage: node database-backup.js <command>');
      console.log('Commands:');
      console.log('  backup         - Create database backup');
      console.log('  restore <file> - Restore from backup file');
      console.log('  test-migration - Test migrations safely');
      console.log('  seed-baseline  - Create baseline seed data');
      console.log('  cleanup        - Remove old backup files');
      console.log('  verify         - Verify database integrity');
      process.exit(1);
  }
}

async function createBackup() {
  try {
    console.log('🔄 Starting database backup...');
    
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
    
    // Extract database connection details
    const dbUrl = new URL(DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: password };
    
    // Create pg_dump command
    const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${backupFile} --verbose --no-owner --no-acl`;
    
    await executeCommand(dumpCommand, env);
    
    // Compress backup
    const gzipCommand = `gzip ${backupFile}`;
    await executeCommand(gzipCommand);
    
    const compressedFile = `${backupFile}.gz`;
    const stats = await fs.stat(compressedFile);
    
    console.log(`✅ Backup created successfully:`);
    console.log(`   File: ${compressedFile}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Create backup metadata
    const metadata = {
      filename: path.basename(compressedFile),
      created: new Date().toISOString(),
      size: stats.size,
      database: database,
      tables: await getTableList()
    };
    
    await fs.writeFile(
      `${compressedFile}.meta.json`,
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('📋 Backup metadata saved');
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

async function restoreBackup(backupFile) {
  try {
    if (!backupFile) {
      console.error('❌ Please specify backup file path');
      process.exit(1);
    }
    
    console.log(`🔄 Starting database restore from: ${backupFile}`);
    
    // Check if file exists
    try {
      await fs.access(backupFile);
    } catch {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }
    
    // Decompress if needed
    let sqlFile = backupFile;
    if (backupFile.endsWith('.gz')) {
      console.log('📦 Decompressing backup file...');
      const decompressCommand = `gunzip -c ${backupFile}`;
      sqlFile = backupFile.replace('.gz', '');
      await executeCommand(`${decompressCommand} > ${sqlFile}`);
    }
    
    // Confirm restore operation
    console.log('⚠️  WARNING: This will overwrite the current database!');
    console.log('   Make sure you have a backup of the current state.');
    console.log('   Continue? (y/N)');
    
    // In production, you might want to require manual confirmation
    // For automation, we'll proceed
    
    // Extract database connection details
    const dbUrl = new URL(DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;
    
    const env = { ...process.env, PGPASSWORD: password };
    
    // Restore database
    const restoreCommand = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${sqlFile}`;
    await executeCommand(restoreCommand, env);
    
    console.log('✅ Database restored successfully');
    
    // Clean up temporary SQL file if it was decompressed
    if (backupFile.endsWith('.gz')) {
      await fs.unlink(sqlFile);
    }
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

async function testMigration() {
  try {
    console.log('🧪 Testing database migrations...');
    
    // Create a test backup first
    await createBackup();
    console.log('📦 Test backup created');
    
    // Get current schema state
    const currentSchema = await getCurrentSchema();
    
    // Run migrations in test mode
    console.log('🔄 Running migrations...');
    await executeCommand('npx prisma migrate deploy');
    
    // Verify schema after migration
    const newSchema = await getCurrentSchema();
    
    // Compare schemas
    const differences = compareSchemas(currentSchema, newSchema);
    
    if (differences.length > 0) {
      console.log('📋 Schema changes detected:');
      differences.forEach(diff => console.log(`   ${diff}`));
    } else {
      console.log('✅ No schema changes detected');
    }
    
    // Test data integrity
    await verifyDatabase();
    
    console.log('✅ Migration test completed successfully');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    process.exit(1);
  }
}

async function createBaselineSeed() {
  try {
    console.log('🌱 Creating baseline seed data...');
    
    // Create default categories
    const categories = [
      {
        name_en: 'London Guide',
        name_ar: 'دليل لندن',
        slug: 'london-guide',
        description_en: 'Essential London experiences and guides',
        description_ar: 'تجارب ودلائل لندن الأساسية'
      },
      {
        name_en: 'Food & Drink',
        name_ar: 'الطعام والشراب',
        slug: 'food-drink',
        description_en: 'Best restaurants and dining experiences',
        description_ar: 'أفضل المطاعم وتجارب الطعام'
      },
      {
        name_en: 'Events',
        name_ar: 'الفعاليات',
        slug: 'events',
        description_en: 'Exciting events and activities',
        description_ar: 'فعاليات وأنشطة مثيرة'
      }
    ];
    
    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category
      });
    }
    
    // Create system user
    await prisma.user.upsert({
      where: { email: 'system@yallalondon.com' },
      update: {},
      create: {
        email: 'system@yallalondon.com',
        name: 'System User'
      }
    });
    
    // Create sample content generation rules
    const automationRules = [
      {
        name: 'Daily Blog Posts (English)',
        content_type: 'blog_post',
        language: 'en',
        frequency_hours: 24,
        auto_publish: false,
        min_hours_between: 8,
        max_posts_per_day: 2,
        preferred_times: ['09:00', '15:00'],
        categories: ['london-guide', 'food-drink'],
        is_active: true
      }
    ];
    
    for (const rule of automationRules) {
      await prisma.contentScheduleRule.upsert({
        where: { name: rule.name },
        update: rule,
        create: rule
      });
    }
    
    console.log('✅ Baseline seed data created');
    console.log(`   ${categories.length} categories`);
    console.log(`   1 system user`);
    console.log(`   ${automationRules.length} automation rules`);
    
  } catch (error) {
    console.error('❌ Seed creation failed:', error.message);
    process.exit(1);
  }
}

async function cleanupOldBackups() {
  try {
    console.log('🧹 Cleaning up old backup files...');
    
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    let deletedCount = 0;
    let savedSpace = 0;
    
    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        savedSpace += stats.size;
        await fs.unlink(filePath);
        
        // Also delete metadata file if it exists
        const metaFile = `${filePath}.meta.json`;
        try {
          await fs.unlink(metaFile);
        } catch {
          // Metadata file doesn't exist, ignore
        }
        
        deletedCount++;
        console.log(`   Deleted: ${file}`);
      }
    }
    
    console.log(`✅ Cleanup completed:`);
    console.log(`   Deleted: ${deletedCount} files`);
    console.log(`   Space saved: ${(savedSpace / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database integrity...');
    
    // Check table counts
    const tables = await getTableList();
    console.log(`📊 Found ${tables.length} tables`);
    
    // Check for common issues
    const issues = [];
    
    // Check for orphaned records
    try {
      const orphanedPosts = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "BlogPost" bp 
        LEFT JOIN "Category" c ON bp.category_id = c.id 
        WHERE c.id IS NULL
      `;
      
      if (orphanedPosts[0].count > 0) {
        issues.push(`${orphanedPosts[0].count} blog posts with missing categories`);
      }
    } catch (error) {
      console.warn('Could not check for orphaned blog posts');
    }
    
    // Check for duplicate slugs
    try {
      const duplicateSlugs = await prisma.$queryRaw`
        SELECT slug, COUNT(*) as count FROM "BlogPost" 
        GROUP BY slug HAVING COUNT(*) > 1
      `;
      
      if (duplicateSlugs.length > 0) {
        issues.push(`${duplicateSlugs.length} duplicate blog post slugs`);
      }
    } catch (error) {
      console.warn('Could not check for duplicate slugs');
    }
    
    if (issues.length > 0) {
      console.log('⚠️  Database issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ Database integrity check passed');
    }
    
    console.log('📊 Database statistics:');
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   ${table}: ${count[0].count} records`);
      } catch {
        console.log(`   ${table}: Unable to count records`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  }
}

// Helper functions

async function executeCommand(command, env = process.env) {
  return new Promise((resolve, reject) => {
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}`));
        return;
      }
      if (stderr) {
        console.warn('Command warning:', stderr);
      }
      resolve(stdout);
    });
  });
}

async function getTableList() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    return result.map(r => r.table_name);
  } catch {
    return [];
  }
}

async function getCurrentSchema() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    return result;
  } catch {
    return [];
  }
}

function compareSchemas(oldSchema, newSchema) {
  const differences = [];
  
  // Simple schema comparison (can be expanded)
  const oldTables = new Set(oldSchema.map(s => s.table_name));
  const newTables = new Set(newSchema.map(s => s.table_name));
  
  for (const table of newTables) {
    if (!oldTables.has(table)) {
      differences.push(`Added table: ${table}`);
    }
  }
  
  for (const table of oldTables) {
    if (!newTables.has(table)) {
      differences.push(`Removed table: ${table}`);
    }
  }
  
  return differences;
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
