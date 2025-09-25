import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getPrismaClient } from '@/lib/database'

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size based on type
    const maxSize = type === 'favicon' ? 1 * 1024 * 1024 : 5 * 1024 * 1024 // 1MB for favicon, 5MB for others
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `${type}-${timestamp}.${fileExtension}`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Generate public URL
    const publicUrl = `/uploads/${filename}`

    // Save to database using Prisma
    try {
      const prisma = getPrismaClient();
      
      await prisma.mediaAsset.create({
        data: {
          filename: filename,
          originalName: file.name,
          filePath: filepath,
          fileUrl: publicUrl,
          fileType: type,
          fileSize: file.size,
          mimeType: file.type,
          assetType: 'image',
          isVideo: false,
          isHeroVideo: type === 'hero-video'
        }
      });
    } catch (dbError) {
      console.error('Failed to save media asset to database:', dbError);
      // Continue even if database save fails, but log the error
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename,
        originalName: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type,
        assetType: type
      }
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
});