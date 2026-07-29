'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Play, Copy, Loader2, CheckCircle, AlertCircle,
  MessageSquare, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import {
  AdminCard, AdminPageHeader, AdminButton, AdminStatusBadge,
  AdminLoadingState, AdminEmptyState, AdminSectionLabel,
} from '@/components/admin/admin-ui'

interface Task {
  id: string
  name: string
  description: string
  category: string
}

interface RunResult {
  taskId: string
  runId: string
  status: 'success' | 'error'
  result?: string
  structuredOutput?: Record<string, unknown>
  error?: string
  timestamps: { started: string; completed: string; durationMs: number }
}

interface RecentRun {
  id: string
  taskType: string
  provider: string
  model: string
  tokens: number
  cost: number
  success: boolean
  createdAt: string
}

export default function AITaskRunner() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [selectedTask, setSelectedTask] = useState('')
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RunResult[]>([])
  const [explaining, setExplaining] = useState<string | null>(null)
  const [explanations, setExplanations] = useState<Record<string, string>>({})
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-tasks')
      if (!res.ok) return
      const data = await res.json()
      setTasks(data.tasks || [])
      setRecentRuns(data.recentRuns || [])
    } catch {
      // API may not be deployed yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const runTask = async () => {
    if (!selectedTask || !prompt.trim()) return
    setRunning(true)
    try {
      const res = await fetch('/api/admin/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTask, prompt: prompt.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      setResults(prev => [result, ...prev])
      setExpandedResult(result.runId)
      fetchTasks() // Refresh recent runs
    } catch (err) {
      setResults(prev => [{
        taskId: selectedTask,
        runId: `error-${Date.now()}`,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to run task',
        timestamps: { started: new Date().toISOString(), completed: new Date().toISOString(), durationMs: 0 },
      }, ...prev])
    } finally {
      setRunning(false)
    }
  }

  const explainResult = async (result: RunResult) => {
    setExplaining(result.runId)
    try {
      const res = await fetch('/api/admin/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explain', output: result }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setExplanations(prev => ({ ...prev, [result.runId]: data.explanation }))
    } catch {
      setExplanations(prev => ({ ...prev, [result.runId]: 'Could not generate explanation.' }))
    } finally {
      setExplaining(null)
    }
  }

  const copyJson = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).catch(() => {})
  }

  const selectedTaskDef = tasks.find(t => t.id === selectedTask)

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="AI Task Runner"
        subtitle="Run structured AI tasks"
      />

      {/* Task selector */}
      <AdminCard className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain style={{ width: 18, height: 18, color: '#3B7EA1' }} />
          <AdminSectionLabel>AI Task Runner</AdminSectionLabel>
        </div>

        {/* Task dropdown */}
        <div className="mb-3">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="admin-select w-full"
          >
            <option value="">Select a task...</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>
            ))}
          </select>
          {selectedTaskDef && (
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 4 }}>{selectedTaskDef.description}</p>
          )}
        </div>

        {/* Prompt input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt or paste content to analyze..."
          rows={4}
          className="admin-input w-full mb-3"
          style={{ fontSize: 13, resize: 'vertical' }}
        />

        {/* Run button */}
        <AdminButton
          variant="primary"
          size="lg"
          onClick={runTask}
          disabled={running || !selectedTask || !prompt.trim()}
          loading={running}
        >
          <Play style={{ width: 16, height: 16 }} />
          {running ? 'Running...' : 'Run Task'}
        </AdminButton>
      </AdminCard>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-5">
          <AdminSectionLabel>Results ({results.length})</AdminSectionLabel>

          <div className="space-y-3">
            {results.map(result => {
              const isExpanded = expandedResult === result.runId
              return (
                <AdminCard key={result.runId}>
                  {/* Header */}
                  <button
                    onClick={() => setExpandedResult(isExpanded ? null : result.runId)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    {result.status === 'success'
                      ? <CheckCircle style={{ width: 16, height: 16, color: '#2D5A3D', flexShrink: 0 }} />
                      : <AlertCircle style={{ width: 16, height: 16, color: '#C8322B', flexShrink: 0 }} />
                    }
                    <div className="flex-1 min-w-0">
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>
                        {tasks.find(t => t.id === result.taskId)?.name || result.taskId}
                      </span>
                      <span style={{ fontSize: 10, color: '#78716C', marginLeft: 8 }}>
                        {result.timestamps.durationMs}ms
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: '#78716C' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#78716C' }} />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
                      {result.error && (
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
                          <p style={{ fontSize: 12, color: '#C8322B' }}>{result.error}</p>
                        </div>
                      )}

                      {/* Structured output */}
                      {result.structuredOutput && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <AdminSectionLabel>JSON Output</AdminSectionLabel>
                            <button onClick={() => copyJson(result.structuredOutput)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:bg-stone-100"
                                    style={{ fontSize: 10, color: '#3B7EA1' }}>
                              <Copy style={{ width: 12, height: 12 }} /> Copy JSON
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg overflow-x-auto text-xs admin-card-inset"
                               style={{ color: '#1C1917', maxHeight: 300 }}>
                            {JSON.stringify(result.structuredOutput, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Raw text output */}
                      {result.result && !result.structuredOutput && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <AdminSectionLabel>Output</AdminSectionLabel>
                            <button onClick={() => copyJson(result.result)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:bg-stone-100"
                                    style={{ fontSize: 10, color: '#3B7EA1' }}>
                              <Copy style={{ width: 12, height: 12 }} /> Copy
                            </button>
                          </div>
                          <div className="p-3 rounded-lg overflow-x-auto text-sm admin-card-inset"
                               style={{ color: '#1C1917', maxHeight: 300, whiteSpace: 'pre-wrap' }}>
                            {result.result}
                          </div>
                        </div>
                      )}

                      {/* Explain button */}
                      <div className="mt-3 flex items-center gap-2">
                        <AdminButton
                          variant="secondary"
                          size="sm"
                          onClick={() => explainResult(result)}
                          disabled={explaining === result.runId}
                          loading={explaining === result.runId}
                        >
                          <MessageSquare style={{ width: 14, height: 14 }} />
                          Explain in Plain English
                        </AdminButton>
                      </div>

                      {/* Explanation */}
                      {explanations[result.runId] && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(196,154,42,0.06)', borderLeft: '3px solid #C49A2A' }}>
                          <p style={{ fontSize: 12, color: '#44403C', lineHeight: 1.5 }}>{explanations[result.runId]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </AdminCard>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent runs from API */}
      {recentRuns.length > 0 && (
        <div>
          <AdminSectionLabel>Recent Runs</AdminSectionLabel>
          <div className="space-y-1">
            {recentRuns.map(run => (
              <AdminCard key={run.id} className="!py-2 !px-3">
                <div className="flex items-center gap-3">
                  {run.success
                    ? <CheckCircle style={{ width: 12, height: 12, color: '#2D5A3D' }} />
                    : <AlertCircle style={{ width: 12, height: 12, color: '#C8322B' }} />
                  }
                  <span style={{ fontSize: 12, color: '#1C1917', flex: 1 }}>{run.taskType}</span>
                  <span style={{ fontSize: 10, color: '#78716C' }}>{run.provider}</span>
                  <span style={{ fontSize: 10, color: '#78716C' }}>{run.tokens?.toLocaleString()} tok</span>
                  {run.cost != null && <span style={{ fontSize: 10, color: '#C49A2A' }}>${run.cost.toFixed(4)}</span>}
                </div>
              </AdminCard>
            ))}
          </div>
        </div>
      )}

      {/* Loading / empty state */}
      {loading && <AdminLoadingState label="Loading tasks..." />}

      {!loading && tasks.length === 0 && (
        <AdminEmptyState
          icon={Sparkles}
          title="AI Task Runner loading..."
          description="Tasks will appear when the API is deployed."
        />
      )}
    </div>
  )
}
