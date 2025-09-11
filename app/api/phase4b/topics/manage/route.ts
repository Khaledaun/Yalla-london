/**
 * Phase 4B Topic Management API
 * CRUD operations for topic proposals with status management
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

// POST - Create or update topic
export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic management feature is disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, topicId, ...topicData } = body;

    switch (action) {
      case 'create':
        const newTopic = await prisma.topicProposal.create({
          data: {
            locale: topicData.locale || 'en',
            primary_keyword: topicData.primaryKeyword || topicData.title,
            longtails: topicData.longtails || [],
            featured_longtails: topicData.featuredLongtails || [],
            questions: topicData.questions || [],
            authority_links_json: topicData.authorityLinks || [],
            intent: topicData.intent || 'informational',
            suggested_page_type: topicData.pageType || 'guide',
            confidence_score: topicData.confidenceScore || 0.8,
            status: 'proposed',
            source_weights_json: {
              source: 'manual',
              created_by: 'admin',
              created_at: new Date().toISOString(),
              ...topicData.metadata,
            },
          },
        });

        return NextResponse.json({
          success: true,
          topic: newTopic,
        });

      case 'update':
        if (!topicId) {
          return NextResponse.json(
            { error: 'Topic ID required for update' },
            { status: 400 }
          );
        }

        const updatedTopic = await prisma.topicProposal.update({
          where: { id: topicId },
          data: {
            status: topicData.status,
            ...(topicData.reason && {
              source_weights_json: {
                ...(await prisma.topicProposal.findUnique({ where: { id: topicId } }))?.source_weights_json,
                status_change_reason: topicData.reason,
                status_changed_at: new Date().toISOString(),
              }
            }),
          },
        });

        return NextResponse.json({
          success: true,
          topic: updatedTopic,
        });

      case 'reorder':
        // Handle bulk reordering of topics
        const { topicOrders } = topicData;
        const updatePromises = topicOrders.map((order: { id: string; position: number }) =>
          prisma.topicProposal.update({
            where: { id: order.id },
            data: {
              source_weights_json: {
                position: order.position,
                reordered_at: new Date().toISOString(),
              }
            }
          })
        );

        await Promise.all(updatePromises);

        return NextResponse.json({
          success: true,
          message: 'Topics reordered successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Topic management error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage topic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete topic
export async function DELETE(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic management feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('id');

    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID required' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to 'deleted'
    const deletedTopic = await prisma.topicProposal.update({
      where: { id: topicId },
      data: {
        status: 'rejected', // Using rejected as soft delete
        source_weights_json: {
          deleted_at: new Date().toISOString(),
          deletion_reason: 'admin_deletion',
        }
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully',
      topic: deletedTopic,
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

// GET - Check for consecutive same-category topics and validate reason requirement
export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic management feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check_consecutive') {
      const category = searchParams.get('category');
      
      if (!category) {
        return NextResponse.json(
          { error: 'Category required for consecutive check' },
          { status: 400 }
        );
      }

      // Get the last approved topic
      const lastTopic = await prisma.topicProposal.findFirst({
        where: { 
          status: 'approved',
          source_weights_json: {
            path: ['original_data', 'category'],
            equals: category
          }
        },
        orderBy: { created_at: 'desc' },
      });

      return NextResponse.json({
        success: true,
        requiresReason: !!lastTopic,
        lastTopic: lastTopic ? {
          id: lastTopic.id,
          category,
          createdAt: lastTopic.created_at,
        } : null,
      });
    }

    // Default: return topic statistics
    const stats = await prisma.topicProposal.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const pendingCount = await prisma.topicProposal.count({
      where: { status: 'proposed' }
    });

    return NextResponse.json({
      success: true,
      stats: stats.reduce((acc, stat) => ({ ...acc, [stat.status]: stat._count.id }), {}),
      pendingCount,
      lowBacklog: pendingCount < 10,
    });

  } catch (error) {
    console.error('Topic check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}