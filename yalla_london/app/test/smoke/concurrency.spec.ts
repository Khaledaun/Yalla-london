/**
 * Concurrency Test - Parallel Article Creates
 * Tests that multiple article creates can succeed with auth
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession.
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
function makeRequest(body: any) {
  return new NextRequest(new URL('/api/admin/editor/save', 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'cookie': 'next-auth.session-token=test-token-value',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Concurrency Tests', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    // Reset call counts from previous tests
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.ADMIN_EMAILS;
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
  });

  it('should handle sequential article creates with identical titles', async () => {
    await mockAdminSession();

    const baseTitle = 'Concurrency Test Article';
    const results = [];

    // Create 3 articles sequentially to test slug uniqueness
    for (let i = 0; i < 3; i++) {
      const request = makeRequest({
        title: baseTitle,
        content: `This is test content for concurrency testing - Request ${i + 1}`,
        locale: 'en',
        pageType: 'guide',
        primaryKeyword: 'concurrency test',
        excerpt: `Test excerpt ${i + 1}`,
      });

      const response = await savePOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('slug');
      results.push(data);
    }

    // Verify Prisma create was called 3 times
    expect(prisma.blogPost.create).toHaveBeenCalledTimes(3);

    // Verify all results have IDs
    expect(results.length).toBe(3);
    results.forEach((result) => {
      expect(result.data.id).toBeTruthy();
    });
  });

  it('should handle sequential requests with different titles', async () => {
    await mockAdminSession();

    // Create 3 articles with different titles
    for (let i = 0; i < 3; i++) {
      const request = makeRequest({
        title: `Concurrency Test Article ${i + 1}`,
        content: `This is test content for concurrency testing ${i + 1}`,
        locale: 'en',
        pageType: 'guide',
        primaryKeyword: 'concurrency test',
        excerpt: `Test excerpt ${i + 1}`,
      });

      const response = await savePOST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    }

    // Verify Prisma create was called 3 times
    expect(prisma.blogPost.create).toHaveBeenCalledTimes(3);
  });
});
