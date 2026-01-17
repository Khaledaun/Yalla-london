/**
 * Individual Blog Post API
 * Fetches a single blog post by slug with static content fallback
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { blogPosts, categories } from '@/data/blog-content';
import { extendedBlogPosts } from '@/data/blog-content-extended';

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

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

    // Try database first
    let post: any = null;

    try {
      post = await prisma.blogPost.findUnique({
        where: {
          slug,
          published: true
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
    } catch (dbError) {
      console.log('Database unavailable, checking static content:', dbError);
    }

    // If not found in database, check static content
    if (!post) {
      const staticPost = allStaticPosts.find(p => p.slug === slug && p.published);

      if (staticPost) {
        const category = categories.find(c => c.id === staticPost.category_id);

        post = {
          id: staticPost.id,
          title_en: staticPost.title_en,
          title_ar: staticPost.title_ar,
          content_en: staticPost.content_en,
          content_ar: staticPost.content_ar,
          excerpt_en: staticPost.excerpt_en,
          excerpt_ar: staticPost.excerpt_ar,
          slug: staticPost.slug,
          featured_image: staticPost.featured_image,
          created_at: staticPost.created_at,
          updated_at: staticPost.updated_at,
          published: staticPost.published,
          page_type: staticPost.page_type,
          seo_score: staticPost.seo_score,
          tags: staticPost.tags,
          meta_title_en: staticPost.meta_title_en,
          meta_title_ar: staticPost.meta_title_ar,
          meta_description_en: staticPost.meta_description_en,
          meta_description_ar: staticPost.meta_description_ar,
          category: category ? {
            id: category.id,
            name_en: category.name_en,
            name_ar: category.name_ar,
            slug: category.slug
          } : null,
          author: {
            id: 'author-yalla',
            name: 'Yalla London Editorial',
            email: 'editorial@yalla-london.com',
            image: null
          },
          place: null
        };
      }
    }

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
