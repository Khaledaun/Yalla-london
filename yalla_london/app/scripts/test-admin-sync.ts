#!/usr/bin/env tsx

/**
 * Admin Dashboard to Public Website Sync Test
 * Verifies that changes made in admin dashboard appear on public website
 */

import { createServiceClient } from '@/lib/supabase';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class AdminSyncTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🔍 Testing Admin Dashboard to Public Website Sync...\n');

    await this.testDatabaseConnection();
    await this.testPublicAPI();
    await this.testCacheInvalidation();
    await this.testRealTimeSync();
    await this.testAdminAPI();

    this.printResults();
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      console.log('1. Testing Database Connection...');
      
      // Test if we can connect to the database
      const supabase = createServiceClient();
      const { data, error } = await supabase.from('BlogPost').select('id, title_en, published').limit(1);
      
      if (error) {
        this.addResult('Database Connection', false, 'Failed to connect to database', null, error.message);
        return;
      }

      this.addResult('Database Connection', true, `Connected successfully. Found ${data?.length || 0} posts`);
    } catch (error) {
      this.addResult('Database Connection', false, 'Database connection failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testPublicAPI(): Promise<void> {
    try {
      console.log('2. Testing Public API Endpoints...');
      
      // Test public content API
      const response = await fetch('http://localhost:3000/api/content?limit=3');
      const data = await response.json();
      
      if (!response.ok) {
        this.addResult('Public API', false, 'Public API not responding', null, data.error);
        return;
      }

      if (!data.success) {
        this.addResult('Public API', false, 'Public API returned error', null, data.error);
        return;
      }

      this.addResult('Public API', true, `Public API working. Found ${data.data?.length || 0} published posts`);
    } catch (error) {
      this.addResult('Public API', false, 'Public API test failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testCacheInvalidation(): Promise<void> {
    try {
      console.log('3. Testing Cache Invalidation...');
      
      // Test cache invalidation endpoint
      const response = await fetch('http://localhost:3000/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'blog' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        this.addResult('Cache Invalidation', false, 'Cache invalidation failed', null, data.error);
        return;
      }

      this.addResult('Cache Invalidation', true, 'Cache invalidation working');
    } catch (error) {
      this.addResult('Cache Invalidation', false, 'Cache invalidation test failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testRealTimeSync(): Promise<void> {
    try {
      console.log('4. Testing Real-Time Sync...');
      
      // Create a test post via admin API
      const testPost = {
        title_en: `Sync Test ${Date.now()}`,
        title_ar: `اختبار المزامنة ${Date.now()}`,
        slug: `sync-test-${Date.now()}`,
        content_en: 'This is a test post for sync verification.',
        content_ar: 'هذا منشور اختبار للتحقق من المزامنة.',
        published: true,
        category_id: 'test-category',
        author_id: 'test-author',
        tags: ['test', 'sync']
      };

      // Create via admin API
      const createResponse = await fetch('http://localhost:3000/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPost)
      });

      const createData = await createResponse.json();
      
      if (!createResponse.ok) {
        this.addResult('Real-Time Sync', false, 'Failed to create test post', null, createData.error);
        return;
      }

      // Wait a moment for cache invalidation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if it appears on public API
      const publicResponse = await fetch(`http://localhost:3000/api/content/blog/${testPost.slug}`);
      const publicData = await publicResponse.json();

      if (!publicResponse.ok || !publicData.success) {
        this.addResult('Real-Time Sync', false, 'Test post not found on public API', null, 'Post created but not visible publicly');
        return;
      }

      // Clean up test post
      await fetch(`http://localhost:3000/api/admin/content?id=${createData.data.id}`, {
        method: 'DELETE'
      });

      this.addResult('Real-Time Sync', true, 'Real-time sync working perfectly');
    } catch (error) {
      this.addResult('Real-Time Sync', false, 'Real-time sync test failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testAdminAPI(): Promise<void> {
    try {
      console.log('5. Testing Admin API...');
      
      // Test admin content listing
      const response = await fetch('http://localhost:3000/api/admin/content');
      const data = await response.json();
      
      if (!response.ok) {
        this.addResult('Admin API', false, 'Admin API not responding', null, data.error);
        return;
      }

      this.addResult('Admin API', true, `Admin API working. Found ${data.data?.length || 0} posts`);
    } catch (error) {
      this.addResult('Admin API', false, 'Admin API test failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private addResult(test: string, success: boolean, message: string, data?: any, error?: string): void {
    this.results.push({ test, success, message, data, error });
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let failed = 0;

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.success) passed++;
      else failed++;
    });

    console.log('\n' + '=' .repeat(50));
    console.log(`📈 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Your admin dashboard is properly connected to the public website.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above and fix the issues.');
    }
  }
}

// Run the tests
(async () => {
  const tester = new AdminSyncTester();
  await tester.runAllTests();
})();

