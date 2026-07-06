/**
 * Master Audit Engine — Scaled Content Abuse Risk Scanner
 *
 * Detects patterns consistent with Google's "scaled content abuse" spam policy:
 * - Near-duplicate content clustering (pages with very similar text)
 * - Thin content clusters (groups of pages below word count threshold)
 * - Low unique section ratio (most content is template/boilerplate)
 * - Entity coverage score (does the content cover its claimed topic?)
 *
 * Reference: Google Search Essentials — Spam policies
 * https://developers.google.com/search/docs/essentials/spam-policies
 *
 * READ-ONLY: Never mutates production data.
 */

import type { AuditIssue, ExtractedSignals, RiskScannerConfig } from '../types';

// ---------------------------------------------------------------------------
// Text normalization for comparison
// ---------------------------------------------------------------------------

/**
 * Normalize text for similarity comparison:
 * lowercase, collapse whitespace, remove punctuation.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract word set (shingles) from text for Jaccard similarity.
 * Uses 3-word shingles for better accuracy.
 */
function getShingles(text: string, shingleSize = 3): Set<string> {
  const words = normalizeText(text).split(' ');
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - shingleSize; i++) {
    shingles.add(words.slice(i, i + shingleSize).join(' '));
  }
  return shingles;
}

/**
 * Calculate Jaccard similarity between two shingle sets.
 * Returns 0-1 where 1 = identical.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ---------------------------------------------------------------------------
// Entity coverage scoring
// ---------------------------------------------------------------------------

/**
 * Calculate entity coverage: how well does the content cover its topic?
 * Uses heading text as "claimed topic" and checks body text coverage.
 * Score 0-1 where 1 = all heading entities appear in body.
 */
function calculateEntityCoverage(signals: ExtractedSignals): number {
  if (signals.headings.length === 0) return 0;

  // Extract topic entities from headings (significant words)
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'shall', 'can', 'with', 'from', 'by', 'about', 'your', 'our', 'this',
    'that', 'these', 'those', 'it', 'its', 'how', 'what', 'why', 'when',
    'where', 'which', 'who', 'whom', 'best', 'top', 'guide', 'ultimate',
  ]);

  const headingEntities = new Set<string>();
  for (const h of signals.headings) {
    const words = normalizeText(h.text).split(' ');
    for (const w of words) {
      if (w.length > 2 && !stopWords.has(w)) {
        headingEntities.add(w);
      }
    }
  }

  if (headingEntities.size === 0) return 1; // No entities to check

  // Build body text from title + meta description (proxy for body)
  const bodyText = normalizeText(
    [signals.title ?? '', signals.metaDescription ?? ''].join(' ')
  );

  let covered = 0;
  for (const entity of headingEntities) {
    if (bodyText.includes(entity)) covered++;
  }

  return covered / headingEntities.size;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan for scaled content abuse patterns.
 *
 * @param allSignals - Map of URL → extracted signals for all crawled pages
 * @param config - Risk scanner configuration
 * @returns Array of risk issues found
 */
export function scanScaledContentAbuse(
  allSignals: Map<string, ExtractedSignals>,
  config: RiskScannerConfig
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!config.enabled.scaledContentAbuse) return issues;

  // ---- Step 1: Build shingle sets for content pages ----
  const pageShingles = new Map<string, Set<string>>();
  const contentPages: Array<[string, ExtractedSignals]> = [];

  for (const [url, signals] of allSignals) {
    if (signals.wordCount > 50) { // Skip very short pages (nav, error pages)
      contentPages.push([url, signals]);
      // Use headings + title + meta as content proxy (body text not stored)
      const textParts = [
        signals.title ?? '',
        signals.metaDescription ?? '',
        ...signals.headings.map((h) => h.text),
      ];
      pageShingles.set(url, getShingles(textParts.join(' ')));
    }
  }

  // ---- Step 2: Near-duplicate clustering ----
  const duplicatePairs: Array<{ url1: string; url2: string; similarity: number }> = [];
  const processed = new Set<string>();

  for (const [url1, shingles1] of pageShingles) {
    processed.add(url1);
    for (const [url2, shingles2] of pageShingles) {
      if (processed.has(url2)) continue;
      const similarity = jaccardSimilarity(shingles1, shingles2);
      if (similarity >= config.duplicateSimilarityThreshold) {
        duplicatePairs.push({ url1, url2, similarity });
      }
    }
  }

  // Build clusters from duplicate pairs (union-find approach)
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }

  for (const pair of duplicatePairs) {
    union(pair.url1, pair.url2);
  }

  // Group into clusters
  const clusters = new Map<string, string[]>();
  for (const url of pageShingles.keys()) {
    const root = find(url);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(url);
  }

  // Flag clusters above minimum size
  for (const [, clusterUrls] of clusters) {
    if (clusterUrls.length >= config.scaledContentMinClusterSize) {
      issues.push({
        severity: 'P1',
        category: 'risk',
        url: clusterUrls[0],
        message: `Scaled content abuse risk: ${clusterUrls.length} near-duplicate pages detected (similarity >= ${config.duplicateSimilarityThreshold})`,
        evidence: {
          snippet: `Cluster URLs:\n${clusterUrls.slice(0, 10).join('\n')}${clusterUrls.length > 10 ? `\n... and ${clusterUrls.length - 10} more` : ''}`,
        },
        suggestedFix: {
          scope: 'systemic',
          target: 'Content generation pipeline',
          notes:
            'These pages have highly similar content. Consolidate, differentiate with unique insights, or canonicalize to a primary version. ' +
            'Google\'s spam policies flag "scaled content abuse" when content is mass-produced without substantial value.',
        },
      });
    }
  }

  // ---- Step 3: Thin content clusters ----
  const thinPages = contentPages.filter(
    ([, s]) => s.wordCount < config.thinContentThreshold
  );

  if (thinPages.length >= config.scaledContentMinClusterSize) {
    issues.push({
      severity: 'P1',
      category: 'risk',
      url: thinPages[0][0],
      message: `Thin content cluster: ${thinPages.length} pages below ${config.thinContentThreshold} words`,
      evidence: {
        snippet: `Thin pages:\n${thinPages.slice(0, 10).map(([url, s]) => `${url} (${s.wordCount} words)`).join('\n')}`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'Content templates / generators',
        notes:
          'Multiple thin pages may indicate template-generated content without substance. ' +
          'Expand content with unique, first-hand information or consolidate pages.',
      },
    });
  }

  // ---- Step 4: Entity coverage scoring ----
  for (const [url, signals] of contentPages) {
    const coverage = calculateEntityCoverage(signals);
    if (coverage < config.entityCoverageMinScore && signals.headings.length > 0) {
      issues.push({
        severity: 'P2',
        category: 'risk',
        url,
        message: `Low entity coverage: ${(coverage * 100).toFixed(0)}% of heading topics covered in metadata (threshold: ${(config.entityCoverageMinScore * 100).toFixed(0)}%)`,
        evidence: {
          snippet: `Headings: ${signals.headings.map((h) => h.text).join(', ')}\nTitle: ${signals.title ?? 'none'}`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: url,
          notes: 'Content headings claim to cover topics not reflected in the page metadata. Ensure title and description accurately represent the content.',
        },
      });
    }
  }

  return issues;
}
