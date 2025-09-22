#!/usr/bin/env tsx

/**
 * SEO Health Check Script
 * Comprehensive testing of SEO system functionality
 */

import { prisma } from '@/lib/db';
import { seoMetaService } from '@/lib/seo/seo-meta-service';
import { autoSEOService } from '@/lib/seo/auto-seo-service';
import { SchemaGenerator } from '@/lib/seo/schema-generator';
import { MultilingualSeoEngine } from '@/lib/seo/multilingual-seo';
import { 
  isSEOEnabled, 
  isAISEOEnabled, 
  isAnalyticsEnabled,
  getFeatureFlagStatus,
  getAllFeatureFlags 
} from '@/lib/flags';
import { brandConfig } from '@/config/brand-config';

interface HealthCheckResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

interface HealthCheckSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: HealthCheckResult[];
}

class SEOHealthChecker {
  private baseUrl: string;
  private results: HealthCheckResult[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }

  async runAllChecks(): Promise<HealthCheckSummary> {
    console.log('🔍 Starting SEO Health Check...\n');

    // 1. Feature Flag Checks
    await this.checkFeatureFlags();

    // 2. Database Connection
    await this.checkDatabaseConnection();

    // 3. SEO Service Tests
    await this.checkSEOServices();

    // 4. API Endpoint Tests
    await this.checkAPIEndpoints();

    // 5. Schema Generation Tests
    await this.checkSchemaGeneration();

    // 6. Multilingual SEO Tests
    await this.checkMultilingualSEO();

    // 7. Environment Variable Checks
    await this.checkEnvironmentVariables();

    return this.generateSummary();
  }

  private async checkFeatureFlags(): Promise<void> {
    console.log('📋 Checking Feature Flags...');

    const seoFlags = [
      'FEATURE_SEO',
      'NEXT_PUBLIC_FEATURE_SEO',
      'FEATURE_AI_SEO_AUDIT',
      'FEATURE_ANALYTICS_DASHBOARD',
      'FEATURE_MULTILINGUAL_SEO',
      'FEATURE_SCHEMA_GENERATION',
      'FEATURE_SITEMAP_AUTO_UPDATE'
    ];

    for (const flag of seoFlags) {
      const status = getFeatureFlagStatus(flag);
      this.addResult(
        `Feature Flag: ${flag}`,
        status.enabled ? 'PASS' : 'SKIP',
        status.enabled 
          ? 'Feature flag is enabled' 
          : `Feature flag is disabled${status.missingDependencies.length > 0 ? ` (missing: ${status.missingDependencies.join(', ')})` : ''}`,
        status
      );
    }

    // Check overall SEO status
    this.addResult(
      'SEO System Status',
      isSEOEnabled() ? 'PASS' : 'SKIP',
      isSEOEnabled() ? 'SEO system is enabled' : 'SEO system is disabled'
    );
  }

