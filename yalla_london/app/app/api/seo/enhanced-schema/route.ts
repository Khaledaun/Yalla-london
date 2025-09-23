/**
 * Enhanced Schema Injection API
 * POST /api/seo/enhanced-schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedSchemaInjector } from '@/lib/seo/enhanced-schema-injector';
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
    const { content, title, url, pageId, additionalData } = body;

    if (!content || !title || !url || !pageId) {
      return NextResponse.json(
        { error: 'Missing required fields: content, title, url, pageId' },
        { status: 400 }
      );
    }

    const result = await enhancedSchemaInjector.injectSchemas(
      content,
      title,
      url,
      pageId,
      additionalData
    );

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Enhanced schema injection failed:', error);
    return NextResponse.json(
      { error: 'Schema injection failed' },
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

    // Get existing schemas for the page
    const seoMeta = await prisma.seoMeta.findUnique({
      where: { pageId }
    });

    if (!seoMeta || !seoMeta.structuredData) {
      return NextResponse.json({
        success: true,
        schemas: [],
        injectedCount: 0,
        types: [],
        seoScore: 0
      });
    }

    const structuredData = seoMeta.structuredData as any;
    const schemas = Array.isArray(structuredData) ? structuredData : [structuredData];

    return NextResponse.json({
      success: true,
      schemas,
      injectedCount: schemas.length,
      types: schemas.map(s => s['@type']),
      seoScore: seoMeta.seoScore || 0
    });

  } catch (error) {
    console.error('Failed to get enhanced schemas:', error);
    return NextResponse.json(
      { error: 'Failed to get schemas' },
      { status: 500 }
    );
  }
}




