/**
 * Phase 4C Topic Generation API
 * Auto-generate topics based on policies and content gaps
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

// Zod schemas for validation
const TopicGenerationSchema = z.object({
  categories: z.array(z.string()).min(1),
  count: z.number().min(1).max(20),
  locale: z.enum(['en', 'ar']).default('en'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  force_generate: z.boolean().default(false),
  policy_id: z.string().optional(),
});

// POST - Generate topics based on policies
export async function POST(request: NextRequest) {
  try {
    // Feature flag check
    // Feature flag check removed
    if (!isFeatureEnabled("FEATURE_TOPIC_POLICY")) {
      return NextResponse.json(
        { error: 'Topic policy feature is disabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'create_content');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = TopicGenerationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { categories, count, locale, priority, force_generate, policy_id } = validation.data;

    // Check if topic generation is needed (unless forced)
    if (!force_generate) {
      const pendingTopics = await prisma.topicProposal.count({
        where: { 
          status: 'proposed',
          locale: locale
        }
      });

      // If we have enough pending topics, don't generate more
      if (pendingTopics >= 10) {
        return NextResponse.json({
          success: true,
          message: 'Sufficient pending topics exist',
          pending_count: pendingTopics,
          generated_count: 0
        });
      }
    }

    // Get active topic policy if specified
    let policy = null;
    if (policy_id) {
      policy = await prisma.topicPolicy.findFirst({
        where: { 
          id: policy_id,
          is_active: true,
          policy_type: 'quota_balancer'
        }
      });
    }

    // Simulate topic generation (in real implementation, this would call LLM services)
    const generatedTopics = [];
    
    for (let i = 0; i < count; i++) {
      const topicData = {
        locale: locale,
        primary_keyword: `Generated Topic ${i + 1} for ${categories[i % categories.length]}`,
        longtails: [
          `long tail keyword 1 for ${categories[i % categories.length]}`,
          `long tail keyword 2 for ${categories[i % categories.length]}`,
          `long tail keyword 3 for ${categories[i % categories.length]}`,
          `long tail keyword 4 for ${categories[i % categories.length]}`,
          `long tail keyword 5 for ${categories[i % categories.length]}`,
        ],
        featured_longtails: [
          `featured long tail 1 for ${categories[i % categories.length]}`,
          `featured long tail 2 for ${categories[i % categories.length]}`,
        ],
        questions: [
          `What is the best ${categories[i % categories.length]} in London?`,
          `How to find ${categories[i % categories.length]} in London?`,
          `Why visit ${categories[i % categories.length]} in London?`,
        ],
        authority_links_json: [
          {
            url: `https://example.com/authority-${i + 1}`,
            title: `Authority Source ${i + 1}`,
            sourceDomain: 'example.com'
          },
          {
            url: `https://authority.com/reference-${i + 1}`,
            title: `Reference Source ${i + 1}`,
            sourceDomain: 'authority.com'
          }
        ],
        intent: 'info',
        suggested_page_type: 'guide',
        source_weights_json: {
          category: categories[i % categories.length],
          priority: priority,
          generated_by: 'policy_engine',
          policy_id: policy_id
        },
        confidence_score: 0.75 + (Math.random() * 0.2), // Random score between 0.75-0.95
        status: 'proposed'
      };

      const topic = await prisma.topicProposal.create({
        data: topicData
      });

      generatedTopics.push(topic);
    }

    // Log the generation in audit trail
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: 'topic_generation',
        resource: 'topic_proposal',
        details: {
          generated_count: count,
          categories: categories,
          locale: locale,
          policy_id: policy_id
        },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${count} topics successfully`,
      data: generatedTopics,
      generated_count: count,
      policy_applied: !!policy
    }, { status: 201 });

  } catch (error) {
    console.error('Topic generation error:', error);
    
    // Log error in audit trail
    try {
      const permissionCheck = await requirePermission(request, 'create_content');
      if (permissionCheck instanceof NextResponse) {
        // Don't log audit for failed permission check
      } else {
        await prisma.auditLog.create({
          data: {
            userId: permissionCheck.user.id,
            action: 'topic_generation',
            resource: 'topic_proposal',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}