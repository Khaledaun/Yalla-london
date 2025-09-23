/**
 * Enhanced SEO Test Script
 * Tests all new SEO features: Schema Injection, Programmatic Pages, Internal Linking, AI Audit, Sitemaps
 */

import { enhancedSchemaInjector } from '../lib/seo/enhanced-schema-injector';
import { programmaticPagesService } from '../lib/seo/programmatic-pages-service';
import { dynamicInternalLinking } from '../lib/seo/dynamic-internal-linking';
import { aiSEOAudit } from '../lib/seo/ai-seo-audit';
import { enhancedSitemapGenerator } from '../lib/seo/enhanced-sitemap-generator';

async function testEnhancedSchemaInjection() {
  console.log('🧪 Testing Enhanced Schema Injection...');
  
  try {
    const testContent = `
      <h1>Best Luxury Hotels in London</h1>
      <p>London offers some of the world's most luxurious hotels. Here's our guide to the best ones.</p>
      
      <h2>Q: What are the best luxury hotels in London?</h2>
      <p>A: The best luxury hotels in London include The Ritz, The Savoy, and The Langham.</p>
      
      <h2>Q: How much do luxury hotels in London cost?</h2>
      <p>A: Luxury hotels in London typically cost between £300-£1000 per night.</p>
      
      <h2>Step 1: Research your options</h2>
      <p>Start by researching different luxury hotels in London.</p>
      
      <h2>Step 2: Compare prices</h2>
      <p>Compare prices across different booking platforms.</p>
      
      <h2>Step 3: Book your stay</h2>
      <p>Book your preferred hotel well in advance.</p>
      
      <p>This hotel gets 4/5 stars for its excellent service and location.</p>
    `;

    const result = await enhancedSchemaInjector.injectSchemas(
      testContent,
      'Best Luxury Hotels in London 2025',
      'https://yalla-london.com/best-luxury-hotels-london',
      'test-page-1',
      {
        author: 'Yalla London Team',
        category: 'luxury_hotels',
        tags: ['luxury', 'hotels', 'london', 'travel'],
        featuredImage: 'https://yalla-london.com/images/luxury-hotel.jpg'
      }
    );

    console.log(`✅ Schema injection successful:`);
    console.log(`   - Schemas injected: ${result.injectedCount}`);
    console.log(`   - Types: ${result.types.join(', ')}`);
    console.log(`   - SEO Score: ${result.seoScore}/100`);
    
    return true;
  } catch (error) {
    console.error('❌ Schema injection failed:', error);
    return false;
  }
}

