/**
 * Security Headers Middleware
 * Implements security headers and CORS for admin routes
 */

import { NextRequest, NextResponse } from 'next/server';

interface SecurityHeadersConfig {
  csp: string;
  hsts: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  xXSSProtection: string;
  referrerPolicy: string;
  permissionsPolicy: string;
}

interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

class SecurityHeadersManager {
  private config: SecurityHeadersConfig;
  private corsConfig: CORSConfig;

  constructor() {
    this.config = this.getSecurityHeadersConfig();
    this.corsConfig = this.getCORSConfig();
  }

  private getSecurityHeadersConfig(): SecurityHeadersConfig {
    return {
      csp: process.env.CSP_POLICY || "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
      hsts: process.env.HSTS_MAX_AGE || '31536000; includeSubDomains; preload',
      xFrameOptions: process.env.X_FRAME_OPTIONS || 'DENY',
      xContentTypeOptions: process.env.X_CONTENT_TYPE_OPTIONS || 'nosniff',
      xXSSProtection: process.env.X_XSS_PROTECTION || '1; mode=block',
      referrerPolicy: process.env.REFERRER_POLICY || 'strict-origin-when-cross-origin',
      permissionsPolicy: process.env.PERMISSIONS_POLICY || 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    };
  }

  private getCORSConfig(): CORSConfig {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://yalla-london.vercel.app',
      'https://yalla-london-git-main-khaledauns-projects.vercel.app'
    ];

    return {
      allowedOrigins,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Session-ID',
        'X-API-Key'
      ],
      allowCredentials: true,
      maxAge: 86400 // 24 hours
    };
  }

  addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set('Content-Security-Policy', this.config.csp);
    
    // HTTP Strict Transport Security
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', this.config.hsts);
    }
    
    // X-Frame-Options
    response.headers.set('X-Frame-Options', this.config.xFrameOptions);
    
    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', this.config.xContentTypeOptions);
    
    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', this.config.xXSSProtection);
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', this.config.referrerPolicy);
    
    // Permissions Policy
    response.headers.set('Permissions-Policy', this.config.permissionsPolicy);
    
    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    
    return response;
  }

  addCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    
    // Check if origin is allowed
    if (origin && this.corsConfig.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (this.corsConfig.allowedOrigins.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else {
      // Default to first allowed origin
      response.headers.set('Access-Control-Allow-Origin', this.corsConfig.allowedOrigins[0]);
    }
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Methods', this.corsConfig.allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', this.corsConfig.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', this.corsConfig.allowCredentials.toString());
    response.headers.set('Access-Control-Max-Age', this.corsConfig.maxAge.toString());
    
    // Expose headers
    response.headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    
    return response;
  }

  isOriginAllowed(origin: string): boolean {
    return this.corsConfig.allowedOrigins.includes(origin) || 
           this.corsConfig.allowedOrigins.includes('*');
  }

  getConfig(): { security: SecurityHeadersConfig; cors: CORSConfig } {
    return {
      security: this.config,
      cors: this.corsConfig
    };
  }
}

// Global security headers manager
const securityManager = new SecurityHeadersManager();

// Middleware wrapper for security headers
export function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return securityManager.addCORSHeaders(response, request);
    }

    // Check CORS for non-preflight requests
    const origin = request.headers.get('origin');
    if (origin && !securityManager.isOriginAllowed(origin)) {
      return new NextResponse(
        JSON.stringify({ error: 'CORS policy violation' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Execute the handler
    const response = await handler(request);
    
    // Add security headers
    const securedResponse = securityManager.addSecurityHeaders(response);
    
    // Add CORS headers
    return securityManager.addCORSHeaders(securedResponse, request);
  };
}

// Admin-specific security headers (stricter)
export function withAdminSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      return securityManager.addCORSHeaders(response, request);
    }

    // Stricter CORS check for admin routes
    const origin = request.headers.get('origin');
    if (origin && !securityManager.isOriginAllowed(origin)) {
      return new NextResponse(
        JSON.stringify({ error: 'Admin access denied - CORS policy violation' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Execute the handler
    const response = await handler(request);
    
    // Add stricter security headers for admin routes
    const securedResponse = securityManager.addSecurityHeaders(response);
    
    // Add additional admin-specific headers
    securedResponse.headers.set('X-Admin-Access', 'true');
    securedResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    securedResponse.headers.set('Pragma', 'no-cache');
    securedResponse.headers.set('Expires', '0');
    
    // Add CORS headers
    return securityManager.addCORSHeaders(securedResponse, request);
  };
}

// Security headers status endpoint
export async function getSecurityHeadersStatus(request: NextRequest) {
  const config = securityManager.getConfig();
  
  return new NextResponse(
    JSON.stringify({
      security: config.security,
      cors: config.cors,
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}

// Utility functions
export const getSecurityConfig = () => securityManager.getConfig();
export const isOriginAllowed = (origin: string) => securityManager.isOriginAllowed(origin);
