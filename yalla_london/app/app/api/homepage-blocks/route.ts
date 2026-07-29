export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const version = searchParams.get('version') || 'draft'

    const blocks = await prisma.homepageBlock.findMany({
      where: { version },
      orderBy: { position: 'asc' },
      include: {
        media: true
      }
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Error fetching homepage blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch homepage blocks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json()
    const {
      type,
      titleEn,
      titleAr,
      contentEn,
      contentAr,
      config,
      mediaId,
      position,
      enabled,
      version,
      language
    } = body

    const block = await prisma.homepageBlock.create({
      data: {
        type,
        title_en: titleEn,
        title_ar: titleAr,
        content_en: contentEn,
        content_ar: contentAr,
        config: config || {},
        media_id: mediaId,
        position,
        enabled: enabled !== undefined ? enabled : true,
        version: version || 'draft',
        language: language || 'both'
      }
    })

    return NextResponse.json(block, { status: 201 })
  } catch (error) {
    console.error('Error creating homepage block:', error)
    return NextResponse.json(
      { error: 'Failed to create homepage block' },
      { status: 500 }
    )
  }
}
