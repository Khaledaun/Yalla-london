import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Test save endpoint called with:', {
      title: body.title,
      contentLength: body.content?.length,
      hasTitle: !!body.title,
      hasContent: !!body.content
    })

    // Simulate a successful save without database
    const mockArticle = {
      id: Math.floor(Math.random() * 10000),
      title: body.title || 'Test Article',
      slug: (body.title || 'test-article').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      createdAt: new Date().toISOString(),
      contentLength: body.content?.length || 0
    }

    return NextResponse.json({
      success: true,
      message: 'Test save successful!',
      data: mockArticle,
      debug: {
        receivedData: {
          title: body.title,
          contentLength: body.content?.length,
          locale: body.locale,
          pageType: body.pageType
        },
        environment: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV
        }
      }
    })

  } catch (error) {
    console.error('Test save error:', error)
    return NextResponse.json(
      { 
        error: 'Test save failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
