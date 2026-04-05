/**
 * Master Audit Engine — Inventory Builder
 *
 * Builds the URL inventory from multiple sources:
 * 1. Sitemap XML (/sitemap.xml)
 * 2. Static routes from config
 * 3. Arabic variants (/ar/...) if enabled
 *
 * Deduplicates and filters by exclude patterns.
 */

import type { AuditConfig, UrlInventoryEntry } from './types';

// ---------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------

/**
 * Fetch and parse sitemap XML from the given URL.
 * Uses simple regex extraction of <loc> elements.
 * Handles both regular sitemaps and sitemap index files.
 */
async function parseSitemap(
  sitemapUrl: string,
  timeoutMs: number
): Promise<{ urls: string[]; xml: string }> {
  let xml = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'YallaAuditBot/1.0',
        Accept: 'application/xml, text/xml, */*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(
        `[master-audit/inventory] Sitemap fetch failed: ${response.status} ${response.statusText} for ${sitemapUrl}`
      );
      return { urls: [], xml: '' };
    }

    xml = await response.text();
  } catch (err) {
    console.warn(
      `[master-audit/inventory] Sitemap fetch error for ${sitemapUrl}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { urls: [], xml: '' };
  }

  // Check if this is a sitemap index (contains <sitemap> elements)
  const isSitemapIndex = /<sitemap>/i.test(xml);

  if (isSitemapIndex) {
    // Extract child sitemap URLs
    const childUrls: string[] = [];
    const sitemapLocRegex =
      /<sitemap>\s*<loc>\s*(.*?)\s*<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = sitemapLocRegex.exec(xml)) !== null) {
      const loc = match[1].trim();
      if (loc) {
        childUrls.push(loc);
      }
    }

    // Recursively parse child sitemaps
    const allUrls: string[] = [];
    let allXml = xml;
    for (const childUrl of childUrls) {
      const child = await parseSitemap(childUrl, timeoutMs);
      allUrls.push(...child.urls);
      allXml += '\n' + child.xml;
    }

    return { urls: allUrls, xml: allXml };
  }

  // Regular sitemap — extract <loc> elements
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const loc = match[1].trim();
    if (loc) {
      // Decode XML entities
      const decoded = loc
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      urls.push(decoded);
    }
  }

  return { urls, xml };
}

// ---------------------------------------------------------------------------
// Glob matching
// ---------------------------------------------------------------------------

/**
 * Simple glob pattern matching.
 * Supports: * (any characters except /), ** (any characters including /), ? (single char)
 */
function matchesGlob(url: string, pattern: string): boolean {
  // Convert glob to regex
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '{{DOUBLESTAR}}') // Placeholder for **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/\?/g, '.') // ? matches single char
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*'); // ** matches anything

  // Match against the path portion of the URL
  try {
    const urlObj = new URL(url);
    const pathToMatch = urlObj.pathname + urlObj.search;
    return new RegExp(`^${regex}$`).test(pathToMatch);
  } catch {
    // If URL parsing fails, match against the full string
    return new RegExp(`^${regex}$`).test(url);
  }
}

/**
 * Check if a URL matches any of the exclude patterns.
 */
function isExcluded(url: string, excludePatterns: string[]): boolean {
  return excludePatterns.some((pattern) => matchesGlob(url, pattern));
}

// ---------------------------------------------------------------------------
// Arabic variant generation
// ---------------------------------------------------------------------------

/**
 * Generate the Arabic variant URL for a given English URL.
 * /blog/my-article -> /ar/blog/my-article
 * / -> /ar/
 *
 * If the URL already starts with /ar/, returns null (no double-nesting).
 */
function generateArVariant(
  url: string,
  baseUrl: string
): string | null {
  try {
    const urlObj = new URL(url, baseUrl);
    const pathname = urlObj.pathname;

    // Already an Arabic variant
    if (pathname.startsWith('/ar/') || pathname === '/ar') {
      return null;
    }

    const arPathname = '/ar' + (pathname.startsWith('/') ? '' : '/') + pathname;
    urlObj.pathname = arPathname;
    return urlObj.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the complete URL inventory for an audit run.
 *
 * Sources:
 * 1. Sitemap XML from <baseUrl>/sitemap.xml
 * 2. Static routes from config
 * 3. Arabic variants (if includeArVariants is true)
 *
 * All URLs are deduplicated and filtered by exclude patterns.
 *
 * Returns both the URL list and the raw sitemap XML (for sitemap validation).
 */
export async function buildInventory(
  config: AuditConfig,
  baseUrl: string
): Promise<{ urls: string[]; inventory: UrlInventoryEntry[]; sitemapXml: string }> {
  const seen = new Set<string>();
  const inventory: UrlInventoryEntry[] = [];

  // Normalize base URL (strip trailing slash)
  const normalizedBase = baseUrl.replace(/\/+$/, '');

  // 1. Sitemap URLs
  const sitemapUrl = `${normalizedBase}/sitemap.xml`;
  const { urls: sitemapUrls, xml: sitemapXml } = await parseSitemap(
    sitemapUrl,
    config.crawl.timeoutMs
  );

  for (const url of sitemapUrls) {
    const normalized = url.replace(/\/+$/, '') || '/';
    if (!seen.has(normalized) && !isExcluded(url, config.validators.excludePatterns)) {
      seen.add(normalized);
      inventory.push({ url: normalized, source: 'sitemap' });
    }
  }

  // 2. Static routes
  for (const route of config.staticRoutes) {
    const fullUrl = route.startsWith('http')
      ? route
      : `${normalizedBase}${route.startsWith('/') ? '' : '/'}${route}`;
    const normalized = fullUrl.replace(/\/+$/, '') || normalizedBase;

    if (!seen.has(normalized) && !isExcluded(fullUrl, config.validators.excludePatterns)) {
      seen.add(normalized);
      inventory.push({ url: normalized, source: 'static' });
    }
  }

  // 3. Arabic variants
  if (config.includeArVariants) {
    const currentUrls = [...inventory]; // Snapshot before adding variants
    for (const entry of currentUrls) {
      const arUrl = generateArVariant(entry.url, normalizedBase);
      if (arUrl) {
        const normalizedAr = arUrl.replace(/\/+$/, '');
        if (
          !seen.has(normalizedAr) &&
          !isExcluded(arUrl, config.validators.excludePatterns)
        ) {
          seen.add(normalizedAr);
          inventory.push({ url: normalizedAr, source: 'ar-variant' });
        }
      }
    }
  }

  console.log(
    `[master-audit/inventory] Built inventory: ${inventory.length} URLs ` +
      `(${inventory.filter((e) => e.source === 'sitemap').length} sitemap, ` +
      `${inventory.filter((e) => e.source === 'static').length} static, ` +
      `${inventory.filter((e) => e.source === 'ar-variant').length} ar-variant)`
  );

  return {
    urls: inventory.map((e) => e.url),
    inventory,
    sitemapXml,
  };
}
