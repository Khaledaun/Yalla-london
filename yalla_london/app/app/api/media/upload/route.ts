export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadFile, getPublicUrl } from '@/lib/s3'
import sharp from 'sharp'
import { apiLimiter } from '@/lib/rate-limit'
import { requireAdmin } from '@/lib/admin-middleware'

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const blocked = apiLimiter(request);
  if (blocked) return blocked;

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 50MB)' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}_${sanitizedName}`
    
    // Upload to S3
    const cloudStoragePath = await uploadFile(buffer, filename)
    const publicUrl = getPublicUrl(cloudStoragePath)
    
    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'document'
    
    // Get image dimensions if it's an image
    let width, height, responsiveUrls = null
    if (fileType === 'image') {
      try {
        const metadata = await sharp(buffer).metadata()
        width = metadata.width
        height = metadata.height
        
        // Generate responsive variants
        const variants = await generateResponsiveImages(buffer, cloudStoragePath)
        responsiveUrls = variants
      } catch (error) {
        console.error('Error processing image:', error)
      }
    }
    
    // Save to database
    const asset = await prisma.mediaAsset.create({
      data: {
        filename,
        original_name: file.name,
        cloud_storage_path: cloudStoragePath,
        url: publicUrl,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        width,
        height,
        responsive_urls: responsiveUrls || undefined,
        tags: []
      }
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

async function generateResponsiveImages(buffer: Buffer, originalPath: string) {
  const sizes = [
    { width: 400, suffix: 'sm' },
    { width: 800, suffix: 'md' },
    { width: 1200, suffix: 'lg' }
  ]
  
  const variants: Record<string, string> = {}
  
  for (const size of sizes) {
    try {
      // Generate WebP variant
      const webpBuffer = await sharp(buffer)
        .resize(size.width, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      
      const webpPath = originalPath.replace(/\.[^.]+$/, `_${size.suffix}.webp`)
      const webpKey = await uploadFile(webpBuffer, webpPath.split('/').pop() || 'webp')
      variants[`webp_${size.suffix}`] = getPublicUrl(webpKey)
      
      // Generate AVIF variant (modern format)
      const avifBuffer = await sharp(buffer)
        .resize(size.width, null, { withoutEnlargement: true })
        .avif({ quality: 85 })
        .toBuffer()
      
      const avifPath = originalPath.replace(/\.[^.]+$/, `_${size.suffix}.avif`)
      const avifKey = await uploadFile(avifBuffer, avifPath.split('/').pop() || 'avif')
      variants[`avif_${size.suffix}`] = getPublicUrl(avifKey)
    } catch (error) {
      console.error(`Error generating ${size.suffix} variant:`, error)
    }
  }
  
  return variants
}
