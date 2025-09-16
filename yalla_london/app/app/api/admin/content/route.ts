/**
 * Admin Content Management API
 * Handles CRUD operations for blog posts with automatic cache invalidation
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cacheService } from '@/lib/cache-invalidation';
import { z } from 'zod';

// Validation schema for blog post data
const BlogPostSchema = z.object({
  title_en: z.string().min(1, 'English title is required'),
  title_ar: z.string().min(1, 'Arabic title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  excerpt_en: z.string().optional(),
  excerpt_ar: z.string().optional(),
  content_en: z.string().min(1, 'English content is required'),
  content_ar: z.string().min(1, 'Arabic content is required'),
  featured_image: z.string().url().optional(),
  published: z.boolean().default(false),
  page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).optional(),
  category_id: z.string(),
  author_id: z.string(),
  tags: z.array(z.string()).default([]),
  meta_title_en: z.string().optional(),
  meta_title_ar: z.string().optional(),
  meta_description_en: z.string().optional(),
  meta_description_ar: z.string().optional(),
  place_id: z.string().optional(),
  seo_score: z.number().min(0).max(100).optional()
});

// CREATE - New blog post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validation = BlogPostSchema.safeParse(body);
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

    // Check if slug already exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: data.slug }
    });

    if (existingPost) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    // Create the blog post
    const newPost = await prisma.blogPost.create({
      data: {
        ...data,
        keywords_json: data.tags.length > 0 ? { primary: data.tags[0], longtails: data.tags.slice(1) } : null,
        seo_score: data.seo_score || 50
      },
      include: {
        category: true,
        author: true,
        place: true
      }
    });

    // Trigger cache invalidation for real-time updates
    try {
      await cacheService.invalidateContentCache('blog', newPost.slug);
      console.log(`Cache invalidated for new blog post: ${newPost.slug}`);
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
      // Continue execution - cache invalidation failure shouldn't break content creation
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post created successfully',
      data: {
        id: newPost.id,
        title_en: newPost.title_en,
        title_ar: newPost.title_ar,
        slug: newPost.slug,
        published: newPost.published,
        created_at: newPost.created_at,
        public_url: `/blog/${newPost.slug}`,
        category: newPost.category,
        author: newPost.author
      },
      cache_invalidated: true
    }, { status: 201 });

  } catch (error) {
    console.error('Blog post creation failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// UPDATE - Existing blog post
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required for updates' },
        { status: 400 }
      );
    }

    // Validate update data
    const PartialBlogPostSchema = BlogPostSchema.partial();
    const validation = PartialBlogPostSchema.safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid update data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
      select: { slug: true, published: true }
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check for slug conflicts (if slug is being updated)
    if (data.slug && data.slug !== existingPost.slug) {
      const slugConflict = await prisma.blogPost.findUnique({
        where: { slug: data.slug }
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update the blog post
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        keywords_json: data.tags ? { primary: data.tags[0], longtails: data.tags.slice(1) } : undefined,
        updated_at: new Date()
      },
      include: {
        category: true,
        author: true,
        place: true
      }
    });

    // Trigger cache invalidation for real-time updates
    const slugToInvalidate = data.slug || existingPost.slug;
    try {
      await cacheService.invalidateContentCache('blog', slugToInvalidate);
      
      // If slug changed, also invalidate the old slug
      if (data.slug && data.slug !== existingPost.slug) {
        await cacheService.invalidateContentCache('blog', existingPost.slug);
      }
      
      console.log(`Cache invalidated for updated blog post: ${slugToInvalidate}`);
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post updated successfully',
      data: {
        id: updatedPost.id,
        title_en: updatedPost.title_en,
        title_ar: updatedPost.title_ar,
        slug: updatedPost.slug,
        published: updatedPost.published,
        updated_at: updatedPost.updated_at,
        public_url: `/blog/${updatedPost.slug}`,
        category: updatedPost.category,
        author: updatedPost.author
      },
      cache_invalidated: true
    });

  } catch (error) {
    console.error('Blog post update failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Blog post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Get post info before deletion for cache invalidation
    const postToDelete = await prisma.blogPost.findUnique({
      where: { id },
      select: { slug: true, title_en: true }
    });

    if (!postToDelete) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Delete the blog post
    await prisma.blogPost.delete({
      where: { id }
    });

    // Trigger cache invalidation for real-time updates
    try {
      await cacheService.invalidateContentCache('blog', postToDelete.slug);
      console.log(`Cache invalidated for deleted blog post: ${postToDelete.slug}`);
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully',
      deleted_post: {
        id,
        slug: postToDelete.slug,
        title: postToDelete.title_en
      },
      cache_invalidated: true
    });

  } catch (error) {
    console.error('Blog post deletion failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - List all posts for admin (includes unpublished)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const published = searchParams.get('published');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title_en: { contains: search, mode: 'insensitive' } },
        { title_ar: { contains: search, mode: 'insensitive' } },
        { content_en: { contains: search, mode: 'insensitive' } },
        { content_ar: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (published !== null && published !== undefined) {
      where.published = published === 'true';
    }

    // Fetch posts with pagination
    const [posts, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          category: true,
          author: true,
          place: true
        },
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.blogPost.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      }
    });

  } catch (error) {
    console.error('Failed to fetch admin blog posts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch blog posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}