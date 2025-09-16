/**
 * Individual Blog Post API
 * Fetches a single blog post by slug for public consumption
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Fetch the blog post by slug
    const post = await prisma.blogPost.findUnique({
      where: { 
        slug,
        published: true // Only show published posts on public site
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
            category: true,
            lat: true,
            lng: true
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: post
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
}