/**
 * Cannibalization Resolver
 *
 * Detects groups of published articles targeting the same keywords,
 * picks the best article in each group (highest SEO score + word count),
 * unpublishes the rest, and creates 301 redirects so Google
 * consolidates authority onto the winner.
 *
 * Runs weekly via seo-agent (Section 12e).
 *
 * Strategy:
 *  1. Cluster articles by normalized title similarity (>60% Jaccard)
 *  2. Within each cluster, pick the "canonical" (best SEO score, longest content, most recent)
 *  3. For losers: unpublish, create SeoRedirect (301), tag enhancement_log
 *  4. For winner: absorb unique content snippets from losers (if applicable)
 */

import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";
import { buildEnhancementLogEntry } from "@/lib/db/enhancement-log";

export interface CanonicalGroup {
  canonicalId: string;
  canonicalSlug: string;
  canonicalTitle: string;
  canonicalScore: number;
  duplicates: Array<{
    id: string;
    slug: string;
    title: string;
    score: number;
    overlapPct: number;
  }>;
}

export interface ResolutionResult {
  groupsFound: number;
  articlesRedirected: number;
  redirectsCreated: number;
  groups: CanonicalGroup[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "the", "a", "an", "in", "for", "of", "to", "and", "with", "by",
  "at", "on", "is", "your", "our", "its", "it", "this", "that",
  "best", "top", "ultimate", "complete", "guide", "luxury",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !FILLER_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function wordCount(html: string | null | undefined): number {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

// ─── Cluster Detection ─────────────────────────────────────────────────────

/**
 * Find groups of cannibalizing articles (>60% title word overlap).
 * Uses Union-Find to cluster articles efficiently.
 */
export async function findCannibalizationGroups(
  siteId: string,
): Promise<CanonicalGroup[]> {
  const { prisma } = await import("@/lib/db");

  const articles = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title_en: true,
      seo_score: true,
      content_en: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  if (articles.length < 2) return [];

  // Build title word sets
  const wordSets = articles.map((a) => ({
    article: a,
    words: titleWords(a.title_en),
  }));

  // Union-Find for clustering
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
    return parent.get(id)!;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  // Track overlap scores for reporting
  const overlapScores = new Map<string, number>();

  // O(n²) pairwise comparison — bounded by take:500
  const TITLE_OVERLAP_THRESHOLD = 0.60;
  for (let i = 0; i < wordSets.length; i++) {
    for (let j = i + 1; j < wordSets.length; j++) {
      const sim = jaccardSimilarity(wordSets[i].words, wordSets[j].words);
      if (sim >= TITLE_OVERLAP_THRESHOLD) {
        union(wordSets[i].article.id, wordSets[j].article.id);
        overlapScores.set(
          `${wordSets[j].article.id}→${wordSets[i].article.id}`,
          sim,
        );
      }
    }
  }

  // Group by cluster root
  const clusters = new Map<string, typeof articles>();
  for (const a of articles) {
    const root = find(a.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(a);
  }

  // Filter to groups with 2+ articles (actual cannibalization)
  const groups: CanonicalGroup[] = [];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;

    // Pick canonical: highest SEO score, then longest content, then newest
    const sorted = [...members].sort((a, b) => {
      const scoreA = a.seo_score ?? 0;
      const scoreB = b.seo_score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const wcA = wordCount(a.content_en);
      const wcB = wordCount(b.content_en);
      if (wcB !== wcA) return wcB - wcA;
      return (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0);
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1).map((d) => {
      const key1 = `${d.id}→${canonical.id}`;
      const key2 = `${canonical.id}→${d.id}`;
      const overlap = overlapScores.get(key1) ?? overlapScores.get(key2) ?? 0;
      return {
        id: d.id,
        slug: d.slug,
        title: d.title_en,
        score: d.seo_score ?? 0,
        overlapPct: Math.round(overlap * 100),
      };
    });

    groups.push({
      canonicalId: canonical.id,
      canonicalSlug: canonical.slug,
      canonicalTitle: canonical.title_en,
      canonicalScore: canonical.seo_score ?? 0,
      duplicates,
    });
  }

  return groups;
}

// ─── Resolution ────────────────────────────────────────────────────────────

/**
 * Resolve cannibalization groups:
 * - Keep the canonical article published
 * - Unpublish duplicates
 * - Create SeoRedirect (301) from duplicate slug → canonical slug
 */
export async function resolveCannibalizationGroups(
  groups: CanonicalGroup[],
  siteId: string,
  maxGroups = 3,
): Promise<ResolutionResult> {
  const { prisma } = await import("@/lib/db");

  let articlesRedirected = 0;
  let redirectsCreated = 0;
  const processedGroups: CanonicalGroup[] = [];

  for (const group of groups.slice(0, maxGroups)) {
    for (const dup of group.duplicates) {
      try {
        // 1. Unpublish the duplicate
        await optimisticBlogPostUpdate(
          dup.id,
          (current) => ({
            published: false,
            meta_description_en: `[REDIRECTED to /${group.canonicalSlug}] ${(current.meta_description_en || "").replace(/\[REDIRECTED[^\]]*\]\s*/g, "").slice(0, 120)}`,
            enhancement_log: buildEnhancementLogEntry(
              current.enhancement_log,
              "cannibalization_resolution",
              "seo-agent",
              `Unpublished & redirected to /${group.canonicalSlug} (${dup.overlapPct}% overlap)`,
            ),
          }),
          { tag: "[seo-agent-cannibalization]" },
        );
        articlesRedirected++;

        // 2. Create 301 redirect
        const sourceUrl = `/blog/${dup.slug}`;
        const targetUrl = `/blog/${group.canonicalSlug}`;
        await prisma.seoRedirect.upsert({
          where: { sourceUrl },
          create: {
            sourceUrl,
            targetUrl,
            statusCode: 301,
            enabled: true,
          },
          update: {
            targetUrl,
            statusCode: 301,
            enabled: true,
          },
        });
        redirectsCreated++;
      } catch (err) {
        console.warn(
          `[seo-agent] Failed to resolve duplicate ${dup.slug}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    processedGroups.push(group);
  }

  return {
    groupsFound: groups.length,
    articlesRedirected,
    redirectsCreated,
    groups: processedGroups,
  };
}
