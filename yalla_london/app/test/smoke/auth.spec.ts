/**
 * Authentication smoke tests
 *
 * NOTE: Admin routes use withAdminAuth which decodes JWT from cookies
 * via next-auth/jwt, NOT getServerSession. We mock decode accordingly.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as savePOST } from '@/app/api/admin/editor/save/route';
import { POST as uploadPOST } from '@/app/api/admin/media/upload/route';

/** Helper: mock JWT decode to return a session */
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

/** Helper: create NextRequest with optional cookie */
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

describe('Authentication Guards', () => {
  afterEach(async () => {
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
    delete process.env.ADMIN_EMAILS;
  });

  it('anonymous POST to admin save should return 401', async () => {
    const request = makeRequest('/api/admin/editor/save', {
      body: { title: 'Test Article', content: 'Test content' },
    });

    const response = await savePOST(request);
    expect(response.status).toBe(401);
  });

  it('anonymous POST to media upload should return 401', async () => {
    const request = makeRequest('/api/admin/media/upload');
    const response = await uploadPOST(request);
    expect(response.status).toBe(401);
  });

  it('authenticated admin POST to save should work', async () => {
    await mockAdminSession();

    const request = makeRequest('/api/admin/editor/save', {
      cookie: true,
      body: { title: 'Test Article', content: 'Test content' },
    });

    const response = await savePOST(request);

    // Should not be 401 (authentication error)
    expect(response.status).not.toBe(401);
  });
});
