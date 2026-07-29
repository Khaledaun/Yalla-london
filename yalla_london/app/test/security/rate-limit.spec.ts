/**
 * Rate Limiting Security Tests
 * Tests rate limit enforcement and 429 responses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withIPRateLimit, withSessionRateLimit, withAdminWriteRateLimit, withMediaUploadRateLimit } from '@/middleware/rate-limit';

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { headers });
}

const okHandler = async (_request: NextRequest): Promise<NextResponse> => {
  return NextResponse.json({ success: true });
};

describe('Rate Limiting Tests', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX_IP = '5';
    process.env.RATE_LIMIT_MAX_SESSION = '3';
    process.env.RATE_LIMIT_MAX_ADMIN_WRITE = '2';
    process.env.RATE_LIMIT_MAX_MEDIA_UPLOAD = '1';
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_IP;
    delete process.env.RATE_LIMIT_MAX_SESSION;
    delete process.env.RATE_LIMIT_MAX_ADMIN_WRITE;
    delete process.env.RATE_LIMIT_MAX_MEDIA_UPLOAD;
  });

  it('should allow requests within rate limit', async () => {
    const rateLimitedHandler = withIPRateLimit(okHandler);
    const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.1' });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(200);
  });

  it('should include rate limit headers', async () => {
    const rateLimitedHandler = withIPRateLimit(okHandler);
    const req = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.2' });
    const response = await rateLimitedHandler(req);

    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should return 429 when IP rate limit exceeded', async () => {
    const rateLimitedHandler = withIPRateLimit(okHandler);
    const ip = '10.0.0.3';

    // Exhaust rate limit (default 60 from env at module load)
    for (let i = 0; i < 60; i++) {
      const req = makeRequest('/api/test', { 'x-forwarded-for': ip });
      await rateLimitedHandler(req);
    }

    const req = makeRequest('/api/test', { 'x-forwarded-for': ip });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toBe('Rate limit exceeded');
  });

  it('should handle different IPs separately', async () => {
    const rateLimitedHandler = withIPRateLimit(okHandler);

    const req1 = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.4' });
    const req2 = makeRequest('/api/test', { 'x-forwarded-for': '10.0.0.5' });

    const response1 = await rateLimitedHandler(req1);
    const response2 = await rateLimitedHandler(req2);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  it('withSessionRateLimit wraps handler', async () => {
    const rateLimitedHandler = withSessionRateLimit(okHandler);
    const req = makeRequest('/api/test', { 'x-session-id': 'sess-1' });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(200);
  });

  it('withAdminWriteRateLimit wraps handler', async () => {
    const rateLimitedHandler = withAdminWriteRateLimit(okHandler);
    const req = makeRequest('/api/admin/editor/save', { 'x-forwarded-for': '10.0.0.6', 'x-session-id': 'sess-2' });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(200);
  });

  it('withMediaUploadRateLimit wraps handler', async () => {
    const rateLimitedHandler = withMediaUploadRateLimit(okHandler);
    const req = makeRequest('/api/admin/media/upload', { 'x-forwarded-for': '10.0.0.7', 'x-session-id': 'sess-3' });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(200);
  });

  it('should include Retry-After header in 429 responses', async () => {
    const rateLimitedHandler = withIPRateLimit(okHandler);
    const ip = '10.0.0.8';

    for (let i = 0; i < 61; i++) {
      const req = makeRequest('/api/test', { 'x-forwarded-for': ip });
      await rateLimitedHandler(req);
    }

    const req = makeRequest('/api/test', { 'x-forwarded-for': ip });
    const response = await rateLimitedHandler(req);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });
});
