/**
 * Individual Prompt Template Management API
 * Handles PATCH and DELETE operations for specific prompt templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PromptTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['content_generation', 'seo_audit', 'topic_research', 'media_description']).optional(),
  template_en: z.string().min(1).optional(),
  template_ar: z.string().optional(),
  variables: z.object({}).passthrough().optional(),
  version: z.string().optional(),
  locale_overrides: z.object({}).passthrough().optional(),
  is_active: z.boolean().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

  try {
    const { data, error } = await supabase
      .from('prompt_template')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Prompt template not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching prompt template:', error)
      return NextResponse.json(
        { error: 'Failed to fetch prompt template' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Prompt template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  try {
    const body = await request.json()
    const validatedData = PromptTemplateUpdateSchema.parse(body)

    // Update usage count and last used timestamp if template is being used
    const updateData = { ...validatedData }
    if (body.increment_usage) {
      // Increment usage count
      const { data: currentTemplate } = await supabase
        .from('prompt_template')
        .select('usage_count')
        .eq('id', params.id)
        .single()
      
      if (currentTemplate) {
        updateData.usage_count = (currentTemplate.usage_count || 0) + 1
        updateData.last_used_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('prompt_template')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Prompt template not found' },
          { status: 404 }
        )
      }
      console.error('Error updating prompt template:', error)
      return NextResponse.json(
        { error: 'Failed to update prompt template' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Prompt template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  try {
    const { error } = await supabase
      .from('prompt_template')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting prompt template:', error)
      return NextResponse.json(
        { error: 'Failed to delete prompt template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prompt template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}