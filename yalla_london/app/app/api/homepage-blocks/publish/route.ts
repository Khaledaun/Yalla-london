export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-middleware'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json()
    const { blocks } = body

    // Create a new version snapshot
    const versionId = `v_${Date.now()}`
    
    // Save current snapshot
    await prisma.homepageVersion.create({
      data: {
        version_id: versionId,
        title: `Published ${new Date().toLocaleString()}`,
        blocks_data: blocks,
        published: true
      }
    })

    // Update all draft blocks to published
    await prisma.homepageBlock.updateMany({
      where: { version: 'draft' },
      data: { version: 'published' }
    })

    // Create new draft copies for future editing
    const publishedBlocks = await prisma.homepageBlock.findMany({
      where: { version: 'published' }
    })

    for (const block of publishedBlocks) {
      await prisma.homepageBlock.create({
        data: {
          type: block.type,
          title_en: block.title_en,
          title_ar: block.title_ar,
          content_en: block.content_en,
          content_ar: block.content_ar,
          config: block.config as any,
          media_id: block.media_id,
          position: block.position,
          enabled: block.enabled,
          version: 'draft',
          language: block.language
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      versionId,
      message: 'Homepage published successfully' 
    })
  } catch (error) {
    console.error('Error publishing homepage:', error)
    return NextResponse.json(
      { error: 'Failed to publish homepage' },
      { status: 500 }
    )
  }
}
