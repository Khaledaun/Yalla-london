'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Play, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Departure {
  id: string
  label: string
  type: 'cron' | 'publication' | 'audit' | 'content'
  icon: string
  scheduledAt: string | null
  countdownMs: number | null
  status: 'scheduled' | 'running' | 'overdue' | 'ready' | 'on_demand'
  cronPath: string | null
  cronSchedule: string | null
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | 'unknown' | null
  siteId: string | null
  meta?: Record<string, string | number>
  description: string | null
  category: string | null
  feedsInto: string | null
  successRate7d: number | null
  avgDurationMs: number | null
  lastError: string | null
}

interface DeparturesData {
  departures: Departure[]
  generatedAt: string
  totalCrons: number
  totalPublications: number
  totalReady: number
  categories: Record<string, number>
}

type ViewMode = 'timeline' | 'category'
type FilterType = 'all' | 'cron' | 'publication' | 'content' | 'overdue' | 'ready'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; icon: string; color: string; border: string }> = {
  content:     { label: 'Content Pipeline',   icon: '✍️', color: 'text-blue-400',    border: 'border-blue-800' },
  seo:         { label: 'SEO & Indexing',      icon: '🔍', color: 'text-emerald-400', border: 'border-emerald-800' },
  publishing:  { label: 'Publishing',          icon: '🚀', color: 'text-violet-400',  border: 'border-violet-800' },
  analytics:   { label: 'Analytics',           icon: '📊', color: 'text-amber-400',   border: 'border-amber-800' },
  maintenance: { label: 'Maintenance',         icon: '🔧', color: 'text-zinc-400',    border: 'border-zinc-700' },
}

// Pipeline dependency chain for visualization
const PIPELINE_CHAIN = [
  { label: 'Weekly Topics',     icon: '🔍', key: 'weekly-topics' },
  { label: 'Content Builder',   icon: '🏗️', key: 'content-builder' },
  { label: 'Content Selector',  icon: '✅', key: 'content-selector' },
  { label: 'Scheduled Publish', icon: '🚀', key: 'scheduled-publish' },
  { label: 'SEO Agent',         icon: '🤖', key: 'seo-agent' },
  { label: 'IndexNow',          icon: '🔗', key: 'seo/cron' },
]