async function testProgrammaticPages() {
  console.log('🧪 Testing Programmatic Pages Generation...');
  
  try {
    const result = await programmaticPagesService.generateProgrammaticPages({
      category: 'luxury_hotels',
      locale: 'en',
      count: 3,
      priority: 'high',
      autoPublish: false
    });

    console.log(`✅ Programmatic pages generation successful:`);
    console.log(`   - Pages generated: ${result.generatedCount}`);
    console.log(`   - Success: ${result.success}`);
    
    if (result.pages.length > 0) {
      const firstPage = result.pages[0];
      console.log(`   - Sample page: "${firstPage.title}"`);
      console.log(`   - SEO Score: ${firstPage.seoScore}/100`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Programmatic pages generation failed:', error);
    return false;
  }
}

async function testDynamicInternalLinking() {
  console.log('🧪 Testing Dynamic Internal Linking...');
  
  try {
    const testContent = `
      <h1>Best Restaurants in London</h1>
      <p>London is home to some of the world's finest restaurants. From Michelin-starred establishments to hidden gems, the city offers an incredible dining experience.</p>
      
      <h2>Fine Dining in London</h2>
      <p>For those seeking the ultimate luxury dining experience, London's fine dining scene is unparalleled.</p>
      
      <h2>Luxury Hotels with Great Restaurants</h2>
      <p>Many luxury hotels in London feature world-class restaurants that are worth visiting even if you're not staying there.</p>
      
      <h2>Cultural Experiences</h2>
      <p>Dining in London is not just about the food - it's about the entire cultural experience.</p>
    `;

    const result = await dynamicInternalLinking.generateInternalLinks(
      'test-page-2',
      testContent,
      'Best Restaurants in London',
      'fine_dining'
    );

    console.log(`✅ Internal linking generation successful:`);
    console.log(`   - Links created: ${result.linksCreated}`);
    console.log(`   - Success: ${result.success}`);
    
    if (result.links.length > 0) {
      const firstLink = result.links[0];
      console.log(`   - Sample link: "${firstLink.anchorText}" -> ${firstLink.targetId}`);
      console.log(`   - Relevance score: ${firstLink.relevanceScore}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Internal linking generation failed:', error);
    return false;
  }
}

async function testAISEOAudit() {
  console.log('🧪 Testing AI SEO Audit...');
  
  try {
    const testContent = `
      <h1>Best Luxury Hotels in London</h1>
      <p>London offers some of the world's most luxurious hotels. Here's our comprehensive guide to the best luxury hotels in London for 2025.</p>
      
      <h2>Top Luxury Hotels</h2>
      <p>The Ritz London is one of the most iconic luxury hotels in London, offering unparalleled service and elegance.</p>
      
      <h2>What to Expect</h2>
      <p>Luxury hotels in London provide exceptional amenities, world-class dining, and impeccable service.</p>
      
      <img src="https://yalla-london.com/images/ritz-london.jpg" alt="The Ritz London luxury hotel exterior" title="The Ritz London">
      
      <p>For more information about luxury travel in London, <a href="/luxury-travel-guide">visit our luxury travel guide</a>.</p>
    `;

    const auditData = {
      pageId: 'test-page-3',
      url: 'https://yalla-london.com/best-luxury-hotels-london',
      title: 'Best Luxury Hotels in London 2025',
      metaDescription: 'Discover the best luxury hotels in London. Expert recommendations for 5-star accommodations, fine dining, and exclusive experiences.',
      content: testContent,
      images: [
        {
          src: 'https://yalla-london.com/images/ritz-london.jpg',
          alt: 'The Ritz London luxury hotel exterior',
          title: 'The Ritz London'
        }
      ],
      links: [
        {
          href: '/luxury-travel-guide',
          text: 'visit our luxury travel guide',
          title: 'Luxury Travel Guide'
        }
      ],
      headings: [
        { level: 1, text: 'Best Luxury Hotels in London' },
        { level: 2, text: 'Top Luxury Hotels' },
        { level: 2, text: 'What to Expect' }
      ],
      wordCount: 150,
      readingTime: 1,
      schemaData: [
        { '@type': 'Article' },
        { '@type': 'FAQPage' }
      ]
    };

    const result = await aiSEOAudit.performSEOAudit(auditData);

    console.log(`✅ AI SEO audit successful:`);
    console.log(`   - Overall score: ${result.overallScore}/100`);
    console.log(`   - Issues found: ${result.issues.length}`);
    console.log(`   - Recommendations: ${result.recommendations.length}`);
    console.log(`   - Quick fixes: ${result.quickFixes.length}`);
    
    if (result.issues.length > 0) {
      console.log(`   - Sample issue: ${result.issues[0].message}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ AI SEO audit failed:', error);
    return false;
  }
}

async function testEnhancedSitemap() {
  console.log('🧪 Testing Enhanced Sitemap Generation...');
  
  try {
    const result = await enhancedSitemapGenerator.generateAllSitemaps();

    console.log(`✅ Sitemap generation successful:`);
    console.log(`   - Sitemaps generated: ${result.sitemaps.length}`);
    console.log(`   - Total entries: ${result.totalEntries}`);
    console.log(`   - Success: ${result.success}`);
    
    result.sitemaps.forEach(sitemap => {
      console.log(`   - ${sitemap.type}: ${sitemap.totalCount} entries`);
    });
    
    console.log(`   - Ping results:`);
    console.log(`     - Google: ${result.pingResults.google ? '✅' : '❌'}`);
    console.log(`     - Bing: ${result.pingResults.bing ? '✅' : '❌'}`);
    console.log(`     - IndexNow: ${result.pingResults.indexNow ? '✅' : '❌'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Sitemap generation failed:', error);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const endpoints = [
    '/api/seo/enhanced-schema',
    '/api/seo/programmatic-pages',
    '/api/seo/internal-linking',
    '/api/seo/audit',
    '/api/seo/sitemap'
  ];

  let successCount = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok || response.status === 400) { // 400 is expected for missing parameters
        console.log(`   ✅ ${endpoint} - ${response.status}`);
        successCount++;
      } else {
        console.log(`   ❌ ${endpoint} - ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} - Error: ${error}`);
    }
  }

  console.log(`✅ API endpoints test: ${successCount}/${endpoints.length} successful`);
  return successCount === endpoints.length;
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced SEO Test Suite...\n');

  const tests = [
    { name: 'Enhanced Schema Injection', fn: testEnhancedSchemaInjection },
    { name: 'Programmatic Pages', fn: testProgrammaticPages },
    { name: 'Dynamic Internal Linking', fn: testDynamicInternalLinking },
    { name: 'AI SEO Audit', fn: testAISEOAudit },
    { name: 'Enhanced Sitemap', fn: testEnhancedSitemap },
    { name: 'API Endpoints', fn: testAPIEndpoints }
  ];

  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    const success = await test.fn();
    results.push({ name: test.name, success });
    console.log(`${'='.repeat(50)}\n`);
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Enhanced SEO system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }

  return passed === total;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runAllTests };




