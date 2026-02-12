/**
 * Information Hub Sections API
 * GET - List all sections with article counts
 * PUT - Update section content (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { z } from 'zod';
import {
  informationArticles,
  informationSections,
  type InformationSection,
} from '@/data/information-hub-content';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema for updating a section
const UpdateSectionSchema = z.object({
  id: z.string().min(1, 'Section ID is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  icon: z.string().optional(),
  sort_order: z.number().min(1).optional(),
  published: z.boolean().optional(),
  name_en: z.string().min(1).optional(),
  name_ar: z.string().min(1).optional(),
});

// Helper: compute article counts per section
function getSectionWithCounts(section: InformationSection) {
  const allArticlesInSection = informationArticles.filter(
    (a) => a.section_id === section.id
  );
  const publishedArticles = allArticlesInSection.filter((a) => a.published);
  const draftArticles = allArticlesInSection.filter((a) => !a.published);

  return {
    ...section,
    article_count: allArticlesInSection.length,
    published_count: publishedArticles.length,
    draft_count: draftArticles.length,
    latest_article: publishedArticles.length > 0
      ? (() => {
          const latest = publishedArticles.sort(
            (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
          )[0];
          return {
            id: latest.id,
            slug: latest.slug,
            title_en: latest.title_en,
            updated_at: latest.updated_at.toISOString(),
          };
        })()
      : null,
  };
}

// GET - List all sections with article counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    let sections = [...informationSections];

    // Optionally filter to published sections only
    if (publishedOnly) {
      sections = sections.filter((s) => s.published);
    }

    // Sort by sort_order
    sections.sort((a, b) => a.sort_order - b.sort_order);

    // Enrich with article counts
    const enrichedSections = sections.map(getSectionWithCounts);

    // Compute totals
    const totalArticles = informationArticles.length;
    const publishedArticles = informationArticles.filter((a) => a.published).length;

    return NextResponse.json({
      success: true,
      data: enrichedSections,
      summary: {
        total_sections: sections.length,
        published_sections: sections.filter((s) => s.published).length,
        total_articles: totalArticles,
        published_articles: publishedArticles,
        draft_articles: totalArticles - publishedArticles,
      },
    });
  } catch (error) {
    console.error('Failed to fetch information sections:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch information sections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update section content (admin only)
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = UpdateSectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid section update data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Find existing section
    const existingSection = informationSections.find((s) => s.id === data.id);
    if (!existingSection) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Build the updated section object (simulates database update)
    const updatedSection = {
      ...existingSection,
      ...(data.description_en !== undefined && { description_en: data.description_en }),
      ...(data.description_ar !== undefined && { description_ar: data.description_ar }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
      ...(data.published !== undefined && { published: data.published }),
      ...(data.name_en !== undefined && { name_en: data.name_en }),
      ...(data.name_ar !== undefined && { name_ar: data.name_ar }),
    };

    // Enrich with article counts
    const enrichedSection = getSectionWithCounts(updatedSection);

    return NextResponse.json({
      success: true,
      message: 'Section updated successfully',
      data: enrichedSection,
      note: 'Update applied in memory. Database persistence will be available once the InformationSection model is added to the database.',
    });
  } catch (error) {
    console.error('Section update failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to update section',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
