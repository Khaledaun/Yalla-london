import { headers } from "next/headers";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

/**
 * Get the base URL for the current site context.
 * Priority: x-hostname header -> NEXT_PUBLIC_SITE_URL env -> config default
 *
 * Uses async headers() (Next.js 15 pattern). Safe to call from server
 * components and route handlers. Falls back gracefully during build or
 * when headers are unavailable (e.g. static generation).
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const hostname = headersList.get("x-hostname");
    if (hostname) {
      const protocol = hostname.startsWith("localhost") ? "http" : "https";
      return `${protocol}://${hostname}`;
    }
  } catch {
    // headers() not available (e.g., during build or in client components)
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // getSiteDomain() already returns "https://www.{domain}"
  return getSiteDomain(getDefaultSiteId());
}

/**
 * Get base URL from explicit site ID (for non-request contexts like cron jobs).
 * Does NOT read headers — safe to call anywhere.
 *
 * getSiteDomain() returns the full URL including protocol and www prefix,
 * e.g. "https://www.yalla-london.com"
 */
export function getBaseUrlForSite(siteId: string): string {
  return getSiteDomain(siteId);
}
