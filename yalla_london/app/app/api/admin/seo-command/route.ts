export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { prisma } from '@/lib/db'
import { getDefaultSiteId } from '@/config/sites'

// GET - Fetch SEO data and issues from real database
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const siteId = request.headers.get('x-site-id') || getDefaultSiteId()

    switch (type) {
      case 'overview':
        return await getOverview(siteId)
      case 'issues':
        return await getIssues(siteId)
      case 'crawler':
        return await getCrawlerHistory()
      case 'quick-fixes':
        return await getQuickFixes(siteId)
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('[seo-command] API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SEO data' },
      { status: 500 }
    )
  }
})

async function getOverview(siteId: string) {
  // Import SEO thresholds from centralized standards — single source of truth
  let qualityGateScore = 70;
  let minWords = 1000;
  let metaTitleRange = "30-60";
  let metaDescRange = "120-160";
  try {
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    qualityGateScore = CONTENT_QUALITY.qualityGateScore;
    minWords = CONTENT_QUALITY.minWords;
    metaTitleRange = `${CONTENT_QUALITY.metaTitleMin}-${CONTENT_QUALITY.metaTitleOptimal.max}`;
    metaDescRange = `${CONTENT_QUALITY.metaDescriptionOptimal.min}-${CONTENT_QUALITY.metaDescriptionOptimal.max}`;
  } catch { /* use fallbacks */ }

  const siteFilter = { siteId, deletedAt: null }

  // Real article counts
  const totalPublished = await prisma.blogPost.count({
    where: { published: true, ...siteFilter },
  })

  // Average SEO score
  const avgResult = await prisma.blogPost.aggregate({
    _avg: { seo_score: true },
    where: { published: true, seo_score: { not: null }, ...siteFilter },
  })
  const healthScore = Math.round(avgResult._avg.seo_score || 0)

  // Indexed pages count
  let indexedPages = 0
  try {
    indexedPages = await prisma.uRLIndexingStatus.count({
      where: { status: 'indexed' },
    })
  } catch { /* table may not exist */ }

  // Issues: articles below quality gate score (from standards.ts)
  const issuesCount = await prisma.blogPost.count({
    where: { seo_score: { lt: qualityGateScore }, published: true, ...siteFilter },
  })

  // Recent cron activity related to SEO
  let recentActivity: Array<{ id: string; action: string; timestamp: string; type: string }> = []
  try {
    const recentLogs = await prisma.cronJobLog.findMany({
      where: {
        job_name: { in: ['seo-agent', 'seo-cron', 'seo-health-report', 'content-selector', 'scheduled-publish'] },
      },
      orderBy: { started_at: 'desc' },
      take: 5,
      select: { id: true, job_name: true, status: true, started_at: true, items_processed: true },
    })
    recentActivity = recentLogs.map(log => ({
      id: log.id,
      action: `${log.job_name}: ${log.status}${log.items_processed ? ` (${log.items_processed} items)` : ''}`,
      timestamp: log.started_at.toISOString(),
      type: log.status === 'completed' ? 'fix' : 'issue',
    }))
  } catch { /* CronJobLog table may not exist */ }

  // Load time not available without real monitoring — return null instead of fake
  return NextResponse.json({
    healthScore,
    totalPages: totalPublished,
    indexedPages,
    issuesFound: issuesCount,
    lastCrawl: recentActivity.length > 0 ? recentActivity[0].timestamp : null,
    avgLoadTime: null, // Requires real monitoring (PageSpeed API or RUM)
    mobileFriendly: null, // Requires Lighthouse or PageSpeed API
    recentActivity,
  })
}

