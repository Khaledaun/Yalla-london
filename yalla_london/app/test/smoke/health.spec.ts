/**
 * Health endpoint smoke tests
 *
 * NOTE: The status route uses withAdminAuth which reads JWT from cookies
 * via next-auth/jwt (NOT getServerSession).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET as healthGET } from '@/app/api/health/route';
import { GET as statusGET } from '@/app/api/phase4/status/route';

describe('Health Endpoints', () => {
  afterEach(async () => {
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockReset();
    delete process.env.ADMIN_EMAILS;
  });

  it('GET /api/health should return 200', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/health',
    });

    const response = await healthGET(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
  });

  it('GET /api/phase4/status (unauthenticated) should return 401', async () => {
    // No cookie -> no session -> 401
    const request = new NextRequest(new URL('/api/phase4/status', 'http://localhost:3000'));
    const response = await statusGET(request);

    expect(response.status).toBe(401);
  });

  it('GET /api/phase4/status (admin session) should return 200 with flags', async () => {
    process.env.ADMIN_EMAILS = 'admin@test.com';

    // Mock JWT decode to return admin token
    const { decode } = await import('next-auth/jwt');
    vi.mocked(decode).mockResolvedValue({
      email: 'admin@test.com',
      name: 'Test Admin',
      sub: 'admin-1',
      role: 'admin',
    } as any);

    // Create NextRequest with session cookie
    const request = new NextRequest(new URL('/api/phase4/status', 'http://localhost:3000'), {
      headers: {
        cookie: 'next-auth.session-token=test-token-value',
      },
    });

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
});
