'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminSectionLabel,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'
import {
  Ship,
  MessageSquare,
  TrendingUp,
  DollarSign,
  RefreshCw,
  MapPin,
  ArrowRight,
  Clock,
  Mail,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface YachtsByType {
  type: string
  count: number
  percentage: number
}

interface InquiriesByStatus {
  status: string
  count: number
  color: string
}

interface TopDestination {
  name: string
  yachtCount: number
  inquiryCount: number
}

interface RecentInquiry {
  id: string
  reference: string
  name: string
  email: string
  destination: string
  budget: number
  currency: string
  status: string
  createdAt: string
}

interface FunnelStage {
  label: string
  count: number
  color: string
}

interface AnalyticsData {
  fleetSize: number
  activeInquiries: number
  conversionRate: number
  avgBudget: number
  avgBudgetCurrency: string
  yachtsByType: YachtsByType[]
  inquiriesByStatus: InquiriesByStatus[]
  topDestinations: TopDestination[]
  recentInquiries: RecentInquiry[]
  funnel: FunnelStage[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatPrice = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const statusMapping: Record<string, { adminStatus: string; label: string }> = {
  NEW: { adminStatus: 'pending', label: 'New' },
  CONTACTED: { adminStatus: 'warning', label: 'Contacted' },
  QUALIFIED: { adminStatus: 'generating', label: 'Qualified' },
  SENT_TO_BROKER: { adminStatus: 'promoting', label: 'Sent to Broker' },
  BOOKED: { adminStatus: 'success', label: 'Booked' },
  LOST: { adminStatus: 'rejected', label: 'Lost' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function YachtAnalyticsPage() {
  const siteId = useSiteId()

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/yachts/analytics?siteId=${siteId}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setData(null)
          setError('Authentication failed. Please log in to access analytics.')
          return
        }
        throw new Error('Failed to load analytics')
      }
      const json = await res.json()
      // Transform nested API response to flat AnalyticsData interface
      const fleet = json.fleet ?? {}
      const inq = json.inquiries ?? {}
      const dest = json.destinations ?? {}
      const rev = json.revenue ?? {}
      const recent = json.recentActivity ?? {}
      const rawByType = (fleet.byType ?? []).map((t: { type: string; _count: { id: number } }) => ({
        type: t.type, count: t._count?.id ?? 0,
      }))
      const totalTypeCount = rawByType.reduce((s: number, t: { count: number }) => s + t.count, 0)
      const byType = rawByType.map((t: { type: string; count: number }) => ({
        ...t,
        percentage: totalTypeCount > 0 ? Math.round((t.count / totalTypeCount) * 100) : 0,
      }))
      const statusColors: Record<string, string> = {
        NEW: 'bg-blue-500',
        CONTACTED: 'bg-yellow-500',
        QUALIFIED: 'bg-purple-500',
        SENT_TO_BROKER: 'bg-orange-500',
        BOOKED: 'bg-green-500',
        LOST: 'bg-red-400',
      }
      const byStatus = (inq.byStatus ?? []).map((s: { status: string; _count: { id: number } }) => ({
        status: s.status, count: s._count?.id ?? 0, color: statusColors[s.status] ?? 'bg-gray-400',
      }))
      const topDests = (dest.list ?? []).map((d: { name: string; yachtCount: number; inquiryCount?: number }) => ({
        name: d.name, yachtCount: d.yachtCount ?? 0, inquiryCount: d.inquiryCount ?? 0,
      }))
      // Build funnel from inquiry statuses
      const funnelOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED']
      const funnelColors = ['#3B7EA1', '#C49A2A', '#7C3AED', '#E97316', '#2D5A3D']
      const statusMap = Object.fromEntries(byStatus.map((s: { status: string; count: number }) => [s.status, s.count]))
      const funnel = funnelOrder.map((label, i) => ({
        label, count: statusMap[label] ?? 0, color: funnelColors[i],
      }))
      setData({
        fleetSize: fleet.total ?? 0,
        activeInquiries: inq.total ?? 0,
        conversionRate: inq.conversionRate ?? 0,
        avgBudget: rev.avgBudget ?? 0,
        avgBudgetCurrency: 'EUR',
        yachtsByType: byType,
        inquiriesByStatus: byStatus,
        topDestinations: topDests,
        recentInquiries: (recent.inquiries ?? []).map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ''),
          reference: String(r.referenceNumber ?? ''),
          name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Guest',
          email: String(r.email ?? ''),
          destination: String(r.destination ?? ''),
          budget: Number(r.budget ?? 0),
          currency: String(r.budgetCurrency ?? 'EUR'),
          status: String(r.status ?? 'NEW'),
          createdAt: String(r.createdAt ?? ''),
        })),
        funnel,
      })
    } catch (err) {
      console.warn('[yacht-analytics] fetch error:', err)
      setError('Unable to load analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminLoadingState label="Loading analytics" />
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Error
  // -----------------------------------------------------------------------

  if (error) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader title="Yacht Analytics" subtitle="Fleet performance and inquiry pipeline" />
        <AdminAlertBanner
          severity="critical"
          message="Error Loading Analytics"
          detail={error}
          action={
            <AdminButton variant="secondary" size="sm" onClick={fetchAnalytics}>
              Try Again
            </AdminButton>
          }
        />
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Empty
  // -----------------------------------------------------------------------

  if (!data) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader title="Yacht Analytics" subtitle="Fleet performance and inquiry pipeline" />
        <AdminEmptyState
          icon={Ship}
          title="No analytics data available"
          description="Data will appear once yachts and inquiries are in the system."
        />
      </div>
    )
  }

  const maxTypeCount = Math.max(...data.yachtsByType.map(t => t.count), 1)
  const maxDestCount = Math.max(...data.topDestinations.map(d => d.yachtCount), 1)
  const funnelMax = Math.max(...data.funnel.map(s => s.count), 1)

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Yacht Analytics"
        subtitle="Fleet performance and inquiry pipeline"
        action={
          <AdminButton variant="secondary" size="sm" onClick={fetchAnalytics}>
            <RefreshCw size={13} />
            Refresh
          </AdminButton>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard
          value={data.fleetSize}
          label="Fleet Size"
          color="#3B7EA1"
        />
        <AdminKPICard
          value={data.activeInquiries}
          label="Active Inquiries"
          color="#C49A2A"
        />
        <AdminKPICard
          value={`${data.conversionRate.toFixed(1)}%`}
          label="Conversion Rate"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={formatPrice(data.avgBudget, data.avgBudgetCurrency)}
          label="Avg Charter Budget"
          color="#C8322B"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Yachts by Type */}
        <AdminCard>
          <div className="p-4">
            <AdminSectionLabel>Yachts by Type</AdminSectionLabel>
            {data.yachtsByType.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                  color: '#A8A29E',
                  textAlign: 'center',
                  padding: '24px 0',
                }}
              >
                No yacht data available
              </p>
            ) : (
              <div className="space-y-3">
                {data.yachtsByType.map(item => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#44403C',
                        }}
                      >
                        {item.type}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                        }}
                      >
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full"
                      style={{ height: 6, backgroundColor: 'rgba(59,126,161,0.12)' }}
                    >
                      <div
                        className="rounded-full transition-all duration-500"
                        style={{
                          height: 6,
                          width: `${(item.count / maxTypeCount) * 100}%`,
                          backgroundColor: '#3B7EA1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* Inquiries by Status */}
        <AdminCard>
          <div className="p-4">
            <AdminSectionLabel>Inquiries by Status</AdminSectionLabel>
            {data.inquiriesByStatus.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                  color: '#A8A29E',
                  textAlign: 'center',
                  padding: '24px 0',
                }}
              >
                No inquiry data available
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.inquiriesByStatus.map(item => {
                  const mapping = statusMapping[item.status]
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <AdminStatusBadge
                        status={mapping?.adminStatus ?? 'inactive'}
                        label={mapping?.label ?? item.status}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#1C1917',
                        }}
                      >
                        {item.count}
                      </span>
                    </div>
                  )
                })}
                {/* Stacked bar */}
                <div style={{ paddingTop: 8, borderTop: '1px solid rgba(214,208,196,0.5)' }}>
                  <div className="flex gap-0.5 rounded-full overflow-hidden" style={{ height: 8 }}>
                    {data.inquiriesByStatus.map(item => {
                      const total = data.inquiriesByStatus.reduce((s, i) => s + i.count, 0)
                      const pct = total > 0 ? (item.count / total) * 100 : 0
                      if (pct === 0) return null
                      const barColors: Record<string, string> = {
                        NEW: '#3B7EA1',
                        CONTACTED: '#C49A2A',
                        QUALIFIED: '#7C3AED',
                        SENT_TO_BROKER: '#E97316',
                        BOOKED: '#2D5A3D',
                        LOST: '#C8322B',
                      }
                      return (
                        <div
                          key={item.status}
                          className="transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColors[item.status] ?? '#A8A29E',
                          }}
                          title={`${statusMapping[item.status]?.label ?? item.status}: ${item.count}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </AdminCard>

        {/* Top Destinations */}
        <AdminCard>
          <div className="p-4">
            <AdminSectionLabel>Top Destinations</AdminSectionLabel>
            {data.topDestinations.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                  color: '#A8A29E',
                  textAlign: 'center',
                  padding: '24px 0',
                }}
              >
                No destination data available
              </p>
            ) : (
              <div className="space-y-3">
                {data.topDestinations.map(dest => (
                  <div key={dest.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="flex items-center gap-1.5"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#44403C',
                        }}
                      >
                        <MapPin size={13} color="#A8A29E" />
                        {dest.name}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                        }}
                      >
                        {dest.yachtCount} yachts &middot; {dest.inquiryCount} inquiries
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full"
                      style={{ height: 6, backgroundColor: 'rgba(45,90,61,0.12)' }}
                    >
                      <div
                        className="rounded-full transition-all duration-500"
                        style={{
                          height: 6,
                          width: `${(dest.yachtCount / maxDestCount) * 100}%`,
                          backgroundColor: '#2D5A3D',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* Revenue Pipeline / Funnel */}
        <AdminCard accent accentColor="gold">
          <div className="p-4">
            <AdminSectionLabel>Revenue Pipeline</AdminSectionLabel>
            {data.funnel.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                  color: '#A8A29E',
                  textAlign: 'center',
                  padding: '24px 0',
                }}
              >
                No pipeline data available
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.funnel.map((stage, idx) => (
                  <div key={stage.label}>
                    <div className="flex items-center gap-2 mb-1">
                      {idx > 0 && <ArrowRight size={11} color="#A8A29E" />}
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#44403C',
                        }}
                      >
                        {statusMapping[stage.label]?.label ?? stage.label}
                      </span>
                      <span
                        className="ml-auto"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#1C1917',
                        }}
                      >
                        {stage.count}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full"
                      style={{ height: 8, backgroundColor: `${stage.color}18` }}
                    >
                      <div
                        className="rounded-full transition-all duration-500"
                        style={{
                          height: 8,
                          width: `${(stage.count / funnelMax) * 100}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {/* Recent Inquiries Table */}
      <AdminCard>
        <div className="p-4">
          <AdminSectionLabel>Recent Inquiries</AdminSectionLabel>
          {data.recentInquiries.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquare}
              title="No recent inquiries"
              description="Inquiries will appear here as they come in."
            />
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(214,208,196,0.5)',
                      textAlign: 'left',
                    }}
                  >
                    {['Reference', 'Name', 'Destination', 'Budget', 'Status', 'Date'].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 8px',
                          fontFamily: 'var(--font-system)',
                          fontSize: 9,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1.2px',
                          color: '#A8A29E',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentInquiries.map(inq => {
                    const mapping = statusMapping[inq.status]
                    return (
                      <tr
                        key={inq.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(250,248,244,0.6)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 10,
                              color: '#A8A29E',
                            }}
                          >
                            {inq.reference}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1C1917' }}>{inq.name}</span>
                            <span
                              className="flex items-center gap-1 mt-0.5"
                              style={{ fontSize: 10, color: '#78716C' }}
                            >
                              <Mail size={10} />{inq.email}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            className="flex items-center gap-1"
                            style={{ color: '#44403C' }}
                          >
                            <MapPin size={12} color="#A8A29E" />{inq.destination}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#44403C' }}>
                          {formatPrice(inq.budget, inq.currency)}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <AdminStatusBadge
                            status={mapping?.adminStatus ?? 'inactive'}
                            label={mapping?.label ?? inq.status}
                          />
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            className="flex items-center gap-1"
                            style={{ color: '#78716C', fontSize: 11 }}
                          >
                            <Clock size={12} />{formatDate(inq.createdAt)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
