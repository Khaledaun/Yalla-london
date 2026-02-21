export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const backup = await prisma.databaseBackup.findUnique({
      where: { id: params.id }
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Error fetching database backup:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database backup' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const backup = await prisma.databaseBackup.findUnique({
      where: { id: params.id }
    })

    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    // Delete from S3 if exists
    if (backup.cloud_storage_path) {
      try {
        const { deleteFile } = await import('@/lib/s3')
        await deleteFile(backup.cloud_storage_path)
      } catch (error) {
        console.error('Error deleting backup from S3:', error)
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.databaseBackup.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting database backup:', error)
    return NextResponse.json(
      { error: 'Failed to delete database backup' },
      { status: 500 }
    )
  }
}
