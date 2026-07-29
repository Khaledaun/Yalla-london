import { getDefaultSiteId } from '@/config/sites'

// ── CEO Agent Context Gatherers ─────────────────────────────────────────────────
// Read-only data the CEO Agent can access to understand the full platform state.
// Budget: 5s total, 3s per query. Graceful degradation on failure.

export interface AssistantContext {
  // Core (existing)
  recentCronLogs: Array<{ job: string; status: string; message: string; timestamp: string }>
  recentErrors: Array<{ caller: string; error: string; timestamp: string }>
  pipelineStatus: Record<string, number>
  siteConfig: Record<string, unknown>
  schemaOverview: string[]

  // CEO-level: Content & Pipeline
  contentVelocity: {
    publishedToday: number; published7d: number; published30d: number
    reservoir: number; stuck: number; activeInPipeline: number
  }

  // CEO-level: SEO / Indexing
  seoHealth: {
    indexed: number; submitted: number; errors: number
    neverSubmitted: number; indexingRate: number
    avgSeoScore: number; articlesBelow70: number
  }

  // CEO-level: Revenue
  revenueSnapshot: {
    clicks7d: number; commissions7d: number; commissions30d: number
    affiliateCoverage: number
    cjSyncHealthy: boolean
  }

  // CEO-level: Operations
  cronHealth: {
    total: number; healthy: number; failed24h: number
    overdueCrons: string[]
  }

  // CEO-level: AI Costs
  aiCosts: {
    todayUsd: number; weekUsd: number; monthUsd: number
    topProvider: string; topTask: string
  }

  // CEO-level: Cycle Health (from cycle-health API)
  cycleHealthGrade: string
  cycleHealthIssueCount: number

  // CEO-level: Perplexity Computer
  perplexityStatus: {
    tasksQueued: number; tasksRunning: number
    tasksFailed24h: number; tasksCompleted24h: number
    creditsUsed7d: number; activeSchedules: number
  }

  // CEO-level: Alerts
  activeAlerts: Array<{ severity: string; message: string; area: string }>
}

// Helper: run a query with timeout, return default on failure
async function withTimeout<T>(fn: () => Promise<T>, defaultVal: T, timeoutMs = 3000): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    return result
  } catch {
    return defaultVal
  }
}

