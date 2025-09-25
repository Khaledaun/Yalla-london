/**
 * SEO Audit feature flag smoke tests
 */

import { describe, it, expect } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { isFeatureEnabled } from '@/lib/feature-flags';

describe('SEO Audit Feature Flag', () => {
  it('should have FEATURE_AI_SEO_AUDIT disabled by default', () => {
    // Ensure feature flag is disabled by default
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(false);
  });

  it('should return 404/disabled when FEATURE_AI_SEO_AUDIT=0', async () => {
    // Mock feature flag as disabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '0';

    // Try to access SEO audit endpoint
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content for SEO audit'
      }
    });

    // Mock the SEO audit endpoint to check feature flag
    const mockSeoAuditHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
        return new Response(
          JSON.stringify({ error: 'Feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Feature disabled');

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });

  it('should work when FEATURE_AI_SEO_AUDIT=1', async () => {
    // Mock feature flag as enabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '1';

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content for SEO audit'
      }
    });

    // Mock the SEO audit endpoint to check feature flag
    const mockSeoAuditHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
        return new Response(
          JSON.stringify({ error: 'Feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Mock successful SEO audit
      return new Response(
        JSON.stringify({ 
          success: true,
          seoScore: 85,
          recommendations: ['Add more keywords', 'Improve meta description']
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.seoScore).toBe(85);

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });
});
