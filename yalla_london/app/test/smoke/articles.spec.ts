/**
 * Articles CRUD smoke tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { getPrismaClient } from '@/lib/database';

describe('Articles CRUD', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    // Clean up any existing test articles
    await prisma.blogPost.deleteMany({
      where: {
        title: {
          contains: 'Test Article'
        }
      }
    });
  });

  afterEach(async () => {
    // Clean up test articles
    await prisma.blogPost.deleteMany({
      where: {
        title: {
          contains: 'Test Article'
        }
      }
    });
  });

  it('should create article and persist to database', async () => {
    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const articleData = {
      title: 'Test Article Smoke Test',
      content: 'This is test content for smoke testing',
      slug: 'test-article-smoke-test',
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'test keyword',
      excerpt: 'Test excerpt'
    };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: articleData
    });

    const response = await savePOST(req as any);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('id');

    // Verify article exists in database
    const savedArticle = await prisma.blogPost.findUnique({
      where: {
        id: responseData.data.id
      }
    });

    expect(savedArticle).toBeTruthy();
    expect(savedArticle.title).toBe(articleData.title);
    expect(savedArticle.content).toBe(articleData.content);
    expect(savedArticle.slug).toBe(articleData.slug);

    // Restore original function
    require('next-auth').getServerSession.mockRestore();
  });

  it('should not allow JSON file writes in production', async () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.DEV_FILE_STORE_ONLY = 'true';

    // Mock admin session
    const mockSession = {
      user: {
        email: 'admin@test.com',
        name: 'Test Admin'
      }
    };

    jest.spyOn(require('next-auth'), 'getServerSession').mockResolvedValue(mockSession);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      body: {
        title: 'Test Article',
        content: 'Test content'
      }
    });

    const response = await savePOST(req as any);
    
    // Should fail with error about JSON storage not allowed
    expect(response.status).toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('JSON file storage is not allowed');

    // Restore environment
    process.env.NODE_ENV = originalEnv;
    delete process.env.DEV_FILE_STORE_ONLY;
    require('next-auth').getServerSession.mockRestore();
  });
});
