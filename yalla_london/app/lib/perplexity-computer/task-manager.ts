// ── Perplexity Computer Task Manager ─────────────────────────────────────────
// CRUD operations for task lifecycle, scheduling, and result tracking.
// All operations are DB-backed via Prisma. No external API calls here.

import type {
  TaskCreateInput,
  TaskCategory,
  TaskStatus,
  PerplexityDashboardData,
  PerplexityContextData,
} from './types'

type PrismaAny = Record<string, unknown>

// ── Task CRUD ────────────────────────────────────────────────────────────────

export async function createTask(input: TaskCreateInput): Promise<{ id: string; title: string }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  const task = await (db as { perplexityTask: { create: (a: PrismaAny) => Promise<PrismaAny> } }).perplexityTask.create({
    data: {
      siteId: input.siteId || null,
      category: input.category,
      taskType: input.taskType,
      title: input.title,
      prompt: input.prompt,
      priority: input.priority || 'medium',
      status: input.scheduledFor ? 'queued' : 'ready',
      scheduledFor: input.scheduledFor || null,
      parentTaskId: input.parentTaskId || null,
      tags: input.tags || [],
      estimatedCredits: input.estimatedCredits || 10,
      metadata: input.metadata || {},
    },
  })

  return { id: String(task.id), title: String(task.title) }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  data?: { resultSummary?: string; resultData?: PrismaAny; errorMessage?: string; actualCredits?: number }
): Promise<void> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  const updateData: PrismaAny = { status }
  if (status === 'running') updateData.startedAt = new Date()
  if (status === 'completed' || status === 'failed') updateData.completedAt = new Date()
  if (data?.resultSummary) updateData.resultSummary = data.resultSummary
  if (data?.resultData) updateData.resultData = data.resultData
  if (data?.errorMessage) updateData.errorMessage = data.errorMessage
  if (data?.actualCredits !== undefined) updateData.actualCredits = data.actualCredits

  await (db as { perplexityTask: { update: (a: PrismaAny) => Promise<PrismaAny> } }).perplexityTask.update({
    where: { id: taskId },
    data: updateData,
  })
}

export async function getTask(taskId: string): Promise<PrismaAny | null> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  return (db as { perplexityTask: { findUnique: (a: PrismaAny) => Promise<PrismaAny | null> } }).perplexityTask.findUnique({
    where: { id: taskId },
    include: { subtasks: true, schedule: true },
  })
}

export async function listTasks(filters: {
  status?: TaskStatus | 'all'
  category?: TaskCategory
  siteId?: string
  limit?: number
  offset?: number
}): Promise<{ tasks: PrismaAny[]; total: number }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  const where: PrismaAny = {}
  if (filters.status && filters.status !== 'all') where.status = filters.status
  if (filters.category) where.category = filters.category
  if (filters.siteId) where.siteId = filters.siteId

  const model = db as { perplexityTask: {
    findMany: (a: PrismaAny) => Promise<PrismaAny[]>
    count: (a: PrismaAny) => Promise<number>
  } }

  const [tasks, total] = await Promise.all([
    model.perplexityTask.findMany({
      where,
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    }),
    model.perplexityTask.count({ where }),
  ])

  return { tasks, total }
}

export async function cancelTask(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, 'cancelled', { errorMessage: 'Cancelled by user' })
}

export async function retryTask(taskId: string): Promise<{ id: string }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny
  const model = db as { perplexityTask: {
    findUnique: (a: PrismaAny) => Promise<PrismaAny | null>
    update: (a: PrismaAny) => Promise<PrismaAny>
  } }

  const task = await model.perplexityTask.findUnique({ where: { id: taskId } })
  if (!task) throw new Error('Task not found')

  const retryCount = (task.retryCount as number) || 0
  const maxRetries = (task.maxRetries as number) || 2

  if (retryCount >= maxRetries) {
    throw new Error(`Max retries (${maxRetries}) exceeded`)
  }

  await model.perplexityTask.update({
    where: { id: taskId },
    data: {
      status: 'ready',
      retryCount: retryCount + 1,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    },
  })

  return { id: taskId }
}

// ── Schedule CRUD ────────────────────────────────────────────────────────────

