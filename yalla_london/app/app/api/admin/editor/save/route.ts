import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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

    // For now, let's create a simple file-based storage to verify the save works
    // This will be replaced with proper database storage once we confirm the flow works
    const fs = require('fs').promises
    const path = require('path')
    
    // Create a simple JSON file to store articles
    const articlesDir = path.join(process.cwd(), 'data')
    const articlesFile = path.join(articlesDir, 'articles.json')
    
    try {
      await fs.mkdir(articlesDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    // Read existing articles
    let articles = []
    try {
      const existingData = await fs.readFile(articlesFile, 'utf8')
      articles = JSON.parse(existingData)
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }
    
    // Create new article
    const newArticle = {
      id: Date.now(), // Simple ID generation
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
      tags: tags || '',
      content: content,
      ogImage: ogImage || '',
      ogVideo: ogVideo || '',
      seoScore: seoScore || 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Add to articles array
    articles.push(newArticle)
    
    // Save back to file
    await fs.writeFile(articlesFile, JSON.stringify(articles, null, 2))

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
}