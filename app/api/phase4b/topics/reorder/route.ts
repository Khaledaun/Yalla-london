/**
 * Phase 4B Topic Reordering API
 * Handle drag-and-drop reordering of topics
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic management feature is disabled' },
        { status: 403 }
      );
    }

    const { topicOrders } = await request.json();
    
    if (!Array.isArray(topicOrders)) {
      return NextResponse.json(
        { error: 'Invalid topic orders format' },
        { status: 400 }
      );
    }

    // Update each topic with its new position
    const updatePromises = topicOrders.map((order: { id: string; position: number }) =>
      prisma.topicProposal.update({
        where: { id: order.id },
        data: {
          source_weights_json: {
            ...((prisma.topicProposal.findUnique({ where: { id: order.id } }) as any)?.source_weights_json || {}),
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
      updatedCount: topicOrders.length,
    });

  } catch (error) {
    console.error('Topic reordering error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reorder topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}