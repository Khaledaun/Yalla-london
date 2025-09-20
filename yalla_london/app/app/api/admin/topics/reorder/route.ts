import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Reorder topics (drag and drop)
export async function POST(request: NextRequest) {
  try {
    const { topicOrders } = await request.json()
    
    if (!Array.isArray(topicOrders)) {
      return NextResponse.json(
        { error: 'Invalid topic orders format' },
        { status: 400 }
      )
    }

    // Update each topic with its new position
    const updatePromises = topicOrders.map((order: { id: string; position: number }) => {
      return prisma.topicProposal.update({
        where: { id: order.id },
        data: {
          // Use source_weights_json to store ordering information
          source_weights_json: {
            position: order.position,
            reordered_at: new Date().toISOString(),
          },
          updated_at: new Date()
        }
      })
    })

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: 'Topics reordered successfully',
      updatedCount: topicOrders.length,
    })

  } catch (error) {
    console.error('Topic reordering error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reorder topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}