
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFile } from '@/lib/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error fetching media asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media asset' },
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
    const { title, altText, description, tags, licenseInfo } = body

    const asset = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: {
        title,
        alt_text: altText,
        description,
        tags: tags || [],
        license_info: licenseInfo,
        updated_at: new Date()
      }
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error updating media asset:', error)
    return NextResponse.json(
      { error: 'Failed to update media asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Delete from S3
    try {
      await deleteFile(asset.cloud_storage_path)
      
      // Delete responsive variants if they exist
      if (asset.responsive_urls) {
        const responsiveUrls = asset.responsive_urls as Record<string, string>
        for (const url of Object.values(responsiveUrls)) {
          try {
            // Extract key from URL and delete
            const key = url.split('/').slice(-2).join('/')
            await deleteFile(key)
          } catch (error) {
            console.error('Error deleting responsive variant:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting from S3:', error)
    }

    // Delete from database
    await prisma.mediaAsset.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete media asset' },
      { status: 500 }
    )
  }
}
