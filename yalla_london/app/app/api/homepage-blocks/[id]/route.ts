export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const block = await prisma.homepageBlock.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    await prisma.homepageBlock.delete({
      where: { id }
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
