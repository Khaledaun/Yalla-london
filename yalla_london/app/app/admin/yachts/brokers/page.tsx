'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Handshake,
  UserCheck,
  Send,
  CalendarCheck,
  Plus,
  Mail,
  Phone,
  Globe,
  Edit,
  X,
  Save,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Broker {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  website: string
  commissionRate: number
  totalLeadsSent: number
  totalBookings: number
  status: 'active' | 'inactive' | 'pending'
  destinations: string[] | null
  notes: string
  createdAt: string
  updatedAt: string
  performance?: {
    leadsSent: number
    bookings: number
    conversionRate: number
  }
}

interface BrokerSummary {
  total: number
  active: number
  totalLeadsSent: number
  totalBookings: number
}

interface BrokerFormData {
  companyName: string
  contactName: string
  email: string
  phone: string
  website: string
  commissionRate: string
  notes: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
}

const EMPTY_FORM: BrokerFormData = { companyName: '', contactName: '', email: '', phone: '', website: '', commissionRate: '', notes: '' }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrokersPage() {
  const siteId = useSiteId()

  // Data
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [summary, setSummary] = useState<BrokerSummary>({ total: 0, active: 0, totalLeadsSent: 0, totalBookings: 0 })

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BrokerFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchBrokers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/yachts/brokers?siteId=${siteId}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setBrokers([])
          setError('Authentication failed. Please log in to access broker data.')
          return
        }
        throw new Error('Failed to load broker data')
      }
      const data = await res.json()
      setBrokers(data.brokers ?? [])
      const stats = data.stats ?? {}
      setSummary({
        total: stats.totalBrokers ?? 0,
        active: stats.activeBrokers ?? 0,
        totalLeadsSent: stats.totalLeadsSent ?? 0,
        totalBookings: stats.totalBookings ?? 0,
      })
    } catch (err) {
      console.warn('[brokers] fetch error:', err)
      setError('Unable to load broker partners. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetchBrokers() }, [fetchBrokers])

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const openAddForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (broker: Broker) => {
    setEditingId(broker.id)
    setForm({
      companyName: broker.companyName,
      contactName: broker.contactName,
      email: broker.email,
      phone: broker.phone,
      website: broker.website,
      commissionRate: String(broker.commissionRate),
      notes: broker.notes,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      const body = { ...form, commissionRate: Number(form.commissionRate) || 0, siteId }
      const res = await fetch(`/api/admin/yachts/brokers`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
      })
      if (res.ok) {
        await fetchBrokers()
        closeForm()
      }
    } catch { console.warn('[brokers] save failed') }
    finally { setSaving(false) }
  }

  // -----------------------------------------------------------------------
  // Skeleton
  // -----------------------------------------------------------------------

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b">
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-36" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-14" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
          <td className="p-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
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
          <h1 className="text-2xl font-bold text-gray-900">Broker Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage charter broker relationships and track performance</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Partners</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <Handshake className="h-8 w-8 text-blue-500" />
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
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leads Sent</p>
                <p className="text-2xl font-bold text-orange-600">{summary.totalLeadsSent}</p>
              </div>
              <Send className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookings</p>
                <p className="text-2xl font-bold text-purple-600">{summary.totalBookings}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inline form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Edit Partner' : 'New Partner'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeForm}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Mediterranean Charters Ltd" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Primary contact person" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="charter@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <Input type="number" min="0" max="100" step="0.5" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} placeholder="15" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this partner..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving || !form.companyName.trim() || !form.email.trim()}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brokers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners ({brokers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-800 font-medium">Error Loading Partners</p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchBrokers}>Try Again</Button>
              </div>
            </div>
          ) : !loading && brokers.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No broker partners yet</h3>
              <p className="mt-1 text-sm text-gray-500">Add your first broker partner to start managing charter leads.</p>
              <Button className="mt-4" onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 font-medium">
                    <th className="p-3">Company</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Commission</th>
                    <th className="p-3">Leads</th>
                    <th className="p-3">Bookings</th>
                    <th className="p-3">Conversion</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    brokers.map(broker => (
                      <tr key={broker.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div>
                            <span className="font-medium text-gray-900">{broker.companyName}</span>
                            {broker.website && (
                              <a href={broker.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                                <Globe className="h-3 w-3" />
                                Website
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-700">{broker.contactName || <span className="text-gray-400">&ndash;</span>}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-gray-700"><Mail className="h-3 w-3 text-gray-400" />{broker.email}</span>
                            {broker.phone && <span className="flex items-center gap-1 text-gray-500 text-xs"><Phone className="h-3 w-3 text-gray-400" />{broker.phone}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">{broker.commissionRate}%</td>
                        <td className="p-3 text-gray-700">{broker.performance?.leadsSent ?? broker.totalLeadsSent ?? 0}</td>
                        <td className="p-3 text-gray-700">{broker.performance?.bookings ?? broker.totalBookings ?? 0}</td>
                        <td className="p-3">
                          <span className="flex items-center gap-1">
                            <TrendingUp className={`h-3.5 w-3.5 ${(broker.performance?.conversionRate ?? 0) >= 20 ? 'text-green-500' : (broker.performance?.conversionRate ?? 0) >= 10 ? 'text-yellow-500' : 'text-gray-400'}`} />
                            <span className="font-medium">{(broker.performance?.conversionRate ?? 0).toFixed(1)}%</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge className={statusColor[broker.status] ?? 'bg-gray-100 text-gray-600'}>
                            {broker.status.charAt(0).toUpperCase() + broker.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => openEditForm(broker)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
