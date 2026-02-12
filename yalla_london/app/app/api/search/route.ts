/**
 * Unified Search API
 * Searches across blog posts and information hub articles.
 * Returns combined results with source type indicators.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { blogPosts, categories } from '@/data/blog-content';
import { extendedBlogPosts } from '@/data/blog-content-extended';
import {
  informationArticles as baseInfoArticles,
  informationSections,
  informationCategories,
} from '@/data/information-hub-content';
import { extendedInformationArticles } from '@/data/information-hub-articles-extended';
import { prisma } from '@/lib/prisma';

// Combine static content
const allBlogPosts = [...blogPosts, ...extendedBlogPosts];
const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];

export const dynamic = 'force-dynamic';

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['all', 'blog', 'information']).default('all'),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val, 10), 50))
    .default('20'),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
});

interface SearchResult {
  id: string;
  type: 'blog' | 'information';
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  url: string;
  featured_image: string;
  published: boolean;
  updated_at: string;
  relevance: number;
  meta?: {
    section?: { slug: string; name_en: string; name_ar: string };
    category?: { slug: string; name_en: string; name_ar: string };
    reading_time?: number;
    tags?: string[];
  };
}

function calculateRelevance(query: string, fields: string[]): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const field of fields) {
    if (!field) continue;
    const lower = field.toLowerCase();
    // Exact match in field
    if (lower === q) score += 100;
    // Starts with query
    else if (lower.startsWith(q)) score += 60;
    // Contains query
    else if (lower.includes(q)) score += 30;
    // Individual word match
    else {
      const words = q.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && lower.includes(word)) score += 10;
      }
    }
  }
  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = SearchQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { q, type, limit, page } = validation.data;
    const offset = (page - 1) * limit;
    const results: SearchResult[] = [];

    // Search blog posts (static)
    if (type === 'all' || type === 'blog') {
      for (const post of allBlogPosts) {
        if (!post.published) continue;
        const relevance = calculateRelevance(q, [
          post.title_en,
          post.title_ar,
          post.excerpt_en,
          post.excerpt_ar,
          post.slug,
          ...(post.tags || []),
        ]);
        if (relevance > 0) {
          const cat = categories.find((c) => c.id === post.category_id);
          results.push({
            id: post.id,
            type: 'blog',
            slug: post.slug,
            title_en: post.title_en,
            title_ar: post.title_ar,
            excerpt_en: post.excerpt_en,
            excerpt_ar: post.excerpt_ar,
            url: `/blog/${post.slug}`,
            featured_image: post.featured_image,
            published: post.published,
            updated_at: post.updated_at.toISOString(),
            relevance,
            meta: {
              category: cat
                ? { slug: cat.slug, name_en: cat.name_en, name_ar: cat.name_ar }
                : undefined,
              tags: post.tags,
            },
          });
        }
      }

      // Search blog posts from database
      try {
        const dbPosts = await prisma.blogPost.findMany({
          where: {
            published: true,
            deletedAt: null,
            OR: [
              { title_en: { contains: q, mode: 'insensitive' } },
              { title_ar: { contains: q } },
              { excerpt_en: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            slug: true,
            title_en: true,
            title_ar: true,
            excerpt_en: true,
            excerpt_ar: true,
            featured_image: true,
            published: true,
            updated_at: true,
            tags: true,
            category: { select: { slug: true, name_en: true, name_ar: true } },
          },
          take: 50,
        });

        const staticSlugs = new Set(allBlogPosts.map((p) => p.slug));
        for (const post of dbPosts) {
          if (staticSlugs.has(post.slug)) continue;
          results.push({
            id: post.id,
            type: 'blog',
            slug: post.slug,
            title_en: post.title_en,
            title_ar: post.title_ar,
            excerpt_en: post.excerpt_en || '',
            excerpt_ar: post.excerpt_ar || '',
            url: `/blog/${post.slug}`,
            featured_image: post.featured_image || '',
            published: post.published,
            updated_at: post.updated_at?.toISOString() || new Date().toISOString(),
            relevance: 30,
            meta: {
              category: post.category
                ? {
                    slug: post.category.slug,
                    name_en: post.category.name_en,
                    name_ar: post.category.name_ar,
                  }
                : undefined,
              tags: post.tags,
            },
          });
        }
      } catch {
        // Database not available - continue with static results
      }
    }

    // Search information hub articles (static)
    if (type === 'all' || type === 'information') {
      for (const article of allInfoArticles) {
        if (!article.published) continue;
        const relevance = calculateRelevance(q, [
          article.title_en,
          article.title_ar,
          article.excerpt_en,
          article.excerpt_ar,
          article.slug,
          ...(article.tags || []),
          ...(article.keywords || []),
        ]);
        if (relevance > 0) {
          const section = informationSections.find(
            (s) => s.id === article.section_id,
          );
          const category = informationCategories.find(
            (c) => c.id === article.category_id,
          );
          results.push({
            id: article.id,
            type: 'information',
            slug: article.slug,
            title_en: article.title_en,
            title_ar: article.title_ar,
            excerpt_en: article.excerpt_en,
            excerpt_ar: article.excerpt_ar,
            url: `/information/articles/${article.slug}`,
            featured_image: article.featured_image,
            published: article.published,
            updated_at: article.updated_at.toISOString(),
            relevance,
            meta: {
              section: section
                ? {
                    slug: section.slug,
                    name_en: section.name_en,
                    name_ar: section.name_ar,
                  }
                : undefined,
              category: category
                ? {
                    slug: category.slug,
                    name_en: category.name_en,
                    name_ar: category.name_ar,
                  }
                : undefined,
              reading_time: article.reading_time,
              tags: article.tags,
            },
          });
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Pagination
    const totalCount = results.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedResults = results.slice(offset, offset + limit);

    // Count by type
    const blogCount = results.filter((r) => r.type === 'blog').length;
    const infoCount = results.filter((r) => r.type === 'information').length;

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      query: q,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      },
      counts: {
        total: totalCount,
        blog: blogCount,
        information: infoCount,
      },
    });
  } catch (error) {
    console.error('Unified search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
