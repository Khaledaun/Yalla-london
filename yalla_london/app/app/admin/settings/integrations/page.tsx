'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminStatusBadge,
  AdminButton,
  AdminLoadingState,
} from '@/components/admin/admin-ui'

// ─── Types ──────────────────────────────────────────────────────────

interface IntegrationInfo {
  id: string
  name: string
  icon: string
  description: string
  category: string
  status: 'success' | 'active' | 'warning' | 'error' | 'inactive'
  statusLabel: string
  details: string[]
  testEndpoint?: string
}

interface ApiIntegration {
  name: string
  category: string
  status: 'ok' | 'warning' | 'error' | 'not_configured'
  message: string
  details?: Record<string, unknown>
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapApiStatus(apiStatus: string): 'success' | 'warning' | 'error' | 'inactive' {
  switch (apiStatus) {
    case 'ok': return 'success'
    case 'warning': return 'warning'
    case 'error': return 'error'
    case 'not_configured': return 'inactive'
    default: return 'inactive'
  }
}

function mapApiStatusLabel(apiStatus: string): string {
  switch (apiStatus) {
    case 'ok': return 'Connected'
    case 'warning': return 'Partial'
    case 'error': return 'Error'
    case 'not_configured': return 'Not Configured'
    default: return 'Unknown'
  }
}

// ─── Default Integration Definitions ────────────────────────────────

const DEFAULT_INTEGRATIONS: IntegrationInfo[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp (Kapso)',
    icon: '\uD83D\uDCF1',
    description: 'Customer messaging via WhatsApp Cloud API. CEO Agent receives and responds to inquiries.',
    category: 'messaging',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires WHATSAPP_ACCESS_TOKEN', 'Proxy mode via Kapso'],
    testEndpoint: '/api/webhooks/whatsapp',
  },
  {
    id: 'resend',
    name: 'Email (Resend)',
    icon: '\u2709\uFE0F',
    description: 'Transactional and marketing emails. Welcome sequences, booking confirmations, CEO alerts.',
    category: 'email',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires RESEND_API_KEY', 'Domain verification needed for custom sender'],
    testEndpoint: '/api/email/send',
  },
  {
    id: 'ga4',
    name: 'Google Analytics (GA4)',
    icon: '\uD83D\uDCCA',
    description: 'Traffic analytics, page views, user behavior. Server-side event tracking for affiliate clicks.',
    category: 'analytics',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires GA4_PROPERTY_ID', 'Measurement Protocol for server-side events'],
    testEndpoint: '/api/admin/analytics',
  },
  {
    id: 'gsc',
    name: 'Search Console (GSC)',
    icon: '\uD83D\uDD0D',
    description: 'Search performance data, indexing status, URL inspection. Synced daily via gsc-sync cron.',
    category: 'analytics',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires GSC service account credentials', 'Per-site GSC property needed'],
    testEndpoint: '/api/admin/analytics',
  },
  {
    id: 'cj',
    name: 'CJ Affiliate',
    icon: '\uD83D\uDCB0',
    description: 'Commission Junction affiliate network. Deep links, advertiser sync, revenue attribution via SID.',
    category: 'affiliate',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires CJ_API_TOKEN, CJ_WEBSITE_ID, CJ_PUBLISHER_CID'],
    testEndpoint: '/api/admin/cj-health',
  },
  {
    id: 'travelpayouts',
    name: 'Travelpayouts',
    icon: '\u2708\uFE0F',
    description: 'Affiliate aggregator with 100+ travel brands. Drive auto-monetization and LinkSwitcher.',
    category: 'affiliate',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires TRAVELPAYOUTS_API_TOKEN', 'Marker ID for link tracking'],
    testEndpoint: '/api/admin/integration-health',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '\uD83D\uDCB3',
    description: 'Payment processing for bookings and premium services. Webhook integration with CEO Agent.',
    category: 'payments',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires STRIPE_SECRET_KEY', 'Webhook endpoint: /api/webhooks/stripe-agent'],
    testEndpoint: '/api/admin/operations-hub',
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    icon: '\uD83D\uDCF7',
    description: 'Legal travel photography with automatic attribution. Image pipeline stocks library daily.',
    category: 'content',
    status: 'inactive',
    statusLabel: 'Not Configured',
    details: ['Requires UNSPLASH_ACCESS_KEY', 'Free tier: 50 requests/hour'],
    testEndpoint: '/api/admin/integration-health',
  },
]

