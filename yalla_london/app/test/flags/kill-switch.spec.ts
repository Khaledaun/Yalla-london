/**
 * Feature Flag Kill-Switch Tests
 * Tests that features can be disabled at runtime
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { isFeatureEnabled, getFeatureFlags } from '@/lib/feature-flags';

describe('Feature Flag Kill-Switch Tests', () => {
  let originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Store original environment variables
    originalEnv = {
      FEATURE_AI_SEO_AUDIT: process.env.FEATURE_AI_SEO_AUDIT,
      FEATURE_CONTENT_PIPELINE: process.env.FEATURE_CONTENT_PIPELINE,
      FEATURE_WP_CONNECTOR: process.env.FEATURE_WP_CONNECTOR,
      FEATURE_WHITE_LABEL: process.env.FEATURE_WHITE_LABEL,
      FEATURE_BACKLINK_OFFERS: process.env.FEATURE_BACKLINK_OFFERS
    };
  });

  afterEach(() => {
    // Restore original environment variables
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('should disable AI SEO audit feature when flag is OFF', async () => {
    // Set feature flag to OFF
    process.env.FEATURE_AI_SEO_AUDIT = '0';
    
    // Verify flag is disabled
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(false);
    
    // Mock SEO audit endpoint
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

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content for SEO audit'
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Feature disabled');
  });

  it('should enable AI SEO audit feature when flag is ON', async () => {
    // Set feature flag to ON
    process.env.FEATURE_AI_SEO_AUDIT = '1';
    
    // Verify flag is enabled
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(true);
    
    // Mock SEO audit endpoint
    const mockSeoAuditHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
        return new Response(
          JSON.stringify({ error: 'Feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ 
          success: true,
          seoScore: 85,
          recommendations: ['Add more keywords']
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content for SEO audit'
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.seoScore).toBe(85);
  });

  it('should disable content pipeline feature when flag is OFF', async () => {
    // Set feature flag to OFF
    process.env.FEATURE_CONTENT_PIPELINE = '0';
    
    // Verify flag is disabled
    expect(isFeatureEnabled('FEATURE_CONTENT_PIPELINE')).toBe(false);
    
    // Mock content pipeline endpoint
    const mockContentPipelineHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
        return new Response(
          JSON.stringify({ error: 'Content pipeline feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/content/pipeline',
      body: {
        action: 'process'
      }
    });

    const response = await mockContentPipelineHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Content pipeline feature disabled');
  });

  it('should disable WP connector feature when flag is OFF', async () => {
    // Set feature flag to OFF
    process.env.FEATURE_WP_CONNECTOR = '0';
    
    // Verify flag is disabled
    expect(isFeatureEnabled('FEATURE_WP_CONNECTOR')).toBe(false);
    
    // Mock WP connector endpoint
    const mockWPConnectorHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_WP_CONNECTOR')) {
        return new Response(
          JSON.stringify({ error: 'WordPress connector feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/wp/connect',
      body: {
        url: 'https://example.com'
      }
    });

    const response = await mockWPConnectorHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('WordPress connector feature disabled');
  });

  it('should disable white label feature when flag is OFF', async () => {
    // Set feature flag to OFF
    process.env.FEATURE_WHITE_LABEL = '0';
    
    // Verify flag is disabled
    expect(isFeatureEnabled('FEATURE_WHITE_LABEL')).toBe(false);
    
    // Mock white label endpoint
    const mockWhiteLabelHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_WHITE_LABEL')) {
        return new Response(
          JSON.stringify({ error: 'White label feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/white-label/configure',
      body: {
        brand: 'Test Brand'
      }
    });

    const response = await mockWhiteLabelHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('White label feature disabled');
  });

  it('should disable backlink offers feature when flag is OFF', async () => {
    // Set feature flag to OFF
    process.env.FEATURE_BACKLINK_OFFERS = '0';
    
    // Verify flag is disabled
    expect(isFeatureEnabled('FEATURE_BACKLINK_OFFERS')).toBe(false);
    
    // Mock backlink offers endpoint
    const mockBacklinkOffersHandler = async (request: any) => {
      if (!isFeatureEnabled('FEATURE_BACKLINK_OFFERS')) {
        return new Response(
          JSON.stringify({ error: 'Backlink offers feature disabled' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/backlink/offers',
      body: {
        domain: 'example.com'
      }
    });

    const response = await mockBacklinkOffersHandler(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Backlink offers feature disabled');
  });

  it('should handle runtime flag changes', async () => {
    // Start with feature disabled
    process.env.FEATURE_AI_SEO_AUDIT = '0';
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(false);
    
    // Mock handler
    const mockHandler = async (request: any) => {
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

    // Test with feature disabled
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: { content: 'Test' }
    });

    let response = await mockHandler(req);
    expect(response.status).toBe(404);
    
    // Enable feature at runtime
    process.env.FEATURE_AI_SEO_AUDIT = '1';
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(true);
    
    // Test with feature enabled
    response = await mockHandler(req);
    expect(response.status).toBe(200);
    
    // Disable feature again
    process.env.FEATURE_AI_SEO_AUDIT = '0';
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(false);
    
    // Test with feature disabled again
    response = await mockHandler(req);
    expect(response.status).toBe(404);
  });

  it('should return all flags as OFF by default', () => {
    // Clear all feature flag environment variables
    delete process.env.FEATURE_AI_SEO_AUDIT;
    delete process.env.FEATURE_CONTENT_PIPELINE;
    delete process.env.FEATURE_WP_CONNECTOR;
    delete process.env.FEATURE_WHITE_LABEL;
    delete process.env.FEATURE_BACKLINK_OFFERS;
    
    const flags = getFeatureFlags();
    
    expect(flags.FEATURE_AI_SEO_AUDIT).toBe(0);
    expect(flags.FEATURE_CONTENT_PIPELINE).toBe(0);
    expect(flags.FEATURE_WP_CONNECTOR).toBe(0);
    expect(flags.FEATURE_WHITE_LABEL).toBe(0);
    expect(flags.FEATURE_BACKLINK_OFFERS).toBe(0);
  });

  it('should handle invalid flag values gracefully', () => {
    // Set invalid values
    process.env.FEATURE_AI_SEO_AUDIT = 'invalid';
    process.env.FEATURE_CONTENT_PIPELINE = '2';
    process.env.FEATURE_WP_CONNECTOR = 'true';
    
    // Should default to 0 (disabled) for invalid values
    expect(isFeatureEnabled('FEATURE_AI_SEO_AUDIT')).toBe(false);
    expect(isFeatureEnabled('FEATURE_CONTENT_PIPELINE')).toBe(false);
    expect(isFeatureEnabled('FEATURE_WP_CONNECTOR')).toBe(false);
  });

  it('should test kill-switch for multiple features simultaneously', async () => {
    // Disable all features
    process.env.FEATURE_AI_SEO_AUDIT = '0';
    process.env.FEATURE_CONTENT_PIPELINE = '0';
    process.env.FEATURE_WP_CONNECTOR = '0';
    process.env.FEATURE_WHITE_LABEL = '0';
    process.env.FEATURE_BACKLINK_OFFERS = '0';
    
    // Mock handlers for all features
    const mockHandlers = {
      seoAudit: async (request: any) => {
        if (!isFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
          return new Response(JSON.stringify({ error: 'Feature disabled' }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      },
      contentPipeline: async (request: any) => {
        if (!isFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
          return new Response(JSON.stringify({ error: 'Feature disabled' }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      },
      wpConnector: async (request: any) => {
        if (!isFeatureEnabled('FEATURE_WP_CONNECTOR')) {
          return new Response(JSON.stringify({ error: 'Feature disabled' }), { status: 404 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
    };
    
    // Test all features are disabled
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/test',
      body: { test: 'data' }
    });
    
    const seoResponse = await mockHandlers.seoAudit(req);
    const pipelineResponse = await mockHandlers.contentPipeline(req);
    const wpResponse = await mockHandlers.wpConnector(req);
    
    expect(seoResponse.status).toBe(404);
    expect(pipelineResponse.status).toBe(404);
    expect(wpResponse.status).toBe(404);
  });
});
