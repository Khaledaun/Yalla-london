/**
 * Programmatic Pages API
 * POST /api/seo/programmatic-pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { programmaticPagesService } from '@/lib/seo/programmatic-pages-service';
import { isSEOEnabled } from '@/lib/flags';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, locale, count, priority, keywordClusters, autoPublish } = body;

    if (!category || !locale) {
      return NextResponse.json(
        { error: 'Missing required fields: category, locale' },
        { status: 400 }
      );
    }

    const result = await programmaticPagesService.generateProgrammaticPages({
      category,
      locale,
      count: count || 10,
      priority: priority || 'medium',
      keywordClusters,
      autoPublish: autoPublish || false
    });

    return NextResponse.json({
      success: result.success,
      result
    });

  } catch (error) {
    console.error('Programmatic pages generation failed:', error);
    return NextResponse.json(
      { error: 'Programmatic pages generation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    if (!isSEOEnabled()) {
      return NextResponse.json(
        { error: 'SEO features are disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'london_travel';
    const locale = searchParams.get('locale') as 'en' | 'ar' || 'en';
    const limit = parseInt(searchParams.get('limit') || '50');

    const pages = await programmaticPagesService.getProgrammaticPagesByCategory(
      category,
      locale,
      limit
    );

    return NextResponse.json({
      success: true,
      pages,
      count: pages.length
    });

  } catch (error) {
    console.error('Failed to get programmatic pages:', error);
    return NextResponse.json(
      { error: 'Failed to get programmatic pages' },
      { status: 500 }
    );
  }
}







