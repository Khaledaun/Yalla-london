import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'save_draft':
        return await handleSaveDraft(data, user.id)
      
      case 'preview_content':
        return await handlePreviewContent(data)
      
      case 'get_page_types':
        return await handleGetPageTypes()
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing editor request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSaveDraft(data: any, userId: string) {
  const {
    title,
    content,
    locale,
    pageType,
    slug,
    primaryKeyword,
    featuredLongtails,
    authorityLinks,
    tags,
    metaTitle,
    metaDescription,
    ogImage,
    ogVideo
  } = data

  // Validate required fields
  if (!title || !content || !locale || !pageType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate featured long-tails (exactly 2 required)
  if (!featuredLongtails || featuredLongtails.length !== 2) {
    return NextResponse.json({ error: 'Exactly 2 featured long-tails are required' }, { status: 400 })
  }

  // Validate authority links (3-4 required)
  if (!authorityLinks || authorityLinks.length < 3 || authorityLinks.length > 4) {
    return NextResponse.json({ error: '3-4 authority links are required' }, { status: 400 })
  }

  // Generate slug if not provided
  const finalSlug = slug || generateSlug(title)

  // Create or update article
  const article = await prisma.blogPost.upsert({
    where: { slug: finalSlug },
    update: {
      title_en: locale === 'en' ? title : data.title_en || title,
      title_ar: locale === 'ar' ? title : data.title_ar || title,
      content_en: locale === 'en' ? content : data.content_en || content,
      content_ar: locale === 'ar' ? content : data.content_ar || content,
      excerpt_en: extractExcerpt(content),
      excerpt_ar: extractExcerpt(content),
      page_type: pageType,
      keywords_json: { primary: primaryKeyword },
      featured_longtails_json: featuredLongtails,
      authority_links_json: authorityLinks,
      tags: tags || [],
      meta_title_en: metaTitle,
      meta_title_ar: metaTitle,
      meta_description_en: metaDescription,
      meta_description_ar: metaDescription,
      og_image_id: ogImage,
      published: false,
      updated_at: new Date()
    },
    create: {
      title_en: locale === 'en' ? title : title,
      title_ar: locale === 'ar' ? title : title,
      slug: finalSlug,
      content_en: locale === 'en' ? content : content,
      content_ar: locale === 'ar' ? content : content,
      excerpt_en: extractExcerpt(content),
      excerpt_ar: extractExcerpt(content),
      page_type: pageType,
      keywords_json: { primary: primaryKeyword },
      featured_longtails_json: featuredLongtails,
      authority_links_json: authorityLinks,
      tags: tags || [],
      meta_title_en: metaTitle,
      meta_title_ar: metaTitle,
      meta_description_en: metaDescription,
      meta_description_ar: metaDescription,
      og_image_id: ogImage,
      published: false,
      category_id: await getOrCreateCategory('General'),
      author_id: userId
    }
  })

  // Create scheduled content record
  const scheduledContent = await prisma.scheduledContent.create({
    data: {
      title: title,
      content: content,
      content_type: 'blog_post',
      language: locale,
      status: 'draft',
      page_type: pageType,
      generation_source: 'manual'
    }
  })

  return NextResponse.json({ 
    success: true, 
    article,
    scheduledContent,
    message: 'Draft saved to pipeline'
  })
}

async function handlePreviewContent(data: any) {
  const { content, pageType, locale } = data

  // Generate preview based on page type
  const preview = generatePreview(content, pageType, locale)

  return NextResponse.json({ 
    success: true, 
    preview 
  })
}

async function handleGetPageTypes() {
  // Get available page types and their requirements
  const pageTypes = await prisma.pageTypeRecipe.findMany({
    select: {
      type: true,
      required_blocks: true,
      optional_blocks: true,
      min_word_count: true,
      template_prompts_json: true
    }
  })

  return NextResponse.json({ 
    success: true, 
    pageTypes 
  })
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function extractExcerpt(content: string): string {
  // Extract first paragraph or first 160 characters
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  if (paragraphs.length > 0) {
    const firstParagraph = paragraphs[0].replace(/[#*]/g, '').trim()
    return firstParagraph.length > 160 
      ? firstParagraph.substring(0, 160) + '...'
      : firstParagraph
  }
  
  return content.length > 160 
    ? content.substring(0, 160) + '...'
    : content
}

function generatePreview(content: string, pageType: string, locale: string) {
  // Generate HTML preview based on content and page type
  const isRTL = locale === 'ar'
  
  let html = `
    <div class="preview-container ${isRTL ? 'rtl' : 'ltr'}">
      <div class="preview-content">
        ${renderContentAsHTML(content, pageType)}
      </div>
    </div>
  `

  const css = `
    .preview-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
    }
    .preview-container.rtl {
      direction: rtl;
      text-align: right;
    }
    .preview-content h1, .preview-content h2, .preview-content h3 {
      color: #1f2937;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    .preview-content p {
      margin-bottom: 1rem;
      color: #374151;
    }
    .preview-content ul, .preview-content ol {
      margin-bottom: 1rem;
      padding-left: 2rem;
    }
    .preview-container.rtl .preview-content ul,
    .preview-container.rtl .preview-content ol {
      padding-right: 2rem;
      padding-left: 0;
    }
    .preview-content blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin: 1rem 0;
      font-style: italic;
      color: #6b7280;
    }
    .preview-container.rtl .preview-content blockquote {
      border-right: 4px solid #3b82f6;
      border-left: none;
      padding-right: 1rem;
      padding-left: 0;
    }
  `

  return {
    html,
    css,
    wordCount: content.split(/\s+/).length,
    readingTime: Math.ceil(content.split(/\s+/).length / 200) // 200 words per minute
  }
}

function renderContentAsHTML(content: string, pageType: string): string {
  // Convert markdown-like content to HTML
  let html = content
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  
  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Convert lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  // Convert paragraphs
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>\s*<\/p>/g, '')
  
  return html
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
