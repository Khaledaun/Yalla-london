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
    const { processDueSchedules } = await import('@/lib/perplexity-computer')
    const { logCronExecution } = await import('@/lib/cron-logger')

    const elapsed = () => Date.now() - start
    if (elapsed() > BUDGET_MS) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Budget exceeded before start' })
    }

    const result = await processDueSchedules()

    // Log to CronJobLog
    await logCronExecution('perplexity-scheduler', 'completed', {
      durationMs: elapsed(),
      itemsProcessed: result.created,
      resultSummary: { created: result.created, errors: result.errors },
    }).catch(err => console.warn('[perplexity-scheduler] log failed:', err instanceof Error ? err.message : err))

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: elapsed(),
    })
  } catch (err) {
    const elapsedMs = Date.now() - start
    console.error('[perplexity-scheduler] Error:', err instanceof Error ? err.message : err)

    // Log failure
    try {
      const { logCronExecution } = await import('@/lib/cron-logger')
      await logCronExecution('perplexity-scheduler', 'failed', {
        durationMs: elapsedMs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }).catch(() => {})
    } catch {
      // Ignore logging failure
    }

    return NextResponse.json({ success: false, error: 'Scheduler failed' }, { status: 500 })
  }
}
