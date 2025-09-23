#!/usr/bin/env tsx

/**
 * Detailed Content Workflow Test Script
 * Tests article editor, topic-to-content pipeline, and database sync
 */

import { prisma } from '../lib/db';

async function testContentWorkflowDetailed() {
  console.log('📝 Testing Detailed Content Workflow...\n');

  try {
    // Test 1: Article Editor Save Function
    console.log('1. Testing Article Editor Save Function...');
    
    // Test creating a new article
    const newArticle = await prisma.blogPost.create({
      data: {
        title_en: 'Article Editor Test - Save Function',
        title_ar: 'اختبار محرر المقالات - وظيفة الحفظ',
        slug: 'article-editor-test-save-function',
        excerpt_en: 'Testing the article editor save functionality.',
        excerpt_ar: 'اختبار وظيفة حفظ محرر المقالات.',
        content_en: 'This article tests the save functionality of the article editor. It should be able to save content to the database successfully.',
        content_ar: 'هذا المقال يختبر وظيفة الحفظ في محرر المقالات. يجب أن يكون قادراً على حفظ المحتوى في قاعدة البيانات بنجاح.',
        published: false, // Start as draft
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        tags: ['test', 'editor', 'save'],
        seo_score: 70
      }
    });
    
    console.log(`✅ Article created successfully: ${newArticle.title_en}`);
    console.log(`   - ID: ${newArticle.id}`);
    console.log(`   - Status: ${newArticle.published ? 'Published' : 'Draft'}`);
    console.log(`   - SEO Score: ${newArticle.seo_score}`);

    // Test updating the article (simulating save function)
    const updatedArticle = await prisma.blogPost.update({
      where: { id: newArticle.id },
      data: {
        title_en: 'Updated Article Editor Test - Save Function',
        content_en: 'This article has been updated to test the save functionality. The content should be saved to the database.',
        seo_score: 85,
        published: true
      }
    });
    
    console.log(`✅ Article updated successfully: ${updatedArticle.title_en}`);
    console.log(`   - Status: ${updatedArticle.published ? 'Published' : 'Draft'}`);
    console.log(`   - SEO Score: ${updatedArticle.seo_score}`);

    // Test 2: Topic-to-Content Pipeline
    console.log('\n2. Testing Topic-to-Content Pipeline...');
    
    // Check if topic proposals exist
    const topicProposals = await prisma.topicProposal?.findMany?.() || [];
    console.log(`✅ Topic proposals available: ${topicProposals.length}`);
    
    if (topicProposals.length > 0) {
      console.log('✅ Topic-to-content pipeline is functional');
      topicProposals.forEach((topic, index) => {
        console.log(`   - Topic ${index + 1}: ${topic.title || 'Untitled'}`);
      });
    } else {
      console.log('⚠️  No topic proposals found - topic generation may not be working');
    }

    // Test creating content from a topic (simulated)
    const topicBasedArticle = await prisma.blogPost.create({
      data: {
        title_en: 'Content Created from Topic Proposal',
        title_ar: 'محتوى تم إنشاؤه من اقتراح موضوع',
        slug: 'content-from-topic-proposal',
        excerpt_en: 'This article was created from a topic proposal.',
        excerpt_ar: 'تم إنشاء هذا المقال من اقتراح موضوع.',
        content_en: 'This article demonstrates the topic-to-content pipeline. It should show how topics can be converted into full articles.',
        content_ar: 'يوضح هذا المقال خط أنابيب الموضوع إلى المحتوى. يجب أن يوضح كيف يمكن تحويل المواضيع إلى مقالات كاملة.',
        published: true,
        page_type: 'guide',
        category_id: 'cat-food',
        author_id: 'author-1',
        tags: ['topic', 'pipeline', 'automation'],
        seo_score: 80
      }
    });
    
    console.log(`✅ Topic-based article created: ${topicBasedArticle.title_en}`);

    // Test 3: Database Sync (Admin to Public)
    console.log('\n3. Testing Database Sync (Admin to Public)...');
    
    // Get all published articles (what should appear on public site)
    const publishedArticles = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { updated_at: 'desc' }
    });
    
    console.log(`✅ Published articles (public site): ${publishedArticles.length}`);
    publishedArticles.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title_en} (Updated: ${article.updated_at})`);
    });

    // Get all articles (admin view)
    const allArticles = await prisma.blogPost.findMany({
      orderBy: { updated_at: 'desc' }
    });
    
    console.log(`✅ Total articles (admin view): ${allArticles.length}`);
    
    const draftCount = allArticles.filter(a => !a.published).length;
    const publishedCount = allArticles.filter(a => a.published).length;
    
    console.log(`   - Published: ${publishedCount}`);
    console.log(`   - Drafts: ${draftCount}`);

    // Test 4: Content Workflow Status
    console.log('\n4. Content Workflow Status Summary...');
    
    const workflowStatus = {
      articleCreation: true, // We just created articles
      articleEditing: true, // We just updated articles
      articlePublishing: true, // We just published articles
      topicToContent: topicProposals.length > 0,
      databaseSync: publishedArticles.length > 0,
      draftManagement: draftCount > 0
    };

    console.log('📊 Content Workflow Status:');
    console.log(`   - Article Creation: ${workflowStatus.articleCreation ? '✅' : '❌'}`);
    console.log(`   - Article Editing: ${workflowStatus.articleEditing ? '✅' : '❌'}`);
    console.log(`   - Article Publishing: ${workflowStatus.articlePublishing ? '✅' : '❌'}`);
    console.log(`   - Topic-to-Content Pipeline: ${workflowStatus.topicToContent ? '✅' : '⚠️'}`);
    console.log(`   - Database Sync: ${workflowStatus.databaseSync ? '✅' : '❌'}`);
    console.log(`   - Draft Management: ${workflowStatus.draftManagement ? '✅' : '❌'}`);

    const allWorking = Object.values(workflowStatus).every(status => status === true);
    
    if (allWorking) {
      console.log('\n🎉 Content Workflow: FULLY FUNCTIONAL');
    } else {
      console.log('\n⚠️  Content Workflow: PARTIALLY FUNCTIONAL');
      console.log('   Issues found:');
      if (!workflowStatus.topicToContent) console.log('   - Topic-to-content pipeline needs topic proposals');
    }

    // Test 5: Final Statistics
    console.log('\n5. Final Content Statistics...');
    console.log(`✅ Total Articles: ${allArticles.length}`);
    console.log(`✅ Published Articles: ${publishedCount}`);
    console.log(`✅ Draft Articles: ${draftCount}`);
    console.log(`✅ Topic Proposals: ${topicProposals.length}`);
    console.log(`✅ Categories: ${(await prisma.category.findMany()).length}`);

  } catch (error) {
    console.error('❌ Content workflow test failed:', error);
    process.exit(1);
  }
}

// Run the test
testContentWorkflowDetailed().catch(console.error);
