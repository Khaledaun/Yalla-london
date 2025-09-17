/**
 * Analytics Snapshots API for Phase 4
 * Handles analytics snapshots, health monitoring, and backlink triggers
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
const AnalyticsSnapshotSchema = z.object({
  site_id: z.string().optional(),
  date_range: z.enum(['7d', '28d']).default('7d'),
  force_refresh: z.boolean().default(false)
})

// Mock analytics data generation - in production, this would fetch from GA4/GSC
async function fetchAnalyticsData(dateRange: string, siteId?: string) {
  const mockData = {
    date_range: dateRange,
    site_id: siteId || 'yalla-london-main',
    indexed_pages: 42, // This triggers backlink offers when >= 40
    data_json: {
      pageviews: dateRange === '7d' ? 15420 : 58930,
      unique_visitors: dateRange === '7d' ? 8930 : 34820,
      bounce_rate: 0.34,
      avg_session_duration: 245,
      conversion_rate: 0.023,
      revenue: dateRange === '7d' ? 1250.80 : 4830.60
    },
    top_queries: {
      'things to do in london': { impressions: 12500, clicks: 890, ctr: 0.071, position: 3.2 },
      'best restaurants london': { impressions: 8930, clicks: 567, ctr: 0.063, position: 4.1 },
      'london travel guide': { impressions: 6780, clicks: 423, ctr: 0.062, position: 3.8 },
      'london events': { impressions: 5420, clicks: 301, ctr: 0.055, position: 4.5 },
      'london hotels': { impressions: 4230, clicks: 189, ctr: 0.045, position: 5.2 }
    },
    performance_metrics: {
      total_impressions: dateRange === '7d' ? 45860 : 198420,
      total_clicks: dateRange === '7d' ? 2780 : 12450,
      average_ctr: 0.061,
      average_position: 3.9,
      core_web_vitals: {
        lcp: 2.1,
        fid: 78,
        cls: 0.08
      }
    }
  }
  
  return mockData
}

export async function GET(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_ANALYTICS_DASHBOARD')) {
    return NextResponse.json(
      { error: 'Analytics dashboard feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const dateRange = (searchParams.get('date_range') as '7d' | '28d') || '7d'
    const siteId = searchParams.get('site_id')
    const forceRefresh = searchParams.get('force_refresh') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (searchParams.get('action') === 'history') {
      // Return historical snapshots
      const offset = (page - 1) * limit
      const { data, error, count } = await supabase
        .from('analytics_snapshot')
        .select('*', { count: 'exact' })
        .eq('date_range', dateRange)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching analytics history:', error)
        return NextResponse.json(
          { error: 'Failed to fetch analytics history' },
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
    }

    // Check if we have a recent snapshot (unless force refresh)
    if (!forceRefresh) {
      const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      const { data: existingSnapshot } = await supabase
        .from('analytics_snapshot')
        .select('*')
        .eq('date_range', dateRange)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingSnapshot) {
        return NextResponse.json({
          success: true,
          data: existingSnapshot,
          cached: true
        })
      }
    }

    // Fetch fresh analytics data
    const analyticsData = await fetchAnalyticsData(dateRange, siteId || undefined)

    // Save snapshot to database
    const { data: savedSnapshot, error: saveError } = await supabase
      .from('analytics_snapshot')
      .insert([analyticsData])
      .select()
      .single()

    if (saveError) {
      console.error('Error saving analytics snapshot:', saveError)
      return NextResponse.json(
        { error: 'Failed to save analytics snapshot' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedSnapshot,
      cached: false
    })

  } catch (error) {
    console.error('Analytics snapshots API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Feature gate check
  if (!isPremiumFeatureEnabled('FEATURE_ANALYTICS_DASHBOARD')) {
    return NextResponse.json(
      { error: 'Analytics dashboard feature is not enabled' },
      { status: 403 }
    )
  }

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const validatedData = AnalyticsSnapshotSchema.parse(body)

    // Fetch and save new analytics snapshot
    const analyticsData = await fetchAnalyticsData(validatedData.date_range, validatedData.site_id)

    const { data, error } = await supabase
      .from('analytics_snapshot')
      .insert([analyticsData])
      .select()
      .single()

    if (error) {
      console.error('Error creating analytics snapshot:', error)
      return NextResponse.json(
        { error: 'Failed to create analytics snapshot' },
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

    console.error('Analytics snapshots API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}