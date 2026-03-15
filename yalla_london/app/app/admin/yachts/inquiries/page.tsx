'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminTabs,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
import {
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  UserPlus,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Users,
  DollarSign,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InquiryStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'SENT_TO_BROKER' | 'BOOKED' | 'LOST'

interface Inquiry {
  id: string
  referenceNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  destination: string | null
  preferredDates: { start?: string; end?: string; flexible?: boolean } | null
  guestCount: number
  budget: number | null
  budgetCurrency: string
  status: InquiryStatus
  preferences: Record<string, unknown> | null
  message: string | null
  brokerNotes: string | null
  brokerAssigned: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

interface InquirySummary {
  total: number
  new: number
  inProgress: number
  booked: number
  conversionRate: number
}

interface InquiryResponse {
  inquiries: Inquiry[]
  stats: { total: number; byStatus: Record<string, number>; conversionRate: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'QUALIFIED', label: 'Qualified' },
  { id: 'SENT_TO_BROKER', label: 'Sent to Broker' },
  { id: 'BOOKED', label: 'Booked' },
  { id: 'LOST', label: 'Lost' },
]

const statusToBadge: Record<InquiryStatus, string> = {
  NEW: 'active',
  CONTACTED: 'warning',
  QUALIFIED: 'generating',
  SENT_TO_BROKER: 'pending',
  BOOKED: 'success',
  LOST: 'failed',
}

const statusLabel: Record<InquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SENT_TO_BROKER: 'Sent to Broker',
  BOOKED: 'Booked',
  LOST: 'Lost',
}

const STATUS_OPTIONS: InquiryStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED', 'LOST']

const formatPrice = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InquiriesPage() {
  const siteId = useSiteId()

  // Data
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [summary, setSummary] = useState<InquirySummary>({ total: 0, new: 0, inProgress: 0, booked: 0, conversionRate: 0 })
  const [totalPages, setTotalPages] = useState(1)

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ siteId, page: String(page) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/yachts/inquiries?${params}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setInquiries([])
          setError('Authentication failed. Please log in to access inquiries.')
          return
        }
        throw new Error('Failed to load inquiries')
      }

      const data: InquiryResponse = await res.json()
      setInquiries(data.inquiries ?? [])
      const byStatus = data.stats?.byStatus ?? {}
      setSummary({
        total: data.stats?.total ?? 0,
        new: byStatus['NEW'] ?? 0,
        inProgress: (byStatus['CONTACTED'] ?? 0) + (byStatus['QUALIFIED'] ?? 0) + (byStatus['SENT_TO_BROKER'] ?? 0),
        booked: byStatus['BOOKED'] ?? 0,
        conversionRate: data.stats?.conversionRate ?? 0,
      })
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch (err) {
      console.warn('[inquiries] fetch error:', err)
      setError('Unable to load inquiries. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [siteId, page, statusFilter, search])

  useEffect(() => { fetchInquiries() }, [fetchInquiries])
  useEffect(() => { setPage(1) }, [statusFilter, search])

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const updateStatus = async (id: string, newStatus: InquiryStatus) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/yachts/inquiries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, siteId }),
      })
      if (res.ok) {
        setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus, updatedAt: new Date().toISOString() } : inq))
      }
    } catch { console.warn('[inquiries] status update failed') }
    finally { setUpdatingId(null) }
  }

  const addNote = async (id: string) => {
    const note = noteInput[id]?.trim()
    if (!note) return
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/yachts/inquiries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, brokerNotes: note, siteId }),
      })
      if (res.ok) {
        setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, brokerNotes: (inq.brokerNotes ? inq.brokerNotes + '\n' : '') + note } : inq))
        setNoteInput(prev => ({ ...prev, [id]: '' }))
      }
    } catch { console.warn('[inquiries] add note failed') }
    finally { setUpdatingId(null) }
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Charter Inquiries"
        subtitle="Manage and track charter inquiry pipeline"
        backHref="/admin/yachts"
        action={
          <AdminButton variant="primary" onClick={fetchInquiries}>
            Refresh
          </AdminButton>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <AdminKPICard
          value={summary.total}
          label="Total"
          color="#3B7EA1"
        />
        <AdminKPICard
          value={summary.new}
          label="New"
          color="#C8322B"
        />
        <AdminKPICard
          value={summary.inProgress}
          label="In Progress"
          color="#C49A2A"
        />
        <AdminKPICard
          value={summary.booked}
          label="Booked"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={`${summary.conversionRate.toFixed(1)}%`}
          label="Conversion"
          color="#3B7EA1"
        />
      </div>

      {/* Status Tabs + Search */}
      <AdminCard className="mb-6">
        <div className="p-4 space-y-3">
          <AdminTabs
            tabs={STATUS_TABS}
            activeTab={statusFilter}
            onTabChange={setStatusFilter}
          />
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#A8A29E' }} />
            <input
              placeholder="Search by name, email, or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg outline-none transition-colors"
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 12,
                border: '1px solid rgba(214,208,196,0.8)',
                backgroundColor: '#FFFFFF',
                color: '#1C1917',
              }}
            />
          </div>
        </div>
      </AdminCard>

      {/* Error */}
      {error && (
        <AdminAlertBanner
          severity="critical"
          message="Error Loading Inquiries"
          detail={error}
          action={
            <AdminButton variant="secondary" size="sm" onClick={fetchInquiries}>
              Try Again
            </AdminButton>
          }
        />
      )}

      {/* Inquiry List */}
      <AdminCard>
        <div className="p-4">
          <AdminSectionLabel>Inquiries ({inquiries.length})</AdminSectionLabel>

          {loading ? (
            <AdminLoadingState label="Loading inquiries..." />
          ) : error ? null : inquiries.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquare}
              title="No inquiries found"
              description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Charter inquiries will appear here when submitted.'}
            />
          ) : (
            <div className="space-y-3">
              {inquiries.map(inq => {
                const isExpanded = expandedId === inq.id
                return (
                  <div
                    key={inq.id}
                    className="rounded-xl transition-shadow"
                    style={{
                      border: '1px solid rgba(214,208,196,0.6)',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {/* Summary row */}
                    <button
                      className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#A8A29E',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {inq.referenceNumber}
                          </span>
                          <AdminStatusBadge
                            status={statusToBadge[inq.status]}
                            label={statusLabel[inq.status]}
                          />
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 15,
                            color: '#1C1917',
                            marginTop: 4,
                          }}
                        >
                          {inq.firstName} {inq.lastName}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                            <Mail className="h-3.5 w-3.5" style={{ color: '#A8A29E' }} />{inq.email}
                          </span>
                          {inq.phone && (
                            <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                              <Phone className="h-3.5 w-3.5" style={{ color: '#A8A29E' }} />{inq.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 shrink-0">
                        <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#5C564F' }}>
                          <MapPin className="h-3.5 w-3.5" style={{ color: '#3B7EA1' }} />{inq.destination}
                        </span>
                        {inq.preferredDates && (inq.preferredDates.start || inq.preferredDates.end) && (
                          <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#5C564F' }}>
                            <Calendar className="h-3.5 w-3.5" style={{ color: '#3B7EA1' }} />
                            {inq.preferredDates.start ? formatDate(inq.preferredDates.start) : '?'} &ndash; {inq.preferredDates.end ? formatDate(inq.preferredDates.end) : '?'}
                          </span>
                        )}
                        <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#5C564F' }}>
                          <Users className="h-3.5 w-3.5" style={{ color: '#3B7EA1' }} />{inq.guestCount} guests
                        </span>
                        <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#2D5A3D' }}>
                          <DollarSign className="h-3.5 w-3.5" style={{ color: '#2D5A3D' }} />
                          {inq.budget ? formatPrice(Number(inq.budget), inq.budgetCurrency) : '--'}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" style={{ color: '#A8A29E' }} />
                          : <ChevronDown className="h-4 w-4" style={{ color: '#A8A29E' }} />
                        }
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-4 pt-3 space-y-4"
                        style={{
                          borderTop: '1px solid rgba(214,208,196,0.5)',
                          backgroundColor: '#FAF8F4',
                          borderBottomLeftRadius: 12,
                          borderBottomRightRadius: 12,
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <AdminSectionLabel>Preferences</AdminSectionLabel>
                            {inq.preferences && Object.keys(inq.preferences).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(inq.preferences).filter(([, v]) => v).map(([key]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full"
                                    style={{
                                      fontFamily: 'var(--font-system)',
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: '#5C564F',
                                      backgroundColor: 'rgba(214,208,196,0.3)',
                                      letterSpacing: '0.3px',
                                    }}
                                  >
                                    {key}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#A8A29E' }}>No preferences specified</p>
                            )}
                          </div>
                          <div>
                            <AdminSectionLabel>Special Requests</AdminSectionLabel>
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>{inq.message || 'None'}</p>
                          </div>
                        </div>

                        {/* Broker notes */}
                        <div>
                          <AdminSectionLabel>Broker Notes</AdminSectionLabel>
                          {inq.brokerNotes ? (
                            <div
                              className="rounded-lg p-3 mb-2 whitespace-pre-line"
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 12,
                                color: '#44403C',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid rgba(214,208,196,0.6)',
                              }}
                            >
                              {inq.brokerNotes}
                            </div>
                          ) : (
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#A8A29E', marginBottom: 8 }}>No notes yet</p>
                          )}
                          <div className="flex gap-2">
                            <input
                              placeholder="Add a note..."
                              value={noteInput[inq.id] ?? ''}
                              onChange={e => setNoteInput(prev => ({ ...prev, [inq.id]: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-lg outline-none transition-colors"
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 12,
                                border: '1px solid rgba(214,208,196,0.8)',
                                backgroundColor: '#FFFFFF',
                                color: '#1C1917',
                              }}
                              onKeyDown={e => { if (e.key === 'Enter') addNote(inq.id) }}
                            />
                            <AdminButton
                              variant="secondary"
                              size="sm"
                              onClick={() => addNote(inq.id)}
                              disabled={updatingId === inq.id || !noteInput[inq.id]?.trim()}
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                              Add Note
                            </AdminButton>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div
                          className="flex flex-wrap gap-2 items-center pt-3"
                          style={{ borderTop: '1px solid rgba(214,208,196,0.5)' }}
                        >
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>
                            Update status:
                          </span>
                          <select
                            value={inq.status}
                            onChange={(e) => updateStatus(inq.id, e.target.value as InquiryStatus)}
                            disabled={updatingId === inq.id}
                            className="rounded-lg px-3 py-1.5 outline-none transition-colors"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              border: '1px solid rgba(214,208,196,0.8)',
                              backgroundColor: '#FFFFFF',
                              color: '#1C1917',
                              minWidth: 160,
                            }}
                          >
                            {STATUS_OPTIONS.map(val => (
                              <option key={val} value={val}>{statusLabel[val]}</option>
                            ))}
                          </select>
                          <AdminButton variant="secondary" size="sm">
                            <UserPlus className="h-3.5 w-3.5" />
                            Assign Broker
                          </AdminButton>
                          <span
                            className="ml-auto"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#A8A29E',
                            }}
                          >
                            Created {formatDate(inq.createdAt)}{inq.source ? ` via ${inq.source}` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div
              className="flex items-center justify-between pt-4 mt-4"
              style={{ borderTop: '1px solid rgba(214,208,196,0.5)' }}
            >
              <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <AdminButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </AdminButton>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) { pageNum = i + 1 }
                  else if (page <= 3) { pageNum = i + 1 }
                  else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i }
                  else { pageNum = page - 2 + i }
                  return (
                    <AdminButton
                      key={pageNum}
                      variant={pageNum === page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </AdminButton>
                  )
                })}
                <AdminButton variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
