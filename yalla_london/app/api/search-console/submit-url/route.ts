
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { searchConsole } from '@/lib/integrations/google-search-console'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Submit URL to Google Search Console for indexing
    const success = await searchConsole.submitUrl(url)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to submit URL to Search Console' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'URL submitted for indexing'
    })

  } catch (error) {
    console.error('Search Console submission error:', error)
    
    return NextResponse.json(
      { error: 'Failed to submit URL' },
      { status: 500 }
    )
  }
}
