
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const block = await prisma.homepageBlock.findUnique({
      where: { id: params.id },
      include: {
        media: true
      }
    })

    if (!block) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(block)
  } catch (error) {
    console.error('Error fetching homepage block:', error)
    return NextResponse.json(
      { error: 'Failed to fetch homepage block' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      titleEn,
      titleAr,
      contentEn,
      contentAr,
      config,
      mediaId,
      enabled,
      language
    } = body

    const block = await prisma.homepageBlock.update({
      where: { id: params.id },
      data: {
        title_en: titleEn,
        title_ar: titleAr,
        content_en: contentEn,
        content_ar: contentAr,
        config,
        media_id: mediaId,
        enabled,
        language,
        updated_at: new Date()
      }
    })

    return NextResponse.json(block)
  } catch (error) {
    console.error('Error updating homepage block:', error)
    return NextResponse.json(
      { error: 'Failed to update homepage block' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.homepageBlock.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting homepage block:', error)
    return NextResponse.json(
      { error: 'Failed to delete homepage block' },
      { status: 500 }
    )
  }
}
