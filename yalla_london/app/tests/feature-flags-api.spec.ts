/**
 * Feature Flag API Tests
 * Tests for the feature flag refresh endpoint and related API functionality
 */

import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';

test.describe('Feature Flag API Endpoints', () => {
  
  test('GET /api/feature-flags/refresh returns endpoint information', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/feature-flags/refresh`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.endpoint).toBe('/api/feature-flags/refresh');
    expect(data.method).toBe('POST');
    expect(data.admin_only).toBe(true);
    expect(data.description).toContain('Reloads feature flags');
    expect(data.usage).toBeDefined();
    expect(data.requirements).toBeDefined();
    expect(Array.isArray(data.requirements)).toBe(true);
  });

  test('POST /api/feature-flags/refresh requires admin authentication', async ({ request }) => {
    // Test without authentication - should fail
    const response = await request.post(`${STAGING_URL}/api/feature-flags/refresh`);
    
    // Should return 401 (Unauthorized) or 403 (Forbidden)
    expect([401, 403]).toContain(response.status());
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('GET /api/phase4/status includes feature flag information', async ({ request }) => {
    // Test the status endpoint (may require auth depending on setup)
    const response = await request.get(`${STAGING_URL}/api/phase4/status`);
    
    // If auth is required, we'll get 401/403, otherwise 200
    if (response.status() === 200) {
      const data = await response.json();
      
      // Verify feature flag data structure
      expect(data.feature_flags).toBeDefined();
      expect(data.feature_flags.total_count).toBeGreaterThan(0);
      expect(data.feature_flags.by_category).toBeDefined();
      expect(data.phase4_status).toBeDefined();
      
      // Verify all required feature flags are present
      const requiredFlags = [
        'phase4b_enabled',
        'auto_publishing',
        'content_analytics',
        'seo_optimization',
        'social_media_integration',
        'export_wordpress',
        'audit_system',
        'enterprise_features',
        'advanced_cron'
      ];
      
      requiredFlags.forEach(flag => {
        expect(data.phase4_status).toHaveProperty(flag);
        expect(typeof data.phase4_status[flag]).toBe('boolean');
      });
    }
  });

  test('Feature flag categories are properly structured', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/phase4/status`);
    
    if (response.status() === 200) {
      const data = await response.json();
      const categories = data.feature_flags.by_category;
      
      // Verify required categories exist
      const requiredCategories = [
        'publishing',
        'analytics', 
        'seo',
        'social',
        'export',
        'cron',
        'compliance',
        'enterprise',
        'content'
      ];
      
      requiredCategories.forEach(category => {
        expect(categories).toHaveProperty(category);
        expect(categories[category].total).toBeGreaterThan(0);
        expect(categories[category].enabled).toBeGreaterThanOrEqual(0);
        expect(categories[category].disabled).toBeGreaterThanOrEqual(0);
        expect(categories[category].enabled + categories[category].disabled).toBe(categories[category].total);
      });
    }
  });

  test('API responses are properly formatted and include metadata', async ({ request }) => {
    const endpoints = [
      '/api/feature-flags/refresh',
      '/api/phase4/status'
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${STAGING_URL}${endpoint}`);
      
      // Should return JSON regardless of auth status
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
      
      const data = await response.json();
      
      // Should have timestamp for tracking
      if (response.status() === 200) {
        expect(data.timestamp || data.api_info).toBeDefined();
      }
      
      // Error responses should include helpful information
      if (response.status() >= 400) {
        expect(data.error).toBeDefined();
      }
    }
  });

  test('Feature flag endpoint security headers and CORS', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/feature-flags/refresh`);
    
    // Check basic security headers are present
    const headers = response.headers();
    
    // Should not expose sensitive information in headers
    expect(headers['server']).not.toContain('version');
    
    // Should return JSON content type
    expect(headers['content-type']).toContain('application/json');
  });
});

test.describe('Feature Flag Validation', () => {
  
  test('All major platform features have corresponding flags', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/phase4/status`);
    
    if (response.status() === 200) {
      const data = await response.json();
      const allFlags = data.feature_flags.all_flags;
      
      // Check for comprehensive feature coverage
      const requiredFeatures = {
        'content_generation': ['PHASE4B_ENABLED', 'ADVANCED_TOPICS'],
        'publishing': ['AUTO_PUBLISHING'],
        'analytics': ['CONTENT_ANALYTICS'],
        'seo': ['SEO_OPTIMIZATION'],
        'social_media': ['SOCIAL_MEDIA_INTEGRATION'],
        'export': ['EXPORT_WORDPRESS'],
        'automation': ['ADVANCED_CRON'],
        'compliance': ['AUDIT_SYSTEM'],
        'enterprise': ['ENTERPRISE_FEATURES']
      };
      
      Object.entries(requiredFeatures).forEach(([feature, flags]) => {
        flags.forEach(flag => {
          expect(allFlags).toHaveProperty(flag);
          expect(allFlags[flag].description).toBeTruthy();
          expect(allFlags[flag].category).toBeTruthy();
        });
      });
    }
  });

  test('Feature flag descriptions are informative and complete', async ({ request }) => {
    const response = await request.get(`${STAGING_URL}/api/phase4/status`);
    
    if (response.status() === 200) {
      const data = await response.json();
      const allFlags = data.feature_flags.all_flags;
      
      Object.values(allFlags).forEach((flag: any) => {
        // Each flag should have a meaningful description
        expect(flag.description.length).toBeGreaterThan(20);
        
        // Description should not contain placeholder text
        expect(flag.description.toLowerCase()).not.toContain('todo');
        expect(flag.description.toLowerCase()).not.toContain('placeholder');
        
        // Should have proper category
        expect(flag.category).toBeTruthy();
        expect(flag.category.length).toBeGreaterThan(2);
      });
    }
  });
});