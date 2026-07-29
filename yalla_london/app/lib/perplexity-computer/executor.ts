// ── Perplexity Computer Task Executor ─────────────────────────────────────────
// The missing bridge: connects task DB records to the Perplexity API.
// Reuses queryPerplexity() + logPerplexityUsage() from lib/ai/perplexity.ts
// and task CRUD from ./task-manager.ts.

import type { TaskCategory } from './types'

type PrismaAny = Record<string, unknown>

// ── Category-specific system prompts ─────────────────────────────────────────

const CATEGORY_PROMPTS: Record<TaskCategory, string> = {
  registration: 'You are a registration and form-filling assistant. Find exact URLs, form fields, and step-by-step instructions for affiliate program signups, directory submissions, and platform registrations.',
  email: 'You are an email marketing specialist. Analyze email deliverability, subject line performance, list building strategies, and campaign optimization for luxury travel brands.',
  social: 'You are a social media strategist for luxury travel brands. Analyze platform algorithms, content formats, posting schedules, and engagement strategies for high-net-worth audiences.',
  seo: 'You are an advanced SEO/AIO/GEO analyst. Provide technical SEO audits, keyword gap analysis, competitor backlink analysis, and AI search optimization strategies with citations.',
  development: 'You are a senior web development consultant. Analyze code patterns, API integrations, performance bottlenecks, and suggest specific implementation improvements.',
  design: 'You are a UX/UI design reviewer for luxury travel websites. Evaluate visual hierarchy, mobile usability, conversion design patterns, and brand consistency.',
  content: 'You are a content quality auditor for luxury travel. Analyze content depth, E-E-A-T signals, first-hand experience markers, factual accuracy, and competitive positioning.',
  intelligence: 'You are a business intelligence analyst for the luxury travel industry. Provide market size data, competitor revenue estimates, partnership opportunities, and trend analysis with sources.',
  'ai-monitoring': 'You are an AI industry analyst tracking how AI search engines cite and recommend travel content. Monitor AI Overviews, Perplexity citations, ChatGPT recommendations, and generative search trends.',
  strategy: 'You are a tourism media strategist. Analyze content monetization models, affiliate program economics, audience growth strategies, and multi-site portfolio optimization.',
}

// ── Execute a single task ────────────────────────────────────────────────────

export async function executeTask(
  taskId: string,
  budgetMs: number = 45_000
): Promise<{ success: boolean; taskId: string; error?: string }> {
  const { getTask, updateTaskStatus, retryTask } = await import('./task-manager')
  const { queryPerplexity, logPerplexityUsage } = await import('@/lib/ai/perplexity')

  const task = await getTask(taskId) as PrismaAny | null
  if (!task) return { success: false, taskId, error: 'Task not found' }

  const status = String(task.status)
  if (status !== 'ready' && status !== 'queued') {
    return { success: false, taskId, error: `Task status is "${status}", expected "ready" or "queued"` }
  }

  // Mark as running
  await updateTaskStatus(taskId, 'running')

  const startTime = Date.now()
  const category = String(task.category) as TaskCategory
  const priority = String(task.priority || 'medium')
  const prompt = String(task.prompt || '')
  const siteId = task.siteId ? String(task.siteId) : 'platform'

  // Build system prompt from category
  const systemPrompt = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.intelligence

  // Model selection: sonar-pro for critical/high, sonar for medium/low
  const model: 'sonar-pro' | 'sonar' = (priority === 'critical' || priority === 'high') ? 'sonar-pro' : 'sonar'

  // Timeout: respect budget, cap at 50s
  const timeoutMs = Math.min(budgetMs, 50_000)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let result: Awaited<ReturnType<typeof queryPerplexity>>
    try {
      result = await queryPerplexity(systemPrompt, prompt, { model, maxTokens: 4096 })
    } finally {
      clearTimeout(timer)
    }

    const durationMs = Date.now() - startTime

    // Build summary (first 500 chars of content)
    const resultSummary = result.content.substring(0, 500) + (result.content.length > 500 ? '...' : '')

    // Estimate credits from tokens
    const actualCredits = Math.ceil(result.usage.totalTokens / 1000)

    // Mark completed
    await updateTaskStatus(taskId, 'completed', {
      resultSummary,
      resultData: {
        content: result.content,
        citations: result.citations,
        usage: result.usage,
        model: result.model,
        durationMs,
      },
      actualCredits,
    })

    // Log cost
    await logPerplexityUsage(
      result.usage,
      siteId,
      `perplexity-task:${category}`,
      'perplexity-computer/executor',
      true
    )

    return { success: true, taskId }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - startTime

    // Mark failed
    await updateTaskStatus(taskId, 'failed', { errorMessage })

    // Log cost even on failure (tokens may have been consumed)
    await logPerplexityUsage(
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      siteId,
      `perplexity-task:${category}`,
      'perplexity-computer/executor',
      false,
      errorMessage
    ).catch(() => {})

    // Auto-retry if under cap
    try {
      const retryCount = (task.retryCount as number) || 0
      const maxRetries = (task.maxRetries as number) || 2
      if (retryCount < maxRetries) {
        await retryTask(taskId)
        console.warn(`[perplexity-executor] Task ${taskId} failed (${durationMs}ms), queued retry ${retryCount + 1}/${maxRetries}: ${errorMessage}`)
      } else {
        console.warn(`[perplexity-executor] Task ${taskId} failed permanently (${durationMs}ms, ${retryCount}/${maxRetries} retries): ${errorMessage}`)
      }
    } catch (retryErr) {
      console.warn('[perplexity-executor] Auto-retry failed:', retryErr instanceof Error ? retryErr.message : retryErr)
    }

    return { success: false, taskId, error: errorMessage }
  }
}

// ── Process batch of ready tasks ─────────────────────────────────────────────

export async function processReadyTasks(
  budgetMs: number = 53_000
): Promise<{ processed: number; completed: number; failed: number; errors: string[] }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny
  const start = Date.now()

  const model = db as { perplexityTask: {
    findMany: (a: PrismaAny) => Promise<PrismaAny[]>
  } }

  // Find up to 5 ready tasks, highest priority first
  const readyTasks = await model.perplexityTask.findMany({
    where: { status: { in: ['ready'] } },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
    take: 5,
    select: { id: true, title: true, priority: true },
  })

  if (readyTasks.length === 0) {
    return { processed: 0, completed: 0, failed: 0, errors: [] }
  }

  let completed = 0
  let failed = 0
  const errors: string[] = []

  for (const task of readyTasks) {
    const elapsed = Date.now() - start
    const remaining = budgetMs - elapsed

    // Budget guard: need at least 10s for a task
    if (remaining < 10_000) {
      console.warn(`[perplexity-executor] Budget exhausted (${elapsed}ms/${budgetMs}ms), ${readyTasks.length - completed - failed} tasks skipped`)
      break
    }

    const taskId = String(task.id)
    const result = await executeTask(taskId, remaining - 2000) // 2s buffer

    if (result.success) {
      completed++
    } else {
      failed++
      errors.push(`${taskId}: ${result.error}`)
    }

    // Rate limit: 2s between calls (Perplexity courtesy)
    const postElapsed = Date.now() - start
    if (postElapsed < budgetMs - 5000) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  return { processed: completed + failed, completed, failed, errors }
}
