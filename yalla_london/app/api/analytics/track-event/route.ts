
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      event, 
      category = 'engagement', 
      label, 
      value,
      userId,
      sessionId 
    } = await request.json()

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }

    // Log event for server-side tracking
    console.log('Analytics Event:', {
      event,
      category,
      label,
      value,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    })

    // Here you could send to additional analytics services
    // such as Mixpanel, Amplitude, or your own analytics database

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    })

  } catch (error) {
    console.error('Event tracking error:', error)
    
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
