/**
 * Related Content Utility
 *
 * Computes related articles for blog posts and information hub articles
 * using a tag/category/keyword-based relevance scoring algorithm.
 * Encourages cross-linking between blog and information content.
 *
 * PERFORMANCE NOTE: Static content (~385KB) is lazy-loaded only when needed.
 * For DB-sourced blog posts, we use DB-only related articles to avoid
 * importing the static content pool during SSR.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RelatedArticleData {
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  featured_image: string;
  type: 'blog' | 'information';
  category_name_en?: string;
  category_name_ar?: string;
  reading_time?: number;
}

/** Internal normalised shape used for scoring. */
interface NormalisedItem {
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  featured_image: string;
  type: 'blog' | 'information';
  category_id: string;
  category_name_en: string;
  category_name_ar: string;
  tags: string[];
  keywords: string[];
  page_type: string;
  reading_time: number;
  published: boolean;
}

// ---------------------------------------------------------------------------
// Lazy-loaded static content pool (avoids 385KB import at module level)
// ---------------------------------------------------------------------------

let _staticPoolCache: NormalisedItem[] | null = null;

async function getStaticPool(): Promise<NormalisedItem[]> {
  if (_staticPoolCache) return _staticPoolCache;

  const { blogPosts, categories } = await import('@/data/blog-content');
  const { extendedBlogPosts } = await import('@/data/blog-content-extended');
  const {
    informationArticles: baseInfoArticles,
    informationSections,
    informationCategories,
  } = await import('@/data/information-hub-content');
  const { extendedInformationArticles } = await import('@/data/information-hub-articles-extended');

  const allBlogPosts = [...blogPosts, ...extendedBlogPosts];
  const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];

  function normaliseBlogPost(post: (typeof allBlogPosts)[number]): NormalisedItem {
    const category = categories.find((c) => c.id === post.category_id);
    return {
      slug: post.slug,
      title_en: post.title_en,
      title_ar: post.title_ar,
      excerpt_en: post.excerpt_en,
      excerpt_ar: post.excerpt_ar,
      featured_image: post.featured_image,
      type: 'blog',
      category_id: post.category_id,
      category_name_en: category?.name_en ?? '',
      category_name_ar: category?.name_ar ?? '',
      tags: post.tags ?? [],
      keywords: post.keywords ?? [],
      page_type: post.page_type ?? '',
      reading_time: post.reading_time ?? 0,
      published: post.published,
    };
  }

  function normaliseInfoArticle(
    article: (typeof allInfoArticles)[number],
  ): NormalisedItem {
    const category = informationCategories.find((c) => c.id === article.category_id);
    const section = informationSections.find((s) => s.id === article.section_id);
    return {
      slug: article.slug,
      title_en: article.title_en,
      title_ar: article.title_ar,
      excerpt_en: article.excerpt_en,
      excerpt_ar: article.excerpt_ar,
      featured_image: article.featured_image,
      type: 'information',
      category_id: article.category_id,
      category_name_en: category?.name_en ?? section?.name_en ?? '',
      category_name_ar: category?.name_ar ?? section?.name_ar ?? '',
      tags: article.tags ?? [],
      keywords: article.keywords ?? [],
      page_type: article.page_type ?? '',
      reading_time: article.reading_time ?? 0,
      published: article.published,
    };
  }

  _staticPoolCache = [
    ...allBlogPosts.map(normaliseBlogPost),
    ...allInfoArticles.map(normaliseInfoArticle),
  ];

  return _staticPoolCache;
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

const SCORE_SAME_CATEGORY = 30;
const SCORE_SHARED_TAG = 15;
const SCORE_SHARED_KEYWORD = 10;
const SCORE_SAME_PAGE_TYPE = 10;
const SCORE_CROSS_TYPE_BONUS = 5;

function countSharedEntries(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let count = 0;
  for (const item of a) {
    if (setB.has(item.toLowerCase())) {
      count++;
    }
  }
  return count;
}

