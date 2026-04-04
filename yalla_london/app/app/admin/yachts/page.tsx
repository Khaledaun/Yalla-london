'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
import {
  Ship,
  Plus,
  RefreshCw,
  Download,
  Search,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  Database,
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
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

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
      <div className="admin-page p-4 md:p-6">
        <AdminEmptyState
          icon={Ship}
          title="Yacht Management — Zenitha Yachts Only"
          description="The fleet inventory, charter inquiries, and yacht-specific tools are exclusive to the Zenitha Yachts site. Switch to Zenitha Yachts in the site selector to access these tools."
          action={
            <Link href="/admin/cockpit">
              <AdminButton variant="secondary">Back to Cockpit</AdminButton>
            </Link>
          }
        />
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

  const handleSeedFleet = async () => {
    if (seeding) return
    setSeeding(true)
    setSeedResult(null)
    try {
      const res = await fetch('/api/admin/yachts/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all' }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'Unknown error')
        setSeedResult(`Error: ${txt}`)
        return
      }
      const data = await res.json().catch(() => ({}))
      const parts: string[] = []
      if (data.destinations?.created) parts.push(`${data.destinations.created} destinations`)
      if (data.yachts?.created) parts.push(`${data.yachts.created} yachts`)
      if (data.itineraries?.created) parts.push(`${data.itineraries.created} itineraries`)
      if (data.brokers?.created) parts.push(`${data.brokers.created} brokers`)
      setSeedResult(parts.length ? `Seeded: ${parts.join(', ')}` : 'Fleet data already seeded — no new records created.')
      fetchYachts()
    } catch (err) {
      setSeedResult(`Error: ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
      setSeeding(false)
    }
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Fleet Inventory"
        subtitle="Manage your yacht fleet across all destinations"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/yachts/new">
              <AdminButton variant="primary" size="sm">
                <Plus size={14} />
                Add Yacht
              </AdminButton>
            </Link>
            <AdminButton variant="secondary" size="sm" onClick={handleSync} loading={syncing}>
              <RefreshCw size={14} />
              {syncing ? 'Syncing...' : 'Sync Fleet'}
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={handleExport}>
              <Download size={14} />
              Export CSV
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={handleSeedFleet} loading={seeding}>
              <Database size={14} />
              {seeding ? 'Seeding...' : 'Seed Fleet'}
            </AdminButton>
          </div>
        }
      />

      {/* Seed Result Banner */}
      {seedResult && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{
            background: seedResult.startsWith('Error') ? '#FEE2E2' : '#ECFDF5',
            border: `1px solid ${seedResult.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
            color: seedResult.startsWith('Error') ? '#991B1B' : '#065F46',
          }}
        >
          {seedResult}
          <button className="ml-3 underline text-xs opacity-70" onClick={() => setSeedResult(null)}>dismiss</button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={summary.total} label="Total Yachts" color="#3B7EA1" />
        <AdminKPICard value={summary.active} label="Active" color="#2D5A3D" />
        <AdminKPICard value={summary.featured} label="Featured" color="#C49A2A" />
        <AdminKPICard value={summary.pendingReview} label="Pending Review" color="#C8322B" />
      </div>

      {/* Filter Bar */}
      <AdminCard className="mb-6">
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#A8A29E' }}
              />
              <input
                className="admin-input pl-9 w-full"
                placeholder="Search yachts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="admin-select"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {YACHT_TYPES.map(t => (
                <option key={t} value={t}>{YACHT_TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
            <select
              className="admin-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s === 'All Statuses' ? s : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              className="admin-select"
              value={destinationId}
              onChange={e => setDestinationId(e.target.value)}
            >
              <option value="">All Destinations</option>
              {destinations.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Fleet Table */}
      <AdminCard>
        <div className="p-4">
          <AdminSectionLabel>Fleet ({yachts.length})</AdminSectionLabel>

          {error ? (
            <AdminAlertBanner
              severity="critical"
              message="Error Loading Fleet"
              detail={error}
              action={
                <AdminButton variant="secondary" size="sm" onClick={fetchYachts}>
                  Try Again
                </AdminButton>
              }
            />
          ) : loading ? (
            <AdminLoadingState label="Loading fleet..." />
          ) : yachts.length === 0 ? (
            <AdminEmptyState
              icon={Ship}
              title="No yachts found"
              description={
                search || type !== 'All Types' || status !== 'All Statuses' || destinationId
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Seed the fleet with 50 yachts across 10 Mediterranean destinations, or add one manually.'
              }
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  {!(search || type !== 'All Types' || status !== 'All Statuses' || destinationId) && (
                    <AdminButton variant="primary" size="sm" onClick={handleSeedFleet} loading={seeding}>
                      <Database size={14} />
                      {seeding ? 'Seeding...' : 'Seed Fleet (50 Yachts)'}
                    </AdminButton>
                  )}
                  <Link href="/admin/yachts/new">
                    <AdminButton variant="secondary" size="sm">
                      <Plus size={14} />
                      Add Yacht
                    </AdminButton>
                  </Link>
                </div>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(214,208,196,0.5)',
                        color: '#78716C',
                        fontWeight: 600,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Length</th>
                      <th className="text-left p-3">Cabins</th>
                      <th className="text-left p-3">Price Range</th>
                      <th className="text-left p-3">Rating</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Destination</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yachts.map(yacht => (
                      <tr
                        key={yacht.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(250,248,244,0.6)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {yacht.featured && <Star size={12} style={{ color: '#C49A2A', fill: '#C49A2A' }} />}
                            <span style={{ fontWeight: 600, color: '#1C1917' }}>{yacht.name}</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#A8A29E' }}>
                            {yacht.builder ?? ''}{yacht.builder && yacht.yearBuilt ? ' \u00B7 ' : ''}{yacht.yearBuilt ?? ''}
                          </span>
                        </td>
                        <td className="p-3">
                          <AdminStatusBadge status="active" label={YACHT_TYPE_LABELS[yacht.type] ?? yacht.type} />
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>{yacht.length ? `${yacht.length}m` : '\u2013'}</td>
                        <td className="p-3" style={{ color: '#44403C' }}>
                          {yacht.cabins}{' '}
                          <span style={{ fontSize: 10, color: '#A8A29E' }}>({yacht.berths} berths)</span>
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>
                          {yacht.pricePerWeekLow ? formatPrice(Number(yacht.pricePerWeekLow), yacht.currency) : '\u2013'}
                          {' \u2013 '}
                          {yacht.pricePerWeekHigh ? formatPrice(Number(yacht.pricePerWeekHigh), yacht.currency) : '\u2013'}
                        </td>
                        <td className="p-3">
                          {yacht.rating && Number(yacht.rating) > 0 ? (
                            <span className="flex items-center gap-1" style={{ color: '#44403C' }}>
                              <Star size={12} style={{ color: '#C49A2A', fill: '#C49A2A' }} />
                              {Number(yacht.rating).toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ color: '#A8A29E' }}>{'\u2013'}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <AdminStatusBadge status={yacht.status} />
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>{yacht.destination?.name ?? '\u2013'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/yachts/${yacht.id}/edit`}>
                              <AdminButton variant="ghost" size="sm"><Edit size={13} /></AdminButton>
                            </Link>
                            <Link href={`/admin/yachts/${yacht.id}`}>
                              <AdminButton variant="ghost" size="sm"><Eye size={13} /></AdminButton>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {yachts.map(yacht => (
                  <div key={yacht.id} className="admin-card-inset p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {yacht.featured && <Star size={12} style={{ color: '#C49A2A', fill: '#C49A2A' }} />}
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                            {yacht.name}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          {yacht.builder ?? ''}{yacht.builder && yacht.yearBuilt ? ' \u00B7 ' : ''}{yacht.yearBuilt ?? ''}
                        </span>
                      </div>
                      <AdminStatusBadge status={yacht.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2" style={{ fontFamily: 'var(--font-system)', fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#A8A29E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</span>
                        <div style={{ color: '#44403C' }}>{YACHT_TYPE_LABELS[yacht.type] ?? yacht.type}</div>
                      </div>
                      <div>
                        <span style={{ color: '#A8A29E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Length</span>
                        <div style={{ color: '#44403C' }}>{yacht.length ? `${yacht.length}m` : '\u2013'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#A8A29E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cabins</span>
                        <div style={{ color: '#44403C' }}>{yacht.cabins} ({yacht.berths} berths)</div>
                      </div>
                      <div>
                        <span style={{ color: '#A8A29E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destination</span>
                        <div style={{ color: '#44403C' }}>{yacht.destination?.name ?? '\u2013'}</div>
                      </div>
                      <div className="col-span-2">
                        <span style={{ color: '#A8A29E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price / Week</span>
                        <div style={{ color: '#44403C' }}>
                          {yacht.pricePerWeekLow ? formatPrice(Number(yacht.pricePerWeekLow), yacht.currency) : '\u2013'}
                          {' \u2013 '}
                          {yacht.pricePerWeekHigh ? formatPrice(Number(yacht.pricePerWeekHigh), yacht.currency) : '\u2013'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid rgba(214,208,196,0.3)' }}>
                      <Link href={`/admin/yachts/${yacht.id}/edit`}>
                        <AdminButton variant="secondary" size="sm"><Edit size={12} /> Edit</AdminButton>
                      </Link>
                      <Link href={`/admin/yachts/${yacht.id}`}>
                        <AdminButton variant="ghost" size="sm"><Eye size={12} /> View</AdminButton>
                      </Link>
                      {yacht.rating && Number(yacht.rating) > 0 && (
                        <span className="ml-auto flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>
                          <Star size={11} style={{ color: '#C49A2A', fill: '#C49A2A' }} />
                          {Number(yacht.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <AdminButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </AdminButton>
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
                    <AdminButton
                      key={pageNum}
                      variant={pageNum === page ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </AdminButton>
                  )
                })}
                <AdminButton variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
