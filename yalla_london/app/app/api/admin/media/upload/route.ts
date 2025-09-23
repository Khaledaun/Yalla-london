import { NextRequest, NextResponse } from 'next/server'
// import { withAdminAuth } from '@/lib/admin-middleware'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export const POST = async (request: NextRequest) => {
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

    // Also save to database for tracking
    try {
      const { Client } = require('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      })

      await client.connect()

      // Create media_assets table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_url VARCHAR(500) NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_size INTEGER NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          asset_type VARCHAR(50) DEFAULT 'image',
          is_video BOOLEAN DEFAULT FALSE,
          is_hero_video BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Insert media asset record
      await client.query(`
        INSERT INTO media_assets (
          filename, original_name, file_path, file_url, file_type, file_size, mime_type, asset_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        filename,
        file.name,
        filepath,
        publicUrl,
        type,
        file.size,
        file.type,
        'image'
      ])

      await client.end()
    } catch (dbError) {
      console.warn('Failed to save media asset to database:', dbError)
      // Continue even if database save fails
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
    );
  }
});
