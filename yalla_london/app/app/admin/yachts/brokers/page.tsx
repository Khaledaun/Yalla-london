'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSiteId } from '@/components/site-provider'
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
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
  // Conversion rate color
  // -----------------------------------------------------------------------

  const conversionColor = (rate: number) => {
    if (rate >= 20) return '#2D5A3D'
    if (rate >= 10) return '#C49A2A'
    return '#A8A29E'
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Broker Partners"
        subtitle="Manage charter broker relationships and track performance"
        action={
          <AdminButton variant="primary" onClick={openAddForm}>
            <Plus size={14} />
            Add Partner
          </AdminButton>
        }
      />

      {/* Error Banner */}
      {error && (
        <AdminAlertBanner
          severity="critical"
          message="Error Loading Partners"
          detail={error}
          action={
            <AdminButton variant="secondary" size="sm" onClick={fetchBrokers}>
              Try Again
            </AdminButton>
          }
          onDismiss={() => setError(null)}
        />
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard
          value={summary.total}
          label="Total Partners"
          color="#3B7EA1"
        />
        <AdminKPICard
          value={summary.active}
          label="Active"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={summary.totalLeadsSent}
          label="Leads Sent"
          color="#C49A2A"
        />
        <AdminKPICard
          value={summary.totalBookings}
          label="Bookings"
          color="#C8322B"
        />
      </div>

      {/* Inline Form */}
      {showForm && (
        <AdminCard elevated className="mb-6" accent accentColor="blue">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <AdminSectionLabel>
                {editingId ? 'Edit Partner' : 'New Partner'}
              </AdminSectionLabel>
              <AdminButton variant="ghost" size="sm" onClick={closeForm}>
                <X size={14} />
              </AdminButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Company Name *
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="e.g. Mediterranean Charters Ltd"
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Contact Name
                </label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Primary contact person"
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="charter@example.com"
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 ..."
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commissionRate}
                  onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                  placeholder="15"
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  className="block mb-1"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#44403C',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes about this partner..."
                  className="admin-input"
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <AdminButton variant="secondary" onClick={closeForm}>
                Cancel
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!form.companyName.trim() || !form.email.trim()}
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Create'}
              </AdminButton>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Brokers Table */}
      <AdminCard>
        <div className="p-5">
          <AdminSectionLabel>Partners ({brokers.length})</AdminSectionLabel>

          {loading ? (
            <AdminLoadingState label="Loading partners..." />
          ) : !error && brokers.length === 0 ? (
            <AdminEmptyState
              icon={Handshake}
              title="No broker partners yet"
              description="Add your first broker partner to start managing charter leads."
              action={
                <AdminButton variant="primary" onClick={openAddForm}>
                  <Plus size={14} />
                  Add Partner
                </AdminButton>
              }
            />
          ) : brokers.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(214,208,196,0.5)',
                        fontFamily: 'var(--font-system)',
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#78716C',
                      }}
                    >
                      <th className="text-left p-3">Company</th>
                      <th className="text-left p-3">Contact</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Commission</th>
                      <th className="text-left p-3">Leads</th>
                      <th className="text-left p-3">Bookings</th>
                      <th className="text-left p-3">Conversion</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokers.map(broker => (
                      <tr
                        key={broker.id}
                        className="transition-colors"
                        style={{
                          borderBottom: '1px solid rgba(214,208,196,0.3)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(59,126,161,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="p-3">
                          <div>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                              {broker.companyName}
                            </span>
                            {broker.website && (
                              <a
                                href={broker.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 mt-0.5"
                                style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#3B7EA1' }}
                              >
                                <Globe size={10} />
                                Website
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>
                          {broker.contactName || <span style={{ color: '#A8A29E' }}>&ndash;</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1" style={{ color: '#44403C', fontSize: 12 }}>
                              <Mail size={11} color="#A8A29E" />
                              {broker.email}
                            </span>
                            {broker.phone && (
                              <span className="flex items-center gap-1" style={{ color: '#78716C', fontSize: 10 }}>
                                <Phone size={10} color="#A8A29E" />
                                {broker.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#C49A2A' }}>
                            {broker.commissionRate}%
                          </span>
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>
                          {broker.performance?.leadsSent ?? broker.totalLeadsSent ?? 0}
                        </td>
                        <td className="p-3" style={{ color: '#44403C' }}>
                          {broker.performance?.bookings ?? broker.totalBookings ?? 0}
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1">
                            <TrendingUp
                              size={12}
                              color={conversionColor(broker.performance?.conversionRate ?? 0)}
                            />
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: conversionColor(broker.performance?.conversionRate ?? 0) }}>
                              {(broker.performance?.conversionRate ?? 0).toFixed(1)}%
                            </span>
                          </span>
                        </td>
                        <td className="p-3">
                          <AdminStatusBadge status={broker.status} />
                        </td>
                        <td className="p-3">
                          <AdminButton variant="ghost" size="sm" onClick={() => openEditForm(broker)}>
                            <Edit size={13} />
                          </AdminButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {brokers.map(broker => (
                  <AdminCard key={broker.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                          {broker.companyName}
                        </p>
                        {broker.contactName && (
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 2 }}>
                            {broker.contactName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge status={broker.status} />
                        <AdminButton variant="ghost" size="sm" onClick={() => openEditForm(broker)}>
                          <Edit size={13} />
                        </AdminButton>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-3" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                      <span className="flex items-center gap-1">
                        <Mail size={10} color="#A8A29E" />
                        {broker.email}
                      </span>
                      {broker.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} color="#A8A29E" />
                          {broker.phone}
                        </span>
                      )}
                    </div>

                    <div
                      className="grid grid-cols-4 gap-2 pt-3"
                      style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}
                    >
                      <div className="text-center">
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#C49A2A' }}>
                          {broker.commissionRate}%
                        </p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 8, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Commission
                        </p>
                      </div>
                      <div className="text-center">
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                          {broker.performance?.leadsSent ?? broker.totalLeadsSent ?? 0}
                        </p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 8, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Leads
                        </p>
                      </div>
                      <div className="text-center">
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                          {broker.performance?.bookings ?? broker.totalBookings ?? 0}
                        </p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 8, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Bookings
                        </p>
                      </div>
                      <div className="text-center">
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: conversionColor(broker.performance?.conversionRate ?? 0) }}>
                          {(broker.performance?.conversionRate ?? 0).toFixed(1)}%
                        </p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 8, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Conversion
                        </p>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </AdminCard>
    </div>
  )
}
