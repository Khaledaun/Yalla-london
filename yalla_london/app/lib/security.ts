/**
 * Enhanced Security Utilities
 * Additional security measures for authentication and API protection
 */

import { NextRequest } from 'next/server';
import { logAuditEvent } from './rbac';

interface RateLimitEntry {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  API_REQUESTS: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  }
} as const;

/**
 * Check if IP is rate limited for login attempts
 */
export function checkLoginRateLimit(ipAddress: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil?: number;
} {
  const key = `login:${ipAddress}`;
  const now = Date.now();
  const config = RATE_LIMITS.LOGIN_ATTEMPTS;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    rateLimitStore.set(key, { count: 0, lastAttempt: now });
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }
  
  // Check if block period has expired
  if (entry.blockedUntil && now > entry.blockedUntil) {
    rateLimitStore.set(key, { count: 0, lastAttempt: now });
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }
  
  // Check if currently blocked
  if (entry.blockedUntil && now <= entry.blockedUntil) {
    return { 
      allowed: false, 
      remainingAttempts: 0,
      blockedUntil: entry.blockedUntil
    };
  }
  
  // Check if window has expired
  if (now - entry.lastAttempt > config.windowMs) {
    rateLimitStore.set(key, { count: 0, lastAttempt: now });
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }
  
  const remainingAttempts = config.maxAttempts - entry.count;
  return { 
    allowed: remainingAttempts > 0, 
    remainingAttempts: Math.max(0, remainingAttempts)
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLoginAttempt(ipAddress: string): void {
  const key = `login:${ipAddress}`;
  const now = Date.now();
  const config = RATE_LIMITS.LOGIN_ATTEMPTS;
  
  const entry = rateLimitStore.get(key) || { count: 0, lastAttempt: now };
  entry.count += 1;
  entry.lastAttempt = now;
  
  // Block if max attempts reached
  if (entry.count >= config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    
    // Log security event
    logAuditEvent({
      action: 'rate_limit_triggered',
      resource: 'authentication',
      success: false,
      details: {
        type: 'login_attempts',
        attempts: entry.count,
        ipAddress: ipAddress
      },
      ipAddress: ipAddress,
      errorMessage: 'Maximum login attempts exceeded'
    });
  }
  
  rateLimitStore.set(key, entry);
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check common headers for real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xRealIP) return xRealIP;
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Fallback to request IP
  return request.ip || 'unknown';
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    issues.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    issues.push('Password is too common');
    score = 0;
  }
  
  return {
    valid: issues.length === 0,
    score,
    issues
  };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/style=/gi, '') // Remove style attributes
    .replace(/src=/gi, 'data-src='); // Neutralize src attributes
}

/**
 * Check for suspicious patterns in requests
 */
export function detectSuspiciousActivity(request: NextRequest): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.url;
  
  // Check for common attack patterns
  if (/script|javascript|vbscript/i.test(url)) {
    reasons.push('Potential XSS attempt in URL');
  }
  
  if (/union.*select|drop.*table|insert.*into/i.test(url)) {
    reasons.push('Potential SQL injection attempt');
  }
  
  if (/\.\.|\/etc\/|\/proc\/|\/var\//i.test(url)) {
    reasons.push('Potential path traversal attempt');
  }
  
  // Check for suspicious user agents
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or suspicious user agent');
  }
  
  if (/bot|spider|crawler|curl|wget|scanner/i.test(userAgent)) {
    reasons.push('Automated tool detected');
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Security headers for responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
} as const;