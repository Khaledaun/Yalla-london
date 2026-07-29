/**
 * Master Audit Engine — Signal Extractor
 *
 * Extracts SEO-relevant signals from HTML using regex-based parsing.
 * No jsdom or cheerio dependency — pure string/regex operations.
 *
 * Handles edge cases:
 * - Multi-line attributes
 * - Single and double quotes
 * - Self-closing tags
 * - Case-insensitive matching
 */

import type { ExtractedSignals, HeadingEntry, HreflangEntry, LinkEntry } from './types';

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

/**
 * Decode common HTML entities.
 */
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/**
 * Extract an attribute value from a tag string.
 * Handles: attr="value", attr='value', attr=value
 */
function getAttr(tag: string, attrName: string): string | null {
  // Double-quoted
  const dqRegex = new RegExp(
    `${attrName}\\s*=\\s*"([^"]*)"`,
    'i'
  );
  const dqMatch = tag.match(dqRegex);
  if (dqMatch) return decodeEntities(dqMatch[1]);

  // Single-quoted
  const sqRegex = new RegExp(
    `${attrName}\\s*=\\s*'([^']*)'`,
    'i'
  );
  const sqMatch = tag.match(sqRegex);
  if (sqMatch) return decodeEntities(sqMatch[1]);

  // Unquoted
  const uqRegex = new RegExp(
    `${attrName}\\s*=\\s*([^\\s>]+)`,
    'i'
  );
  const uqMatch = tag.match(uqRegex);
  if (uqMatch) return decodeEntities(uqMatch[1]);

  return null;
}

/**
 * Extract inner content between opening and closing tags.
 */
function getTagContent(
  html: string,
  tagName: string
): string | null {
  const regex = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    'i'
  );
  const match = html.match(regex);
  return match ? decodeEntities(match[1].trim()) : null;
}

/**
 * Strip HTML tags from a string, returning text content.
 */
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a URL is internal relative to the base URL.
 */
