'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Task {
  id: string; title: string; category: string; taskType: string; status: string
  priority: string; prompt: string; resultSummary: string | null
  resultData: Record<string, unknown> | null; errorMessage: string | null
  estimatedCredits: number; actualCredits: number | null
  createdAt: string; completedAt: string | null; tags: string[]
  retryCount: number; siteId: string | null
}

interface Schedule {
  id: string; title: string; category: string; cronExpression: string
  enabled: boolean; lastRunAt: string | null; nextRunAt: string | null; runCount: number
}

interface Template {
  id: string; category: string; taskType: string; title: string
  promptTemplate: string; priority: string; estimatedCredits: number
  tags: string[]; requiresSiteId: boolean; schedule?: string
  variables: string[]; description: string; expectedOutput: string; roiRating: number
}

interface DashboardData {
  summary: {
    totalTasks: number; queued: number; running: number
    completed24h: number; failed24h: number
    creditsUsed7d: number; creditsEstimatedQueued: number
    successRate7d: number; avgDurationMs: number
  }
  recentTasks: Task[]
  schedules: Schedule[]
  categoryBreakdown: Record<string, { total: number; completed: number; failed: number; credits: number }>
  upcomingTasks: Array<{ id: string; title: string; scheduledFor: string; priority: string }>
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  registration: 'Registration & Forms', email: 'Email Marketing', social: 'Social Media',
  seo: 'SEO / AIO / GEO', development: 'Development', design: 'Design & UX',
  content: 'Content Quality', intelligence: 'Business Intel', 'ai-monitoring': 'AI Monitoring',
  strategy: 'Strategy',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800', low: 'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800', ready: 'bg-blue-100 text-blue-800',
  running: 'bg-purple-100 text-purple-800 animate-pulse', completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-500',
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>{label}</span>
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PerplexityComputerPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'templates' | 'schedules' | 'create'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [categories, setCategories] = useState<Record<string, { count: number; templates: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // Create form state
  const [createMode, setCreateMode] = useState<'manual' | 'template'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [manualTitle, setManualTitle] = useState('')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualCategory, setManualCategory] = useState('research')
  const [manualPriority, setManualPriority] = useState('medium')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fetch data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/perplexity-tasks?view=dashboard')
      const data = await res.json().catch(() => null)
      if (data?.migrationNeeded) {
        setMigrationNeeded(true)
        setDashboard(data)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch dashboard')
      if (data?.success) setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ view: 'list', limit: '50' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterCategory) params.set('category', filterCategory)
      const res = await fetch(`/api/admin/perplexity-tasks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      if (data.success) setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    }
  }, [filterStatus, filterCategory])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/perplexity-tasks?view=templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates || [])
        setCategories(data.categories || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    }
  }, [])

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/perplexity-tasks?view=schedules')
      if (!res.ok) throw new Error('Failed to fetch schedules')
      const data = await res.json()
      if (data.success) setSchedules(data.schedules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      if (activeTab === 'dashboard') await fetchDashboard()
      else if (activeTab === 'tasks') await fetchTasks()
      else if (activeTab === 'templates') await fetchTemplates()
      else if (activeTab === 'schedules') await fetchSchedules()
      else if (activeTab === 'create') await fetchTemplates()
      setLoading(false)
    }
    load()
  }, [activeTab, fetchDashboard, fetchTasks, fetchTemplates, fetchSchedules])

  useEffect(() => {
    if (activeTab === 'tasks') {
      setLoading(true)
      fetchTasks().then(() => setLoading(false))
    }
  }, [filterStatus, filterCategory, activeTab, fetchTasks])

  // Actions
  async function postAction(action: string, payload: Record<string, unknown> = {}) {
    setActionLoading(action)
    try {
      const res = await fetch('/api/admin/perplexity-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json().catch(() => ({ success: false, error: 'Invalid response' }))
      if (data.migrationNeeded) {
        showToast('Database tables not created yet — run prisma migrate deploy')
        return null
      }
      if (!res.ok || !data.success) throw new Error(data.error || 'Action failed')
      return data
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
      return null
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreateTask() {
    if (createMode === 'template') {
      if (!selectedTemplate) { showToast('Select a template'); return }
      const result = await postAction('create_from_template', {
        templateId: selectedTemplate,
        variables: templateVars,
      })
      if (result) {
        showToast(`Task created: ${result.task?.title || 'Success'}`)
        setActiveTab('tasks')
      }
    } else {
      if (!manualTitle || !manualPrompt) { showToast('Title and prompt required'); return }
      const result = await postAction('create', {
        title: manualTitle, prompt: manualPrompt,
        category: manualCategory, priority: manualPriority,
      })
      if (result) {
        showToast(`Task created: ${result.task?.title || 'Success'}`)
        setManualTitle(''); setManualPrompt('')
        setActiveTab('tasks')
      }
    }
  }

  async function handleCancel(taskId: string) {
    const result = await postAction('cancel', { taskId })
    if (result) { showToast('Task cancelled'); fetchTasks() }
  }

  async function handleRetry(taskId: string) {
    const result = await postAction('retry', { taskId })
    if (result) { showToast('Task retried'); fetchTasks() }
  }

  async function handleExecute(taskId: string) {
    const result = await postAction('execute', { taskId })
    if (result) { showToast(result.success ? 'Task executed successfully' : `Execution failed: ${result.error || 'Unknown'}`); fetchTasks() }
  }

  async function handleToggleSchedule(scheduleId: string, enabled: boolean) {
    const result = await postAction('toggle_schedule', { scheduleId, enabled: !enabled })
    if (result) { showToast(`Schedule ${enabled ? 'disabled' : 'enabled'}`); fetchSchedules() }
  }

  async function handleSeedSchedules() {
    const result = await postAction('seed_recommended')
    if (result) { showToast(`Seeded ${result.seeded} schedules`); fetchSchedules() }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perplexity Computer</h1>
        <p className="text-sm text-gray-500 mt-1">Agentic AI tasks — browser automation, research, form filling, monitoring</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {(['dashboard', 'tasks', 'templates', 'schedules', 'create'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {tab === 'create' ? '+ New Task' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {migrationNeeded && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
          <strong>Database tables not created yet.</strong> The PerplexityTask and PerplexitySchedule tables need to be created.
          Run <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">npx prisma migrate deploy</code> on your database to set them up.
          The dashboard will show empty data until then.
        </div>
      )}

      {error && !migrationNeeded && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Dashboard Tab ─────────────────────────────────────── */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Total Tasks" value={dashboard.summary.totalTasks} />
                <SummaryCard label="Queued" value={dashboard.summary.queued} color="yellow" />
                <SummaryCard label="Running" value={dashboard.summary.running} color="purple" />
                <SummaryCard label="Completed (24h)" value={dashboard.summary.completed24h} color="green" />
                <SummaryCard label="Failed (24h)" value={dashboard.summary.failed24h} color="red" />
                <SummaryCard label="Credits (7d)" value={dashboard.summary.creditsUsed7d} />
                <SummaryCard label="Est. Queued Credits" value={dashboard.summary.creditsEstimatedQueued} />
                <SummaryCard label="Success Rate (7d)" value={`${dashboard.summary.successRate7d}%`} color={dashboard.summary.successRate7d >= 90 ? 'green' : 'orange'} />
              </div>

              {/* Category Breakdown */}
              {Object.keys(dashboard.categoryBreakdown).length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">By Category</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(dashboard.categoryBreakdown).map(([cat, rawData]) => {
                      const data = rawData as { total: number; completed: number; failed: number; credits: number }
                      return (
                        <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600">{data.completed} done</span>
                            <span className="text-red-600">{data.failed} fail</span>
                            <span className="text-gray-500">{data.credits} cr</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Tasks */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Tasks</h3>
                {dashboard.recentTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No tasks yet. Create your first task to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboard.recentTasks.slice(0, 10).map(task => (
                      <div key={task.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge label={task.status} colorClass={STATUS_COLORS[task.status] || 'bg-gray-100'} />
                            <Badge label={task.category} colorClass="bg-indigo-50 text-indigo-700" />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{timeAgo(task.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedules */}
              {dashboard.schedules.length > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Active Schedules</h3>
                  <div className="space-y-2">
                    {dashboard.schedules.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-gray-500">{s.cronExpression} · {s.runCount} runs</p>
                        </div>
                        <Badge label={s.enabled ? 'Active' : 'Paused'} colorClass={s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tasks Tab ─────────────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white">
                  <option value="all">All Status</option>
                  {['queued', 'ready', 'running', 'completed', 'failed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white">
                  <option value="">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {tasks.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                  <p className="text-gray-500 mb-4">No tasks found</p>
                  <button onClick={() => setActiveTab('create')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
                    Create First Task
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <button onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                            className="text-sm font-medium text-left hover:text-indigo-600 transition">
                            {task.title}
                          </button>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge label={task.status} colorClass={STATUS_COLORS[task.status] || 'bg-gray-100'} />
                            <Badge label={task.priority} colorClass={PRIORITY_COLORS[task.priority] || 'bg-gray-100'} />
                            <Badge label={CATEGORY_LABELS[task.category] || task.category} colorClass="bg-indigo-50 text-indigo-700" />
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {(task.status === 'queued' || task.status === 'ready') && (<>
                            <button onClick={() => handleExecute(task.id)} disabled={actionLoading === 'execute'}
                              className="text-xs px-2 py-1 bg-violet-50 text-violet-700 rounded hover:bg-violet-100 font-medium">⚡ Execute</button>
                            <button onClick={() => handleCancel(task.id)} disabled={actionLoading === 'cancel'}
                              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Cancel</button>
                          </>)}
                          {task.status === 'failed' && (
                            <button onClick={() => handleRetry(task.id)} disabled={actionLoading === 'retry'}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Retry</button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        <span>{timeAgo(task.createdAt)}</span>
                        {task.actualCredits !== null && <span>{task.actualCredits} credits</span>}
                        {task.retryCount > 0 && <span>{task.retryCount} retries</span>}
                      </div>

                      {/* Expanded view */}
                      {selectedTask?.id === task.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Prompt</p>
                            <p className="text-gray-700 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded mt-1 max-h-40 overflow-y-auto">{task.prompt}</p>
                          </div>
                          {task.resultSummary && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Result</p>
                              <p className="text-gray-700 whitespace-pre-wrap text-xs bg-green-50 p-2 rounded mt-1 max-h-40 overflow-y-auto">{task.resultSummary}</p>
                            </div>
                          )}
                          {task.errorMessage && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Error</p>
                              <p className="text-red-600 text-xs bg-red-50 p-2 rounded mt-1">{task.errorMessage}</p>
                            </div>
                          )}
                          {task.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {task.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Templates Tab ─────────────────────────────────────── */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Pre-built task templates for common Perplexity Computer operations. Click to create a task from any template.</p>

              {Object.entries(categories).map(([cat, rawInfo]) => {
                const info = rawInfo as { count: number; templates: string[] }
                return (
                <div key={cat} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">{CATEGORY_LABELS[cat] || cat} ({info.count})</h3>
                  <div className="space-y-2">
                    {templates.filter(t => t.category === cat).map(t => (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{t.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge label={`ROI: ${t.roiRating}/10`} colorClass={t.roiRating >= 8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} />
                              <Badge label={`~${t.estimatedCredits} credits`} colorClass="bg-gray-100 text-gray-600" />
                              {t.schedule && <Badge label={`Scheduled: ${t.schedule}`} colorClass="bg-purple-100 text-purple-700" />}
                              {t.requiresSiteId && <Badge label="Needs siteId" colorClass="bg-amber-100 text-amber-700" />}
                            </div>
                            {t.variables.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">Variables: {t.variables.join(', ')}</p>
                            )}
                          </div>
                          <button onClick={() => {
                            setSelectedTemplate(t.id)
                            setCreateMode('template')
                            setTemplateVars({})
                            setActiveTab('create')
                          }} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ml-2 whitespace-nowrap">
                            Use
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )})}
            </div>
          )}

          {/* ── Schedules Tab ─────────────────────────────────────── */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Recurring task schedules powered by cron expressions.</p>
                <button onClick={handleSeedSchedules} disabled={actionLoading === 'seed_recommended'}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {actionLoading === 'seed_recommended' ? 'Seeding...' : 'Seed Recommended'}
                </button>
              </div>

              {schedules.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                  <p className="text-gray-500 mb-2">No schedules configured</p>
                  <p className="text-xs text-gray-400">Click &quot;Seed Recommended&quot; to create schedules from templates</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map(s => (
                    <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <div className="flex gap-2 mt-1 text-xs text-gray-500">
                            <span>{s.cronExpression}</span>
                            <span>·</span>
                            <span>{s.runCount} runs</span>
                            {s.lastRunAt && <><span>·</span><span>Last: {timeAgo(s.lastRunAt)}</span></>}
                            {s.nextRunAt && <><span>·</span><span>Next: {timeAgo(s.nextRunAt)}</span></>}
                          </div>
                        </div>
                        <button onClick={() => handleToggleSchedule(s.id, s.enabled)}
                          disabled={actionLoading === 'toggle_schedule'}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            s.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {s.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Create Tab ─────────────────────────────────────────── */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900">Create New Task</h3>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button onClick={() => setCreateMode('template')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${createMode === 'template' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  From Template
                </button>
                <button onClick={() => setCreateMode('manual')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${createMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  Manual
                </button>
              </div>

              {createMode === 'template' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
                    <select value={selectedTemplate} onChange={e => {
                      setSelectedTemplate(e.target.value)
                      setTemplateVars({})
                    }} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200">
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({CATEGORY_LABELS[t.category] || t.category})</option>
                      ))}
                    </select>
                  </div>

                  {selectedTemplate && (() => {
                    const tmpl = templates.find(t => t.id === selectedTemplate)
                    if (!tmpl) return null
                    return (
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">{tmpl.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Expected: {tmpl.expectedOutput}</p>
                        </div>
                        {tmpl.variables.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Variables</p>
                            {tmpl.variables.map(v => (
                              <div key={v}>
                                <label className="text-xs text-gray-500">{`{{${v}}}`}</label>
                                <input type="text" value={templateVars[v] || ''}
                                  onChange={e => setTemplateVars(prev => ({ ...prev, [v]: e.target.value }))}
                                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 mt-0.5"
                                  placeholder={v === 'siteId' ? 'yalla-london' : v === 'siteDomain' ? 'yalla-london.com' : `Enter ${v}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200"
                      placeholder="e.g., Audit competitor backlink profiles" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <select value={manualCategory} onChange={e => setManualCategory(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200">
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                      <select value={manualPriority} onChange={e => setManualPriority(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200">
                        {['critical', 'high', 'medium', 'low'].map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prompt</label>
                    <textarea value={manualPrompt} onChange={e => setManualPrompt(e.target.value)}
                      className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 h-40 resize-y"
                      placeholder="Describe the task for Perplexity Computer to execute..." />
                  </div>
                </div>
              )}

              <button onClick={handleCreateTask} disabled={actionLoading === 'create' || actionLoading === 'create_from_template'}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {actionLoading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Task Detail Modal */}
      {selectedTask && activeTab !== 'tasks' && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">{selectedTask.title}</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded mt-2 whitespace-pre-wrap">{selectedTask.prompt}</pre>
            {selectedTask.resultSummary && (
              <pre className="text-xs bg-green-50 p-3 rounded mt-2 whitespace-pre-wrap">{selectedTask.resultSummary}</pre>
            )}
            <button onClick={() => setSelectedTask(null)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  }
  return (
    <div className={`rounded-xl p-3 border ${colorMap[color || ''] || 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}
