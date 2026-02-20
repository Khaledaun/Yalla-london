/**
 * Master Audit Engine — HTTP Validator
 *
 * Validates HTTP responses:
 * - Status code is in allowed list
 * - Redirect chains are within limits
 * - Non-200 on indexable pages flagged
 * - Connection errors flagged
 */

import type { AuditIssue, CrawlResult, AuditConfig } from '../types';

export function validateHttp(
  result: CrawlResult,
  config: AuditConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const { allowedStatuses, maxRedirects } = config.crawl;

  // ---- Connection errors ----
  if (result.error && result.status === 0) {
    issues.push({
      severity: 'P0',
      category: 'http',
      url: result.url,
      message: `Connection failed: ${result.error}`,
      evidence: { snippet: result.error },
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Check if the page is accessible. Verify DNS, SSL, and server health.',
      },
    });
    return issues; // No further checks possible
  }

  // ---- Server errors (5xx) ----
  if (result.status >= 500) {
    issues.push({
      severity: 'P0',
      category: 'http',
      url: result.url,
      message: `Server error: HTTP ${result.status} on ${result.finalUrl}`,
      evidence: { snippet: `Status: ${result.status}` },
      suggestedFix: {
        scope: 'systemic',
        target: 'Server/Application',
        notes: `Investigate server-side error for ${result.url}. Check application logs.`,
      },
    });
  }

  // ---- Client errors (4xx) excluding expected patterns ----
  if (result.status >= 400 && result.status < 500) {
    // 404 is P1 (broken page), others are P2
    const severity = result.status === 404 ? 'P1' : 'P2';
    issues.push({
      severity,
      category: 'http',
      url: result.url,
      message: `Client error: HTTP ${result.status} on ${result.finalUrl}`,
      evidence: { snippet: `Status: ${result.status}` },
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes:
          result.status === 404
            ? 'Page not found. Remove from sitemap or create the page.'
            : `Unexpected ${result.status} status. Check access permissions and URL validity.`,
      },
    });
  }

  // ---- Status not in allowed list (but not already flagged above) ----
  if (
    !allowedStatuses.includes(result.status) &&
    result.status < 400 &&
    result.status > 0
  ) {
    issues.push({
      severity: 'P2',
      category: 'http',
      url: result.url,
      message: `Unexpected HTTP status ${result.status} (allowed: ${allowedStatuses.join(', ')})`,
      evidence: { snippet: `Status: ${result.status}` },
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Investigate why this URL returns an unexpected status code.',
      },
    });
  }

  // ---- Redirect chain too long ----
  if (result.redirectChain.length > maxRedirects) {
    issues.push({
      severity: 'P1',
      category: 'http',
      url: result.url,
      message: `Redirect chain too long: ${result.redirectChain.length} hops (max: ${maxRedirects})`,
      evidence: {
        snippet: result.redirectChain
          .map((hop) => `${hop.status} → ${hop.url}`)
          .join('\n'),
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Redirect configuration',
        notes: `Reduce redirect chain from ${result.url} to ${result.finalUrl}. Aim for direct redirect.`,
      },
    });
  }

  // ---- Any redirect is worth noting (P2) ----
  if (
    result.redirectChain.length > 0 &&
    result.redirectChain.length <= maxRedirects
  ) {
    issues.push({
      severity: 'P2',
      category: 'http',
      url: result.url,
      message: `Redirect detected: ${result.redirectChain.length} hop(s) → ${result.finalUrl}`,
      evidence: {
        snippet: result.redirectChain
          .map((hop) => `${hop.status} → ${hop.url}`)
          .join('\n'),
      },
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Consider updating internal links to point directly to the final URL.',
      },
    });
  }

  // ---- Slow response ----
  if (result.timing.durationMs > 3000) {
    issues.push({
      severity: result.timing.durationMs > 5000 ? 'P1' : 'P2',
      category: 'http',
      url: result.url,
      message: `Slow response: ${result.timing.durationMs}ms`,
      evidence: { snippet: `Duration: ${result.timing.durationMs}ms` },
      suggestedFix: {
        scope: 'systemic',
        target: 'Server performance',
        notes: `Response took ${result.timing.durationMs}ms. Investigate server-side performance.`,
      },
    });
  }

  return issues;
}
