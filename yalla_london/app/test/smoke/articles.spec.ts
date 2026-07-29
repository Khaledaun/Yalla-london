/**
 * Articles CRUD smoke tests
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession.
 * NOTE: The save route uses Prisma (database), not file storage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { getPrismaClient } from '@/lib/database';

/** Helper: mock JWT decode to return an admin session */
async function mockAdminSession(email = 'admin@test.com') {
  process.env.ADMIN_EMAILS = email;
  const { decode } = await import('next-auth/jwt');
  vi.mocked(decode).mockResolvedValue({
    email,
    name: 'Test Admin',
    sub: 'admin-1',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

/** Helper: create NextRequest with cookie and JSON body */
function makeRequest(url: string, body: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'cookie': 'next-auth.session-token=test-token-value',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Articles CRUD', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
  });

  afterEach(async () => {
    delete process.env.ADMIN_EMAILS;
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
  });

  it('should create article via database and return success', async () => {
    await mockAdminSession();

    const articleData = {
      title: 'Test Article Smoke Test',
      content: 'This is test content for smoke testing',
      slug: 'test-article-smoke-test',
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'test keyword',
      excerpt: 'Test excerpt'
    };

    const request = makeRequest('/api/admin/editor/save', articleData);
    const response = await savePOST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('id');

    // Verify Prisma create was called
    expect(prisma.blogPost.create).toHaveBeenCalled();
  });

  it('should require authentication for article creation', async () => {
    // No JWT mock = no session = 401
    const request = makeRequest('/api/admin/editor/save', {
      title: 'Test Article',
      content: 'Test content',
    });

    const response = await savePOST(request);
    expect(response.status).toBe(401);
  });

  it('should save articles via database in production (no file storage)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await mockAdminSession();

    const request = makeRequest('/api/admin/editor/save', {
      title: 'Test Article',
      content: 'Test content',
    });

    const response = await savePOST(request);

    // Route uses Prisma (database), not file storage -- should succeed
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });
});
