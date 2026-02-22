'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-emerald-500 to-teal-400',
  'from-orange-500 to-amber-400',
  'from-rose-500 to-red-400',
  'from-indigo-500 to-blue-400',
  'from-teal-500 to-green-400',
  'from-fuchsia-500 to-purple-400',
]

const getGradient = (index: number) => GRADIENT_COLORS[index % GRADIENT_COLORS.length]

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
        if (res.status === 401 || res.status === 403) { setDestinations([]); return }
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
  // Skeleton
  // -----------------------------------------------------------------------

  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg overflow-hidden border">
          <div className="h-40 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destinations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage charter destinations and seasons</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Destination
        </Button>
      </div>

      {/* Inline form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Edit Destination' : 'New Destination'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeForm}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. French Riviera" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                <select
                  value={form.region}
                  onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the destination" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Season Start</label>
                <Input value={form.seasonStart} onChange={e => setForm(f => ({ ...f, seasonStart: e.target.value }))} placeholder="e.g. May" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Season End</label>
                <Input value={form.seasonEnd} onChange={e => setForm(f => ({ ...f, seasonEnd: e.target.value }))} placeholder="e.g. October" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Price / Week</label>
                <Input type="number" value={form.avgPricePerWeek} onChange={e => setForm(f => ({ ...f, avgPricePerWeek: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving || !form.name.trim() || !form.region.trim()}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Error Loading Destinations</p>
            <p className="text-red-600 text-sm mt-2">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchDestinations}>Try Again</Button>
          </div>
        </div>
      ) : loading ? (
        <SkeletonGrid />
      ) : destinations.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No destinations yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add your first charter destination to get started.</p>
          <Button className="mt-4" onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest, idx) => (
            <Card key={dest.id} className={`overflow-hidden ${dest.status !== 'active' ? 'opacity-60' : ''}`}>
              {/* Hero */}
              {dest.heroImage ? (
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${dest.heroImage})` }} />
              ) : (
                <div className={`h-40 bg-gradient-to-br ${getGradient(idx)} flex items-center justify-center`}>
                  <ImageIcon className="h-10 w-10 text-white/60" />
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{dest.name}</h3>
                    <Badge className="bg-gray-100 text-gray-600 mt-1">{REGION_LABELS[dest.region] ?? dest.region}</Badge>
                  </div>
                  {dest.status !== 'active' && <Badge className="bg-red-100 text-red-700">Inactive</Badge>}
                </div>

                {dest.description_en && (
                  <p className="text-sm text-gray-600 line-clamp-2">{dest.description_en}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Ship className="h-3.5 w-3.5 text-gray-400" />{dest.yachtCount} yachts</span>
                  {(dest.seasonStart || dest.seasonEnd) && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" />{dest.seasonStart ?? '?'} &ndash; {dest.seasonEnd ?? '?'}</span>}
                  {Number(dest.averagePricePerWeek ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-gray-400" />{formatPrice(Number(dest.averagePricePerWeek ?? 0))}/wk avg</span>
                  )}
                </div>

                {Array.isArray(dest.highlights) && dest.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dest.highlights.slice(0, 4).map((h: string, i: number) => (
                      <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{h}</Badge>
                    ))}
                    {dest.highlights.length > 4 && <span className="text-xs text-gray-400">+{dest.highlights.length - 4}</span>}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditForm(dest)}>
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${dest.status === 'active' ? 'text-red-600 hover:bg-red-50 border-red-200' : 'text-green-600 hover:bg-green-50 border-green-200'}`}
                    onClick={() => toggleActive(dest.id, dest.status)}
                    disabled={togglingId === dest.id}
                  >
                    <Power className="h-3.5 w-3.5 mr-1" />
                    {dest.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
