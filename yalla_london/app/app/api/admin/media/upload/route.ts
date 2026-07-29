export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { existsSync } from 'fs'
import { withAdminAuth } from '@/lib/admin-middleware'

// SECURITY: Whitelist of allowed upload types (form field "type", NOT file MIME)
const ALLOWED_TYPES = new Set([
  'image', 'video', 'favicon', 'logo', 'cover', 'hero', 'hero-video',
  'thumbnail', 'avatar', 'og-image', 'gallery', 'media', 'document'
])

// SECURITY: Whitelist of allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico',
  // Videos
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  // Documents
  'pdf', 'doc', 'docx'
])

// Max file size for storing as base64 data URL in DB (4MB)
const MAX_DATA_URL_SIZE = 4 * 1024 * 1024;

// Map MIME prefixes to file_type categories
function detectFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

// Suggest a category based on file type and upload type
function suggestCategory(fileType: string, uploadType: string): string {
  if (uploadType === 'logo' || uploadType === 'favicon' || uploadType === 'og-image') return 'logo';
  if (uploadType === 'hero' || uploadType === 'hero-video' || uploadType === 'cover') return 'hero';
  if (uploadType === 'gallery') return 'gallery';
  if (uploadType === 'avatar' || uploadType === 'thumbnail') return 'social';
  if (fileType === 'video') return 'gallery';
  if (fileType === 'image') return 'blog';
  return 'blog';
}

// Extract format from filename
function extractFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext;
}

// Determine a writable upload directory
function getUploadsDir(): { dir: string; isTemp: boolean } {
  // Try public/uploads first (works in local dev)
  const publicDir = join(process.cwd(), 'public', 'uploads');
  try {
    if (!existsSync(publicDir)) {
      // Try creating it — will fail on Vercel (read-only /var/task/)
      const fs = require('fs');
      fs.mkdirSync(publicDir, { recursive: true });
    }
    // Quick write test
    const testPath = join(publicDir, '.write-test');
    const fs = require('fs');
    fs.writeFileSync(testPath, '');
    fs.unlinkSync(testPath);
    return { dir: publicDir, isTemp: false };
  } catch {
    // Vercel serverless — use /tmp/
    const tmpDir = '/tmp/uploads';
    if (!existsSync(tmpDir)) {
      const fs = require('fs');
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return { dir: tmpDir, isTemp: true };
  }
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadType = (formData.get('type') as string) || 'media'
    const siteId = (formData.get('siteId') as string) || null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // SECURITY: Validate upload type against whitelist
    if (!ALLOWED_TYPES.has(uploadType)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    // Validate MIME type — allow images, videos, and documents
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isDocument = file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isImage && !isVideo && !isDocument) {
      return NextResponse.json(
        { error: 'Only image, video, and document files are allowed' },
        { status: 400 }
      )
    }

    // SECURITY: Validate file extension against whitelist
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
      return NextResponse.json(
        { error: `File extension ".${fileExtension}" not allowed` },
        { status: 400 }
      )
    }

    // Validate file size: images 10MB, videos 50MB, documents 5MB
    const maxSize = isVideo ? 50 * 1024 * 1024 : isImage ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // SECURITY: Generate safe filename (alphanumeric + hyphens only)
    const timestamp = Date.now()
    const safeType = uploadType.replace(/[^a-zA-Z0-9-]/g, '')
    const filename = `${safeType}-${timestamp}.${fileExtension}`

    // Determine storage strategy
    const { dir: uploadsDir, isTemp } = getUploadsDir();
    const filepath = resolve(uploadsDir, filename)

    // SECURITY: Verify the resolved path stays within the uploads directory
    if (!filepath.startsWith(resolve(uploadsDir))) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Write file to disk (either public/ or /tmp/)
    await writeFile(filepath, new Uint8Array(buffer))

    // For Vercel (isTemp), store images as data URLs so they survive lambda recycling.
    // For local dev, use the public path.
    let publicUrl: string;
    if (isTemp && isImage && file.size <= MAX_DATA_URL_SIZE) {
      // Store as base64 data URL — persists in DB even after lambda dies
      publicUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
    } else if (isTemp) {
      // Large file or video on Vercel — store temp path, warn user
      // The file won't persist but the DB record will
      publicUrl = `/api/admin/media/serve/${filename}`;
    } else {
      publicUrl = `/uploads/${filename}`;
    }

    const fileType = detectFileType(file.type);
    const category = suggestCategory(fileType, uploadType);
    const format = extractFormat(file.name);

    // Extract image dimensions if possible
    let width: number | null = null;
    let height: number | null = null;

    if (isImage) {
      try {
        const sharp = (await import('sharp')).default;
        const metadata = await sharp(buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
        console.warn('[media-upload] Could not extract image dimensions (sharp not available)');
      }
    }

    // Save to database using MediaAsset model
    const { prisma } = await import("@/lib/db");

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: filename,
        original_name: file.name,
        cloud_storage_path: isTemp ? `tmp/uploads/${filename}` : `public/uploads/${filename}`,
        url: publicUrl,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        width: width,
        height: height,
        tags: [],
        category: category,
        folder: folder,
        site_id: siteId,
        isVideo: isVideo,
      }
    });

    return NextResponse.json({
      success: true,
      message: isTemp
        ? 'File uploaded (stored in database). For permanent file hosting, configure cloud storage (S3/Vercel Blob).'
        : 'File uploaded successfully',
      id: asset.id,
      data: {
        id: asset.id,
        filename: asset.filename,
        originalName: asset.original_name,
        url: asset.url,
        size: asset.file_size,
        mimeType: asset.mime_type,
        fileType: asset.file_type,
        width: asset.width,
        height: asset.height,
        format: format,
        category: asset.category,
        folder: asset.folder,
        siteId: asset.site_id,
        isVideo: asset.isVideo,
        createdAt: asset.created_at,
        assetType: uploadType
      }
    })

  } catch (error) {
    console.error('[media-upload] File upload error:', error)
    let reason = 'Failed to upload file';
    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) reason = 'Disk full — no space left on server';
      else if (error.message.includes('EACCES') || error.message.includes('EPERM')) reason = 'Permission denied — server cannot write to uploads folder';
      else if (error.message.includes('Unique constraint')) reason = 'A file with this name already exists';
      else if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) reason = 'Database connection failed — try again in a moment';
      else reason = `Upload failed: ${error.message.slice(0, 100)}`;
    }
    return NextResponse.json(
      { error: reason },
      { status: 500 }
    )
  }
});
