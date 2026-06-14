/**
 * HreflangTags — Server component that renders hreflang <link> tags
 *
 * The sitemap declares hreflang alternates, but the HTML <head> must also
 * contain them for maximum SEO effect. Search engines may ignore sitemap
 * hreflang in favor of on-page hreflang.
 */

import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

interface HreflangTagsProps {
  /** Current page path without locale prefix (e.g. "/blog/my-post") */
  path: string;
  /** Base URL of the site — resolved from config if not provided */
  baseUrl?: string;
}

export function HreflangTags({ path, baseUrl }: HreflangTagsProps) {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    getSiteDomain(getDefaultSiteId());

  // Normalize path to ensure it starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Handle root path — avoid double slash
  const enUrl = normalizedPath === "/" ? base : `${base}${normalizedPath}`;
  const arUrl = normalizedPath === "/" ? `${base}/ar` : `${base}/ar${normalizedPath}`;

  return (
    <>
      <link rel="alternate" hrefLang="en-GB" href={enUrl} />
      <link rel="alternate" hrefLang="ar-SA" href={arUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />
    </>
  );
}
