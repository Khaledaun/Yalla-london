'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Ship,
  CheckCircle,
  Star,
  Clock,
  Plus,
  RefreshCw,
  Download,
  Search,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Yacht {
  id: string
  name: string
  type: string
  length: number | null
  cabins: number
  berths: number
  crewSize: number
  pricePerWeekLow: number | null
  pricePerWeekHigh: number | null
  currency: string
  rating: number | null
  status: string
  featured: boolean
  destination: { id: string; name: string; slug: string; region: string } | null
  builder: string | null
  yearBuilt: number | null
  heroImage?: string
  createdAt: string
  updatedAt: string
}

interface YachtSummary {
  total: number
  active: number
  featured: number
  pendingReview: number
}

interface YachtResponse {
  yachts: Yacht[]
  summary: YachtSummary
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const YACHT_TYPES = ['All Types', 'MOTOR_YACHT', 'SAILING_YACHT', 'CATAMARAN', 'GULET', 'EXPLORER', 'CLASSIC']
const YACHT_TYPE_LABELS: Record<string, string> = {
  'All Types': 'All Types', MOTOR_YACHT: 'Motor Yacht', SAILING_YACHT: 'Sailing Yacht',
  CATAMARAN: 'Catamaran', GULET: 'Gulet', EXPLORER: 'Explorer', CLASSIC: 'Classic',
}
const STATUSES = ['All Statuses', 'active', 'inactive', 'draft']

const formatPrice = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-100 text-yellow-800',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function YachtsFleetPage() {
  const siteId = useSiteId()

  // Data — hooks MUST be called unconditionally (React rules-of-hooks)
  const [yachts, setYachts] = useState<Yacht[]>([])
  const [summary, setSummary] = useState<YachtSummary>({ total: 0, active: 0, featured: 0, pendingReview: 0 })
  const [totalPages, setTotalPages] = useState(1)
  const [destinations, setDestinations] = useState<{ id: string; name: string }[]>([])

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All Types')
  const [status, setStatus] = useState('All Statuses')
  const [destinationId, setDestinationId] = useState('')
  const [page, setPage] = useState(1)

  const isYachtSite = siteId === 'zenitha-yachts-med'

  // Load destinations for filter dropdown
  useEffect(() => {
    if (!isYachtSite) return
    fetch(`/api/admin/yachts/destinations?siteId=${siteId}`)
      .then(r => r.ok ? r.json() : { destinations: [] })
      .then(d => setDestinations(d.destinations ?? []))
      .catch(() => setDestinations([]))
  }, [siteId, isYachtSite])

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchYachts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ siteId, page: String(page) })
      if (search) params.set('search', search)
      if (type !== 'All Types') params.set('type', type)
      if (status !== 'All Statuses') params.set('status', status)
      if (destinationId) params.set('destinationId', destinationId)

      const res = await fetch(`/api/admin/yachts?${params}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setYachts([])
          setError('Authentication failed. Please log in to access fleet data.')
          return
        }
        throw new Error('Failed to load fleet data')
      }

      const data: YachtResponse = await res.json()
      setYachts(data.yachts ?? [])
      setSummary(data.summary ?? { total: 0, active: 0, featured: 0, pendingReview: 0 })
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch (err) {
      console.warn('[yachts-fleet] fetch error:', err)
      setError('Unable to load fleet data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [siteId, page, search, type, status, destinationId])

  useEffect(() => { if (isYachtSite) fetchYachts() }, [fetchYachts, isYachtSite])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, type, status, destinationId])

  // Guard: yacht management is only for the Zenitha Yachts site
  if (!isYachtSite) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <Ship className="w-16 h-16 text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-200">Yacht Management — Zenitha Yachts Only</h2>
        <p className="text-zinc-400 max-w-md">
          The fleet inventory, charter inquiries, and yacht-specific tools are exclusive to the{' '}
          <span className="text-white font-medium">Zenitha Yachts</span> site. Switch to Zenitha Yachts in
          the site selector to access these tools.
        </p>
        <Link href="/admin/cockpit">
          <Button variant="outline" className="mt-2">Back to Cockpit</Button>
        </Link>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch(`/api/admin/yachts/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId }) })
      await fetchYachts()
    } catch {
      console.warn('[yachts-fleet] sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = () => {
    const header = ['Name', 'Type', 'Length (m)', 'Cabins', 'Berths', 'Price Low', 'Price High', 'Status', 'Destination']
    const rows = yachts.map(y => [y.name, y.type, y.length ?? '', y.cabins, y.berths, y.pricePerWeekLow ?? '', y.pricePerWeekHigh ?? '', y.status, y.destination?.name ?? ''])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleet-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b">
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
        </tr>
      ))}
    </>
  )

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your yacht fleet across all destinations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/yachts/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Yacht
            </Button>
          </Link>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Fleet'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Yachts</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <Ship className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{summary.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Featured</p>
                <p className="text-2xl font-bold text-amber-600">{summary.featured}</p>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{summary.pendingReview}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search yachts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {YACHT_TYPES.map(t => <SelectItem key={t} value={t}>{YACHT_TYPE_LABELS[t] ?? t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'All Statuses' ? s : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Destinations</SelectItem>
                {destinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Yacht Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet ({yachts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-800 font-medium">Error Loading Fleet</p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchYachts}>Try Again</Button>
              </div>
            </div>
          ) : !loading && yachts.length === 0 ? (
            <div className="text-center py-12">
              <Ship className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No yachts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || type !== 'All Types' || status !== 'All Statuses' || destinationId
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first yacht to the fleet.'}
              </p>
              <Link href="/admin/yachts/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Yacht
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-medium">
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Length</th>
                    <th className="p-3">Cabins</th>
                    <th className="p-3">Price Range</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    yachts.map(yacht => (
                      <tr key={yacht.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {yacht.featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                            <span className="font-medium text-gray-900">{yacht.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{yacht.builder ?? ''}{yacht.builder && yacht.yearBuilt ? ' · ' : ''}{yacht.yearBuilt ?? ''}</span>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">{yacht.type}</Badge>
                        </td>
                        <td className="p-3 text-gray-700">{yacht.length ? `${yacht.length}m` : '–'}</td>
                        <td className="p-3 text-gray-700">{yacht.cabins} <span className="text-gray-400 text-xs">({yacht.berths} berths)</span></td>
                        <td className="p-3 text-gray-700">
                          {yacht.pricePerWeekLow ? formatPrice(Number(yacht.pricePerWeekLow), yacht.currency) : '–'} &ndash; {yacht.pricePerWeekHigh ? formatPrice(Number(yacht.pricePerWeekHigh), yacht.currency) : '–'}
                        </td>
                        <td className="p-3">
                          {yacht.rating && Number(yacht.rating) > 0 ? (
                            <span className="flex items-center gap-1 text-gray-700">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              {Number(yacht.rating).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">&ndash;</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={statusColor[yacht.status] ?? 'bg-gray-100 text-gray-600'}>
                            {yacht.status.charAt(0).toUpperCase() + yacht.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-700">{yacht.destination?.name ?? '–'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/yachts/${yacht.id}/edit`}>
                              <Button variant="ghost" size="sm"><Edit className="h-3.5 w-3.5" /></Button>
                            </Link>
                            <Link href={`/admin/yachts/${yacht.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (page <= 4) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = page - 3 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={pageNum === page ? 'bg-blue-600 text-white' : ''}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
