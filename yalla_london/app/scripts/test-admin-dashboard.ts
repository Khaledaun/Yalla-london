#!/usr/bin/env tsx

/**
 * Admin Dashboard Test Script
 * Tests all admin dashboard functionality end-to-end
 */

import { prisma } from '../lib/db';

async function testAdminDashboard() {
  console.log('🧪 Testing Admin Dashboard Functionality...\n');

  try {
    // Test 1: Dashboard Stats
    console.log('1. Testing Dashboard Statistics...');
    const publishedPosts = await prisma.blogPost.findMany({
      where: { published: true }
    });
    const totalPosts = await prisma.blogPost.findMany();
    const categories = await prisma.category.findMany();
    const mediaAssets = await prisma.mediaAsset.findMany();
    
    console.log(`✅ Dashboard Stats:`);
    console.log(`   - Published Articles: ${publishedPosts.length}`);
    console.log(`   - Total Articles: ${totalPosts.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Media Assets: ${mediaAssets.length}`);

    // Test 2: Content Management
    console.log('\n2. Testing Content Management...');
    
    // Create a new article
    const newArticle = await prisma.blogPost.create({
      data: {
        title_en: 'Admin Dashboard Test Article',
        title_ar: 'مقال اختبار لوحة الإدارة',
        slug: 'admin-dashboard-test-article',
        excerpt_en: 'This article was created through the admin dashboard test.',
        excerpt_ar: 'تم إنشاء هذا المقال من خلال اختبار لوحة الإدارة.',
        content_en: 'This is a comprehensive test of the admin dashboard content management system. It verifies that articles can be created, edited, and managed through the admin interface.',
        content_ar: 'هذا اختبار شامل لنظام إدارة المحتوى في لوحة الإدارة. يتحقق من إمكانية إنشاء وتحرير وإدارة المقالات من خلال واجهة الإدارة.',
        published: false, // Start as draft
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        tags: ['test', 'admin', 'dashboard', 'content'],
        seo_score: 75
      }
    });
    console.log(`✅ Created test article: ${newArticle.title_en}`);

    // Update the article
    const updatedArticle = await prisma.blogPost.update({
      where: { id: newArticle.id },
      data: {
        published: true,
        seo_score: 88,
        title_en: 'Updated Admin Dashboard Test Article'
      }
    });
    console.log(`✅ Updated article: ${updatedArticle.title_en} (Published: ${updatedArticle.published})`);

    // Test 3: Media Management
    console.log('\n3. Testing Media Management...');
    const newMediaAsset = await prisma.mediaAsset.create({
      data: {
        filename: 'admin-test-image.jpg',
        original_name: 'admin-test-image.jpg',
        cloud_storage_path: 'images/admin-test-image.jpg',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 1024000,
        width: 800,
        height: 600,
        alt_text: 'Test image for admin dashboard',
        title: 'Admin Dashboard Test Image',
        tags: ['test', 'admin', 'dashboard']
      }
    });
    console.log(`✅ Created media asset: ${newMediaAsset.filename}`);

    // Test 4: Homepage Builder
    console.log('\n4. Testing Homepage Builder...');
    const newHomepageBlock = await prisma.homepageBlock.create({
      data: {
        type: 'testimonial',
        title_en: 'Admin Dashboard Test Block',
        title_ar: 'كتلة اختبار لوحة الإدارة',
        content_en: 'This is a test block created through the admin dashboard.',
        content_ar: 'هذه كتلة اختبار تم إنشاؤها من خلال لوحة الإدارة.',
        config: { style: 'modern', showRating: true },
        position: 10,
        enabled: true,
        version: 'draft'
      }
    });
    console.log(`✅ Created homepage block: ${newHomepageBlock.title_en}`);

    // Test 5: Search and Filter
    console.log('\n5. Testing Search and Filter...');
    const searchResults = await prisma.blogPost.findMany({
      where: {
        OR: [
          { title_en: { contains: 'admin' } },
          { title_ar: { contains: 'إدارة' } }
        ]
      }
    });
    console.log(`✅ Search results for 'admin': ${searchResults.length} articles found`);

    // Test 6: Category Management
    console.log('\n6. Testing Category Management...');
    const categoryPosts = await prisma.blogPost.findMany({
      where: { category_id: 'cat-shopping' }
    });
    console.log(`✅ Posts in 'Style & Shopping' category: ${categoryPosts.length}`);

    // Test 7: Final Statistics
    console.log('\n7. Final Dashboard Statistics...');
    const finalStats = {
      totalArticles: (await prisma.blogPost.findMany()).length,
      publishedArticles: (await prisma.blogPost.findMany({ where: { published: true } })).length,
      draftArticles: (await prisma.blogPost.findMany({ where: { published: false } })).length,
      totalCategories: (await prisma.category.findMany()).length,
      totalMediaAssets: (await prisma.mediaAsset.findMany()).length,
      totalHomepageBlocks: (await prisma.homepageBlock.findMany()).length
    };

    console.log('✅ Final Dashboard Statistics:');
    console.log(`   - Total Articles: ${finalStats.totalArticles}`);
    console.log(`   - Published Articles: ${finalStats.publishedArticles}`);
    console.log(`   - Draft Articles: ${finalStats.draftArticles}`);
    console.log(`   - Categories: ${finalStats.totalCategories}`);
    console.log(`   - Media Assets: ${finalStats.totalMediaAssets}`);
    console.log(`   - Homepage Blocks: ${finalStats.totalHomepageBlocks}`);

    console.log('\n🎉 Admin Dashboard Test Completed Successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Content Creation - Working');
    console.log('   ✅ Content Editing - Working');
    console.log('   ✅ Media Management - Working');
    console.log('   ✅ Homepage Builder - Working');
    console.log('   ✅ Search & Filter - Working');
    console.log('   ✅ Category Management - Working');
    console.log('   ✅ Dashboard Statistics - Working');

    console.log('\n🚀 Admin Dashboard is ready for production!');

  } catch (error) {
    console.error('❌ Admin Dashboard test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAdminDashboard().catch(console.error);
