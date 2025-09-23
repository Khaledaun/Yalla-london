#!/usr/bin/env tsx

/**
 * Final Database Test
 * Comprehensive test to verify database functionality
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function finalDatabaseTest() {
  console.log('🎯 Final Database Test...\n');

  // Import Prisma Client
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Create and populate tables
    console.log('\n1. Creating and populating tables...');
    
    // Create Users table and insert data
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, email) 
      VALUES ('user-1', 'Yalla London Team', 'team@yallalondon.com')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
    `;
    console.log('   ✅ User created');

    // Create Categories table and insert data
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Category" (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO "Category" (id, name_en, name_ar, slug) 
      VALUES ('cat-1', 'Style & Shopping', 'الأناقة والتسوق', 'style-shopping')
      ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, slug = EXCLUDED.slug
    `;
    console.log('   ✅ Category created');

    // Create BlogPosts table and insert data
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "BlogPost" (
        id TEXT PRIMARY KEY,
        title_en TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content_en TEXT,
        content_ar TEXT,
        published BOOLEAN DEFAULT false,
        "categoryId" TEXT,
        "authorId" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY ("categoryId") REFERENCES "Category"(id),
        FOREIGN KEY ("authorId") REFERENCES "User"(id)
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO "BlogPost" (id, title_en, title_ar, slug, content_en, content_ar, published, "categoryId", "authorId") 
      VALUES (
        'post-1', 
        'Luxury Christmas Markets in London 2024', 
        'أسواق عيد الميلاد الفاخرة في لندن 2024',
        'luxury-christmas-markets-london-2024',
        'Discover the most luxurious Christmas markets in London for 2024...',
        'اكتشف أسواق عيد الميلاد الأكثر فخامة في لندن لعام 2024...',
        true,
        'cat-1',
        'user-1'
      )
      ON CONFLICT (id) DO UPDATE SET 
        title_en = EXCLUDED.title_en, 
        title_ar = EXCLUDED.title_ar, 
        slug = EXCLUDED.slug,
        content_en = EXCLUDED.content_en,
        content_ar = EXCLUDED.content_ar,
        published = EXCLUDED.published
    `;
    console.log('   ✅ Blog post created');

    // Verify data
    console.log('\n2. Verifying data...');
    
    const users = await prisma.$queryRaw`SELECT * FROM "User"`;
    console.log('   Users:', users);
    
    const categories = await prisma.$queryRaw`SELECT * FROM "Category"`;
    console.log('   Categories:', categories);
    
    const blogPosts = await prisma.$queryRaw`SELECT * FROM "BlogPost"`;
    console.log('   Blog Posts:', blogPosts);

    // Test counts
    console.log('\n3. Testing counts...');
    
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    console.log('   User count:', userCount);
    
    const categoryCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Category"`;
    console.log('   Category count:', categoryCount);
    
    const blogPostCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "BlogPost"`;
    console.log('   Blog post count:', blogPostCount);

    console.log('\n🎉 Final database test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database connection: WORKING');
    console.log('   ✅ Table creation: WORKING');
    console.log('   ✅ Data insertion: WORKING');
    console.log('   ✅ Data retrieval: WORKING');
    console.log('   ✅ Your Supabase database is now populated with real content!');

  } catch (error) {
    console.error('❌ Final database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
finalDatabaseTest().catch(console.error);
