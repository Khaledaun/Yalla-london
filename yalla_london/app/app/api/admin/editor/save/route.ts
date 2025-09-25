import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getPrismaClient } from '@/lib/database'

export const POST = withAdminAuth(async (request: NextRequest) => {
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

    // Guard against JSON storage in production
    if (process.env.NODE_ENV === 'production' && process.env.DEV_FILE_STORE_ONLY) {
      throw new Error('JSON file storage is not allowed in production');
    }

    // Use database as single source of truth
    const prisma = getPrismaClient();
    
    // Create article in database
    const newArticle = await prisma.blogPost.create({
      data: {
        title: title,
        titleAr: titleAr || title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
        locale: locale || 'en',
        pageType: pageType || 'guide',
        primaryKeyword: primaryKeyword || '',
        longTail1: longTail1 || '',
        longTail2: longTail2 || '',
        authorityLink1: authorityLink1 || '',
        authorityLink2: authorityLink2 || '',
        authorityLink3: authorityLink3 || '',
        authorityLink4: authorityLink4 || '',
        excerpt: excerpt || content.substring(0, 160) + '...',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        content: content,
        ogImage: ogImage || '',
        ogVideo: ogVideo || '',
        seoScore: seoScore || 0,
        status: 'draft',
        // Note: createdAt and updatedAt are handled by Prisma automatically
      }
    })

    // Generate public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london-gpgpz8iqd-khaledauns-projects.vercel.app'}/blog/${newArticle.slug}`

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully!',
      data: {
        id: newArticle.id,
        title: newArticle.title,
        slug: newArticle.slug,
        createdAt: newArticle.createdAt,
        publicUrl: publicUrl,
        contentLength: content.length
      }
    })

  } catch (error) {
    console.error('Error saving article:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to save article',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    )
  }
});