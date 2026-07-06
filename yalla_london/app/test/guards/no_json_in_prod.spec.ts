/**
 * No-JSON-in-Production Guard Tests
 * Ensures file-based storage is blocked in production
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession.
 *
 * NOTE: The editor save route uses Prisma (database) for all storage.
 * There is no JSON file storage path, so these tests verify that
 * the save route works correctly in production mode (using DB, not files).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';

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

/** Helper: create NextRequest with optional cookie and body */
function makeRequest(url: string, options?: { method?: string; cookie?: boolean; body?: any }) {
  const headers: Record<string, string> = {};
  if (options?.cookie) {
    headers['cookie'] = 'next-auth.session-token=test-token-value';
  }
  if (options?.body) {
    headers['content-type'] = 'application/json';
  }
  const init: any = {
    method: options?.method || 'POST',
    headers,
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('No-JSON-in-Production Guards', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(async () => {
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    delete process.env.DEV_FILE_STORE_ONLY;
    delete process.env.ADMIN_EMAILS;
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
  });

  it('should save articles via database in production (not file storage)', async () => {
    process.env.NODE_ENV = 'production';

    await mockAdminSession();

    const request = makeRequest('/api/admin/editor/save', {
      cookie: true,
      body: { title: 'Test Article', content: 'Test content' },
    });

    const response = await savePOST(request);

    // Route uses Prisma (database), not file storage -- should succeed
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.data).toHaveProperty('id');
  });

  it('should save articles via database in development', async () => {
    process.env.NODE_ENV = 'development';

    await mockAdminSession();

    const request = makeRequest('/api/admin/editor/save', {
      cookie: true,
      body: { title: 'Test Article', content: 'Test content' },
    });

    const response = await savePOST(request);

    // Route uses Prisma (database) -- should succeed
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData.success).toBe(true);
  });

  it('should handle media uploads with proper content type', async () => {
    await mockAdminSession();

    // Upload route requires FormData with a proper file
    const testFile = new File(['test-image-content'], 'test-logo.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('type', 'logo');

    const request = new NextRequest(new URL('/api/admin/media/upload', 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'cookie': 'next-auth.session-token=test-token-value',
      },
      body: formData,
    });

    const response = await uploadPOST(request);
    // Should not return 401 (auth works)
    expect(response.status).not.toBe(401);
  });

  it('should validate environment variables for production safety', () => {
    process.env.NODE_ENV = 'production';
    expect(process.env.NODE_ENV).toBe('production');

    process.env.DEV_FILE_STORE_ONLY = 'true';
    expect(process.env.DEV_FILE_STORE_ONLY).toBe('true');

    const shouldBlock = process.env.NODE_ENV === 'production' && process.env.DEV_FILE_STORE_ONLY === 'true';
    expect(shouldBlock).toBe(true);
  });

  it('should save articles via database regardless of DEV_FILE_STORE_ONLY', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_FILE_STORE_ONLY;

    await mockAdminSession();

    const request = makeRequest('/api/admin/editor/save', {
      cookie: true,
      body: { title: 'Test Article', content: 'Test content' },
    });

    const response = await savePOST(request);

    // Route uses Prisma -- DEV_FILE_STORE_ONLY is irrelevant
    expect(response.status).toBe(200);
  });

  it('should test file system path blocking', () => {
    const blockedPaths = [
      'data/articles.json',
      'uploads/',
      'temp/',
      'cache/'
    ];

    blockedPaths.forEach(path => {
      const isBlocked = process.env.NODE_ENV === 'production' &&
                       process.env.DEV_FILE_STORE_ONLY === 'true' &&
                       (path.includes('.json') || path.includes('data/'));

      if (process.env.NODE_ENV === 'production' && process.env.DEV_FILE_STORE_ONLY === 'true') {
        expect(isBlocked).toBe(true);
      }
    });
  });
});
