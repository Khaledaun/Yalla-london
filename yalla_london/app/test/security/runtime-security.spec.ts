/**
 * Runtime Security Tests
 * Tests authentication and authorization at runtime
 *
 * NOTE: The status route uses withAdminAuth which reads JWT from cookies
 * via next-auth/jwt (NOT getServerSession). We must mock next-auth/jwt's
 * decode function and provide cookies on NextRequest objects.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET as statusGET } from '@/app/api/phase4/status/route';
import { GET as healthGET } from '@/app/api/health/route';

// Mock next-auth/jwt for cookie-based admin auth
vi.mock('next-auth/jwt', () => ({
  decode: vi.fn(),
}));

/** Helper: create a NextRequest with optional session cookie */
function makeStatusRequest(options?: { cookie?: boolean; headers?: Record<string, string> }): NextRequest {
  const headers: Record<string, string> = { ...options?.headers };
  if (options?.cookie) {
    headers['cookie'] = 'next-auth.session-token=test-token-value';
  }
  return new NextRequest(new URL('/api/phase4/status', 'http://localhost:3000'), { headers });
}

/** Helper: mock JWT decode to return a session */
async function mockJwtDecode(session: any) {
  const { decode } = await import('next-auth/jwt');
  vi.mocked(decode).mockResolvedValue(session);
}

describe('Runtime Security Tests', () => {
  let originalAdminEmails: string | undefined;

  afterEach(async () => {
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
    if (originalAdminEmails !== undefined) {
      process.env.ADMIN_EMAILS = originalAdminEmails;
      originalAdminEmails = undefined;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  });

  it('should return 401 for unauthenticated access to /api/phase4/status', async () => {
    const request = makeStatusRequest();
    const response = await statusGET(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should return 200 for authenticated admin access to /api/phase4/status', async () => {
    originalAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'admin@test.com';

    await mockJwtDecode({
      email: 'admin@test.com',
      name: 'Test Admin',
      sub: 'admin-1',
      role: 'admin',
    });

    const request = makeStatusRequest({ cookie: true });
    const response = await statusGET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('db');
    expect(data).toHaveProperty('featureFlags');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('storage');

    // All feature flags should be OFF by default
    expect(data.featureFlags.FEATURE_AI_SEO_AUDIT).toBe(0);
    expect(data.featureFlags.FEATURE_CONTENT_PIPELINE).toBe(0);
    expect(data.featureFlags.FEATURE_WP_CONNECTOR).toBe(0);
    expect(data.featureFlags.FEATURE_WHITE_LABEL).toBe(0);
    expect(data.featureFlags.FEATURE_BACKLINK_OFFERS).toBe(0);
  });

  it('should return 200 for public access to /api/health', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/health',
    });

    const response = await healthGET(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('checks');
  });

  it('should validate admin email whitelist', async () => {
    originalAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'admin@test.com';

    // Non-admin email should get 403
    await mockJwtDecode({
      email: 'user@test.com',
      name: 'Regular User',
      sub: 'user-1',
      role: 'viewer',
    });

    const request = makeStatusRequest({ cookie: true });
    const response = await statusGET(request);

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Admin access required');
  });

  it('should handle missing session gracefully', async () => {
    // No cookie → no session → 401
    const request = makeStatusRequest();
    const response = await statusGET(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should validate session structure', async () => {
    // Token without email → 401
    await mockJwtDecode({
      name: 'Test User',
      sub: 'user-1',
      // Missing email
    });

    const request = makeStatusRequest({ cookie: true });
    const response = await statusGET(request);

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should test curl command simulation', async () => {
    // Unauthenticated curl → 401
    const unauthRequest = makeStatusRequest({ headers: { 'User-Agent': 'curl/7.68.0' } });
    const response = await statusGET(unauthRequest);
    expect(response.status).toBe(401);

    // Authenticated curl with admin session → 200
    originalAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'admin@test.com';

    await mockJwtDecode({
      email: 'admin@test.com',
      name: 'Test Admin',
      sub: 'admin-1',
      role: 'admin',
    });

    const authRequest = makeStatusRequest({
      cookie: true,
      headers: { 'User-Agent': 'curl/7.68.0' },
    });
    const authResponse = await statusGET(authRequest);
    expect(authResponse.status).toBe(200);
  });
});
