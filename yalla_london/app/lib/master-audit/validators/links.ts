/**
 * Master Audit Engine — Links Validator
 *
 * Validates internal links across all crawled pages:
 * - Cross-references internal link targets against crawl results
 * - Flags any internal links pointing to non-200 pages
 * - Identifies orphan pages (no inbound internal links)
 */

import type { AuditIssue, ExtractedSignals, CrawlResult, AuditConfig } from '../types';

/**
 * Normalize URL for matching (lowercase host, strip trailing slash, strip fragment).
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url.replace(/\/$/, '').replace(/#.*$/, '');
  }
}

export function validateLinks(
  allSignals: Map<string, ExtractedSignals>,
  crawlResults: Map<string, CrawlResult>,
  _config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Build a set of all crawled URLs (normalized) for cross-reference
  const crawledUrlMap = new Map<string, CrawlResult>();
  for (const [url, result] of crawlResults) {
    crawledUrlMap.set(normalizeUrl(url), result);
  }

  // Track which crawled pages have inbound internal links
  const inboundLinkCount = new Map<string, number>();
  for (const url of crawlResults.keys()) {
    inboundLinkCount.set(normalizeUrl(url), 0);
  }

  // Track broken links to avoid duplicates
  const brokenLinksReported = new Set<string>();

  // ---- Check each page's internal links ----
  for (const [pageUrl, signals] of allSignals) {
    for (const link of signals.internalLinks) {
      const normalizedTarget = normalizeUrl(link.href);

      // Track inbound links
      const currentCount = inboundLinkCount.get(normalizedTarget);
      if (currentCount !== undefined) {
        inboundLinkCount.set(normalizedTarget, currentCount + 1);
      }

      // Cross-reference against crawl results
      const targetResult = crawledUrlMap.get(normalizedTarget);
      if (!targetResult) {
        // Target wasn't crawled — could be excluded or not in inventory
        continue;
      }

      // Flag if target returned non-200
      if (targetResult.status !== 200 && targetResult.status !== 0) {
        const dedupeKey = `${pageUrl}→${normalizedTarget}`;
        if (!brokenLinksReported.has(dedupeKey)) {
          brokenLinksReported.add(dedupeKey);

          const severity = targetResult.status === 404 ? 'P1' : 'P2';
          issues.push({
            severity,
            category: 'links',
            url: pageUrl,
            message: `Internal link to "${link.href}" returns HTTP ${targetResult.status}`,
            evidence: {
              snippet: `Anchor text: "${link.text}"\nTarget: ${link.href}\nStatus: ${targetResult.status}`,
            },
            suggestedFix: {
              scope: 'page-level',
              target: pageUrl,
              notes:
                targetResult.status === 404
                  ? `Remove or update the broken link to "${link.href}". The target page does not exist.`
                  : `The link to "${link.href}" returns ${targetResult.status}. Update or fix the target page.`,
            },
          });
        }
      }

      // Flag if target has an error (connection failure)
      if (targetResult.error && targetResult.status === 0) {
        const dedupeKey = `${pageUrl}→${normalizedTarget}→error`;
        if (!brokenLinksReported.has(dedupeKey)) {
          brokenLinksReported.add(dedupeKey);
          issues.push({
            severity: 'P1',
            category: 'links',
            url: pageUrl,
            message: `Internal link to "${link.href}" failed to connect: ${targetResult.error}`,
            evidence: {
              snippet: `Anchor text: "${link.text}"\nTarget: ${link.href}\nError: ${targetResult.error}`,
            },
            suggestedFix: {
              scope: 'page-level',
              target: pageUrl,
              notes: `Fix or remove the internal link to "${link.href}".`,
            },
          });
        }
      }
    }
  }

  // ---- Orphan pages (no inbound internal links) ----
  // Exclude the homepage from orphan check
  for (const [url, count] of inboundLinkCount) {
    if (count === 0) {
      try {
        const urlObj = new URL(url);
        // Skip homepage and common standalone pages
        if (
          urlObj.pathname === '/' ||
          urlObj.pathname === '/ar' ||
          urlObj.pathname === '/ar/'
        ) {
          continue;
        }
      } catch {
        // Can't parse URL — still flag it
      }

      issues.push({
        severity: 'P2',
        category: 'links',
        url,
        message: 'Orphan page: no internal links point to this page',
        suggestedFix: {
          scope: 'systemic',
          target: 'Internal linking strategy',
          notes: `Add internal links from relevant pages to ${url}. Orphan pages are harder for search engines to discover and rank.`,
        },
      });
    }
  }

  return issues;
}
