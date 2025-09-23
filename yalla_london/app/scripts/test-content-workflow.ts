#!/usr/bin/env tsx

/**
 * Test Content Workflow Script
 * Tests the complete content creation and management workflow
 */

import { prisma } from '../lib/db';

async function testContentWorkflow() {
  console.log('🧪 Testing Content Workflow...\n');

  try {
    // Test 1: List existing blog posts
    console.log('1. Testing blog post listing...');
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      include: { category: true, author: true }
    });
    console.log(`✅ Found ${posts.length} published blog posts`);
    posts.forEach(post => {
      console.log(`   - ${post.title_en} (${post.category?.name_en})`);
    });

    // Test 2: Create a new blog post
    console.log('\n2. Testing blog post creation...');
    const newPost = await prisma.blogPost.create({
      data: {
        title_en: 'Test Article from Admin Dashboard',
        title_ar: 'مقال اختبار من لوحة الإدارة',
        slug: 'test-article-admin-dashboard',
        excerpt_en: 'This is a test article created through the admin dashboard.',
        excerpt_ar: 'هذا مقال اختبار تم إنشاؤه من خلال لوحة الإدارة.',
        content_en: 'This is the full content of the test article. It demonstrates that the admin dashboard can successfully create and save content.',
        content_ar: 'هذا هو المحتوى الكامل لمقال الاختبار. يوضح أن لوحة الإدارة يمكنها إنشاء وحفظ المحتوى بنجاح.',
        published: true,
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        tags: ['test', 'admin', 'dashboard'],
        seo_score: 85
      },
      include: { category: true, author: true }
    });
    console.log(`✅ Created new blog post: ${newPost.title_en}`);

    // Test 3: Update the blog post
    console.log('\n3. Testing blog post update...');
    const updatedPost = await prisma.blogPost.update({
      where: { id: newPost.id },
      data: {
        title_en: 'Updated Test Article from Admin Dashboard',
        seo_score: 90
      }
    });
    console.log(`✅ Updated blog post: ${updatedPost.title_en}`);

    // Test 4: List all posts including the new one
    console.log('\n4. Testing updated blog post listing...');
    const allPosts = await prisma.blogPost.findMany({
      orderBy: { created_at: 'desc' },
      include: { category: true, author: true }
    });
    console.log(`✅ Total blog posts: ${allPosts.length}`);
    console.log('   Latest posts:');
    allPosts.slice(0, 3).forEach(post => {
      console.log(`   - ${post.title_en} (SEO: ${post.seo_score})`);
    });

    // Test 5: Test categories
    console.log('\n5. Testing category listing...');
    const categories = await prisma.category.findMany();
    console.log(`✅ Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name_en} (${cat.name_ar})`);
    });

    // Test 6: Test media assets
    console.log('\n6. Testing media asset listing...');
    const mediaAssets = await prisma.mediaAsset.findMany();
    console.log(`✅ Found ${mediaAssets.length} media assets:`);
    mediaAssets.forEach(asset => {
      console.log(`   - ${asset.filename} (${asset.file_type})`);
    });

    console.log('\n🎉 Content workflow test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Blog posts: ${allPosts.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Media assets: ${mediaAssets.length}`);
    console.log(`   - Latest post: ${updatedPost.title_en}`);

  } catch (error) {
    console.error('❌ Content workflow test failed:', error);
    process.exit(1);
  }
}

// Run the test
testContentWorkflow().catch(console.error);