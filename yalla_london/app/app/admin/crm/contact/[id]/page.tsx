'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
  AdminKPICard,
} from '@/components/admin/admin-ui'

// ─── Types ──────────────────────────────────────────────────────────

interface ContactProfile {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: 'lead' | 'subscriber'
  score: number
  lead: LeadDetail | null
  subscriber: SubscriberDetail | null
  opportunities: Opportunity[]
  inquiries: Inquiry[]
  conversations: Conversation[]
  timeline: TimelineEntry[]
}

interface LeadDetail {
  id: string
  status: string
  source: string | null
  type: string | null
  interests: string | null
  budget: string | null
  travelDates: string | null
  partySize: number | null
  consent: boolean
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  createdAt: string
  updatedAt: string
}

interface SubscriberDetail {
  id: string
  email: string
  status: string
  source: string | null
  preferences: string | null
  engagementScore: number | null
  confirmedAt: string | null
  unsubscribedAt: string | null
  consentLogs: string | null
}

interface Opportunity {
  id: string
  stage: string
  value: number | null
  currency: string | null
  source: string | null
  nextAction: string | null
  nextActionAt: string | null
  createdAt: string
  updatedAt: string
}

interface Inquiry {
  id: string
  type: string | null
  message: string | null
  status: string
  createdAt: string
}

interface Conversation {
  id: string
  channel: string
  status: string
  summary: string | null
  sentiment: string | null
  updatedAt: string
}

interface TimelineEntry {
  id: string
  type: string
  channel: string | null
  direction: string | null
  summary: string | null
  sentiment: string | null
  date: string
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function scoreColor(score: number): string {
  if (score >= 60) return '#2D5A3D'
  if (score >= 30) return '#C49A2A'
  return '#C8322B'
}

const STAGE_COLORS: Record<string, string> = {
  new: 'pending',
  qualifying: 'generating',
  proposal: 'draft',
  negotiation: 'warning',
  won: 'success',
  lost: 'failed',
}

const DIRECTION_ARROWS: Record<string, string> = {
  inbound: '>> ',
  outbound: '<< ',
}

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: '(+)',
  neutral: '(~)',
  negative: '(-)',
}

// ─── Detail Row ─────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-stone-100 last:border-0">
      <span className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[0.8px] flex-shrink-0">
        {label}
      </span>
      <span className="font-[var(--font-system)] text-[12px] text-stone-800 text-right break-words min-w-0">
        {value}
      </span>
    </div>
  )
}

// ─── Empty Icon Placeholder ─────────────────────────────────────────

function EmptyIcon({ size = 24, color = '#78716C' }: { size?: number | string; color?: string }) {
  return (
    <span style={{ fontSize: typeof size === 'number' ? size : 24, color, lineHeight: 1 }}>
      ...
    </span>
  )
}

// ─── Page ───────────────────────────────────────────────────────────

