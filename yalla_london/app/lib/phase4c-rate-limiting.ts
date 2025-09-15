/**
 * Phase 4C Enhanced Rate Limiting
 * Extends existing rate limiting with Phase 4C specific rules
 */
import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
}

interface RateLimitRule {
  endpoint: string | RegExp
  config: RateLimitConfig
  description: string
}

// Phase 4C specific rate limiting rules
const PHASE_4C_RATE_LIMITS: RateLimitRule[] = [
  // CRM subscription endpoints
  {
    endpoint: /^\/api\/admin\/crm\/subscribe/,
    config: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 subscription attempts per IP per 15 minutes
      skipSuccessfulRequests: true
    },
    description: 'CRM subscription rate limit'
  },
  
  // Topic generation endpoint
  {
    endpoint: /^\/api\/admin\/topics\/generate/,
    config: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 topic generation requests per hour
      skipFailedRequests: true
    },
    description: 'Topic generation rate limit'
  },
  
  // Backlink inspection endpoint
  {
    endpoint: /^\/api\/admin\/backlinks\/inspect/,
    config: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20, // 20 inspections per 5 minutes
    },
    description: 'Backlink inspection rate limit'
  },
  
  // Model provider management
  {
    endpoint: /^\/api\/admin\/models\/providers/,
    config: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 provider management requests per hour
    },
    description: 'Model provider management rate limit'
  },
  
  // Content publishing endpoint
  {
    endpoint: /^\/api\/admin\/content\/publish/,
    config: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // 100 publish requests per hour
    },
    description: 'Content publishing rate limit'
  },
  
  // Public content API (more generous for public access)
  {
    endpoint: /^\/api\/content$/,
    config: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per 15 minutes for public API
      keyGenerator: (req) => {
        // Use a combination of IP and User-Agent for public API
        const forwarded = req.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
        const userAgent = req.headers.get('user-agent') || 'unknown'
        return `${ip}:${userAgent.slice(0, 50)}`
      }
    },
    description: 'Public content API rate limit'
  }
]

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Get the appropriate rate limit rule for an endpoint
 */
function getRateLimitRule(pathname: string): RateLimitRule | null {
  return PHASE_4C_RATE_LIMITS.find(rule => {
    if (typeof rule.endpoint === 'string') {
      return pathname === rule.endpoint
    }
    return rule.endpoint.test(pathname)
  }) || null
}

/**
 * Generate rate limit key
 */
function generateKey(req: NextRequest, rule: RateLimitRule): string {
  if (rule.config.keyGenerator) {
    return rule.config.keyGenerator(req)
  }
  
  // Default key generation: IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return `${req.nextUrl.pathname}:${ip}`
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(req: NextRequest): {
  allowed: boolean
  rule?: RateLimitRule
  remaining?: number
  resetTime?: number
  error?: string
} {
  const pathname = req.nextUrl.pathname
  const rule = getRateLimitRule(pathname)
  
  if (!rule) {
    // No specific rule found, allow the request
    return { allowed: true }
  }
  
  const key = generateKey(req, rule)
  const now = Date.now()
  const windowStart = now - rule.config.windowMs
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime <= now) {
    // Create new entry or reset expired entry
    entry = {
      count: 0,
      resetTime: now + rule.config.windowMs
    }
    rateLimitStore.set(key, entry)
  }
  
  // Check if limit exceeded
  if (entry.count >= rule.config.max) {
    return {
      allowed: false,
      rule,
      remaining: 0,
      resetTime: entry.resetTime,
      error: `Rate limit exceeded for ${rule.description}. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`
    }
  }
  
  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    allowed: true,
    rule,
    remaining: rule.config.max - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Record a failed request (if configured to skip failed requests)
 */
export function recordFailedRequest(req: NextRequest): void {
  const pathname = req.nextUrl.pathname
  const rule = getRateLimitRule(pathname)
  
  if (!rule || !rule.config.skipFailedRequests) {
    return
  }
  
  const key = generateKey(req, rule)
  const entry = rateLimitStore.get(key)
  
  if (entry && entry.count > 0) {
    entry.count--
    rateLimitStore.set(key, entry)
  }
}

/**
 * Record a successful request (if configured to skip successful requests)
 */
export function recordSuccessfulRequest(req: NextRequest): void {
  const pathname = req.nextUrl.pathname
  const rule = getRateLimitRule(pathname)
  
  if (!rule || !rule.config.skipSuccessfulRequests) {
    return
  }
  
  const key = generateKey(req, rule)
  const entry = rateLimitStore.get(key)
  
  if (entry && entry.count > 0) {
    entry.count--
    rateLimitStore.set(key, entry)
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>): Record<string, string> {
  const headers: Record<string, string> = {}
  
  if (result.rule) {
    headers['X-RateLimit-Limit'] = result.rule.config.max.toString()
    
    if (result.remaining !== undefined) {
      headers['X-RateLimit-Remaining'] = result.remaining.toString()
    }
    
    if (result.resetTime) {
      headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime / 1000).toString()
    }
  }
  
  return headers
}

/**
 * Enhanced rate limiting middleware for Phase 4C APIs
 */
export function withPhase4CRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const req = args[0] as NextRequest
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(req)
    const headers = getRateLimitHeaders(rateLimitResult)
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: rateLimitResult.error,
          retryAfter: rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : undefined
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString() : '60',
            ...headers
          }
        }
      )
    }
    
    try {
      // Execute the handler
      const response = await handler(...args)
      
      // Add rate limit headers to response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      // Record successful request if applicable
      if (response.ok) {
        recordSuccessfulRequest(req)
      } else {
        recordFailedRequest(req)
      }
      
      return response
      
    } catch (error) {
      // Record failed request if applicable
      recordFailedRequest(req)
      throw error
    }
  }
}

// Start cleanup interval
if (typeof window === 'undefined') {
  // Only run on server side
  setInterval(cleanupExpiredEntries, 60 * 60 * 1000) // Cleanup every hour
}