/**
 * Prompt Templates Management API
 * Handles CRUD operations for prompt templates with versioning and locale support
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'
import { getSupabaseClient } from '@/lib/supabase'

// Validation schemas
const PromptTemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['content_generation', 'seo_audit', 'topic_research', 'media_description']),
  template_en: z.string().min(1),
  template_ar: z.string().optional(),
  variables: z.object({}).passthrough(),
  version: z.string().default('1.0'),
  locale_overrides: z.object({}).passthrough().optional(),
  is_active: z.boolean().default(true)
})

const PromptTemplateUpdateSchema = PromptTemplateCreateSchema.partial()

export async function GET(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_PROMPT_CONTROL')) {
    return NextResponse.json(
      { error: 'Prompt control feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = getSupabaseClient()

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')
    const version = searchParams.get('version')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('prompt_template')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (version) {
      query = query.eq('version', version)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching prompt templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prompt templates' },
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
    console.error('Prompt templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_PROMPT_CONTROL')) {
    return NextResponse.json(
      { error: 'Prompt control feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const supabase = getSupabaseClient()

  try {
    const body = await request.json()
    const validatedData = PromptTemplateCreateSchema.parse(body)

    // Add creator information
    const templateData = {
      ...validatedData,
      created_by: authResult.user.id
    }

    const { data, error } = await supabase
      .from('prompt_template')
      .insert([templateData])
      .select()
      .single()

    if (error) {
      console.error('Error creating prompt template:', error)
      return NextResponse.json(
        { error: 'Failed to create prompt template' },
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

    console.error('Prompt templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}