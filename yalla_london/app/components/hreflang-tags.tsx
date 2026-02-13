/**
 * HreflangTags — Server component that renders hreflang <link> tags
 *
 * Fixes P2 5.1: "Missing hreflang tags in HTML head"
 * The sitemap declares hreflang alternates, but the HTML <head> must also
 * contain them for maximum SEO effect. Search engines may ignore sitemap
 * hreflang in favor of on-page hreflang.
 */

interface HreflangTagsProps {
  /** Current page path without locale prefix (e.g. "/blog/my-post") */
  path: string;
  /** Base URL of the site */
  baseUrl?: string;
}

export function HreflangTags({ path, baseUrl }: HreflangTagsProps) {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.yalla-london.com";

  // Normalize path to ensure it starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const enUrl = `${base}${normalizedPath}`;
  const arUrl = `${base}/ar${normalizedPath}`;

  return (
    <>
      <link rel="alternate" hrefLang="en-GB" href={enUrl} />
      <link rel="alternate" hrefLang="ar-SA" href={arUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />
    </>
  );
}
