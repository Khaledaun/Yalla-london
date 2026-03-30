'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminEmptyState,
  AdminSectionLabel,
  AdminTabs,
  AdminLoadingState,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'
import {
  Users,
  Mail,
  Plus,
  Edit,
  Send,
  TrendingUp,
  Search,
  Download,
  Target,
  User,
  Phone,
  MessageSquare,
  Shield,
  DollarSign,
  ChevronRight,
  RefreshCw,
  FileText,
  Clock,
  Star,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

/* ── Types ── */
interface Contact {
  id: string
  type: 'lead' | 'subscriber'
  name: string
  email: string | null
  phone: string | null
  source: string | null
  score: number | null
  status: string | null
  consent: boolean | null
  updatedAt: string
  createdAt: string
}

interface OpportunityItem {
  id: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  value: number | null
  currency: string | null
  source: string | null
  tags: string[]
  nextAction: string | null
  nextActionAt: string | null
  lastInteraction: { summary: string; createdAt: string; channel: string } | null
  createdAt: string
  updatedAt: string
}

interface PipelineStage {
  stage: string
  items: OpportunityItem[]
  count: number
  totalValue: number
}

interface SubscriberRecord {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  source: string | null
  engagement_score: number | null
  preferences_json: unknown
  confirmed_at: string | null
  unsubscribed_at: string | null
  unsubscribe_reason: string | null
  last_campaign_sent: string | null
  created_at: string
  updated_at: string
}

interface ConsentEntry {
  id: string
  consent_type: string
  action: string
  legal_basis: string | null
  processing_purposes: string[]
  timestamp: string
  subscriber: {
    email: string
    first_name: string | null
    last_name: string | null
  } | null
}

interface KPIs {
  totalLeads: number
  totalSubscribers: number
  confirmedSubscribers: number
  totalOpportunities: number
  totalOpportunityValue: number
  interactionsThisWeek: number
}

interface OpportunityStage {
  stage: string
  count: number
  value: number
}

/* ── Helpers ── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatCurrency(value: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

const stageLabels: Record<string, string> = {
  new: 'New', qualifying: 'Qualifying', proposal: 'Proposal',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}

const stageColors: Record<string, string> = {
  new: '#3B7EA1', qualifying: '#C49A2A', proposal: '#2D5A3D',
  negotiation: '#C8322B', won: '#2D5A3D', lost: '#78716C',
}

const subscriberStatusMap: Record<string, string> = {
  CONFIRMED: 'active', PENDING: 'pending', UNSUBSCRIBED: 'rejected',
  BOUNCED: 'warning', COMPLAINED: 'warning',
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null
  const color = score >= 70 ? '#2D5A3D' : score >= 40 ? '#C49A2A' : '#78716C'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}15`, color, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)' }}
    >
      <Star size={9} /> {score}
    </span>
  )
}

/* ── Main Component ── */
export default function CRMPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Overview state
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentLeads, setRecentLeads] = useState<Contact[]>([])
  const [oppStages, setOppStages] = useState<OpportunityStage[]>([])

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsTotal, setContactsTotal] = useState(0)
  const [contactsPage, setContactsPage] = useState(1)
  const [contactSearch, setContactSearch] = useState('')

  // Opportunities state
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])

  // Subscribers state
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([])
  const [subscribersTotal, setSubscribersTotal] = useState(0)
  const [subscribersPage, setSubscribersPage] = useState(1)
  const [subscriberFilter, setSubscriberFilter] = useState('all')
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  // Consent state
  const [consentLogs, setConsentLogs] = useState<ConsentEntry[]>([])
  const [consentTotal, setConsentTotal] = useState(0)
  const [consentPage, setConsentPage] = useState(1)

  // Interaction logger state
  const [interactionContactId, setInteractionContactId] = useState<string | null>(null)
  const [interactionForm, setInteractionForm] = useState({ type: 'note' as string, summary: '', sentiment: 'neutral' as string })
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [interactionSuccess, setInteractionSuccess] = useState<string | null>(null)

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async (view: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ view })

      if (view === 'contacts') {
        params.set('page', String(contactsPage))
        if (contactSearch) params.set('search', contactSearch)
      }
      if (view === 'subscribers') {
        params.set('page', String(subscribersPage))
        if (subscriberFilter !== 'all') params.set('status', subscriberFilter)
      }
      if (view === 'consent') {
        params.set('page', String(consentPage))
      }

      const res = await fetch(`/api/admin/crm?${params}`)
      if (!res.ok) throw new Error('Failed to load data')
      const data = await res.json()

      switch (view) {
        case 'overview':
          setKpis(data.kpis)
          setRecentLeads(data.recentLeads?.map((l: Record<string, unknown>) => ({
            id: l.id, type: 'lead', name: (l.name as string) || (l.email as string) || 'Unknown',
            email: l.email, phone: l.phone, source: l.lead_source,
            score: l.score, status: l.status, consent: null,
            updatedAt: l.updated_at, createdAt: l.created_at,
          })) || [])
          setOppStages(data.opportunityStages || [])
          break
        case 'contacts':
          setContacts(data.contacts || [])
          setContactsTotal(data.total || 0)
          break
        case 'opportunities':
          setPipeline(data.pipeline || [])
          break
        case 'subscribers':
          setSubscribers(data.subscribers || [])
          setSubscribersTotal(data.total || 0)
          setStatusCounts(data.statusCounts || {})
          break
        case 'consent':
          setConsentLogs(data.logs || [])
          setConsentTotal(data.total || 0)
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [contactsPage, contactSearch, subscribersPage, subscriberFilter, consentPage])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const postAction = async (action: string, payload: Record<string, unknown>) => {
    setActionLoading(action)
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Action failed')
      }
      toast.success(`${action.replace(/_/g, ' ')} completed`)
      fetchData(activeTab)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Create Lead Modal State ── */
  const [showCreateLead, setShowCreateLead] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', source: 'manual' })

  const handleCreateLead = async () => {
    if (!newLead.email && !newLead.phone) {
      toast.error('Email or phone required')
      return
    }
    await postAction('create_lead', newLead)
    setShowCreateLead(false)
    setNewLead({ name: '', email: '', phone: '', source: 'manual' })
  }

  /* ── Log Interaction ── */
  const handleLogInteraction = async (contactId: string) => {
    if (!interactionForm.summary.trim()) {
      toast.error('Please enter a summary')
      return
    }
    setInteractionLoading(true)
    try {
      const res = await fetch('/api/admin/agent/crm-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_interaction',
          contactId,
          type: interactionForm.type,
          summary: interactionForm.summary.trim(),
          sentiment: interactionForm.sentiment,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed to log interaction')
      }
      toast.success('Interaction logged')
      setInteractionSuccess(contactId)
      setInteractionForm({ type: 'note', summary: '', sentiment: 'neutral' })
      setTimeout(() => {
        setInteractionSuccess(null)
        setInteractionContactId(null)
      }, 2000)
      fetchData(activeTab)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log interaction')
    } finally {
      setInteractionLoading(false)
    }
  }

  /* ── Move Opportunity Stage ── */
  const moveOpportunity = async (opportunityId: string, stage: string) => {
    await postAction('update_opportunity_stage', { opportunityId, stage })
  }

  /* ── Inline Interaction Logger Component ── */
  const InteractionLogger = ({ contactId }: { contactId: string }) => {
    const isOpen = interactionContactId === contactId
    const isSuccess = interactionSuccess === contactId

    if (isSuccess) {
      return (
        <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: '#2D5A3D10', border: '1px solid #2D5A3D30' }}>
          <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#2D5A3D', fontWeight: 600 }}>
            <span>Interaction logged successfully</span>
          </div>
        </div>
      )
    }

    if (!isOpen) {
      return (
        <div className="mt-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInteractionContactId(contactId) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)', fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', cursor: 'pointer' }}
          >
            <MessageSquare size={11} /> Log Interaction
          </button>
        </div>
      )
    }

    return (
      <div
        className="mt-2 p-3 rounded-xl space-y-2.5"
        style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Log Interaction
        </div>

        {/* Type dropdown */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', display: 'block', marginBottom: 2 }}>Type</label>
            <select
              className="admin-select w-full"
              value={interactionForm.type}
              onChange={e => setInteractionForm(p => ({ ...p, type: e.target.value }))}
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
          </div>

          {/* Sentiment */}
          <div>
            <label style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', display: 'block', marginBottom: 2 }}>Sentiment</label>
            <div className="flex gap-1">
              {([
                { value: 'positive', label: '+', color: '#2D5A3D', bg: '#2D5A3D15' },
                { value: 'neutral', label: '=', color: '#C49A2A', bg: '#C49A2A15' },
                { value: 'negative', label: '-', color: '#C8322B', bg: '#C8322B15' },
              ] as const).map(s => (
                <button
                  key={s.value}
                  onClick={() => setInteractionForm(p => ({ ...p, sentiment: s.value }))}
                  className="flex-1 py-1.5 rounded-lg transition-all text-center"
                  style={{
                    backgroundColor: interactionForm.sentiment === s.value ? s.bg : 'transparent',
                    border: `1.5px solid ${interactionForm.sentiment === s.value ? s.color : 'rgba(214,208,196,0.4)'}`,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 13,
                    color: interactionForm.sentiment === s.value ? s.color : '#A8A29E',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <label style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', display: 'block', marginBottom: 2 }}>Summary</label>
          <textarea
            className="admin-input w-full"
            rows={2}
            placeholder="Brief summary of the interaction..."
            value={interactionForm.summary}
            onChange={e => setInteractionForm(p => ({ ...p, summary: e.target.value }))}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => handleLogInteraction(contactId)}
            disabled={interactionLoading || !interactionForm.summary.trim()}
          >
            {interactionLoading ? 'Saving...' : 'Save'}
          </AdminButton>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => { setInteractionContactId(null); setInteractionForm({ type: 'note', summary: '', sentiment: 'neutral' }) }}
          >
            Cancel
          </AdminButton>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="CRM"
        subtitle="Contacts, opportunities, and marketing consent"
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary" size="sm" onClick={() => fetchData(activeTab)}>
              <RefreshCw size={13} /> Refresh
            </AdminButton>
            <AdminButton variant="primary" size="sm" onClick={() => setShowCreateLead(true)}>
              <Plus size={13} /> New Lead
            </AdminButton>
          </div>
        }
      />

      {error && <AdminAlertBanner severity="warning" message={error} />}

      {/* ── Create Lead Inline Form ── */}
      {showCreateLead && (
        <AdminCard className="mb-4" accent accentColor="green">
          <AdminSectionLabel>Create New Lead</AdminSectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <input className="admin-input" placeholder="Full name" value={newLead.name}
              onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} />
            <input className="admin-input" placeholder="Email" type="email" value={newLead.email}
              onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} />
            <input className="admin-input" placeholder="Phone (with +country code)" value={newLead.phone}
              onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
            <select className="admin-select" value={newLead.source}
              onChange={e => setNewLead(p => ({ ...p, source: e.target.value }))}>
              <option value="manual">Manual</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="referral">Referral</option>
              <option value="social">Social Media</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <AdminButton variant="primary" size="sm" onClick={handleCreateLead}
              disabled={actionLoading === 'create_lead'}>
              {actionLoading === 'create_lead' ? 'Creating...' : 'Create Lead'}
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={() => setShowCreateLead(false)}>Cancel</AdminButton>
          </div>
        </AdminCard>
      )}

      {/* ── Tabs ── */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'contacts', label: 'Contacts', count: contactsTotal > 0 ? contactsTotal : undefined },
            { id: 'opportunities', label: 'Pipeline' },
            { id: 'subscribers', label: 'Subscribers' },
            { id: 'consent', label: 'Consent' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {loading ? (
        <AdminLoadingState label="Loading CRM data..." />
      ) : (
        <>
          {/* ═══════ OVERVIEW TAB ═══════ */}
          {activeTab === 'overview' && kpis && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <AdminKPICard value={kpis.totalLeads} label="Total Leads" color="#1C1917" />
                <AdminKPICard value={kpis.totalSubscribers} label="Subscribers" color="#3B7EA1" />
                <AdminKPICard value={kpis.confirmedSubscribers} label="Confirmed" color="#2D5A3D" />
                <AdminKPICard value={kpis.totalOpportunities} label="Opportunities" color="#C49A2A" />
                <AdminKPICard value={formatCurrency(kpis.totalOpportunityValue)} label="Pipeline Value" color="#C8322B" />
                <AdminKPICard value={kpis.interactionsThisWeek} label="Interactions (7d)" color="#78716C" />
              </div>

              {/* Pipeline Summary + Recent Leads */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pipeline Summary */}
                <AdminCard>
                  <AdminSectionLabel>Opportunity Pipeline</AdminSectionLabel>
                  <div className="space-y-2 mt-2">
                    {oppStages.filter(s => s.count > 0).map(s => (
                      <div key={s.stage} className="flex items-center justify-between p-2.5 rounded-xl"
                        style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.3)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColors[s.stage] || '#78716C' }} />
                          <span style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>
                            {stageLabels[s.stage] || s.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                            {s.count}
                          </span>
                          {s.value > 0 && (
                            <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                              {formatCurrency(s.value)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {oppStages.every(s => s.count === 0) && (
                      <AdminEmptyState icon={Target} title="No Opportunities" description="Create your first opportunity to track deals" />
                    )}
                  </div>
                </AdminCard>

                {/* Recent Activity */}
                <AdminCard>
                  <AdminSectionLabel>Recent Leads</AdminSectionLabel>
                  <div className="space-y-2 mt-2">
                    {recentLeads.length > 0 ? recentLeads.slice(0, 8).map(lead => (
                      <Link
                        key={lead.id}
                        href={`/admin/crm/contact/${lead.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:shadow-sm transition-all"
                        style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.3)' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#C8322B', color: '#FAF8F4', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12 }}>
                            {(lead.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate" style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>
                              {lead.name}
                            </div>
                            <div className="truncate" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                              {lead.email || lead.phone || 'No contact'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ScoreBadge score={lead.score as number} />
                          <ChevronRight size={14} style={{ color: '#A8A29E' }} />
                        </div>
                      </Link>
                    )) : (
                      <AdminEmptyState icon={Users} title="No Leads Yet" description="Create a lead or wait for one to come in" />
                    )}
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          {/* ═══════ CONTACTS TAB ═══════ */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {/* Search */}
              <AdminCard>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
                    <input
                      placeholder="Search by name, email, or phone..."
                      value={contactSearch}
                      onChange={e => { setContactSearch(e.target.value); setContactsPage(1) }}
                      className="admin-input pl-10 w-full"
                    />
                  </div>
                </div>
              </AdminCard>

              {/* Contact List */}
              {contacts.length > 0 ? contacts.map(contact => (
                <AdminCard key={`${contact.type}-${contact.id}`} className="hover:shadow-md transition-all">
                  <Link
                    href={`/admin/crm/contact/${contact.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: contact.type === 'lead' ? '#C8322B' : '#3B7EA1', color: '#FAF8F4', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                          {(contact.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                              {contact.name}
                            </span>
                            <AdminStatusBadge
                              status={contact.type === 'lead' ? 'warning' : 'active'}
                              label={contact.type}
                            />
                          </div>
                          <div className="flex items-center gap-3" style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                            {contact.email && (
                              <span className="flex items-center gap-1 truncate"><Mail size={10} /> {contact.email}</span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1"><Phone size={10} /> {contact.phone}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1" style={{ fontSize: 10, color: '#A8A29E' }}>
                            {contact.source && <span className="capitalize">{contact.source}</span>}
                            <span>{relativeTime(contact.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ScoreBadge score={contact.score} />
                        {contact.consent && <Shield size={12} style={{ color: '#2D5A3D' }} />}
                        <ChevronRight size={16} style={{ color: '#A8A29E' }} />
                      </div>
                    </div>
                  </Link>
                  <InteractionLogger contactId={contact.id} />
                </AdminCard>
              )) : (
                <AdminCard>
                  <AdminEmptyState icon={Users} title="No Contacts Found"
                    description={contactSearch ? 'Try a different search term' : 'Create a lead to get started'} />
                </AdminCard>
              )}

              {/* Pagination */}
              {contactsTotal > 25 && (
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                    Showing {(contactsPage - 1) * 25 + 1}-{Math.min(contactsPage * 25, contactsTotal)} of {contactsTotal}
                  </span>
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" size="sm" disabled={contactsPage <= 1}
                      onClick={() => setContactsPage(p => p - 1)}>Previous</AdminButton>
                    <AdminButton variant="ghost" size="sm" disabled={contactsPage * 25 >= contactsTotal}
                      onClick={() => setContactsPage(p => p + 1)}>Next</AdminButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ OPPORTUNITIES (PIPELINE) TAB ═══════ */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              {/* Pipeline stage cards — vertical on mobile, horizontal scroll on desktop */}
              <div className="flex flex-col lg:flex-row gap-3 lg:overflow-x-auto lg:pb-4">
                {pipeline.map(stage => (
                  <div key={stage.stage} className="lg:min-w-[280px] lg:max-w-[320px] flex-shrink-0">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColors[stage.stage] || '#78716C' }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {stageLabels[stage.stage] || stage.stage}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FAF8F4', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, color: '#78716C' }}>
                          {stage.count}
                        </span>
                      </div>
                      {stage.totalValue > 0 && (
                        <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                          {formatCurrency(stage.totalValue)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {stage.items.length > 0 ? stage.items.map(opp => (
                        <AdminCard key={opp.id} className="!p-3">
                          <div className="flex items-start justify-between mb-1">
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#1C1917' }}>
                              {opp.contactName || opp.contactEmail || 'Unknown'}
                            </span>
                            {opp.value && (
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#2D5A3D' }}>
                                {formatCurrency(opp.value, opp.currency || 'GBP')}
                              </span>
                            )}
                          </div>
                          {opp.contactEmail && (
                            <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', marginBottom: 4 }}>
                              {opp.contactEmail}
                            </div>
                          )}
                          {opp.lastInteraction && (
                            <div className="p-2 rounded-lg mb-2" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.2)' }}>
                              <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#44403C' }}>
                                {opp.lastInteraction.summary?.substring(0, 80)}
                              </div>
                              <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', marginTop: 2 }}>
                                {opp.lastInteraction.channel} &middot; {relativeTime(opp.lastInteraction.createdAt)}
                              </div>
                            </div>
                          )}
                          {opp.nextAction && (
                            <div className="flex items-center gap-1 mb-2" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C49A2A' }}>
                              <Clock size={10} /> {opp.nextAction}
                            </div>
                          )}
                          {/* Interaction Logger */}
                          <InteractionLogger contactId={opp.id} />

                          {/* Stage move buttons */}
                          <div className="flex gap-1 flex-wrap mt-2">
                            {stage.stage !== 'won' && stage.stage !== 'lost' && (
                              <>
                                {stage.stage !== 'new' && (
                                  <AdminButton variant="ghost" size="sm"
                                    onClick={() => {
                                      const stages = ['new', 'qualifying', 'proposal', 'negotiation']
                                      const idx = stages.indexOf(stage.stage)
                                      if (idx > 0) moveOpportunity(opp.id, stages[idx - 1])
                                    }}>
                                    &larr;
                                  </AdminButton>
                                )}
                                <AdminButton variant="ghost" size="sm"
                                  onClick={() => {
                                    const stages = ['new', 'qualifying', 'proposal', 'negotiation', 'won']
                                    const idx = stages.indexOf(stage.stage)
                                    if (idx < stages.length - 1) moveOpportunity(opp.id, stages[idx + 1])
                                  }}>
                                  &rarr;
                                </AdminButton>
                                <AdminButton variant="ghost" size="sm"
                                  onClick={() => moveOpportunity(opp.id, 'lost')}>
                                  Lost
                                </AdminButton>
                              </>
                            )}
                          </div>
                        </AdminCard>
                      )) : (
                        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#FAF8F4', border: '1px dashed rgba(214,208,196,0.5)' }}>
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#A8A29E' }}>Empty</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {pipeline.length === 0 && (
                <AdminCard>
                  <AdminEmptyState icon={Target} title="No Opportunities"
                    description="Create an opportunity to start tracking your pipeline" />
                </AdminCard>
              )}
            </div>
          )}

          {/* ═══════ SUBSCRIBERS TAB ═══════ */}
          {activeTab === 'subscribers' && (
            <div className="space-y-3">
              {/* Status filter */}
              <AdminCard>
                <div className="flex items-center gap-3 flex-wrap">
                  <select className="admin-select" value={subscriberFilter}
                    onChange={e => { setSubscriberFilter(e.target.value); setSubscribersPage(1) }}>
                    <option value="all">All ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})</option>
                    <option value="CONFIRMED">Confirmed ({statusCounts.CONFIRMED || 0})</option>
                    <option value="PENDING">Pending ({statusCounts.PENDING || 0})</option>
                    <option value="UNSUBSCRIBED">Unsubscribed ({statusCounts.UNSUBSCRIBED || 0})</option>
                    <option value="BOUNCED">Bounced ({statusCounts.BOUNCED || 0})</option>
                  </select>
                  <AdminButton variant="secondary" size="sm">
                    <Download size={13} /> Export
                  </AdminButton>
                </div>
              </AdminCard>

              {/* Subscriber List */}
              {subscribers.length > 0 ? subscribers.map(sub => (
                <AdminCard key={sub.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#3B7EA1', color: '#FAF8F4', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                        {(sub.first_name || sub.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#1C1917' }}>
                            {[sub.first_name, sub.last_name].filter(Boolean).join(' ') || sub.email}
                          </span>
                          <AdminStatusBadge
                            status={subscriberStatusMap[sub.status] || 'pending'}
                            label={sub.status.toLowerCase()}
                          />
                        </div>
                        <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                          {sub.email}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5" style={{ fontSize: 10, color: '#A8A29E' }}>
                          {sub.source && <span className="capitalize">{sub.source}</span>}
                          <span>Joined {new Date(sub.created_at).toLocaleDateString()}</span>
                          {sub.engagement_score !== null && (
                            <span>Engagement: {sub.engagement_score}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.status === 'CONFIRMED' && (
                        <AdminButton variant="ghost" size="sm"
                          onClick={() => postAction('update_subscriber_status', { subscriberId: sub.id, status: 'UNSUBSCRIBED' })}>
                          Unsub
                        </AdminButton>
                      )}
                      {sub.status === 'UNSUBSCRIBED' && (
                        <AdminButton variant="ghost" size="sm"
                          onClick={() => postAction('update_subscriber_status', { subscriberId: sub.id, status: 'CONFIRMED' })}>
                          Re-sub
                        </AdminButton>
                      )}
                    </div>
                  </div>
                </AdminCard>
              )) : (
                <AdminCard>
                  <AdminEmptyState icon={Mail} title="No Subscribers"
                    description={subscriberFilter !== 'all' ? 'No subscribers with this status' : 'No subscribers yet'} />
                </AdminCard>
              )}

              {/* Pagination */}
              {subscribersTotal > 25 && (
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                    Showing {(subscribersPage - 1) * 25 + 1}-{Math.min(subscribersPage * 25, subscribersTotal)} of {subscribersTotal}
                  </span>
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" size="sm" disabled={subscribersPage <= 1}
                      onClick={() => setSubscribersPage(p => p - 1)}>Previous</AdminButton>
                    <AdminButton variant="ghost" size="sm" disabled={subscribersPage * 25 >= subscribersTotal}
                      onClick={() => setSubscribersPage(p => p + 1)}>Next</AdminButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ CONSENT TAB ═══════ */}
          {activeTab === 'consent' && (
            <div className="space-y-3">
              <AdminAlertBanner
                severity="info"
                message="GDPR consent audit trail. All consent changes are logged with timestamp, legal basis, and processing purposes."
              />

              {consentLogs.length > 0 ? consentLogs.map(log => (
                <AdminCard key={log.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AdminStatusBadge
                          status={log.action === 'granted' ? 'active' : log.action === 'withdrawn' ? 'rejected' : 'pending'}
                          label={log.action}
                        />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: '#1C1917' }}>
                          {log.consent_type}
                        </span>
                      </div>
                      {log.subscriber && (
                        <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginBottom: 4 }}>
                          {[log.subscriber.first_name, log.subscriber.last_name].filter(Boolean).join(' ') || log.subscriber.email}
                          {' '}&middot; {log.subscriber.email}
                        </div>
                      )}
                      {log.legal_basis && (
                        <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          Legal basis: {log.legal_basis}
                        </div>
                      )}
                      {log.processing_purposes?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {log.processing_purposes.map(p => (
                            <AdminStatusBadge key={p} status="inactive" label={p.replace(/_/g, ' ')} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textAlign: 'right', flexShrink: 0 }}>
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </AdminCard>
              )) : (
                <AdminCard>
                  <AdminEmptyState icon={Shield} title="No Consent Records"
                    description="Consent changes will appear here as subscribers manage their preferences" />
                </AdminCard>
              )}

              {/* Pagination */}
              {consentTotal > 25 && (
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                    Page {consentPage} of {Math.ceil(consentTotal / 25)}
                  </span>
                  <div className="flex gap-2">
                    <AdminButton variant="ghost" size="sm" disabled={consentPage <= 1}
                      onClick={() => setConsentPage(p => p - 1)}>Previous</AdminButton>
                    <AdminButton variant="ghost" size="sm" disabled={consentPage * 25 >= consentTotal}
                      onClick={() => setConsentPage(p => p + 1)}>Next</AdminButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
