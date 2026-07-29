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
    const embed = await prisma.socialEmbed.findUnique({
      where: { id }
    })

    if (!embed) {
      return NextResponse.json(
        { error: 'Embed not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(embed)
  } catch (error) {
    console.error('Error fetching social embed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social embed' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json()
    const { title, author, status } = body

    const embed = await prisma.socialEmbed.update({
      where: { id },
      data: {
        title,
        author,
        status,
        updated_at: new Date()
      }
    })

    return NextResponse.json(embed)
  } catch (error) {
    console.error('Error updating social embed:', error)
    return NextResponse.json(
      { error: 'Failed to update social embed' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    await prisma.socialEmbed.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting social embed:', error)
    return NextResponse.json(
      { error: 'Failed to delete social embed' },
      { status: 500 }
    )
  }
}
