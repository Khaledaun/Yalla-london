export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate branded Open Graph images for posts
 * Usage: /api/og?postId=123 or /api/og?title=...&description=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const title = searchParams.get('title') || 'Yalla London';
    const description = searchParams.get('description') || 'Your Guide to London';
    const type = searchParams.get('type') || 'website';
    const heroImage = searchParams.get('heroImage');
    
    let postTitle = title;
    let postDescription = description;
    let postHeroImage = heroImage;
    
    // If postId is provided, fetch post data
    if (postId) {
      try {
        const { prisma } = await import('@/lib/db');
        const article = await prisma.article.findUnique({
          where: { id: postId },
          include: { seoData: true }
        });
        
        if (article) {
          postTitle = article.title || title;
          postDescription = article.seoData?.metaDescription || 
                          article.excerpt || 
                          description;
          postHeroImage = article.featuredImage || heroImage;
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
        // Continue with provided params if DB fetch fails
      }
    }

    // Generate the OG image HTML with Yalla London branding
    const html = generateOGImageHTML({
      title: postTitle,
      description: postDescription,
      heroImage: postHeroImage,
      type
    });

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (error) {
    console.error('OG image generation error:', error);
    
    // Return fallback image HTML
    const fallbackHtml = generateOGImageHTML({
      title: 'Yalla London',
      description: 'Your Guide to London',
      heroImage: null,
      type: 'website'
    });
    
    return new Response(fallbackHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
}

/**
 * Generate OG image for a specific post
 */
export async function POST(request: NextRequest) {
  try {
    const { postId, title, description, heroImage, type = 'article' } = await request.json();

    if (!postId && !title) {
      return NextResponse.json(
        { success: false, error: 'Post ID or title is required' },
        { status: 400 }
      );
    }

    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = request.nextUrl.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();
    const baseUrl = getSiteDomain(siteId);
    
    // Generate the OG image URL
    const ogImageUrl = new URL('/api/og', baseUrl);
    if (postId) {
      ogImageUrl.searchParams.set('postId', postId);
    } else {
      ogImageUrl.searchParams.set('title', title);
      if (description) ogImageUrl.searchParams.set('description', description);
      if (heroImage) ogImageUrl.searchParams.set('heroImage', heroImage);
      ogImageUrl.searchParams.set('type', type);
    }

    return NextResponse.json({
      success: true,
      imageUrl: ogImageUrl.toString(),
      message: 'OG image URL generated successfully'
    });

  } catch (error) {
    console.error('Error generating OG image URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OG image URL' },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML for OG image with Yalla London branding
 */
function generateOGImageHTML({
  title,
  description,
  heroImage,
  type
}: {
  title: string;
  description: string;
  heroImage?: string | null;
  type: string;
}) {
  // Truncate text to fit properly
  const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const truncatedDesc = description.length > 120 ? description.substring(0, 117) + '...' : description;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .background-pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
          }
          
          .brand {
            position: absolute;
            top: 40px;
            left: 60px;
            display: flex;
            align-items: center;
            z-index: 10;
          }
          
          .brand-logo {
            width: 50px;
            height: 50px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
          }
          
          .brand-text {
            font-size: 32px;
            font-weight: bold;
            color: #fff;
          }
          
          .content {
            max-width: 900px;
            padding: 0 60px;
            z-index: 10;
            display: flex;
            align-items: center;
            gap: 40px;
          }
          
          .text-content {
            flex: 1;
            text-align: left;
          }
          
          .title {
            font-size: 56px;
            font-weight: bold;
            line-height: 1.1;
            margin-bottom: 20px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .description {
            font-size: 24px;
            opacity: 0.9;
            line-height: 1.3;
            max-width: 600px;
          }
          
          .hero-image {
            width: 280px;
            height: 280px;
            border-radius: 20px;
            object-fit: cover;
            border: 4px solid rgba(255,255,255,0.2);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          
          .type-badge {
            position: absolute;
            bottom: 40px;
            right: 60px;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            backdrop-filter: blur(10px);
          }
        </style>
      </head>
      <body>
        <div class="background-pattern"></div>
        
        <div class="brand">
          <div class="brand-logo">YL</div>
          <div class="brand-text">Yalla London</div>
        </div>
        
        <div class="content">
          <div class="text-content">
            <div class="title">${truncatedTitle}</div>
            <div class="description">${truncatedDesc}</div>
          </div>
          ${heroImage ? `<img src="${heroImage}" alt="" class="hero-image">` : ''}
        </div>
        
        <div class="type-badge">${type}</div>
      </body>
    </html>
  `;
}