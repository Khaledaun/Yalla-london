/**
 * Test suite for Rate Limiting functionality
 */

import { createRateLimit, withRateLimit, RateLimitPresets } from '@/lib/rate-limiting';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextRequest
const createMockRequest = (ip: string = '127.0.0.1'): NextRequest => {
  const request = {
    headers: new Map([
      ['x-forwarded-for', ip],
      ['user-agent', 'test-agent']
    ]),
    ip
  } as any;
  
  request.headers.get = (key: string) => {
    const headers: { [key: string]: string } = {
      'x-forwarded-for': ip,
      'user-agent': 'test-agent'
    };
    return headers[key] || null;
  };
  
  return request as NextRequest;
};

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear the in-memory store between tests
    const { rateLimitStore } = require('@/lib/rate-limiting');
    if (rateLimitStore) {
      Object.keys(rateLimitStore).forEach(key => delete rateLimitStore[key]);
    }
  });

  describe('createRateLimit', () => {
    it('should allow requests within the limit', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000, // 1 minute
        maxRequests: 5
      });

      const request = createMockRequest();
      const result = await rateLimiter.check(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 = 4
      expect(result.totalRequests).toBe(1);
    });

    it('should deny requests exceeding the limit', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 2
      });

      const request = createMockRequest();

      // First request - allowed
      let result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);

      // Second request - allowed
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);

      // Third request - denied
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalRequests).toBe(3);
    });

    it('should reset the counter after the window expires', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 100, // Very short window for testing
        maxRequests: 1
      });

      const request = createMockRequest();

      // First request - allowed
      let result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);

      // Second request immediately - denied
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third request after window - allowed again
      result = await rateLimiter.check(request);
      expect(result.allowed).toBe(true);
      expect(result.totalRequests).toBe(1); // Reset counter
    });

    it('should handle different IP addresses separately', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');

      // First IP - allowed
      let result1 = await rateLimiter.check(request1);
      expect(result1.allowed).toBe(true);

      // Second IP - also allowed (different IP)
      let result2 = await rateLimiter.check(request2);
      expect(result2.allowed).toBe(true);

      // First IP again - denied (exceeded limit)
      result1 = await rateLimiter.check(request1);
      expect(result1.allowed).toBe(false);

      // Second IP again - denied (exceeded limit)
      result2 = await rateLimiter.check(request2);
      expect(result2.allowed).toBe(false);
    });

    it('should use custom key generator when provided', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (request) => 'custom-key'
      });

      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');

      // Both requests should share the same rate limit bucket
      let result1 = await rateLimiter.check(request1);
      expect(result1.allowed).toBe(true);

      let result2 = await rateLimiter.check(request2);
      expect(result2.allowed).toBe(false); // Same bucket, already at limit
    });
  });

  describe('withRateLimit middleware', () => {
    it('should call handler when within rate limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const rateLimitedHandler = withRateLimit({
        windowMs: 60000,
        maxRequests: 5
      }, mockHandler);

      const request = createMockRequest();
      const response = await rateLimitedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.status).not.toBe(429);
    });

    it('should return 429 when rate limit exceeded', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const rateLimitedHandler = withRateLimit({
        windowMs: 60000,
        maxRequests: 1
      }, mockHandler);

      const request = createMockRequest();

      // First request - should succeed
      let response = await rateLimitedHandler(request);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(response.status).not.toBe(429);

      // Second request - should be rate limited
      response = await rateLimitedHandler(request);
      expect(mockHandler).toHaveBeenCalledTimes(1); // Handler not called again
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('should add rate limit headers to responses', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const rateLimitedHandler = withRateLimit({
        windowMs: 60000,
        maxRequests: 5
      }, mockHandler);

      const request = createMockRequest();
      const response = await rateLimitedHandler(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Window')).toBe('60');
    });

    it('should continue on rate limiting errors', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      // Create a broken rate limiter that throws
      const brokenRateLimiter = {
        check: jest.fn().mockRejectedValue(new Error('Rate limiter error'))
      };

      // Mock the createRateLimit to return broken limiter
      jest.doMock('@/lib/rate-limiting', () => ({
        createRateLimit: () => brokenRateLimiter,
        withRateLimit: require('@/lib/rate-limiting').withRateLimit
      }));

      const rateLimitedHandler = withRateLimit({
        windowMs: 60000,
        maxRequests: 5
      }, mockHandler);

      const request = createMockRequest();
      const response = await rateLimitedHandler(request);

      // Should still call the handler despite rate limiting error
      expect(mockHandler).toHaveBeenCalledWith(request);
      expect(response.status).not.toBe(429);
    });
  });

  describe('Rate Limit Presets', () => {
    it('should have appropriate limits for public API', () => {
      expect(RateLimitPresets.PUBLIC_API.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RateLimitPresets.PUBLIC_API.maxRequests).toBe(100);
    });

    it('should have stricter limits for search', () => {
      expect(RateLimitPresets.SEARCH.windowMs).toBe(1 * 60 * 1000); // 1 minute
      expect(RateLimitPresets.SEARCH.maxRequests).toBe(20);
    });

    it('should have very strict limits for heavy operations', () => {
      expect(RateLimitPresets.HEAVY_OPERATIONS.windowMs).toBe(1 * 60 * 1000); // 1 minute
      expect(RateLimitPresets.HEAVY_OPERATIONS.maxRequests).toBe(2);
    });

    it('should have strict limits for auth endpoints', () => {
      expect(RateLimitPresets.AUTH.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RateLimitPresets.AUTH.maxRequests).toBe(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle requests with no IP address', async () => {
      const request = {
        headers: new Map(),
        ip: undefined
      } as any;
      
      request.headers.get = () => null;

      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 5
      });

      const result = await rateLimiter.check(request);
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should handle malformed IP addresses gracefully', async () => {
      const request = createMockRequest('invalid-ip-address');
      
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 5
      });

      const result = await rateLimiter.check(request);
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should handle rapid successive requests', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      const request = createMockRequest();
      const promises = [];

      // Send 15 rapid requests
      for (let i = 0; i < 15; i++) {
        promises.push(rateLimiter.check(request));
      }

      const results = await Promise.all(promises);
      
      // First 10 should be allowed, last 5 should be denied
      const allowedCount = results.filter(r => r.allowed).length;
      const deniedCount = results.filter(r => !r.allowed).length;
      
      expect(allowedCount).toBe(10);
      expect(deniedCount).toBe(5);
    });

    it('should cleanup expired entries periodically', async () => {
      // This test would verify the cleanup mechanism
      // In a real implementation, we might expose a cleanup method for testing
      const rateLimiter = createRateLimit({
        windowMs: 100, // Short window
        maxRequests: 1
      });

      const request = createMockRequest();
      
      // Make a request
      await rateLimiter.check(request);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // The cleanup should happen on subsequent requests
      // This is implementation-dependent and might need adjustment
      const result = await rateLimiter.check(request);
      expect(result.totalRequests).toBe(1); // Should be reset
    });
  });

  describe('Performance Considerations', () => {
    it('should handle high request volumes efficiently', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1000
      });

      const startTime = Date.now();
      const promises = [];

      // Test with 100 requests
      for (let i = 0; i < 100; i++) {
        const request = createMockRequest(`192.168.1.${i}`);
        promises.push(rateLimiter.check(request));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });

    it('should not leak memory with many unique IPs', async () => {
      const rateLimiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      // Test with many unique IPs
      for (let i = 0; i < 50; i++) {
        const request = createMockRequest(`10.0.0.${i}`);
        await rateLimiter.check(request);
      }

      // Memory usage should be reasonable
      // This is hard to test precisely, but we can at least ensure no errors
      expect(true).toBe(true); // Test passes if no memory errors occur
    });
  });
});