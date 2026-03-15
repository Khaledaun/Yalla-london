'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminKPICard,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
import {
  MapPin,
  Plus,
  Edit,
  Power,
  Ship,
  Calendar,
  DollarSign,
  X,
  Save,
  Image as ImageIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Destination {
  id: string
  name: string
  slug: string
  region: string
  description_en: string | null
  heroImage?: string
  yachtCount: number
  seasonStart: string | null
  seasonEnd: string | null
  averagePricePerWeek: number | null
  highlights: string[] | null
  status: string
  createdAt: string
  updatedAt: string
}

interface DestinationFormData {
  name: string
  slug: string
  region: string
  description: string
  seasonStart: string
  seasonEnd: string
  avgPricePerWeek: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REGIONS = ['MEDITERRANEAN', 'ARABIAN_GULF', 'RED_SEA', 'INDIAN_OCEAN', 'CARIBBEAN', 'SOUTHEAST_ASIA']

const REGION_LABELS: Record<string, string> = {
  MEDITERRANEAN: 'Mediterranean',
  ARABIAN_GULF: 'Arabian Gulf',
  RED_SEA: 'Red Sea',
  INDIAN_OCEAN: 'Indian Ocean',
  CARIBBEAN: 'Caribbean',
  SOUTHEAST_ASIA: 'Southeast Asia',
}

const formatPrice = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

const EMPTY_FORM: DestinationFormData = { name: '', slug: '', region: '', description: '', seasonStart: '', seasonEnd: '', avgPricePerWeek: '' }

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #3B7EA1 0%, #2D5A3D 100%)',
  'linear-gradient(135deg, #C49A2A 0%, #C8322B 100%)',
  'linear-gradient(135deg, #2D5A3D 0%, #3B7EA1 100%)',
  'linear-gradient(135deg, #C8322B 0%, #C49A2A 100%)',
  'linear-gradient(135deg, #3B7EA1 0%, #C49A2A 100%)',
  'linear-gradient(135deg, #2D5A3D 0%, #C8322B 100%)',
]

const getGradient = (index: number) => GRADIENT_COLORS[index % GRADIENT_COLORS.length]

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 13,
  color: '#1C1917',
  width: '100%',
  height: 40,
  borderRadius: 8,
  border: '1px solid rgba(214,208,196,0.8)',
  backgroundColor: '#FFFFFF',
  padding: '0 12px',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%2378716C' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#78716C',
  marginBottom: 6,
  display: 'block',
}

const metaTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-system)',
  fontSize: 11,
  color: '#78716C',
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 16,
  color: '#1C1917',
  lineHeight: 1.3,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DestinationsPage() {
  const siteId = useSiteId()

  // Data
  const [destinations, setDestinations] = useState<Destination[]>([])

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DestinationFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/yachts/destinations?siteId=${siteId}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setDestinations([])
          setError('Authentication failed. Please log in to access destinations.')
          return
        }
        throw new Error('Failed to load destinations')
      }
      const data = await res.json()
      setDestinations(data.destinations ?? [])
    } catch (err) {
      console.warn('[destinations] fetch error:', err)
      setError('Unable to load destinations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetchDestinations() }, [fetchDestinations])

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const openAddForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (dest: Destination) => {
    setEditingId(dest.id)
    setForm({
      name: dest.name,
      slug: dest.slug,
      region: dest.region,
      description: dest.description_en ?? '',
      seasonStart: dest.seasonStart ?? '',
      seasonEnd: dest.seasonEnd ?? '',
      avgPricePerWeek: String(Number(dest.averagePricePerWeek ?? 0)),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.region.trim()) return
    setSaving(true)
    try {
      const { description, avgPricePerWeek, ...rest } = form
      const body = { ...rest, description_en: description, averagePricePerWeek: Number(avgPricePerWeek) || 0, siteId }
      const res = await fetch(`/api/admin/yachts/destinations`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
      })
      if (res.ok) {
        await fetchDestinations()
        closeForm()
      }
    } catch { console.warn('[destinations] save failed') }
    finally { setSaving(false) }
  }

  const toggleActive = async (id: string, currentStatus: string) => {
    setTogglingId(id)
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const res = await fetch(`/api/admin/yachts/destinations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, siteId }),
      })
      if (res.ok) {
        setDestinations(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'active' ? 'inactive' : 'active' } : d))
      }
    } catch { console.warn('[destinations] toggle failed') }
    finally { setTogglingId(null) }
  }

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------

  const activeCount = destinations.filter(d => d.status === 'active').length
  const totalYachts = destinations.reduce((sum, d) => sum + d.yachtCount, 0)
  const regionCount = new Set<string>(destinations.map(d => d.region)).size

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Destinations"
        subtitle="Manage charter destinations and seasons"
        backHref="/admin/yachts"
        action={
          <AdminButton variant="primary" onClick={openAddForm}>
            <Plus size={14} />
            Add Destination
          </AdminButton>
        }
      />

      {/* KPI Strip */}
      {!loading && !error && destinations.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <AdminKPICard value={activeCount} label="Active" color="#2D5A3D" />
          <AdminKPICard value={totalYachts} label="Total Yachts" color="#3B7EA1" />
          <AdminKPICard value={regionCount} label="Regions" color="#C49A2A" />
        </div>
      )}

      {/* Inline Form */}
      {showForm && (
        <AdminCard elevated className="mb-6" accent accentColor="blue">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <p style={{ ...cardTitleStyle, fontSize: 18 }}>
                {editingId ? 'Edit Destination' : 'New Destination'}
              </p>
              <AdminButton variant="ghost" size="sm" onClick={closeForm}>
                <X size={14} />
              </AdminButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. French Riviera"
                />
              </div>
              <div>
                <label style={labelStyle}>Region *</label>
                <select
                  value={form.region}
                  onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label style={labelStyle}>Description</label>
                <input
                  style={inputStyle}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the destination"
                />
              </div>
              <div>
                <label style={labelStyle}>Season Start</label>
                <input
                  style={inputStyle}
                  value={form.seasonStart}
                  onChange={e => setForm(f => ({ ...f, seasonStart: e.target.value }))}
                  placeholder="e.g. May"
                />
              </div>
              <div>
                <label style={labelStyle}>Season End</label>
                <input
                  style={inputStyle}
                  value={form.seasonEnd}
                  onChange={e => setForm(f => ({ ...f, seasonEnd: e.target.value }))}
                  placeholder="e.g. October"
                />
              </div>
              <div>
                <label style={labelStyle}>Avg Price / Week</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={form.avgPricePerWeek}
                  onChange={e => setForm(f => ({ ...f, avgPricePerWeek: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <AdminButton variant="secondary" onClick={closeForm}>Cancel</AdminButton>
              <AdminButton
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!form.name.trim() || !form.region.trim()}
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Create'}
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Content */}
      {error ? (
        <AdminAlertBanner
          severity="critical"
          message="Error Loading Destinations"
          detail={error}
          action={
            <AdminButton variant="secondary" size="sm" onClick={fetchDestinations}>
              Try Again
            </AdminButton>
          }
        />
      ) : loading ? (
        <AdminLoadingState label="Loading destinations..." />
      ) : destinations.length === 0 ? (
        <AdminEmptyState
          icon={MapPin}
          title="No destinations yet"
          description="Add your first charter destination to get started."
          action={
            <AdminButton variant="primary" onClick={openAddForm}>
              <Plus size={14} />
              Add Destination
            </AdminButton>
          }
        />
      ) : (
        <>
          <AdminSectionLabel>{destinations.length} destination{destinations.length !== 1 ? 's' : ''}</AdminSectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {destinations.map((dest, idx) => (
              <AdminCard
                key={dest.id}
                elevated
                className={dest.status !== 'active' ? 'opacity-60' : ''}
              >
                {/* Hero */}
                {dest.heroImage ? (
                  <div
                    style={{
                      height: 140,
                      backgroundImage: `url(${dest.heroImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '12px 12px 0 0',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 140,
                      background: getGradient(idx),
                      borderRadius: '12px 12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={28} color="rgba(255,255,255,0.5)" />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p style={cardTitleStyle}>{dest.name}</p>
                      <div className="mt-1.5">
                        <AdminStatusBadge
                          status={dest.region.toLowerCase().replace(/_/g, '-')}
                          label={REGION_LABELS[dest.region] ?? dest.region}
                        />
                      </div>
                    </div>
                    {dest.status !== 'active' && (
                      <AdminStatusBadge status="inactive" />
                    )}
                  </div>

                  {/* Description */}
                  {dest.description_en && (
                    <p style={{ ...metaTextStyle, lineHeight: 1.5 }} className="line-clamp-2">
                      {dest.description_en}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span style={metaTextStyle} className="flex items-center gap-1">
                      <Ship size={12} color="#3B7EA1" />
                      {dest.yachtCount} yachts
                    </span>
                    {(dest.seasonStart || dest.seasonEnd) && (
                      <span style={metaTextStyle} className="flex items-center gap-1">
                        <Calendar size={12} color="#C49A2A" />
                        {dest.seasonStart ?? '?'} &ndash; {dest.seasonEnd ?? '?'}
                      </span>
                    )}
                    {Number(dest.averagePricePerWeek ?? 0) > 0 && (
                      <span style={metaTextStyle} className="flex items-center gap-1">
                        <DollarSign size={12} color="#2D5A3D" />
                        {formatPrice(Number(dest.averagePricePerWeek ?? 0))}/wk
                      </span>
                    )}
                  </div>

                  {/* Highlights */}
                  {Array.isArray(dest.highlights) && dest.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {dest.highlights.slice(0, 4).map((h: string, i: number) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            color: '#3B7EA1',
                            backgroundColor: 'rgba(59,126,161,0.08)',
                            padding: '3px 8px',
                            borderRadius: 20,
                          }}
                        >
                          {h}
                        </span>
                      ))}
                      {dest.highlights.length > 4 && (
                        <span style={{ ...metaTextStyle, fontSize: 9 }}>
                          +{dest.highlights.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    className="flex gap-2 pt-3"
                    style={{ borderTop: '1px solid rgba(214,208,196,0.5)' }}
                  >
                    <AdminButton variant="secondary" size="sm" className="flex-1" onClick={() => openEditForm(dest)}>
                      <Edit size={12} />
                      Edit
                    </AdminButton>
                    <AdminButton
                      variant={dest.status === 'active' ? 'danger' : 'success'}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleActive(dest.id, dest.status)}
                      loading={togglingId === dest.id}
                    >
                      <Power size={12} />
                      {dest.status === 'active' ? 'Deactivate' : 'Activate'}
                    </AdminButton>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
