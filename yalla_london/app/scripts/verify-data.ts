#!/usr/bin/env tsx

/**
 * Verify Data Script
 * Checks if data was actually inserted into the database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function verifyData() {
  console.log('🔍 Verifying Database Data...\n');

  // Import Prisma Client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Check if tables exist
    console.log('\n1. Checking if tables exist...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('Tables found:', tables);

    // Check Users table
    console.log('\n2. Checking Users table...');
    try {
      const users = await prisma.$queryRaw`SELECT * FROM "User"`;
      console.log('Users found:', users.length);
      if (users.length > 0) {
        console.log('Sample user:', users[0]);
      }
    } catch (error) {
      console.log('Users query error:', error.message);
    }

    // Check Categories table
    console.log('\n3. Checking Categories table...');
    try {
      const categories = await prisma.$queryRaw`SELECT * FROM "Category"`;
      console.log('Categories found:', categories.length);
      if (categories.length > 0) {
        console.log('Sample category:', categories[0]);
      }
    } catch (error) {
      console.log('Categories query error:', error.message);
    }

    // Check BlogPosts table
    console.log('\n4. Checking BlogPosts table...');
    try {
      const blogPosts = await prisma.$queryRaw`SELECT id, title_en, published FROM "BlogPost"`;
      console.log('Blog posts found:', blogPosts.length);
      if (blogPosts.length > 0) {
        console.log('Sample blog post:', blogPosts[0]);
      }
    } catch (error) {
      console.log('BlogPosts query error:', error.message);
    }

    // Check MediaAssets table
    console.log('\n5. Checking MediaAssets table...');
    try {
      const mediaAssets = await prisma.$queryRaw`SELECT * FROM "MediaAsset"`;
      console.log('Media assets found:', mediaAssets.length);
      if (mediaAssets.length > 0) {
        console.log('Sample media asset:', mediaAssets[0]);
      }
    } catch (error) {
      console.log('MediaAssets query error:', error.message);
    }

    // Check HomepageBlocks table
    console.log('\n6. Checking HomepageBlocks table...');
    try {
      const homepageBlocks = await prisma.$queryRaw`SELECT * FROM "HomepageBlock"`;
      console.log('Homepage blocks found:', homepageBlocks.length);
      if (homepageBlocks.length > 0) {
        console.log('Sample homepage block:', homepageBlocks[0]);
      }
    } catch (error) {
      console.log('HomepageBlocks query error:', error.message);
    }

  } catch (error) {
    console.error('❌ Data verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyData().catch(console.error);
