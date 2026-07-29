/**
 * Keyword Cannibalization Checker
 *
 * Detects when a new article targets keywords that overlap significantly
 * with already-published articles on the same site. This prevents multiple
 * pages competing for the same SERP position, which dilutes authority.
 *
 * Algorithm: Jaccard similarity of keyword sets.
 * Threshold: >60% keyword overlap = cannibalization risk.
 *
 * Called by: select-runner.ts (before promoting ArticleDraft to BlogPost)
 */

export interface CannibalizationResult {
  cannibalizes: boolean;
  overlappingArticle?: {
    id: string;
    slug: string;
    title: string;
    overlapScore: number;
    sharedKeywords: string[];
  };
}

/**
 * Calculate Jaccard similarity between two keyword sets.
 * Returns a value between 0 (no overlap) and 1 (identical sets).
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Normalize a keyword for comparison: lowercase, strip common filler,
 * collapse whitespace.
 */
function normalizeKeyword(kw: string): string {
  return kw
    .toLowerCase()
    .replace(/\b(the|a|an|in|for|of|to|and|with|by|at|on|is)\b/g, "")
    .replace(/\b20\d{2}\b/g, "")
    .replace(/\bv\d+\b/gi, "") // Strip version suffixes (v2, v3, etc.)
    .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "") // Preserve Arabic Unicode
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if candidate keywords overlap with any published article's keywords.
 *
 * @param candidateKeywords - Keywords the new article targets
 * @param siteId - The site to check within (multi-site isolation)
 * @param excludeDraftId - Optional draft ID to exclude from comparison
 * @returns CannibalizationResult with overlap details
 */
export async function checkCannibalization(
  candidateKeywords: string[],
  siteId: string,
  excludeDraftId?: string,
): Promise<CannibalizationResult> {
  if (!candidateKeywords || candidateKeywords.length === 0) {
    return { cannibalizes: false };
  }

  const { prisma } = await import("@/lib/db");

  // Normalize candidate keywords into a set
  const candidateSet = new Set(
    candidateKeywords.map(normalizeKeyword).filter((k) => k.length > 2),
  );

  if (candidateSet.size === 0) {
    return { cannibalizes: false };
  }

  // Fetch recent published articles with their keywords
  const publishedArticles = await prisma.blogPost.findMany({
    where: {
      siteId,
      published: true,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title_en: true,
      keywords_json: true,
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  let highestOverlap = 0;
  let worstMatch: CannibalizationResult["overlappingArticle"] = undefined;

  for (const article of publishedArticles) {
    // Parse keywords from the article
    let articleKeywords: string[] = [];
    if (article.keywords_json) {
      try {
        const parsed =
          typeof article.keywords_json === "string"
            ? JSON.parse(article.keywords_json)
            : article.keywords_json;
        if (Array.isArray(parsed)) {
          articleKeywords = parsed.map(String);
        }
      } catch {
        // Skip articles with unparseable keywords
        continue;
      }
    }

    if (articleKeywords.length === 0) continue;

    const articleSet = new Set(
      articleKeywords.map(normalizeKeyword).filter((k) => k.length > 2),
    );

    if (articleSet.size === 0) continue;

    const similarity = jaccardSimilarity(candidateSet, articleSet);

    if (similarity > highestOverlap) {
      highestOverlap = similarity;

      // Collect shared keywords for diagnostics
      const shared: string[] = [];
      for (const kw of candidateSet) {
        if (articleSet.has(kw)) shared.push(kw);
      }

      worstMatch = {
        id: article.id,
        slug: article.slug,
        title: article.title_en,
        overlapScore: Math.round(similarity * 100),
        sharedKeywords: shared,
      };
    }
  }

  // Threshold: 85% keyword overlap = true cannibalization risk
  // Raised from 75% (March 25, 2026) — 75% still too aggressive on a niche travel site
  // where articles share 3-4 category keywords (hotels, dining, attractions, family).
  // At 85%, only near-duplicate keyword targeting is blocked, allowing legitimate
  // different angles on the same topic to coexist.
  const CANNIBALIZATION_THRESHOLD = 0.85;

  return {
    cannibalizes: highestOverlap >= CANNIBALIZATION_THRESHOLD,
    overlappingArticle:
      highestOverlap >= CANNIBALIZATION_THRESHOLD ? worstMatch : undefined,
  };
}
