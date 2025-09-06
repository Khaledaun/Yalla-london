
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { role } = body // hero, thumbnail, section-header, etc.

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Update usage map to track the role assignment
    const usageMap = (asset.usage_map as Record<string, any>) || {}
    usageMap[role] = {
      assignedAt: new Date().toISOString(),
      count: (usageMap[role]?.count || 0) + 1
    }

    const updatedAsset = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: {
        usage_map: usageMap,
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      role,
      asset: updatedAsset
    })
  } catch (error) {
    console.error('Error setting asset role:', error)
    return NextResponse.json(
      { error: 'Failed to set asset role' },
      { status: 500 }
    )
  }
}
