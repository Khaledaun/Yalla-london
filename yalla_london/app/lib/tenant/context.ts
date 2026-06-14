/**
 * Tenant Context Utilities
 *
 * Provides utilities to access tenant (site) context from:
 * - Server Components (via headers)
 * - API Routes (via headers)
 * - Client Components (via context provider)
 */

import { headers, cookies } from 'next/headers';
import { cache } from 'react';
import { getDefaultSiteId, getDefaultSiteName } from '@/config/sites';

export interface TenantContext {
  siteId: string;
  siteName: string;
  locale: 'en' | 'ar';
  hostname: string;
  isRTL: boolean;
}

export interface VisitorContext {
  visitorId: string | null;
  sessionId: string | null;
  utmData: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  } | null;
}

/**
 * Get tenant context from request headers (Server Components & API Routes)
 * Uses React cache to dedupe calls within a request
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const headersList = await headers();

  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const siteName = headersList.get('x-site-name') || getDefaultSiteName();
  const locale = (headersList.get('x-site-locale') || 'en') as 'en' | 'ar';
  const hostname = headersList.get('x-hostname') || 'localhost:3000';

  return {
    siteId,
    siteName,
    locale,
    hostname,
    isRTL: locale === 'ar',
  };
});

/**
 * Get visitor context from cookies (Server Components & API Routes)
 */
export const getVisitorContext = cache(async (): Promise<VisitorContext> => {
  const cookieStore = await cookies();

  const visitorId = cookieStore.get('visitor_id')?.value || null;
  const sessionId = cookieStore.get('session_id')?.value || null;
  const utmDataRaw = cookieStore.get('utm_data')?.value;

  let utmData = null;
  if (utmDataRaw) {
    try {
      utmData = JSON.parse(utmDataRaw);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return {
    visitorId,
    sessionId,
    utmData,
  };
});

/**
 * Synchronous tenant context for API routes (use in route handlers)
 */
export function getTenantFromHeaders(headersList: Headers): TenantContext {
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const siteName = headersList.get('x-site-name') || getDefaultSiteName();
  const locale = (headersList.get('x-site-locale') || 'en') as 'en' | 'ar';
  const hostname = headersList.get('x-hostname') || 'localhost:3000';

  return {
    siteId,
    siteName,
    locale,
    hostname,
    isRTL: locale === 'ar',
  };
}

/**
 * Helper to get UTM data from cookies
 */
export function getUTMFromCookies(cookieHeader: string | null): VisitorContext['utmData'] {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  const utmDataRaw = cookies['utm_data'];
  if (!utmDataRaw) return null;

  try {
    return JSON.parse(decodeURIComponent(utmDataRaw));
  } catch {
    return null;
  }
}
