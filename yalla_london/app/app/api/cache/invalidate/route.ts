/**
 * Cache Invalidation API Endpoint
 * Handles real-time cache invalidation for content updates
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const { contentType, contentId, paths } = await request.json();

    // Validate input
    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType is required' },
        { status: 400 }
      );
    }

    // Perform cache invalidation based on content type
    switch (contentType) {
      case 'blog':
        revalidateTag('blog-posts');
        revalidatePath('/blog');
        if (contentId) {
          revalidatePath(`/blog/${contentId}`);
        }
        // Also invalidate homepage since it shows latest blog posts
        revalidatePath('/');
        break;

      case 'homepage':
        revalidateTag('homepage-content');
        revalidateTag('homepage-blocks');
        revalidatePath('/');
        break;

      case 'media':
        revalidateTag('media-assets');
        // Invalidate any page that might use media
        revalidatePath('/blog');
        revalidatePath('/');
        break;

      case 'category':
        revalidateTag('categories');
        revalidatePath('/blog');
        revalidatePath('/');
        break;

      case 'all':
        // Nuclear option - clear everything
        revalidateTag('blog-posts');
        revalidateTag('homepage-content');
        revalidateTag('homepage-blocks');
        revalidateTag('media-assets');
        revalidateTag('categories');
        revalidatePath('/');
        revalidatePath('/blog');
        break;

      default:
        return NextResponse.json(
          { error: `Unknown content type: ${contentType}` },
          { status: 400 }
        );
    }

    // If specific paths are provided, invalidate them too
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path === 'string' && path.startsWith('/')) {
          revalidatePath(path);
        }
      }
    }

    console.log(`Cache invalidated for ${contentType}${contentId ? ` (ID: ${contentId})` : ''}`);

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for ${contentType}`,
      contentType,
      contentId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}