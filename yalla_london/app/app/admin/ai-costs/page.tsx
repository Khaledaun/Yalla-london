'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  Zap,
  TrendingUp,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Globe,
  Layers,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Totals {
  calls: number
  successCalls: number
  successRate: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

interface SiteRow {
  siteId: string
  calls: number
  totalTokens: number
  estimatedCostUsd: number
}

interface ProviderRow {
  provider: string
  calls: number
  totalTokens: number
  estimatedCostUsd: number
  models: string[]
}

interface TaskRow {
  taskType: string
  calls: number
  totalTokens: number
  estimatedCostUsd: number
}

interface DailyRow {
  date: string
  calls: number
  totalTokens: number
  estimatedCostUsd: number
}

interface RecentCall {
  id: string
  siteId: string
  provider: string
  model: string
  taskType: string | null
  calledFrom: string | null
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  success: boolean
  errorMessage: string | null
  createdAt: string
}

interface AiCostsData {
  period: string
  since: string
  totals: Totals
  bySite: SiteRow[]
  byProvider: ProviderRow[]
  byTask: TaskRow[]
  daily: DailyRow[]
  recentCalls: RecentCall[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt$ = (v: number) =>
  v < 0.001 ? `< $0.001` : `$${v.toFixed(v < 1 ? 4 : 2)}`

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` :
  String(n)

const PROVIDER_COLORS: Record<string, string> = {
  grok: 'text-emerald-400',
  claude: 'text-violet-400',
  openai: 'text-blue-400',
  gemini: 'text-yellow-400',
}

const SITE_LABELS: Record<string, string> = {
  'yalla-london': 'Yalla London',
  'arabaldives': 'Arabaldives',
  'french-riviera': 'Yalla Riviera',
  'istanbul': 'Yalla Istanbul',
  'thailand': 'Yalla Thailand',
  'zenitha-yachts-med': 'Zenitha Yachts',
  'unknown': 'Untagged',
}

// Mini bar: max-width bar relative to the largest value in the group
function Bar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

// Sparkline using SVG
function Sparkline({ data, height = 32 }: { data: number[]; height?: number }) {
  if (data.length < 2) return <div className="h-8 bg-zinc-900 rounded" />
  const max = Math.max(...data, 0.000001)
  const w = 120
  const h = height
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        points={pts.join(' ')}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiCostsPage() {
  const siteId = useSiteId()
  const [data, setData] = useState<AiCostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [scopeToSite, setScopeToSite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (scopeToSite && siteId) params.set('siteId', siteId)
      const res = await fetch(`/api/admin/ai-costs?${params}`)
      if (res.ok) setData(await res.json())
    } catch {
      // ignore — leave previous data visible
    } finally {
      setLoading(false)
    }
  }, [period, scopeToSite, siteId])

  useEffect(() => { load() }, [load])

  const maxSiteCost = data ? Math.max(...data.bySite.map((s) => s.estimatedCostUsd), 0.000001) : 1
  const maxProviderCost = data ? Math.max(...data.byProvider.map((p) => p.estimatedCostUsd), 0.000001) : 1
  const maxTaskCost = data ? Math.max(...data.byTask.map((t) => t.estimatedCostUsd), 0.000001) : 1

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            AI Costs & Token Usage
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Per-site cost separation · real API data only</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-zinc-200 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={scopeToSite ? 'default' : 'outline'}
            size="sm"
            onClick={() => setScopeToSite(!scopeToSite)}
            className="text-xs"
          >
            <Globe className="w-3.5 h-3.5 mr-1" />
            {scopeToSite ? 'This site only' : 'All sites'}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* No data state */}
      {!loading && data?.totals.calls === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <Zap className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-300 font-medium">No AI calls recorded yet</p>
          <p className="text-zinc-500 text-sm mt-1">
            Token usage is tracked automatically from the next AI call. Try generating content.
          </p>
        </div>
      )}

      {data && data.totals.calls > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-400">{fmt$(data.totals.estimatedCostUsd)}</div>
                <div className="text-xs text-zinc-500 mt-1">Total spend</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400">{fmtTokens(data.totals.totalTokens)}</div>
                <div className="text-xs text-zinc-500 mt-1">Total tokens</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-white">{data.totals.calls.toLocaleString()}</div>
                <div className="text-xs text-zinc-500 mt-1">API calls</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${data.totals.successRate >= 95 ? 'text-emerald-400' : data.totals.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {data.totals.successRate}%
                </div>
                <div className="text-xs text-zinc-500 mt-1">Success rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Sparkline — daily spend trend */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Daily spend (last 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-0.5 h-16 overflow-hidden">
                {data.daily.map((d) => {
                  const maxDay = Math.max(...data.daily.map((x) => x.estimatedCostUsd), 0.000001)
                  const h = Math.max((d.estimatedCostUsd / maxDay) * 48, d.estimatedCostUsd > 0 ? 2 : 0)
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div
                        className="w-full bg-blue-600 rounded-t opacity-80 group-hover:opacity-100 transition-opacity cursor-default"
                        style={{ height: h }}
                        title={`${d.date}: ${fmt$(d.estimatedCostUsd)} · ${fmtTokens(d.totalTokens)} tokens`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Cost by site */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Cost by site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.bySite.length === 0 && (
                  <p className="text-xs text-zinc-500">No data</p>
                )}
                {data.bySite.map((s) => (
                  <div key={s.siteId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-300">{SITE_LABELS[s.siteId] ?? s.siteId}</span>
                      <span className="text-xs font-mono text-emerald-400">{fmt$(s.estimatedCostUsd)}</span>
                    </div>
                    <Bar value={s.estimatedCostUsd} max={maxSiteCost} color="bg-emerald-600" />
                    <div className="text-xs text-zinc-600">{fmtTokens(s.totalTokens)} tokens · {s.calls} calls</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cost by provider */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  Cost by provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.byProvider.map((p) => (
                  <div key={p.provider} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium capitalize ${PROVIDER_COLORS[p.provider] ?? 'text-zinc-300'}`}>
                          {p.provider}
                        </span>
                        <span className="text-xs text-zinc-600">{p.models[0]}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{fmt$(p.estimatedCostUsd)}</span>
                    </div>
                    <Bar value={p.estimatedCostUsd} max={maxProviderCost} color="bg-violet-600" />
                    <div className="text-xs text-zinc-600">{fmtTokens(p.totalTokens)} tokens · {p.calls} calls</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cost by task */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-yellow-400" />
                  Cost by task
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.byTask.map((t) => (
                  <div key={t.taskType} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-300 capitalize">{t.taskType.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-mono text-emerald-400">{fmt$(t.estimatedCostUsd)}</span>
                    </div>
                    <Bar value={t.estimatedCostUsd} max={maxTaskCost} color="bg-yellow-600" />
                    <div className="text-xs text-zinc-600">{fmtTokens(t.totalTokens)} tokens · {t.calls} calls</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Token breakdown */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Token breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-zinc-200">{fmtTokens(data.totals.promptTokens)}</div>
                  <div className="text-xs text-zinc-500">Input tokens</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-zinc-200">{fmtTokens(data.totals.completionTokens)}</div>
                  <div className="text-xs text-zinc-500">Output tokens</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-zinc-200">
                    {data.totals.promptTokens > 0
                      ? `${Math.round((data.totals.completionTokens / data.totals.promptTokens) * 10) / 10}×`
                      : '—'}
                  </div>
                  <div className="text-xs text-zinc-500">Output/input ratio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent calls live feed */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Recent calls (last 50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {data.recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`flex items-center gap-3 p-2 rounded-lg text-xs ${call.success ? 'bg-zinc-800/50' : 'bg-red-950/30 border border-red-900/30'}`}
                  >
                    {call.success
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium capitalize ${PROVIDER_COLORS[call.provider] ?? 'text-zinc-300'}`}>
                          {call.provider}
                        </span>
                        <span className="text-zinc-500">{call.model}</span>
                        {call.taskType && (
                          <Badge className="bg-zinc-700 text-zinc-300 text-[10px] px-1 py-0">
                            {call.taskType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {call.calledFrom && (
                          <span className="text-zinc-600">{call.calledFrom}</span>
                        )}
                        <Badge className="bg-zinc-800 text-zinc-400 text-[10px] px-1 py-0">
                          {SITE_LABELS[call.siteId] ?? call.siteId}
                        </Badge>
                      </div>
                      {call.errorMessage && (
                        <div className="text-red-400 mt-0.5 truncate">{call.errorMessage}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-mono">{fmt$(call.estimatedCostUsd)}</div>
                      <div className="text-zinc-600">{fmtTokens(call.totalTokens)} tok</div>
                    </div>
                    <div className="text-zinc-600 text-[10px] shrink-0 hidden md:block">
                      {new Date(call.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
