import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUDGET_MS = 53_000

// ── Perplexity Scheduler Cron ─────────────────────────────────────────────────
// Processes due PerplexitySchedule entries, creating new PerplexityTask for each.
// Schedule: every 2 hours (configured in vercel.json)

export async function GET(request: NextRequest) {
  return handleScheduler(request)
}

export async function POST(request: NextRequest) {
  return handleScheduler(request)
}

async function handleScheduler(request: NextRequest) {
  const start = Date.now()

  // Standard CRON_SECRET auth: allow if unset, reject only if set and doesn't match
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const querySecret = new URL(request.url).searchParams.get('secret')
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Feature flag guard
  try {
    const { checkCronEnabled } = await import('@/lib/cron-feature-guard')
    const enabled = await checkCronEnabled('perplexity-scheduler')
    if (!enabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Disabled by feature flag' })
    }
  } catch {
    // Feature flag system not available — proceed
  }

  try {
    const { processDueSchedules, listSchedules, createSchedule, TASK_TEMPLATES } = await import('@/lib/perplexity-computer')
    const { logCronExecution } = await import('@/lib/cron-logger')

    const elapsed = () => Date.now() - start
    if (elapsed() > BUDGET_MS) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Budget exceeded before start' })
    }

    // Auto-seed: if no schedules exist, seed recommended templates (launch-and-forget)
    let seeded = 0
    try {
      const existing = await listSchedules()
      if (existing.length === 0) {
        const scheduledTemplates = TASK_TEMPLATES.filter(t => t.schedule)
        for (const template of scheduledTemplates) {
          if (elapsed() > BUDGET_MS - 5000) break // Leave 5s buffer
          try {
            await createSchedule({
              category: template.category,
              taskType: template.taskType,
              title: template.title,
              promptTemplate: template.promptTemplate,
              cronExpression: template.schedule!,
              siteId: 'yalla-london',
              priority: template.priority,
              estimatedCredits: template.estimatedCredits,
              tags: [...template.tags, `template:${template.id}`, 'auto-seeded'],
              metadata: { templateId: template.id, autoSeeded: true },
            })
            seeded++
          } catch (seedErr) {
            console.warn('[perplexity-scheduler] Failed to seed template:', template.id, seedErr instanceof Error ? seedErr.message : seedErr)
          }
        }
        if (seeded > 0) {
          console.log(`[perplexity-scheduler] Auto-seeded ${seeded} recommended schedules`)
        }
      }
    } catch (seedCheckErr) {
      console.warn('[perplexity-scheduler] Auto-seed check failed:', seedCheckErr instanceof Error ? seedCheckErr.message : seedCheckErr)
    }

    const result = await processDueSchedules()

    // Log to CronJobLog
    await logCronExecution('perplexity-scheduler', 'completed', {
      durationMs: elapsed(),
      itemsProcessed: result.created + seeded,
      resultSummary: { created: result.created, seeded, errors: result.errors },
    }).catch(err => console.warn('[perplexity-scheduler] log failed:', err instanceof Error ? err.message : err))

    return NextResponse.json({
      success: true,
      ...result,
      seeded,
      durationMs: elapsed(),
    })
  } catch (err) {
    const elapsedMs = Date.now() - start
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[perplexity-scheduler] Error:', errMsg)

    // Graceful skip when tables don't exist (migration not run yet)
    const isTableMissing = errMsg.includes('does not exist') || errMsg.includes('P2021') || errMsg.includes('relation') || errMsg.includes('UndefinedTable')
    if (isTableMissing) {
      console.warn('[perplexity-scheduler] PerplexityTask/PerplexitySchedule tables not created — skipping')
      return NextResponse.json({ success: true, skipped: true, reason: 'Tables not created — run prisma migrate deploy', durationMs: elapsedMs })
    }

    // Log failure
    try {
      const { logCronExecution } = await import('@/lib/cron-logger')
      await logCronExecution('perplexity-scheduler', 'failed', {
        durationMs: elapsedMs,
        errorMessage: errMsg,
      }).catch(logErr => console.warn('[perplexity-scheduler] log failed:', logErr instanceof Error ? logErr.message : logErr))
    } catch {
      // Ignore logging failure
    }

    return NextResponse.json({ success: false, error: 'Scheduler failed' }, { status: 500 })
  }
}
