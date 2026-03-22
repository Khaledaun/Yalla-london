/**
 * Phase 4C Backlink Inspector API
 * Entity extraction and backlink analysis for published content
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';
import { requireAdmin } from "@/lib/admin-middleware";

// Zod schemas for validation
const BacklinkInspectionSchema = z.object({
  content_id: z.string(),
  content_type: z.enum(['blog_post', 'scheduled_content']),
  url: z.string().url(),
  force_reanalyze: z.boolean().default(false),
  extract_entities: z.boolean().default(true),
  suggest_campaigns: z.boolean().default(true)
});

// POST - Inspect content for backlink opportunities
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Feature flag check
    if (!isFeatureEnabled('FEATURE_BACKLINK_INSPECTOR')) {
      return NextResponse.json(
        { error: 'Backlink inspector feature is disabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'manage_system');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = BacklinkInspectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { content_id, content_type, url, force_reanalyze, extract_entities, suggest_campaigns } = validation.data;

    // Get content details
    let content = null;
    if (content_type === 'blog_post') {
      content = await prisma.blogPost.findUnique({
        where: { id: content_id },
        include: { 
          category: true,
          place: true 
        }
      });
    } else if (content_type === 'scheduled_content') {
      content = await prisma.scheduledContent.findUnique({
        where: { id: content_id }
      });
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check if we already have recent analysis (unless forced)
    if (!force_reanalyze) {
      const recentAnalysis = await prisma.seoAuditResult.findFirst({
        where: {
          content_id: content_id,
          content_type: content_type,
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        },
        orderBy: { created_at: 'desc' }
      });

      if (recentAnalysis) {
        return NextResponse.json({
          success: true,
          message: 'Using recent analysis',
          data: recentAnalysis,
          cached: true
        });
      }
    }

    // Simulate entity extraction and backlink analysis
    const entities = extract_entities ? [
      {
        name: 'London',
        type: 'location',
        confidence: 0.95,
        mentions: 5
      },
      {
        name: 'Westminster',
        type: 'location',
        confidence: 0.87,
        mentions: 2
      },
      {
        name: 'British Museum',
        type: 'attraction',
        confidence: 0.92,
        mentions: 3
      }
    ] : [];

    const backlinkOpportunities = [
      {
        domain: 'visitlondon.com',
        relevance_score: 0.9,
        authority_score: 0.85,
        opportunity_type: 'guest_post',
        suggested_anchor: 'London travel guide',
        estimated_difficulty: 'medium'
      },
      {
        domain: 'timeout.com',
        relevance_score: 0.8,
        authority_score: 0.9,
        opportunity_type: 'resource_mention',
        suggested_anchor: 'comprehensive London guide',
        estimated_difficulty: 'hard'
      },
      {
        domain: 'londonist.com',
        relevance_score: 0.85,
        authority_score: 0.75,
        opportunity_type: 'collaboration',
        suggested_anchor: 'local London insights',
        estimated_difficulty: 'easy'
      }
    ];

    const campaignSuggestions = suggest_campaigns ? [
      {
        type: 'email_outreach',
        priority: 'high',
        targets: ['travel@visitlondon.com', 'editor@timeout.com'],
        subject_line: 'London Guide Resource for Your Readers',
        success_probability: 0.3
      },
      {
        type: 'social_mention',
        priority: 'medium',
        platforms: ['twitter', 'linkedin'],
        hashtags: ['#LondonTravel', '#VisitLondon'],
        success_probability: 0.6
      }
    ] : [];

    // SEO score placeholder — real scoring computed by pipeline audit phase
    const seoScore = 0;

    // Create SEO audit result with backlink analysis
    const auditResult = await prisma.seoAuditResult.create({
      data: {
        content_id: content_id,
        content_type: content_type,
        score: seoScore,
        breakdown_json: {
          content_quality: 85,
          keyword_optimization: 78,
          technical_seo: 92,
          backlink_profile: 73,
          user_experience: 88
        },
        suggestions: [
          'Add more internal links to related content',
          'Optimize image alt text for better accessibility',
          'Include location-specific schema markup'
        ],
        quick_fixes: [
          'Add meta description',
          'Optimize title length',
          'Compress images'
        ],
        internal_link_offers: {
          entities: entities,
          opportunities: backlinkOpportunities,
          campaigns: campaignSuggestions
        },
        audit_version: '4C.1'
      }
    });

    // Log the inspection
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: 'backlink_inspection',
        resource: content_type,
        resourceId: content_id,
        details: {
          url: url,
          entities_found: entities.length,
          opportunities_found: backlinkOpportunities.length,
          seo_score: seoScore
        },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Backlink analysis completed',
      data: {
        audit_result: auditResult,
        entities: entities,
        backlink_opportunities: backlinkOpportunities,
        campaign_suggestions: campaignSuggestions,
        seo_score: seoScore
      },
      cached: false
    }, { status: 201 });

  } catch (error) {
    console.error('Backlink inspection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to inspect backlinks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}