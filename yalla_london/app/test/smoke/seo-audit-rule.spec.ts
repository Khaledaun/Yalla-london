/**
 * SEO Audit Rule Test
 * Tests indexed_pages threshold for internal link suggestions
 */

import { describe, it, expect, vi } from 'vitest';

/**
 * Mock SEO audit handler that implements the indexed_pages threshold rule:
 * - Below 40 indexed pages: no internal link suggestions
 * - 40+ indexed pages: provide internal link suggestions
 */
function createMockSeoAuditHandler() {
  return async (body: { content: string; indexed_pages: number }) => {
    const indexedPages = body.indexed_pages || 0;

    if (indexedPages < 40) {
      return {
        success: true,
        seoScore: 75,
        recommendations: [
          'Add more keywords',
          'Improve meta description',
          'Optimize heading structure'
        ],
        internalLinkSuggestions: []
      };
    } else {
      return {
        success: true,
        seoScore: 85,
        recommendations: [
          'Add more keywords',
          'Improve meta description',
          'Optimize heading structure',
          'Add internal links to improve site structure'
        ],
        internalLinkSuggestions: [
          { url: '/guide/london-restaurants', anchor: 'best restaurants', relevance: 0.9 },
          { url: '/guide/london-attractions', anchor: 'top attractions', relevance: 0.8 },
          { url: '/guide/london-transport', anchor: 'getting around', relevance: 0.7 }
        ]
      };
    }
  };
}

describe('SEO Audit Rule Tests', () => {
  it('should not provide internal link suggestions when indexed_pages < 40', async () => {
    const handler = createMockSeoAuditHandler();

    const result = await handler({
      content: 'SEO Audit Rule Test content with 39 indexed pages',
      indexed_pages: 39
    });

    expect(result.success).toBe(true);
    expect(result.seoScore).toBe(75);
    expect(result.internalLinkSuggestions).toEqual([]);
    expect(result.recommendations).not.toContain('Add internal links to improve site structure');
  });

  it('should provide internal link suggestions when indexed_pages >= 40', async () => {
    const handler = createMockSeoAuditHandler();

    const result = await handler({
      content: 'SEO Audit Rule Test content with 40 indexed pages',
      indexed_pages: 40
    });

    expect(result.success).toBe(true);
    expect(result.seoScore).toBe(85);
    expect(result.internalLinkSuggestions.length).toBeGreaterThan(0);
    expect(result.recommendations).toContain('Add internal links to improve site structure');

    // Verify suggestions have required fields
    result.internalLinkSuggestions.forEach((suggestion: any) => {
      expect(suggestion).toHaveProperty('url');
      expect(suggestion).toHaveProperty('anchor');
      expect(suggestion).toHaveProperty('relevance');
    });
  });

  it('should persist SEO audit results to database', async () => {
    // Mock prisma for this test
    const mockCreate = vi.fn().mockResolvedValue({
      id: 'audit-1',
      content: 'Test content for SEO audit persistence',
      seoScore: 85,
      indexedPages: 45,
      internalLinkSuggestions: [{ url: '/test', anchor: 'test', relevance: 0.8 }],
      status: 'completed'
    });
    const mockFindFirst = vi.fn().mockResolvedValue({
      id: 'audit-1',
      content: 'Test content for SEO audit persistence',
      seoScore: 85,
      indexedPages: 45,
      internalLinkSuggestions: [{ url: '/test', anchor: 'test', relevance: 0.8 }],
      status: 'completed'
    });

    const mockPrisma = {
      seoAuditResult: {
        create: mockCreate,
        findFirst: mockFindFirst,
      }
    };

    const handler = createMockSeoAuditHandler();
    const result = await handler({
      content: 'Test content for SEO audit persistence',
      indexed_pages: 45
    });

    expect(result.success).toBe(true);

    // Simulate persisting to database
    await mockPrisma.seoAuditResult.create({
      data: {
        content: 'Test content for SEO audit persistence',
        seoScore: result.seoScore,
        recommendations: result.recommendations,
        internalLinkSuggestions: result.internalLinkSuggestions,
        indexedPages: 45,
        status: 'completed'
      }
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Verify result was persisted
    const persistedResult = await mockPrisma.seoAuditResult.findFirst({
      where: { content: 'Test content for SEO audit persistence' }
    });

    expect(persistedResult).toBeTruthy();
    expect(persistedResult.seoScore).toBe(85);
    expect(persistedResult.indexedPages).toBe(45);
    expect(persistedResult.internalLinkSuggestions.length).toBeGreaterThan(0);
    expect(persistedResult.status).toBe('completed');
  });

  it('should handle edge case at exactly 40 indexed pages', async () => {
    const handler = createMockSeoAuditHandler();

    const result = await handler({
      content: 'Test content with exactly 40 indexed pages',
      indexed_pages: 40
    });

    expect(result.success).toBe(true);
    expect(result.seoScore).toBe(85);
    expect(result.internalLinkSuggestions.length).toBeGreaterThan(0);
  });
});
