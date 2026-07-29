/**
 * Master Audit Engine — Expired Domain Abuse Risk Scanner
 *
 * Detects patterns consistent with Google's "expired domain abuse" spam policy:
 * - Topic pivot score: content that doesn't match domain name/branding
 * - Legacy orphan patterns: old pages with no internal links and different topic
 * - Domain-content mismatch: site name suggests one topic, content is another
 *
 * Reference: Google Search Essentials — Spam policies
 * https://developers.google.com/search/docs/essentials/spam-policies
 *
 * READ-ONLY: Never mutates production data.
 */

import type { AuditIssue, ExtractedSignals, RiskScannerConfig } from '../types';

// ---------------------------------------------------------------------------
// Domain topic extraction
// ---------------------------------------------------------------------------

/**
 * Extract implied topic words from a domain name.
 * e.g., "yalla-london.com" → ["yalla", "london"]
 * e.g., "zenithayachts.com" → ["zenitha", "yachts"]
 */
function extractDomainTopics(baseUrl: string): Set<string> {
  const topics = new Set<string>();
  try {
    const hostname = new URL(baseUrl).hostname.replace('www.', '');
    // Remove TLD
    const domainPart = hostname.split('.')[0];
    // Split on common separators
    const words = domainPart
      .split(/[-_.]/)
      .flatMap((w) => {
        // Also split camelCase
        return w.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
      })
      .filter((w) => w.length > 2);

    for (const w of words) {
      topics.add(w);
    }
  } catch {
    // URL parse failure — return empty
  }
  return topics;
}

/**
 * Extract content topic words from page signals.
 */
function extractContentTopics(signals: ExtractedSignals): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'with', 'from', 'by', 'about', 'your', 'our', 'this', 'that', 'it', 'its',
    'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom', 'best',
    'top', 'guide', 'ultimate', 'new', 'more', 'also', 'just', 'like',
  ]);

  const text = [
    signals.title ?? '',
    signals.metaDescription ?? '',
    ...signals.headings.slice(0, 5).map((h) => h.text),
  ]
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  const topics = new Set<string>();
  for (const word of text.split(' ')) {
    if (word.length > 3 && !stopWords.has(word)) {
      topics.add(word);
    }
  }

  return topics;
}

/**
 * Calculate topic pivot score: how different is the site's content
 * from what the domain name implies?
 * 0 = perfect match, 1 = complete mismatch.
 */
function calculateTopicPivotScore(
  domainTopics: Set<string>,
  contentTopics: Set<string>
): number {
  if (domainTopics.size === 0) return 0; // Can't assess — assume OK

  let matched = 0;
  for (const dt of domainTopics) {
    // Check if any content topic contains the domain topic or vice versa
    for (const ct of contentTopics) {
      if (ct.includes(dt) || dt.includes(ct)) {
        matched++;
        break;
      }
    }
  }

  // Invert: 0 overlap = 1.0 pivot score
  return 1 - (matched / domainTopics.size);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan for expired domain abuse patterns.
 *
 * @param allSignals - Map of URL → extracted signals for all crawled pages
 * @param config - Risk scanner configuration
 * @param baseUrl - The site's base URL (for domain topic extraction)
 * @returns Array of risk issues found
 */
export function scanExpiredDomainAbuse(
  allSignals: Map<string, ExtractedSignals>,
  config: RiskScannerConfig,
  baseUrl: string
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!config.enabled.expiredDomainAbuse) return issues;

  const domainTopics = extractDomainTopics(baseUrl);

  if (domainTopics.size === 0) {
    // Can't determine domain topics — skip
    return issues;
  }

  // ---- Step 1: Aggregate content topics across all pages ----
  const siteContentTopics = new Set<string>();
  const pageTopicScores: Array<{ url: string; score: number }> = [];

  for (const [url, signals] of allSignals) {
    const pageTopics = extractContentTopics(signals);
    for (const t of pageTopics) siteContentTopics.add(t);

    const pivotScore = calculateTopicPivotScore(domainTopics, pageTopics);
    if (pivotScore >= config.topicPivotScoreThreshold) {
      pageTopicScores.push({ url, score: pivotScore });
    }
  }

  // ---- Step 2: Site-level topic pivot ----
  const sitePivot = calculateTopicPivotScore(domainTopics, siteContentTopics);

  if (sitePivot >= config.topicPivotScoreThreshold) {
    issues.push({
      severity: 'P1',
      category: 'risk',
      url: baseUrl,
      message: `Expired domain abuse risk: site content has ${(sitePivot * 100).toFixed(0)}% topic pivot from domain name (threshold: ${(config.topicPivotScoreThreshold * 100).toFixed(0)}%)`,
      evidence: {
        snippet: `Domain topics: ${[...domainTopics].join(', ')}\nContent topics (sample): ${[...siteContentTopics].slice(0, 20).join(', ')}`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Content strategy',
        notes:
          'The site\'s content does not match what the domain name implies. ' +
          'This is a signal Google uses to detect expired domain abuse. ' +
          'Ensure content aligns with the domain\'s implied topic.',
      },
    });
  }

  // ---- Step 3: Flag individual high-pivot pages ----
  if (pageTopicScores.length > 3) {
    issues.push({
      severity: 'P2',
      category: 'risk',
      url: pageTopicScores[0].url,
      message: `${pageTopicScores.length} pages with high topic pivot from domain name`,
      evidence: {
        snippet: `Pages with topic pivot >= ${(config.topicPivotScoreThreshold * 100).toFixed(0)}%:\n${pageTopicScores
          .slice(0, 10)
          .map((p) => `${p.url} (${(p.score * 100).toFixed(0)}% pivot)`)
          .join('\n')}`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Content strategy',
        notes:
          'Multiple pages appear to cover topics unrelated to the domain name. ' +
          'Review content strategy for topic coherence.',
      },
    });
  }

  // ---- Step 4: Legacy orphan detection ----
  // Pages with no inbound internal links that cover off-topic content
  const orphanOffTopic: string[] = [];

  for (const [url, signals] of allSignals) {
    // Check if this page has zero inbound links (simple heuristic: not linked from any other page)
    let hasInbound = false;
    for (const [otherUrl, otherSignals] of allSignals) {
      if (otherUrl === url) continue;
      for (const link of otherSignals.internalLinks) {
        try {
          const linkUrl = new URL(link.href, baseUrl).toString().replace(/\/$/, '');
          const targetUrl = url.replace(/\/$/, '');
          if (linkUrl === targetUrl) {
            hasInbound = true;
            break;
          }
        } catch {
          // URL parse failure
        }
      }
      if (hasInbound) break;
    }

    if (!hasInbound) {
      const pageTopics = extractContentTopics(signals);
      const pivot = calculateTopicPivotScore(domainTopics, pageTopics);
      if (pivot >= config.topicPivotScoreThreshold) {
        orphanOffTopic.push(url);
      }
    }
  }

  if (orphanOffTopic.length > 0) {
    issues.push({
      severity: 'P2',
      category: 'risk',
      url: orphanOffTopic[0],
      message: `Legacy orphan pattern: ${orphanOffTopic.length} orphan page(s) with off-topic content`,
      evidence: {
        snippet: `Orphan off-topic pages:\n${orphanOffTopic.slice(0, 10).join('\n')}`,
      },
      suggestedFix: {
        scope: 'page-level',
        target: orphanOffTopic[0],
        notes:
          'Orphan pages with off-topic content are a signal of expired domain reuse. ' +
          'Remove or redirect these pages, or integrate them into the site\'s navigation.',
      },
    });
  }

  return issues;
}
