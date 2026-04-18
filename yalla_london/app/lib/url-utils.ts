import { headers } from "next/headers";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

/**
 * Get a locale-aware canonical URL.
 * Arabic pages (/ar prefix) get canonical pointing to /ar/..., English pages to /...
 */
export async function getLocaleAwareCanonical(basePath: string = ""): Promise<string> {
  const baseUrl = await getBaseUrl();
  let locale = "en";
  try {
    const h = await headers();
    locale = h.get("x-locale") || "en";
  } catch {
    // headers() not available during build
  }
  const prefix = locale === "ar" ? "/ar" : "";
  return `${baseUrl}${prefix}${basePath}`;
}

/**
 * Get the full `alternates` block for Next.js Metadata — canonical + hreflang
 * with correct per-locale URLs.
 *
 * hreflang URLs MUST be absolute and point to the specific language version,
 * independent of which locale is currently being rendered. Google ignores
 * hreflang when an en-GB entry resolves to an Arabic URL (and vice versa),
 * causing "Duplicate — alternate page with canonical" in GSC.
 *
 * Usage:
 *   const alternates = await getLocaleAlternates("/hotels");
 *   return { ..., alternates };
 */
export async function getLocaleAlternates(basePath: string = ""): Promise<{
  canonical: string;
  languages: Record<string, string>;
}> {
  const baseUrl = await getBaseUrl();
  let locale = "en";
  try {
    const h = await headers();
    locale = h.get("x-locale") || "en";
  } catch {
    // headers() not available during build
  }
  const enUrl = `${baseUrl}${basePath}`;
  const arUrl = `${baseUrl}/ar${basePath}`;
  const canonical = locale === "ar" ? arUrl : enUrl;
  return {
    canonical,
    languages: {
      "en-GB": enUrl,
      "ar-SA": arUrl,
      "x-default": enUrl,
    },
  };
}

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
