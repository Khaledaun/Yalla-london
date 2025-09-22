/**
 * Dynamic Internal Linking API
 * POST /api/seo/internal-linking
 */

import { NextRequest, NextResponse } from 'next/server';
import { dynamicInternalLinking } from '@/lib/seo/dynamic-internal-linking';
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
    const { pageId, content, title, category } = body;

    if (!pageId || !content || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, content, title' },
        { status: 400 }
      );
    }

    const result = await dynamicInternalLinking.generateInternalLinks(
      pageId,
      content,
      title,
      category || 'general'
    );

    return NextResponse.json({
      success: result.success,
      result
    });

  } catch (error) {
    console.error('Internal linking generation failed:', error);
    return NextResponse.json(
      { error: 'Internal linking generation failed' },
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

    const links = await dynamicInternalLinking.getInternalLinks(pageId);

    return NextResponse.json({
      success: true,
      links,
      count: links.length
    });

  } catch (error) {
    console.error('Failed to get internal links:', error);
    return NextResponse.json(
      { error: 'Failed to get internal links' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pageId, content, title, category } = body;

    if (!pageId || !content || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, content, title' },
        { status: 400 }
      );
    }

    const result = await dynamicInternalLinking.updateInternalLinks(
      pageId,
      content,
      title,
      category || 'general'
    );

    return NextResponse.json({
      success: result.success,
      result
    });

  } catch (error) {
    console.error('Internal linking update failed:', error);
    return NextResponse.json(
      { error: 'Internal linking update failed' },
      { status: 500 }
    );
  }
}



