
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { downloadFile } from '@/lib/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (backup.status !== 'completed' || !backup.cloud_storage_path) {
      return NextResponse.json(
        { error: 'Backup is not available for download' },
        { status: 400 }
      )
    }

    // Generate signed download URL
    const downloadUrl = await downloadFile(backup.cloud_storage_path)

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}
