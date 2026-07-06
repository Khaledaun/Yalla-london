/**
 * Master Audit Engine — Canonical Validator
 *
 * Validates canonical URLs:
 * - Present on all indexable pages
 * - Valid URL format
 * - Self-referencing or pointing to correct canonical
 * - No disallowed query parameters
 */

import type { AuditIssue, ExtractedSignals, AuditConfig } from '../types';

/**
 * Normalize a URL for comparison (lowercase host, strip trailing slash, sort params).
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    // Strip trailing slash from pathname (but keep root /)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

export function validateCanonical(
  signals: ExtractedSignals,
  pageUrl: string,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Skip validation for noindexed pages
  if (
    signals.robotsMeta &&
    signals.robotsMeta.toLowerCase().includes('noindex')
  ) {
    return issues;
  }

  // ---- Missing canonical ----
  if (!signals.canonical) {
    issues.push({
      severity: 'P1',
      category: 'canonical',
      url: pageUrl,
      message: 'Missing canonical tag on indexable page',
      suggestedFix: {
        scope: 'systemic',
        target: 'Page template / generateMetadata()',
        notes:
          'Add <link rel="canonical" href="..."> to the page head. ' +
          'For Next.js, use generateMetadata() to return canonical.',
      },
    });
    return issues; // No further canonical checks possible
  }

  // ---- Invalid URL format ----
  let canonicalParsed: URL;
  try {
    canonicalParsed = new URL(signals.canonical);
  } catch {
    issues.push({
      severity: 'P0',
      category: 'canonical',
      url: pageUrl,
      message: `Invalid canonical URL format: "${signals.canonical}"`,
      evidence: { snippet: signals.canonical },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes: 'Fix the canonical URL to be a valid absolute URL.',
      },
    });
    return issues;
  }

  // ---- Non-HTTPS canonical ----
  if (canonicalParsed.protocol !== 'https:') {
    issues.push({
      severity: 'P1',
      category: 'canonical',
      url: pageUrl,
      message: `Canonical URL uses ${canonicalParsed.protocol} instead of https:`,
      evidence: { snippet: signals.canonical },
      suggestedFix: {
        scope: 'systemic',
        target: 'Canonical URL generation',
        notes: 'Ensure all canonical URLs use HTTPS protocol.',
      },
    });
  }

  // ---- Self-referencing check ----
  const normalizedCanonical = normalizeUrl(signals.canonical);
  const normalizedPage = normalizeUrl(pageUrl);

  if (normalizedCanonical !== normalizedPage) {
    // Not self-referencing — this is intentional for canonical consolidation,
    // but worth noting as it could be misconfigured
    issues.push({
      severity: 'P2',
      category: 'canonical',
      url: pageUrl,
      message: `Non-self-referencing canonical: points to "${signals.canonical}"`,
      evidence: {
        snippet: `Page: ${pageUrl}\nCanonical: ${signals.canonical}`,
      },
      suggestedFix: {
        scope: 'page-level',
        target: pageUrl,
        notes:
          'Verify this is intentional consolidation. If not, update canonical to point to self.',
      },
    });
  }

  // ---- Disallowed query parameters ----
  const allowedParams = new Set(config.validators.allowedCanonicalParams);
  const canonicalParams = Array.from(canonicalParsed.searchParams.keys());
  const disallowedParams = canonicalParams.filter(
    (p) => !allowedParams.has(p)
  );

  if (disallowedParams.length > 0) {
    issues.push({
      severity: 'P1',
      category: 'canonical',
      url: pageUrl,
      message: `Canonical URL contains disallowed query parameters: ${disallowedParams.join(', ')}`,
      evidence: { snippet: signals.canonical },
      suggestedFix: {
        scope: 'systemic',
        target: 'Canonical URL generation',
        notes: `Remove query parameters [${disallowedParams.join(', ')}] from canonical URL. ` +
          `Allowed: [${config.validators.allowedCanonicalParams.join(', ') || 'none'}].`,
      },
    });
  }

  // ---- Canonical points to different domain ----
  try {
    const pageHost = new URL(pageUrl).hostname;
    if (canonicalParsed.hostname !== pageHost) {
      issues.push({
        severity: 'P1',
        category: 'canonical',
        url: pageUrl,
        message: `Canonical points to different domain: ${canonicalParsed.hostname} (page is on ${pageHost})`,
        evidence: { snippet: signals.canonical },
        suggestedFix: {
          scope: 'page-level',
          target: pageUrl,
          notes: 'Cross-domain canonicals are rarely correct. Verify this is intentional.',
        },
      });
    }
  } catch {
    // pageUrl parse failure — already covered by other checks
  }

  return issues;
}
