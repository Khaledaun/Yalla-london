/**
 * Rate limiting middleware for Next.js API routes
 * Provides configurable rate limiting with Redis or in-memory storage
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {};
let checkCount = 0;

/**
 * Default key generator based on IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Prefer Cloudflare's CF-Connecting-IP for accurate IP behind CDN
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `rate_limit:${ip}`;
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}

/**
 * Rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return {
    check: async (
      request: NextRequest,
    ): Promise<{
      allowed: boolean;
      remaining: number;
      resetTime: number;
      totalRequests: number;
    }> => {
      // Clean up expired entries every 100th request (deterministic)
      checkCount++;
      if (checkCount % 100 === 0) {
        cleanupExpiredEntries();
      }

      const key = keyGenerator(request);
      const now = Date.now();
      const resetTime = now + windowMs;

      // Get or create rate limit entry
      let entry = rateLimitStore[key];

      if (!entry || entry.resetTime < now) {
        entry = rateLimitStore[key] = {
          count: 0,
          resetTime,
        };
      }

      // Increment counter
      entry.count++;

      const allowed = entry.count <= maxRequests;
      const remaining = Math.max(0, maxRequests - entry.count);

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
        totalRequests: entry.count,
      };
    },
  };
}

/**
 * Rate limiting middleware wrapper for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  const rateLimiter = createRateLimit(config);

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const result = await rateLimiter.check(request);

      // Add rate limit headers
      const headers = {
        "X-RateLimit-Limit": config.maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
        "X-RateLimit-Window": (config.windowMs / 1000).toString(),
      };

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: "Too many requests",
            message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              ...headers,
              "Retry-After": Math.ceil(
                (result.resetTime - Date.now()) / 1000,
              ).toString(),
            },
          },
        );
      }

      // Continue with the original handler
      const response = await handler(request);

      // Add rate limit headers to response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error("Rate limiting error:", error);
      // If rate limiting fails, allow the request to continue
      return handler(request);
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // For public API endpoints
  PUBLIC_API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },

  // For search endpoints
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20, // 20 searches per minute
  },

  // For embed endpoints
  EMBEDS: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 embed requests per minute
  },

  // For auth endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
  },

  // For heavy operations
  HEAVY_OPERATIONS: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 2, // 2 heavy operations per minute
  },
};

/**
 * Create a rate limiter for API key based limits
 */
export function createApiKeyRateLimit(config: RateLimitConfig) {
  return createRateLimit({
    ...config,
    keyGenerator: (request: NextRequest) => {
      const apiKey =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization");
      return `api_rate_limit:${apiKey || defaultKeyGenerator(request)}`;
    },
  });
}

/**
 * Get current rate limit status for a request
 */
export async function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig,
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}> {
  const rateLimiter = createRateLimit(config);
  return rateLimiter.check(request);
}

/**
 * Extract client IP from request headers.
 * Prefers Cloudflare's CF-Connecting-IP for accurate IP behind CDN.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