const SITE_SHORT: Record<string, string> = {
  'yalla-london':       'YL',
  'arabaldives':        'AR',
  'french-riviera':     'RV',
  'istanbul':           'IS',
  'thailand':           'TH',
  'zenitha-yachts-med': 'ZY',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(ms: number | null): { text: string; urgent: boolean; overdue: boolean } {
  if (ms === null) return { text: 'On demand', urgent: false, overdue: false }
  if (ms < 0) return { text: `${formatDuration(-ms)} overdue`, urgent: true, overdue: true }
  if (ms < 60_000) return { text: `${Math.ceil(ms / 1000)}s`, urgent: true, overdue: false }
  if (ms < 3_600_000) return { text: `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`, urgent: ms < 600_000, overdue: false }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return { text: `${h}h ${m}m`, urgent: false, overdue: false }
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function healthColor(rate: number | null): string {
  if (rate === null) return 'bg-zinc-700 text-zinc-400'
  if (rate >= 90) return 'bg-emerald-900/60 text-emerald-300'
  if (rate >= 70) return 'bg-amber-900/60 text-amber-300'
  return 'bg-red-900/60 text-red-300'
}

// ---------------------------------------------------------------------------
// Animated countdown cell
// ---------------------------------------------------------------------------

function CountdownCell({ scheduledAt, status }: { scheduledAt: string | null; status: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = scheduledAt ? new Date(scheduledAt).getTime() - now : null
  const { text, urgent, overdue } = formatCountdown(ms)
  return (
    <span className={`font-mono text-sm tabular-nums transition-colors ${
      overdue ? 'text-red-400 animate-pulse' :
      urgent  ? 'text-yellow-400' :
                'text-zinc-300'
    } ${status === 'ready' ? 'text-violet-400' : ''}`}>
      {status === 'ready' ? 'Ready now' : text}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Departure Row — enhanced with expandable detail
// ---------------------------------------------------------------------------

function DepartureRow({
  dep,
  onTrigger,
  triggering,
}: {
  dep: Departure
  onTrigger: (path: string) => void
  triggering: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isTrig = triggering === dep.cronPath

  const TYPE_COLORS: Record<string, string> = {
    cron:        'border-l-blue-500',
    publication: 'border-l-emerald-500',
    content:     'border-l-violet-500',
    audit:       'border-l-yellow-500',
  }

  return (
    <div className="rounded-r-lg overflow-hidden">
      <div
        className={`
          flex items-center gap-3 px-4 py-3 border-l-2 cursor-pointer
          ${TYPE_COLORS[dep.type] ?? 'border-l-zinc-700'}
          ${dep.status === 'overdue' ? 'bg-red-950/20' : 'bg-zinc-900/80'}
          hover:bg-zinc-800/50 transition-colors
        `}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon + Status dot */}
        <div className="relative shrink-0 text-xl w-8 text-center">
          {dep.icon}
          {dep.status === 'overdue' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-zinc-950" />
          )}
          {dep.status === 'ready' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-violet-500 rounded-full border border-zinc-950" />
          )}
        </div>

        {/* Label + schedule + health badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100 truncate">{dep.label}</span>
            {dep.siteId && (
              <Badge className="text-[10px] px-1 py-0 bg-zinc-800 text-zinc-400">
                {SITE_SHORT[dep.siteId] ?? dep.siteId}
              </Badge>
            )}
            {dep.successRate7d !== null && (
              <Badge className={`text-[10px] px-1.5 py-0 ${healthColor(dep.successRate7d)}`}>
                {dep.successRate7d}% 7d
              </Badge>
            )}
            {dep.status === 'ready' && (
              <Badge className="text-[10px] px-1 py-0 bg-violet-900 text-violet-300">READY</Badge>
            )}
            {dep.status === 'overdue' && (
              <Badge className="text-[10px] px-1 py-0 bg-red-900 text-red-300">OVERDUE</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-zinc-500">{dep.cronSchedule ?? '—'}</span>
            {dep.lastRunAt && (
              <span className={`text-xs ${dep.lastRunStatus === 'success' ? 'text-emerald-600' : dep.lastRunStatus === 'failed' ? 'text-red-600' : 'text-zinc-600'}`}>
                · Last: {formatTime(dep.lastRunAt)}
                {dep.lastRunStatus === 'failed' && ' ✗'}
                {dep.lastRunStatus === 'success' && ' ✓'}
              </span>
            )}
            {dep.avgDurationMs != null && dep.avgDurationMs > 0 && (
              <span className="text-xs text-zinc-600">· avg {formatDuration(dep.avgDurationMs)}</span>
            )}
          </div>
        </div>

        {/* Scheduled time */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-xs text-zinc-400">{dep.scheduledAt ? formatDate(dep.scheduledAt) : '—'}</div>
          <div className="text-xs text-zinc-500">{formatTime(dep.scheduledAt)}</div>
        </div>

        {/* Countdown */}
        <div className="text-right shrink-0 w-20">
          <CountdownCell scheduledAt={dep.scheduledAt} status={dep.status} />
        </div>

        {/* Do Now button */}
        {dep.cronPath && (
          <Button
            size="sm"
            variant={dep.status === 'ready' || dep.status === 'overdue' ? 'default' : 'outline'}
            className={`shrink-0 h-7 px-2 text-xs gap-1 ${
              dep.status === 'ready' ? 'bg-violet-700 hover:bg-violet-600' :
              dep.status === 'overdue' ? 'bg-red-700 hover:bg-red-600' :
              'border-zinc-700 text-zinc-300 hover:bg-zinc-700'
            }`}
            onClick={(e) => { e.stopPropagation(); dep.cronPath && onTrigger(dep.cronPath) }}
            disabled={isTrig}
            title="Run now"
          >
            {isTrig
              ? <RefreshCw className="w-3 h-3 animate-spin" />
              : <Play className="w-3 h-3" />}
            {isTrig ? 'Running…' : 'Do Now'}
          </Button>
        )}

        {/* Expand chevron */}
        <div className="shrink-0 text-zinc-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-l-2 border-l-zinc-800 bg-zinc-950/60 px-4 py-3 space-y-2">
          {dep.description && (
            <p className="text-sm text-zinc-300 leading-relaxed">{dep.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            {dep.category && (
              <span>Category: <span className="text-zinc-300 capitalize">{dep.category}</span></span>
            )}
            {dep.feedsInto && (
              <span>Feeds into: <span className="text-zinc-300">{dep.feedsInto}</span></span>
            )}
            {dep.successRate7d !== null && (
              <span>7-day success: <span className={dep.successRate7d >= 90 ? 'text-emerald-400' : dep.successRate7d >= 70 ? 'text-amber-400' : 'text-red-400'}>{dep.successRate7d}%</span></span>
            )}
            {dep.avgDurationMs != null && dep.avgDurationMs > 0 && (
              <span>Avg duration: <span className="text-zinc-300">{formatDuration(dep.avgDurationMs)}</span></span>
            )}
          </div>
          {dep.lastError && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              <div className="text-xs text-red-400 font-medium mb-0.5">Last error:</div>
              <div className="text-xs text-red-300">{dep.lastError}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline chain visualization
// ---------------------------------------------------------------------------

function PipelineChain({ departures }: { departures: Departure[] }) {
  // Match chain steps to actual departures for health status
  const getStepHealth = (key: string) => {
    const dep = departures.find(d => d.cronPath?.includes(key))
    if (!dep) return 'unknown'
    if (dep.lastRunStatus === 'failed') return 'failed'
    if (dep.lastRunStatus === 'success') return 'success'
    return 'unknown'
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="text-xs text-zinc-500 mb-3 font-medium">Content Pipeline Flow</div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_CHAIN.map((step, i) => {
            const health = getStepHealth(step.key)
            return (
              <React.Fragment key={step.key}>
                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                  health === 'success' ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300' :
                  health === 'failed'  ? 'border-red-800 bg-red-950/30 text-red-300' :
                                         'border-zinc-700 bg-zinc-800/50 text-zinc-400'
                }`}>
                  <span>{step.icon}</span>
                  <span className="whitespace-nowrap">{step.label}</span>
                </div>
                {i < PIPELINE_CHAIN.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Category group view
// ---------------------------------------------------------------------------

function CategoryGroupView({
  departures,
  onTrigger,
  triggering,
}: {
  departures: Departure[]
  onTrigger: (path: string) => void
  triggering: string | null
}) {
  const grouped = new Map<string, Departure[]>()
  for (const dep of departures) {
    const cat = dep.category ?? 'other'
    const list = grouped.get(cat) ?? []
    list.push(dep)
    grouped.set(cat, list)
  }

  // Sort categories by priority
  const catOrder = ['content', 'publishing', 'seo', 'analytics', 'maintenance', 'other']
  const sortedCats = Array.from(grouped.entries()).sort(
    (a, b) => catOrder.indexOf(a[0]) - catOrder.indexOf(b[0])
  )

  return (
    <div className="space-y-4">
      {sortedCats.map(([cat, deps]) => {
        const meta = CATEGORY_META[cat] ?? { label: cat, icon: '📋', color: 'text-zinc-400', border: 'border-zinc-700' }
        const failedCount = deps.filter(d => d.lastRunStatus === 'failed').length
        const overdueCount = deps.filter(d => d.status === 'overdue').length

        return (
          <div key={cat} className={`border rounded-xl ${meta.border} bg-zinc-900/50`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                <Badge className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400">{deps.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {overdueCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-red-900 text-red-300">{overdueCount} overdue</Badge>
                )}
                {failedCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-900 text-amber-300">{failedCount} failed</Badge>
                )}
              </div>
            </div>
            <div className="space-y-0.5 p-1">
              {deps.map(dep => (
                <DepartureRow key={dep.id} dep={dep} onTrigger={onTrigger} triggering={triggering} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DeparturesPage() {
  const [data, setData] = useState<DeparturesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [triggerResult, setTriggerResult] = useState<{ path: string; ok: boolean; msg: string } | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/departures')
      if (res.ok) setData(await res.json())
    } catch {
      console.warn('[departures] fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    if (autoRefresh) {
      refreshRef.current = setInterval(load, 60_000)
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [load, autoRefresh])

  const handleTrigger = useCallback(async (cronPath: string) => {
    setTriggering(cronPath)
    setTriggerResult(null)
    try {
      const res = await fetch('/api/admin/departures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronPath }),
      })
      const json = await res.json()
      setTriggerResult({
        path: cronPath,
        ok: json.triggered && json.statusCode < 400,
        msg: json.triggered
          ? `Triggered (HTTP ${json.statusCode})`
          : `Failed: ${json.error ?? 'Unknown'}`,
      })
      setTimeout(load, 2000)
    } catch (err) {
      setTriggerResult({ path: cronPath, ok: false, msg: String(err) })
    } finally {
      setTriggering(null)
    }
  }, [load])

  // Filter departures
  const departures = data?.departures ?? []
  const filtered = filter === 'all' ? departures
    : filter === 'overdue' ? departures.filter((d) => d.status === 'overdue')
    : filter === 'ready'   ? departures.filter((d) => d.status === 'ready')
    : departures.filter((d) => d.type === filter)

  const overdueCount = departures.filter((d) => d.status === 'overdue').length
  const readyCount   = departures.filter((d) => d.status === 'ready').length
  const failedCount  = departures.filter((d) => d.lastRunStatus === 'failed').length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Departures Board
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            All scheduled crons, publications, and ready content — tap to expand, &ldquo;Do Now&rdquo; to fire
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              onClick={() => setViewMode('timeline')}
              className={`text-xs px-2.5 py-1 ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >Timeline</button>
            <button
              onClick={() => setViewMode('category')}
              className={`text-xs px-2.5 py-1 ${viewMode === 'category' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >By Category</button>
          </div>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alert banners */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{overdueCount} overdue</span> — these should have run already.
            Tap &ldquo;Do Now&rdquo; to trigger manually.
          </p>
        </div>
      )}
      {readyCount > 0 && (
        <div className="flex items-center gap-3 bg-violet-950/40 border border-violet-800 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300">
            <span className="font-semibold">{readyCount} article{readyCount > 1 ? 's' : ''} ready</span> in
            reservoir — run &ldquo;Content Selector&rdquo; to publish them now.
          </p>
        </div>
      )}

      {/* Trigger result toast */}
      {triggerResult && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
          triggerResult.ok
            ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          {triggerResult.ok
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span className="text-sm">
            <span className="font-semibold">{triggerResult.path.split('/').pop()?.split('?')[0]}</span>:&nbsp;
            {triggerResult.msg}
          </span>
          <button className="ml-auto text-xs opacity-50 hover:opacity-100" onClick={() => setTriggerResult(null)}>✕</button>
        </div>
      )}

      {/* Pipeline chain visualization */}
      {data && <PipelineChain departures={departures} />}

      {/* Summary stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Total', value: departures.length, color: 'text-zinc-300' },
            { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-zinc-500' },
            { label: 'Ready', value: readyCount, color: readyCount > 0 ? 'text-violet-400' : 'text-zinc-500' },
            { label: 'Failed (7d)', value: failedCount, color: failedCount > 0 ? 'text-amber-400' : 'text-zinc-500' },
            { label: 'Scheduled', value: departures.filter(d => d.status === 'scheduled').length, color: 'text-blue-400' },
          ].map((s) => (
            <Card key={s.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter tabs (only in timeline view) */}
      {viewMode === 'timeline' && (
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'overdue', 'ready', 'cron', 'publication', 'content'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              {f === 'overdue' && overdueCount > 0 ? `${f} (${overdueCount})` :
               f === 'ready'   && readyCount > 0   ? `${f} (${readyCount})` :
               f}
            </button>
          ))}
        </div>
      )}

      {/* Departures list */}
      {loading && !data && (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading departures…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No {filter !== 'all' ? filter : ''} departures found.
        </div>
      )}

      {viewMode === 'timeline' ? (
        <div className="space-y-1.5">
          {filtered.map((dep) => (
            <DepartureRow
              key={dep.id}
              dep={dep}
              onTrigger={handleTrigger}
              triggering={triggering}
            />
          ))}
        </div>
      ) : (
        <CategoryGroupView
          departures={filtered}
          onTrigger={handleTrigger}
          triggering={triggering}
        />
      )}

      {/* Footer */}
      {data && (
        <p className="text-xs text-zinc-600 text-center">
          {departures.length} departures · refreshed {new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
          {autoRefresh && ' · auto-refreshing every 60s'}
        </p>
      )}
    </div>
  )
}
