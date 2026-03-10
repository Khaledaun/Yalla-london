/**
 * DEPRECATED: Legacy sitemap API route
 *
 * This route previously generated sitemaps with incorrect ?lang=ar query parameter URLs
 * instead of proper /ar/ prefix routes. Google discovered these URLs and indexed them
 * as "Alternate page with proper canonical tag" — creating 10+ duplicate page issues in GSC.
 *
 * The correct sitemap is now served by /app/sitemap.ts (Next.js native sitemap).
 *
 * This route now returns a 301 redirect to /sitemap.xml for any GET requests,
 * ensuring Google follows the redirect and stops crawling the old endpoint.
 *
 * @see /app/sitemap.ts — the production sitemap (uses /ar/ prefix, not ?lang=ar)
 * @deprecated March 2026 — replaced due to GSC duplicate page issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;

  // 301 Permanent Redirect to the correct sitemap
  // This tells Google to stop crawling this endpoint and use /sitemap.xml instead
  return NextResponse.redirect(`${baseUrl}/sitemap.xml`, 301);
}

// POST kept for admin tools that may reference it, but returns deprecation notice
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. The sitemap is now managed by /sitemap.xml (Next.js native sitemap).',
      migration: 'Remove any references to /api/sitemap/enhanced-generate and use /sitemap.xml instead.',
    },
    { status: 410 } // 410 Gone
  );
}
