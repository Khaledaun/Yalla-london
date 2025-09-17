/**
 * SEO Audit API
 * Handles SEO auditing, quick fixes, and internal link suggestions
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
const SEOAuditSchema = z.object({
  content_id: z.string(),
  content_type: z.enum(['blog_post', 'scheduled_content']),
  content_text: z.string().optional(),
  include_internal_links: z.boolean().default(true),
  audit_version: z.string().default('1.0')
})

// Mock SEO audit function - in production, this would use advanced SEO analysis
async function performSEOAudit(content: any, includeInternalLinks: boolean) {
  // This is a mock implementation. In production, you would:
  // 1. Analyze content for SEO factors (title, headings, meta description, etc.)
  // 2. Check keyword density and placement
  // 3. Analyze internal/external links
  // 4. Check for schema markup
  // 5. Analyze readability and content structure
  // 6. Check for featured longtails usage
  // 7. Verify authority links are properly used
  
  const mockAudit = {
    score: 85,
    breakdown: {
      title_optimization: 90,
      meta_description: 80,
      heading_structure: 85,
      keyword_density: 75,
      internal_links: 90,
      external_links: 95,
      readability: 80,
      featured_longtails: 85,
      authority_links: 90
    },
    suggestions: [
      {
        type: 'warning',
        category: 'title',
        message: 'Consider including target keyword in title',
        priority: 'high'
      },
      {
        type: 'info',
        category: 'meta_description',
        message: 'Meta description could be more compelling',
        priority: 'medium'
      },
      {
        type: 'success',
        category: 'authority_links',
        message: 'Good use of authority links',
        priority: 'low'
      }
    ],
    quick_fixes: [
      {
        id: 'add_meta_description',
        description: 'Add optimized meta description',
        auto_applicable: true,
        suggested_value: 'Discover the best ' + content.title + ' in London with our comprehensive guide.'
      },
      {
        id: 'optimize_headings',
        description: 'Optimize heading structure',
        auto_applicable: false,
        suggested_changes: ['Use H2 for main sections', 'Include keywords in headings']
      }
    ],
    longtails_coverage: {
      total_featured: 2,
      used_in_content: 1,
      missing: ['best london guide 2024']
    },
    authority_links_used: content.authority_links_used || []
  }

  // Add internal link offers if backlink threshold is met
  if (includeInternalLinks) {
    // Check if we have enough indexed pages for internal link offers
    const { data: latestSnapshot } = await supabase
      .from('analytics_snapshot')
      .select('indexed_pages')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const minPages = parseInt(process.env.BACKLINK_OFFERS_MIN_PAGES || '40')
    if (latestSnapshot && latestSnapshot.indexed_pages >= minPages) {
      mockAudit.internal_link_offers = [
        {
          anchor_text: 'best London attractions',
          target_url: '/articles/top-london-attractions',
          relevance_score: 0.9,
          placement_suggestion: 'After second paragraph'
        },
        {
          anchor_text: 'London travel guide',
          target_url: '/articles/complete-london-travel-guide',
          relevance_score: 0.8,
          placement_suggestion: 'In conclusion section'
        }
      ]
    }
  }

  return mockAudit
}

export async function POST(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
    return NextResponse.json(
      { error: 'AI SEO audit feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const validatedData = SEOAuditSchema.parse(body)

    // Fetch content to audit
    let content
    if (validatedData.content_type === 'scheduled_content') {
      const { data, error } = await supabase
        .from('scheduled_content')
        .select('*')
        .eq('id', validatedData.content_id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }
      content = data
    } else {
      // For blog_post, you would fetch from your blog posts table
      return NextResponse.json(
        { error: 'Blog post auditing not yet implemented' },
        { status: 400 }
      )
    }

    // Perform SEO audit
    const auditResult = await performSEOAudit(content, validatedData.include_internal_links)

    // Save audit result
    const auditData = {
      content_id: validatedData.content_id,
      content_type: validatedData.content_type,
      score: auditResult.score,
      breakdown_json: auditResult.breakdown,
      suggestions: auditResult.suggestions,
      quick_fixes: auditResult.quick_fixes,
      internal_link_offers: auditResult.internal_link_offers || null,
      authority_links_used: auditResult.authority_links_used,
      longtails_coverage: auditResult.longtails_coverage,
      audit_version: validatedData.audit_version
    }

    const { data: savedAudit, error: saveError } = await supabase
      .from('seo_audit_result')
      .insert([auditData])
      .select()
      .single()

    if (saveError) {
      console.error('Error saving audit result:', saveError)
      return NextResponse.json(
        { error: 'Failed to save audit result' },
        { status: 500 }
      )
    }

    // Update scheduled content with SEO score
    if (validatedData.content_type === 'scheduled_content') {
      await supabase
        .from('scheduled_content')
        .update({ seo_score: auditResult.score })
        .eq('id', validatedData.content_id)
    }

    return NextResponse.json({
      success: true,
      data: {
        audit_result: savedAudit,
        details: auditResult
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('SEO audit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
    return NextResponse.json(
      { error: 'AI SEO audit feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('content_id')
    const contentType = searchParams.get('content_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('seo_audit_result')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (contentId) {
      query = query.eq('content_id', contentId)
    }
    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching audit results:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit results' },
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
    console.error('SEO audit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}