export default function ContactProfilePage() {
  const params = useParams()
  const contactId = params?.id as string

  const [profile, setProfile] = useState<ContactProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Action states
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteResult, setNoteResult] = useState<string | null>(null)
  const [consentLoading, setConsentLoading] = useState(false)
  const [oppLoading, setOppLoading] = useState(false)
  const [actionResult, setActionResult] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!contactId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/crm/contacts/${contactId}`, {
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // ─── Action Handlers ──────────────────────────────────────────────

  async function handleAddNote() {
    if (!noteText.trim()) return
    setNoteLoading(true)
    setNoteResult(null)
    try {
      const res = await fetch(`/api/admin/crm/contacts/${contactId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', summary: noteText.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNoteText('')
      setNoteResult('Note added')
      fetchProfile()
    } catch (err) {
      setNoteResult(err instanceof Error ? err.message : 'Failed')
    } finally {
      setNoteLoading(false)
    }
  }

  async function handleUpdateConsent(granted: boolean) {
    setConsentLoading(true)
    setActionResult(null)
    try {
      const res = await fetch(`/api/admin/crm/contacts/${contactId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_consent', consentType: 'marketing', granted }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setActionResult(`Consent ${granted ? 'granted' : 'revoked'}`)
      fetchProfile()
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : 'Failed')
    } finally {
      setConsentLoading(false)
    }
  }

  async function handleCreateOpportunity() {
    if (!profile) return
    setOppLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_opportunity',
          contactName: profile.name,
          contactEmail: profile.email,
          leadId: profile.lead?.id || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setActionResult('Opportunity created')
      fetchProfile()
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : 'Failed')
    } finally {
      setOppLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader title="Contact" backHref="/admin/crm" />
        <AdminLoadingState label="Loading contact..." />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminPageHeader title="Contact" backHref="/admin/crm" />
        <div className="rounded-xl bg-[rgba(200,50,43,0.06)] border border-[#C8322B33] border-l-[3px] border-l-[#C8322B] px-4 py-3 mb-4">
          <p className="font-[var(--font-system)] text-[12px] font-semibold text-[#9B2520]">
            {error || 'Contact not found'}
          </p>
        </div>
        <Link href="/admin/crm" className="font-[var(--font-system)] text-[12px] text-[#3B7EA1] underline">
          Back to CRM
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline', count: profile.timeline.length },
    { id: 'opportunities', label: 'Opportunities', count: profile.opportunities.length },
    { id: 'actions', label: 'Actions' },
  ]

  const lastInteraction = profile.timeline.length > 0
    ? formatDate(profile.timeline[0].date)
    : '—'

  const hasConsent = profile.lead?.consent ?? false

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6 max-w-4xl mx-auto">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <AdminPageHeader
        title={profile.name || 'Unknown Contact'}
        subtitle="Contact Profile"
        backHref="/admin/crm"
      />

      {/* ─── Contact Info Bar ─────────────────────────────────────── */}
      <AdminCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Score gauge */}
          <div
            className="w-12 h-12 rounded-full border-[3px] flex items-center justify-center flex-shrink-0 font-[var(--font-display)] font-extrabold text-base"
            style={{
              borderColor: scoreColor(profile.score),
              color: scoreColor(profile.score),
            }}
          >
            {profile.score}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-[var(--font-display)] font-bold text-base text-stone-900 truncate">
                {profile.name}
              </span>
              <AdminStatusBadge
                status={profile.type === 'lead' ? 'active' : 'indexed'}
                label={profile.type === 'lead' ? 'Lead' : 'Subscriber'}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
              {profile.email && (
                <span className="font-[var(--font-system)] text-[12px] text-stone-600 truncate">
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="font-[var(--font-system)] text-[12px] text-stone-500 truncate">
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </AdminCard>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ─── Tab: Overview ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminKPICard
              value={profile.score}
              label="Lead Score"
              color={scoreColor(profile.score)}
            />
            <AdminKPICard
              value={profile.opportunities.length}
              label="Opportunities"
              color="#3B7EA1"
            />
            <AdminKPICard
              value={profile.conversations.length}
              label="Conversations"
              color="#7C3AED"
            />
            <AdminKPICard
              value={lastInteraction}
              label="Last Interaction"
              color="#1C1917"
            />
          </div>

          {/* Lead details */}
          {profile.lead && (
            <AdminCard>
              <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
                Lead Details
              </p>
              <DetailRow label="Status" value={<AdminStatusBadge status={profile.lead.status} />} />
              <DetailRow label="Source" value={profile.lead.source} />
              <DetailRow label="Type" value={profile.lead.type} />
              <DetailRow label="Interests" value={profile.lead.interests} />
              <DetailRow label="Budget" value={profile.lead.budget} />
              <DetailRow label="Travel Dates" value={profile.lead.travelDates} />
              <DetailRow label="Party Size" value={profile.lead.partySize?.toString()} />
              <DetailRow
                label="Consent"
                value={
                  <span className={profile.lead.consent ? 'text-[#2D5A3D]' : 'text-[#C8322B]'}>
                    {profile.lead.consent ? 'Granted' : 'Not granted'}
                  </span>
                }
              />
              {(profile.lead.utmSource || profile.lead.utmMedium || profile.lead.utmCampaign) && (
                <>
                  <DetailRow label="UTM Source" value={profile.lead.utmSource} />
                  <DetailRow label="UTM Medium" value={profile.lead.utmMedium} />
                  <DetailRow label="UTM Campaign" value={profile.lead.utmCampaign} />
                </>
              )}
              <DetailRow label="Created" value={formatDate(profile.lead.createdAt)} />
              <DetailRow label="Updated" value={formatDate(profile.lead.updatedAt)} />
            </AdminCard>
          )}

          {/* Subscriber details */}
          {profile.subscriber && (
            <AdminCard>
              <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
                Subscriber Details
              </p>
              <DetailRow label="Email" value={profile.subscriber.email} />
              <DetailRow label="Status" value={<AdminStatusBadge status={profile.subscriber.status.toLowerCase()} />} />
              <DetailRow label="Source" value={profile.subscriber.source} />
              <DetailRow label="Preferences" value={profile.subscriber.preferences} />
              <DetailRow
                label="Engagement"
                value={
                  profile.subscriber.engagementScore !== null
                    ? `${profile.subscriber.engagementScore}/100`
                    : null
                }
              />
              <DetailRow label="Confirmed" value={formatDate(profile.subscriber.confirmedAt)} />
              {profile.subscriber.unsubscribedAt && (
                <DetailRow label="Unsubscribed" value={formatDate(profile.subscriber.unsubscribedAt)} />
              )}
              <DetailRow label="Consent Logs" value={profile.subscriber.consentLogs} />
            </AdminCard>
          )}

          {/* Inquiries */}
          {profile.inquiries.length > 0 && (
            <AdminCard>
              <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
                Inquiries ({profile.inquiries.length})
              </p>
              <div className="space-y-2">
                {profile.inquiries.map((inq) => (
                  <div key={inq.id} className="py-2 border-b border-stone-100 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AdminStatusBadge status={inq.status.toLowerCase()} />
                      {inq.type && (
                        <span className="font-[var(--font-system)] text-[11px] text-stone-500">
                          {inq.type}
                        </span>
                      )}
                      <span className="font-[var(--font-system)] text-[11px] text-stone-400 ml-auto">
                        {formatDate(inq.createdAt)}
                      </span>
                    </div>
                    {inq.message && (
                      <p className="font-[var(--font-system)] text-[12px] text-stone-700 line-clamp-2">
                        {inq.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {/* ─── Tab: Timeline ────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="space-y-2">
          {profile.timeline.length === 0 ? (
            <AdminEmptyState
              icon={EmptyIcon}
              title="No interactions yet"
              description="Interactions will appear here as they occur."
            />
          ) : (
            profile.timeline.map((entry) => (
              <AdminCard key={entry.id} className="!p-3">
                <div className="flex items-start gap-3">
                  {/* Direction indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="font-mono text-[11px] text-stone-400">
                      {DIRECTION_ARROWS[entry.direction || ''] || '-- '}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AdminStatusBadge status={entry.type} label={entry.type} />
                      {entry.channel && (
                        <span className="font-[var(--font-system)] text-[11px] text-stone-400">
                          via {entry.channel}
                        </span>
                      )}
                      {entry.sentiment && (
                        <span className="font-[var(--font-system)] text-[11px] text-stone-400">
                          {SENTIMENT_EMOJI[entry.sentiment] || ''}
                        </span>
                      )}
                    </div>
                    {entry.summary && (
                      <p className="font-[var(--font-system)] text-[12px] text-stone-700 mt-1 leading-relaxed">
                        {entry.summary}
                      </p>
                    )}
                    <p className="font-[var(--font-system)] text-[11px] text-stone-400 mt-1">
                      {formatDateTime(entry.date)}
                    </p>
                  </div>
                </div>
              </AdminCard>
            ))
          )}
        </div>
      )}

      {/* ─── Tab: Opportunities ───────────────────────────────────── */}
      {activeTab === 'opportunities' && (
        <div className="space-y-3">
          {profile.opportunities.length === 0 ? (
            <AdminEmptyState
              icon={EmptyIcon}
              title="No opportunities"
              description="Create an opportunity from the Actions tab."
            />
          ) : (
            profile.opportunities.map((opp) => (
              <AdminCard key={opp.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <AdminStatusBadge
                    status={STAGE_COLORS[opp.stage] || 'pending'}
                    label={opp.stage.charAt(0).toUpperCase() + opp.stage.slice(1)}
                  />
                  {opp.value !== null && (
                    <span className="font-[var(--font-display)] font-bold text-base text-stone-900">
                      {opp.currency || '$'}{opp.value.toLocaleString()}
                    </span>
                  )}
                </div>
                <DetailRow label="Source" value={opp.source} />
                <DetailRow label="Next Action" value={opp.nextAction} />
                <DetailRow label="Next Action At" value={formatDate(opp.nextActionAt)} />
                <DetailRow label="Created" value={formatDate(opp.createdAt)} />
                <DetailRow label="Updated" value={formatDate(opp.updatedAt)} />
              </AdminCard>
            ))
          )}
        </div>
      )}

      {/* ─── Tab: Actions ─────────────────────────────────────────── */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {/* Action result banner */}
          {actionResult && (
            <div className="rounded-xl bg-[rgba(59,126,161,0.06)] border border-[#3B7EA133] px-4 py-3">
              <p className="font-[var(--font-system)] text-[12px] font-semibold text-[#1B5070]">
                {actionResult}
              </p>
            </div>
          )}

          {/* Add Note */}
          <AdminCard>
            <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
              Add Note
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this contact..."
              rows={3}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-[var(--font-system)] text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B7EA1]/30 focus:border-[#3B7EA1] resize-none"
            />
            {noteResult && (
              <p className="font-[var(--font-system)] text-[11px] text-[#2D5A3D] mt-1">
                {noteResult}
              </p>
            )}
            <div className="mt-2">
              <AdminButton
                onClick={handleAddNote}
                loading={noteLoading}
                disabled={!noteText.trim()}
                variant="primary"
                size="sm"
              >
                Save Note
              </AdminButton>
            </div>
          </AdminCard>

          {/* Communication */}
          <AdminCard>
            <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
              Communication
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.phone && (
                <Link href={`/admin/communications?phone=${encodeURIComponent(profile.phone)}`}>
                  <AdminButton variant="secondary" size="sm">
                    Send WhatsApp
                  </AdminButton>
                </Link>
              )}
              {profile.email && (
                <Link href={`/admin/communications?email=${encodeURIComponent(profile.email)}`}>
                  <AdminButton variant="secondary" size="sm">
                    Send Email
                  </AdminButton>
                </Link>
              )}
              {!profile.phone && !profile.email && (
                <p className="font-[var(--font-system)] text-[12px] text-stone-500">
                  No contact channels available
                </p>
              )}
            </div>
          </AdminCard>

          {/* Consent */}
          <AdminCard>
            <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
              Marketing Consent
            </p>
            <div className="flex items-center gap-3">
              <span className="font-[var(--font-system)] text-[12px] text-stone-700">
                Current: {hasConsent ? 'Granted' : 'Not granted'}
              </span>
              <AdminButton
                onClick={() => handleUpdateConsent(!hasConsent)}
                loading={consentLoading}
                variant={hasConsent ? 'danger' : 'success'}
                size="sm"
              >
                {hasConsent ? 'Revoke Consent' : 'Grant Consent'}
              </AdminButton>
            </div>
          </AdminCard>

          {/* Create Opportunity */}
          <AdminCard>
            <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
              Sales Pipeline
            </p>
            <AdminButton
              onClick={handleCreateOpportunity}
              loading={oppLoading}
              variant="primary"
              size="sm"
            >
              Create Opportunity
            </AdminButton>
          </AdminCard>
        </div>
      )}
    </div>
  )
}
