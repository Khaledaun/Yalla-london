#!/usr/bin/env tsx

/**
 * Direct Prisma Test
 * Tests Prisma client directly without imports
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testPrismaDirect() {
  console.log('🔧 Testing Prisma Client Directly...\n');

  try {
    // Test 1: Try to require Prisma Client directly
    console.log('1. Testing Prisma Client Import...');
    let PrismaClient;
    try {
      const prismaModule = require('@prisma/client');
      PrismaClient = prismaModule.PrismaClient;
      console.log('✅ Prisma Client imported successfully');
      console.log('   PrismaClient type:', typeof PrismaClient);
    } catch (error) {
      console.log('❌ Failed to import Prisma Client:', error.message);
      return;
    }

    // Test 2: Create instance
    console.log('\n2. Testing Prisma Client Instance...');
    let prisma;
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
      console.log('✅ Prisma Client instance created');
      console.log('   Available methods:', Object.getOwnPropertyNames(prisma).filter(name => !name.startsWith('_')));
    } catch (error) {
      console.log('❌ Failed to create Prisma Client instance:', error.message);
      return;
    }

    // Test 3: Test connection
    console.log('\n3. Testing Database Connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }

    // Test 4: Test raw query
    console.log('\n4. Testing Raw Query...');
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Raw query successful:', result);
    } catch (error) {
      console.log('❌ Raw query failed:', error.message);
    }

    // Test 5: Test table existence
    console.log('\n5. Testing Table Existence...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('✅ Tables query successful:', tables);
    } catch (error) {
      console.log('❌ Tables query failed:', error.message);
    }

    // Test 6: Test blog posts table specifically
    console.log('\n6. Testing Blog Posts Table...');
    try {
      const blogPosts = await prisma.$queryRaw`
        SELECT id, title_en, title_ar, published, created_at
        FROM "BlogPost"
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log('✅ Blog posts query successful:', blogPosts);
      console.log(`   Found ${blogPosts.length} blog posts`);
    } catch (error) {
      console.log('❌ Blog posts query failed:', error.message);
    }

    // Test 7: Test users table
    console.log('\n7. Testing Users Table...');
    try {
      const users = await prisma.$queryRaw`
        SELECT id, name, email, created_at
        FROM "User"
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log('✅ Users query successful:', users);
      console.log(`   Found ${users.length} users`);
    } catch (error) {
      console.log('❌ Users query failed:', error.message);
    }

    // Cleanup
    await prisma.$disconnect();
    console.log('\n✅ Database disconnected successfully');

  } catch (error) {
    console.error('❌ Direct Prisma test failed:', error);
  }
}

// Run the test
testPrismaDirect().catch(console.error);
