#!/usr/bin/env tsx

/**
 * Manual Table Creation Script
 * Creates essential database tables manually
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function createTablesManual() {
  console.log('🏗️  Creating Database Tables Manually...\n');

  // Import Prisma Client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // 1. Create Users table
    console.log('\n1. Creating Users table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          "emailVerified" TIMESTAMP,
          image TEXT,
          role TEXT DEFAULT 'viewer',
          permissions TEXT[] DEFAULT '{}',
          "isActive" BOOLEAN DEFAULT true,
          "lastLoginAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          bio_en TEXT,
          bio_ar TEXT
        )
      `;
      console.log('   ✅ Users table created');
    } catch (error) {
      console.log('   ⚠️  Users table error:', error.message);
    }

    // 2. Create Categories table
    console.log('\n2. Creating Categories table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Category" (
          id TEXT PRIMARY KEY,
          name_en TEXT NOT NULL,
          name_ar TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description_en TEXT,
          description_ar TEXT,
          icon TEXT,
          color TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ Categories table created');
    } catch (error) {
      console.log('   ⚠️  Categories table error:', error.message);
    }

    // 3. Create BlogPosts table
    console.log('\n3. Creating BlogPosts table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "BlogPost" (
          id TEXT PRIMARY KEY,
          title_en TEXT NOT NULL,
          title_ar TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          excerpt_en TEXT,
          excerpt_ar TEXT,
          content_en TEXT,
          content_ar TEXT,
          published BOOLEAN DEFAULT false,
          "pageType" TEXT DEFAULT 'article',
          "categoryId" TEXT,
          "authorId" TEXT,
          "seoScore" INTEGER DEFAULT 0,
          tags TEXT[] DEFAULT '{}',
          "featuredImage" TEXT,
          "metaTitleEn" TEXT,
          "metaTitleAr" TEXT,
          "metaDescriptionEn" TEXT,
          "metaDescriptionAr" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("categoryId") REFERENCES "Category"(id),
          FOREIGN KEY ("authorId") REFERENCES "User"(id)
        )
      `;
      console.log('   ✅ BlogPosts table created');
    } catch (error) {
      console.log('   ⚠️  BlogPosts table error:', error.message);
    }

    // 4. Create MediaAssets table
    console.log('\n4. Creating MediaAssets table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "MediaAsset" (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          "originalName" TEXT,
          "cloudStoragePath" TEXT,
          url TEXT,
          "fileType" TEXT,
          "mimeType" TEXT,
          "fileSize" INTEGER,
          width INTEGER,
          height INTEGER,
          "altText" TEXT,
          title TEXT,
          tags TEXT[] DEFAULT '{}',
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ MediaAssets table created');
    } catch (error) {
      console.log('   ⚠️  MediaAssets table error:', error.message);
    }

    // 5. Create HomepageBlocks table
    console.log('\n5. Creating HomepageBlocks table...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "HomepageBlock" (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          "titleEn" TEXT,
          "titleAr" TEXT,
          "contentEn" TEXT,
          "contentAr" TEXT,
          config JSONB,
          position INTEGER,
          enabled BOOLEAN DEFAULT true,
          version TEXT DEFAULT 'draft',
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('   ✅ HomepageBlocks table created');
    } catch (error) {
      console.log('   ⚠️  HomepageBlocks table error:', error.message);
    }

    // 6. Verify tables were created
    console.log('\n6. Verifying tables...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('User', 'Category', 'BlogPost', 'MediaAsset', 'HomepageBlock')
        ORDER BY table_name
      `;
      console.log('   ✅ Tables created:', tables);
    } catch (error) {
      console.log('   ⚠️  Table verification error:', error.message);
    }

    console.log('\n🎉 Table creation completed!');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the table creation
createTablesManual().catch(console.error);
