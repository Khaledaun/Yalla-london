import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies: cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'overview':
        return await getSEOOverview()
      case 'trends':
        return await getSEOTrends()
      case 'audits':
        return await getSEOAudits()
      case 'quick-fixes':
        return await getQuickFixes()
      default:
        return await getSEOOverview()
    }

  } catch (error) {
    console.error('Error fetching SEO data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies: cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'run_audit':
        return await handleRunAudit(data)
      
      case 'apply_quick_fix':
        return await handleApplyQuickFix(data)
      
      case 'generate_internal_links':
        return await handleGenerateInternalLinks(data)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing SEO request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getSEOOverview() {
  // Get average SEO score
  const avgScoreResult = await prisma.blogPost.aggregate({
    _avg: {
      seo_score: true
    },
    where: {
      seo_score: {
        not: null
      }
    }
  })

  const averageScore = Math.round(avgScoreResult._avg.seo_score || 0)

  // Get auto-publish rate (articles with score >= 85)
  const autoPublishCount = await prisma.blogPost.count({
    where: {
      seo_score: {
        gte: 85
      },
      published: true
    }
  })

  const totalPublished = await prisma.blogPost.count({
    where: { published: true }
  })

  const autoPublishRate = totalPublished > 0 ? Math.round((autoPublishCount / totalPublished) * 100) : 0

  // Get review queue (articles with score 70-84)
  const reviewQueue = await prisma.blogPost.count({
    where: {
      seo_score: {
        gte: 70,
        lt: 85
      },
      published: false
    }
  })

  // Get critical issues (articles with score < 50)
  const criticalIssues = await prisma.blogPost.count({
    where: {
      seo_score: {
        lt: 50
      }
    }
  })

  // Get indexed pages count
  const analyticsSnapshot = await prisma.analyticsSnapshot.findFirst({
    orderBy: { created_at: 'desc' }
  })
  const indexedPages = analyticsSnapshot?.indexed_pages || 0

  return NextResponse.json({
    averageScore,
    autoPublishRate,
    reviewQueue,
    criticalIssues,
    indexedPages,
    canShowInternalLinks: indexedPages >= 40
  })
}

async function getSEOTrends() {
  // Get SEO score trends over time
  const trends = await prisma.blogPost.findMany({
    select: {
      seo_score: true,
      created_at: true,
      page_type: true
    },
    where: {
      seo_score: {
        not: null
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 100
  })

  // Group by month and page type
  const trendsByMonth = trends.reduce((acc: any, post) => {
    const month = post.created_at.toISOString().substring(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0, byType: {} }
    }
    acc[month].total += post.seo_score || 0
    acc[month].count += 1
    
    if (!acc[month].byType[post.page_type || 'unknown']) {
      acc[month].byType[post.page_type || 'unknown'] = { total: 0, count: 0 }
    }
    acc[month].byType[post.page_type || 'unknown'].total += post.seo_score || 0
    acc[month].byType[post.page_type || 'unknown'].count += 1
    
    return acc
  }, {})

  // Calculate averages
  const trendData = Object.entries(trendsByMonth).map(([month, data]: [string, any]) => ({
    month,
    averageScore: Math.round(data.total / data.count),
    byType: Object.entries(data.byType).map(([type, typeData]: [string, any]) => ({
      type,
      averageScore: Math.round(typeData.total / typeData.count)
    }))
  }))

  return NextResponse.json({ trends: trendData })
}

async function getSEOAudits() {
  // Get recent audit results
  const audits = await prisma.seoAuditResult.findMany({
    include: {
      // Note: This would need proper relations in the schema
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 50
  })

  return NextResponse.json({ audits })
}

async function getQuickFixes() {
  // Get articles that need quick fixes
  const articlesNeedingFixes = await prisma.blogPost.findMany({
    where: {
      OR: [
        { meta_title_en: null },
        { meta_description_en: null },
        { featured_image: null }
      ],
      published: true
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      meta_title_en: true,
      meta_description_en: true,
      featured_image: true
    }
  })

  const quickFixes = articlesNeedingFixes.map(article => ({
    id: article.id,
    title: article.title_en,
    slug: article.slug,
    fixes: [
      ...(article.meta_title_en ? [] : ['missing_meta_title']),
      ...(article.meta_description_en ? [] : ['missing_meta_description']),
      ...(article.featured_image ? [] : ['missing_featured_image'])
    ]
  }))

  return NextResponse.json({ quickFixes })
}

async function handleRunAudit(data: any) {
  const { contentId, contentType = 'blog_post' } = data

  // Simulate SEO audit
  const auditResult = await simulateSEOAudit(contentId, contentType)

  // Save audit result
  const savedAudit = await prisma.seoAuditResult.create({
    data: {
      content_id: contentId,
      content_type: contentType,
      score: auditResult.score,
      breakdown_json: auditResult.breakdown,
      suggestions: auditResult.suggestions,
      quick_fixes: auditResult.quickFixes,
      internal_link_offers: auditResult.internalLinkOffers
    }
  })

  return NextResponse.json({ success: true, audit: savedAudit })
}

async function handleApplyQuickFix(data: any) {
  const { articleId, fixType } = data

  const article = await prisma.blogPost.findUnique({
    where: { id: articleId }
  })

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  let updateData: any = {}

  switch (fixType) {
    case 'missing_meta_title':
      updateData.meta_title_en = article.title_en
      updateData.meta_title_ar = article.title_ar
      break
    
    case 'missing_meta_description':
      updateData.meta_description_en = article.excerpt_en || article.title_en
      updateData.meta_description_ar = article.excerpt_ar || article.title_ar
      break
    
    case 'missing_featured_image':
      // Set a default featured image
      updateData.featured_image = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
      break
  }

  const updatedArticle = await prisma.blogPost.update({
    where: { id: articleId },
    data: updateData
  })

  return NextResponse.json({ success: true, article: updatedArticle })
}

async function handleGenerateInternalLinks(data: any) {
  const { articleId } = data

  // Get indexed pages count
  const analyticsSnapshot = await prisma.analyticsSnapshot.findFirst({
    orderBy: { created_at: 'desc' }
  })
  const indexedPages = analyticsSnapshot?.indexed_pages || 0

  if (indexedPages < 40) {
    return NextResponse.json({ 
      error: 'Internal link offers require at least 40 indexed pages' 
    }, { status: 400 })
  }

  // Generate internal link suggestions
  const suggestions = await generateInternalLinkSuggestions(articleId)

  return NextResponse.json({ success: true, suggestions })
}

async function simulateSEOAudit(contentId: string, contentType: string) {
  // Simulate SEO audit scoring
  const score = Math.floor(Math.random() * 40) + 60 // 60-100 range
  
  const breakdown = {
    title: Math.floor(Math.random() * 20) + 80,
    meta_description: Math.floor(Math.random() * 20) + 80,
    headings: Math.floor(Math.random() * 20) + 80,
    content_quality: Math.floor(Math.random() * 20) + 80,
    images: Math.floor(Math.random() * 20) + 80,
    internal_links: Math.floor(Math.random() * 20) + 80
  }

  const suggestions = [
    'Add more internal links to related content',
    'Optimize image alt text for better accessibility',
    'Include more long-tail keywords in the content'
  ]

  const quickFixes = [
    'missing_meta_title',
    'missing_meta_description',
    'missing_featured_image'
  ]

  const internalLinkOffers = [
    {
      targetPage: 'Best London Restaurants 2024',
      targetUrl: '/blog/best-london-restaurants-2024',
      anchorText: 'best restaurants in London',
      relevanceScore: 0.95
    },
    {
      targetPage: 'Hidden Gems in London',
      targetUrl: '/blog/hidden-gems-london',
      anchorText: 'hidden gems',
      relevanceScore: 0.87
    }
  ]

  return {
    score,
    breakdown,
    suggestions,
    quickFixes,
    internalLinkOffers
  }
}

async function generateInternalLinkSuggestions(articleId: string) {
  // Get related articles for internal linking
  const relatedArticles = await prisma.blogPost.findMany({
    where: {
      id: { not: articleId },
      published: true
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      tags: true
    },
    take: 10
  })

  return relatedArticles.map(article => ({
    targetPage: article.title_en,
    targetUrl: `/blog/${article.slug}`,
    anchorText: article.title_en.toLowerCase(),
    relevanceScore: Math.random() * 0.3 + 0.7 // 0.7-1.0 range
  }))
}
