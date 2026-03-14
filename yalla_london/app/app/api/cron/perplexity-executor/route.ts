import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUDGET_MS = 53_000

// ── Perplexity Executor Cron ──────────────────────────────────────────────────
// Processes ready PerplexityTask entries by calling the Perplexity API.
// Schedule: every 30 min at :15 and :45 past the hour (configured in vercel.json)

export async function GET(request: NextRequest) {
  return handleExecutor(request)
}

export async function POST(request: NextRequest) {
  return handleExecutor(request)
}

async function handleExecutor(request: NextRequest) {
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
    const enabled = await checkCronEnabled('perplexity-executor')
    if (!enabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Disabled by feature flag' })
    }
  } catch {
    // Feature flag system not available — proceed
  }

  try {
    // Early API key check — don't waste DB queries if key is missing
    if (!process.env.PERPLEXITY_API_KEY && !process.env.PPLX_API_KEY) {
      return NextResponse.json({ success: true, skipped: true, reason: 'PERPLEXITY_API_KEY not configured' })
    }

    const { processReadyTasks } = await import('@/lib/perplexity-computer/executor')
    const { logCronExecution } = await import('@/lib/cron-logger')

    const elapsed = () => Date.now() - start
    if (elapsed() > BUDGET_MS) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Budget exceeded before start' })
    }

    const remainingBudget = BUDGET_MS - elapsed()
    const result = await processReadyTasks(remainingBudget)

    // Log to CronJobLog
    await logCronExecution('perplexity-executor', 'completed', {
      durationMs: elapsed(),
      itemsProcessed: result.processed,
      resultSummary: { completed: result.completed, failed: result.failed, errors: result.errors.length },
    }).catch(err => console.warn('[perplexity-executor] log failed:', err instanceof Error ? err.message : err))

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: elapsed(),
    })
  } catch (err) {
    const elapsedMs = Date.now() - start
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[perplexity-executor] Error:', errMsg)

    // Graceful skip when tables don't exist (migration not run yet)
    const isTableMissing = errMsg.includes('does not exist') || errMsg.includes('P2021') || errMsg.includes('relation') || errMsg.includes('UndefinedTable')
    if (isTableMissing) {
      console.warn('[perplexity-executor] PerplexityTask/PerplexitySchedule tables not created — skipping')
      return NextResponse.json({ success: true, skipped: true, reason: 'Tables not created — run prisma migrate deploy', durationMs: elapsedMs })
    }

    // Log failure
    try {
      const { logCronExecution } = await import('@/lib/cron-logger')
      await logCronExecution('perplexity-executor', 'failed', {
        durationMs: elapsedMs,
        errorMessage: errMsg,
      }).catch(logErr => console.warn('[perplexity-executor] log failed:', logErr instanceof Error ? logErr.message : logErr))
    } catch {
      // Ignore logging failure
    }

    return NextResponse.json({ success: false, error: 'Executor failed' }, { status: 500 })
  }
}
