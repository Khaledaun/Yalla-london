/**
 * Topics Management API
 * Handles CRUD operations for topic proposals with feature-gated access
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'
import { getSupabaseClient } from '@/lib/supabase'

// Validation schemas
const TopicProposalCreateSchema = z.object({
  locale: z.enum(['en', 'ar']),
  primary_keyword: z.string().min(1),
  longtails: z.array(z.string()).min(5),
  featured_longtails: z.array(z.string()).length(2),
  questions: z.array(z.string()),
  authority_links_json: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    sourceDomain: z.string()
  })).min(3).max(4),
  intent: z.enum(['info', 'transactional', 'event']),
  suggested_page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']),
  suggested_window_start: z.string().datetime().optional(),
  suggested_window_end: z.string().datetime().optional(),
  source_weights_json: z.object({}),
  confidence_score: z.number().min(0).max(1).optional()
})

const TopicProposalUpdateSchema = TopicProposalCreateSchema.partial().extend({
  status: z.enum(['proposed', 'approved', 'snoozed', 'rejected']).optional()
})

const TopicGenerateSchema = z.object({
  categories: z.array(z.string()).optional(),
  count: z.number().min(1).max(20).default(5),
  locale: z.enum(['en', 'ar']).default('en'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  force_generate: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')) {
    return NextResponse.json(
      { error: 'Topics research feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale')
    const status = searchParams.get('status')
    const pageType = searchParams.get('page_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('topic_proposal')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (locale) {
      query = query.eq('locale', locale)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (pageType) {
      query = query.eq('suggested_page_type', pageType)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching topics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Topics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')) {
    return NextResponse.json(
      { error: 'Topics research feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const validatedData = TopicProposalCreateSchema.parse(body)

    const { data, error } = await supabase
      .from('topic_proposal')
      .insert([validatedData])
      .select()
      .single()

    if (error) {
      console.error('Error creating topic:', error)
      return NextResponse.json(
        { error: 'Failed to create topic' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Topics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}