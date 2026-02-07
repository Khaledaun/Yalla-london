/**
 * Multi-Tenant Middleware
 *
 * Resolves the current tenant (site) based on the hostname and adds
 * tenant context to the request headers for use in API routes and pages.
 *
 * SECURITY:
 * - Cookies set with httpOnly, secure (in production), and sameSite flags
 * - Visitor/session IDs generated with crypto.randomUUID() (not Math.random)
 * - CSRF protection via Origin header validation on mutating requests
 */

import { NextRequest, NextResponse } from 'next/server';

// Static domain to site mapping
const DOMAIN_TO_SITE: Record<string, { siteId: string; siteName: string; locale: string }> = {
  'arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },
  'www.arabaldives.com': { siteId: 'arabaldives', siteName: 'Arabaldives', locale: 'ar' },
  'yalla-london.com': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },
  'www.yalla-london.com': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },
  'gulfmaldives.com': { siteId: 'gulf-maldives', siteName: 'Gulf Maldives', locale: 'en' },
  'www.gulfmaldives.com': { siteId: 'gulf-maldives', siteName: 'Gulf Maldives', locale: 'en' },
  'arabbali.com': { siteId: 'arab-bali', siteName: 'Arab Bali', locale: 'ar' },
  'www.arabbali.com': { siteId: 'arab-bali', siteName: 'Arab Bali', locale: 'ar' },
  'luxuryescapes.me': { siteId: 'luxury-escapes-me', siteName: 'Luxury Escapes ME', locale: 'ar' },
  'www.luxuryescapes.me': { siteId: 'luxury-escapes-me', siteName: 'Luxury Escapes ME', locale: 'ar' },
  'localhost:3000': { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' },
};

const DEFAULT_SITE = { siteId: 'yalla-london', siteName: 'Yalla London', locale: 'en' };

const EXCLUDED_PATHS = [
  '/api/health',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// SECURITY: Allowed origins for CSRF protection
const ALLOWED_ORIGINS = new Set([
  'https://yallalondon.com',
  'https://www.yallalondon.com',
  'https://yalla-london.com',
  'https://www.yalla-london.com',
  'https://arabaldives.com',
  'https://gulfmaldives.com',
  'https://arabbali.com',
  'https://luxuryescapes.me',
  'http://localhost:3000',
]);

const isProduction = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip excluded paths
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // SECURITY: CSRF protection for mutating requests
  const method = request.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { status: 403 }
      );
    }
  }

  // Get hostname from request
  const hostname = request.headers.get('host') || 'localhost:3000';

  // Resolve tenant from hostname
  const tenant = DOMAIN_TO_SITE[hostname] || DEFAULT_SITE;

  // Create response with tenant headers
  const response = NextResponse.next();

  // Add tenant context headers
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
      // SECURITY: Only allow alphanumeric, hyphens, underscores in UTM values
      utmData[param] = value.replace(/[^a-zA-Z0-9_-]/g, '');
    }
  });

  if (Object.keys(utmData).length > 0) {
    response.cookies.set('utm_data', JSON.stringify(utmData), {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: isProduction,
    });
  }

  // SECURITY: Generate cryptographically secure visitor/session IDs
  const visitorId = request.cookies.get('visitor_id')?.value;
  if (!visitorId) {
    response.cookies.set('visitor_id', crypto.randomUUID(), {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: isProduction,
    });
  }

  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) {
    response.cookies.set('session_id', crypto.randomUUID(), {
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: isProduction,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
