export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/social/x-buzz
 *
 * Returns trending X/Twitter posts about London travel.
 * Uses Grok's x_search via the Responses API.
 *
 * Query params:
 *   ?destination=London (default: London)
 *   ?limit=3 (default: 3, max: 6)
 *
 * Response:
 *   { posts: [{ postUrl, handle, text, trend, engagement }] }
 */
export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination') || 'London';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '3'), 6);

  try {
    const { isGrokSearchAvailable, searchSocialBuzz } = await import(
      '@/lib/ai/grok-live-search'
    );

    if (!isGrokSearchAvailable()) {
      return NextResponse.json(
        { posts: [], message: 'XAI_API_KEY not configured' },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
        },
      );
    }

    const result = await searchSocialBuzz(destination);

    // Parse the JSON response
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    let parsed: any[] = [];
    try {
      const data = JSON.parse(jsonStr);
      parsed = Array.isArray(data) ? data : [];
    } catch {
      console.warn('[x-buzz] Failed to parse Grok response');
    }

    // Map to XPostData format for the frontend component
    const posts = parsed.slice(0, limit).map((item: any) => ({
      postUrl: item.post_url || '',
      handle: item.handle || '',
      text: item.post_text || item.trend || '',
      trend: item.suggested_article_angle || item.trend || '',
      engagement: item.engagement || 'medium',
    })).filter((p: any) => p.postUrl || p.text); // Filter out empty items

    return NextResponse.json(
      { posts },
      {
        headers: {
          // Cache for 30 minutes — social buzz updates frequently but not per-request
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    console.error('[x-buzz] Failed to fetch social buzz:', error);
    return NextResponse.json(
      { posts: [], error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
