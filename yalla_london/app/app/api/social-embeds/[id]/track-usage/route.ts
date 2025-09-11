export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Increment usage count
    const embed = await prisma.socialEmbed.update({
      where: { id: params.id },
      data: {
        usage_count: {
          increment: 1
        },
        updated_at: new Date()
      }
    })

    return NextResponse.json({ success: true, usageCount: embed.usage_count })
  } catch (error) {
    console.error('Error tracking embed usage:', error)
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    )
  }
}
