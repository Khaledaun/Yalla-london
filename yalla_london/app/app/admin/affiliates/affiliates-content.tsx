'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Eye, Users, AlertCircle, Loader2, RefreshCw,
  Tag, BarChart3,
} from 'lucide-react'
import { StatusSummary } from '@/components/admin/status-summary'
import type { StatusCard } from '@/components/admin/status-summary'

// ── Types ───────────────────────────────────────────────────────────────────

interface AffiliatePartner {
  id: string
  name: string
  partner_type: string
  partner_name: string
  affiliate_url: string
  tracking_id?: string
  commission_rate?: number
  description?: string
  tags: string[]
  is_active: boolean
  clicks: number
  conversions: number
  revenue: number
  created_at: string
  last_clicked_at?: string
}

interface AffiliateStats {
  [key: string]: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotels',
  ticket: 'Tickets',
  restaurant: 'Restaurants',
  attraction: 'Attractions',
  experience: 'Experiences',
  shopping: 'Shopping',
  transport: 'Transport',
  car: 'Car Rental',
}

const TYPE_COLORS: Record<string, string> = {
  hotel: '#2563EB',
  ticket: '#D97706',
  restaurant: '#16A34A',
  attraction: '#7C3AED',
  experience: '#EC4899',
  shopping: '#EAB308',
  transport: '#0EA5E9',
  car: '#EF4444',
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AffiliatesContent() {
  const [affiliates, setAffiliates] = useState<AffiliatePartner[]>([])
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/affiliate-pool?limit=100')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAffiliates(data.affiliates || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Computed values ─────────────────────────────────────────────────────

  const totalClicks = useMemo(() => affiliates.reduce((s, a) => s + (a.clicks || 0), 0), [affiliates])
  const totalConversions = useMemo(() => affiliates.reduce((s, a) => s + (a.conversions || 0), 0), [affiliates])
  const totalRevenue = useMemo(() => affiliates.reduce((s, a) => s + (a.revenue || 0), 0), [affiliates])
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0'
  const activeCount = useMemo(() => affiliates.filter(a => a.is_active).length, [affiliates])
  const totalCount = affiliates.length

  const topPerformers = useMemo(() =>
    [...affiliates].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5),
    [affiliates]
  )

  const typeBreakdown = useMemo((): [string, number][] => {
    if (!stats) return []
    return (Object.entries(stats) as [string, number][])
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
  }, [stats])

  // ── Status cards ──────────────────────────────────────────────────────

  const statusCards: StatusCard[] = useMemo(() => [
    {
      heading: 'NOW',
      summary: activeCount > 0
        ? `${activeCount} active affiliate partners generating revenue`
        : 'No active affiliate partners. Add partners in the Pool tab.',
      metric: activeCount,
      detail: `of ${totalCount} total`,
      accent: activeCount > 0 ? 'green' as const : 'amber' as const,
    },
    {
      heading: 'REVENUE',
      summary: totalRevenue > 0
        ? `£${totalRevenue.toLocaleString()} earned from ${totalConversions} conversions`
        : 'No revenue tracked yet. Affiliate clicks will appear here.',
      metric: totalRevenue > 0 ? `£${totalRevenue.toLocaleString()}` : '—',
      detail: totalClicks > 0 ? `${conversionRate}% conversion rate` : undefined,
      accent: totalRevenue > 0 ? 'blue' as const : 'neutral' as const,
    },
    {
      heading: 'ATTENTION',
      summary: totalCount === 0
        ? 'No affiliate partners configured. Start by adding partners in the Pool tab.'
        : totalClicks === 0
          ? 'Partners exist but no clicks tracked. Check injection cron is running.'
          : `${totalClicks.toLocaleString()} total clicks across all partners`,
      metric: totalClicks > 0 ? totalClicks.toLocaleString() : '!',
      accent: totalCount === 0 ? 'red' as const : totalClicks === 0 ? 'amber' as const : 'green' as const,
    },
  ], [activeCount, totalCount, totalRevenue, totalConversions, totalClicks, conversionRate])

  // ── Render ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
          <AlertCircle style={{ width: 18, height: 18, color: '#C8322B' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#C8322B' }}>{error}</p>
            <button onClick={fetchData} className="mt-1 text-xs underline" style={{ color: '#C8322B' }}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Status triptych */}
      <StatusSummary cards={statusCards} loading={loading} />

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#6366F1',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
        >
          {loading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 style={{ width: 24, height: 24, color: '#6366F1' }} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: Eye, color: '#2563EB' },
              { label: 'Conversions', value: totalConversions.toLocaleString(), icon: Users, color: '#16A34A' },
              { label: 'Revenue', value: `£${totalRevenue.toLocaleString()}`, icon: DollarSign, color: '#D97706' },
              { label: 'Conv. Rate', value: `${conversionRate}%`, icon: TrendingUp, color: '#7C3AED' },
            ].map(kpi => (
              <div
                key={kpi.label}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon style={{ width: 14, height: 14, color: kpi.color }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {kpi.label}
                  </span>
                </div>
                <div style={{ fontFamily: "'Anybody', sans-serif", fontSize: 22, fontWeight: 800, color: '#1C1917' }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          {/* Type Breakdown */}
          {typeBreakdown.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 style={{ width: 14, height: 14, color: '#78716C' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                  Partners by Type
                </span>
              </div>
              <div className="space-y-2">
                {typeBreakdown.map(([type, count]) => {
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span style={{ fontSize: 11, color: '#44403C', width: 90 }}>
                        {TYPE_LABELS[type] || type}
                      </span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(120,113,108,0.1)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: TYPE_COLORS[type] || '#78716C' }}
                        />
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#78716C', width: 30, textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp style={{ width: 14, height: 14, color: '#16A34A' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                  Top Performers
                </span>
              </div>
              <div className="space-y-2">
                {topPerformers.map((partner, i) => (
                  <div
                    key={partner.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: i === 0 ? 'rgba(22,163,74,0.06)' : 'transparent' }}
                  >
                    <span style={{ fontFamily: "'Anybody', sans-serif", fontSize: 14, fontWeight: 800, color: '#78716C', width: 20, textAlign: 'center' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }} className="truncate">
                        {partner.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C' }}>
                          {TYPE_LABELS[partner.partner_type] || partner.partner_type}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C' }}>
                          {partner.clicks} clicks
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C' }}>
                          {partner.conversions} conv.
                        </span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Anybody', sans-serif", fontSize: 15, fontWeight: 700, color: '#16A34A' }}>
                      £{(partner.revenue || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {affiliates.length === 0 && (
            <div className="text-center py-12">
              <DollarSign style={{ width: 32, height: 32, color: '#A8A29E', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#44403C', marginBottom: 4 }}>
                No affiliate partners yet
              </p>
              <p style={{ fontSize: 12, color: '#78716C', maxWidth: 300, margin: '0 auto' }}>
                Add affiliate partners in the Pool tab to start tracking clicks, conversions, and revenue.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