function computeScore(
  source: NormalisedItem,
  candidate: NormalisedItem,
): number {
  let score = 0;

  // Same category
  if (source.category_id && source.category_id === candidate.category_id) {
    score += SCORE_SAME_CATEGORY;
  }

  // Shared tags
  score += countSharedEntries(source.tags, candidate.tags) * SCORE_SHARED_TAG;

  // Shared keywords
  score += countSharedEntries(source.keywords, candidate.keywords) * SCORE_SHARED_KEYWORD;

  // Same page_type
  if (source.page_type && source.page_type === candidate.page_type) {
    score += SCORE_SAME_PAGE_TYPE;
  }

  // Cross-type bonus (blog <-> information)
  if (source.type !== candidate.type) {
    score += SCORE_CROSS_TYPE_BONUS;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Conversion helper
// ---------------------------------------------------------------------------

function toRelatedArticleData(item: NormalisedItem): RelatedArticleData {
  return {
    slug: item.slug,
    title_en: item.title_en,
    title_ar: item.title_ar,
    excerpt_en: item.excerpt_en,
    excerpt_ar: item.excerpt_ar,
    featured_image: item.featured_image,
    type: item.type,
    category_name_en: item.category_name_en || undefined,
    category_name_ar: item.category_name_ar || undefined,
    reading_time: item.reading_time || undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches published BlogPosts from the database that could be related to the
 * current article.  Results are mapped to the same `RelatedArticleData` shape
 * returned by the static content pool so they can be merged seamlessly.
 *
 * The query matches by category name when available and always excludes the
 * current slug.  Up to `limit` results are returned, ordered by most recent.
 */
async function fetchDbRelatedArticles(
  currentSlug: string,
  category?: string,
  limit: number = 6,
): Promise<RelatedArticleData[]> {
  try {
    const { prisma } = await import('@/lib/db');

    const where: Record<string, unknown> = {
      published: true,
      slug: { not: currentSlug },
      deletedAt: null,
    };

    // If we have a category hint, skip the separate Category lookup and use a
    // nested filter instead — saves one DB roundtrip per page render.
    if (category) {
      where.category = {
        OR: [
          { name_en: { contains: category, mode: 'insensitive' as const } },
          { slug: { contains: category.toLowerCase().replace(/\s+/g, '-') } },
        ],
      };
    }

    // 3s timeout — related articles are non-critical; page has 4s outer timeout
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const query = prisma.blogPost.findMany({
      where,
      select: {
        slug: true,
        title_en: true,
        title_ar: true,
        meta_description_en: true,
        excerpt_en: true,
        excerpt_ar: true,
        featured_image: true,
        category: { select: { name_en: true, name_ar: true } },
        created_at: true,
        tags: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const dbArticles = await Promise.race([query, timeout]);
    if (!dbArticles) return []; // timed out

    return dbArticles.map((post): RelatedArticleData => ({
      slug: post.slug,
      title_en: post.title_en,
      title_ar: post.title_ar,
      excerpt_en: post.meta_description_en || post.excerpt_en || '',
      excerpt_ar: post.excerpt_ar || '',
      featured_image: post.featured_image || '',
      type: 'blog',
      category_name_en: post.category?.name_en || undefined,
      category_name_ar: post.category?.name_ar || undefined,
    }));
  } catch {
    // Database unavailable — degrade gracefully to static-only results
    return [];
  }
}

/**
 * Returns related articles for a given piece of content.
 *
 * For DB-sourced posts, uses DB-only results to avoid importing 385KB of
 * static content during SSR (critical for page load performance).
 *
 * For static posts, lazy-loads the static pool and scores by shared
 * categories, tags, keywords, and page type.  DB results appear first.
 *
 * @param options.dbOnly - When true, skip static content entirely (use for DB posts)
 * @param options.categoryHint - Category name for filtering DB results
 */
export async function getRelatedArticles(
  currentSlug: string,
  currentType: 'blog' | 'information',
  count: number = 3,
  options?: { dbOnly?: boolean; categoryHint?: string },
): Promise<RelatedArticleData[]> {
  const { dbOnly = false, categoryHint: explicitCategoryHint } = options || {};

  // ── 1. Fetch DB-generated articles (BlogPosts) ──────────────────────────
  const dbResults = await fetchDbRelatedArticles(
    currentSlug,
    explicitCategoryHint,
    dbOnly ? count : count * 2,
  );

  // For DB-sourced posts, return DB results only — avoids importing 385KB
  // of static content files during SSR
  if (dbOnly) {
    return dbResults.slice(0, count);
  }

  // ── 2. Compute static content results (lazy-loaded) ────────────────────
  const allItems = await getStaticPool();
  let staticResults: RelatedArticleData[] = [];

  const source = allItems.find(
    (item) => item.slug === currentSlug && item.type === currentType,
  );

  if (!source) {
    // Source not in static pool — return random published static items
    staticResults = allItems
      .filter((item) => item.published)
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(toRelatedArticleData);
  } else {
    // Score every static candidate (exclude current article, only published)
    const scored = allItems
      .filter((item) => item.slug !== currentSlug && item.published)
      .map((item) => ({ item, score: computeScore(source, item) }))
      .sort((a, b) => b.score - a.score);

    // Take top N by raw score
    const topN = scored.slice(0, count);

    // Ensure at least one cross-type result when possible
    const hasCrossType = topN.some((entry) => entry.item.type !== currentType);

    if (!hasCrossType && count > 1) {
      const topNSlugs = new Set(topN.map((e) => e.item.slug));
      const bestCross = scored.find(
        (entry) =>
          entry.item.type !== currentType && !topNSlugs.has(entry.item.slug),
      );

      if (bestCross) {
        for (let i = topN.length - 1; i >= 0; i--) {
          if (topN[i].item.type === currentType) {
            topN[i] = bestCross;
            break;
          }
        }
      }
    }

    // Fill remainder with random cross-type articles
    if (topN.length < count) {
      const usedSlugs = new Set(topN.map((e) => e.item.slug));
      usedSlugs.add(currentSlug);

      const fillers = allItems
        .filter(
          (item) =>
            item.published &&
            item.type !== currentType &&
            !usedSlugs.has(item.slug),
        )
        .sort(() => Math.random() - 0.5)
        .slice(0, count - topN.length)
        .map((item) => ({ item, score: 0 }));

      topN.push(...fillers);
    }

    staticResults = topN.map((entry) => toRelatedArticleData(entry.item));
  }

  // ── 3. Merge: DB results first, deduped by slug, capped at `count` ─────
  const seen = new Set<string>();
  const merged: RelatedArticleData[] = [];

  for (const article of [...dbResults, ...staticResults]) {
    if (seen.has(article.slug)) continue;
    seen.add(article.slug);
    merged.push(article);
    if (merged.length >= count) break;
  }

  return merged;
}
