/**
 * Enhanced Sitemap API
 * GET /api/seo/sitemap
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedSitemapGenerator } from '@/lib/seo/enhanced-sitemap-generator';
import { isSEOEnabled } from '@/lib/flags';

export async function GET(request: NextRequest) {
  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const format = searchParams.get('format') || 'json';

    if (type) {
      // Generate specific sitemap type
      let sitemapData;
      switch (type) {
        case 'articles':
          sitemapData = await enhancedSitemapGenerator.generateArticlesSitemap();
          break;
        case 'programmatic':
          sitemapData = await enhancedSitemapGenerator.generateProgrammaticSitemap();
          break;
        case 'events':
          sitemapData = await enhancedSitemapGenerator.generateEventsSitemap();
          break;
        case 'places':
          sitemapData = await enhancedSitemapGenerator.generatePlacesSitemap();
          break;
        case 'static':
          sitemapData = await enhancedSitemapGenerator.generateStaticSitemap();
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid sitemap type' },
            { status: 400 }
          );
      }

      if (format === 'xml') {
        const xml = enhancedSitemapGenerator.generateXMLSitemap(sitemapData);
        return new NextResponse(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }

      return NextResponse.json({
        success: true,
        sitemap: sitemapData
      });
    } else {
      // Generate all sitemaps
      const result = await enhancedSitemapGenerator.generateAllSitemaps();

      if (format === 'xml') {
        const xml = enhancedSitemapGenerator.generateSitemapIndex(result.sitemaps);
        return new NextResponse(xml, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }

      return NextResponse.json({
        success: result.success,
        result
      });
    }

  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return NextResponse.json(
      { error: 'Sitemap generation failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, pageId, pageData } = body;

    if (action === 'generate') {
      const result = await enhancedSitemapGenerator.generateAllSitemaps();
      return NextResponse.json({
        success: result.success,
        result
      });
    } else if (action === 'update' && pageId && pageData) {
      await enhancedSitemapGenerator.updateSitemapForPage(pageId, pageData);
      return NextResponse.json({
        success: true,
        message: 'Sitemap updated for page'
      });
    } else if (action === 'ping') {
      const result = await enhancedSitemapGenerator.generateAllSitemaps();
      return NextResponse.json({
        success: result.success,
        pingResults: result.pingResults
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Sitemap action failed:', error);
    return NextResponse.json(
      { error: 'Sitemap action failed' },
      { status: 500 }
    );
  }
}

