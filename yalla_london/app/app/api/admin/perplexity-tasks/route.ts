import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET — Dashboard data, task list, or single task
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const url = new URL(request.url)
  const view = url.searchParams.get('view') // dashboard, list, task, templates, schedules
  const taskId = url.searchParams.get('taskId')
  const status = url.searchParams.get('status') || 'all'
  const category = url.searchParams.get('category')
  const siteId = url.searchParams.get('siteId') || request.headers.get('x-site-id') || undefined
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  try {
    const { getDashboardData, listTasks, getTask, listSchedules, TASK_TEMPLATES, getCategorySummary } =
      await import('@/lib/perplexity-computer')

    if (view === 'dashboard' || !view) {
      const data = await getDashboardData(siteId)
      return NextResponse.json({ success: true, ...data })
    }

    if (view === 'task' && taskId) {
      const task = await getTask(taskId)
      if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
      return NextResponse.json({ success: true, task })
    }

    if (view === 'list') {
      const result = await listTasks({
        status: status as Parameters<typeof listTasks>[0]['status'],
        category: category as Parameters<typeof listTasks>[0]['category'],
        siteId,
        limit,
        offset,
      })
      return NextResponse.json({ success: true, ...result })
    }

    if (view === 'templates') {
      return NextResponse.json({
        success: true,
        templates: TASK_TEMPLATES,
        categories: getCategorySummary(),
      })
    }

    if (view === 'schedules') {
      const schedules = await listSchedules()
      return NextResponse.json({ success: true, schedules })
    }

    // Default: dashboard
    const data = await getDashboardData(siteId)
    return NextResponse.json({ success: true, ...data })
  } catch (err) {
    console.error('[perplexity-tasks] GET error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

// POST — Create task, cancel, retry, update status, create/toggle schedule, batch create
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, ...payload } = body

    const {
      createTask, cancelTask, retryTask, updateTaskStatus,
      createSchedule, toggleSchedule,
      getTemplateById, fillTemplate,
    } = await import('@/lib/perplexity-computer')

    switch (action) {
      case 'create': {
        const task = await createTask({
          category: payload.category || 'research',
          taskType: payload.taskType || 'general',
          title: payload.title,
          prompt: payload.prompt,
          siteId: payload.siteId,
          priority: payload.priority,
          scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : undefined,
          parentTaskId: payload.parentTaskId,
          tags: payload.tags,
          estimatedCredits: payload.estimatedCredits,
          metadata: payload.metadata,
        })
        return NextResponse.json({ success: true, task })
      }

      case 'create_from_template': {
        const template = getTemplateById(payload.templateId)
        if (!template) {
          return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
        }
        const prompt = fillTemplate(template, payload.variables || {})
        const title = fillTemplate({ ...template, promptTemplate: template.title }, payload.variables || {})

        const task = await createTask({
          category: template.category,
          taskType: template.taskType,
          title,
          prompt,
          siteId: payload.siteId,
          priority: template.priority,
          estimatedCredits: template.estimatedCredits,
          tags: [...template.tags, `template:${template.id}`],
          metadata: { templateId: template.id, variables: payload.variables },
        })
        return NextResponse.json({ success: true, task, templateUsed: template.id })
      }

      case 'batch_create': {
        const tasks = []
        for (const item of (payload.tasks || [])) {
          const t = await createTask({
            category: item.category || 'research',
            taskType: item.taskType || 'general',
            title: item.title,
            prompt: item.prompt,
            siteId: item.siteId || payload.siteId,
            priority: item.priority || 'medium',
            tags: item.tags || [],
            estimatedCredits: item.estimatedCredits || 10,
          })
          tasks.push(t)
        }
        return NextResponse.json({ success: true, created: tasks.length, tasks })
      }

      case 'cancel': {
        await cancelTask(payload.taskId)
        return NextResponse.json({ success: true })
      }

      case 'retry': {
        const result = await retryTask(payload.taskId)
        return NextResponse.json({ success: true, ...result })
      }

      case 'update_status': {
        await updateTaskStatus(payload.taskId, payload.status, {
          resultSummary: payload.resultSummary,
          resultData: payload.resultData,
          errorMessage: payload.errorMessage,
          actualCredits: payload.actualCredits,
        })
        return NextResponse.json({ success: true })
      }

      case 'create_schedule': {
        const schedule = await createSchedule({
          category: payload.category,
          taskType: payload.taskType,
          title: payload.title,
          promptTemplate: payload.promptTemplate,
          cronExpression: payload.cronExpression,
          siteId: payload.siteId,
          priority: payload.priority,
          estimatedCredits: payload.estimatedCredits,
          tags: payload.tags,
        })
        return NextResponse.json({ success: true, schedule })
      }

      case 'toggle_schedule': {
        await toggleSchedule(payload.scheduleId, payload.enabled)
        return NextResponse.json({ success: true })
      }

      case 'execute': {
        const { executeTask } = await import('@/lib/perplexity-computer/executor')
        const result = await executeTask(payload.taskId, payload.budgetMs || 45000)
        return NextResponse.json({ success: result.success, ...result })
      }

      case 'seed_recommended': {
        // Seed the recommended schedules from templates
        const { TASK_TEMPLATES } = await import('@/lib/perplexity-computer')
        const scheduledTemplates = TASK_TEMPLATES.filter(t => t.schedule)
        const created = []

        for (const template of scheduledTemplates) {
          try {
            const sched = await createSchedule({
              category: template.category,
              taskType: template.taskType,
              title: template.title,
              promptTemplate: template.promptTemplate,
              cronExpression: template.schedule!,
              siteId: payload.siteId,
              priority: template.priority,
              estimatedCredits: template.estimatedCredits,
              tags: [...template.tags, `template:${template.id}`],
              metadata: { templateId: template.id },
            })
            created.push({ id: sched.id, title: template.title })
          } catch (err) {
            console.warn(`[perplexity-tasks] Failed to seed schedule ${template.id}:`, err instanceof Error ? err.message : err)
          }
        }

        return NextResponse.json({ success: true, seeded: created.length, schedules: created })
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[perplexity-tasks] POST error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Action failed' }, { status: 500 })
  }
}
