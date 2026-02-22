'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
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

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Sent to Broker', value: 'SENT_TO_BROKER' },
  { label: 'Booked', value: 'BOOKED' },
  { label: 'Lost', value: 'LOST' },
]

const statusColor: Record<InquiryStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUALIFIED: 'bg-purple-100 text-purple-800',
  SENT_TO_BROKER: 'bg-orange-100 text-orange-800',
  BOOKED: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
}

const statusLabel: Record<InquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SENT_TO_BROKER: 'Sent to Broker',
  BOOKED: 'Booked',
  LOST: 'Lost',
}

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
  // Skeleton
  // -----------------------------------------------------------------------

  const SkeletonCards = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse border rounded-lg p-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="flex gap-6">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  )

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Charter Inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and track charter inquiry pipeline</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="ring-2 ring-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">New</p>
                <p className="text-2xl font-bold text-blue-700">{summary.new}</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.inProgress}</p>
              </div>
              <Loader2 className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Booked</p>
                <p className="text-2xl font-bold text-green-600">{summary.booked}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion</p>
                <p className="text-2xl font-bold text-purple-600">{summary.conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs + Search */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inquiry List */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiries ({inquiries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-800 font-medium">Error Loading Inquiries</p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchInquiries}>Try Again</Button>
              </div>
            </div>
          ) : loading ? (
            <SkeletonCards />
          ) : inquiries.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inquiries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Charter inquiries will appear here when submitted.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map(inq => {
                const isExpanded = expandedId === inq.id
                return (
                  <div key={inq.id} className="border rounded-lg hover:shadow-sm transition-shadow">
                    {/* Summary row */}
                    <button
                      className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">{inq.referenceNumber}</span>
                          <Badge className={statusColor[inq.status]}>{statusLabel[inq.status]}</Badge>
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{inq.firstName} {inq.lastName}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{inq.email}</span>
                          {inq.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{inq.phone}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 shrink-0">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" />{inq.destination}</span>
                        {inq.preferredDates && (inq.preferredDates.start || inq.preferredDates.end) && (
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" />{inq.preferredDates.start ? formatDate(inq.preferredDates.start) : '?'} &ndash; {inq.preferredDates.end ? formatDate(inq.preferredDates.end) : '?'}</span>
                        )}
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-400" />{inq.guestCount} guests</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-gray-400" />{inq.budget ? formatPrice(Number(inq.budget), inq.budgetCurrency) : '–'}</span>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Preferences</h4>
                            {inq.preferences && Object.keys(inq.preferences).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(inq.preferences).filter(([, v]) => v).map(([key]) => (
                                  <Badge key={key} className="bg-gray-100 text-gray-700">{key}</Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400">No preferences specified</p>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Special Requests</h4>
                            <p className="text-sm text-gray-700">{inq.message || 'None'}</p>
                          </div>
                        </div>

                        {/* Broker notes */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Broker Notes</h4>
                          {inq.brokerNotes ? (
                            <div className="bg-white border rounded p-3 text-sm text-gray-700 whitespace-pre-line mb-2">{inq.brokerNotes}</div>
                          ) : (
                            <p className="text-sm text-gray-400 mb-2">No notes yet</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a note..."
                              value={noteInput[inq.id] ?? ''}
                              onChange={e => setNoteInput(prev => ({ ...prev, [inq.id]: e.target.value }))}
                              className="flex-1"
                              onKeyDown={e => { if (e.key === 'Enter') addNote(inq.id) }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addNote(inq.id)}
                              disabled={updatingId === inq.id || !noteInput[inq.id]?.trim()}
                            >
                              <StickyNote className="h-4 w-4 mr-1" />
                              Add Note
                            </Button>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
                          <span className="text-xs font-medium text-gray-500 mr-1">Update status:</span>
                          <Select
                            value={inq.status}
                            onValueChange={(val) => updateStatus(inq.id, val as InquiryStatus)}
                          >
                            <SelectTrigger className="w-44 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabel).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Assign Broker
                          </Button>
                          <span className="text-xs text-gray-400 ml-auto">
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
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) { pageNum = i + 1 }
                  else if (page <= 3) { pageNum = i + 1 }
                  else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i }
                  else { pageNum = page - 2 + i }
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
