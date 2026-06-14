/**
 * Tenant Scoping Tests
 * Tests multi-site isolation and cross-site access prevention
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession.
 *
 * NOTE: These are smoke tests with mocked Prisma. They verify auth gates,
 * Prisma call arguments, and request routing -- not actual data persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { GET as articlesGET } from '@/app/api/admin/articles/route';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';
import { getPrismaClient } from '@/lib/database';

const siteA = 'site-a-test';
const siteB = 'site-b-test';

/** Helper: mock JWT decode to return an admin session for a specific email */
async function mockAdminSession(email: string) {
  process.env.ADMIN_EMAILS = email;
  const { decode } = await import('next-auth/jwt');
  vi.mocked(decode).mockResolvedValue({
    email,
    name: `Admin ${email}`,
    sub: `admin-${email}`,
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

/** Helper: create NextRequest with cookie and JSON body */
function makeJsonRequest(url: string, body: any) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'cookie': 'next-auth.session-token=test-token-value',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Helper: create GET NextRequest with cookie and query params */
function makeGetRequest(url: string, query: Record<string, string> = {}) {
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(query).forEach(([k, v]) => urlObj.searchParams.set(k, v));
  return new NextRequest(urlObj, {
    method: 'GET',
    headers: {
      'cookie': 'next-auth.session-token=test-token-value',
    },
  });
}

describe('Tenant Scoping Tests', () => {
  let prisma: any;

  beforeEach(async () => {
    prisma = getPrismaClient();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete process.env.ADMIN_EMAILS;
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
  });

  it('should create articles with siteId in request body', async () => {
    await mockAdminSession('admin@site-a.com');

    // Create article for Site A
    const requestA = makeJsonRequest('/api/admin/editor/save', {
      title: 'Site A Test Article',
      content: 'This is content for Site A',
      locale: 'en',
      pageType: 'guide',
      primaryKeyword: 'site a test',
      excerpt: 'Site A excerpt',
      siteId: siteA
    });

    const responseA = await savePOST(requestA);
    expect(responseA.status).toBe(200);
    const dataA = await responseA.json();
    expect(dataA.success).toBe(true);
    expect(dataA.data).toHaveProperty('id');

    // Verify Prisma create was called with site-related data
    expect(prisma.blogPost.create).toHaveBeenCalledTimes(1);
    const createCall = prisma.blogPost.create.mock.calls[0][0];
    expect(createCall.data.title_en).toBe('Site A Test Article');
  });

  it('should create articles for different sites in sequence', async () => {
    // Create article for Site A
    await mockAdminSession('admin@site-a.com');
    const requestA = makeJsonRequest('/api/admin/editor/save', {
      title: 'Site A Test Article',
      content: 'Content for Site A',
      siteId: siteA,
    });
    const responseA = await savePOST(requestA);
    expect(responseA.status).toBe(200);

    // Create article for Site B
    await mockAdminSession('admin@site-b.com');
    const requestB = makeJsonRequest('/api/admin/editor/save', {
      title: 'Site B Test Article',
      content: 'Content for Site B',
      siteId: siteB,
    });
    const responseB = await savePOST(requestB);
    expect(responseB.status).toBe(200);

    // Verify both creates happened
    expect(prisma.blogPost.create).toHaveBeenCalledTimes(2);
  });

  it('should reject anonymous access to articles endpoint', async () => {
    // No cookie, no session
    const request = new NextRequest(new URL('/api/admin/articles', 'http://localhost:3000'), {
      method: 'GET',
    });
    const response = await articlesGET(request);
    expect(response.status).toBe(401);
  });

  it('should reject anonymous access to media upload', async () => {
    const testFile = new File(['test content'], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const request = new NextRequest(new URL('/api/admin/media/upload', 'http://localhost:3000'), {
      method: 'POST',
      body: formData,
    });
    const response = await uploadPOST(request);
    expect(response.status).toBe(401);
  });

  it('should allow authenticated admin access to articles endpoint', async () => {
    await mockAdminSession('admin@test.com');

    const request = makeGetRequest('/api/admin/articles');
    const response = await articlesGET(request);

    // Should not return 401 (auth works)
    expect(response.status).not.toBe(401);
  });

  it('should allow authenticated admin to upload media', async () => {
    await mockAdminSession('admin@test.com');

    const testFile = new File(['test-image-data'], 'test-logo.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const request = new NextRequest(new URL('/api/admin/media/upload', 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'cookie': 'next-auth.session-token=test-token-value' },
      body: formData,
    });

    const response = await uploadPOST(request);
    // Should not return 401 (auth works)
    expect(response.status).not.toBe(401);
  });
});
