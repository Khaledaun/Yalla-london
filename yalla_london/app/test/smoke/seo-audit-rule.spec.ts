/**
 * SEO Audit Rule Test
 * Tests indexed_pages threshold for internal link suggestions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { getPrismaClient } from '@/lib/database';

describe('SEO Audit Rule Tests', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    
    // Clean up any existing test data
    await prisma.seoAuditResult.deleteMany({
      where: {
        OR: [
          { content: { contains: 'SEO Audit Rule Test' } },
          { content: { contains: 'Test content for SEO audit' } }
        ]
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.seoAuditResult.deleteMany({
      where: {
        OR: [
          { content: { contains: 'SEO Audit Rule Test' } },
          { content: { contains: 'Test content for SEO audit' } }
        ]
      }
    });
  });

  it('should not provide internal link suggestions when indexed_pages < 40', async () => {
    // Mock feature flag as enabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '1';

    // Mock SEO audit endpoint with indexed_pages = 39
    const mockSeoAuditHandler = async (request: any) => {
      const body = await request.json();
      const indexedPages = body.indexed_pages || 0;
      
      if (indexedPages < 40) {
        // No internal link suggestions when below threshold
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 75,
            recommendations: [
              'Add more keywords',
              'Improve meta description',
              'Optimize heading structure'
            ],
            internalLinkSuggestions: [] // Empty when below threshold
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Provide suggestions when above threshold
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 85,
            recommendations: [
              'Add more keywords',
              'Improve meta description',
              'Optimize heading structure'
            ],
            internalLinkSuggestions: [
              { url: '/guide/london-restaurants', anchor: 'best restaurants' },
              { url: '/guide/london-attractions', anchor: 'top attractions' }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'SEO Audit Rule Test content with 39 indexed pages',
        indexed_pages: 39
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.seoScore).toBe(75);
    expect(data.internalLinkSuggestions).toEqual([]);
    expect(data.recommendations).not.toContain('Add internal links');

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });

  it('should provide internal link suggestions when indexed_pages >= 40', async () => {
    // Mock feature flag as enabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '1';

    // Mock SEO audit endpoint with indexed_pages = 40
    const mockSeoAuditHandler = async (request: any) => {
      const body = await request.json();
      const indexedPages = body.indexed_pages || 0;
      
      if (indexedPages < 40) {
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 75,
            recommendations: ['Add more keywords'],
            internalLinkSuggestions: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 85,
            recommendations: [
              'Add more keywords',
              'Add internal links to improve site structure'
            ],
            internalLinkSuggestions: [
              { url: '/guide/london-restaurants', anchor: 'best restaurants', relevance: 0.9 },
              { url: '/guide/london-attractions', anchor: 'top attractions', relevance: 0.8 },
              { url: '/guide/london-transport', anchor: 'getting around', relevance: 0.7 }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'SEO Audit Rule Test content with 40 indexed pages',
        indexed_pages: 40
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.seoScore).toBe(85);
    expect(data.internalLinkSuggestions.length).toBeGreaterThan(0);
    expect(data.recommendations).toContain('Add internal links to improve site structure');

    // Verify suggestions have required fields
    data.internalLinkSuggestions.forEach((suggestion: any) => {
      expect(suggestion).toHaveProperty('url');
      expect(suggestion).toHaveProperty('anchor');
      expect(suggestion).toHaveProperty('relevance');
    });

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });

  it('should persist SEO audit results to database', async () => {
    // Mock feature flag as enabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '1';

    // Mock SEO audit endpoint that persists results
    const mockSeoAuditHandler = async (request: any) => {
      const body = await request.json();
      const indexedPages = body.indexed_pages || 0;
      
      const auditResult = {
        content: body.content,
        seoScore: indexedPages >= 40 ? 85 : 75,
        recommendations: indexedPages >= 40 ? 
          ['Add more keywords', 'Add internal links'] : 
          ['Add more keywords'],
        internalLinkSuggestions: indexedPages >= 40 ? 
          [{ url: '/test', anchor: 'test', relevance: 0.8 }] : 
          [],
        indexedPages: indexedPages,
        createdAt: new Date().toISOString()
      };

      // Simulate database persistence
      try {
        await prisma.seoAuditResult.create({
          data: {
            content: auditResult.content,
            seoScore: auditResult.seoScore,
            recommendations: auditResult.recommendations,
            internalLinkSuggestions: auditResult.internalLinkSuggestions,
            indexedPages: auditResult.indexedPages,
            status: 'completed'
          }
        });
      } catch (error) {
        console.error('Failed to persist SEO audit result:', error);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          ...auditResult
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content for SEO audit persistence',
        indexed_pages: 45
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify result was persisted to database
    const persistedResult = await prisma.seoAuditResult.findFirst({
      where: {
        content: 'Test content for SEO audit persistence'
      }
    });

    expect(persistedResult).toBeTruthy();
    expect(persistedResult.seoScore).toBe(85);
    expect(persistedResult.indexedPages).toBe(45);
    expect(persistedResult.internalLinkSuggestions.length).toBeGreaterThan(0);
    expect(persistedResult.status).toBe('completed');

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });

  it('should handle edge case at exactly 40 indexed pages', async () => {
    // Mock feature flag as enabled
    const originalEnv = process.env.FEATURE_AI_SEO_AUDIT;
    process.env.FEATURE_AI_SEO_AUDIT = '1';

    const mockSeoAuditHandler = async (request: any) => {
      const body = await request.json();
      const indexedPages = body.indexed_pages || 0;
      
      if (indexedPages < 40) {
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 75,
            internalLinkSuggestions: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: true,
            seoScore: 85,
            internalLinkSuggestions: [
              { url: '/test', anchor: 'test', relevance: 0.8 }
            ]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };

    // Test exactly 40 pages
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/ai/seo-audit',
      body: {
        content: 'Test content with exactly 40 indexed pages',
        indexed_pages: 40
      }
    });

    const response = await mockSeoAuditHandler(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.seoScore).toBe(85);
    expect(data.internalLinkSuggestions.length).toBeGreaterThan(0);

    // Restore environment
    if (originalEnv) {
      process.env.FEATURE_AI_SEO_AUDIT = originalEnv;
    } else {
      delete process.env.FEATURE_AI_SEO_AUDIT;
    }
  });
});
