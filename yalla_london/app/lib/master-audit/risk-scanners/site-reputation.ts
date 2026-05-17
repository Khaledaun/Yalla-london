/**
 * Master Audit Engine — Site Reputation Abuse Risk Scanner
 *
 * Detects patterns consistent with Google's "site reputation abuse" spam policy:
 * - Unrelated topic clusters (content drifting far from site's core topic)
 * - Missing editorial ownership (no author attribution)
 * - Outbound link dominance (more external than internal links — parasite SEO signal)
 *
 * Reference: Google Search Essentials — Spam policies
 * https://developers.google.com/search/docs/essentials/spam-policies
 *
 * READ-ONLY: Never mutates production data.
 */

import type { AuditIssue, ExtractedSignals, RiskScannerConfig } from '../types';

// ---------------------------------------------------------------------------
// Topic classification
// ---------------------------------------------------------------------------

/**
 * Extract dominant topic words from a page's metadata and headings.
 */
function extractTopicWords(signals: ExtractedSignals): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'with', 'from', 'by', 'about', 'your', 'our', 'this', 'that', 'it', 'its',
    'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom',
  ]);

  const text = [
    signals.title ?? '',
    signals.metaDescription ?? '',
    ...signals.headings.map((h) => h.text),
  ]
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  return text
    .split(' ')
    .filter((w) => w.length > 3 && !stopWords.has(w));
}

/**
 * Calculate topic overlap between a page and the site's core topics.
 * Core topics are derived from the homepage and main category pages.
 */
function calculateTopicRelevance(
  pageTopics: string[],
  siteTopics: Set<string>
): number {
  if (pageTopics.length === 0 || siteTopics.size === 0) return 1;

  let matched = 0;
  for (const word of pageTopics) {
    if (siteTopics.has(word)) matched++;
  }

  return pageTopics.length > 0 ? matched / pageTopics.length : 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan for site reputation abuse patterns.
 *
 * @param allSignals - Map of URL → extracted signals for all crawled pages
 * @param config - Risk scanner configuration
 * @returns Array of risk issues found
 */
export function scanSiteReputationAbuse(
  allSignals: Map<string, ExtractedSignals>,
  config: RiskScannerConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!config.enabled.siteReputationAbuse) return issues;

  // ---- Step 1: Build site-wide topic vocabulary from key pages ----
  const siteTopics = new Set<string>();
  const keyPagePatterns = ['/', '/blog', '/about', '/hotels', '/experiences'];

  for (const [url, signals] of allSignals) {
    try {
      const pathname = new URL(url).pathname;
      if (keyPagePatterns.includes(pathname)) {
        const words = extractTopicWords(signals);
        for (const w of words) siteTopics.add(w);
      }
    } catch {
      // Skip URLs that can't be parsed
    }
  }

  // If we couldn't establish core topics (e.g., key pages not crawled), skip
  if (siteTopics.size < 5) {
    return issues;
  }

  // ---- Step 2: Check each content page for topic drift ----
  const driftedPages: Array<{ url: string; relevance: number }> = [];

  for (const [url, signals] of allSignals) {
    // Only check content-like pages (blog posts, articles)
    try {
      const pathname = new URL(url).pathname;
      if (
        !pathname.startsWith('/blog/') &&
        !pathname.startsWith('/information/') &&
        !pathname.startsWith('/news/')
      ) {
        continue;
      }
    } catch {
      continue;
    }

    const pageTopics = extractTopicWords(signals);
    const relevance = calculateTopicRelevance(pageTopics, siteTopics);

    if (relevance < 0.1 && pageTopics.length > 3) {
      driftedPages.push({ url, relevance });
    }
  }

  if (driftedPages.length > 0) {
    issues.push({
      severity: 'P2',
      category: 'risk',
      url: driftedPages[0].url,
      message: `Site reputation abuse risk: ${driftedPages.length} page(s) with topic drift detected`,
      evidence: {
        snippet: `Pages with low topic relevance:\n${driftedPages
          .slice(0, 10)
          .map((p) => `${p.url} (${(p.relevance * 100).toFixed(0)}% relevance)`)
          .join('\n')}`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Content strategy / editorial guidelines',
        notes:
          'These pages cover topics unrelated to the site\'s core subject matter. ' +
          'Google flags "site reputation abuse" when third-party content is published on a site to exploit its ranking signals. ' +
          'Ensure all content aligns with the site\'s editorial mission.',
      },
    });
  }

  // ---- Step 3: Outbound link dominance ----
  for (const [url, signals] of allSignals) {
    const totalLinks = signals.internalLinks.length + signals.externalLinks.length;
    if (totalLinks === 0) continue;

    const externalRatio = signals.externalLinks.length / totalLinks;

    if (
      externalRatio >= config.outboundDominanceThreshold &&
      signals.externalLinks.length > 5
    ) {
      issues.push({
        severity: 'P2',
        category: 'risk',
        url,
        message: `Outbound link dominance: ${signals.externalLinks.length}/${totalLinks} links (${(externalRatio * 100).toFixed(0)}%) are external`,
        evidence: {
          snippet: `Internal: ${signals.internalLinks.length}, External: ${signals.externalLinks.length}\nExternal targets: ${signals.externalLinks.slice(0, 5).map((l) => l.href).join(', ')}`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: url,
          notes:
            'Pages dominated by outbound links may appear as link farms. ' +
            'Add more internal links and ensure external links are editorially justified.',
        },
      });
    }
  }

  // ---- Step 4: Missing editorial ownership ----
  // Check for pages without any structured author data or visible author patterns
  let pagesWithoutAuthor = 0;
  const noAuthorUrls: string[] = [];

  for (const [url, signals] of allSignals) {
    try {
      const pathname = new URL(url).pathname;
      if (
        !pathname.startsWith('/blog/') &&
        !pathname.startsWith('/news/') &&
        !pathname.startsWith('/information/')
      ) {
        continue; // Only check content pages
      }
    } catch {
      continue;
    }

    // Check JSON-LD for author info
    let hasAuthor = false;
    for (const ld of signals.jsonLd) {
      if (ld && typeof ld === 'object') {
        const obj = ld as Record<string, unknown>;
        if (obj.author || obj['@graph']) {
          const graph = Array.isArray(obj['@graph']) ? obj['@graph'] : [obj];
          for (const item of graph) {
            if (
              item &&
              typeof item === 'object' &&
              'author' in (item as Record<string, unknown>)
            ) {
              hasAuthor = true;
              break;
            }
          }
        }
      }
      if (hasAuthor) break;
    }

    if (!hasAuthor) {
      pagesWithoutAuthor++;
      noAuthorUrls.push(url);
    }
  }

  if (pagesWithoutAuthor > 0) {
    issues.push({
      severity: 'P2',
      category: 'risk',
      url: noAuthorUrls[0],
      message: `Missing editorial ownership: ${pagesWithoutAuthor} content page(s) without author attribution in structured data`,
      evidence: {
        snippet: `Pages without author:\n${noAuthorUrls.slice(0, 10).join('\n')}`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Article JSON-LD template',
        notes:
          'Add "author" field to Article/NewsArticle JSON-LD. ' +
          'Anonymous content is a site reputation abuse signal. ' +
          'Google E-E-A-T guidelines require clear authorship.',
      },
    });
  }

  return issues;
}