async function getIssues(siteId: string) {
  // Import thresholds from centralized standards
  let issueQualityGateScore = 70;
  let issueMinWords = 1000;
  let issueMetaTitleRange = "30-60";
  let issueMetaDescRange = "120-160";
  try {
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    issueQualityGateScore = CONTENT_QUALITY.qualityGateScore;
    issueMinWords = CONTENT_QUALITY.minWords;
    issueMetaTitleRange = `${CONTENT_QUALITY.metaTitleMin}-${CONTENT_QUALITY.metaTitleOptimal.max}`;
    issueMetaDescRange = `${CONTENT_QUALITY.metaDescriptionOptimal.min}-${CONTENT_QUALITY.metaDescriptionOptimal.max}`;
  } catch { /* use fallbacks */ }

  // Find real articles with SEO issues
  const articlesWithIssues = await prisma.blogPost.findMany({
    where: {
      published: true,
      siteId,
      deletedAt: null,
      OR: [
        { meta_title_en: null },
        { meta_description_en: null },
        { featured_image: null },
        { seo_score: { lt: issueQualityGateScore } },
      ],
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      meta_title_en: true,
      meta_description_en: true,
      featured_image: true,
      content_en: true,
      seo_score: true,
    },
    take: 20,
    orderBy: { seo_score: 'asc' },
  })

  const issues = articlesWithIssues.flatMap((article, idx) => {
    const articleIssues: Array<{
      id: string
      type: string
      severity: string
      title: string
      description: string
      pageUrl: string
      suggestions: string[]
      quickFix?: { action: string; automated: boolean }
      status: string
      detectedAt: string
    }> = []

    if (!article.meta_title_en) {
      articleIssues.push({
        id: `${article.id}-meta-title`,
        type: 'missing_meta',
        severity: 'high',
        title: 'Missing Meta Title',
        description: `"${article.title_en}" has no meta title set`,
        pageUrl: `/blog/${article.slug}`,
        suggestions: [`Add a meta title between ${issueMetaTitleRange} characters`, 'Include primary keyword naturally'],
        quickFix: { action: 'Generate meta title from article title', automated: true },
        status: 'pending',
        detectedAt: new Date().toISOString(),
      })
    }

    if (!article.meta_description_en) {
      articleIssues.push({
        id: `${article.id}-meta-desc`,
        type: 'missing_meta',
        severity: 'high',
        title: 'Missing Meta Description',
        description: `"${article.title_en}" has no meta description`,
        pageUrl: `/blog/${article.slug}`,
        suggestions: [`Add a meta description between ${issueMetaDescRange} characters`, 'Include a call to action'],
        quickFix: { action: 'Generate meta description from excerpt', automated: true },
        status: 'pending',
        detectedAt: new Date().toISOString(),
      })
    }

    if (!article.featured_image) {
      articleIssues.push({
        id: `${article.id}-image`,
        type: 'image_alt',
        severity: 'medium',
        title: 'Missing Featured Image',
        description: `"${article.title_en}" has no featured image`,
        pageUrl: `/blog/${article.slug}`,
        suggestions: ['Add a high-quality featured image', 'Include descriptive alt text'],
        status: 'pending',
        detectedAt: new Date().toISOString(),
      })
    }

    const wordCount = (article.content_en || '').split(/\s+/).filter(Boolean).length
    if (wordCount < issueMinWords) {
      articleIssues.push({
        id: `${article.id}-thin`,
        type: 'thin_content',
        severity: wordCount < 300 ? 'high' : 'medium',
        title: 'Thin Content',
        description: `"${article.title_en}" has only ${wordCount} words (minimum: ${issueMinWords.toLocaleString()})`,
        pageUrl: `/blog/${article.slug}`,
        suggestions: [`Expand content to at least ${issueMinWords.toLocaleString()} words`, 'Add more detailed sections and subheadings'],
        status: 'pending',
        detectedAt: new Date().toISOString(),
      })
    }

    return articleIssues
  })

  return NextResponse.json({ issues })
}

