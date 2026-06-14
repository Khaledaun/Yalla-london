'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminSectionLabel,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'
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
  grok: '#2D5A3D',
  claude: '#7C3AED',
  openai: '#3B7EA1',
  gemini: '#C49A2A',
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
function Bar({ value, max, color = '#3B7EA1' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(214,208,196,0.3)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-system)',
          fontSize: 10,
          color: '#78716C',
          width: 32,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiCostsPage() {
  const siteId = useSiteId()
  const [data, setData] = useState<AiCostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('month')
  const [scopeToSite, setScopeToSite] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period })
      if (scopeToSite && siteId) params.set('siteId', siteId)
      const res = await fetch(`/api/admin/ai-costs?${params}`)
      if (res.ok) setData(await res.json())
      else setError('Failed to load AI cost data')
    } catch {
      setError('Network error loading AI costs')
    } finally {
      setLoading(false)
    }
  }, [period, scopeToSite, siteId])

  useEffect(() => { load() }, [load])

  const maxSiteCost = data ? Math.max(...data.bySite.map((s) => s.estimatedCostUsd), 0.000001) : 1
  const maxProviderCost = data ? Math.max(...data.byProvider.map((p) => p.estimatedCostUsd), 0.000001) : 1
  const maxTaskCost = data ? Math.max(...data.byTask.map((t) => t.estimatedCostUsd), 0.000001) : 1

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <AdminPageHeader
          title="AI Costs & Token Usage"
          subtitle="Per-site cost separation — real API data only"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="admin-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
                <option value="all">All time</option>
              </select>
              <AdminButton
                variant={scopeToSite ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setScopeToSite(!scopeToSite)}
              >
                <Globe className="w-3.5 h-3.5" />
                {scopeToSite ? 'This site' : 'All sites'}
              </AdminButton>
              <AdminButton variant="ghost" size="sm" onClick={load} loading={loading}>
                <RefreshCw className="w-3.5 h-3.5" />
              </AdminButton>
            </div>
          }
        />

        {/* Error state */}
        {error && (
          <AdminAlertBanner
            severity="critical"
            message={error}
            onDismiss={() => setError(null)}
            action={
              <AdminButton variant="secondary" size="sm" onClick={load}>
                Retry
              </AdminButton>
            }
          />
        )}

        {/* Loading state */}
        {loading && !data && <AdminLoadingState label="Loading AI costs..." />}

        {/* Empty state */}
        {!loading && data?.totals.calls === 0 && (
          <AdminEmptyState
            icon={Zap}
            title="No AI calls recorded yet"
            description="Token usage is tracked automatically from the next AI call. Try generating content."
          />
        )}

        {data && data.totals.calls > 0 && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AdminKPICard
                value={fmt$(data.totals.estimatedCostUsd)}
                label="Total spend"
                color="#2D5A3D"
              />
              <AdminKPICard
                value={fmtTokens(data.totals.totalTokens)}
                label="Total tokens"
                color="#3B7EA1"
              />
              <AdminKPICard
                value={data.totals.calls.toLocaleString()}
                label="API calls"
                color="#1C1917"
              />
              <AdminKPICard
                value={`${data.totals.successRate}%`}
                label="Success rate"
                color={
                  data.totals.successRate >= 95 ? '#2D5A3D' :
                  data.totals.successRate >= 80 ? '#C49A2A' :
                  '#C8322B'
                }
              />
            </div>

            {/* Daily spend bar chart */}
            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} style={{ color: '#3B7EA1' }} />
                <AdminSectionLabel>Daily spend (last 30 days)</AdminSectionLabel>
              </div>
              <div className="flex items-end gap-0.5 h-16 overflow-hidden">
                {data.daily.map((d) => {
                  const maxDay = Math.max(...data.daily.map((x) => x.estimatedCostUsd), 0.000001)
                  const h = Math.max((d.estimatedCostUsd / maxDay) * 48, d.estimatedCostUsd > 0 ? 2 : 0)
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div
                        className="w-full rounded-t transition-opacity cursor-default opacity-70 group-hover:opacity-100"
                        style={{ height: h, backgroundColor: '#3B7EA1' }}
                        title={`${d.date}: ${fmt$(d.estimatedCostUsd)} · ${fmtTokens(d.totalTokens)} tokens`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                  30 days ago
                </span>
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                  Today
                </span>
              </div>
            </AdminCard>

            {/* Three-column breakdown */}
            <div className="grid md:grid-cols-3 gap-4">

              {/* Cost by site */}
              <AdminCard accent accentColor="green">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={14} style={{ color: '#2D5A3D' }} />
                  <AdminSectionLabel>Cost by site</AdminSectionLabel>
                </div>
                {data.bySite.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#A8A29E' }}>
                    No data
                  </p>
                )}
                <div className="space-y-4">
                  {data.bySite.map((s) => (
                    <div key={s.siteId} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C' }}>
                          {SITE_LABELS[s.siteId] ?? s.siteId}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#2D5A3D' }}>
                          {fmt$(s.estimatedCostUsd)}
                        </span>
                      </div>
                      <Bar value={s.estimatedCostUsd} max={maxSiteCost} color="#2D5A3D" />
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                        {fmtTokens(s.totalTokens)} tokens · {s.calls} calls
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* Cost by provider */}
              <AdminCard accent accentColor="blue">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} style={{ color: '#3B7EA1' }} />
                  <AdminSectionLabel>Cost by provider</AdminSectionLabel>
                </div>
                <div className="space-y-4">
                  {data.byProvider.map((p) => (
                    <div key={p.provider} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: PROVIDER_COLORS[p.provider] ?? '#44403C',
                              textTransform: 'capitalize',
                            }}
                          >
                            {p.provider}
                          </span>
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            {p.models[0]}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#2D5A3D' }}>
                          {fmt$(p.estimatedCostUsd)}
                        </span>
                      </div>
                      <Bar value={p.estimatedCostUsd} max={maxProviderCost} color={PROVIDER_COLORS[p.provider] ?? '#3B7EA1'} />
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                        {fmtTokens(p.totalTokens)} tokens · {p.calls} calls
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>

              {/* Cost by task */}
              <AdminCard accent accentColor="gold">
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={14} style={{ color: '#C49A2A' }} />
                  <AdminSectionLabel>Cost by task</AdminSectionLabel>
                </div>
                <div className="space-y-4">
                  {data.byTask.map((t) => (
                    <div key={t.taskType} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#44403C',
                            textTransform: 'capitalize',
                          }}
                        >
                          {t.taskType.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#2D5A3D' }}>
                          {fmt$(t.estimatedCostUsd)}
                        </span>
                      </div>
                      <Bar value={t.estimatedCostUsd} max={maxTaskCost} color="#C49A2A" />
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                        {fmtTokens(t.totalTokens)} tokens · {t.calls} calls
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>

            {/* Token breakdown */}
            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} style={{ color: '#3B7EA1' }} />
                <AdminSectionLabel>Token breakdown</AdminSectionLabel>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 20,
                      color: '#1C1917',
                    }}
                  >
                    {fmtTokens(data.totals.promptTokens)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
                    Input tokens
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 20,
                      color: '#1C1917',
                    }}
                  >
                    {fmtTokens(data.totals.completionTokens)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
                    Output tokens
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: 20,
                      color: '#1C1917',
                    }}
                  >
                    {data.totals.promptTokens > 0
                      ? `${Math.round((data.totals.completionTokens / data.totals.promptTokens) * 10) / 10}x`
                      : '\u2014'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
                    Output/input ratio
                  </div>
                </div>
              </div>
            </AdminCard>

            {/* Recent calls live feed */}
            <AdminCard>
              <AdminSectionLabel>Recent calls (last 50)</AdminSectionLabel>
              <div className="space-y-1.5 max-h-96 overflow-y-auto mt-3">
                {data.recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="admin-card-inset flex items-center gap-3 p-2.5 rounded-lg"
                    style={
                      call.success
                        ? undefined
                        : {
                            backgroundColor: 'rgba(200,50,43,0.04)',
                            border: '1px solid rgba(200,50,43,0.15)',
                          }
                    }
                  >
                    {call.success
                      ? <CheckCircle size={14} style={{ color: '#2D5A3D', flexShrink: 0 }} />
                      : <XCircle size={14} style={{ color: '#C8322B', flexShrink: 0 }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: PROVIDER_COLORS[call.provider] ?? '#44403C',
                            textTransform: 'capitalize',
                          }}
                        >
                          {call.provider}
                        </span>
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          {call.model}
                        </span>
                        {call.taskType && (
                          <AdminStatusBadge
                            status="active"
                            label={call.taskType.replace(/_/g, ' ')}
                          />
                        )}
                        {call.calledFrom && (
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            {call.calledFrom}
                          </span>
                        )}
                        <AdminStatusBadge
                          status="inactive"
                          label={SITE_LABELS[call.siteId] ?? call.siteId}
                        />
                      </div>
                      {call.errorMessage && (
                        <div
                          className="truncate mt-0.5"
                          style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C8322B' }}
                        >
                          {call.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: '#2D5A3D' }}>
                        {fmt$(call.estimatedCostUsd)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                        {fmtTokens(call.totalTokens)} tok
                      </div>
                    </div>
                    <div
                      className="shrink-0 hidden md:block"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}
                    >
                      {new Date(call.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </>
        )}
      </div>
    </div>
  )
}
