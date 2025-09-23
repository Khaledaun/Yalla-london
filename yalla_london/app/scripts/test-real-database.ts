#!/usr/bin/env tsx

/**
 * Real Database Connection Test
 * Tests actual Supabase database connection
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testRealDatabase() {
  console.log('🗄️  Testing Real Supabase Database Connection...\n');

  try {
    // Test 1: Environment Variables
    console.log('1. Testing Environment Variables...');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
    console.log('   DIRECT_URL:', process.env.DIRECT_URL ? '✅ SET' : '❌ NOT SET');
    
    if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
      console.log('❌ Missing required environment variables');
      return;
    }

    // Test 2: Try to import Prisma Client
    console.log('\n2. Testing Prisma Client Import...');
    let PrismaClient;
    try {
      const prismaModule = require('@prisma/client');
      PrismaClient = prismaModule.PrismaClient;
      console.log('✅ Prisma Client imported successfully');
    } catch (error) {
      console.log('❌ Failed to import Prisma Client:', error.message);
      return;
    }

    // Test 3: Create Prisma Client Instance
    console.log('\n3. Testing Prisma Client Creation...');
    let prisma;
    try {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
      console.log('✅ Prisma Client created successfully');
    } catch (error) {
      console.log('❌ Failed to create Prisma Client:', error.message);
      return;
    }

    // Test 4: Test Database Connection
    console.log('\n4. Testing Database Connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      await prisma.$disconnect();
      return;
    }

    // Test 5: Test Basic Query
    console.log('\n5. Testing Basic Database Query...');
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Basic query successful:', result);
    } catch (error) {
      console.log('❌ Basic query failed:', error.message);
    }

    // Test 6: Test Table Existence
    console.log('\n6. Testing Table Existence...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('✅ Tables found:', tables);
    } catch (error) {
      console.log('❌ Table check failed:', error.message);
    }

    // Test 7: Test Blog Posts Table
    console.log('\n7. Testing Blog Posts Table...');
    try {
      const blogPosts = await prisma.blogPost.findMany();
      console.log(`✅ Blog posts found: ${blogPosts.length}`);
      if (blogPosts.length > 0) {
        console.log('   Sample posts:');
        blogPosts.slice(0, 3).forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.title_en || post.title_ar || 'Untitled'}`);
        });
      } else {
        console.log('   No blog posts found in database');
      }
    } catch (error) {
      console.log('❌ Blog posts query failed:', error.message);
    }

    // Test 8: Test Categories Table
    console.log('\n8. Testing Categories Table...');
    try {
      const categories = await prisma.category.findMany();
      console.log(`✅ Categories found: ${categories.length}`);
      if (categories.length > 0) {
        console.log('   Categories:');
        categories.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.name_en || cat.name_ar || 'Untitled'}`);
        });
      } else {
        console.log('   No categories found in database');
      }
    } catch (error) {
      console.log('❌ Categories query failed:', error.message);
    }

    // Cleanup
    await prisma.$disconnect();
    console.log('\n✅ Database disconnected successfully');

    console.log('\n🎉 Real Database Connection Test Completed!');

  } catch (error) {
    console.error('❌ Real database test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRealDatabase().catch(console.error);
