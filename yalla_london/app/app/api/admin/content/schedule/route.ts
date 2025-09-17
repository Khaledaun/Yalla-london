import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from "@/lib/supabase"
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

const ScheduleContentSchema = z.object({
  content_id: z.string(),
  scheduled_time: z.string().datetime(),
  content_type: z.enum(['article', 'page', 'homepage']),
  auto_publish: z.boolean().default(true),
  sitemap_update: z.boolean().default(true),
  search_engine_ping: z.boolean().default(true),
  social_media_post: z.boolean().default(false),
  notification_settings: z.object({
    email_on_publish: z.boolean().default(false),
    slack_notification: z.boolean().default(false)
  }).optional()
})

/**
 * Schedule content for publishing
 * POST /api/admin/content/schedule
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and feature flag
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
      return NextResponse.json(
        { error: 'Content scheduling feature is not enabled' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = ScheduleContentSchema.parse(body)
    const supabase = getSupabaseClient()

    // Check if content exists and is ready for scheduling
    const { data: content, error: contentError } = await supabase
      .from('scheduled_content')
      .select('*')
      .eq('id', validatedData.content_id)
      .single()

    if (contentError || !content) {
      return NextResponse.json(
        { error: 'Content not found or not ready for scheduling' },
        { status: 404 }
      )
    }

    // Validate scheduling time is in the future
    const scheduledTime = new Date(validatedData.scheduled_time)
    if (scheduledTime <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Update content with scheduling information
    const { data: updatedContent, error: updateError } = await supabase
      .from('scheduled_content')
      .update({
        status: 'scheduled',
        scheduled_publish_time: validatedData.scheduled_time,
        auto_publish: validatedData.auto_publish,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', validatedData.content_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating content schedule:', updateError)
      return NextResponse.json(
        { error: 'Failed to schedule content' },
        { status: 500 }
      )
    }

    // Create scheduling job entry
    const jobData = {
      job_type: 'content_publish',
      scheduled_for: validatedData.scheduled_time,
      payload: {
        content_id: validatedData.content_id,
        content_type: validatedData.content_type,
        sitemap_update: validatedData.sitemap_update,
        search_engine_ping: validatedData.search_engine_ping,
        social_media_post: validatedData.social_media_post,
        notification_settings: validatedData.notification_settings
      },
      status: 'pending',
      created_by: user.id,
      created_at: new Date().toISOString()
    }

    const { data: scheduledJob, error: jobError } = await supabase
      .from('background_job')
      .insert([jobData])
      .select()
      .single()

    if (jobError) {
      console.error('Error creating scheduled job:', jobError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        content: updatedContent,
        scheduled_job: scheduledJob
      },
      message: `Content scheduled for ${scheduledTime.toLocaleString()}`
    })

  } catch (error) {
    console.error('Content scheduling error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get scheduled content items
 * GET /api/admin/content/schedule
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult

    if (!isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
      return NextResponse.json(
        { error: 'Content scheduling feature is not enabled' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'scheduled'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const supabase = getSupabaseClient()

    // Get scheduled content
    let query = supabase
      .from('scheduled_content')
      .select(`
        *,
        background_job:background_job!inner(*)
      `)
      .eq('status', status)
      .order('scheduled_publish_time', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: scheduledContent, error, count } = await query

    if (error) {
      console.error('Error fetching scheduled content:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: scheduledContent || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching scheduled content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update or cancel scheduled content
 * PATCH /api/admin/content/schedule
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (!isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
      return NextResponse.json(
        { error: 'Content scheduling feature is not enabled' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content_id, action, new_scheduled_time } = body
    const supabase = getSupabaseClient()

    if (!content_id || !action) {
      return NextResponse.json(
        { error: 'Content ID and action are required' },
        { status: 400 }
      )
    }

    if (action === 'cancel') {
      // Cancel scheduled publishing
      const { data: updated, error } = await supabase
        .from('scheduled_content')
        .update({
          status: 'draft',
          scheduled_publish_time: null,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', content_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to cancel scheduled content' },
          { status: 500 }
        )
      }

      // Cancel background job
      await supabase
        .from('background_job')
        .update({ status: 'cancelled' })
        .eq('payload->content_id', content_id)
        .eq('job_type', 'content_publish')

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Scheduled publishing cancelled'
      })
    }

    if (action === 'reschedule' && new_scheduled_time) {
      // Reschedule content
      const newTime = new Date(new_scheduled_time)
      if (newTime <= new Date()) {
        return NextResponse.json(
          { error: 'New scheduled time must be in the future' },
          { status: 400 }
        )
      }

      const { data: updated, error } = await supabase
        .from('scheduled_content')
        .update({
          scheduled_publish_time: new_scheduled_time,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', content_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to reschedule content' },
          { status: 500 }
        )
      }

      // Update background job
      await supabase
        .from('background_job')
        .update({ scheduled_for: new_scheduled_time })
        .eq('payload->content_id', content_id)
        .eq('job_type', 'content_publish')

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Content rescheduled for ${newTime.toLocaleString()}`
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Content scheduling update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}