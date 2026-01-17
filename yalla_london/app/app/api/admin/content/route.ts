/**
 * Admin Content Management API
 * Handles CRUD operations for blog posts with automatic cache invalidation
 */
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { cacheService } from '@/lib/cache-invalidation';
import { enhancedSync } from '@/lib/enhanced-sync';
import { autoSEOService } from '@/lib/seo/auto-seo-service';
import { isSEOEnabled } from '@/lib/flags';
import { withAdminAuth } from '@/lib/admin-middleware';
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
export const POST = withAdminAuth(async (request: NextRequest) => {
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

    // Apply auto-SEO if enabled
    if (isSEOEnabled()) {
      try {
        const contentData = {
          id: newPost.id,
          title: newPost.title_en,
          content: newPost.content_en,
          slug: newPost.slug,
          excerpt: newPost.excerpt_en,
          author: newPost.author?.name || 'Unknown',
          publishedAt: newPost.created_at.toISOString(),
          language: 'en' as const,
          category: newPost.category?.name_en || 'General',
          tags: newPost.tags || [],
          featuredImage: newPost.featured_image,
          pageType: 'article' as const,
          type: 'article' as const
        };

        await autoSEOService.applyAutoSEO(contentData);
        console.log(`Auto-SEO applied for new blog post: ${newPost.slug}`);
      } catch (seoError) {
        console.warn('Auto-SEO failed for new blog post:', seoError);
        // Continue without failing the content creation
      }
    }

    // Trigger enhanced sync for real-time updates
    try {
      const syncResult = await enhancedSync.forceSync('blog', newPost.slug);
      console.log(`Enhanced sync completed for new blog post: ${newPost.slug}`, syncResult);
    } catch (syncError) {
      console.warn('Enhanced sync failed, falling back to basic cache invalidation:', syncError);
      // Fallback to basic cache invalidation
      try {
        await cacheService.invalidateContentCache('blog', newPost.slug);
        console.log(`Fallback cache invalidated for new blog post: ${newPost.slug}`);
      } catch (cacheError) {
        console.warn('Fallback cache invalidation also failed:', cacheError);
      }
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
});

// UPDATE - Existing blog post
export const PUT = withAdminAuth(async (request: NextRequest) => {
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

    // Apply auto-SEO if enabled and content was updated
    if (isSEOEnabled() && (data.title_en || data.content_en || data.excerpt_en)) {
      try {
        const contentData = {
          id: updatedPost.id,
          title: updatedPost.title_en,
          content: updatedPost.content_en,
          slug: updatedPost.slug,
          excerpt: updatedPost.excerpt_en,
          author: updatedPost.author?.name || 'Unknown',
          publishedAt: updatedPost.updated_at.toISOString(),
          language: 'en' as const,
          category: updatedPost.category?.name_en || 'General',
          tags: updatedPost.tags || [],
          featuredImage: updatedPost.featured_image,
          pageType: 'article' as const,
          type: 'article' as const
        };

        await autoSEOService.applyAutoSEO(contentData);
        console.log(`Auto-SEO applied for updated blog post: ${updatedPost.slug}`);
      } catch (seoError) {
        console.warn('Auto-SEO failed for updated blog post:', seoError);
        // Continue without failing the content update
      }
    }

    // Trigger enhanced sync for real-time updates
    const slugToInvalidate = data.slug || existingPost.slug;
    try {
      const syncResult = await enhancedSync.forceSync('blog', slugToInvalidate);
      console.log(`Enhanced sync completed for updated blog post: ${slugToInvalidate}`, syncResult);
      
      // If slug changed, also sync the old slug
      if (data.slug && data.slug !== existingPost.slug) {
        await enhancedSync.forceSync('blog', existingPost.slug);
      }
    } catch (syncError) {
      console.warn('Enhanced sync failed, falling back to basic cache invalidation:', syncError);
      // Fallback to basic cache invalidation
      try {
        await cacheService.invalidateContentCache('blog', slugToInvalidate);
        if (data.slug && data.slug !== existingPost.slug) {
          await cacheService.invalidateContentCache('blog', existingPost.slug);
        }
        console.log(`Fallback cache invalidated for updated blog post: ${slugToInvalidate}`);
      } catch (cacheError) {
        console.warn('Fallback cache invalidation also failed:', cacheError);
      }
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
});

// DELETE - Blog post
export const DELETE = withAdminAuth(async (request: NextRequest) => {
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
});

// GET - List all posts for admin (includes unpublished)
export const GET = withAdminAuth(async (request: NextRequest) => {
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
});