export async function createSchedule(input: {
  category: string
  taskType: string
  title: string
  promptTemplate: string
  cronExpression: string
  siteId?: string
  priority?: string
  estimatedCredits?: number
  tags?: string[]
  metadata?: PrismaAny
}): Promise<{ id: string }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  const nextRun = computeNextRun(input.cronExpression)

  const schedule = await (db as { perplexitySchedule: { create: (a: PrismaAny) => Promise<PrismaAny> } }).perplexitySchedule.create({
    data: {
      siteId: input.siteId || null,
      category: input.category,
      taskType: input.taskType,
      title: input.title,
      promptTemplate: input.promptTemplate,
      cronExpression: input.cronExpression,
      priority: input.priority || 'medium',
      estimatedCredits: input.estimatedCredits || 10,
      tags: input.tags || [],
      nextRunAt: nextRun,
      metadata: input.metadata || {},
    },
  })

  return { id: String(schedule.id) }
}

export async function toggleSchedule(scheduleId: string, enabled: boolean): Promise<void> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  await (db as { perplexitySchedule: { update: (a: PrismaAny) => Promise<PrismaAny> } }).perplexitySchedule.update({
    where: { id: scheduleId },
    data: { enabled },
  })
}

export async function listSchedules(): Promise<PrismaAny[]> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny

  return (db as { perplexitySchedule: { findMany: (a: PrismaAny) => Promise<PrismaAny[]> } }).perplexitySchedule.findMany({
    orderBy: { nextRunAt: 'asc' },
  })
}

// ── Process due schedules (called by cron) ───────────────────────────────────

