/**
 * Phase 4C Topics Management API
 * Individual topic CRUD operations
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';

// Zod schemas for validation
const UpdateTopicSchema = z.object({
  status: z.enum(['proposed', 'approved', 'rejected', 'used']).optional(),
  primary_keyword: z.string().min(1).max(200).optional(),
  longtails: z.array(z.string()).optional(),
  featured_longtails: z.array(z.string()).length(2).optional(),
  questions: z.array(z.string()).optional(),
  authority_links_json: z.array(z.object({
    url: z.string().url(),
    title: z.string(),
    sourceDomain: z.string()
  })).optional(),
  intent: z.enum(['info', 'transactional', 'event']).optional(),
  suggested_page_type: z.enum(['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary']).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

// GET - Get specific topic
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const permissionCheck = await requirePermission(request, 'view_analytics');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const topic = await prisma.topicProposal.findUnique({
      where: { id: params.id },
      include: {
        scheduled_content: {
          select: {
            id: true,
            title: true,
            status: true,
            published: true,
            published_time: true
          }
        }
      }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: topic
    });

  } catch (error) {
    console.error('Topic fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update specific topic
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const permissionCheck = await requirePermission(request, 'edit_content');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = UpdateTopicSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if topic exists
    const existingTopic = await prisma.topicProposal.findUnique({
      where: { id: params.id }
    });

    if (!existingTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Update topic
    const updatedTopic = await prisma.topicProposal.update({
      where: { id: params.id },
      data: {
        ...updateData,
        updated_at: new Date()
      },
      include: {
        scheduled_content: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: 'update',
        resource: 'topic_proposal',
        resourceId: params.id,
        details: {
          changes: updateData,
          old_status: existingTopic.status,
          new_status: updateData.status || existingTopic.status
        },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedTopic
    });

  } catch (error) {
    console.error('Topic update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific topic
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const permissionCheck = await requirePermission(request, 'delete_content');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    // Check if topic exists and has no associated content
    const topic = await prisma.topicProposal.findUnique({
      where: { id: params.id },
      include: {
        scheduled_content: true
      }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if topic has associated content
    if (topic.scheduled_content && topic.scheduled_content.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete topic with associated content',
          associated_content_count: topic.scheduled_content.length
        },
        { status: 409 }
      );
    }

    // Delete topic
    await prisma.topicProposal.delete({
      where: { id: params.id }
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: 'delete',
        resource: 'topic_proposal',
        resourceId: params.id,
        details: {
          deleted_topic: {
            primary_keyword: topic.primary_keyword,
            status: topic.status,
            locale: topic.locale
          }
        },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully'
    });

  } catch (error) {
    console.error('Topic deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}