// ─── Component ──────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationInfo[]>(DEFAULT_INTEGRATIONS)
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Fetch integration health from API ───────────────────────────
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/integration-health')
      if (!res.ok) {
        setFetchError('Could not reach integration health API')
        setLoading(false)
        return
      }
      const data = await res.json()
      const apiResults: ApiIntegration[] = data.integrations || data.results || []

      if (apiResults.length === 0) {
        setFetchError(null)
        setLoading(false)
        return
      }

      // Map API results onto our card definitions
      setIntegrations(prev =>
        prev.map(card => {
          const match = apiResults.find(api => {
            const apiName = api.name.toLowerCase()
            if (card.id === 'cj' && apiName.includes('cj')) return true
            if (card.id === 'travelpayouts' && apiName.includes('travelpayouts')) return true
            if (card.id === 'ga4' && (apiName.includes('ga4') || apiName.includes('google analytics'))) return true
            if (card.id === 'gsc' && (apiName.includes('gsc') || apiName.includes('search console'))) return true
            if (card.id === 'unsplash' && apiName.includes('unsplash')) return true
            if (card.id === 'resend' && (apiName.includes('resend') || apiName.includes('email'))) return true
            if (card.id === 'stripe' && apiName.includes('stripe')) return true
            if (card.id === 'whatsapp' && apiName.includes('whatsapp')) return true
            return false
          })

          if (match) {
            return {
              ...card,
              status: mapApiStatus(match.status),
              statusLabel: mapApiStatusLabel(match.status),
              details: [match.message, ...card.details.slice(1)],
            }
          }
          return card
        })
      )
      setFetchError(null)
    } catch {
      setFetchError('Failed to load integration status. Showing defaults.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // ── Test connection handler ─────────────────────────────────────
  const handleTest = async (integration: IntegrationInfo) => {
    if (!integration.testEndpoint) return
    setTestingId(integration.id)
    setTestResults(prev => {
      const next = { ...prev }
      delete next[integration.id]
      return next
    })

    try {
      const res = await fetch(integration.testEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setTestResults(prev => ({
          ...prev,
          [integration.id]: { ok: true, message: `Responded ${res.status} OK` },
        }))
      } else {
        const text = await res.text().catch(() => '')
        let msg = `HTTP ${res.status}`
        try {
          const j = JSON.parse(text)
          msg = j.error || j.message || msg
        } catch {
          // use status code
        }
        setTestResults(prev => ({
          ...prev,
          [integration.id]: { ok: false, message: msg },
        }))
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [integration.id]: {
          ok: false,
          message: err instanceof Error ? err.message : 'Connection failed',
        },
      }))
    } finally {
      setTestingId(null)
    }
  }

  // ── Counts ──────────────────────────────────────────────────────
  const connectedCount = integrations.filter(i => i.status === 'success' || i.status === 'active').length
  const warningCount = integrations.filter(i => i.status === 'warning').length
  const notConfigured = integrations.filter(i => i.status === 'inactive').length

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AdminPageHeader
          title="Integrations"
          subtitle="External service connections"
        />
        <AdminLoadingState label="Checking integrations..." />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <AdminPageHeader
        title="Integrations"
        subtitle="External service connections"
        action={
          <AdminButton onClick={fetchHealth} size="sm">
            Refresh
          </AdminButton>
        }
      />

      {/* ── Summary Banner ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <AdminCard className="text-center !p-3">
          <div className="text-lg font-bold text-[#2D5A3D]">{connectedCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mt-0.5">
            Connected
          </div>
        </AdminCard>
        <AdminCard className="text-center !p-3">
          <div className="text-lg font-bold text-[#C49A2A]">{warningCount}</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mt-0.5">
            Partial
          </div>
        </AdminCard>
        <AdminCard className="text-center !p-3">
          <div className="text-lg font-bold text-stone-400">{notConfigured}</div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mt-0.5">
            Not Set
          </div>
        </AdminCard>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {fetchError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[rgba(196,154,42,0.08)] border border-[rgba(196,154,42,0.3)] text-[#6B4F0F] text-xs font-medium">
          {fetchError}
        </div>
      )}

      {/* ── Integration Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(integration => {
          const testResult = testResults[integration.id]
          const isTesting = testingId === integration.id

          return (
            <AdminCard key={integration.id} className="flex flex-col gap-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {integration.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-[var(--font-display)] font-bold text-sm text-stone-900 truncate">
                      {integration.name}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                      {integration.category}
                    </span>
                  </div>
                </div>
                <AdminStatusBadge
                  status={integration.status}
                  label={integration.statusLabel}
                />
              </div>

              {/* Description */}
              <p className="text-xs text-stone-600 leading-relaxed">
                {integration.description}
              </p>

              {/* Details */}
              <div className="space-y-1">
                {integration.details.map((detail, i) => (
                  <div
                    key={i}
                    className="text-[11px] text-stone-500 flex items-start gap-1.5"
                  >
                    <span className="text-stone-300 mt-px flex-shrink-0">{'\u2022'}</span>
                    <span className="break-all">{detail}</span>
                  </div>
                ))}
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className={`text-[11px] px-3 py-2 rounded-lg ${
                    testResult.ok
                      ? 'bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]'
                      : 'bg-[rgba(200,50,43,0.06)] text-[#9B2520]'
                  }`}
                >
                  {testResult.ok ? '\u2713' : '\u2717'} {testResult.message}
                </div>
              )}

              {/* Test button */}
              {integration.testEndpoint && (
                <div className="mt-auto pt-1">
                  <AdminButton
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTest(integration)}
                    loading={isTesting}
                    className="w-full"
                  >
                    Test Connection
                  </AdminButton>
                </div>
              )}
            </AdminCard>
          )
        })}
      </div>

      {/* ── Footer Help ────────────────────────────────────────────── */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-stone-400">
          Integration status is checked via <code className="text-stone-500">/api/admin/integration-health</code>.
          Set missing env vars in Vercel to activate integrations.
        </p>
      </div>
    </div>
  )
}
