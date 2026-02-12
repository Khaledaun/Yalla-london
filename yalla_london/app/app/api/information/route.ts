/**
 * Information Hub Articles API
 * Handles listing and creating information hub articles.
 * Reads from static data with database-ready POST handler.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { z } from 'zod';
import {
  informationArticles as baseArticles,
  informationSections,
  informationCategories,
  type InformationArticle,
} from '@/data/information-hub-content';
import { extendedInformationArticles } from '@/data/information-hub-articles-extended';

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic';

// Validation schema for query parameters
const ArticleQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('1'),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val, 10), 50))
    .default('20'),
  section: z.string().optional(),
  category: z.string().optional(),
  published: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'reading_time', 'title']).default('newest'),
});

// Validation schema for creating a new article
const CreateArticleSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  section_id: z.string().min(1, 'Section ID is required'),
  category_id: z.string().min(1, 'Category ID is required'),
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  excerpt_en: z.string().optional().default(''),
  excerpt_ar: z.string().optional().default(''),
  content_en: z.string().optional().default(''),
  content_ar: z.string().optional().default(''),
  featured_image: z.string().optional().default(''),
  reading_time: z.number().min(1).default(5),
  published: z.boolean().default(false),
  meta_title_en: z.string().optional().default(''),
  meta_title_ar: z.string().optional().default(''),
  meta_description_en: z.string().optional().default(''),
  meta_description_ar: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  page_type: z.string().optional().default('article'),
  seo_score: z.number().min(0).max(100).optional().default(0),
  faq_questions: z.array(z.object({
    question_en: z.string(),
    question_ar: z.string(),
    answer_en: z.string(),
    answer_ar: z.string(),
  })).optional().default([]),
});

// Helper: resolve section and category names for an article
function enrichArticle(article: InformationArticle) {
  const section = informationSections.find((s) => s.id === article.section_id);
  const category = informationCategories.find((c) => c.id === article.category_id);
  return {
    ...article,
    created_at: article.created_at.toISOString(),
    updated_at: article.updated_at.toISOString(),
    section: section
      ? {
          id: section.id,
          slug: section.slug,
          name_en: section.name_en,
          name_ar: section.name_ar,
        }
      : null,
    category: category
      ? {
          id: category.id,
          slug: category.slug,
          name_en: category.name_en,
          name_ar: category.name_ar,
        }
      : null,
  };
}

// GET - List information articles (public with optional admin filtering)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = ArticleQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { page, limit, section, category, published, search, sort } = validation.data;
    const offset = (page - 1) * limit;

    // Start with all articles from static data
    let filtered = [...informationArticles];

    // Filter by section slug
    if (section) {
      const sectionObj = informationSections.find((s) => s.slug === section);
      if (sectionObj) {
        filtered = filtered.filter((a) => a.section_id === sectionObj.id);
      } else {
        filtered = [];
      }
    }

    // Filter by category slug
    if (category) {
      const categoryObj = informationCategories.find((c) => c.slug === category);
      if (categoryObj) {
        filtered = filtered.filter((a) => a.category_id === categoryObj.id);
      } else {
        filtered = [];
      }
    }

    // Filter by published status
    if (published !== undefined) {
      const isPublished = published === 'true';
      filtered = filtered.filter((a) => a.published === isPublished);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title_en.toLowerCase().includes(searchLower) ||
          a.title_ar.includes(search) ||
          a.excerpt_en.toLowerCase().includes(searchLower) ||
          a.slug.includes(searchLower)
      );
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        filtered.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        break;
      case 'reading_time':
        filtered.sort((a, b) => b.reading_time - a.reading_time);
        break;
      case 'title':
        filtered.sort((a, b) => a.title_en.localeCompare(b.title_en));
        break;
      default:
        filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }

    // Pagination
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedArticles = filtered.slice(offset, offset + limit);
    const enrichedArticles = paginatedArticles.map(enrichArticle);

    return NextResponse.json({
      success: true,
      data: enrichedArticles,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      },
      meta: {
        section,
        category,
        published,
        search_query: search,
        sort_by: sort,
        source: 'static',
      },
    });
  } catch (error) {
    console.error('Information articles listing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch information articles',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new information article (admin only)
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = CreateArticleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid article data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify section exists
    const section = informationSections.find((s) => s.id === data.section_id);
    if (!section) {
      return NextResponse.json(
        { error: 'Invalid section_id. Section not found.' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = informationCategories.find((c) => c.id === data.category_id);
    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category_id. Category not found.' },
        { status: 400 }
      );
    }

    // Check for slug uniqueness in existing static data
    const existingArticle = informationArticles.find((a) => a.slug === data.slug);
    if (existingArticle) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 409 }
      );
    }

    // Generate a new article object (simulates database insert)
    const newArticle = {
      id: `iart-${Date.now()}`,
      slug: data.slug,
      section_id: data.section_id,
      category_id: data.category_id,
      title_en: data.title_en,
      title_ar: data.title_ar,
      excerpt_en: data.excerpt_en,
      excerpt_ar: data.excerpt_ar,
      content_en: data.content_en,
      content_ar: data.content_ar,
      featured_image: data.featured_image,
      reading_time: data.reading_time,
      published: data.published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta_title_en: data.meta_title_en,
      meta_title_ar: data.meta_title_ar,
      meta_description_en: data.meta_description_en,
      meta_description_ar: data.meta_description_ar,
      tags: data.tags,
      keywords: data.keywords,
      page_type: data.page_type,
      seo_score: data.seo_score,
      faq_questions: data.faq_questions,
      section: {
        id: section.id,
        slug: section.slug,
        name_en: section.name_en,
        name_ar: section.name_ar,
      },
      category: {
        id: category.id,
        slug: category.slug,
        name_en: category.name_en,
        name_ar: category.name_ar,
      },
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Information article created successfully',
        data: newArticle,
        note: 'Article created in memory. Database persistence will be available once the InformationArticle model is added to the database.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Information article creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create information article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
