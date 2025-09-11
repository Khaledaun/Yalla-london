export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { blocks } = body // Array of { id, position }

    // Update positions in a transaction
    await prisma.$transaction(
      blocks.map((block: { id: string; position: number }) =>
        prisma.homepageBlock.update({
          where: { id: block.id },
          data: { position: block.position }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering homepage blocks:', error)
    return NextResponse.json(
      { error: 'Failed to reorder blocks' },
      { status: 500 }
    )
  }
}
