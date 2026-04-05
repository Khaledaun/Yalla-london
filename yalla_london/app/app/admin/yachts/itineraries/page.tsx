'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
  useConfirm,
} from '@/components/admin/admin-ui'
import {
  Route,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Mountain,
  DollarSign,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Destination {
  id: string
  name: string
  slug: string
  region: string
}

interface Itinerary {
  id: string
  title_en: string
  title_ar: string | null
  slug: string
  destinationId: string
  duration: number
  difficulty: 'EASY' | 'MODERATE' | 'ADVANCED'
  description_en: string | null
  stops: unknown[]
  recommendedYachtTypes: string[] | null
  estimatedCost: number | null
  currency: string
  bestSeason: string | null
  heroImage: string | null
  status: string
  createdAt: string
  updatedAt: string
  destination: { id: string; name: string; slug: string; region: string }
}

interface ItineraryForm {
  title_en: string
  title_ar: string
  slug: string
  destinationId: string
  duration: string
  difficulty: string
  description_en: string
  description_ar: string
  estimatedCost: string
  currency: string
  bestSeason: string
  heroImage: string
  status: string
}

const INITIAL_FORM: ItineraryForm = {
  title_en: '',
  title_ar: '',
  slug: '',
  destinationId: '',
  duration: '7',
  difficulty: 'EASY',
  description_en: '',
  description_ar: '',
  estimatedCost: '',
  currency: 'EUR',
  bestSeason: '',
  heroImage: '',
  status: 'active',
}

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy', status: 'success' as const },
  { value: 'MODERATE', label: 'Moderate', status: 'warning' as const },
  { value: 'ADVANCED', label: 'Advanced', status: 'error' as const },
]

const SEASONS = ['Spring (Mar–May)', 'Summer (Jun–Aug)', 'Autumn (Sep–Nov)', 'Winter (Dec–Feb)', 'Year-round']
const CURRENCIES = ['EUR', 'USD', 'GBP']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const formatPrice = (value: number | null, currency = 'EUR') =>
  value != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    : '—'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 11,
  fontWeight: 600,
  color: '#44403C',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 13,
  color: '#1C1917',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(214,208,196,0.8)',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378716C'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: 'vertical' as const,
}

const tableHeaderStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 9,
  fontWeight: 700,
  color: '#78716C',
  textTransform: 'uppercase',
  letterSpacing: '1.2px',
  padding: '10px 12px',
  textAlign: 'left',
}

const tableCellStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 12,
  color: '#44403C',
  padding: '12px',
  borderBottom: '1px solid rgba(214,208,196,0.4)',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ItinerariesAdminPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const siteId = useSiteId()

  // Data
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('All')
  const [filterDestination, setFilterDestination] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [page, setPage] = useState(1)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItineraryForm>(INITIAL_FORM)
  const [autoSlug, setAutoSlug] = useState(true)

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchItineraries = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ siteId, page: String(page), limit: '20' })
      if (filterDifficulty !== 'All') params.set('difficulty', filterDifficulty)
      if (filterDestination !== 'All') params.set('destinationId', filterDestination)
      if (filterStatus !== 'All') params.set('status', filterStatus)

      const res = await fetch(`/api/admin/yachts/itineraries?${params}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setItineraries([])
          setError('Authentication failed. Please log in to access itineraries.')
          return
        }
        throw new Error('Failed to load itineraries')
      }

      const data = await res.json()
      setItineraries(data.itineraries ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
    } catch (err) {
      console.warn('[itineraries-admin] fetch error:', err)
      setError('Unable to load itineraries.')
    } finally {
      setLoading(false)
    }
  }, [siteId, page, filterDifficulty, filterDestination, filterStatus])

  const fetchDestinations = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/yachts/destinations?siteId=${siteId}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setDestinations(data.destinations ?? [])
      }
    } catch {
      console.warn('[itineraries-admin] Failed to load destinations')
    }
  }, [siteId])

  useEffect(() => { fetchItineraries() }, [fetchItineraries])
  useEffect(() => { fetchDestinations() }, [fetchDestinations])
  useEffect(() => { setPage(1) }, [filterDifficulty, filterDestination, filterStatus])

  // -----------------------------------------------------------------------
  // Form handlers
  // -----------------------------------------------------------------------

  const updateField = (field: keyof ItineraryForm, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'title_en' && autoSlug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  const openCreateForm = () => {
    setEditingId(null)
    setForm(INITIAL_FORM)
    setAutoSlug(true)
    setShowForm(true)
  }

  const openEditForm = (itinerary: Itinerary) => {
    setEditingId(itinerary.id)
    setAutoSlug(false)
    setForm({
      title_en: itinerary.title_en,
      title_ar: itinerary.title_ar || '',
      slug: itinerary.slug,
      destinationId: itinerary.destinationId,
      duration: String(itinerary.duration),
      difficulty: itinerary.difficulty,
      description_en: itinerary.description_en || '',
      description_ar: '',
      estimatedCost: itinerary.estimatedCost != null ? String(itinerary.estimatedCost) : '',
      currency: itinerary.currency,
      bestSeason: itinerary.bestSeason || '',
      heroImage: itinerary.heroImage || '',
      status: itinerary.status,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title_en.trim()) { setError('Title is required'); return }
    if (!form.slug.trim()) { setError('Slug is required'); return }
    if (!form.destinationId) { setError('Destination is required'); return }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title_en: form.title_en.trim(),
        title_ar: form.title_ar || null,
        slug: form.slug.trim(),
        destinationId: form.destinationId,
        duration: parseInt(form.duration) || 7,
        difficulty: form.difficulty,
        description_en: form.description_en || null,
        description_ar: form.description_ar || null,
        stops: [], // Stops are managed separately via a more complex UI
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
        currency: form.currency,
        bestSeason: form.bestSeason || null,
        heroImage: form.heroImage || null,
        status: form.status,
        siteId,
      }

      const res = await fetch('/api/admin/yachts/itineraries', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} itinerary`)
      }

      setShowForm(false)
      setEditingId(null)
      await fetchItineraries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save itinerary')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Deactivate Itinerary', message: 'Deactivate this itinerary? It can be reactivated later.', variant: 'warning', confirmLabel: 'Deactivate' })
    if (!ok) return

    try {
      const res = await fetch(`/api/admin/yachts/itineraries?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to deactivate itinerary')
      await fetchItineraries()
    } catch {
      setError('Failed to deactivate itinerary')
    }
  }

  // -----------------------------------------------------------------------
  // Filter itineraries client-side by search term
  // -----------------------------------------------------------------------

  const filtered = itineraries.filter(it => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      it.title_en.toLowerCase().includes(q) ||
      it.destination?.name?.toLowerCase().includes(q) ||
      it.slug.toLowerCase().includes(q)
    )
  })

  // -----------------------------------------------------------------------
  // KPI calculations
  // -----------------------------------------------------------------------

  const totalCount = itineraries.length
  const activeCount = itineraries.filter(i => i.status === 'active').length
  const avgDuration = totalCount > 0 ? Math.round(itineraries.reduce((s, i) => s + i.duration, 0) / totalCount) : 0
  const destCount = new Set(itineraries.map(i => i.destinationId)).size

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Charter Itineraries"
        subtitle="Manage multi-day sailing routes and itinerary templates"
        backHref="/admin/yachts"
        action={
          <AdminButton variant="primary" onClick={openCreateForm}>
            <Plus size={14} />
            New Itinerary
          </AdminButton>
        }
      />

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={totalCount} label="Total" color="#3B7EA1" />
        <AdminKPICard value={activeCount} label="Active" color="#2D5A3D" />
        <AdminKPICard value={`${avgDuration}d`} label="Avg Duration" color="#C49A2A" />
        <AdminKPICard value={destCount} label="Destinations" color="#C8322B" />
      </div>

      {/* Filters */}
      <AdminCard className="mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search
              size={14}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A8A29E' }}
            />
            <input
              style={{ ...inputStyle, paddingLeft: 34 }}
              placeholder="Search itineraries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            style={{ ...selectStyle, width: 140 }}
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
          >
            <option value="All">All Levels</option>
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select
            style={{ ...selectStyle, width: 170 }}
            value={filterDestination}
            onChange={e => setFilterDestination(e.target.value)}
          >
            <option value="All">All Destinations</option>
            {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            style={{ ...selectStyle, width: 120 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </AdminCard>

      {/* Create/Edit Form */}
      {showForm && (
        <AdminCard accent accentColor="blue" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: '#1C1917',
              }}
            >
              {editingId ? 'Edit Itinerary' : 'New Itinerary'}
            </p>
            <AdminButton variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
              <X size={14} />
            </AdminButton>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>
                  Title (English) *
                </label>
                <input style={inputStyle} value={form.title_en} onChange={e => updateField('title_en', e.target.value)} placeholder="e.g. Greek Islands Explorer" />
              </div>
              <div>
                <label style={labelStyle}>
                  Slug *
                  {autoSlug && (
                    <AdminStatusBadge status="active" label="Auto" />
                  )}
                </label>
                <input style={inputStyle} value={form.slug} onChange={e => { setAutoSlug(false); updateField('slug', slugify(e.target.value)) }} placeholder="greek-islands-explorer" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Title (Arabic)</label>
              <input style={inputStyle} dir="rtl" value={form.title_ar} onChange={e => updateField('title_ar', e.target.value)} placeholder="العنوان بالعربية" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label style={labelStyle}>Destination *</label>
                <select style={selectStyle} value={form.destinationId} onChange={e => updateField('destinationId', e.target.value)}>
                  <option value="">Select</option>
                  {destinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Duration (days)</label>
                <input style={inputStyle} type="number" min="1" max="30" value={form.duration} onChange={e => updateField('duration', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Difficulty</label>
                <select style={selectStyle} value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={selectStyle} value={form.status} onChange={e => updateField('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description (English)</label>
              <textarea
                style={textareaStyle}
                value={form.description_en}
                onChange={e => updateField('description_en', e.target.value)}
                placeholder="Describe the itinerary route, highlights, and what makes it special..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Estimated Cost</label>
                <input style={inputStyle} type="number" min="0" step="100" value={form.estimatedCost} onChange={e => updateField('estimatedCost', e.target.value)} placeholder="5000" />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select style={selectStyle} value={form.currency} onChange={e => updateField('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Best Season</label>
                <select style={selectStyle} value={form.bestSeason} onChange={e => updateField('bestSeason', e.target.value)}>
                  <option value="">Select season</option>
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <AdminButton variant="secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</AdminButton>
              <AdminButton variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
                <Save size={12} />
                {saving ? 'Saving...' : editingId ? 'Update Itinerary' : 'Create Itinerary'}
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Itineraries Table */}
      <AdminCard>
        <AdminSectionLabel>Itineraries ({filtered.length})</AdminSectionLabel>

        {loading ? (
          <AdminLoadingState label="Loading itineraries..." />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={Route}
            title="No itineraries found"
            description={
              search || filterDifficulty !== 'All' || filterDestination !== 'All'
                ? 'Try adjusting your filters.'
                : 'Get started by creating your first charter itinerary.'
            }
            action={
              <AdminButton variant="primary" onClick={openCreateForm}>
                <Plus size={12} />
                New Itinerary
              </AdminButton>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.6)' }}>
                  <th style={tableHeaderStyle}>Title</th>
                  <th style={tableHeaderStyle}>Destination</th>
                  <th style={tableHeaderStyle}>Duration</th>
                  <th style={tableHeaderStyle}>Difficulty</th>
                  <th style={tableHeaderStyle}>Est. Cost</th>
                  <th style={tableHeaderStyle}>Season</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => {
                  const diffCfg = DIFFICULTIES.find(x => x.value === it.difficulty) ?? DIFFICULTIES[0]
                  return (
                    <tr
                      key={it.id}
                      style={{ transition: 'background-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(214,208,196,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={tableCellStyle}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#1C1917' }}>
                          {it.title_en}
                        </span>
                        <span style={{ display: 'block', fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', marginTop: 2 }}>
                          /{it.slug}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} color="#A8A29E" />
                          <span>{it.destination?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1C1917' }}>
                          {it.duration}
                        </span>
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', marginLeft: 2 }}>days</span>
                      </td>
                      <td style={tableCellStyle}>
                        <AdminStatusBadge status={diffCfg.status} label={diffCfg.label} />
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                          {formatPrice(it.estimatedCost, it.currency)}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, fontSize: 11 }}>{it.bestSeason || '—'}</td>
                      <td style={tableCellStyle}>
                        <AdminStatusBadge status={it.status === 'active' ? 'active' : 'inactive'} />
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                        <div className="flex justify-end gap-1">
                          <AdminButton variant="ghost" size="sm" onClick={() => openEditForm(it)}>
                            <Edit size={13} />
                          </AdminButton>
                          <AdminButton variant="ghost" size="sm" onClick={() => handleDelete(it.id)}>
                            <Trash2 size={13} color="#C8322B" />
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}
          >
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <AdminButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </AdminButton>
              <AdminButton variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </AdminButton>
            </div>
          </div>
        )}
      </AdminCard>
      <ConfirmDialog />
    </div>
  )
}
