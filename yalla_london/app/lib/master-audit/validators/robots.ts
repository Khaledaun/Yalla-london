/**
 * Master Audit Engine — Robots Validator
 *
 * Validates robots directives:
 * - Pages with noindex should not be in sitemap
 * - Pages with nofollow flagged
 * - Checks both <meta name="robots"> and X-Robots-Tag header
 */

import type { AuditIssue, ExtractedSignals, AuditConfig } from '../types';

/**
 * Parse robots directives from a robots content string.
 * Returns an object with boolean flags for common directives.
 */
function parseRobotsDirectives(content: string): {
  noindex: boolean;
  nofollow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  noimageindex: boolean;
  none: boolean;
} {
  const lower = content.toLowerCase();
  return {
    noindex: lower.includes('noindex'),
    nofollow: lower.includes('nofollow'),
    noarchive: lower.includes('noarchive'),
    nosnippet: lower.includes('nosnippet'),
    noimageindex: lower.includes('noimageindex'),
    none: lower.includes('none'),
  };
}

export function validateRobots(
  signals: ExtractedSignals,
  pageUrl: string,
  sitemapUrls: Set<string>,
  _config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!signals.robotsMeta) {
    // No robots meta tag — this is fine (defaults to index, follow)
    return issues;
  }

  const directives = parseRobotsDirectives(signals.robotsMeta);

  // Normalize URL for sitemap comparison
  const normalizedUrl = pageUrl.replace(/\/$/, '') || pageUrl;
  const isInSitemap =
    sitemapUrls.has(normalizedUrl) ||
    sitemapUrls.has(pageUrl) ||
    sitemapUrls.has(pageUrl + '/');

  // ---- Noindex + in sitemap = contradiction ----
  if ((directives.noindex || directives.none) && isInSitemap) {
    issues.push({
      severity: 'P1',
      category: 'robots',
      url: pageUrl,
      message: 'Noindexed page found in sitemap — contradictory signals',
      evidence: {
        snippet: `robots: "${signals.robotsMeta}"\nIn sitemap: yes`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Sitemap generation + robots directives',
        notes:
          'Either remove this URL from the sitemap or remove the noindex directive. ' +
          'Having both sends contradictory signals to search engines. ' +
          'Google will respect noindex, making the sitemap entry wasteful.',
      },
    });
  }

  // ---- Noindex on what should be an indexable page ----
  if (directives.noindex || directives.none) {
    issues.push({
      severity: 'P2',
      category: 'robots',
      url: pageUrl,
      message: `Page has noindex directive: "${signals.robotsMeta}"`,
      evidence: { snippet: `robots: "${signals.robotsMeta}"` },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes:
          'Verify this page should be noindexed. If it should be indexed, remove the noindex directive.',
      },
    });
  }

  // ---- Nofollow ----
  if (directives.nofollow || directives.none) {
    issues.push({
      severity: 'P2',
      category: 'robots',
      url: pageUrl,
      message: `Page has nofollow directive: "${signals.robotsMeta}"`,
      evidence: { snippet: `robots: "${signals.robotsMeta}"` },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes:
          'Nofollow prevents search engines from following links on this page, ' +
          'which blocks internal link equity flow. Remove unless intentional.',
      },
    });
  }

  // ---- Noarchive ----
  if (directives.noarchive) {
    issues.push({
      severity: 'P2',
      category: 'robots',
      url: pageUrl,
      message: `Page has noarchive directive: "${signals.robotsMeta}"`,
      evidence: { snippet: `robots: "${signals.robotsMeta}"` },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes:
          'Noarchive prevents search engines from showing cached version. ' +
          'Usually unnecessary for content sites.',
      },
    });
  }

  // ---- Nosnippet ----
  if (directives.nosnippet) {
    issues.push({
      severity: 'P1',
      category: 'robots',
      url: pageUrl,
      message: `Page has nosnippet directive — prevents search result snippets`,
      evidence: { snippet: `robots: "${signals.robotsMeta}"` },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes:
          'Nosnippet prevents Google from showing text snippets in search results, ' +
          'severely reducing CTR. Remove unless there is a strong legal reason.',
      },
    });
  }

  return issues;
}
