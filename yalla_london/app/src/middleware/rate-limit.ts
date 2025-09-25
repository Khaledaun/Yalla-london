/**
 * Rate Limiting Middleware
 * Implements IP and session-based rate limiting for admin routes
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.store.set(key, entry);
    }

    const isAllowed = entry.count < config.maxRequests;
    
    if (isAllowed) {
      entry.count++;
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Rate limit configurations
const RATE_LIMIT_CONFIGS = {
  // IP-based rate limiting
  ip: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_IP || '60'),
    keyGenerator: (request: NextRequest) => {
      const ip = request.ip || 
                 request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      return `ip:${ip}`;
    }
  },
  
  // Session-based rate limiting
  session: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_SESSION || '20'),
    keyGenerator: (request: NextRequest) => {
      const sessionId = request.headers.get('x-session-id') || 
                       request.cookies.get('session-id')?.value ||
                       'anonymous';
      return `session:${sessionId}`;
    }
  },

  // Admin write operations (stricter limits)
  adminWrite: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_ADMIN_WRITE || '10'),
    keyGenerator: (request: NextRequest) => {
      const ip = request.ip || 
                 request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const sessionId = request.headers.get('x-session-id') || 
                       request.cookies.get('session-id')?.value ||
                       'anonymous';
      return `admin-write:${ip}:${sessionId}`;
    }
  },

  // Media upload (very strict limits)
  mediaUpload: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_MEDIA_UPLOAD || '5'),
    keyGenerator: (request: NextRequest) => {
      const ip = request.ip || 
                 request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const sessionId = request.headers.get('x-session-id') || 
                       request.cookies.get('session-id')?.value ||
                       'anonymous';
      return `media-upload:${ip}:${sessionId}`;
    }
  }
};

export function withRateLimit(
  configType: keyof typeof RATE_LIMIT_CONFIGS,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const config = RATE_LIMIT_CONFIGS[configType];
    const key = config.keyGenerator(request);
    
    const result = rateLimiter.isAllowed(key, config);
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter: retryAfter,
          limit: config.maxRequests,
          windowMs: config.windowMs
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'X-RateLimit-Window': config.windowMs.toString()
          }
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(request);
    
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    response.headers.set('X-RateLimit-Window', config.windowMs.toString());
    
    return response;
  };
}

// Specific rate limiters for different route types
export const withIPRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) => 
  withRateLimit('ip', handler);

export const withSessionRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) => 
  withRateLimit('session', handler);

export const withAdminWriteRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) => 
  withRateLimit('adminWrite', handler);

export const withMediaUploadRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) => 
  withRateLimit('mediaUpload', handler);

// Rate limit status endpoint
export async function getRateLimitStatus(request: NextRequest) {
  const configs = Object.entries(RATE_LIMIT_CONFIGS).map(([name, config]) => {
    const key = config.keyGenerator(request);
    const result = rateLimiter.isAllowed(key, config);
    
    return {
      type: name,
      limit: config.maxRequests,
      remaining: result.remaining,
      resetTime: result.resetTime,
      windowMs: config.windowMs
    };
  });

  return NextResponse.json({
    rateLimits: configs,
    timestamp: new Date().toISOString()
  });
}

// Cleanup function for graceful shutdown
export function cleanupRateLimiter() {
  rateLimiter.destroy();
}
