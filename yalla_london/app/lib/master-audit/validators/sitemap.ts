/**
 * Master Audit Engine — Sitemap Validator
 *
 * Validates sitemap XML:
 * - Parse XML successfully
 * - All URLs return 200
 * - No noindexed URLs in sitemap
 * - URL count within limits
 * - Proper XML structure
 */

import type { AuditIssue, CrawlResult, AuditConfig } from '../types';

/**
 * Extract <loc> URLs from sitemap XML.
 */
function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const loc = match[1]
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    if (loc) {
      urls.push(loc);
    }
  }
  return urls;
}

export function validateSitemap(
  sitemapXml: string,
  crawlResults: Map<string, CrawlResult>,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const sitemapSourceUrl = `${config.baseUrl}/sitemap.xml`;

  // ---- Empty or missing sitemap ----
  if (!sitemapXml || sitemapXml.trim().length === 0) {
    issues.push({
      severity: 'P0',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: 'Sitemap XML is empty or could not be fetched',
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes:
          'Ensure /sitemap.xml returns valid XML. For Next.js, verify sitemap.ts or sitemap.xml route exists.',
      },
    });
    return issues;
  }

  // ---- Not valid XML ----
  if (
    !sitemapXml.includes('<urlset') &&
    !sitemapXml.includes('<sitemapindex')
  ) {
    issues.push({
      severity: 'P0',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: 'Sitemap does not contain valid <urlset> or <sitemapindex> element',
      evidence: { snippet: sitemapXml.slice(0, 200) },
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes: 'Fix sitemap to output valid XML with proper urlset or sitemapindex root element.',
      },
    });
    return issues;
  }

  // ---- Missing XML namespace ----
  if (
    sitemapXml.includes('<urlset') &&
    !sitemapXml.includes('sitemaps.org')
  ) {
    issues.push({
      severity: 'P2',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: 'Sitemap missing standard XML namespace (xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")',
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes: 'Add xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" to the <urlset> element.',
      },
    });
  }

  // Extract URLs from sitemap
  const sitemapUrls = extractSitemapUrls(sitemapXml);

  // ---- URL count ----
  if (sitemapUrls.length === 0) {
    issues.push({
      severity: 'P0',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: 'Sitemap contains no URLs',
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes: 'Sitemap must contain at least one <url><loc>...</loc></url> entry.',
      },
    });
    return issues;
  }

  if (sitemapUrls.length > config.validators.maxSitemapUrls) {
    issues.push({
      severity: 'P1',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: `Sitemap contains ${sitemapUrls.length} URLs (max: ${config.validators.maxSitemapUrls}). Split into multiple sitemaps.`,
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes: `Google recommends max 50,000 URLs per sitemap. Use a sitemap index to split.`,
      },
    });
  }

  // ---- Check each URL in sitemap ----
  const nonOkUrls: string[] = [];
  const noindexedInSitemap: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    const normalizedUrl = sitemapUrl.replace(/\/$/, '') || sitemapUrl;

    // Find matching crawl result (try both with and without trailing slash)
    const crawlResult =
      crawlResults.get(normalizedUrl) ??
      crawlResults.get(sitemapUrl) ??
      crawlResults.get(sitemapUrl + '/');

    if (!crawlResult) {
      // URL wasn't crawled — can't validate status
      continue;
    }

    // Non-200 status in sitemap
    if (crawlResult.status !== 200) {
      nonOkUrls.push(sitemapUrl);
    }
  }

  if (nonOkUrls.length > 0) {
    // Report up to 20 individual URLs, then summarize
    const urlsToReport = nonOkUrls.slice(0, 20);
    for (const badUrl of urlsToReport) {
      const result = crawlResults.get(badUrl.replace(/\/$/, '')) ??
        crawlResults.get(badUrl);
      const status = result?.status ?? 'unknown';
      issues.push({
        severity: 'P1',
        category: 'sitemap',
        url: badUrl,
        message: `URL in sitemap returns HTTP ${status} (should be 200)`,
        suggestedFix: {
          scope: 'page-level',
          target: badUrl,
          notes:
            status === 404
              ? 'Remove this URL from the sitemap or create the page.'
              : `Fix the page to return 200 or remove from sitemap.`,
        },
      });
    }
    if (nonOkUrls.length > 20) {
      issues.push({
        severity: 'P1',
        category: 'sitemap',
        url: sitemapSourceUrl,
        message: `${nonOkUrls.length} total non-200 URLs in sitemap (showing first 20 individually)`,
        suggestedFix: {
          scope: 'systemic',
          target: 'Sitemap generation',
          notes: 'Clean up sitemap to only include URLs that return 200.',
        },
      });
    }
  }

  // ---- Noindexed URLs in sitemap ----
  // This check uses crawl results that include extracted signals
  // We iterate crawl results to find noindexed pages that are in the sitemap
  const sitemapUrlSet = new Set(
    sitemapUrls.map((u) => u.replace(/\/$/, '') || u)
  );

  for (const [crawledUrl, result] of crawlResults) {
    const normalizedCrawled = crawledUrl.replace(/\/$/, '') || crawledUrl;
    if (!sitemapUrlSet.has(normalizedCrawled)) continue;

    // Check for noindex in X-Robots-Tag header
    const xRobotsTag = result.headers['x-robots-tag'];
    if (xRobotsTag && xRobotsTag.toLowerCase().includes('noindex')) {
      noindexedInSitemap.push(crawledUrl);
    }
  }

  for (const noindexUrl of noindexedInSitemap) {
    issues.push({
      severity: 'P1',
      category: 'sitemap',
      url: noindexUrl,
      message: 'Noindexed URL found in sitemap (X-Robots-Tag)',
      suggestedFix: {
        scope: 'page-level',
        target: noindexUrl,
        notes:
          'Remove this URL from the sitemap or remove the noindex directive. ' +
          'Having both is contradictory.',
      },
    });
  }

  // ---- Duplicate URLs in sitemap ----
  const urlCounts = new Map<string, number>();
  for (const u of sitemapUrls) {
    const normalized = u.replace(/\/$/, '') || u;
    urlCounts.set(normalized, (urlCounts.get(normalized) ?? 0) + 1);
  }
  const duplicates = Array.from(urlCounts.entries()).filter(
    ([, count]) => count > 1
  );
  if (duplicates.length > 0) {
    issues.push({
      severity: 'P2',
      category: 'sitemap',
      url: sitemapSourceUrl,
      message: `${duplicates.length} duplicate URL(s) in sitemap`,
      evidence: {
        snippet: duplicates
          .slice(0, 10)
          .map(([url, count]) => `${url} (${count}x)`)
          .join('\n'),
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation',
        notes: 'Remove duplicate entries from the sitemap.',
      },
    });
  }

  return issues;
}
