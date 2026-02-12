/**
 * Related Content Utility
 *
 * Computes related articles for blog posts and information hub articles
 * using a tag/category/keyword-based relevance scoring algorithm.
 * Encourages cross-linking between blog and information content.
 */

import { blogPosts, categories } from '@/data/blog-content';
import { extendedBlogPosts } from '@/data/blog-content-extended';
import {
  informationArticles as baseInfoArticles,
  informationSections,
  informationCategories,
} from '@/data/information-hub-content';
import { extendedInformationArticles } from '@/data/information-hub-articles-extended';

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
// Unified content pool (built once at module level)
// ---------------------------------------------------------------------------

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
  // Also resolve section to provide a secondary category signal
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

const allItems: NormalisedItem[] = [
  ...allBlogPosts.map(normaliseBlogPost),
  ...allInfoArticles.map(normaliseInfoArticle),
];

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
 * Returns related articles for a given piece of content.
 *
 * Scoring is based on shared categories, tags, keywords, and page type.
 * A cross-type bonus encourages links between blog and information content.
 * The result set guarantees at least one cross-type entry when possible,
 * aiming for roughly 2 same-type + 1 cross-type in the default case (count=3).
 *
 * If fewer than `count` scored results exist, the remainder is filled with
 * random published articles from the opposite type.
 */
export function getRelatedArticles(
  currentSlug: string,
  currentType: 'blog' | 'information',
  count: number = 3,
): RelatedArticleData[] {
  // Find the source item
  const source = allItems.find(
    (item) => item.slug === currentSlug && item.type === currentType,
  );

  if (!source) {
    // If source not found, return random published items as fallback
    return allItems
      .filter((item) => item.published)
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(toRelatedArticleData);
  }

  // Score every candidate (exclude current article, only published)
  const scored = allItems
    .filter((item) => item.slug !== currentSlug && item.published)
    .map((item) => ({ item, score: computeScore(source, item) }))
    .sort((a, b) => b.score - a.score);

  // Take top N by raw score
  const topN = scored.slice(0, count);

  // Ensure at least one cross-type result when possible
  const hasCrossType = topN.some((entry) => entry.item.type !== currentType);

  if (!hasCrossType && count > 1) {
    // Find the highest-scoring cross-type candidate not already in topN
    const topNSlugs = new Set(topN.map((e) => e.item.slug));
    const bestCross = scored.find(
      (entry) =>
        entry.item.type !== currentType && !topNSlugs.has(entry.item.slug),
    );

    if (bestCross) {
      // Swap with the lowest-scoring same-type entry in topN
      // (walk from end to find a same-type entry to replace)
      for (let i = topN.length - 1; i >= 0; i--) {
        if (topN[i].item.type === currentType) {
          topN[i] = bestCross;
          break;
        }
      }
    }
  }

  // If we still have fewer than `count`, fill with random cross-type articles
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

  return topN.map((entry) => toRelatedArticleData(entry.item));
}
