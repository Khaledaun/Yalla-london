/**
 * Multi-Tenant Middleware
 *
 * Resolves the current tenant (site) based on the hostname and adds
 * tenant context to the request headers for use in API routes and pages.
 *
 * Architecture Notes:
 * - Runs on Vercel Edge Runtime (fast, globally distributed)
 * - Uses host header to determine which site is being accessed
 * - Falls back to default site for unknown hosts
 * - Preserves UTM parameters for attribution tracking
 */

import { NextRequest, NextResponse } from 'next/server';

// Static domain to site mapping (loaded at build time)
// In production, this could be fetched from Redis/KV store
const DOMAIN_TO_SITE: Record<string, { siteId: string; siteName: string; locale: string }> = {
  // Arabaldives - Arabic Maldives site
  'arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },
  'www.arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },

  // Yalla London - English London lifestyle
  'yalla-london.com': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },
  'www.yalla-london.com': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },

  // Gulf Maldives - English Maldives
  'gulfmaldives.com': { siteId: 'gulf-maldives', siteName: 'Gulf Maldives', locale: 'en' },
  'www.gulfmaldives.com': { siteId: 'gulf-maldives', siteName: 'Gulf Maldives', locale: 'en' },

  // Arab Bali - Arabic Bali site
  'arabbali.com': { siteId: 'arab-bali', siteName: 'Arab Bali', locale: 'ar' },
  'www.arabbali.com': { siteId: 'arab-bali', siteName: 'Arab Bali', locale: 'ar' },

  // Luxury Escapes ME - Arabic multi-destination
  'luxuryescapes.me': { siteId: 'luxury-escapes-me', siteName: 'Luxury Escapes ME', locale: 'ar' },
  'www.luxuryescapes.me': { siteId: 'luxury-escapes-me', siteName: 'Luxury Escapes ME', locale: 'ar' },

  // Development/Preview domains
  'localhost:3000': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },
};

// Default site when host is not recognized
const DEFAULT_SITE = { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' };

// Paths that don't need tenant context
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip excluded paths
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get hostname from request
  const hostname = request.headers.get('host') || 'localhost:3000';

  // Resolve tenant from hostname
  const tenant = DOMAIN_TO_SITE[hostname] || DEFAULT_SITE;

  // Create response with tenant headers
  const response = NextResponse.next();

  // Add tenant context headers (accessible in API routes and server components)
  response.headers.set('x-site-id', tenant.siteId);
  response.headers.set('x-site-name', tenant.siteName);
  response.headers.set('x-site-locale', tenant.locale);
  response.headers.set('x-hostname', hostname);

  // Preserve UTM parameters in a cookie for attribution
  const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utmData: Record<string, string> = {};

  utmParams.forEach((param) => {
    const value = searchParams.get(param);
    if (value) {
      utmData[param] = value;
    }
  });

  if (Object.keys(utmData).length > 0) {
    // Store UTM data in a cookie for 30 days
    response.cookies.set('utm_data', JSON.stringify(utmData), {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      sameSite: 'lax',
    });
  }

  // Generate or preserve visitor ID
  const visitorId = request.cookies.get('visitor_id')?.value;
  if (!visitorId) {
    response.cookies.set('visitor_id', generateVisitorId(), {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
      sameSite: 'lax',
    });
  }

  // Generate session ID if not present
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) {
    response.cookies.set('session_id', generateSessionId(), {
      maxAge: 30 * 60, // 30 minutes
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

/**
 * Generate a unique visitor ID
 */
function generateVisitorId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `v_${timestamp}_${randomPart}`;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `s_${timestamp}_${randomPart}`;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
