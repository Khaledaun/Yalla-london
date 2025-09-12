export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const { 
      event, 
      category = 'engagement', 
      label, 
      value,
      userId,
      sessionId,
      properties 
    } = await request.json()

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }

    // Track event using enterprise analytics service
    await analyticsService.trackEvent({
      eventName: event,
      category,
      label,
      value,
      userId,
      sessionId,
      properties
    }, request);

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
