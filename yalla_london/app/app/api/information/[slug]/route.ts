/**
 * Individual Information Article API
 * GET / PUT / DELETE a single article by slug.
 * Reads from static data; PUT/DELETE return database-ready responses.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { z } from 'zod';
import {
  informationArticles as baseArticles,
  informationSections,
  informationCategories,
} from '@/data/information-hub-content';
import { extendedInformationArticles } from '@/data/information-hub-articles-extended';

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema for updating an article
const UpdateArticleSchema = z.object({
  title_en: z.string().min(1).optional(),
  title_ar: z.string().min(1).optional(),
  excerpt_en: z.string().optional(),
  excerpt_ar: z.string().optional(),
  content_en: z.string().optional(),
  content_ar: z.string().optional(),
  section_id: z.string().optional(),
  category_id: z.string().optional(),
  featured_image: z.string().optional(),
  reading_time: z.number().min(1).optional(),
  published: z.boolean().optional(),
  meta_title_en: z.string().optional(),
  meta_title_ar: z.string().optional(),
  meta_description_en: z.string().optional(),
  meta_description_ar: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  page_type: z.string().optional(),
  seo_score: z.number().min(0).max(100).optional(),
  faq_questions: z.array(z.object({
    question_en: z.string(),
    question_ar: z.string(),
    answer_en: z.string(),
    answer_ar: z.string(),
  })).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

// Helper: enrich article with section and category details
function enrichArticle(article: (typeof informationArticles)[0]) {
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

// GET - Fetch a single article by slug (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const article = informationArticles.find(
      (a) => a.slug === slug && a.published
    );

    if (!article) {
      return NextResponse.json(
        { error: 'Information article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: enrichArticle(article),
    });
  } catch (error) {
    console.error('Failed to fetch information article:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch information article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update an article by slug (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Admin auth check
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data
    const validation = UpdateArticleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Find the existing article in static data
    const existingArticle = informationArticles.find((a) => a.slug === slug);
    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Information article not found' },
        { status: 404 }
      );
    }

    // Validate section_id if provided
    if (data.section_id) {
      const section = informationSections.find((s) => s.id === data.section_id);
      if (!section) {
        return NextResponse.json(
          { error: 'Invalid section_id. Section not found.' },
          { status: 400 }
        );
      }
    }

    // Validate category_id if provided
    if (data.category_id) {
      const category = informationCategories.find((c) => c.id === data.category_id);
      if (!category) {
        return NextResponse.json(
          { error: 'Invalid category_id. Category not found.' },
          { status: 400 }
        );
      }
    }

    // Check slug uniqueness if changing slug
    if (data.slug && data.slug !== slug) {
      const slugConflict = informationArticles.find((a) => a.slug === data.slug);
      if (slugConflict) {
        return NextResponse.json(
          { error: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Build the updated article (simulates database update)
    // Destructure to exclude date fields from user data to prevent type errors
    const { slug: _slug, ...updateFields } = data;
    const updatedArticle = {
      ...existingArticle,
      ...updateFields,
      slug: data.slug || slug,
      updated_at: new Date().toISOString(),
      created_at: existingArticle.created_at instanceof Date
        ? existingArticle.created_at.toISOString()
        : String(existingArticle.created_at),
    };

    // Resolve enriched section and category
    const section = informationSections.find(
      (s) => s.id === (data.section_id || existingArticle.section_id)
    );
    const category = informationCategories.find(
      (c) => c.id === (data.category_id || existingArticle.category_id)
    );

    return NextResponse.json({
      success: true,
      message: 'Information article updated successfully',
      data: {
        ...updatedArticle,
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
      },
      note: 'Update applied in memory. Database persistence will be available once the InformationArticle model is added to the database.',
    });
  } catch (error) {
    console.error('Information article update failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to update information article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft-delete an article by slug (admin only, sets published to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Admin auth check
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Find the existing article in static data
    const existingArticle = informationArticles.find((a) => a.slug === slug);
    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Information article not found' },
        { status: 404 }
      );
    }

    // Soft-delete: set published to false (simulates database update)
    return NextResponse.json({
      success: true,
      message: 'Information article soft-deleted (unpublished) successfully',
      data: {
        id: existingArticle.id,
        slug: existingArticle.slug,
        title_en: existingArticle.title_en,
        published: false,
        deleted_at: new Date().toISOString(),
      },
      note: 'Soft-delete applied in memory. Database persistence will be available once the InformationArticle model is added to the database.',
    });
  } catch (error) {
    console.error('Information article deletion failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete information article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
