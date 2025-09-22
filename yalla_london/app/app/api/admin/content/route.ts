import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all articles with real data
    const articles = await prisma.blogPost.findMany({
      include: {
        category: true,
        author: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Get all scheduled content
    const scheduledContent = await prisma.scheduledContent.findMany({
      include: {
        topic_proposal: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Get media assets
    const mediaAssets = await prisma.mediaAsset.findMany({
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({
      articles,
      scheduledContent,
      mediaAssets,
      stats: {
        totalArticles: articles.length,
        publishedArticles: articles.filter(a => a.published).length,
        draftArticles: articles.filter(a => !a.published).length,
        scheduledContent: scheduledContent.length,
        mediaAssets: mediaAssets.length
      }
    })

  } catch (error) {
    console.error('Error fetching content data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'import_content':
        return await handleContentImport(data, user.id)
      
      case 'create_article':
        return await handleCreateArticle(data, user.id)
      
      case 'update_article':
        return await handleUpdateArticle(data, user.id)
      
      default:
        return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing content request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleContentImport(data: any, userId: string) {
  const { importType, fileData, mapping } = data

  // Create import record
  const importRecord = await prisma.contentImport.create({
      data: {
      import_type: importType,
      source_file: fileData.name,
      status: 'processing'
    }
  })

  try {
    let importedCount = 0
    let failedCount = 0

    // Process based on import type
    switch (importType) {
      case 'csv':
        const csvData = parseCSV(fileData.content)
        for (const row of csvData) {
          try {
            await prisma.blogPost.create({
              data: {
                title_en: row[mapping.title] || 'Imported Article',
                title_ar: row[mapping.titleAr] || row[mapping.title] || 'Imported Article',
                slug: generateSlug(row[mapping.title] || 'imported-article'),
                content_en: row[mapping.content] || '',
                content_ar: row[mapping.contentAr] || row[mapping.content] || '',
                excerpt_en: row[mapping.excerpt] || '',
                excerpt_ar: row[mapping.excerptAr] || row[mapping.excerpt] || '',
                published: false,
                category_id: await getOrCreateCategory(row[mapping.category] || 'General'),
                author_id: userId,
                tags: row[mapping.tags] ? row[mapping.tags].split(',').map((t: string) => t.trim()) : [],
                page_type: row[mapping.pageType] || 'guide',
                keywords_json: row[mapping.keywords] ? { primary: row[mapping.keywords] } : null,
                generation_source: 'manual_import'
              }
            })
            importedCount++
          } catch (error) {
            console.error('Error importing row:', error)
            failedCount++
          }
        }
        break

      case 'markdown':
        // Process markdown content
        const markdownContent = fileData.content
        const parsed = parseMarkdown(markdownContent)
        
        await prisma.blogPost.create({
          data: {
            title_en: parsed.title || 'Imported Article',
            title_ar: parsed.title || 'Imported Article',
            slug: generateSlug(parsed.title || 'imported-article'),
            content_en: parsed.content || '',
            content_ar: parsed.content || '',
            excerpt_en: parsed.excerpt || '',
            excerpt_ar: parsed.excerpt || '',
            published: false,
            category_id: await getOrCreateCategory('General'),
            author_id: userId,
            tags: parsed.tags || [],
            page_type: 'guide',
            generation_source: 'manual_import'
          }
        })
        importedCount++
        break

      default:
        throw new Error('Unsupported import type')
    }

    // Update import record
    await prisma.contentImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'completed',
        imported_count: importedCount,
        failed_count: failedCount
      }
    })

    return NextResponse.json({
      success: true,
      importedCount,
      failedCount,
      importId: importRecord.id
    })

  } catch (error) {
    await prisma.contentImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}

async function handleCreateArticle(data: any, userId: string) {
  const article = await prisma.blogPost.create({
    data: {
      title_en: data.title_en,
      title_ar: data.title_ar || data.title_en,
      slug: generateSlug(data.title_en),
      content_en: data.content_en,
      content_ar: data.content_ar || data.content_en,
      excerpt_en: data.excerpt_en,
      excerpt_ar: data.excerpt_ar || data.excerpt_en,
      published: data.published || false,
      category_id: data.category_id || await getOrCreateCategory('General'),
      author_id: userId,
      tags: data.tags || [],
      page_type: data.page_type || 'guide',
      keywords_json: data.keywords_json,
      featured_longtails_json: data.featured_longtails_json,
      authority_links_json: data.authority_links_json,
      meta_title_en: data.meta_title_en,
      meta_title_ar: data.meta_title_ar,
      meta_description_en: data.meta_description_en,
      meta_description_ar: data.meta_description_ar
    }
  })

  return NextResponse.json({ success: true, article })
}

async function handleUpdateArticle(data: any, userId: string) {
  const article = await prisma.blogPost.update({
    where: { id: data.id },
    data: {
      title_en: data.title_en,
      title_ar: data.title_ar,
      content_en: data.content_en,
      content_ar: data.content_ar,
      excerpt_en: data.excerpt_en,
      excerpt_ar: data.excerpt_ar,
      published: data.published,
      tags: data.tags,
      page_type: data.page_type,
      keywords_json: data.keywords_json,
      featured_longtails_json: data.featured_longtails_json,
      authority_links_json: data.authority_links_json,
      meta_title_en: data.meta_title_en,
      meta_title_ar: data.meta_title_ar,
      meta_description_en: data.meta_description_en,
      meta_description_ar: data.meta_description_ar,
      updated_at: new Date()
    }
  })

  return NextResponse.json({ success: true, article })
}

// Helper functions
function parseCSV(content: string) {
  const lines = content.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
  }
  
  return data
}

function parseMarkdown(content: string) {
  const lines = content.split('\n')
  let title = ''
  let excerpt = ''
  let content_start = 0
  
  // Extract title from first H1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].substring(2).trim()
      content_start = i + 1
      break
    }
  }
  
  // Extract excerpt from first paragraph
  for (let i = content_start; i < lines.length; i++) {
    if (lines[i].trim() && !lines[i].startsWith('#')) {
      excerpt = lines[i].trim()
      break
    }
  }
  
  return {
    title,
    excerpt,
    content: lines.slice(content_start).join('\n'),
    tags: []
  }
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function getOrCreateCategory(name: string) {
  const existing = await prisma.category.findFirst({
    where: { name_en: name }
  })
  
  if (existing) return existing.id
  
  const newCategory = await prisma.category.create({
    data: {
      name_en: name,
      name_ar: name,
      slug: generateSlug(name)
    }
  })
  
  return newCategory.id
}