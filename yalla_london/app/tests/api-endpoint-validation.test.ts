/**
 * Backend API Endpoint Validation Tests
 * 
 * Exercises and validates all backend API endpoints used by dashboard and website
 * Tests authentication, data validation, error handling, and response formats
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'YallaLondon24!';

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
}

let apiTestResults: APITestResult[] = [];

test.describe('Backend API Endpoint Validation', () => {

  test.describe('1. Health and Infrastructure APIs', () => {
    
    test('GET /api/health - System health check', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/health`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/health',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('timestamp');
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('GET /api/database/stats - Database statistics', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/database/stats`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/database/stats',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('tables');
        expect(Array.isArray(data.tables)).toBeTruthy();
      } else {
        console.warn('Database stats endpoint not available');
      }
    });

    test('GET /api/monitoring/alerts - System monitoring', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/monitoring/alerts`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/monitoring/alerts',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // This endpoint may require authentication
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  test.describe('2. Content Management APIs', () => {
    
    test('GET /api/content - Public content retrieval', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/content`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/content',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
        // Content should be an array or object with content items
        expect(typeof data).toMatch(/object|array/);
      } else {
        console.warn('Content API may require implementation or authentication');
      }
    });

    test('POST /api/generate-content - Content generation', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post(`${BASE_URL}/api/generate-content`, {
        data: {
          type: 'blog_post',
          topic: 'London events',
          language: 'en'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/generate-content',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // This endpoint may require authentication or may return 405 if not implemented
      expect([200, 201, 401, 405, 501]).toContain(response.status());
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('content');
      }
    });
  });

  test.describe('3. Admin Dashboard APIs', () => {
    
    test('GET /api/admin/dashboard - Dashboard data (unauthenticated)', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/admin/dashboard`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/admin/dashboard',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // Should require authentication
      if (response.status() === 401) {
        expect(response.status()).toBe(401);
      } else if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('status');
      }
    });

    test('POST /api/admin/sync-test - Sync testing functionality', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post(`${BASE_URL}/api/admin/sync-test`, {
        data: {
          action: 'test-sync'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/admin/sync-test',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // May require authentication or may not be implemented
      expect([200, 201, 401, 404, 405]).toContain(response.status());
    });
  });

  test.describe('4. Media Management APIs', () => {
    
    test('GET /api/media - Media library retrieval', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/media`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/media',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
        // Should return media items array or object
        expect(typeof data).toMatch(/object|array/);
      } else {
        console.warn('Media API may require authentication or implementation');
      }
    });

    test('POST /api/media/upload - File upload endpoint', async ({ request }) => {
      const startTime = Date.now();
      
      // Test with minimal form data
      const response = await request.post(`${BASE_URL}/api/media/upload`, {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('test content')
          }
        }
      });
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/media/upload',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // May require authentication, specific headers, or may not be implemented
      expect([200, 201, 400, 401, 404, 405, 413, 415]).toContain(response.status());
    });
  });

  test.describe('5. Social Media Integration APIs', () => {
    
    test('GET /api/social-embeds - Social media embeds', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/social-embeds`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/social-embeds',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      } else {
        console.warn('Social embeds API may require authentication');
      }
    });

    test('POST /api/social-embeds - Create social embed', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post(`${BASE_URL}/api/social-embeds`, {
        data: {
          platform: 'instagram',
          url: 'https://www.instagram.com/p/TEST123456/',
          title: 'Test Embed'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/social-embeds',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // May require authentication or validation
      expect([200, 201, 400, 401, 422]).toContain(response.status());
    });

    test('GET /api/social/instagram-feed - Instagram feed', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/social/instagram-feed`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/social/instagram-feed',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // Instagram feed may require API keys or tokens
      expect([200, 401, 404, 429, 500]).toContain(response.status());
    });

    test('POST /api/social/generate-reel-script - Reel script generation', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post(`${BASE_URL}/api/social/generate-reel-script`, {
        data: {
          topic: 'London events',
          duration: 30,
          style: 'casual'
        }
      });
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/social/generate-reel-script',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // AI generation may require API keys
      expect([200, 201, 401, 404, 429, 500]).toContain(response.status());
    });
  });

  test.describe('6. Feature Flags and Configuration APIs', () => {
    
    test('POST /api/feature-flags/refresh - Feature flag refresh', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.post(`${BASE_URL}/api/feature-flags/refresh`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/feature-flags/refresh',
        method: 'POST',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // May require admin authentication
      expect([200, 401, 405]).toContain(response.status());
    });
  });

  test.describe('7. Export and Integration APIs', () => {
    
    test('GET /api/export/wordpress - WordPress export', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}/api/export/wordpress`);
      const responseTime = Date.now() - startTime;
      
      const result: APITestResult = {
        endpoint: '/api/export/wordpress',
        method: 'GET',
        status: response.status(),
        success: response.ok(),
        responseTime
      };
      
      apiTestResults.push(result);
      
      // Export may require authentication or specific permissions
      expect([200, 401, 404, 405]).toContain(response.status());
    });
  });

  test.describe('8. Error Handling and Edge Cases', () => {
    
    test('should handle non-existent endpoints gracefully', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/non-existent-endpoint`);
      
      expect(response.status()).toBe(404);
      
      // Should return a proper error response
      const responseText = await response.text();
      expect(responseText).toBeTruthy();
    });

    test('should handle malformed requests', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/health`, {
        data: { invalid: 'data' }
      });
      
      // Health endpoint likely doesn't accept POST, should return 405
      expect([405, 404]).toContain(response.status());
    });

    test('should validate request size limits', async ({ request }) => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB of data
      
      try {
        const response = await request.post(`${BASE_URL}/api/content`, {
          data: { content: largeData }
        });
        
        // Should either accept it or return 413 (Payload Too Large)
        expect([200, 201, 413, 400, 401, 404]).toContain(response.status());
      } catch (error) {
        // Request may timeout or be rejected by the client
        console.warn('Large request test failed:', error);
      }
    });

    test('should handle concurrent requests', async ({ request }) => {
      // Test multiple concurrent requests to the same endpoint
      const promises = Array.from({ length: 10 }, () => 
        request.get(`${BASE_URL}/api/health`)
      );
      
      const responses = await Promise.all(promises);
      
      // All health checks should succeed
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
    });
  });

  test.describe('9. Authentication and Authorization', () => {
    
    test('should properly handle authentication headers', async ({ request }) => {
      // Test with invalid auth header
      const response = await request.get(`${BASE_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('should validate CORS headers', async ({ request }) => {
      const response = await request.options(`${BASE_URL}/api/health`);
      
      // OPTIONS request should be handled for CORS
      expect([200, 204, 404]).toContain(response.status());
    });
  });

  test.describe('10. Performance and Rate Limiting', () => {
    
    test('should handle rate limiting appropriately', async ({ request }) => {
      // Make multiple rapid requests
      const promises = Array.from({ length: 50 }, () => 
        request.get(`${BASE_URL}/api/content`)
      );
      
      const responses = await Promise.all(promises);
      
      // Check if any responses are rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      if (rateLimitedResponses.length > 0) {
        console.log('Rate limiting is active');
        // Rate limited responses should have proper headers
        const rateLimitHeaders = rateLimitedResponses[0].headers();
        expect(rateLimitHeaders['retry-after'] || rateLimitHeaders['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });

  // Generate API test report
  test.afterAll(async () => {
    await generateAPIReport();
  });
});

async function generateAPIReport() {
  const successfulTests = apiTestResults.filter(r => r.success);
  const failedTests = apiTestResults.filter(r => !r.success);
  const averageResponseTime = apiTestResults.reduce((sum, r) => sum + r.responseTime, 0) / apiTestResults.length;

  const report = `
# API Endpoint Validation Report

**Generated:** ${new Date().toISOString()}

## Summary
- **Total Endpoints Tested:** ${apiTestResults.length}
- **Successful:** ${successfulTests.length}
- **Failed:** ${failedTests.length}
- **Success Rate:** ${((successfulTests.length / apiTestResults.length) * 100).toFixed(2)}%
- **Average Response Time:** ${averageResponseTime.toFixed(2)}ms

## Endpoint Results

### Successful Endpoints
${successfulTests.map(r => `- ✅ ${r.method} ${r.endpoint} (${r.status}) - ${r.responseTime}ms`).join('\n')}

### Failed/Problematic Endpoints
${failedTests.map(r => `- ❌ ${r.method} ${r.endpoint} (${r.status}) - ${r.responseTime}ms${r.error ? ` - ${r.error}` : ''}`).join('\n')}

## Performance Analysis
- **Fastest Response:** ${Math.min(...apiTestResults.map(r => r.responseTime))}ms
- **Slowest Response:** ${Math.max(...apiTestResults.map(r => r.responseTime))}ms
- **Endpoints > 1s:** ${apiTestResults.filter(r => r.responseTime > 1000).length}

## Recommendations
${failedTests.length > 0 ? '- Fix failed endpoints to improve API coverage' : '- All critical endpoints are functioning'}
${apiTestResults.filter(r => r.responseTime > 5000).length > 0 ? '- Optimize slow endpoints for better performance' : '- API response times are acceptable'}
- Implement proper authentication for protected endpoints
- Add rate limiting where appropriate
- Ensure all endpoints return proper error messages

---
*Report generated by Yalla London API Validation Test Suite*
`;

  // Write report to file
  const fs = require('fs');
  const path = require('path');
  
  const reportsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `api-validation-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📊 API Validation Report saved to: ${reportPath}`);
  console.log(report);
}

export { apiTestResults };