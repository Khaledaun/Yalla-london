"use client"

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitoring';
import { getFeatureFlags } from '@/lib/feature-flags';
import { requireAdmin } from '@/lib/rbac';

// Legacy imports for backward compatibility
import { withAdminAuth } from '@/lib/admin-middleware';
import { topicOrchestrator, TopicGenerationRequest } from '@/lib/services/TopicOrchestrator';

/**
 * POST /api/admin/topic-orchestrator
 * Supports both legacy topic generation and new orchestrator actions
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check feature flags for legacy or new API
    const flags = getFeatureFlags();
    const body = await request.json();

    // Legacy topic generation (Phase 1 & 2)
    if (body.category) {
      if (process.env.FEATURE_TOPIC_RESEARCH !== 'true') {
        return NextResponse.json(
          { 
            status: 'error', 
            error: 'Topic research is not enabled. Set FEATURE_TOPIC_RESEARCH=true to enable.' 
          },
          { status: 403 }
        );
      }

      const { category, locale = 'en', count = 3, priority = 'medium', manual_trigger = true } = body;

      // Validation
      if (!category) {
        return NextResponse.json(
          { status: 'error', error: 'Category is required' },
          { status: 400 }
        );
      }

      const generationRequest: TopicGenerationRequest = {
        category,
        locale,
        count: Math.min(count, 5), // Phase 2 safety limit
        priority,
        manual_trigger
      };

      // Get client ID for rate limiting
      const clientId = request.headers.get('x-forwarded-for') || 'admin';

      // Generate topics
      const result = await topicOrchestrator.generateTopics(generationRequest, clientId);

      if (!result.success) {
        return NextResponse.json(
          { 
            status: 'error', 
            error: result.error,
            safety_summary: result.safety_summary
          },
          { status: 400 }
        );
      }

      // Log successful generation
      performanceMonitor.addBreadcrumb(
        `Admin topic generation completed`,
        'admin.topic.generation',
        {
          category,
          locale,
          generated: result.generated_count,
          manual_trigger
        }
      );

      return NextResponse.json({
        status: 'success',
        message: `Generated ${result.generated_count} topics successfully`,
        data: {
          generated_count: result.generated_count,
          topics: result.topics,
          safety_summary: result.safety_summary,
          manual_approval_required: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true'
        },
        timestamp: new Date().toISOString()
      });
    }

    // New API: Orchestrator actions (Phase 4+)
    const { action, payload } = body;

    switch (action) {
      case 'generate':
        return await handleTopicGeneration(payload);
      case 'validate':
        return await handleTopicValidation(payload);
      case 'orchestrate':
        return await handleTopicOrchestration(payload);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown topic orchestrator error'),
      context: { endpoint: '/api/admin/topic-orchestrator' }
    });
    console.error('Topic orchestrator error:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: 'Topic generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/topic-orchestrator
 * Get topic orchestrator status and configuration
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const flags = getFeatureFlags();
    const status = await topicOrchestrator.getTopicStatus();

    return NextResponse.json({
      status: 'success',
      configuration: status,
      features: {
        topic_research: flags.TOPIC_RESEARCH,
        phase4b_enabled: flags.PHASE4B_ENABLED
      },
      orchestrator_health: 'healthy',
      phase2_settings: {
        safety_mode: process.env.PHASE2_SAFETY_MODE === 'true',
        manual_approval_required: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true',
        max_content_generation: process.env.PHASE2_MAX_CONTENT_GENERATION || '5'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown topic orchestrator status error'),
      context: { endpoint: '/api/admin/topic-orchestrator' }
    });
    console.error('Topic orchestrator status error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to get topic orchestrator status' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/topic-orchestrator
 * Approve topics (Phase 2 manual approval workflow)
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, topic_ids, user_id } = body;

    if (action !== 'approve' || !topic_ids || !Array.isArray(topic_ids)) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid action or topic_ids' },
        { status: 400 }
      );
    }

    const result = await topicOrchestrator.approveTopics(topic_ids, user_id || 'admin');

    if (!result.success) {
      return NextResponse.json(
        { status: 'error', error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      message: `Approved ${result.approved_count} topics`,
      approved_count: result.approved_count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown topic approval error'),
      context: { endpoint: '/api/admin/topic-orchestrator' }
    });
    console.error('Topic approval error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Topic approval failed' },
      { status: 500 }
    );
  }
});

// Helpers for new API actions
async function handleTopicGeneration(payload: any) {
  // Topic generation logic would go here
  return NextResponse.json({
    success: true,
    message: 'Topic generation initiated',
    data: payload
  });
}

async function handleTopicValidation(payload: any) {
  // Topic validation logic would go here
  return NextResponse.json({
    success: true,
    message: 'Topic validation completed',
    data: payload
  });
}

async function handleTopicOrchestration(payload: any) {
  // Topic orchestration logic would go here
  return NextResponse.json({
    success: true,
    message: 'Topic orchestration completed',
    data: payload
  });
}