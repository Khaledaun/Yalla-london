'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Play, Clock, CheckCircle, AlertTriangle, ArrowRight, Zap } from 'lucide-react'

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
}

interface DeparturesData {
  departures: Departure[]
  generatedAt: string
  totalCrons: number
  totalPublications: number
  totalReady: number
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

const TYPE_COLORS: Record<string, string> = {
  cron:        'border-l-blue-500',
  publication: 'border-l-emerald-500',
  content:     'border-l-violet-500',
  audit:       'border-l-yellow-500',
}

const SITE_SHORT: Record<string, string> = {
  'yalla-london':        'YL',
  'arabaldives':         'AR',
  'french-riviera':      'RV',
  'istanbul':            'IS',
  'thailand':            'TH',
  'zenitha-yachts-med':  'ZY',
}

// ---------------------------------------------------------------------------
// Animated countdown cell — ticks every second
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
// Departure Row
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
  const isTrig = triggering === dep.cronPath
  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 border-l-2
      ${TYPE_COLORS[dep.type] ?? 'border-l-zinc-700'}
      ${dep.status === 'overdue' ? 'bg-red-950/20' : 'bg-zinc-900/80'}
      hover:bg-zinc-800/50 transition-colors rounded-r-lg
    `}>
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

      {/* Label + schedule */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-100 truncate">{dep.label}</span>
          {dep.siteId && (
            <Badge className="text-[10px] px-1 py-0 bg-zinc-800 text-zinc-400">
              {SITE_SHORT[dep.siteId] ?? dep.siteId}
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
          onClick={() => dep.cronPath && onTrigger(dep.cronPath)}
          disabled={isTrig}
          title="Run now"
        >
          {isTrig
            ? <RefreshCw className="w-3 h-3 animate-spin" />
            : <Play className="w-3 h-3" />}
          {isTrig ? 'Running…' : 'Do Now'}
        </Button>
      )}
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
  const [filter, setFilter] = useState<'all' | 'cron' | 'publication' | 'content' | 'overdue' | 'ready'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/departures')
      if (res.ok) setData(await res.json())
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    if (autoRefresh) {
      refreshRef.current = setInterval(load, 60_000) // refresh departures list every minute
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
      // Refresh data after trigger
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

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            ✈️ Departures Board
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            All upcoming crons, publications, and ready content — tap "Do Now" to fire immediately
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            Tap "Do Now" to trigger manually.
          </p>
        </div>
      )}
      {readyCount > 0 && (
        <div className="flex items-center gap-3 bg-violet-950/40 border border-violet-800 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300">
            <span className="font-semibold">{readyCount} article{readyCount > 1 ? 's' : ''} ready</span> in
            reservoir — run "Content Selector" to publish them now.
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

      {/* Summary stats */}
      {data && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: departures.length, color: 'text-zinc-300' },
            { label: 'Overdue', value: overdueCount, color: 'text-red-400' },
            { label: 'Ready', value: readyCount, color: 'text-violet-400' },
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

      {/* Filter tabs */}
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
            {f === 'overdue' && overdueCount > 0 ? `⚠ ${f} (${overdueCount})` :
             f === 'ready'   && readyCount > 0   ? `● ${f} (${readyCount})` :
             f}
          </button>
        ))}
      </div>

      {/* Departures list */}
      {loading && !data && (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading departures…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No {filter !== 'all' ? filter : ''} departures found.
        </div>
      )}

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
