#!/usr/bin/env tsx

/**
 * Simple Connection Test
 * Tests basic database connection and table creation
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testConnectionSimple() {
  console.log('🔌 Testing Simple Database Connection...\n');

  // Import Prisma Client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Test 1: Check if we can run a simple query
    console.log('\n1. Testing Simple Query...');
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Simple query successful:', result);
    } catch (error) {
      console.log('❌ Simple query failed:', error.message);
      return;
    }

    // Test 2: Check database name and version
    console.log('\n2. Testing Database Info...');
    try {
      const dbInfo = await prisma.$queryRaw`SELECT current_database() as db_name, version() as version`;
      console.log('✅ Database info:', dbInfo);
    } catch (error) {
      console.log('❌ Database info failed:', error.message);
    }

    // Test 3: List all schemas
    console.log('\n3. Testing Schemas...');
    try {
      const schemas = await prisma.$queryRaw`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `;
      console.log('✅ Schemas found:', schemas);
    } catch (error) {
      console.log('❌ Schemas query failed:', error.message);
    }

    // Test 4: List all tables in public schema
    console.log('\n4. Testing Tables in Public Schema...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('✅ Tables in public schema:', tables);
    } catch (error) {
      console.log('❌ Tables query failed:', error.message);
    }

    // Test 5: Try to create a simple table
    console.log('\n5. Testing Table Creation...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ Test table created successfully');
      
      // Insert test data
      await prisma.$executeRaw`
        INSERT INTO test_table (name) VALUES ('test data')
        ON CONFLICT DO NOTHING
      `;
      console.log('✅ Test data inserted');
      
      // Query test data
      const testData = await prisma.$queryRaw`SELECT * FROM test_table`;
      console.log('✅ Test data retrieved:', testData);
      
      // Clean up
      await prisma.$executeRaw`DROP TABLE IF EXISTS test_table`;
      console.log('✅ Test table cleaned up');
      
    } catch (error) {
      console.log('❌ Table creation test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnectionSimple().catch(console.error);
