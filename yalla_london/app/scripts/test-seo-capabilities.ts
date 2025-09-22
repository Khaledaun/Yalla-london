#!/usr/bin/env tsx

/**
 * Test script for SEO capabilities
 * Verifies all SEO features are working correctly
 */

import { prisma } from '@/lib/db';
import { seoMetaService } from '@/lib/seo/seo-meta-service';
import { autoSEOService } from '@/lib/seo/auto-seo-service';
import { SchemaGenerator } from '@/lib/seo/schema-generator';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

async function testSEOCapabilities() {
  console.log('🔍 Testing SEO Capabilities');
  console.log('============================\n');

  const results: TestResult[] = [];

  try {
    // 1. Test Database Connection
    console.log('1. Testing Database Connection...');
    try {
      await prisma.$connect();
      results.push({
        test: 'Database Connection',
        status: 'PASS',
        message: 'Database connection successful'
      });
      console.log('✅ Database connection successful');
    } catch (error) {
      results.push({
        test: 'Database Connection',
        status: 'FAIL',
        message: 'Database connection failed',
        details: error
      });
      console.log('❌ Database connection failed:', error);
    }

    // 2. Test SEO Meta Service
    console.log('\n2. Testing SEO Meta Service...');
    try {
      const testSEOData = {
        pageId: 'test-page-1',
        title: 'Test Page Title - Yalla London',
        description: 'This is a test page description for SEO testing purposes.',
        canonical: 'https://yalla-london.com/test-page',
        metaKeywords: 'test, seo, london',
        ogTitle: 'Test Page Title',
        ogDescription: 'Test OG description',
        ogImage: 'https://example.com/test-image.jpg',
        robotsMeta: 'index,follow',
        schemaType: 'WebPage'
      };

      await seoMetaService.saveSEOMeta('test-page-1', testSEOData);
      const retrievedData = await seoMetaService.getSEOMeta('test-page-1');
      
      if (retrievedData && retrievedData.title === testSEOData.title) {
        results.push({
          test: 'SEO Meta Service',
          status: 'PASS',
          message: 'SEO meta data save and retrieve successful'
        });
        console.log('✅ SEO Meta Service working');
      } else {
        results.push({
          test: 'SEO Meta Service',
          status: 'FAIL',
          message: 'SEO meta data retrieval failed'
        });
        console.log('❌ SEO Meta Service failed');
      }
    } catch (error) {
      results.push({
        test: 'SEO Meta Service',
        status: 'FAIL',
        message: 'SEO Meta Service error',
        details: error
      });
      console.log('❌ SEO Meta Service error:', error);
    }

    // 3. Test Auto-SEO Service
    console.log('\n3. Testing Auto-SEO Service...');
    try {
      const testContent = {
        id: 'test-content-1',
        title: 'Best London Restaurants 2024',
        content: 'Discover the finest restaurants in London with our comprehensive guide to the best dining experiences.',
        slug: 'best-london-restaurants-2024',
        excerpt: 'A curated list of London\'s top restaurants for 2024',
        author: 'Yalla London Team',
        publishedAt: new Date().toISOString(),
        language: 'en' as const,
        category: 'restaurants',
        tags: ['london', 'restaurants', 'dining', 'food'],
        type: 'article' as const
      };

      const seoData = await autoSEOService.generateSEOMeta(testContent);
      
      if (seoData.title && seoData.description && seoData.canonical) {
        results.push({
          test: 'Auto-SEO Service',
          status: 'PASS',
          message: 'Auto-SEO metadata generation successful'
        });
        console.log('✅ Auto-SEO Service working');
        console.log(`   Generated title: ${seoData.title}`);
        console.log(`   Generated description: ${seoData.description.substring(0, 50)}...`);
        console.log(`   SEO Score: ${seoData.seoScore}/100`);
      } else {
        results.push({
          test: 'Auto-SEO Service',
          status: 'FAIL',
          message: 'Auto-SEO metadata generation incomplete'
        });
        console.log('❌ Auto-SEO Service failed');
      }
    } catch (error) {
      results.push({
        test: 'Auto-SEO Service',
        status: 'FAIL',
        message: 'Auto-SEO Service error',
        details: error
      });
      console.log('❌ Auto-SEO Service error:', error);
    }

    // 4. Test Schema Generator
    console.log('\n4. Testing Schema Generator...');
    try {
      const schemaGen = new SchemaGenerator('https://yalla-london.com', {
        siteName: 'Yalla London',
        description: 'Luxury London travel guide',
        contact: {
          email: 'hello@yalla-london.com'
        }
      });

      const websiteSchema = schemaGen.generateWebsite();
      const articleSchema = schemaGen.generateArticle({
        title: 'Test Article',
        content: 'Test content',
        slug: 'test-article',
        author: 'Test Author',
        publishedAt: new Date().toISOString()
      });

      if (websiteSchema && articleSchema) {
        results.push({
          test: 'Schema Generator',
          status: 'PASS',
          message: 'Schema generation successful'
        });
        console.log('✅ Schema Generator working');
        console.log(`   Website schema type: ${websiteSchema['@type']}`);
        console.log(`   Article schema type: ${articleSchema['@type']}`);
      } else {
        results.push({
          test: 'Schema Generator',
          status: 'FAIL',
          message: 'Schema generation failed'
        });
        console.log('❌ Schema Generator failed');
      }
    } catch (error) {
      results.push({
        test: 'Schema Generator',
        status: 'FAIL',
        message: 'Schema Generator error',
        details: error
      });
      console.log('❌ Schema Generator error:', error);
    }

    // 5. Test SEO API Endpoints
    console.log('\n5. Testing SEO API Endpoints...');
    const apiTests = [
      { name: 'Save Meta API', url: '/api/seo/save-meta', method: 'POST' },
      { name: 'Generate Meta API', url: '/api/seo/generate-meta', method: 'POST' },
      { name: 'Generate Title API', url: '/api/seo/generate-title', method: 'POST' },
      { name: 'Optimize Content API', url: '/api/seo/optimize-content', method: 'POST' },
      { name: 'Sitemap Generation API', url: '/api/sitemap/generate', method: 'POST' }
    ];

    for (const apiTest of apiTests) {
      try {
        const response = await fetch(`http://localhost:3000${apiTest.url}`, {
          method: apiTest.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Title',
            content: 'Test content for API testing',
            language: 'en'
          })
        });

        if (response.status === 200 || response.status === 201) {
          results.push({
            test: apiTest.name,
            status: 'PASS',
            message: 'API endpoint accessible'
          });
          console.log(`✅ ${apiTest.name} working`);
        } else {
          results.push({
            test: apiTest.name,
            status: 'FAIL',
            message: `API returned status ${response.status}`
          });
          console.log(`❌ ${apiTest.name} failed (${response.status})`);
        }
      } catch (error) {
        results.push({
          test: apiTest.name,
          status: 'SKIP',
          message: 'API endpoint not accessible (server not running)'
        });
        console.log(`⚠️  ${apiTest.name} skipped (server not running)`);
      }
    }

    // 6. Test Feature Flags
    console.log('\n6. Testing Feature Flags...');
    const featureFlags = [
      'FEATURE_SEO',
      'NEXT_PUBLIC_FEATURE_SEO',
      'FEATURE_AI_SEO_AUDIT',
      'FEATURE_ANALYTICS_DASHBOARD'
    ];

    for (const flag of featureFlags) {
      const value = process.env[flag];
      if (value === '1' || value === 'true') {
        results.push({
          test: `Feature Flag: ${flag}`,
          status: 'PASS',
          message: 'Feature flag enabled'
        });
        console.log(`✅ ${flag} enabled`);
      } else {
        results.push({
          test: `Feature Flag: ${flag}`,
          status: 'FAIL',
          message: 'Feature flag disabled'
        });
        console.log(`❌ ${flag} disabled`);
      }
    }

    // 7. Test SEO Score Calculation
    console.log('\n7. Testing SEO Score Calculation...');
    try {
      const testSEOData = {
        title: 'Perfect SEO Title - Yalla London',
        description: 'This is a perfect SEO description that is exactly 160 characters long and provides valuable information about the content.',
        canonical: 'https://yalla-london.com/perfect-seo',
        ogTitle: 'Perfect OG Title',
        ogDescription: 'Perfect OG description',
        ogImage: 'https://example.com/og-image.jpg',
        twitterTitle: 'Perfect Twitter Title',
        twitterDescription: 'Perfect Twitter description',
        twitterImage: 'https://example.com/twitter-image.jpg',
        structuredData: { '@type': 'Article' },
        hreflangAlternates: { en: 'https://yalla-london.com/en/perfect-seo', ar: 'https://yalla-london.com/ar/perfect-seo' }
      };

      const score = seoMetaService.calculateSEOScore(testSEOData);
      
      if (score >= 80) {
        results.push({
          test: 'SEO Score Calculation',
          status: 'PASS',
          message: `SEO score calculation working (${score}/100)`
        });
        console.log(`✅ SEO Score Calculation working (${score}/100)`);
      } else {
        results.push({
          test: 'SEO Score Calculation',
          status: 'FAIL',
          message: `SEO score too low (${score}/100)`
        });
        console.log(`❌ SEO Score Calculation failed (${score}/100)`);
      }
    } catch (error) {
      results.push({
        test: 'SEO Score Calculation',
        status: 'FAIL',
        message: 'SEO score calculation error',
        details: error
      });
      console.log('❌ SEO Score Calculation error:', error);
    }

    // Generate Summary Report
    console.log('\n📊 SEO Capabilities Test Summary');
    console.log('==================================');
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   - ${result.test}: ${result.message}`);
      });
    }

    console.log('\n🎯 SEO Capabilities Status:');
    if (passed >= total * 0.8) {
      console.log('✅ EXCELLENT - SEO system is working well');
    } else if (passed >= total * 0.6) {
      console.log('⚠️  GOOD - SEO system has some issues');
    } else {
      console.log('❌ POOR - SEO system needs significant fixes');
    }

    console.log('\n🚀 Next Steps:');
    if (failed > 0) {
      console.log('1. Fix failed tests');
      console.log('2. Enable feature flags');
      console.log('3. Run database migrations');
      console.log('4. Test with real content');
    } else {
      console.log('1. Deploy SEO features to production');
      console.log('2. Monitor SEO performance');
      console.log('3. Optimize based on analytics');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test if called directly
if (require.main === module) {
  testSEOCapabilities();
}

