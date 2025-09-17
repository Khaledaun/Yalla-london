/**
 * Content Generation Pipeline API
 * Handles type detection, content generation, and pipeline management
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/rbac'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'
import { getSupabaseClient } from '@/lib/supabase'

// Validation schemas
const ContentGenerationSchema = z.object({
  topic_proposal_id: z.string(),
  content_type: z.enum(['blog_post', 'instagram_post', 'tiktok_video']).default('blog_post'),
  language: z.enum(['en', 'ar']).default('en'),
  scheduled_time: z.string().datetime().optional(),
  generation_mode: z.enum(['single_shot', 'pipeline', 'preview']).default('pipeline'),
  custom_prompt: z.string().optional(),
  include_media: z.boolean().default(false)
})

const TypeDetectionSchema = z.object({
  topic_proposal_id: z.string()
})

// Mock content generation function - in production, this would use OpenAI/Claude
async function generateContent(topicProposal: any, params: z.infer<typeof ContentGenerationSchema>) {
  // This is a mock implementation. In production, you would:
  // 1. Fetch appropriate prompt templates from prompt_template table
  // 2. Apply topic proposal data to prompt variables
  // 3. Call OpenAI/Claude API with the generated prompt
  // 4. Apply business rules (authority links, featured longtails, etc.)
  // 5. Generate SEO-optimized content
  
  const mockContent = {
    title: `${topicProposal.primary_keyword}: A Complete Guide`,
    content: `# ${topicProposal.primary_keyword}: A Complete Guide

## Introduction

London offers countless opportunities for ${topicProposal.primary_keyword}. This comprehensive guide will help you discover the best options available.

## Featured Keywords
${topicProposal.featured_longtails.map((keyword: string) => `- ${keyword}`).join('\n')}

## Frequently Asked Questions
${topicProposal.questions.map((q: string) => `### ${q}\n[Answer would be generated here]\n`).join('\n')}

## Authority Sources
${topicProposal.authority_links_json.map((link: any) => `- [${link.title}](${link.url})`).join('\n')}

## Conclusion

${topicProposal.primary_keyword} in London provides amazing experiences for visitors and locals alike.
`,
    metadata: {
      word_count: 150,
      seo_score: 85,
      readability_score: 78,
      featured_longtails_used: topicProposal.featured_longtails,
      authority_links_used: topicProposal.authority_links_json
    }
  }
  
  return mockContent
}

// Type detection function - analyzes content and suggests optimal page type
async function detectContentType(topicProposal: any) {
  // Business logic for type detection
  const suggestions = {
    primary_type: topicProposal.suggested_page_type,
    confidence: topicProposal.confidence_score || 0.8,
    fallback_types: ['guide', 'list', 'faq'],
    reasoning: `Based on intent "${topicProposal.intent}" and keyword "${topicProposal.primary_keyword}"`
  }
  
  return suggestions
}

export async function POST(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE')) {
    return NextResponse.json(
      { error: 'Content pipeline feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const action = body.action || 'generate'
    const supabase = getSupabaseClient()

    if (action === 'detect_type') {
      const validatedData = TypeDetectionSchema.parse(body)
      
      // Fetch topic proposal
      const { data: topicProposal, error: topicError } = await supabase
        .from('topic_proposal')
        .select('*')
        .eq('id', validatedData.topic_proposal_id)
        .single()

      if (topicError || !topicProposal) {
        return NextResponse.json(
          { error: 'Topic proposal not found' },
          { status: 404 }
        )
      }

      const typeDetection = await detectContentType(topicProposal)
      
      return NextResponse.json({
        success: true,
        data: typeDetection
      })
    }

    if (action === 'generate') {
      const validatedData = ContentGenerationSchema.parse(body)
      
      // Fetch topic proposal
      const { data: topicProposal, error: topicError } = await supabase
        .from('topic_proposal')
        .select('*')
        .eq('id', validatedData.topic_proposal_id)
        .single()

      if (topicError || !topicProposal) {
        return NextResponse.json(
          { error: 'Topic proposal not found' },
          { status: 404 }
        )
      }

      // Generate content
      const generatedContent = await generateContent(topicProposal, validatedData)
      
      // Create scheduled content entry
      const scheduledContentData = {
        title: generatedContent.title,
        content: generatedContent.content,
        content_type: validatedData.content_type,
        language: validatedData.language,
        scheduled_time: validatedData.scheduled_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        topic_proposal_id: validatedData.topic_proposal_id,
        page_type: topicProposal.suggested_page_type,
        generation_source: 'topic_proposal',
        authority_links_used: generatedContent.metadata.authority_links_used,
        longtails_used: generatedContent.metadata.featured_longtails_used,
        metadata: generatedContent.metadata
      }

      const { data, error } = await supabase
        .from('scheduled_content')
        .insert([scheduledContentData])
        .select()
        .single()

      if (error) {
        console.error('Error creating scheduled content:', error)
        return NextResponse.json(
          { error: 'Failed to create scheduled content' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          scheduled_content: data,
          generated_content: generatedContent
        }
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "detect_type" or "generate"' },
      { status: 400 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Content pipeline API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}