function isInternalUrl(href: string, baseUrl: string): boolean {
  // Relative URLs are internal
  if (href.startsWith('/') && !href.startsWith('//')) {
    return true;
  }
  if (href.startsWith('#') || href.startsWith('?')) {
    return true;
  }
  // Protocol-relative
  if (href.startsWith('//')) {
    try {
      const baseHost = new URL(baseUrl).hostname;
      const hrefHost = href.replace(/^\/\//, '').split('/')[0].split(':')[0];
      return hrefHost === baseHost;
    } catch {
      return false;
    }
  }
  // Absolute URLs — compare hostnames
  try {
    const baseHost = new URL(baseUrl).hostname;
    const hrefHost = new URL(href).hostname;
    return hrefHost === baseHost;
  } catch {
    return false;
  }
}

/**
 * Resolve a potentially relative URL against a base.
 */
function resolveUrl(href: string, pageUrl: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return href;
  }
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

/**
 * Extract SEO signals from an HTML document.
 *
 * @param html - Raw HTML string
 * @param pageUrl - The URL this HTML was fetched from
 * @param baseUrl - The site's base URL (for internal/external link classification)
 */
export function extractSignals(
  html: string,
  pageUrl: string,
  baseUrl: string
): ExtractedSignals {
  // ---- Title ----
  const title = getTagContent(html, 'title');

  // ---- Meta Description ----
  let metaDescription: string | null = null;
  const metaDescRegex =
    /<meta\s[^>]*name\s*=\s*["']description["'][^>]*>/gi;
  const metaDescMatch = html.match(metaDescRegex);
  if (metaDescMatch) {
    metaDescription = getAttr(metaDescMatch[0], 'content');
  }

  // ---- Canonical ----
  let canonical: string | null = null;
  const canonicalRegex =
    /<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*\/?>/gi;
  const canonicalMatch = html.match(canonicalRegex);
  if (canonicalMatch) {
    canonical = getAttr(canonicalMatch[0], 'href');
  }

  // ---- Robots Meta ----
  let robotsMeta: string | null = null;
  const robotsRegex =
    /<meta\s[^>]*name\s*=\s*["']robots["'][^>]*>/gi;
  const robotsMatch = html.match(robotsRegex);
  if (robotsMatch) {
    robotsMeta = getAttr(robotsMatch[0], 'content');
  }

  // ---- Hreflang Alternates ----
  const hreflangAlternates: HreflangEntry[] = [];
  const hreflangRegex =
    /<link\s[^>]*rel\s*=\s*["']alternate["'][^>]*hreflang\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
  let hreflangMatch: RegExpExecArray | null;
  while ((hreflangMatch = hreflangRegex.exec(html)) !== null) {
    const hreflang = hreflangMatch[1];
    const href = getAttr(hreflangMatch[0], 'href');
    if (hreflang && href) {
      hreflangAlternates.push({ hreflang, href });
    }
  }
  // Also match when hreflang comes before rel
  const hreflangRegex2 =
    /<link\s[^>]*hreflang\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']alternate["'][^>]*\/?>/gi;
  while ((hreflangMatch = hreflangRegex2.exec(html)) !== null) {
    const hreflang = hreflangMatch[1];
    const href = getAttr(hreflangMatch[0], 'href');
    if (
      hreflang &&
      href &&
      !hreflangAlternates.some(
        (h) => h.hreflang === hreflang && h.href === href
      )
    ) {
      hreflangAlternates.push({ hreflang, href });
    }
  }

  // ---- Headings ----
  const headings: HeadingEntry[] = [];
  const headingRegex = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(html)) !== null) {
    const level = parseInt(headingMatch[1].charAt(1), 10);
    const text = stripTags(headingMatch[2]).trim();
    if (text) {
      headings.push({ level, text });
    }
  }

  // ---- JSON-LD ----
  const jsonLd: unknown[] = [];
  const jsonLdRegex =
    /<script\s[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1].trim());
      jsonLd.push(parsed);
    } catch {
      // Invalid JSON-LD — still record as raw string for flagging
      jsonLd.push({ _parseError: true, _raw: jsonLdMatch[1].trim().slice(0, 500) });
    }
  }

  // ---- Links (internal + external) ----
  const internalLinks: LinkEntry[] = [];
  const externalLinks: LinkEntry[] = [];
  const seenHrefs = new Set<string>();

  const linkRegex = /<a\s([^>]*)>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const attrs = linkMatch[1];
    const anchorText = stripTags(linkMatch[2]).trim();
    const href = getAttr(`<a ${attrs}>`, 'href');
    const rel = getAttr(`<a ${attrs}>`, 'rel') ?? undefined;

    if (!href) continue;

    // Skip fragment-only, mailto:, tel:, javascript:
    if (
      href === '#' ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue;
    }

    const resolvedHref = resolveUrl(href, pageUrl);
    const dedupeKey = resolvedHref.replace(/\/$/, '');

    if (seenHrefs.has(dedupeKey)) continue;
    seenHrefs.add(dedupeKey);

    const entry: LinkEntry = { href: resolvedHref, text: anchorText };
    if (rel) entry.rel = rel;

    if (isInternalUrl(href, baseUrl)) {
      internalLinks.push(entry);
    } else {
      externalLinks.push(entry);
    }
  }

  // ---- Language & Direction ----
  let langAttr: string | null = null;
  const htmlTagRegex = /<html\s[^>]*>/i;
  const htmlTagMatch = html.match(htmlTagRegex);
  if (htmlTagMatch) {
    langAttr = getAttr(htmlTagMatch[0], 'lang');
  }

  let dirAttr: string | null = null;
  if (htmlTagMatch) {
    dirAttr = getAttr(htmlTagMatch[0], 'dir');
  }
  if (!dirAttr) {
    const bodyTagRegex = /<body\s[^>]*>/i;
    const bodyTagMatch = html.match(bodyTagRegex);
    if (bodyTagMatch) {
      dirAttr = getAttr(bodyTagMatch[0], 'dir');
    }
  }

  // ---- Word Count ----
  // Extract text from <body> only, stripping scripts/styles
  let bodyHtml = html;
  const bodyExtract = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyExtract) {
    bodyHtml = bodyExtract[1];
  }
  const textContent = stripTags(bodyHtml);
  const wordCount = textContent
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return {
    title,
    metaDescription,
    canonical,
    robotsMeta,
    hreflangAlternates,
    headings,
    jsonLd,
    internalLinks,
    externalLinks,
    langAttr,
    dirAttr,
    wordCount,
  };
}
