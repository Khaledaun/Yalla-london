
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

// This was originally in /app/sitemap.xml/route.ts but moved to avoid conflicts
// The enhanced sitemap functionality is available via the sitemap generator utility
// You can use /api/sitemap/advanced for additional sitemap features

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This endpoint has been moved to /api/sitemap/advanced'
  })
}
