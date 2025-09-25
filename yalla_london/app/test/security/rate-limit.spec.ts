/**
 * Rate Limiting Security Tests
 * Tests rate limit enforcement and 429 responses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { withRateLimit, withIPRateLimit, withSessionRateLimit, withAdminWriteRateLimit, withMediaUploadRateLimit } from '@/src/middleware/rate-limit';

describe('Rate Limiting Tests', () => {
  beforeEach(() => {
    // Reset environment variables for testing
    process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute for testing
    process.env.RATE_LIMIT_MAX_IP = '5';
    process.env.RATE_LIMIT_MAX_SESSION = '3';
    process.env.RATE_LIMIT_MAX_ADMIN_WRITE = '2';
    process.env.RATE_LIMIT_MAX_MEDIA_UPLOAD = '1';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_IP;
    delete process.env.RATE_LIMIT_MAX_SESSION;
    delete process.env.RATE_LIMIT_MAX_ADMIN_WRITE;
    delete process.env.RATE_LIMIT_MAX_MEDIA_UPLOAD;
  });

  it('should allow requests within rate limit', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withIPRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    });

    const response = await rateLimitedHandler(req as any);
    expect(response.status).toBe(200);
  });

  it('should return 429 when IP rate limit exceeded', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withIPRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    });

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      const response = await rateLimitedHandler(req as any);
      expect(response.status).toBe(200);
    }

    // This request should be rate limited
    const response = await rateLimitedHandler(req as any);
    expect(response.status).toBe(429);
    
    const data = await response.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.retryAfter).toBeGreaterThan(0);
    expect(data.limit).toBe(5);
  });

  it('should return 429 when session rate limit exceeded', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withSessionRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-session-id': 'test-session-123'
      }
    });

    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      const response = await rateLimitedHandler(req as any);
      expect(response.status).toBe(200);
    }

    // This request should be rate limited
    const response = await rateLimitedHandler(req as any);
    expect(response.status).toBe(429);
    
    const data = await response.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.limit).toBe(3);
  });

  it('should return 429 when admin write rate limit exceeded', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withAdminWriteRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/editor/save',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-session-id': 'test-session-123'
      }
    });

    // Make requests up to the limit
    for (let i = 0; i < 2; i++) {
      const response = await rateLimitedHandler(req as any);
      expect(response.status).toBe(200);
    }

    // This request should be rate limited
    const response = await rateLimitedHandler(req as any);
    expect(response.status).toBe(429);
    
    const data = await response.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.limit).toBe(2);
  });

  it('should return 429 when media upload rate limit exceeded', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withMediaUploadRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/admin/media/upload',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-session-id': 'test-session-123'
      }
    });

    // Make one request (limit is 1)
    const response1 = await rateLimitedHandler(req as any);
    expect(response1.status).toBe(200);

    // This request should be rate limited
    const response2 = await rateLimitedHandler(req as any);
    expect(response2.status).toBe(429);
    
    const data = await response2.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.limit).toBe(1);
  });

  it('should include proper rate limit headers', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withIPRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    });

    const response = await rateLimitedHandler(req as any);
    
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Window')).toBe('60000');
  });

  it('should include Retry-After header in 429 responses', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withIPRateLimit(mockHandler);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    });

    // Exceed the rate limit
    for (let i = 0; i < 6; i++) {
      await rateLimitedHandler(req as any);
    }

    const response = await rateLimitedHandler(req as any);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(parseInt(response.headers.get('Retry-After')!)).toBeGreaterThan(0);
  });

  it('should handle different IP addresses separately', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withIPRateLimit(mockHandler);

    // First IP
    const { req: req1, res: res1 } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    });

    // Second IP
    const { req: req2, res: res2 } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-forwarded-for': '192.168.1.2'
      }
    });

    // Both IPs should be able to make requests independently
    for (let i = 0; i < 5; i++) {
      const response1 = await rateLimitedHandler(req1 as any);
      const response2 = await rateLimitedHandler(req2 as any);
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    }

    // Both should be rate limited after exceeding their limits
    const response1 = await rateLimitedHandler(req1 as any);
    const response2 = await rateLimitedHandler(req2 as any);
    expect(response1.status).toBe(429);
    expect(response2.status).toBe(429);
  });

  it('should handle different sessions separately', async () => {
    const mockHandler = async (request: any) => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const rateLimitedHandler = withSessionRateLimit(mockHandler);

    // First session
    const { req: req1, res: res1 } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-session-id': 'session-1'
      }
    });

    // Second session
    const { req: req2, res: res2 } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'x-session-id': 'session-2'
      }
    });

    // Both sessions should be able to make requests independently
    for (let i = 0; i < 3; i++) {
      const response1 = await rateLimitedHandler(req1 as any);
      const response2 = await rateLimitedHandler(req2 as any);
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    }

    // Both should be rate limited after exceeding their limits
    const response1 = await rateLimitedHandler(req1 as any);
    const response2 = await rateLimitedHandler(req2 as any);
    expect(response1.status).toBe(429);
    expect(response2.status).toBe(429);
  });
});