export async function processDueSchedules(): Promise<{ created: number; errors: string[] }> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny
  const now = new Date()

  const model = db as { perplexitySchedule: {
    findMany: (a: PrismaAny) => Promise<PrismaAny[]>
    update: (a: PrismaAny) => Promise<PrismaAny>
  } }

  const dueSchedules = await model.perplexitySchedule.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
    },
    take: 20,
  })

  let created = 0
  const errors: string[] = []

  for (const schedule of dueSchedules) {
    try {
      await createTask({
        category: String(schedule.category) as TaskCategory,
        taskType: String(schedule.taskType),
        title: `[Scheduled] ${schedule.title}`,
        prompt: String(schedule.promptTemplate),
        siteId: schedule.siteId ? String(schedule.siteId) : undefined,
        priority: (schedule.priority as TaskCreateInput['priority']) || 'medium',
        estimatedCredits: (schedule.estimatedCredits as number) || 10,
        tags: (schedule.tags as string[]) || [],
        metadata: { scheduleId: schedule.id },
      })

      const nextRun = computeNextRun(String(schedule.cronExpression))
      await model.perplexitySchedule.update({
        where: { id: String(schedule.id) },
        data: {
          lastRunAt: now,
          nextRunAt: nextRun,
          runCount: { increment: 1 },
        },
      })

      created++
    } catch (err) {
      errors.push(`Schedule ${schedule.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { created, errors }
}

// ── Dashboard Data ───────────────────────────────────────────────────────────

export async function getDashboardData(siteId?: string): Promise<PerplexityDashboardData> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const model = db as { perplexityTask: {
    count: (a: PrismaAny) => Promise<number>
    findMany: (a: PrismaAny) => Promise<PrismaAny[]>
    groupBy: (a: PrismaAny) => Promise<PrismaAny[]>
    aggregate: (a: PrismaAny) => Promise<PrismaAny>
  } }

  const siteFilter = siteId ? { siteId } : {}

  const [
    totalTasks,
    queued,
    running,
    completed24h,
    failed24h,
    completed7d,
    total7d,
    recentTasks,
    schedules,
    categoryData,
    creditsAgg,
    upcomingTasks,
  ] = await Promise.all([
    model.perplexityTask.count({ where: siteFilter }),
    model.perplexityTask.count({ where: { ...siteFilter, status: { in: ['queued', 'ready'] } } }),
    model.perplexityTask.count({ where: { ...siteFilter, status: 'running' } }),
    model.perplexityTask.count({ where: { ...siteFilter, status: 'completed', completedAt: { gte: oneDayAgo } } }),
    model.perplexityTask.count({ where: { ...siteFilter, status: 'failed', completedAt: { gte: oneDayAgo } } }),
    model.perplexityTask.count({ where: { ...siteFilter, status: 'completed', completedAt: { gte: sevenDaysAgo } } }),
    model.perplexityTask.count({ where: { ...siteFilter, completedAt: { gte: sevenDaysAgo } } }),
    model.perplexityTask.findMany({
      where: siteFilter,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, title: true, category: true, status: true, priority: true,
        createdAt: true, completedAt: true, resultSummary: true,
        estimatedCredits: true, actualCredits: true,
      },
    }),
    (db as { perplexitySchedule: { findMany: (a: PrismaAny) => Promise<PrismaAny[]> } }).perplexitySchedule.findMany({
      orderBy: { nextRunAt: 'asc' },
      select: {
        id: true, title: true, category: true, cronExpression: true,
        enabled: true, lastRunAt: true, nextRunAt: true, runCount: true,
      },
    }),
    model.perplexityTask.groupBy({
      by: ['category'],
      where: { ...siteFilter, createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    model.perplexityTask.aggregate({
      where: { ...siteFilter, status: 'completed', completedAt: { gte: sevenDaysAgo } },
      _sum: { actualCredits: true, estimatedCredits: true },
    }),
    model.perplexityTask.findMany({
      where: { ...siteFilter, status: { in: ['queued', 'ready'] }, scheduledFor: { not: null } },
      orderBy: { scheduledFor: 'asc' },
      take: 10,
      select: { id: true, title: true, scheduledFor: true, priority: true },
    }),
  ])

  // Build category breakdown
  const breakdown: PerplexityDashboardData['categoryBreakdown'] = {}
  for (const row of categoryData) {
    const cat = String((row as PrismaAny).category || 'unknown')
    const count = ((row as PrismaAny)._count as PrismaAny)?._all as number || 0
    breakdown[cat] = { total: count, completed: 0, failed: 0, credits: 0 }
  }

  const creditsUsed = Number(((creditsAgg as PrismaAny)?._sum as PrismaAny)?.actualCredits || 0)
    || Number(((creditsAgg as PrismaAny)?._sum as PrismaAny)?.estimatedCredits || 0)

  const creditsQueued = await model.perplexityTask.aggregate({
    where: { ...siteFilter, status: { in: ['queued', 'ready'] } },
    _sum: { estimatedCredits: true },
  }).then((r: PrismaAny) => Number(((r as PrismaAny)?._sum as PrismaAny)?.estimatedCredits || 0))

  return {
    summary: {
      totalTasks,
      queued,
      running,
      completed24h,
      failed24h,
      creditsUsed7d: creditsUsed,
      creditsEstimatedQueued: creditsQueued,
      successRate7d: total7d > 0 ? Math.round((completed7d / total7d) * 100) : 100,
      avgDurationMs: 0, // calculated from actual task data when available
    },
    recentTasks: recentTasks.map((t: PrismaAny) => ({
      id: String(t.id),
      title: String(t.title),
      category: String(t.category) as TaskCategory,
      status: String(t.status) as TaskStatus,
      priority: String(t.priority) as PerplexityDashboardData['recentTasks'][0]['priority'],
      createdAt: String(t.createdAt),
      completedAt: t.completedAt ? String(t.completedAt) : null,
      resultSummary: t.resultSummary ? String(t.resultSummary) : null,
      estimatedCredits: Number(t.estimatedCredits || 0),
      actualCredits: t.actualCredits ? Number(t.actualCredits) : null,
    })),
    schedules: schedules.map((s: PrismaAny) => ({
      id: String(s.id),
      title: String(s.title),
      category: String(s.category),
      cronExpression: String(s.cronExpression),
      enabled: Boolean(s.enabled),
      lastRunAt: s.lastRunAt ? String(s.lastRunAt) : null,
      nextRunAt: s.nextRunAt ? String(s.nextRunAt) : null,
      runCount: Number(s.runCount || 0),
    })),
    categoryBreakdown: breakdown,
    upcomingTasks: upcomingTasks.map((t: PrismaAny) => ({
      id: String(t.id),
      title: String(t.title),
      scheduledFor: String(t.scheduledFor),
      priority: String(t.priority) as PerplexityDashboardData['upcomingTasks'][0]['priority'],
    })),
  }
}

// ── CEO Agent Context ────────────────────────────────────────────────────────

export async function getContextData(): Promise<PerplexityContextData> {
  const { prisma } = await import('@/lib/db')
  const db = prisma as PrismaAny
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const model = db as { perplexityTask: {
    count: (a: PrismaAny) => Promise<number>
    aggregate: (a: PrismaAny) => Promise<PrismaAny>
  } }
  const schedModel = db as { perplexitySchedule: {
    count: (a: PrismaAny) => Promise<number>
    findMany: (a: PrismaAny) => Promise<PrismaAny[]>
  } }

  try {
    const [queued, running, failed24h, completed24h, completed7d, total7d, creditsAgg, activeSchedules, nextScheduled] = await Promise.all([
      model.perplexityTask.count({ where: { status: { in: ['queued', 'ready'] } } }),
      model.perplexityTask.count({ where: { status: 'running' } }),
      model.perplexityTask.count({ where: { status: 'failed', completedAt: { gte: oneDayAgo } } }),
      model.perplexityTask.count({ where: { status: 'completed', completedAt: { gte: oneDayAgo } } }),
      model.perplexityTask.count({ where: { status: 'completed', completedAt: { gte: sevenDaysAgo } } }),
      model.perplexityTask.count({ where: { completedAt: { gte: sevenDaysAgo } } }),
      model.perplexityTask.aggregate({
        where: { status: 'completed', completedAt: { gte: sevenDaysAgo } },
        _sum: { actualCredits: true, estimatedCredits: true },
      }),
      schedModel.perplexitySchedule.count({ where: { enabled: true } }),
      schedModel.perplexitySchedule.findMany({
        where: { enabled: true, nextRunAt: { not: null } },
        orderBy: { nextRunAt: 'asc' },
        take: 1,
        select: { title: true, nextRunAt: true },
      }),
    ])

    const credits = Number(((creditsAgg as PrismaAny)?._sum as PrismaAny)?.actualCredits || 0)
      || Number(((creditsAgg as PrismaAny)?._sum as PrismaAny)?.estimatedCredits || 0)

    return {
      tasksQueued: queued,
      tasksRunning: running,
      tasksFailed24h: failed24h,
      tasksCompleted24h: completed24h,
      creditsUsed7d: credits,
      successRate7d: total7d > 0 ? Math.round((completed7d / total7d) * 100) : 100,
      nextScheduledTask: nextScheduled.length > 0 ? String(nextScheduled[0].title) : null,
      activeSchedules,
    }
  } catch {
    return {
      tasksQueued: 0, tasksRunning: 0, tasksFailed24h: 0, tasksCompleted24h: 0,
      creditsUsed7d: 0, successRate7d: 100, nextScheduledTask: null, activeSchedules: 0,
    }
  }
}

// ── Cron expression → next run date (simple parser) ──────────────────────────

function computeNextRun(cronExpr: string): Date {
  // Simple cron parser: minute hour dayOfMonth month dayOfWeek
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return new Date(Date.now() + 24 * 60 * 60 * 1000) // default: tomorrow

  const now = new Date()
  const next = new Date(now)

  const minute = parts[0] === '*' ? now.getMinutes() : parseInt(parts[0], 10)
  const hour = parts[1] === '*' ? now.getHours() : parseInt(parts[1], 10)

  next.setMinutes(minute)
  next.setSeconds(0)
  next.setMilliseconds(0)

  if (parts[1] !== '*') next.setHours(hour)

  // If time already passed today, move to next occurrence
  if (next <= now) {
    if (parts[4] !== '*') {
      // Day-of-week specific: advance to next matching day
      const targetDay = parseInt(parts[4], 10)
      const daysAhead = (targetDay - now.getDay() + 7) % 7 || 7
      next.setDate(next.getDate() + daysAhead)
    } else if (parts[2] !== '*') {
      // Day-of-month specific: advance to next month
      const targetDate = parseInt(parts[2], 10)
      next.setDate(targetDate)
      if (next <= now) next.setMonth(next.getMonth() + 1)
    } else {
      // Daily: advance to tomorrow
      next.setDate(next.getDate() + 1)
    }
  }

  return next
}
