'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Ship,
  MessageSquare,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
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

const statusBadgeColor: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  sent_to_broker: 'bg-orange-100 text-orange-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

const statusLabel: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  sent_to_broker: 'Sent to Broker',
  booked: 'Booked',
  lost: 'Lost',
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
        if (res.status === 401 || res.status === 403) { setData(null); return }
        throw new Error('Failed to load analytics')
      }
      const json = await res.json()
      // Transform nested API response to flat AnalyticsData interface
      const fleet = json.fleet ?? {}
      const inq = json.inquiries ?? {}
      const dest = json.destinations ?? {}
      const rev = json.revenue ?? {}
      const recent = json.recentActivity ?? {}
      const byType = (fleet.byType ?? []).map((t: { type: string; _count: { id: number } }) => ({
        type: t.type, count: t._count?.id ?? 0,
      }))
      const byStatus = (inq.byStatus ?? []).map((s: { status: string; _count: { id: number } }) => ({
        status: s.status, count: s._count?.id ?? 0,
      }))
      const topDests = (dest.list ?? []).map((d: { name: string; yachtCount: number }) => ({
        name: d.name, yachtCount: d.yachtCount ?? 0,
      }))
      // Build funnel from inquiry statuses
      const funnelOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED']
      const funnelColors = ['#3B82F6', '#F59E0B', '#8B5CF6', '#F97316', '#22C55E']
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
          id: r.id, name: r.customerName ?? r.guestName ?? 'Guest',
          destination: r.destination ?? '', budget: Number(r.budget ?? 0),
          status: String(r.status ?? 'NEW'), date: String(r.createdAt ?? ''),
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
  // Skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-7 bg-gray-200 rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Error Loading Analytics</p>
            <p className="text-red-600 text-sm mt-2">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchAnalytics}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <Ship className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data available</h3>
          <p className="mt-1 text-sm text-gray-500">Data will appear once yachts and inquiries are in the system.</p>
        </div>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yacht Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Fleet performance and inquiry pipeline overview</p>
        </div>
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top Row Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fleet Size</p>
                <p className="text-2xl font-bold text-gray-900">{data.fleetSize}</p>
              </div>
              <Ship className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Inquiries</p>
                <p className="text-2xl font-bold text-orange-600">{data.activeInquiries}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">{data.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Charter Budget</p>
                <p className="text-2xl font-bold text-purple-600">{formatPrice(data.avgBudget, data.avgBudgetCurrency)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Yachts by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yachts by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {data.yachtsByType.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No yacht data available</p>
            ) : (
              <div className="space-y-3">
                {data.yachtsByType.map(item => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{item.type}</span>
                      <span className="text-gray-500">{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inquiries by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inquiries by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.inquiriesByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No inquiry data available</p>
            ) : (
              <div className="space-y-3">
                {data.inquiriesByStatus.map(item => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadgeColor[item.status] ?? 'bg-gray-100 text-gray-600'}>
                        {statusLabel[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex gap-1 h-6">
                    {data.inquiriesByStatus.map(item => {
                      const total = data.inquiriesByStatus.reduce((s, i) => s + i.count, 0)
                      const pct = total > 0 ? (item.count / total) * 100 : 0
                      if (pct === 0) return null
                      return (
                        <div
                          key={item.status}
                          className={`rounded ${item.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                          title={`${statusLabel[item.status] ?? item.status}: ${item.count}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Destinations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topDestinations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No destination data available</p>
            ) : (
              <div className="space-y-3">
                {data.topDestinations.map(dest => (
                  <div key={dest.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-gray-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {dest.name}
                      </span>
                      <span className="text-gray-500">{dest.yachtCount} yachts &middot; {dest.inquiryCount} inquiries</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${(dest.yachtCount / maxDestCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Pipeline / Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {data.funnel.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No pipeline data available</p>
            ) : (
              <div className="space-y-2">
                {data.funnel.map((stage, idx) => (
                  <div key={stage.label}>
                    <div className="flex items-center gap-2 mb-1">
                      {idx > 0 && <ArrowRight className="h-3 w-3 text-gray-300 -mt-1" />}
                      <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                      <span className="text-sm font-bold text-gray-900 ml-auto">{stage.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`${stage.color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${(stage.count / funnelMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentInquiries.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">No recent inquiries</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-medium">
                    <th className="p-2">Reference</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Destination</th>
                    <th className="p-2">Budget</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInquiries.map(inq => (
                    <tr key={inq.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-2">
                        <span className="font-mono text-xs text-gray-400">{inq.reference}</span>
                      </td>
                      <td className="p-2">
                        <div>
                          <span className="font-medium text-gray-900">{inq.name}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Mail className="h-3 w-3" />{inq.email}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="flex items-center gap-1 text-gray-700">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />{inq.destination}
                        </span>
                      </td>
                      <td className="p-2 font-medium text-gray-700">{formatPrice(inq.budget, inq.currency)}</td>
                      <td className="p-2">
                        <Badge className={statusBadgeColor[inq.status] ?? 'bg-gray-100 text-gray-600'}>
                          {statusLabel[inq.status] ?? inq.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />{formatDate(inq.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
