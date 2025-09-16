/**
 * Individual Blog Post Management API
 * CRUD operations for individual blog posts
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const BlogPostUpdateSchema = z.object({
  title_en: z.string().min(1, 'English title is required').optional(),
  title_ar: z.string().min(1, 'Arabic title is required').optional(),
  excerpt_en: z.string().min(1, 'English excerpt is required').optional(),
  excerpt_ar: z.string().min(1, 'Arabic excerpt is required').optional(),
  content_en: z.string().min(1, 'English content is required').optional(),
  content_ar: z.string().min(1, 'Arabic content is required').optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  category_id: z.string().uuid('Valid category ID is required').optional(),
  author_id: z.string().uuid('Valid author ID is required').optional(),
  featured_image: z.string().url('Valid featured image URL is required').optional(),
  page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).optional(),
  tags: z.array(z.string()).optional(),
  meta_title_en: z.string().optional(),
  meta_title_ar: z.string().optional(),
  meta_description_en: z.string().optional(),
  meta_description_ar: z.string().optional(),
  place_id: z.string().uuid().nullable().optional(),
  published: z.boolean().optional(),
  seo_score: z.number().min(0).max(100).optional()
});

/**
 * GET /api/admin/blog-posts/[id]
 * Get a specific blog post by ID
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }
    
    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
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
            category: true,
            lat: true,
            lng: true
          }
        }
      }
    });
    
    if (!blogPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: blogPost
    });
    
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/blog-posts/[id]
 * Update a specific blog post
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const validation = BlogPostUpdateSchema.safeParse(body);
    
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
    
    // Check if blog post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id }
    });
    
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    // Check for duplicate slug if updating slug
    if (data.slug && data.slug !== existingPost.slug) {
      const duplicatePost = await prisma.blogPost.findUnique({
        where: { slug: data.slug }
      });
      
      if (duplicatePost) {
        return NextResponse.json(
          { error: 'A blog post with this slug already exists' },
          { status: 400 }
        );
      }
    }
    
    // Verify category and author exist if updating them
    if (data.category_id) {
      const category = await prisma.category.findUnique({
        where: { id: data.category_id }
      });
      
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        );
      }
    }
    
    if (data.author_id) {
      const author = await prisma.user.findUnique({
        where: { id: data.author_id }
      });
      
      if (!author) {
        return NextResponse.json(
          { error: 'Author not found' },
          { status: 400 }
        );
      }
    }
    
    // Update the blog post
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
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
      message: 'Blog post updated successfully',
      data: updatedPost
    });
    
  } catch (error) {
    console.error('Failed to update blog post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/blog-posts/[id]
 * Delete a specific blog post
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }
    
    // Check if blog post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id }
    });
    
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    // Delete the blog post
    await prisma.blogPost.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/blog-posts/[id]
 * Toggle publish status or update specific fields
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Blog post ID is required' },
        { status: 400 }
      );
    }
    
    const { action, ...data } = await request.json();
    
    // Check if blog post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id }
    });
    
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    let updateData: any = { updated_at: new Date() };
    let message = 'Blog post updated successfully';
    
    switch (action) {
      case 'toggle_publish':
        updateData.published = !existingPost.published;
        message = `Blog post ${updateData.published ? 'published' : 'unpublished'} successfully`;
        break;
      case 'publish':
        updateData.published = true;
        message = 'Blog post published successfully';
        break;
      case 'unpublish':
        updateData.published = false;
        message = 'Blog post unpublished successfully';
        break;
      default:
        // Regular field updates
        const validation = BlogPostUpdateSchema.safeParse(data);
        if (!validation.success) {
          return NextResponse.json(
            { 
              error: 'Invalid blog post data',
              details: validation.error.issues
            },
            { status: 400 }
          );
        }
        updateData = { ...updateData, ...validation.data };
        break;
    }
    
    // Update the blog post
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: updateData,
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
      message,
      data: updatedPost
    });
    
  } catch (error) {
    console.error('Failed to update blog post:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});