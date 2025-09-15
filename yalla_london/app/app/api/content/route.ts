/**
 * Phase 4C Public Content API
 * Public endpoint for content listing and discovery
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Zod schemas for validation
const ContentQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val, 10), 50)).default('10'),
  category: z.string().optional(),
  locale: z.enum(['en', 'ar']).default('en'),
  page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).optional(),
  place_id: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'popular', 'seo_score']).default('newest'),
});

// GET - List published content (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = ContentQuerySchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { 
      page, 
      limit, 
      category, 
      locale, 
      page_type, 
      place_id, 
      search, 
      sort 
    } = validation.data;

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      published: true,
    };

    // Add category filter
    if (category) {
      where.category = {
        slug: category
      };
    }

    // Add page type filter
    if (page_type) {
      where.page_type = page_type;
    }

    // Add place filter
    if (place_id) {
      where.place_id = place_id;
    }

    // Add search filter
    if (search) {
      const searchTerms = search.split(' ').filter(term => term.length > 2);
      if (searchTerms.length > 0) {
        where.OR = [
          {
            [`title_${locale}`]: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            [`excerpt_${locale}`]: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              hasSome: searchTerms
            }
          }
        ];
      }
    }

    // Build order by clause
    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = { created_at: 'asc' };
        break;
      case 'popular':
        orderBy = { featured_image: 'desc' }; // Placeholder for view count
        break;
      case 'seo_score':
        orderBy = { seo_score: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { created_at: 'desc' };
        break;
    }

    // Fetch content with pagination
    const [content, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          [`title_${locale}`]: true,
          [`excerpt_${locale}`]: true,
          slug: true,
          featured_image: true,
          page_type: true,
          seo_score: true,
          tags: true,
          created_at: true,
          updated_at: true,
          category: {
            select: {
              name_en: true,
              name_ar: true,
              slug: true
            }
          },
          place: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              lat: true,
              lng: true
            }
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.blogPost.count({ where })
    ]);

    // Transform response for public consumption
    const transformedContent = content.map((post: any) => ({
      id: post.id,
      title: post[`title_${locale}` as keyof typeof post] as string,
      excerpt: post[`excerpt_${locale}` as keyof typeof post] as string,
      slug: post.slug,
      featured_image: post.featured_image,
      page_type: post.page_type,
      seo_score: post.seo_score,
      tags: post.tags,
      created_at: post.created_at,
      updated_at: post.updated_at,
      category: post.category,
      place: post.place,
      author: post.author,
      url: `${process.env.NEXTAUTH_URL || 'https://yalla-london.com'}/blog/${post.slug}`
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get featured content for homepage
    let featuredContent = [];
    if (page === 1 && !search && !category) {
      featuredContent = await prisma.blogPost.findMany({
        where: {
          published: true,
          seo_score: { gte: 80 } // High SEO score content
        },
        select: {
          id: true,
          [`title_${locale}`]: true,
          [`excerpt_${locale}`]: true,
          slug: true,
          featured_image: true,
          page_type: true,
          created_at: true,
          category: {
            select: {
              name_en: true,
              name_ar: true,
              slug: true
            }
          }
        },
        orderBy: { seo_score: 'desc' },
        take: 3
      });
    }

    return NextResponse.json({
      success: true,
      data: transformedContent,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      featured: featuredContent.length > 0 ? featuredContent : undefined,
      meta: {
        locale,
        category,
        page_type,
        place_id,
        search_query: search,
        sort_by: sort
      }
    });

  } catch (error) {
    console.error('Content listing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}