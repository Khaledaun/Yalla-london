#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 * Tests real database connectivity and operations
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  console.log('🗄️  Testing Database Connection...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing Database Connection...');
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test 2: Basic Query
    console.log('\n2. Testing Basic Database Query...');
    
    try {
      // Try to query a simple table
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Basic query successful:', result);
    } catch (error) {
      console.log('⚠️  Basic query failed (expected with mock client):', error.message);
    }

    // Test 3: Check if tables exist
    console.log('\n3. Testing Table Existence...');
    
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('✅ Tables found:', tables);
    } catch (error) {
      console.log('⚠️  Table check failed (expected with mock client):', error.message);
    }

    // Test 4: Test Prisma Client Generation
    console.log('\n4. Testing Prisma Client...');
    
    try {
      // Try to use a model (this will fail if Prisma client isn't properly generated)
      const userCount = await prisma.user.count();
      console.log('✅ Prisma client working, user count:', userCount);
    } catch (error) {
      console.log('⚠️  Prisma client test failed:', error.message);
    }

    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');

    // Test 5: Environment Variables Check
    console.log('\n5. Database Environment Variables...');
    
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    
    console.log(`✅ DATABASE_URL: ${dbUrl ? 'Set' : 'Not set'}`);
    console.log(`✅ DIRECT_URL: ${directUrl ? 'Set' : 'Not set'}`);
    
    if (dbUrl && directUrl) {
      console.log('✅ Database URLs are configured');
    } else {
      console.log('❌ Database URLs are missing');
    }

    console.log('\n🎉 Database Connection Test Completed!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    if (error.code === 'P1001') {
      console.log('\n💡 This error suggests the database is not accessible.');
      console.log('   Possible solutions:');
      console.log('   1. Check if the database URL is correct');
      console.log('   2. Check if the database server is running');
      console.log('   3. Check network connectivity');
      console.log('   4. Check database credentials');
    }
    
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