async function getCrawlerHistory() {
  // Real cron job history for SEO-related jobs
  let history: Array<{
    id: string
    timestamp: string
    pagesCrawled: number
    issuesFound: number
    status: string
    duration: number
  }> = []

  try {
    const logs = await prisma.cronJobLog.findMany({
      where: {
        job_name: { in: ['seo-agent', 'seo-cron', 'seo-health-report'] },
      },
      orderBy: { started_at: 'desc' },
      take: 10,
      select: {
        id: true,
        job_name: true,
        status: true,
        started_at: true,
        duration_ms: true,
        items_processed: true,
        error_message: true,
      },
    })

    history = logs.map(log => ({
      id: log.id,
      timestamp: log.started_at.toISOString(),
      pagesCrawled: log.items_processed || 0,
      issuesFound: log.error_message ? 1 : 0,
      status: log.status === 'completed' ? 'completed' : 'failed',
      duration: Math.round((log.duration_ms || 0) / 1000),
    }))
  } catch { /* CronJobLog may not exist */ }

  return NextResponse.json({
    config: {
      frequency: 'daily',
      includePatterns: ['/blog/*', '/events/*', '/recommendations/*', '/news/*'],
      excludePatterns: ['/admin/*', '/api/*', '/_next/*'],
      maxPages: 100,
      timeout: 60,
    },
    history,
  })
}

async function getQuickFixes(siteId: string) {
  const siteFilter = { siteId, deletedAt: null, published: true }

  // Count real issues
  const missingMetaTitle = await prisma.blogPost.count({
    where: { meta_title_en: null, ...siteFilter },
  })

  const missingMetaDesc = await prisma.blogPost.count({
    where: { meta_description_en: null, ...siteFilter },
  })

  const missingImage = await prisma.blogPost.count({
    where: { featured_image: null, ...siteFilter },
  })

  const lowScore = await prisma.blogPost.count({
    where: { seo_score: { lt: 50 }, ...siteFilter },
  })

  const availableFixes = [
    ...(missingMetaTitle > 0 ? [{
      id: 'meta-titles',
      title: 'Generate Missing Meta Titles',
      description: 'Auto-copy article titles as meta titles',
      count: missingMetaTitle,
      automated: true,
      estimatedTime: `${Math.ceil(missingMetaTitle * 0.5)} minutes`,
    }] : []),
    ...(missingMetaDesc > 0 ? [{
      id: 'meta-descriptions',
      title: 'Generate Missing Meta Descriptions',
      description: 'Auto-generate meta descriptions from excerpts',
      count: missingMetaDesc,
      automated: true,
      estimatedTime: `${Math.ceil(missingMetaDesc * 0.5)} minutes`,
    }] : []),
    ...(missingImage > 0 ? [{
      id: 'featured-images',
      title: 'Add Featured Images',
      description: 'Articles without featured images need manual upload',
      count: missingImage,
      automated: false,
      estimatedTime: `${Math.ceil(missingImage * 3)} minutes`,
    }] : []),
    ...(lowScore > 0 ? [{
      id: 'low-score',
      title: 'Improve Low SEO Score Articles',
      description: 'Articles scoring below 50 need content improvement',
      count: lowScore,
      automated: false,
      estimatedTime: `${Math.ceil(lowScore * 15)} minutes`,
    }] : []),
  ]

  return NextResponse.json({ availableFixes })
}

// POST - Apply quick fixes or trigger audit
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body
    const siteId = request.headers.get('x-site-id') || getDefaultSiteId()

    switch (action) {
      case 'apply-quick-fix': {
        const { fixId } = data
        let fixed = 0

        if (fixId === 'meta-titles') {
          const articles = await prisma.blogPost.findMany({
            where: { meta_title_en: null, published: true, siteId, deletedAt: null },
            select: { id: true, title_en: true },
          })
          for (const article of articles) {
            if (article.title_en) {
              await prisma.blogPost.update({
                where: { id: article.id },
                data: { meta_title_en: article.title_en.substring(0, 60) },
              })
              fixed++
            }
          }
        } else if (fixId === 'meta-descriptions') {
          const articles = await prisma.blogPost.findMany({
            where: { meta_description_en: null, published: true, siteId, deletedAt: null },
            select: { id: true, excerpt_en: true, title_en: true },
          })
          for (const article of articles) {
            const desc = article.excerpt_en || article.title_en || ''
            await prisma.blogPost.update({
              where: { id: article.id },
              data: { meta_description_en: desc.substring(0, 160) },
            })
            fixed++
          }
        }

        return NextResponse.json({
          success: true,
          message: `Applied ${fixId}: ${fixed} items fixed`,
          fixedCount: fixed,
          timestamp: new Date().toISOString(),
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[seo-command] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})
