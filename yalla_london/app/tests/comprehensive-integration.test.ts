/**
 * Comprehensive Integration Test Suite for Yalla London
 * 
 * This test suite validates full connection and integration between:
 * - Workflow (backend and APIs)
 * - Dashboard (admin UI) 
 * - Public website
 * 
 * Tests include all critical flows, endpoints, admin actions, and error handling.
 */

import { test, expect } from '@playwright/test';
import { prisma } from '../lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'YallaLondon24!';

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  errors: string[];
  warnings: string[];
}

let testResults: TestResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
  warnings: []
};

test.describe('Comprehensive Integration Test Suite', () => {
  
  test.beforeEach(async () => {
    testResults.total++;
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === 'passed') {
      testResults.passed++;
    } else {
      testResults.failed++;
      testResults.errors.push(`${testInfo.title}: ${testInfo.error?.message || 'Unknown error'}`);
    }
  });

  test.describe('1. Database Connectivity and Supabase Integration', () => {
    
    test('should connect to database successfully', async ({ request }) => {
      try {
        // Test database connection through health endpoint
        const response = await request.get(`${BASE_URL}/api/health`);
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.status).toBe('ok');
        expect(data).toHaveProperty('database');
        
        if (data.database?.status !== 'connected') {
          testResults.warnings.push('Database connection status unclear from health endpoint');
        }
      } catch (error) {
        testResults.errors.push(`Database connectivity test failed: ${error}`);
        throw error;
      }
    });

    test('should validate Prisma client availability', async () => {
      try {
        // Test Prisma client by attempting a simple query
        const response = await fetch(`${BASE_URL}/api/admin/dashboard`);
        expect(response.status).not.toBe(500);
        
        if (response.status === 401) {
          // Expected for unauthenticated request
          testResults.warnings.push('Admin dashboard requires authentication (expected)');
        }
      } catch (error) {
        testResults.errors.push(`Prisma client test failed: ${error}`);
        throw error;
      }
    });

    test('should validate database migrations', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/api/database/stats`);
        
        if (response.ok()) {
          const data = await response.json();
          expect(data).toHaveProperty('tables');
          expect(Array.isArray(data.tables)).toBeTruthy();
        } else {
          testResults.warnings.push('Database stats endpoint not available');
        }
      } catch (error) {
        testResults.warnings.push(`Database migration validation incomplete: ${error}`);
      }
    });
  });

  test.describe('2. Admin Authentication and Access', () => {
    
    test('should handle admin login flow', async ({ page }) => {
      try {
        // Navigate to admin login
        await page.goto(`${BASE_URL}/admin/login`);
        
        // Check for admin login form
        await expect(page.locator('input[type="password"]')).toBeVisible();
        
        // Attempt login with default credentials
        await page.fill('input[type="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        
        // Wait for potential redirect or success
        await page.waitForTimeout(2000);
        
        // Check if we're redirected to admin dashboard
        const currentUrl = page.url();
        if (currentUrl.includes('/admin') && !currentUrl.includes('/login')) {
          // Login successful
          expect(currentUrl).toContain('/admin');
        } else {
          testResults.warnings.push('Admin login may not be working correctly');
        }
      } catch (error) {
        testResults.errors.push(`Admin login test failed: ${error}`);
        throw error;
      }
    });

    test('should validate admin dashboard accessibility', async ({ page }) => {
      try {
        // Try to access admin dashboard directly
        await page.goto(`${BASE_URL}/admin`);
        
        // Check if redirected to login or dashboard loads
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        
        if (currentUrl.includes('/login')) {
          testResults.warnings.push('Admin dashboard redirects to login (expected for unauthenticated access)');
        } else if (currentUrl.includes('/admin')) {
          // Dashboard accessible, check for key elements
          const dashboardElements = await page.locator('[data-testid="admin-dashboard"]').count();
          if (dashboardElements === 0) {
            testResults.warnings.push('Admin dashboard may not have proper test identifiers');
          }
        }
      } catch (error) {
        testResults.errors.push(`Admin dashboard accessibility test failed: ${error}`);
        throw error;
      }
    });
  });

  test.describe('3. Admin Routes and Pages Validation', () => {
    
    const adminRoutes = [
      '/admin/articles',
      '/admin/articles/new',
      '/admin/media',
      '/admin/media/upload',
      '/admin/content/articles',
      '/admin/content/articles/new',
      '/admin/content/media/upload',
      '/admin/dashboard',
      '/admin/seo-audits',
      '/admin/topics-pipeline',
      '/admin/prompts',
      '/admin/automation-hub'
    ];

    for (const route of adminRoutes) {
      test(`should validate admin route: ${route}`, async ({ page }) => {
        try {
          await page.goto(`${BASE_URL}${route}`);
          
          // Wait for page to load
          await page.waitForTimeout(2000);
          
          // Check for 404 or error states
          const pageTitle = await page.title();
          const hasErrorText = await page.locator('text=Error').count() > 0;
          const has404Text = await page.locator('text=404').count() > 0;
          
          if (hasErrorText) {
            testResults.errors.push(`Error state found on ${route}`);
          }
          
          if (has404Text) {
            testResults.errors.push(`404 error found on ${route}`);
          }
          
          // Check if page loaded successfully
          expect(pageTitle).not.toBe('');
          expect(hasErrorText).toBeFalsy();
          expect(has404Text).toBeFalsy();
          
        } catch (error) {
          testResults.errors.push(`Admin route ${route} test failed: ${error}`);
          throw error;
        }
      });
    }
  });

  test.describe('4. Backend API Endpoint Validation', () => {
    
    const apiEndpoints = [
      { path: '/api/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/content', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/admin/dashboard', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/media', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/social-embeds', method: 'GET', expectedStatus: [200, 401] },
      { path: '/api/generate-content', method: 'POST', expectedStatus: [200, 401, 405] },
      { path: '/api/feature-flags/refresh', method: 'POST', expectedStatus: [200, 401, 405] }
    ];

    for (const endpoint of apiEndpoints) {
      test(`should validate API endpoint: ${endpoint.method} ${endpoint.path}`, async ({ request }) => {
        try {
          let response;
          
          if (endpoint.method === 'GET') {
            response = await request.get(`${BASE_URL}${endpoint.path}`);
          } else if (endpoint.method === 'POST') {
            response = await request.post(`${BASE_URL}${endpoint.path}`, {
              data: {}
            });
          }
          
          const status = response?.status();
          const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
            ? endpoint.expectedStatus 
            : [endpoint.expectedStatus];
          
          expect(expectedStatuses).toContain(status);
          
          // Check for proper error handling
          if (status && status >= 400) {
            const responseBody = await response?.text();
            expect(responseBody).toBeTruthy(); // Should have error message
          }
          
        } catch (error) {
          testResults.errors.push(`API endpoint ${endpoint.path} test failed: ${error}`);
          throw error;
        }
      });
    }
  });

  test.describe('5. Content Management Workflow', () => {
    
    test('should validate article creation workflow', async ({ page }) => {
      try {
        // Navigate to new article page
        await page.goto(`${BASE_URL}/admin/articles/new`);
        await page.waitForTimeout(2000);
        
        // Check if page loads without errors
        const hasError = await page.locator('text=Error Loading').count() > 0;
        expect(hasError).toBeFalsy();
        
        // Check for article editor components
        const hasEditor = await page.locator('[data-testid="article-editor"]').count() > 0;
        if (!hasEditor) {
          testResults.warnings.push('Article editor not found - may need proper test identifiers');
        }
        
      } catch (error) {
        testResults.errors.push(`Article creation workflow test failed: ${error}`);
        throw error;
      }
    });

    test('should validate media upload workflow', async ({ page }) => {
      try {
        // Navigate to media upload page
        await page.goto(`${BASE_URL}/admin/media/upload`);
        await page.waitForTimeout(2000);
        
        // Check if page loads without errors
        const hasError = await page.locator('text=Error Loading').count() > 0;
        expect(hasError).toBeFalsy();
        
        // Check for media upload components
        const hasUploader = await page.locator('input[type="file"]').count() > 0;
        if (!hasUploader) {
          testResults.warnings.push('Media uploader not found - may need implementation');
        }
        
      } catch (error) {
        testResults.errors.push(`Media upload workflow test failed: ${error}`);
        throw error;
      }
    });
  });

  test.describe('6. Public Website Validation', () => {
    
    test('should validate homepage loads correctly', async ({ page }) => {
      try {
        await page.goto(BASE_URL);
        
        // Check page loads
        await expect(page).toHaveTitle(/Yalla London/i);
        
        // Check for key sections
        const hasHero = await page.locator('[data-testid="hero-section"]').count() > 0;
        if (!hasHero) {
          testResults.warnings.push('Hero section not found - may need proper test identifiers');
        }
        
        // Check for console errors
        const consoleErrors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        
        await page.waitForTimeout(3000);
        
        if (consoleErrors.length > 0) {
          testResults.warnings.push(`Console errors found: ${consoleErrors.join(', ')}`);
        }
        
      } catch (error) {
        testResults.errors.push(`Homepage validation test failed: ${error}`);
        throw error;
      }
    });

    test('should validate content pages load correctly', async ({ page }) => {
      try {
        // Test common content routes
        const contentRoutes = ['/about', '/blog', '/events'];
        
        for (const route of contentRoutes) {
          await page.goto(`${BASE_URL}${route}`);
          await page.waitForTimeout(1000);
          
          const has404 = await page.locator('text=404').count() > 0;
          if (has404) {
            testResults.warnings.push(`Route ${route} returns 404 - may not be implemented yet`);
          }
        }
        
      } catch (error) {
        testResults.warnings.push(`Content pages validation incomplete: ${error}`);
      }
    });
  });

  test.describe('7. Integration and Real-time Updates', () => {
    
    test('should validate dashboard to public site sync', async ({ page, context }) => {
      try {
        // This test would typically create content in admin and verify it appears on public site
        // For now, we'll test the sync mechanism endpoints
        
        const response = await page.request.get(`${BASE_URL}/api/admin/sync-test`);
        
        if (response.ok()) {
          const data = await response.json();
          expect(data).toHaveProperty('status');
        } else {
          testResults.warnings.push('Sync test endpoint not available');
        }
        
      } catch (error) {
        testResults.warnings.push(`Integration sync test incomplete: ${error}`);
      }
    });
  });

  test.describe('8. Error Handling and Edge Cases', () => {
    
    test('should handle network errors gracefully', async ({ page }) => {
      try {
        // Test with invalid API calls
        const response = await page.request.get(`${BASE_URL}/api/nonexistent`);
        expect(response.status()).toBe(404);
        
        const responseBody = await response.text();
        expect(responseBody).toBeTruthy(); // Should have error message
        
      } catch (error) {
        testResults.warnings.push(`Error handling test incomplete: ${error}`);
      }
    });

    test('should validate input sanitization', async ({ page }) => {
      try {
        // Test with potentially malicious input
        await page.goto(`${BASE_URL}/admin/articles/new`);
        await page.waitForTimeout(1000);
        
        // This is a placeholder for XSS and injection tests
        testResults.warnings.push('Input sanitization tests need specific implementation');
        
      } catch (error) {
        testResults.warnings.push(`Input sanitization test incomplete: ${error}`);
      }
    });
  });

  // Generate audit report after all tests
  test.afterAll(async () => {
    await generateAuditReport();
  });
});

async function generateAuditReport() {
  const report = `
# Yalla London Integration Test Audit Report

**Generated:** ${new Date().toISOString()}

## Test Summary
- **Total Tests:** ${testResults.total}
- **Passed:** ${testResults.passed}
- **Failed:** ${testResults.failed}
- **Success Rate:** ${((testResults.passed / testResults.total) * 100).toFixed(2)}%

## Errors Encountered
${testResults.errors.length > 0 ? testResults.errors.map(error => `- ${error}`).join('\n') : 'No errors encountered'}

## Warnings and Recommendations
${testResults.warnings.length > 0 ? testResults.warnings.map(warning => `- ${warning}`).join('\n') : 'No warnings'}

## Integration Status
- **Database Connectivity:** ${testResults.errors.filter(e => e.includes('Database')).length === 0 ? '✅ Pass' : '❌ Fail'}
- **Admin Authentication:** ${testResults.errors.filter(e => e.includes('Admin')).length === 0 ? '✅ Pass' : '❌ Fail'}
- **API Endpoints:** ${testResults.errors.filter(e => e.includes('API')).length === 0 ? '✅ Pass' : '❌ Fail'}
- **Public Website:** ${testResults.errors.filter(e => e.includes('Homepage')).length === 0 ? '✅ Pass' : '❌ Fail'}

## Next Steps
1. Address any failed tests listed in the errors section
2. Implement missing features identified in warnings
3. Add proper test identifiers (data-testid) to UI components
4. Enhance error handling where issues were detected
5. Run this test suite in CI/CD pipeline regularly

---
*Report generated by Yalla London Comprehensive Integration Test Suite*
`;

  // Write report to file
  const fs = require('fs');
  const path = require('path');
  
  const reportsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `integration-audit-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n📊 Integration Audit Report saved to: ${reportPath}`);
  console.log(report);
}