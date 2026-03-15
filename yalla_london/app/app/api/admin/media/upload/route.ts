export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { withAdminAuth } from '@/lib/admin-middleware'

// SECURITY: Whitelist of allowed upload types
const ALLOWED_TYPES = new Set([
  'image', 'favicon', 'logo', 'cover', 'hero', 'hero-video',
  'thumbnail', 'avatar', 'og-image', 'gallery', 'media'
])

// SECURITY: Whitelist of allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico'
])

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = (formData.get('type') as string) || 'image'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // SECURITY: Validate upload type against whitelist
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // SECURITY: Validate file extension against whitelist
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
      return NextResponse.json(
        { error: 'File extension not allowed' },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = type === 'favicon' ? 1 * 1024 * 1024 : 5 * 1024 * 1024
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

    // SECURITY: Generate safe filename (alphanumeric + hyphens only)
    const timestamp = Date.now()
    const safeType = type.replace(/[^a-zA-Z0-9-]/g, '')
    const filename = `${safeType}-${timestamp}.${fileExtension}`
    const filepath = resolve(uploadsDir, filename)

    // SECURITY: Verify the resolved path stays within the uploads directory
    if (!filepath.startsWith(resolve(uploadsDir))) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, new Uint8Array(buffer))

    const publicUrl = `/uploads/${filename}`

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
    // SECURITY: Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
});
