import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitoring';
import { getFeatureFlags } from '@/lib/feature-flags';
import { requireAdminAuth } from '@/lib/rbac';

/**
 * Topic Orchestrator API
 * Manages topic generation, validation, and orchestration
 */

// POST - Orchestrate topic generation and validation
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdminAuth(request);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Check feature flags
    const flags = getFeatureFlags();
    if (!flags.TOPIC_RESEARCH || !flags.PHASE4B_ENABLED) {
      return NextResponse.json(
        { error: 'Topic orchestrator feature is disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
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
    console.error('Topic orchestrator error:', error);
    
    // Fixed: using correct ErrorEvent object structure
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown topic orchestrator error'),
      context: { endpoint: '/api/admin/topic-orchestrator' },
      level: 'error'
    });

    return NextResponse.json(
      { 
        error: 'Topic orchestrator failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Get orchestrator status
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminAuth(request);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const flags = getFeatureFlags();
    
    return NextResponse.json({
      status: 'active',
      features: {
        topic_research: flags.TOPIC_RESEARCH,
        phase4b_enabled: flags.PHASE4B_ENABLED
      },
      orchestrator_health: 'healthy'
    });
  } catch (error) {
    console.error('Topic orchestrator status error:', error);
    
    // Fixed: using correct ErrorEvent object structure
    await performanceMonitor.captureError({
      error: error instanceof Error ? error : new Error('Unknown topic orchestrator status error'),
      context: { endpoint: '/api/admin/topic-orchestrator', action: 'status' },
      level: 'error'
    });

    return NextResponse.json(
      { 
        error: 'Failed to get orchestrator status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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