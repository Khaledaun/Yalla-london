/**
 * Phase 4C Topics Policy Management API
 * Zod-validated, role-protected endpoints for topic policy CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

// Zod schemas for validation
const TopicPolicySchema = z.object({
  name: z.string().min(1).max(100),
  policy_type: z.enum(['quota_balancer', 'publishing_rules', 'content_quality']),
  rules_json: z.record(z.any()),
  quotas_json: z.record(z.any()).optional(),
  priorities_json: z.record(z.any()).optional(),
  auto_approval_rules: z.record(z.any()).optional(),
  violation_actions: z.array(z.enum(['warn', 'reject', 'quarantine', 'escalate'])),
  effective_from: z.string().datetime().optional(),
  effective_until: z.string().datetime().optional().nullable(),
  is_active: z.boolean().default(true),
});

const UpdateTopicPolicySchema = TopicPolicySchema.partial();

// GET - List topic policies
export async function GET(request: NextRequest) {
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
    const permissionCheck = await requirePermission(request, 'manage_system');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const { searchParams } = new URL(request.url);
    const policyType = searchParams.get('policy_type');
    const isActive = searchParams.get('is_active');

    const where: any = {};
    if (policyType) where.policy_type = policyType;
    if (isActive !== null) where.is_active = isActive === 'true';

    const policies = await prisma.topicPolicy.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: policies,
      total: policies.length
    });

  } catch (error) {
    console.error('Topic policy list error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch topic policies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new topic policy
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
    const permissionCheck = await requirePermission(request, 'manage_system');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = TopicPolicySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create policy
    const policy = await prisma.topicPolicy.create({
      data: {
        ...data,
        created_by: permissionCheck.user.id,
        effective_from: data.effective_from ? new Date(data.effective_from) : new Date(),
        effective_until: data.effective_until ? new Date(data.effective_until) : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: policy
    }, { status: 201 });

  } catch (error) {
    console.error('Topic policy creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create topic policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}