#!/usr/bin/env tsx

/**
 * Complete System Test Script
 * Tests all systems end-to-end
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

import { prisma } from '../lib/db';

async function testCompleteSystem() {
  console.log('🚀 Testing Complete System...\n');

  try {
    // Test 1: Environment Configuration
    console.log('1. Testing Environment Configuration...');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'FEATURE_PHASE4B_ENABLED',
      'FEATURE_TOPIC_RESEARCH',
      'FEATURE_AUTO_PUBLISHING',
      'FEATURE_CONTENT_PIPELINE',
      'CRON_SECRET'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('❌ Missing environment variables:', missingEnvVars);
    }

    // Test 2: Feature Flags
    console.log('\n2. Testing Feature Flags...');
    
    const featureFlags = [
      'FEATURE_PHASE4B_ENABLED',
      'FEATURE_TOPIC_RESEARCH',
      'FEATURE_AUTO_PUBLISHING',
      'FEATURE_CONTENT_PIPELINE',
      'FEATURE_AI_SEO_AUDIT',
      'FEATURE_INTERNAL_LINKS',
      'FEATURE_RICH_EDITOR',
      'FEATURE_HOMEPAGE_BUILDER'
    ];

    const enabledFlags = featureFlags.filter(flag => process.env[flag] === 'true');
    console.log(`✅ Enabled feature flags: ${enabledFlags.length}/${featureFlags.length}`);
    
    if (enabledFlags.length === featureFlags.length) {
      console.log('✅ All feature flags are enabled');
    } else {
      console.log('⚠️  Some feature flags are disabled');
    }

    // Test 3: Database Operations
    console.log('\n3. Testing Database Operations...');
    
    // Test content creation
    const testArticle = await prisma.blogPost.create({
      data: {
        title_en: 'Complete System Test Article',
        title_ar: 'مقال اختبار النظام الكامل',
        slug: 'complete-system-test-article',
        excerpt_en: 'This article tests the complete system functionality.',
        excerpt_ar: 'هذا المقال يختبر وظائف النظام الكامل.',
        content_en: 'This article demonstrates that the complete system is working properly.',
        content_ar: 'يوضح هذا المقال أن النظام الكامل يعمل بشكل صحيح.',
        published: true,
        page_type: 'guide',
        category_id: 'cat-shopping',
        author_id: 'author-1',
        tags: ['test', 'system', 'complete'],
        seo_score: 90
      }
    });
    
    console.log('✅ Article creation successful:', testArticle.title_en);

    // Test content retrieval
    const articles = await prisma.blogPost.findMany({
      where: { published: true }
    });
    
    console.log(`✅ Content retrieval successful: ${articles.length} published articles`);

    // Test 4: Content Workflow
    console.log('\n4. Testing Content Workflow...');
    
    // Test article update
    const updatedArticle = await prisma.blogPost.update({
      where: { id: testArticle.id },
      data: {
        title_en: 'Updated Complete System Test Article',
        seo_score: 95
      }
    });
    
    console.log('✅ Article update successful:', updatedArticle.title_en);

    // Test 5: Automation Features
    console.log('\n5. Testing Automation Features...');
    
    const automationFeatures = {
      topicGeneration: process.env.FEATURE_TOPIC_RESEARCH === 'true',
      autoPublishing: process.env.FEATURE_AUTO_PUBLISHING === 'true',
      contentPipeline: process.env.FEATURE_CONTENT_PIPELINE === 'true',
      cronSecret: !!process.env.CRON_SECRET
    };

    const automationWorking = Object.values(automationFeatures).every(feature => feature === true);
    
    console.log('📊 Automation Features Status:');
    console.log(`   - Topic Generation: ${automationFeatures.topicGeneration ? '✅' : '❌'}`);
    console.log(`   - Auto Publishing: ${automationFeatures.autoPublishing ? '✅' : '❌'}`);
    console.log(`   - Content Pipeline: ${automationFeatures.contentPipeline ? '✅' : '❌'}`);
    console.log(`   - Cron Secret: ${automationFeatures.cronSecret ? '✅' : '❌'}`);

    // Test 6: System Statistics
    console.log('\n6. System Statistics...');
    
    const stats = {
      totalArticles: (await prisma.blogPost.findMany()).length,
      publishedArticles: (await prisma.blogPost.findMany({ where: { published: true } })).length,
      categories: (await prisma.category.findMany()).length,
      mediaAssets: (await prisma.mediaAsset.findMany()).length,
      homepageBlocks: (await prisma.homepageBlock.findMany()).length
    };

    console.log('📊 System Statistics:');
    console.log(`   - Total Articles: ${stats.totalArticles}`);
    console.log(`   - Published Articles: ${stats.publishedArticles}`);
    console.log(`   - Categories: ${stats.categories}`);
    console.log(`   - Media Assets: ${stats.mediaAssets}`);
    console.log(`   - Homepage Blocks: ${stats.homepageBlocks}`);

    // Test 7: Final System Status
    console.log('\n7. Final System Status...');
    
    const systemStatus = {
      environmentConfigured: missingEnvVars.length === 0,
      featureFlagsEnabled: enabledFlags.length === featureFlags.length,
      databaseWorking: true, // We just tested it
      contentWorkflowWorking: true, // We just tested it
      automationConfigured: automationWorking
    };

    const allSystemsWorking = Object.values(systemStatus).every(status => status === true);

    console.log('📊 System Status Summary:');
    console.log(`   - Environment Configuration: ${systemStatus.environmentConfigured ? '✅' : '❌'}`);
    console.log(`   - Feature Flags: ${systemStatus.featureFlagsEnabled ? '✅' : '❌'}`);
    console.log(`   - Database Operations: ${systemStatus.databaseWorking ? '✅' : '❌'}`);
    console.log(`   - Content Workflow: ${systemStatus.contentWorkflowWorking ? '✅' : '❌'}`);
    console.log(`   - Automation System: ${systemStatus.automationConfigured ? '✅' : '❌'}`);

    if (allSystemsWorking) {
      console.log('\n🎉 COMPLETE SYSTEM: FULLY FUNCTIONAL');
      console.log('🚀 Ready for production deployment!');
    } else {
      console.log('\n⚠️  COMPLETE SYSTEM: PARTIALLY FUNCTIONAL');
      console.log('   Some systems need attention before production deployment.');
    }

    // Test 8: Production Readiness
    console.log('\n8. Production Readiness Assessment...');
    
    const productionReady = allSystemsWorking && 
                           process.env.NODE_ENV === 'production' &&
                           process.env.NEXTAUTH_URL?.includes('https://');

    if (productionReady) {
      console.log('🎯 PRODUCTION READY: YES');
      console.log('   All systems are functional and configured for production.');
    } else {
      console.log('🎯 PRODUCTION READY: NO');
      console.log('   System needs configuration before production deployment.');
    }

  } catch (error) {
    console.error('❌ Complete system test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCompleteSystem().catch(console.error);
