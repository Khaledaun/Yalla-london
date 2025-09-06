
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { instagram } from '@/lib/integrations/instagram'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    const posts = await instagram.getRecentPosts(limit)

    if (!posts) {
      return NextResponse.json(
        { error: 'Failed to fetch Instagram posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      posts: posts,
      count: posts.length,
    })

  } catch (error) {
    console.error('Instagram feed error:', error)
    
    return NextResponse.json(
      { error: 'Failed to load Instagram feed' },
      { status: 500 }
    )
  }
}
