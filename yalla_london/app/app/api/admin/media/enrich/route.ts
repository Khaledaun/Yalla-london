/**
 * Media Enrichment API
 * Handles AI-powered media enhancement, bulk processing, and auto-scan
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

// Validation schemas
const MediaEnrichmentSchema = z.object({
  media_id: z.string(),
  enrich_alt_text: z.boolean().default(true),
  enrich_title: z.boolean().default(true),
  enrich_description: z.boolean().default(true),
  extract_colors: z.boolean().default(true),
  analyze_composition: z.boolean().default(true),
  generate_tags: z.boolean().default(true),
  check_accessibility: z.boolean().default(true)
})

const BulkEnrichmentSchema = z.object({
  media_ids: z.array(z.string()).min(1).max(50),
  enrich_options: z.object({
    enrich_alt_text: z.boolean().default(true),
    enrich_title: z.boolean().default(true),
    enrich_description: z.boolean().default(true),
    extract_colors: z.boolean().default(true),
    analyze_composition: z.boolean().default(true),
    generate_tags: z.boolean().default(true),
    check_accessibility: z.boolean().default(true)
  }).default({})
})

// Mock AI media analysis function - in production, this would use computer vision APIs
async function analyzeMedia(mediaId: string, options: any) {
  // This is a mock implementation. In production, you would:
  // 1. Fetch media file from storage
  // 2. Use computer vision APIs (OpenAI Vision, Google Vision, etc.)
  // 3. Analyze image composition, objects, text
  // 4. Generate SEO-optimized descriptions
  // 5. Extract color palette
  // 6. Check accessibility compliance
  
  const mockAnalysis = {
    alt_text_enhanced: `Professional view of London landmark showing architectural details and surrounding area`,
    title_enhanced: `London Landmark - Premium Photography`,
    description_enhanced: `High-quality photograph capturing the essence of London's architectural beauty. Perfect for travel content and location guides.`,
    tags_ai: ['london', 'architecture', 'landmark', 'travel', 'photography', 'tourism'],
    color_palette: {
      dominant_colors: ['#2C3E50', '#E67E22', '#F39C12', '#95A5A6'],
      accent_colors: ['#E74C3C', '#3498DB'],
      color_temperature: 'warm'
    },
    composition_data: {
      rule_of_thirds: 0.85,
      symmetry_score: 0.72,
      focal_points: [
        { x: 0.33, y: 0.45, strength: 0.9, description: 'Main architectural feature' },
        { x: 0.67, y: 0.25, strength: 0.6, description: 'Secondary detail' }
      ],
      lighting_quality: 'natural_golden_hour',
      sharpness_score: 0.92
    },
    accessibility_score: 88,
    seo_optimized: true,
    processing_status: 'completed'
  }
  
  return mockAnalysis
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'single'

  // Feature gate checks
  if (action === 'bulk' && !isPremiumFeatureEnabled('FEATURE_BULK_ENRICH')) {
    return NextResponse.json(
      { error: 'Bulk enrichment feature is not enabled' },
      { status: 403 }
    )
  }

  if (action === 'single' && !isPremiumFeatureEnabled('FEATURE_MEDIA_ENRICH')) {
    return NextResponse.json(
      { error: 'Media enrichment feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()

    if (action === 'bulk') {
      const validatedData = BulkEnrichmentSchema.parse(body)
      const results = []

      for (const mediaId of validatedData.media_ids) {
        try {
          // Check if media exists
          const { data: existingMedia, error: mediaError } = await supabase
            .from('media_asset')
            .select('id, filename, mime_type')
            .eq('id', mediaId)
            .single()

          if (mediaError || !existingMedia) {
            results.push({
              media_id: mediaId,
              status: 'error',
              error: 'Media not found'
            })
            continue
          }

          // Check if enrichment already exists
          const { data: existingEnrichment } = await supabase
            .from('media_enrichment')
            .select('id, processing_status')
            .eq('media_id', mediaId)
            .single()

          if (existingEnrichment && existingEnrichment.processing_status === 'completed') {
            results.push({
              media_id: mediaId,
              status: 'skipped',
              message: 'Already enriched'
            })
            continue
          }

          // Perform AI analysis
          const analysis = await analyzeMedia(mediaId, validatedData.enrich_options)

          // Save or update enrichment
          const enrichmentData = {
            media_id: mediaId,
            ...analysis
          }

          const { data, error } = existingEnrichment
            ? await supabase
                .from('media_enrichment')
                .update(enrichmentData)
                .eq('media_id', mediaId)
                .select()
                .single()
            : await supabase
                .from('media_enrichment')
                .insert([enrichmentData])
                .select()
                .single()

          if (error) {
            results.push({
              media_id: mediaId,
              status: 'error',
              error: error.message
            })
          } else {
            results.push({
              media_id: mediaId,
              status: 'success',
              data: data
            })
          }

        } catch (error) {
          results.push({
            media_id: mediaId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          processed_count: results.filter(r => r.status === 'success').length,
          error_count: results.filter(r => r.status === 'error').length,
          skipped_count: results.filter(r => r.status === 'skipped').length,
          results: results
        }
      })
    }

    // Single media enrichment
    const validatedData = MediaEnrichmentSchema.parse(body)

    // Check if media exists
    const { data: existingMedia, error: mediaError } = await supabase
      .from('media_asset')
      .select('id, filename, mime_type')
      .eq('id', validatedData.media_id)
      .single()

    if (mediaError || !existingMedia) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Perform AI analysis
    const analysis = await analyzeMedia(validatedData.media_id, validatedData)

    // Save enrichment data
    const enrichmentData = {
      media_id: validatedData.media_id,
      ...analysis
    }

    // Check if enrichment already exists
    const { data: existingEnrichment } = await supabase
      .from('media_enrichment')
      .select('id')
      .eq('media_id', validatedData.media_id)
      .single()

    const { data, error } = existingEnrichment
      ? await supabase
          .from('media_enrichment')
          .update(enrichmentData)
          .eq('media_id', validatedData.media_id)
          .select()
          .single()
      : await supabase
          .from('media_enrichment')
          .insert([enrichmentData])
          .select()
          .single()

    if (error) {
      console.error('Error saving media enrichment:', error)
      return NextResponse.json(
        { error: 'Failed to save media enrichment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Media enrichment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_MEDIA_ENRICH')) {
    return NextResponse.json(
      { error: 'Media enrichment feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('media_id')
    const processingStatus = searchParams.get('processing_status')
    const seoOptimized = searchParams.get('seo_optimized')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('media_enrichment')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (mediaId) {
      query = query.eq('media_id', mediaId)
    }
    if (processingStatus) {
      query = query.eq('processing_status', processingStatus)
    }
    if (seoOptimized !== null) {
      query = query.eq('seo_optimized', seoOptimized === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching media enrichments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch media enrichments' },
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
    console.error('Media enrichment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}