/**
 * Concurrency Test - 10 Parallel Article Creates
 * Tests unique slug generation and database consistency under load
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { getPrismaClient } from '@/lib/database';

describe('Concurrency Tests', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    // Clean up any existing test articles
    await prisma.blogPost.deleteMany({
      where: {
        title: {
          contains: 'Concurrency Test Article'
        }
      }
    });
  });

  afterEach(async () => {
    // Clean up test articles
    await prisma.blogPost.deleteMany({
      where: {
        title: {
          contains: 'Concurrency Test Article'
        }
      }
    });
  });

  it('should handle 10 parallel article creates with identical titles', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const baseTitle = 'Concurrency Test Article';
    const baseContent = 'This is test content for concurrency testing';
    
    // Create 10 parallel requests with identical titles
    const promises = Array.from({ length: 10 }, (_, index) => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/admin/editor/save',
        body: {
          title: baseTitle, // Identical titles
          content: `${baseContent} - Request ${index + 1}`,
          locale: 'en',
          pageType: 'guide',
          primaryKeyword: 'concurrency test',
          excerpt: `Test excerpt ${index + 1}`
        }
      });

      return savePOST(req as any);
    });

    // Execute all requests in parallel
    const responses = await Promise.all(promises);
    
    // Verify all requests succeeded (no 500s)
    responses.forEach((response, index) => {
      expect(response.status).not.toBe(500);
      if (response.status !== 200) {
        console.error(`Request ${index + 1} failed with status ${response.status}`);
      }
    });

    // Count successful responses
    const successfulResponses = responses.filter(response => response.status === 200);
    expect(successfulResponses.length).toBe(10);

    // Extract slugs from successful responses
    const slugs = [];
    for (const response of successfulResponses) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('slug');
      slugs.push(data.data.slug);
    }

    // Verify all slugs are unique
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(10);
    expect(slugs.length).toBe(10);

    // Verify final count in database
    const dbCount = await prisma.blogPost.count({
      where: {
        title: baseTitle
      }
    });
    expect(dbCount).toBe(10);

    // Verify all slugs in database are unique
    const dbArticles = await prisma.blogPost.findMany({
      where: {
        title: baseTitle
      },
      select: {
        slug: true
      }
    });

    const dbSlugs = dbArticles.map(article => article.slug);
    const uniqueDbSlugs = new Set(dbSlugs);
    expect(uniqueDbSlugs.size).toBe(10);

    // Verify slug format (should be title-based with unique suffix)
    dbSlugs.forEach(slug => {
      expect(slug).toMatch(/^concurrency-test-article/);
    });

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should handle concurrent requests with different titles', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    // Create 5 parallel requests with different titles
    const promises = Array.from({ length: 5 }, (_, index) => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/admin/editor/save',
        body: {
          title: `Concurrency Test Article ${index + 1}`,
          content: `This is test content for concurrency testing ${index + 1}`,
          locale: 'en',
          pageType: 'guide',
          primaryKeyword: 'concurrency test',
          excerpt: `Test excerpt ${index + 1}`
        }
      });

      return savePOST(req as any);
    });

    // Execute all requests in parallel
    const responses = await Promise.all(promises);
    
    // Verify all requests succeeded
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
    });

    // Verify all responses are successful
    const successfulResponses = responses.filter(response => response.status === 200);
    expect(successfulResponses.length).toBe(5);

    // Verify final count in database
    const dbCount = await prisma.blogPost.count({
      where: {
        title: {
          contains: 'Concurrency Test Article'
        }
      }
    });
    expect(dbCount).toBe(5);

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });
});
