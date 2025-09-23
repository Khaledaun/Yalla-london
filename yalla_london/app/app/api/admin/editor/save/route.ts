import { NextRequest, NextResponse } from 'next/server'
// import { withAdminAuth } from '@/lib/admin-middleware'

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    
    // Extract data from the editor
    const {
      title,
      titleAr,
      slug,
      locale,
      pageType,
      primaryKeyword,
      longTail1,
      longTail2,
      authorityLink1,
      authorityLink2,
      authorityLink3,
      authorityLink4,
      excerpt,
      tags,
      content,
      ogImage,
      ogVideo,
      seoScore
    } = body

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create a simple article record in a test table
    // We'll use a direct database connection since Prisma might not be working
    const { Client } = require('pg')
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    await client.connect()

    // Create test_articles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255),
        slug VARCHAR(255) UNIQUE,
        locale VARCHAR(10) DEFAULT 'en',
        page_type VARCHAR(50) DEFAULT 'guide',
        primary_keyword VARCHAR(255),
        long_tail_1 VARCHAR(255),
        long_tail_2 VARCHAR(255),
        authority_link_1 TEXT,
        authority_link_2 TEXT,
        authority_link_3 TEXT,
        authority_link_4 TEXT,
        excerpt TEXT,
        tags TEXT,
        content TEXT NOT NULL,
        og_image TEXT,
        og_video TEXT,
        seo_score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Insert the article
    const insertResult = await client.query(`
      INSERT INTO test_articles (
        title, title_ar, slug, locale, page_type, primary_keyword,
        long_tail_1, long_tail_2, authority_link_1, authority_link_2,
        authority_link_3, authority_link_4, excerpt, tags, content,
        og_image, og_video, seo_score, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, title, slug, created_at
    `, [
      title,
      titleAr || title,
      slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      locale || 'en',
      pageType || 'guide',
      primaryKeyword || '',
      longTail1 || '',
      longTail2 || '',
      authorityLink1 || '',
      authorityLink2 || '',
      authorityLink3 || '',
      authorityLink4 || '',
      excerpt || content.substring(0, 160) + '...',
      tags || '',
      content,
      ogImage || '',
      ogVideo || '',
      seoScore || 0,
      'draft'
    ])

    const newArticle = insertResult.rows[0]
    await client.end()

    // Generate public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london-gpgpz8iqd-khaledauns-projects.vercel.app'}/blog/${newArticle.slug}`

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully!',
      data: {
        id: newArticle.id,
        title: newArticle.title,
        slug: newArticle.slug,
        createdAt: newArticle.created_at,
        publicUrl: publicUrl,
        contentLength: content.length
      }
    })

  } catch (error) {
    console.error('Error saving article:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
