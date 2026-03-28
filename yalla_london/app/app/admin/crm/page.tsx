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
} from '@/components/admin/admin-ui'
import {
  Users,
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  Search,
  Download,
  Globe,
  User,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface Subscriber {
  id: string
  email: string
  first_name?: string
  last_name?: string
  status: string
  source?: string
  created_at: string
  updated_at: string
  confirmed_at?: string
  unsubscribed_at?: string
  engagement_score?: number
  metadata_json?: Record<string, unknown>
  preferences_json?: Record<string, unknown>
}

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  scheduledAt?: string
  sentAt?: string
  recipientCount: number
  openCount: number
  clickCount: number
  sentCount: number
  createdAt: string
}

interface CRMData {
  subscribers: Subscriber[]
  campaigns: Campaign[]
  stats: {
    totalSubscribers: number
    activeSubscribers: number
    unsubscribed: number
    bounced: number
    totalCampaigns: number
    sentCampaigns: number
  }
}

export default function CRMSystem() {
  const [data, setData] = useState<CRMData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('subscribers')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/crm')
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load CRM data'
      setError(message)
      console.warn('[crm] fetch error:', message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredSubscribers = (data?.subscribers || []).filter(sub => {
    const name = `${sub.first_name || ''} ${sub.last_name || ''}`.trim()
    const matchesSearch = sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || sub.status.toLowerCase() === filterStatus
    return matchesSearch && matchesStatus
  })

  const statusMap: Record<string, string> = {
    CONFIRMED: 'active', PENDING: 'pending', UNSUBSCRIBED: 'rejected', BOUNCED: 'warning',
    active: 'active', unsubscribed: 'rejected', bounced: 'warning',
    sent: 'success', scheduled: 'pending', draft: 'draft', sending: 'pending', failed: 'warning',
  }

  const stats = data?.stats || { totalSubscribers: 0, activeSubscribers: 0, unsubscribed: 0, bounced: 0, totalCampaigns: 0, sentCampaigns: 0 }

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader title="CRM & Newsletter" subtitle="Manage subscribers and email campaigns" />
        <AdminLoadingState label="Loading CRM data..." />
      </div>
    )
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="CRM & Newsletter"
        subtitle="Manage subscribers and email campaigns"
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={fetchData}><RefreshCw size={14} /> Refresh</AdminButton>
            <AdminButton variant="primary"><Plus size={14} /> New Campaign</AdminButton>
          </div>
        }
      />

      {error && (
        <AdminCard className="mb-4 border-l-4 border-l-[#C8322B]">
          <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#C8322B' }}>
            Failed to load CRM data: {error}
          </p>
          <AdminButton variant="secondary" size="sm" onClick={fetchData} className="mt-2">
            <RefreshCw size={12} /> Retry
          </AdminButton>
        </AdminCard>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={stats.totalSubscribers} label="Total Subscribers" color="#1C1917" />
        <AdminKPICard value={stats.activeSubscribers} label="Active" color="#2D5A3D" />
        <AdminKPICard value={stats.unsubscribed} label="Unsubscribed" color="#C8322B" />
        <AdminKPICard value={stats.totalCampaigns} label="Campaigns" color="#3B7EA1" />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: 'subscribers', label: `Subscribers (${stats.totalSubscribers})` },
            { id: 'campaigns', label: `Campaigns (${stats.totalCampaigns})` },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <AdminSectionLabel>Newsletter Subscribers</AdminSectionLabel>
            </div>

            {/* Search and Filter */}
            <AdminCard>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
                  <input
                    placeholder="Search subscribers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="admin-input pl-10 w-full"
                  />
                </div>
                <select className="admin-select" value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="confirmed">Active</option>
                  <option value="pending">Pending</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </div>
            </AdminCard>

            {filteredSubscribers.length === 0 ? (
              <AdminCard>
                <AdminEmptyState
                  icon={Users}
                  title={data?.subscribers.length === 0 ? "No Subscribers Yet" : "No Matches"}
                  description={data?.subscribers.length === 0
                    ? "Subscribers will appear here when users sign up on your site"
                    : "Try a different search term or filter"
                  }
                />
              </AdminCard>
            ) : (
              filteredSubscribers.map((subscriber) => {
                const name = `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
                return (
                  <AdminCard
                    key={subscriber.id}
                    className={`cursor-pointer transition-all ${selectedSubscriber?.id === subscriber.id ? 'ring-2 ring-[#C8322B]' : 'hover:shadow-md'}`}
                    elevated={selectedSubscriber?.id === subscriber.id}
                  >
                    <div onClick={() => setSelectedSubscriber(subscriber)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                              {name || subscriber.email}
                            </span>
                            <AdminStatusBadge status={statusMap[subscriber.status] || 'inactive'} label={subscriber.status.toLowerCase()} />
                          </div>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{subscriber.email}</p>
                          <div className="flex gap-3 mt-1" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            <span>Joined: {new Date(subscriber.created_at).toLocaleDateString()}</span>
                            {subscriber.source && <span>Source: {subscriber.source}</span>}
                          </div>
                        </div>
                        {subscriber.engagement_score != null && (
                          <div className="text-right">
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                              {Math.round(subscriber.engagement_score)}
                            </div>
                            <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>score</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </AdminCard>
                )
              })
            )}
          </div>

          {/* Subscriber Details */}
          <div>
            {selectedSubscriber ? (
              <AdminCard accent accentColor="red">
                <AdminSectionLabel>Subscriber Details</AdminSectionLabel>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#C8322B', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAF8F4' }}>
                    {(selectedSubscriber.first_name || selectedSubscriber.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                      {`${selectedSubscriber.first_name || ''} ${selectedSubscriber.last_name || ''}`.trim() || 'No Name'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{selectedSubscriber.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <FormLabel>Status</FormLabel>
                    <AdminStatusBadge status={statusMap[selectedSubscriber.status] || 'inactive'} label={selectedSubscriber.status} />
                  </div>
                  <div>
                    <FormLabel>Source</FormLabel>
                    <span className="capitalize" style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      {selectedSubscriber.source || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <FormLabel>Subscribed</FormLabel>
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      {new Date(selectedSubscriber.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedSubscriber.confirmed_at && (
                    <div>
                      <FormLabel>Confirmed</FormLabel>
                      <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                        {new Date(selectedSubscriber.confirmed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {selectedSubscriber.engagement_score != null && (
                  <div className="mb-4">
                    <AdminKPICard value={Math.round(selectedSubscriber.engagement_score)} label="Engagement Score" color="#3B7EA1" />
                  </div>
                )}

                <div className="flex gap-2">
                  <AdminButton variant="secondary" className="flex-1"><Mail size={13} /> Email</AdminButton>
                  <AdminButton variant="secondary" className="flex-1"><Trash2 size={13} /> Remove</AdminButton>
                </div>
              </AdminCard>
            ) : (
              <AdminCard>
                <AdminEmptyState icon={User} title="Select a Subscriber" description="Choose a subscriber from the list to view details" />
              </AdminCard>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <AdminSectionLabel>Email Campaigns</AdminSectionLabel>
              <AdminButton variant="primary" size="sm"><Plus size={13} /> Create</AdminButton>
            </div>

            {(data?.campaigns || []).length === 0 ? (
              <AdminCard>
                <AdminEmptyState
                  icon={Mail}
                  title="No Campaigns Yet"
                  description="Create your first email campaign to engage subscribers"
                />
              </AdminCard>
            ) : (
              (data?.campaigns || []).map((campaign) => (
                <AdminCard
                  key={campaign.id}
                  className={`cursor-pointer transition-all ${selectedCampaign?.id === campaign.id ? 'ring-2 ring-[#C8322B]' : 'hover:shadow-md'}`}
                  elevated={selectedCampaign?.id === campaign.id}
                >
                  <div onClick={() => setSelectedCampaign(campaign)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                            {campaign.name}
                          </span>
                          <AdminStatusBadge status={statusMap[campaign.status] || campaign.status} label={campaign.status} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginBottom: 4 }}>{campaign.subject}</p>
                        <div className="flex gap-3" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          <span>Recipients: {campaign.recipientCount}</span>
                          <span>Opens: {campaign.openCount}</span>
                          <span>Clicks: {campaign.clickCount}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textAlign: 'right' }}>
                        {campaign.sentAt && <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                        {!campaign.sentAt && campaign.scheduledAt && <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))
            )}
          </div>

          {/* Campaign Details */}
          <div>
            {selectedCampaign ? (
              <AdminCard accent accentColor="blue">
                <AdminSectionLabel>Campaign Details</AdminSectionLabel>
                <div className="mb-3">
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917' }}>
                    {selectedCampaign.name}
                  </div>
                  <div className="mt-1">
                    <AdminStatusBadge status={statusMap[selectedCampaign.status]} label={selectedCampaign.status} />
                  </div>
                </div>

                <div className="mb-3">
                  <FormLabel>Subject Line</FormLabel>
                  <input className="admin-input w-full" value={selectedCampaign.subject} readOnly />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <AdminKPICard value={selectedCampaign.recipientCount} label="Recipients" color="#3B7EA1" />
                  <AdminKPICard value={selectedCampaign.openCount} label="Opens" color="#2D5A3D" />
                  <AdminKPICard value={selectedCampaign.clickCount} label="Clicks" color="#C49A2A" />
                  <AdminKPICard value={selectedCampaign.sentCount} label="Sent" color="#1C1917" />
                </div>

                <div className="flex gap-2">
                  {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled') && (
                    <AdminButton variant="primary" className="flex-1">
                      <Send size={13} /> Send Now
                    </AdminButton>
                  )}
                  <AdminButton variant="secondary" className="flex-1"><Eye size={13} /> Preview</AdminButton>
                </div>
              </AdminCard>
            ) : (
              <AdminCard>
                <AdminEmptyState icon={Mail} title="Select a Campaign" description="Choose a campaign from the list to view details" />
              </AdminCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* Form Label */
function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '1px', color: '#78716C', marginBottom: 4,
    }}>
      {children}
    </div>
  )
}
