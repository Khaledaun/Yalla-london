'use client'

import { useState } from 'react'
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminEmptyState,
  AdminSectionLabel,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Users,
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  TrendingUp,
  BarChart3,
  Search,
  Download,
  Target,
  Globe,
  User,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'

interface Subscriber {
  id: string
  email: string
  name?: string
  status: 'active' | 'unsubscribed' | 'bounced'
  subscribedAt: string
  lastActivity: string
  source: 'website' | 'social' | 'referral' | 'manual'
  tags: string[]
  location?: string
  interests: string[]
  engagement: {
    opens: number
    clicks: number
    lastOpen: string
  }
}

interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: 'draft' | 'scheduled' | 'sent' | 'paused'
  scheduledAt?: string
  sentAt?: string
  recipients: number
  opens: number
  clicks: number
  unsubscribes: number
  createdAt: string
  tags: string[]
}

interface Analytics {
  totalSubscribers: number
  newThisWeek: number
  unsubscribed: number
  engagementRate: number
  openRate: number
  clickRate: number
  topCountries: { country: string; count: number }[]
  topInterests: { interest: string; count: number }[]
  monthlyGrowth: number[]
}

export default function CRMSystem() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      status: 'active',
      subscribedAt: '2024-01-10',
      lastActivity: '2024-01-15',
      source: 'website',
      tags: ['london', 'food', 'travel'],
      location: 'London, UK',
      interests: ['restaurants', 'events', 'travel'],
      engagement: { opens: 12, clicks: 8, lastOpen: '2024-01-15' }
    },
    {
      id: '2',
      email: 'sarah.smith@example.com',
      name: 'Sarah Smith',
      status: 'active',
      subscribedAt: '2024-01-12',
      lastActivity: '2024-01-14',
      source: 'social',
      tags: ['london', 'culture', 'art'],
      location: 'Manchester, UK',
      interests: ['museums', 'art', 'culture'],
      engagement: { opens: 8, clicks: 5, lastOpen: '2024-01-14' }
    },
    {
      id: '3',
      email: 'mike.wilson@example.com',
      name: 'Mike Wilson',
      status: 'active',
      subscribedAt: '2024-01-08',
      lastActivity: '2024-01-13',
      source: 'referral',
      tags: ['london', 'business', 'networking'],
      location: 'Birmingham, UK',
      interests: ['business', 'networking', 'events'],
      engagement: { opens: 15, clicks: 12, lastOpen: '2024-01-13' }
    }
  ])

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1', name: 'Weekly London Events',
      subject: 'This Week in London: Must-See Events & Hidden Gems',
      content: 'Discover the best events happening in London this week...',
      status: 'sent', sentAt: '2024-01-15 10:00:00', recipients: 2847, opens: 854, clicks: 234, unsubscribes: 12,
      createdAt: '2024-01-14', tags: ['weekly', 'events', 'london']
    },
    {
      id: '2', name: 'Restaurant Recommendations',
      subject: 'New Restaurant Alert: London\'s Hottest Dining Spots',
      content: 'Check out these amazing new restaurants in London...',
      status: 'scheduled', scheduledAt: '2024-01-20 12:00:00', recipients: 2847, opens: 0, clicks: 0, unsubscribes: 0,
      createdAt: '2024-01-16', tags: ['restaurants', 'food', 'dining']
    },
    {
      id: '3', name: 'Travel Tips & Guides',
      subject: 'Your Ultimate London Travel Guide',
      content: 'Everything you need to know for your London trip...',
      status: 'draft', recipients: 0, opens: 0, clicks: 0, unsubscribes: 0,
      createdAt: '2024-01-17', tags: ['travel', 'guide', 'tips']
    }
  ])

  const [analytics] = useState<Analytics>({
    totalSubscribers: 2847, newThisWeek: 45, unsubscribed: 12,
    engagementRate: 23.4, openRate: 30.0, clickRate: 8.2,
    topCountries: [
      { country: 'United Kingdom', count: 1847 }, { country: 'United States', count: 456 },
      { country: 'Canada', count: 234 }, { country: 'Australia', count: 189 }, { country: 'Germany', count: 121 }
    ],
    topInterests: [
      { interest: 'Restaurants', count: 1247 }, { interest: 'Events', count: 892 },
      { interest: 'Travel', count: 654 }, { interest: 'Culture', count: 456 }, { interest: 'Shopping', count: 234 }
    ],
    monthlyGrowth: [2100, 2300, 2500, 2700, 2847, 0, 0, 0, 0, 0, 0, 0]
  })

  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'unsubscribed' | 'bounced'>('all')
  const [activeTab, setActiveTab] = useState('subscribers')

  const filteredSubscribers = subscribers.filter(subscriber => {
    const matchesSearch = subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscriber.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || subscriber.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const statusMap: Record<string, string> = {
    active: 'active', unsubscribed: 'rejected', bounced: 'warning',
    sent: 'success', scheduled: 'pending', draft: 'draft', paused: 'warning',
  }

  const sourceIcons: Record<string, typeof Globe> = {
    website: Globe, social: Users, referral: User, manual: Plus,
  }

  const sendCampaign = async (campaignId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCampaigns(prev => prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status: 'sent' as const, sentAt: new Date().toISOString() }
          : campaign
      ))
      toast.success('Campaign sent successfully!')
    } catch {
      toast.error('Failed to send campaign')
    }
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="CRM & Newsletter"
        subtitle="Manage subscribers and email campaigns"
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary"><Download size={14} /> Export</AdminButton>
            <AdminButton variant="primary"><Plus size={14} /> New Campaign</AdminButton>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={analytics.totalSubscribers.toLocaleString()} label="Total Subscribers" color="#1C1917" />
        <AdminKPICard value={analytics.newThisWeek} label="New This Week" color="#2D5A3D" trend={{ value: 12, positive: true }} />
        <AdminKPICard value={`${analytics.openRate}%`} label="Open Rate" color="#3B7EA1" />
        <AdminKPICard value={`${analytics.clickRate}%`} label="Click Rate" color="#C49A2A" />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: 'subscribers', label: 'Subscribers' },
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'analytics', label: 'Analytics' },
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
              <AdminButton variant="primary" size="sm"><Plus size={13} /> Add</AdminButton>
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
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </div>
            </AdminCard>

            {filteredSubscribers.map((subscriber) => {
              const SourceIcon = sourceIcons[subscriber.source] || Mail
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
                            {subscriber.name || subscriber.email}
                          </span>
                          <SourceIcon size={13} style={{ color: '#3B7EA1' }} />
                          <AdminStatusBadge status={statusMap[subscriber.status] || subscriber.status} label={subscriber.status} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{subscriber.email}</p>
                        <div className="flex gap-3 mt-1" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          <span>Joined: {subscriber.subscribedAt}</span>
                          <span>Last: {subscriber.lastActivity}</span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {subscriber.tags.slice(0, 3).map(tag => (
                            <AdminStatusBadge key={tag} status="inactive" label={tag} />
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                          {subscriber.engagement.opens}
                        </div>
                        <div style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>opens</div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              )
            })}
          </div>

          {/* Subscriber Details */}
          <div>
            {selectedSubscriber ? (
              <AdminCard accent accentColor="red">
                <AdminSectionLabel>Subscriber Details</AdminSectionLabel>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#C8322B', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAF8F4' }}>
                    {selectedSubscriber.name ? selectedSubscriber.name[0].toUpperCase() : selectedSubscriber.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                      {selectedSubscriber.name || 'No Name'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>{selectedSubscriber.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <FormLabel>Status</FormLabel>
                    <AdminStatusBadge status={statusMap[selectedSubscriber.status]} label={selectedSubscriber.status} />
                  </div>
                  <div>
                    <FormLabel>Source</FormLabel>
                    <span className="capitalize" style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      {selectedSubscriber.source}
                    </span>
                  </div>
                </div>

                {selectedSubscriber.location && (
                  <div className="mb-3">
                    <FormLabel>Location</FormLabel>
                    <div className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      <MapPin size={13} style={{ color: '#A8A29E' }} />
                      {selectedSubscriber.location}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <FormLabel>Interests</FormLabel>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSubscriber.interests.map(i => <AdminStatusBadge key={i} status="pending" label={i} />)}
                  </div>
                </div>

                <div className="mb-4">
                  <FormLabel>Tags</FormLabel>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedSubscriber.tags.map(t => <AdminStatusBadge key={t} status="inactive" label={t} />)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <AdminKPICard value={selectedSubscriber.engagement.opens} label="Email Opens" color="#3B7EA1" />
                  <AdminKPICard value={selectedSubscriber.engagement.clicks} label="Link Clicks" color="#2D5A3D" />
                </div>

                <div className="flex gap-2">
                  <AdminButton variant="secondary" className="flex-1"><Edit size={13} /> Edit</AdminButton>
                  <AdminButton variant="secondary" className="flex-1"><Mail size={13} /> Email</AdminButton>
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

            {campaigns.map((campaign) => (
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
                        <span>Recipients: {campaign.recipients}</span>
                        <span>Opens: {campaign.opens}</span>
                        <span>Clicks: {campaign.clicks}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textAlign: 'right' }}>
                      {campaign.status === 'sent' && campaign.sentAt && (
                        <span>Sent: {new Date(campaign.sentAt).toLocaleDateString()}</span>
                      )}
                      {campaign.status === 'scheduled' && campaign.scheduledAt && (
                        <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </AdminCard>
            ))}
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

                <div className="mb-4">
                  <FormLabel>Content Preview</FormLabel>
                  <textarea className="admin-input w-full resize-none" value={selectedCampaign.content} readOnly rows={4} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <AdminKPICard value={selectedCampaign.recipients} label="Recipients" color="#3B7EA1" />
                  <AdminKPICard value={selectedCampaign.opens} label="Opens" color="#2D5A3D" />
                  <AdminKPICard value={selectedCampaign.clicks} label="Clicks" color="#C49A2A" />
                  <AdminKPICard value={selectedCampaign.unsubscribes} label="Unsubscribes" color="#C8322B" />
                </div>

                <div className="flex gap-2">
                  {(selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled') && (
                    <AdminButton
                      variant={selectedCampaign.status === 'draft' ? 'primary' : 'success'}
                      className="flex-1"
                      onClick={() => sendCampaign(selectedCampaign.id)}
                    >
                      <Send size={13} /> Send Now
                    </AdminButton>
                  )}
                  <AdminButton variant="secondary" className="flex-1"><Edit size={13} /> Edit</AdminButton>
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

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdminCard accent accentColor="blue">
              <AdminSectionLabel>Top Countries</AdminSectionLabel>
              <div className="space-y-2">
                {analytics.topCountries.map((country, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.3)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#3B7EA1', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: '#FAF8F4' }}>
                        {index + 1}
                      </div>
                      <span style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>{country.country}</span>
                    </div>
                    <AdminStatusBadge status="active" label={String(country.count)} />
                  </div>
                ))}
              </div>
            </AdminCard>

            <AdminCard accent accentColor="gold">
              <AdminSectionLabel>Top Interests</AdminSectionLabel>
              <div className="space-y-2">
                {analytics.topInterests.map((interest, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.3)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#C49A2A', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: '#FAF8F4' }}>
                        {index + 1}
                      </div>
                      <span style={{ fontFamily: 'var(--font-system)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>{interest.interest}</span>
                    </div>
                    <AdminStatusBadge status="warning" label={String(interest.count)} />
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>

          <AdminCard accent accentColor="green">
            <AdminSectionLabel>Subscriber Growth</AdminSectionLabel>
            <div className="h-52 flex items-end justify-between gap-1.5 pt-4">
              {analytics.monthlyGrowth.map((count, index) => {
                const maxVal = Math.max(...analytics.monthlyGrowth)
                return (
                  <div key={index} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: maxVal > 0 ? `${(count / maxVal) * 160}px` : '0px',
                        backgroundColor: count > 0 ? '#2D5A3D' : 'rgba(214,208,196,0.3)',
                        minWidth: 12,
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E' }}>
                      {new Date(2024, index).toLocaleDateString('en', { month: 'short' })}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, color: '#44403C' }}>{count || ''}</span>
                  </div>
                )
              })}
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  )
}

/* ─── Form Label ─────────────────────────────────────────────────── */
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
