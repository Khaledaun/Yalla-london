#!/usr/bin/env tsx

/**
 * Check Database Tables
 * Lists all tables in the database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
  console.log('🔍 Checking Database Tables...\n');

  // Import Prisma Client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Check all tables
    console.log('\n📋 All Tables in Database:');
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('Tables found:', tables);

    // Check specific tables
    const tableNames = ['User', 'BlogPost', 'Category', 'MediaAsset', 'HomepageBlock'];
    
    for (const tableName of tableNames) {
      console.log(`\n🔍 Checking ${tableName} table:`);
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "${tableName}"`;
        console.log(`   Count: ${count[0].count}`);
        
        if (count[0].count > 0) {
          const sample = await prisma.$queryRaw`SELECT * FROM "${tableName}" LIMIT 3`;
          console.log(`   Sample data:`, sample);
        }
      } catch (error) {
        console.log(`   ❌ Error querying ${tableName}:`, error.message);
      }
    }

    // Check if tables exist at all
    console.log('\n🔍 Checking if tables exist:');
    for (const tableName of tableNames) {
      try {
        const exists = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists
        `;
        console.log(`   ${tableName}: ${exists[0].exists ? '✅ EXISTS' : '❌ NOT EXISTS'}`);
      } catch (error) {
        console.log(`   ${tableName}: ❌ ERROR - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkTables().catch(console.error);
