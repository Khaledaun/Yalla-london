/**
 * Issue Fingerprint — Deterministic hash for cross-run deduplication.
 *
 * Same issue on the same URL across multiple audit runs gets the same fingerprint,
 * enabling tracking of issue lifecycle (first detected, detection count, fixed).
 */

import { createHash } from 'crypto';

/**
 * Creates a deterministic fingerprint for an audit issue.
 *
 * Components: siteId + url + category + title (normalized).
 * Two issues with the same fingerprint are considered "the same issue."
 */
export function createIssueFingerprint(
  siteId: string,
  url: string,
  category: string,
  title: string
): string {
  const normalized = [
    siteId.trim().toLowerCase(),
    normalizeUrl(url),
    category.trim().toLowerCase(),
    normalizeTitle(title),
  ].join('||');

  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Normalize URL for fingerprinting: lowercase, remove trailing slash, remove query params.
 * We strip query params because the same issue on /blog?page=1 and /blog?page=2
 * is effectively the same issue.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Keep path only, lowercase, strip trailing slash
    return parsed.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  } catch {
    // If URL parsing fails, just lowercase and strip trailing slash
    return url.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Normalize title for fingerprinting: lowercase, collapse whitespace, trim.
 * This ensures minor phrasing differences don't create duplicate fingerprints.
 */
function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}
