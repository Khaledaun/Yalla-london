export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { title, description, type = 'website' } = await request.json();

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you'd use a service like:
    // - Vercel OG (https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation)
    // - Cloudinary
    // - Custom canvas/puppeteer solution
    // - External service like htmlcsstoimage.com
    
    // For now, we'll return a placeholder implementation
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = request.nextUrl.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();
    const baseUrl = getSiteDomain(siteId);
    
    // Generate OG image URL using a service like htmlcsstoimage.com or similar
    // This is a placeholder - in production you'd implement actual image generation
    const imageParams = new URLSearchParams({
      title: title.substring(0, 70), // Limit title length
      description: description ? description.substring(0, 120) : '',
      type: type,
      template: siteId, // Per-site template
      width: '1200',
      height: '630'
    });

    // Simulated OG image generation
    const generatedImageUrl = `${baseUrl}/api/og-image?${imageParams.toString()}`;

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      message: 'OG image generated successfully'
    });

  } catch (error) {
    console.error('Error generating OG image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OG image' },
      { status: 500 }
    );
  }
}

// GET endpoint for the actual OG image generation (placeholder)
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title') || 'Yalla London';
  const description = searchParams.get('description') || 'Your Guide to London';
  const type = searchParams.get('type') || 'website';
  
  // This would generate the actual image using canvas, Puppeteer, or similar
  // For now, return a placeholder response
  
  const html = `
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            position: relative;
          }
          
          .brand {
            position: absolute;
            top: 60px;
            left: 60px;
            font-size: 32px;
            font-weight: bold;
            color: #fff;
          }
          
          .content {
            max-width: 1000px;
            padding: 0 60px;
          }
          
          .title {
            font-size: 64px;
            font-weight: bold;
            line-height: 1.1;
            margin-bottom: 20px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .description {
            font-size: 28px;
            opacity: 0.9;
            line-height: 1.3;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
          }
        </style>
      </head>
      <body>
        <div class="pattern"></div>
        <div class="brand">Yalla London</div>
        <div class="content">
          <div class="title">${title}</div>
          <div class="description">${description}</div>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
