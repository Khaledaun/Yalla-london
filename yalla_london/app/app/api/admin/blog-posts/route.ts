/**
 * Admin Blog Posts Management API
 * Full CRUD operations for blog post management through admin dashboard
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schemas
const BlogPostCreateSchema = z.object({
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  excerpt_en: z.string().min(1, 'English excerpt is required'),
  excerpt_ar: z.string().min(1, 'Arabic excerpt is required'),
  content_en: z.string().min(1, 'English content is required'),
  content_ar: z.string().min(1, 'Arabic content is required'),
  slug: z.string().min(1, 'Slug is required'),
  category_id: z.string().uuid('Valid category ID is required'),
  author_id: z.string().uuid('Valid author ID is required'),
  featured_image: z.string().url('Valid featured image URL is required'),
  page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).default('guide'),
  tags: z.array(z.string()).default([]),
  meta_title_en: z.string().optional(),
  meta_title_ar: z.string().optional(),
  meta_description_en: z.string().optional(),
  meta_description_ar: z.string().optional(),
  place_id: z.string().uuid().optional(),
  published: z.boolean().default(false),
  seo_score: z.number().min(0).max(100).default(0)
});

const BlogPostUpdateSchema = BlogPostCreateSchema.partial();

/**
 * GET /api/admin/blog-posts
 * Get all blog posts for admin management with filtering and pagination
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status'); // published, draft, all
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (status === 'published') {
      where.published = true;
    } else if (status === 'draft') {
      where.published = false;
    }
    
    if (category) {
      where.category = {
        slug: category
      };
    }
    
    if (search) {
      where.OR = [
        {
          title_en: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          title_ar: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    // Fetch blog posts with all related data
    const [blogPosts, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name_en: true,
              name_ar: true,
              slug: true
            }
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          place: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true
            }
          }
        },
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.blogPost.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: blogPosts,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      },
      meta: {
        status_filter: status,
        category_filter: category,
        search_query: search
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch blog posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/blog-posts
 * Create a new blog post
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = BlogPostCreateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid blog post data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Check for duplicate slug
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: data.slug }
    });
    
    if (existingPost) {
      return NextResponse.json(
        { error: 'A blog post with this slug already exists' },
        { status: 400 }
      );
    }
    
    // Verify category and author exist
    const [category, author] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.category_id } }),
      prisma.user.findUnique({ where: { id: data.author_id } })
    ]);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }
    
    if (!author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 400 }
      );
    }
    
    // Create the blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name_en: true,
            name_ar: true,
            slug: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Blog post created successfully',
      data: blogPost
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create blog post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});