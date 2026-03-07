'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  { value: 'EASY', label: 'Easy', color: 'bg-green-100 text-green-800' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ADVANCED', label: 'Advanced', color: 'bg-red-100 text-red-800' },
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
// Component
// ---------------------------------------------------------------------------

export default function ItinerariesAdminPage() {
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
    if (!confirm('Deactivate this itinerary? It can be reactivated later.')) return

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
  // JSX
  // -----------------------------------------------------------------------

  const difficultyBadge = (d: string) => {
    const cfg = DIFFICULTIES.find(x => x.value === d) ?? DIFFICULTIES[0]
    return <Badge className={cfg.color}>{cfg.label}</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Charter Itineraries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage multi-day sailing routes and itinerary templates</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          New Itinerary
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{itineraries.length}</p>
              </div>
              <Route className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{itineraries.filter(i => i.status === 'active').length}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {itineraries.length > 0
                    ? Math.round(itineraries.reduce((s, i) => s + i.duration, 0) / itineraries.length)
                    : 0}d
                </p>
              </div>
              <Clock className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Destinations</p>
                <p className="text-2xl font-bold text-amber-600">
                  {new Set(itineraries.map(i => i.destinationId)).size}
                </p>
              </div>
              <Mountain className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search itineraries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Levels</SelectItem>
                {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDestination} onValueChange={setFilterDestination}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Destination" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Destinations</SelectItem>
                {destinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Edit Itinerary' : 'New Itinerary'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title (English) *</label>
                <Input value={form.title_en} onChange={e => updateField('title_en', e.target.value)} placeholder="e.g. Greek Islands Explorer" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Slug * {autoSlug && <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>}
                </label>
                <Input value={form.slug} onChange={e => { setAutoSlug(false); updateField('slug', slugify(e.target.value)) }} placeholder="greek-islands-explorer" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Title (Arabic)</label>
              <Input dir="rtl" value={form.title_ar} onChange={e => updateField('title_ar', e.target.value)} placeholder="العنوان بالعربية" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Destination *</label>
                <Select value={form.destinationId} onValueChange={v => updateField('destinationId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (days)</label>
                <Input type="number" min="1" max="30" value={form.duration} onChange={e => updateField('duration', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Difficulty</label>
                <Select value={form.difficulty} onValueChange={v => updateField('difficulty', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description (English)</label>
              <textarea
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description_en}
                onChange={e => updateField('description_en', e.target.value)}
                placeholder="Describe the itinerary route, highlights, and what makes it special..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Estimated Cost</label>
                <Input type="number" min="0" step="100" value={form.estimatedCost} onChange={e => updateField('estimatedCost', e.target.value)} placeholder="5000" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <Select value={form.currency} onValueChange={v => updateField('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Best Season</label>
                <Select value={form.bestSeason} onValueChange={v => updateField('bestSeason', v)}>
                  <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                  <SelectContent>
                    {SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingId ? 'Update Itinerary' : 'Create Itinerary'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itineraries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Itineraries ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 items-center p-3 border rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Route className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No itineraries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || filterDifficulty !== 'All' || filterDestination !== 'All'
                  ? 'Try adjusting your filters.'
                  : 'Get started by creating your first charter itinerary.'}
              </p>
              <Button className="mt-4" onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Itinerary
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-medium">
                    <th className="p-3">Title</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Difficulty</th>
                    <th className="p-3">Est. Cost</th>
                    <th className="p-3">Season</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(it => (
                    <tr key={it.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <span className="font-medium text-gray-900">{it.title_en}</span>
                          <span className="block text-xs text-gray-400">/{it.slug}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{it.destination?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="p-3">{it.duration} days</td>
                      <td className="p-3">{difficultyBadge(it.difficulty)}</td>
                      <td className="p-3">{formatPrice(it.estimatedCost, it.currency)}</td>
                      <td className="p-3 text-xs">{it.bestSeason || '—'}</td>
                      <td className="p-3">
                        <Badge className={it.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {it.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditForm(it)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(it.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
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
