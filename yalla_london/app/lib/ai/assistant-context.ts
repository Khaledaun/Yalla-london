import { getDefaultSiteId } from '@/config/sites'

// ── Assistant Context Gatherers ─────────────────────────────────────────────────
// Read-only data the coding assistant can access to understand the platform state.

export interface AssistantContext {
  recentCronLogs: Array<{ job: string; status: string; message: string; timestamp: string }>
  recentErrors: Array<{ caller: string; error: string; timestamp: string }>
  pipelineStatus: Record<string, number>
  siteConfig: Record<string, unknown>
  schemaOverview: string[]
}

export async function gatherContext(siteId?: string): Promise<AssistantContext> {
  const effectiveSiteId = siteId || getDefaultSiteId()
  const context: AssistantContext = {
    recentCronLogs: [],
    recentErrors: [],
    pipelineStatus: {},
    siteConfig: {},
    schemaOverview: [],
  }

  try {
    const { prisma } = await import('@/lib/db')

    // Recent cron logs (last 24h)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const logs = await (prisma as Record<string, unknown> as {
        cronJobLog: { findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> }
      }).cronJobLog.findMany({
        where: { startedAt: { gte: oneDayAgo } },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: { jobName: true, status: true, resultSummary: true, startedAt: true },
      })
      context.recentCronLogs = logs.map((l: Record<string, unknown>) => ({
        job: String(l.jobName || ''),
        status: String(l.status || ''),
        message: String(l.resultSummary || '').substring(0, 200),
        timestamp: String(l.startedAt || ''),
      }))
    } catch {
      // CronJobLog may not exist
    }

    // Recent errors (from ApiUsageLog where success=false)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const errors = await (prisma as Record<string, unknown> as {
        apiUsageLog: { findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> }
      }).apiUsageLog.findMany({
        where: { success: false, createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { calledFrom: true, errorMessage: true, createdAt: true },
      })
      context.recentErrors = errors.map((e: Record<string, unknown>) => ({
        caller: String(e.calledFrom || ''),
        error: String(e.errorMessage || '').substring(0, 200),
        timestamp: String(e.createdAt || ''),
      }))
    } catch {
      // ApiUsageLog may not exist
    }

    // Pipeline status (ArticleDraft counts by phase)
    try {
      const drafts = await (prisma as Record<string, unknown> as {
        articleDraft: { groupBy: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> }
      }).articleDraft.groupBy({
        by: ['current_phase'],
        where: { site_id: effectiveSiteId },
        _count: { _all: true },
      })
      for (const d of drafts) {
        const phase = String((d as Record<string, unknown>).current_phase || 'unknown')
        const count = ((d as Record<string, unknown>)._count as Record<string, unknown>)?._all as number || 0
        context.pipelineStatus[phase] = count
      }
    } catch {
      // ArticleDraft may not exist
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
      // config may fail
    }

    // Schema overview (model names)
    context.schemaOverview = [
      'BlogPost', 'ArticleDraft', 'TopicProposal', 'CronJobLog', 'ApiUsageLog',
      'ScheduledContent', 'AffiliateLink', 'URLIndexingStatus', 'SeoAuditReport',
      'FeatureFlag', 'ModelProvider', 'ModelRoute', 'User', 'AuditLog',
    ]

  } catch (err) {
    console.warn('[assistant-context] Error gathering context:', err instanceof Error ? err.message : err)
  }

  return context
}

export function formatContextForPrompt(ctx: AssistantContext): string {
  let text = '## Platform Context\n\n'

  if (Object.keys(ctx.siteConfig).length > 0) {
    text += `### Site: ${ctx.siteConfig.name} (${ctx.siteConfig.id})\n`
    text += `Domain: ${ctx.siteConfig.domain}, Active: ${ctx.siteConfig.isActive}\n\n`
  }

  if (Object.keys(ctx.pipelineStatus).length > 0) {
    text += '### Pipeline Status\n'
    for (const [phase, count] of Object.entries(ctx.pipelineStatus)) {
      text += `- ${phase}: ${count} drafts\n`
    }
    text += '\n'
  }

  if (ctx.recentCronLogs.length > 0) {
    text += '### Recent Cron Logs (last 24h)\n'
    for (const log of ctx.recentCronLogs.slice(0, 10)) {
      text += `- [${log.status}] ${log.job}: ${log.message}\n`
    }
    text += '\n'
  }

  if (ctx.recentErrors.length > 0) {
    text += '### Recent Errors\n'
    for (const err of ctx.recentErrors.slice(0, 5)) {
      text += `- ${err.caller}: ${err.error}\n`
    }
    text += '\n'
  }

  text += `### Schema Models: ${ctx.schemaOverview.join(', ')}\n`

  return text
}