export async function gatherContext(siteId?: string): Promise<AssistantContext> {
  const effectiveSiteId = siteId || getDefaultSiteId()
  const context: AssistantContext = {
    recentCronLogs: [],
    recentErrors: [],
    pipelineStatus: {},
    siteConfig: {},
    schemaOverview: [],
    contentVelocity: { publishedToday: 0, published7d: 0, published30d: 0, reservoir: 0, stuck: 0, activeInPipeline: 0 },
    seoHealth: { indexed: 0, submitted: 0, errors: 0, neverSubmitted: 0, indexingRate: 0, avgSeoScore: 0, articlesBelow70: 0 },
    revenueSnapshot: { clicks7d: 0, commissions7d: 0, commissions30d: 0, affiliateCoverage: 0, cjSyncHealthy: false },
    cronHealth: { total: 0, healthy: 0, failed24h: 0, overdueCrons: [] },
    aiCosts: { todayUsd: 0, weekUsd: 0, monthUsd: 0, topProvider: '', topTask: '' },
    cycleHealthGrade: '?',
    cycleHealthIssueCount: 0,
    perplexityStatus: { tasksQueued: 0, tasksRunning: 0, tasksFailed24h: 0, tasksCompleted24h: 0, creditsUsed7d: 0, activeSchedules: 0 },
    activeAlerts: [],
  }

  try {
    const { prisma } = await import('@/lib/db')
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

    // Type aliases for Prisma casting
    type PrismaAny = Record<string, unknown>
    type PrismaModel<T extends string> = Record<T, {
      findMany: (args: PrismaAny) => Promise<Array<PrismaAny>>
      count: (args?: PrismaAny) => Promise<number>
      groupBy: (args: PrismaAny) => Promise<Array<PrismaAny>>
      aggregate: (args: PrismaAny) => Promise<PrismaAny>
    }>

    const db = prisma as PrismaAny

    // Run all queries in parallel with individual timeouts
    const results = await Promise.allSettled([
      // [0] Recent cron logs
      withTimeout(async () => {
        const logs = await (db as PrismaModel<'cronJobLog'>).cronJobLog.findMany({
          where: { startedAt: { gte: oneDayAgo } },
          orderBy: { startedAt: 'desc' },
          take: 20,
          select: { jobName: true, status: true, resultSummary: true, startedAt: true },
        })
        return logs.map((l: PrismaAny) => ({
          job: String(l.jobName || ''),
          status: String(l.status || ''),
          message: String(l.resultSummary || '').substring(0, 200),
          timestamp: String(l.startedAt || ''),
        }))
      }, [] as AssistantContext['recentCronLogs']),

      // [1] Recent errors
      withTimeout(async () => {
        const errors = await (db as PrismaModel<'apiUsageLog'>).apiUsageLog.findMany({
          where: { success: false, createdAt: { gte: oneDayAgo } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { calledFrom: true, errorMessage: true, createdAt: true },
        })
        return errors.map((e: PrismaAny) => ({
          caller: String(e.calledFrom || ''),
          error: String(e.errorMessage || '').substring(0, 200),
          timestamp: String(e.createdAt || ''),
        }))
      }, [] as AssistantContext['recentErrors']),

      // [2] Pipeline status (ArticleDraft by phase)
      withTimeout(async () => {
        const drafts = await (db as PrismaModel<'articleDraft'>).articleDraft.groupBy({
          by: ['current_phase'],
          where: { site_id: effectiveSiteId },
          _count: { _all: true },
        })
        const status: Record<string, number> = {}
        for (const d of drafts) {
          const phase = String((d as PrismaAny).current_phase || 'unknown')
          const count = ((d as PrismaAny)._count as PrismaAny)?._all as number || 0
          status[phase] = count
        }
        return status
      }, {} as Record<string, number>),

      // [3] Content velocity
      withTimeout(async () => {
        const [publishedToday, published7d, published30d, reservoir, stuck] = await Promise.all([
          (db as PrismaModel<'blogPost'>).blogPost.count({ where: { siteId: effectiveSiteId, published: true, created_at: { gte: todayStart } } }),
          (db as PrismaModel<'blogPost'>).blogPost.count({ where: { siteId: effectiveSiteId, published: true, created_at: { gte: sevenDaysAgo } } }),
          (db as PrismaModel<'blogPost'>).blogPost.count({ where: { siteId: effectiveSiteId, published: true, created_at: { gte: thirtyDaysAgo } } }),
          (db as PrismaModel<'articleDraft'>).articleDraft.count({ where: { site_id: effectiveSiteId, current_phase: 'reservoir' } }),
          (db as PrismaModel<'articleDraft'>).articleDraft.count({
            where: {
              site_id: effectiveSiteId,
              current_phase: { notIn: ['reservoir', 'rejected', 'published'] },
              updated_at: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
            },
          }),
        ])
        const activeInPipeline = await (db as PrismaModel<'articleDraft'>).articleDraft.count({
          where: { site_id: effectiveSiteId, current_phase: { notIn: ['reservoir', 'rejected', 'published'] } },
        })
        return { publishedToday, published7d, published30d, reservoir, stuck, activeInPipeline }
      }, context.contentVelocity),

      // [4] SEO / Indexing health
      withTimeout(async () => {
        const statuses = await (db as PrismaModel<'uRLIndexingStatus'>).uRLIndexingStatus.groupBy({
          by: ['status'],
          where: { siteId: effectiveSiteId },
          _count: { _all: true },
        })
        let indexed = 0, submitted = 0, errors = 0, total = 0
        for (const s of statuses) {
          const st = String((s as PrismaAny).status || '')
          const cnt = ((s as PrismaAny)._count as PrismaAny)?._all as number || 0
          total += cnt
          if (st === 'indexed') indexed = cnt
          else if (st === 'submitted' || st === 'pending') submitted += cnt
          else if (st === 'error') errors = cnt
        }
        const neverSubmitted = await (db as PrismaModel<'blogPost'>).blogPost.count({
          where: { siteId: effectiveSiteId, published: true },
        }).then(async (publishedCount: number) => {
          return Math.max(0, publishedCount - total)
        })

        // Avg SEO score
        const seoAgg = await (db as PrismaModel<'blogPost'>).blogPost.aggregate({
          where: { siteId: effectiveSiteId, published: true, seo_score: { not: 0 } },
          _avg: { seo_score: true },
        })
        const avgSeoScore = Math.round(((seoAgg as PrismaAny)._avg as PrismaAny)?.seo_score as number || 0)

        const articlesBelow70 = await (db as PrismaModel<'blogPost'>).blogPost.count({
          where: { siteId: effectiveSiteId, published: true, seo_score: { lt: 70, gt: 0 } },
        })

        const indexingRate = total > 0 ? Math.round((indexed / total) * 100) : 0
        return { indexed, submitted, errors, neverSubmitted, indexingRate, avgSeoScore, articlesBelow70 }
      }, context.seoHealth),

      // [5] Revenue snapshot
      withTimeout(async () => {
        const siteFilter = { OR: [{ siteId: effectiveSiteId }, { siteId: null }] }
        const clicks7d = await (db as PrismaModel<'cjClickEvent'>).cjClickEvent.count({
          where: { ...siteFilter, createdAt: { gte: sevenDaysAgo } },
        }).catch(() => 0)
        const commAgg7d = await (db as PrismaModel<'cjCommission'>).cjCommission.aggregate({
          where: { ...siteFilter, eventDate: { gte: sevenDaysAgo } },
          _sum: { commissionAmount: true },
        }).catch(() => ({ _sum: { commissionAmount: 0 } }))
        const commAgg30d = await (db as PrismaModel<'cjCommission'>).cjCommission.aggregate({
          where: { ...siteFilter, eventDate: { gte: thirtyDaysAgo } },
          _sum: { commissionAmount: true },
        }).catch(() => ({ _sum: { commissionAmount: 0 } }))

        // Affiliate coverage: % of published articles with affiliate links
        const totalPublished = await (db as PrismaModel<'blogPost'>).blogPost.count({
          where: { siteId: effectiveSiteId, published: true },
        }).catch(() => 0)
        const withAffiliates = await (db as PrismaModel<'blogPost'>).blogPost.count({
          where: {
            siteId: effectiveSiteId,
            published: true,
            content_en: { contains: 'affiliate' },
          },
        }).catch(() => 0)

        // CJ sync health
        const lastSync = await (db as PrismaModel<'cjSyncLog'>).cjSyncLog.findMany({
          orderBy: { syncedAt: 'desc' },
          take: 1,
          select: { syncedAt: true, status: true },
        }).catch(() => [])

        const cjSyncHealthy = lastSync.length > 0 &&
          String((lastSync[0] as PrismaAny).status) === 'success' &&
          new Date(String((lastSync[0] as PrismaAny).syncedAt)).getTime() > Date.now() - 24 * 60 * 60 * 1000

        return {
          clicks7d,
          commissions7d: Number(((commAgg7d as PrismaAny)._sum as PrismaAny)?.commissionAmount || 0),
          commissions30d: Number(((commAgg30d as PrismaAny)._sum as PrismaAny)?.commissionAmount || 0),
          affiliateCoverage: totalPublished > 0 ? Math.round((withAffiliates / totalPublished) * 100) : 0,
          cjSyncHealthy,
        }
      }, context.revenueSnapshot),

      // [6] Cron health + overdue detection
      withTimeout(async () => {
        const allLogs = await (db as PrismaModel<'cronJobLog'>).cronJobLog.findMany({
          where: { startedAt: { gte: oneDayAgo } },
          select: { jobName: true, status: true, startedAt: true },
        })

        // Track latest run per cron job
        const jobLatest = new Map<string, { status: string; startedAt: Date }>()
        for (const log of allLogs) {
          const name = String((log as PrismaAny).jobName)
          const started = new Date(String((log as PrismaAny).startedAt))
          const existing = jobLatest.get(name)
          if (!existing || started > existing.startedAt) {
            jobLatest.set(name, { status: String((log as PrismaAny).status), startedAt: started })
          }
        }

        const total = jobLatest.size
        let healthy = 0, failed = 0
        const overdueCrons: string[] = []

        // Expected intervals (hours) for key crons
        const expectedIntervals: Record<string, number> = {
          'content-builder': 0.5, 'content-builder-create': 1, 'content-selector': 6,
          'seo-agent': 8, 'content-auto-fix': 12, 'content-auto-fix-lite': 6,
          'diagnostic-sweep': 2, 'perplexity-executor': 1, 'perplexity-scheduler': 2,
        }

        for (const [name, info] of jobLatest) {
          if (info.status === 'completed' || info.status === 'success') healthy++
          else if (info.status === 'failed' || info.status === 'error') failed++

          // Check overdue
          const expectedHours = expectedIntervals[name]
          if (expectedHours) {
            const hoursSinceRun = (Date.now() - info.startedAt.getTime()) / (60 * 60 * 1000)
            if (hoursSinceRun > expectedHours * 2) {
              overdueCrons.push(`${name} (last: ${Math.round(hoursSinceRun)}h ago, expected: every ${expectedHours}h)`)
            }
          }
        }

        return { total: Math.max(total, 24), healthy, failed24h: failed, overdueCrons }
      }, context.cronHealth),

      // [7] AI costs
      withTimeout(async () => {
        const [todayLogs, weekLogs, monthLogs] = await Promise.all([
          (db as PrismaModel<'apiUsageLog'>).apiUsageLog.aggregate({
            where: { createdAt: { gte: todayStart }, success: true },
            _sum: { estimatedCostUsd: true },
          }).catch(() => ({ _sum: { estimatedCostUsd: 0 } })),
          (db as PrismaModel<'apiUsageLog'>).apiUsageLog.aggregate({
            where: { createdAt: { gte: sevenDaysAgo }, success: true },
            _sum: { estimatedCostUsd: true },
          }).catch(() => ({ _sum: { estimatedCostUsd: 0 } })),
          (db as PrismaModel<'apiUsageLog'>).apiUsageLog.aggregate({
            where: { createdAt: { gte: thirtyDaysAgo }, success: true },
            _sum: { estimatedCostUsd: true },
          }).catch(() => ({ _sum: { estimatedCostUsd: 0 } })),
        ])

        // Top provider and task
        const topProviders = await (db as PrismaModel<'apiUsageLog'>).apiUsageLog.groupBy({
          by: ['provider'],
          where: { createdAt: { gte: sevenDaysAgo }, success: true },
          _sum: { estimatedCostUsd: true },
          orderBy: { _sum: { estimatedCostUsd: 'desc' } },
          take: 1,
        }).catch(() => [])
        const topTasks = await (db as PrismaModel<'apiUsageLog'>).apiUsageLog.groupBy({
          by: ['taskType'],
          where: { createdAt: { gte: sevenDaysAgo }, success: true },
          _sum: { estimatedCostUsd: true },
          orderBy: { _sum: { estimatedCostUsd: 'desc' } },
          take: 1,
        }).catch(() => [])

        return {
          todayUsd: Number(((todayLogs as PrismaAny)._sum as PrismaAny)?.estimatedCostUsd || 0),
          weekUsd: Number(((weekLogs as PrismaAny)._sum as PrismaAny)?.estimatedCostUsd || 0),
          monthUsd: Number(((monthLogs as PrismaAny)._sum as PrismaAny)?.estimatedCostUsd || 0),
          topProvider: topProviders.length > 0 ? String((topProviders[0] as PrismaAny).provider || '') : '',
          topTask: topTasks.length > 0 ? String((topTasks[0] as PrismaAny).taskType || '') : '',
        }
      }, context.aiCosts),

      // [8] Perplexity Computer status
      withTimeout(async () => {
        const { getContextData } = await import('@/lib/perplexity-computer')
        return await getContextData()
      }, context.perplexityStatus),
    ])

    // Assign results
    if (results[0].status === 'fulfilled') context.recentCronLogs = results[0].value
    if (results[1].status === 'fulfilled') context.recentErrors = results[1].value
    if (results[2].status === 'fulfilled') context.pipelineStatus = results[2].value
    if (results[3].status === 'fulfilled') context.contentVelocity = results[3].value
    if (results[4].status === 'fulfilled') context.seoHealth = results[4].value
    if (results[5].status === 'fulfilled') context.revenueSnapshot = results[5].value
    if (results[6].status === 'fulfilled') context.cronHealth = results[6].value
    if (results[7].status === 'fulfilled') context.aiCosts = results[7].value
    if (results[8].status === 'fulfilled') context.perplexityStatus = results[8].value

    // Compute cycle health grade from gathered data
    try {
      let score = 100
      // Pipeline health
      if (context.contentVelocity.stuck > 5) score -= 15
      else if (context.contentVelocity.stuck > 0) score -= 5
      if (context.contentVelocity.publishedToday === 0 && context.contentVelocity.reservoir === 0) score -= 10
      // SEO health
      if (context.seoHealth.indexingRate < 50) score -= 15
      else if (context.seoHealth.indexingRate < 70) score -= 5
      if (context.seoHealth.errors > 10) score -= 10
      else if (context.seoHealth.errors > 5) score -= 5
      // Operations health
      if (context.cronHealth.failed24h > 5) score -= 15
      else if (context.cronHealth.failed24h > 2) score -= 5
      if (context.cronHealth.overdueCrons.length > 3) score -= 10
      else if (context.cronHealth.overdueCrons.length > 0) score -= 5
      // Revenue health
      if (!context.revenueSnapshot.cjSyncHealthy) score -= 5
      if (context.revenueSnapshot.affiliateCoverage < 30) score -= 5
      // Alerts penalty
      const criticalAlerts = context.activeAlerts.filter(a => a.severity === 'critical').length
      score -= criticalAlerts * 5

      score = Math.max(0, Math.min(100, score))
      context.cycleHealthGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
      context.cycleHealthIssueCount = context.activeAlerts.length + context.cronHealth.overdueCrons.length
    } catch {
      console.warn('[assistant-context] Failed to compute cycle health grade')
    }

    // Site config
    try {
      const { getSiteConfig } = await import('@/config/sites')
      const config = getSiteConfig(effectiveSiteId)
      context.siteConfig = {
        id: config?.id,
        name: config?.name,
        domain: config?.domain,
        locale: config?.locale,
        status: config?.status,
      }
    } catch {
      console.warn('[assistant-context] Failed to load site config')
    }

    // Schema overview
    context.schemaOverview = [
      'BlogPost', 'ArticleDraft', 'TopicProposal', 'CronJobLog', 'ApiUsageLog',
      'ScheduledContent', 'AffiliateLink', 'URLIndexingStatus', 'SeoAuditReport',
      'FeatureFlag', 'ModelProvider', 'ModelRoute', 'User', 'AuditLog',
      'CjCommission', 'CjClickEvent', 'CjAdvertiser', 'CjLink', 'CjOffer',
      'Yacht', 'CharterInquiry', 'SiteSettings', 'AutoFixLog', 'TeamMember',
      'PerplexityTask', 'PerplexitySchedule',
    ]

    // Generate alerts from gathered data
    context.activeAlerts = generateAlerts(context)

  } catch (err) {
    console.warn('[assistant-context] Error gathering context:', err instanceof Error ? err.message : err)
  }

  return context
}

function generateAlerts(ctx: AssistantContext): AssistantContext['activeAlerts'] {
  const alerts: AssistantContext['activeAlerts'] = []

  // Pipeline alerts
  if (ctx.contentVelocity.stuck > 0) {
    alerts.push({ severity: 'warning', message: `${ctx.contentVelocity.stuck} drafts stuck in pipeline (>4h same phase)`, area: 'pipeline' })
  }
  if (ctx.contentVelocity.publishedToday === 0 && ctx.contentVelocity.reservoir === 0) {
    alerts.push({ severity: 'warning', message: 'No articles published today and reservoir is empty', area: 'content' })
  }

  // SEO alerts
  if (ctx.seoHealth.errors > 5) {
    alerts.push({ severity: 'critical', message: `${ctx.seoHealth.errors} indexing errors — pages failing to submit`, area: 'seo' })
  }
  if (ctx.seoHealth.neverSubmitted > 20) {
    alerts.push({ severity: 'warning', message: `${ctx.seoHealth.neverSubmitted} published pages never submitted to search engines`, area: 'seo' })
  }
  if (ctx.seoHealth.avgSeoScore > 0 && ctx.seoHealth.avgSeoScore < 70) {
    alerts.push({ severity: 'warning', message: `Average SEO score is ${ctx.seoHealth.avgSeoScore} (target: 70+)`, area: 'seo' })
  }

  // Revenue alerts
  if (!ctx.revenueSnapshot.cjSyncHealthy) {
    alerts.push({ severity: 'warning', message: 'CJ affiliate sync is unhealthy — revenue tracking may be stale', area: 'revenue' })
  }
  if (ctx.revenueSnapshot.affiliateCoverage < 50) {
    alerts.push({ severity: 'info', message: `Affiliate coverage is ${ctx.revenueSnapshot.affiliateCoverage}% — target 80%+`, area: 'revenue' })
  }

  // Cron alerts
  if (ctx.cronHealth.failed24h > 3) {
    alerts.push({ severity: 'critical', message: `${ctx.cronHealth.failed24h} cron failures in 24h`, area: 'operations' })
  }

  // Perplexity alerts
  if (ctx.perplexityStatus.tasksFailed24h > 2) {
    alerts.push({ severity: 'warning', message: `${ctx.perplexityStatus.tasksFailed24h} Perplexity tasks failed in 24h`, area: 'perplexity' })
  }
  if (ctx.perplexityStatus.tasksQueued > 20) {
    alerts.push({ severity: 'info', message: `${ctx.perplexityStatus.tasksQueued} Perplexity tasks queued — check credit budget`, area: 'perplexity' })
  }

  // Error alerts
  if (ctx.recentErrors.length > 5) {
    alerts.push({ severity: 'warning', message: `${ctx.recentErrors.length} API errors in 24h`, area: 'operations' })
  }

  // Health grade alert
  if (ctx.cycleHealthGrade === 'D' || ctx.cycleHealthGrade === 'F') {
    alerts.push({ severity: 'critical', message: `Platform health grade is ${ctx.cycleHealthGrade} — immediate attention needed`, area: 'operations' })
  }

  // Overdue crons alert
  if (ctx.cronHealth.overdueCrons.length > 0) {
    alerts.push({ severity: 'warning', message: `${ctx.cronHealth.overdueCrons.length} overdue cron(s): ${ctx.cronHealth.overdueCrons.slice(0, 3).map(c => c.split(' (')[0]).join(', ')}`, area: 'operations' })
  }

  return alerts
}

export function formatContextForPrompt(ctx: AssistantContext): string {
  const now = new Date().toISOString().split('T')[0]
  let text = `## Live Platform Data (as of ${now})\n\n`

  // Site info
  if (Object.keys(ctx.siteConfig).length > 0) {
    text += `**Site:** ${ctx.siteConfig.name} (${ctx.siteConfig.id}) — ${ctx.siteConfig.domain}\n\n`
  }

  // Content Pipeline
  text += '### Content Pipeline\n'
  text += `- Published: ${ctx.contentVelocity.publishedToday} today, ${ctx.contentVelocity.published7d} this week, ${ctx.contentVelocity.published30d} this month\n`
  text += `- Active pipeline: ${ctx.contentVelocity.activeInPipeline} drafts`
  if (Object.keys(ctx.pipelineStatus).length > 0) {
    const phases = Object.entries(ctx.pipelineStatus).map(([p, c]) => `${c} ${p}`).join(', ')
    text += ` (${phases})`
  }
  text += '\n'
  text += `- Reservoir: ${ctx.contentVelocity.reservoir} ready to publish | Stuck: ${ctx.contentVelocity.stuck} (>4h)\n\n`

  // SEO & Indexing
  text += '### SEO & Indexing\n'
  const totalTracked = ctx.seoHealth.indexed + ctx.seoHealth.submitted + ctx.seoHealth.errors
  text += `- Indexed: ${ctx.seoHealth.indexed}/${totalTracked > 0 ? totalTracked : '?'} (${ctx.seoHealth.indexingRate}%)`
  text += ` | Submitted: ${ctx.seoHealth.submitted} pending | Errors: ${ctx.seoHealth.errors}\n`
  if (ctx.seoHealth.neverSubmitted > 0) {
    text += `- Never submitted: ${ctx.seoHealth.neverSubmitted} pages\n`
  }
  if (ctx.seoHealth.avgSeoScore > 0) {
    text += `- Avg SEO score: ${ctx.seoHealth.avgSeoScore} | Below 70: ${ctx.seoHealth.articlesBelow70} articles\n`
  }
  text += '\n'

  // Revenue
  text += '### Revenue\n'
  text += `- Clicks: ${ctx.revenueSnapshot.clicks7d} (7d) | Commissions: $${ctx.revenueSnapshot.commissions7d.toFixed(2)} (7d) / $${ctx.revenueSnapshot.commissions30d.toFixed(2)} (30d)\n`
  text += `- Affiliate coverage: ${ctx.revenueSnapshot.affiliateCoverage}%`
  text += ` | CJ sync: ${ctx.revenueSnapshot.cjSyncHealthy ? 'healthy' : 'UNHEALTHY'}\n\n`

  // Platform Health
  text += '### Platform Health\n'
  text += `- Grade: ${ctx.cycleHealthGrade} | Issues: ${ctx.cycleHealthIssueCount}\n`
  if (ctx.cronHealth.overdueCrons.length > 0) {
    text += `- Overdue crons: ${ctx.cronHealth.overdueCrons.join('; ')}\n`
  }
  text += '\n'

  // Operations
  text += '### Operations\n'
  text += `- Crons: ${ctx.cronHealth.healthy}/${ctx.cronHealth.total} healthy | Failed 24h: ${ctx.cronHealth.failed24h}\n`
  text += `- AI costs: $${ctx.aiCosts.todayUsd.toFixed(2)} today / $${ctx.aiCosts.weekUsd.toFixed(2)} week / $${ctx.aiCosts.monthUsd.toFixed(2)} month`
  if (ctx.aiCosts.topProvider) text += ` (top: ${ctx.aiCosts.topProvider}, task: ${ctx.aiCosts.topTask})`
  text += '\n\n'

  // Perplexity Computer
  const px = ctx.perplexityStatus
  if (px.tasksQueued > 0 || px.tasksRunning > 0 || px.tasksCompleted24h > 0 || px.tasksFailed24h > 0) {
    text += '### Perplexity Computer\n'
    text += `- Queued: ${px.tasksQueued} | Running: ${px.tasksRunning} | Completed 24h: ${px.tasksCompleted24h} | Failed 24h: ${px.tasksFailed24h}\n`
    text += `- Credits used 7d: ${px.creditsUsed7d} | Active schedules: ${px.activeSchedules}\n\n`
  }

  // Cron logs (last 5)
  if (ctx.recentCronLogs.length > 0) {
    text += '### Recent Cron Activity\n'
    for (const log of ctx.recentCronLogs.slice(0, 5)) {
      text += `- [${log.status}] ${log.job}: ${log.message}\n`
    }
    text += '\n'
  }

  // Errors
  if (ctx.recentErrors.length > 0) {
    text += '### Recent Errors\n'
    for (const err of ctx.recentErrors.slice(0, 3)) {
      text += `- ${err.caller}: ${err.error}\n`
    }
    text += '\n'
  }

  // Alerts
  if (ctx.activeAlerts.length > 0) {
    text += '### Active Alerts\n'
    for (const alert of ctx.activeAlerts) {
      const icon = alert.severity === 'critical' ? 'CRITICAL' : alert.severity === 'warning' ? 'WARNING' : 'INFO'
      text += `- [${icon}] ${alert.message}\n`
    }
    text += '\n'
  }

  text += `### Schema Models: ${ctx.schemaOverview.join(', ')}\n`

  return text
}
