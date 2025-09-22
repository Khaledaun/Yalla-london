/**
 * AI SEO Audit API
 * POST /api/seo/audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiSEOAudit } from '@/lib/seo/ai-seo-audit';
import { isSEOEnabled } from '@/lib/flags';

export async function POST(request: NextRequest) {
  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pageId, url, title, metaDescription, content, images, links, headings, wordCount, readingTime, schemaData } = body;

    if (!pageId || !url || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, url, title, content' },
        { status: 400 }
      );
    }

    const auditData = {
      pageId,
      url,
      title,
      metaDescription: metaDescription || '',
      content,
      images: images || [],
      links: links || [],
      headings: headings || [],
      wordCount: wordCount || content.split(/\s+/).length,
      readingTime: readingTime || Math.ceil(content.split(/\s+/).length / 200),
      schemaData
    };

    const result = await aiSEOAudit.performSEOAudit(auditData);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('SEO audit failed:', error);
    return NextResponse.json(
      { error: 'SEO audit failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Missing pageId parameter' },
        { status: 400 }
      );
    }

    const result = await aiSEOAudit.getAuditResult(pageId);

    if (!result) {
      return NextResponse.json(
        { error: 'No audit result found for this page' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Failed to get SEO audit result:', error);
    return NextResponse.json(
      { error: 'Failed to get audit result' },
      { status: 500 }
    );
  }
}



