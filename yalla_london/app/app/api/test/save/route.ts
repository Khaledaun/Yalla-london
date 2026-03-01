import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

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
      id: crypto.randomUUID(),
      title: body.title || 'Test Article',
      slug: (body.title || 'test-article').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      createdAt: new Date().toISOString(),
      contentLength: body.content?.length || 0
    }

    return NextResponse.json({
      success: true,
      message: 'Test save successful!',
      data: mockArticle
    })

  } catch (error) {
    console.error('Test save error:', error)
    return NextResponse.json(
      { error: 'Test save failed' },
      { status: 500 }
    )
  }
}
