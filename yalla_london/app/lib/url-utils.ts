import { headers } from "next/headers";
import { getSiteDomain, getDefaultSiteId, getSiteConfig } from "@/config/sites";

/**
 * Read the site's primary locale from request headers (set by middleware
 * based on hostname → tenant mapping). Falls back to the config default.
 *
 * - yalla-london, zenitha-yachts-med → "en"  (AR served under /ar/*)
 * - arabaldives → "ar"                        (EN served under /en/* if added)
 */
async function getSitePrimaryLocale(): Promise<"en" | "ar"> {
  try {
    const h = await headers();
    const headerLocale = h.get("x-site-locale");
    if (headerLocale === "ar") return "ar";
    if (headerLocale === "en") return "en";
    const siteId = h.get("x-site-id") || getDefaultSiteId();
    const config = getSiteConfig(siteId);
    return config?.locale === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

/**
 * Effective content locale for the current request.
 *
 *   pathLocale ("ar" if URL has /ar/ prefix, else "en") + sitePrimaryLocale
 *   → actual language of the content served at this URL.
 *
 * For EN-primary sites, root URLs serve English and /ar/* serves Arabic.
 * For AR-primary sites (arabaldives), root URLs serve Arabic; /en/* would
 * serve English if ever added. Until /en/* exists, root-URL AR-primary
 * sites always resolve to "ar".
 */
async function getEffectiveLocale(): Promise<"en" | "ar"> {
  try {
    const h = await headers();
    const pathLocale = h.get("x-locale") === "ar" ? "ar" : "en";
    if (pathLocale === "ar") return "ar";
    // EN path — but if site is AR-primary and URL has no /en/ prefix,
    // the root URL actually serves Arabic.
    const primary = await getSitePrimaryLocale();
    return primary;
  } catch {
    return "en";
  }
}

/**
 * Per-site URL builder that produces the correct EN + AR URL for a base path,
 * respecting the site's primary locale.
 */
async function getLocaleUrls(basePath: string): Promise<{ enUrl: string; arUrl: string; primary: "en" | "ar" }> {
  const baseUrl = await getBaseUrl();
  const primary = await getSitePrimaryLocale();
  if (primary === "ar") {
    // AR is canonical at root; EN fallback lives under /en/* (if/when added).
    return {
      arUrl: `${baseUrl}${basePath}`,
      enUrl: `${baseUrl}/en${basePath}`,
      primary,
    };
  }
  return {
    enUrl: `${baseUrl}${basePath}`,
    arUrl: `${baseUrl}/ar${basePath}`,
    primary,
  };
}

/**
 * Get a locale-aware canonical URL.
 * Respects the site's primary locale — Arabic-primary sites canonicalize to
 * the root URL, English-primary sites canonicalize to /ar/... for Arabic.
 */
export async function getLocaleAwareCanonical(basePath: string = ""): Promise<string> {
  const locale = await getEffectiveLocale();
  const { enUrl, arUrl } = await getLocaleUrls(basePath);
  return locale === "ar" ? arUrl : enUrl;
}

/**
 * Get the full `alternates` block for Next.js Metadata — canonical + hreflang
 * with correct per-locale URLs AND the correct set of alternates for the
 * site's URL structure.
 *
 * - EN-primary sites emit en-GB + ar-SA + x-default (EN is default).
 * - AR-primary sites emit ar-SA + x-default (AR is default). en-GB is
 *   omitted unless an /en/* fallback route is available on the platform.
 *
 * hreflang URLs MUST point to the actual language version. Google ignores
 * hreflang when an en-GB entry resolves to the same URL as ar-SA, causing
 * "Duplicate — alternate page with canonical" in GSC.
 *
 * Usage:
 *   const alternates = await getLocaleAlternates("/hotels");
 *   return { ..., alternates };
 */
export async function getLocaleAlternates(basePath: string = ""): Promise<{
  canonical: string;
  languages: Record<string, string>;
}> {
  const locale = await getEffectiveLocale();
  const { enUrl, arUrl, primary } = await getLocaleUrls(basePath);
  const canonical = locale === "ar" ? arUrl : enUrl;
  if (primary === "ar") {
    // AR-primary site: emit only the languages that resolve to real content.
    // en-GB would point at /en/* which does not yet exist — omitting it
    // avoids promising Google an English version that returns 404.
    return {
      canonical,
      languages: {
        "ar-SA": arUrl,
        "x-default": arUrl,
      },
    };
  }
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
