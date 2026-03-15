'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Play, Copy, Loader2, CheckCircle, AlertCircle,
  MessageSquare, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'

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

  // Category colors
  const catColors: Record<string, string> = {
    content: '#2563EB', seo: '#16A34A', commerce: '#D97706',
    analysis: '#6366F1', legal: '#78716C', general: '#A8A29E',
  }

  return (
    <div>
      {/* Task selector */}
      <div className="rounded-xl p-5 mb-5"
           style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-raised)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Brain style={{ width: 18, height: 18, color: '#6366F1' }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#6366F1' }}>
            AI Task Runner
          </span>
        </div>

        {/* Task dropdown */}
        <div className="mb-3">
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-none"
            style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-inset)', fontSize: 13, color: '#1C1917', minHeight: 44 }}
          >
            <option value="">Select a task...</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>
            ))}
          </select>
          {selectedTaskDef && (
            <p style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>{selectedTaskDef.description}</p>
          )}
        </div>

        {/* Prompt input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt or paste content to analyze..."
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border-none mb-3"
          style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-inset)', fontSize: 13, color: '#1C1917', resize: 'vertical' }}
        />

        {/* Run button */}
        <button
          onClick={runTask}
          disabled={running || !selectedTask || !prompt.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1,
            color: '#FAF8F4', backgroundColor: '#6366F1', minHeight: 48,
            boxShadow: '3px 3px 8px var(--neu-shadow-dark, #CAC5BC)',
          }}
        >
          {running ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Play style={{ width: 16, height: 16 }} />}
          {running ? 'Running...' : 'Run Task'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-5">
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#78716C', marginBottom: 8 }}>
            Results ({results.length})
          </div>

          <div className="space-y-3">
            {results.map(result => {
              const isExpanded = expandedResult === result.runId
              return (
                <div key={result.runId} className="rounded-xl overflow-hidden"
                     style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
                  {/* Header */}
                  <button
                    onClick={() => setExpandedResult(isExpanded ? null : result.runId)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    {result.status === 'success'
                      ? <CheckCircle style={{ width: 16, height: 16, color: '#16A34A', flexShrink: 0 }} />
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
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
                      {result.error && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
                          <p style={{ fontSize: 12, color: '#C8322B' }}>{result.error}</p>
                        </div>
                      )}

                      {/* Structured output */}
                      {result.structuredOutput && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#78716C' }}>
                              JSON Output
                            </span>
                            <button onClick={() => copyJson(result.structuredOutput)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                                    style={{ fontSize: 10, color: '#6366F1' }}>
                              <Copy style={{ width: 12, height: 12 }} /> Copy JSON
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg overflow-x-auto text-xs"
                               style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#1C1917', maxHeight: 300 }}>
                            {JSON.stringify(result.structuredOutput, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Raw text output */}
                      {result.result && !result.structuredOutput && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#78716C' }}>
                              Output
                            </span>
                            <button onClick={() => copyJson(result.result)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                                    style={{ fontSize: 10, color: '#6366F1' }}>
                              <Copy style={{ width: 12, height: 12 }} /> Copy
                            </button>
                          </div>
                          <div className="p-3 rounded-lg overflow-x-auto text-sm"
                               style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#1C1917', maxHeight: 300, whiteSpace: 'pre-wrap' }}>
                            {result.result}
                          </div>
                        </div>
                      )}

                      {/* Explain button */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => explainResult(result)}
                          disabled={explaining === result.runId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: 0.5,
                            color: '#D97706', backgroundColor: 'rgba(217,119,6,0.08)', minHeight: 40,
                          }}
                        >
                          {explaining === result.runId
                            ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                            : <MessageSquare style={{ width: 14, height: 14 }} />}
                          Explain in Plain English
                        </button>
                      </div>

                      {/* Explanation */}
                      {explanations[result.runId] && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(217,119,6,0.06)', borderLeft: '3px solid #D97706' }}>
                          <p style={{ fontSize: 12, color: '#44403C', lineHeight: 1.5 }}>{explanations[result.runId]}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent runs from API */}
      {recentRuns.length > 0 && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#78716C', marginBottom: 8 }}>
            Recent Runs
          </div>
          <div className="space-y-1">
            {recentRuns.map(run => (
              <div key={run.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                   style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
                {run.success
                  ? <CheckCircle style={{ width: 12, height: 12, color: '#16A34A' }} />
                  : <AlertCircle style={{ width: 12, height: 12, color: '#C8322B' }} />
                }
                <span style={{ fontSize: 12, color: '#1C1917', flex: 1 }}>{run.taskType}</span>
                <span style={{ fontSize: 10, color: '#78716C' }}>{run.provider}</span>
                <span style={{ fontSize: 10, color: '#78716C' }}>{run.tokens?.toLocaleString()} tok</span>
                {run.cost != null && <span style={{ fontSize: 10, color: '#D97706' }}>${run.cost.toFixed(4)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading / empty state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 style={{ width: 24, height: 24, color: '#78716C' }} className="animate-spin" />
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <div className="text-center py-12 rounded-xl"
             style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-inset)' }}>
          <Sparkles style={{ width: 32, height: 32, color: '#78716C', margin: '0 auto 8px' }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
            AI Task Runner loading...
          </p>
          <p style={{ fontSize: 12, color: '#A8A29E', marginTop: 4 }}>
            Tasks will appear when the API is deployed.
          </p>
        </div>
      )}
    </div>
  )
}