  private async checkDatabaseConnection(): Promise<void> {
    console.log('🗄️ Checking Database Connection...');

    try {
      // Test basic connection
      await prisma.$queryRaw`SELECT 1`;
      this.addResult('Database Connection', 'PASS', 'Database connection successful');

      // Test SEO tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'seo_%'
      ` as Array<{ table_name: string }>;

      const expectedTables = [
        'seo_meta',
        'seo_audit_results',
        'seo_redirects',
        'seo_internal_links',
        'seo_keywords',
        'seo_content_analysis',
        'seo_reports',
        'seo_health_metrics',
        'seo_page_metrics',
        'seo_sitemap_entries',
        'seo_hreflang_entries',
        'seo_structured_data'
      ];

      const existingTables = tables.map(t => t.table_name);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));

      if (missingTables.length === 0) {
        this.addResult('SEO Database Tables', 'PASS', 'All SEO tables exist');
      } else {
        this.addResult(
          'SEO Database Tables', 
          'FAIL', 
          `Missing tables: ${missingTables.join(', ')}. Run migration: npx prisma db push`,
          { missing: missingTables, existing: existingTables }
        );
      }

    } catch (error: any) {
      this.addResult('Database Connection', 'FAIL', `Database connection failed: ${error.message}`);
    }
  }

  private async checkSEOServices(): Promise<void> {
    console.log('🔧 Checking SEO Services...');

    if (!isSEOEnabled()) {
      this.addResult('SEO Services', 'SKIP', 'SEO features are disabled');
      return;
    }

    try {
      // Test SEO Meta Service
      const testPageId = 'health-check-test';
      const testData = {
        pageId: testPageId,
        title: 'Health Check Test Page',
        description: 'This is a test page for SEO health checks',
        canonical: `${this.baseUrl}/test`,
        seoScore: 85
      };

      // Save test data
      await seoMetaService.saveSEOMeta(testPageId, testData);
      this.addResult('SEO Meta Service - Save', 'PASS', 'Successfully saved SEO metadata');

      // Retrieve test data
      const retrieved = await seoMetaService.getSEOMeta(testPageId);
      if (retrieved && retrieved.title === testData.title) {
        this.addResult('SEO Meta Service - Retrieve', 'PASS', 'Successfully retrieved SEO metadata');
      } else {
        this.addResult('SEO Meta Service - Retrieve', 'FAIL', 'Failed to retrieve SEO metadata');
      }

      // Clean up test data
      await seoMetaService.deleteSEOMeta(testPageId);
      this.addResult('SEO Meta Service - Delete', 'PASS', 'Successfully deleted test data');

    } catch (error: any) {
      this.addResult('SEO Services', 'FAIL', `SEO service error: ${error.message}`);
    }
  }

  private async checkAPIEndpoints(): Promise<void> {
    console.log('🌐 Checking API Endpoints...');

    if (!isSEOEnabled()) {
      this.addResult('SEO API Endpoints', 'SKIP', 'SEO features are disabled');
      return;
    }

    const endpoints = [
      { path: '/api/seo/save-meta', method: 'GET' },
      { path: '/api/seo/generate-meta', method: 'POST' },
      { path: '/api/seo/analyze-content', method: 'POST' },
      { path: '/api/sitemap/generate', method: 'POST' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.method === 'POST' ? JSON.stringify({ test: true }) : undefined
        });

        if (response.status === 403) {
          this.addResult(
            `API: ${endpoint.path}`,
            'SKIP',
            'Endpoint disabled (feature flag or missing API key)'
          );
        } else if (response.status < 500) {
          this.addResult(
            `API: ${endpoint.path}`,
            'PASS',
            `Endpoint responding (status: ${response.status})`
          );
        } else {
          this.addResult(
            `API: ${endpoint.path}`,
            'FAIL',
            `Server error (status: ${response.status})`
          );
        }
      } catch (error: any) {
        this.addResult(
          `API: ${endpoint.path}`,
          'FAIL',
          `Connection error: ${error.message}`
        );
      }
    }
  }

  private async checkSchemaGeneration(): Promise<void> {
    console.log('📄 Checking Schema Generation...');

    if (!isSEOEnabled()) {
      this.addResult('Schema Generation', 'SKIP', 'SEO features are disabled');
      return;
    }

    try {
      const schemaGenerator = new SchemaGenerator(this.baseUrl, brandConfig);

      // Test article schema
      const articleSchema = schemaGenerator.generateSchemaForPageType('article', {
        title: 'Test Article',
        content: 'Test content',
        slug: 'test-article',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        url: `${this.baseUrl}/test-article`,
        image: `${this.baseUrl}/test-image.jpg`
      });

      if (articleSchema && (articleSchema as any)['@type'] === 'Article') {
        this.addResult('Schema Generation - Article', 'PASS', 'Article schema generated successfully');
      } else {
        this.addResult('Schema Generation - Article', 'FAIL', 'Article schema generation failed');
      }

      // Test FAQ schema
      const faqContent = "<h2>FAQ</h2><p>What is this?</p><p>This is a test.</p>";
      const faqSchema = schemaGenerator.generateFAQFromContent(faqContent, `${this.baseUrl}/faq`);

      if (faqSchema && (faqSchema as any)['@type'] === 'FAQPage') {
        this.addResult('Schema Generation - FAQ', 'PASS', 'FAQ schema generated successfully');
      } else {
        this.addResult('Schema Generation - FAQ', 'FAIL', 'FAQ schema generation failed');
      }

    } catch (error: any) {
      this.addResult('Schema Generation', 'FAIL', `Schema generation error: ${error.message}`);
    }
  }

  private async checkMultilingualSEO(): Promise<void> {
    console.log('🌍 Checking Multilingual SEO...');

    if (!isSEOEnabled()) {
      this.addResult('Multilingual SEO', 'SKIP', 'SEO features are disabled');
      return;
    }

    try {
      const multilingualEngine = new MultilingualSeoEngine({
        baseUrl: this.baseUrl,
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ar'],
        urlStructure: 'subdirectory'
      });

      const hreflangEntries = multilingualEngine.generateHreflangTags('test-page', ['en', 'ar']);

      if (hreflangEntries.length >= 2) {
        this.addResult('Multilingual SEO - Hreflang', 'PASS', 'Hreflang tags generated successfully');
      } else {
        this.addResult('Multilingual SEO - Hreflang', 'FAIL', 'Hreflang generation failed');
      }

    } catch (error: any) {
      this.addResult('Multilingual SEO', 'FAIL', `Multilingual SEO error: ${error.message}`);
    }
  }

  private async checkEnvironmentVariables(): Promise<void> {
    console.log('🔑 Checking Environment Variables...');

    const requiredVars = [
      { key: 'NEXT_PUBLIC_SITE_URL', required: true },
      { key: 'DATABASE_URL', required: true },
      { key: 'ABACUSAI_API_KEY', required: false, feature: 'FEATURE_AI_SEO_AUDIT' },
      { key: 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID', required: false, feature: 'FEATURE_ANALYTICS_DASHBOARD' },
      { key: 'GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL', required: false },
      { key: 'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY', required: false }
    ];

    for (const envVar of requiredVars) {
      const value = process.env[envVar.key];
      const isFeatureEnabled = envVar.feature ? getFeatureFlagStatus(envVar.feature).enabled : true;

      if (envVar.required) {
        this.addResult(
          `Env: ${envVar.key}`,
          value ? 'PASS' : 'FAIL',
          value ? 'Required environment variable is set' : 'Required environment variable is missing'
        );
      } else {
        this.addResult(
          `Env: ${envVar.key}`,
          value ? 'PASS' : (isFeatureEnabled ? 'FAIL' : 'SKIP'),
          value 
            ? 'Optional environment variable is set' 
            : (isFeatureEnabled ? 'Required for enabled feature' : 'Optional environment variable (feature disabled)')
        );
      }
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any): void {
    this.results.push({ test, status, message, details });
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`  ${icon} ${test}: ${message}`);
    
    if (details && status === 'FAIL') {
      console.log(`    Details:`, details);
    }
  }

  private generateSummary(): HealthCheckSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    return { total, passed, failed, skipped, results: this.results };
  }

  private printSummary(summary: HealthCheckSummary): void {
    console.log('\n📊 SEO Health Check Summary');
    console.log('============================');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      summary.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }

    if (summary.skipped > 0) {
      console.log('\n⏭️ Skipped Tests:');
      summary.results
        .filter(r => r.status === 'SKIP')
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }

    const successRate = Math.round((summary.passed / summary.total) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (summary.failed === 0) {
      console.log('\n🎉 All SEO systems are healthy!');
    } else {
      console.log('\n⚠️ Some SEO systems need attention.');
    }
  }
}

async function main() {
  const checker = new SEOHealthChecker();
  
  try {
    const summary = await checker.runAllChecks();
    checker.printSummary(summary);
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SEOHealthChecker };

