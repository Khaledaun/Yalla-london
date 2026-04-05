'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminButton,
  AdminStatusBadge,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  CheckCircle, XCircle, AlertTriangle, ExternalLink,
  RefreshCw, ChevronDown, ChevronRight,
  Server, DollarSign, Search, Share2, Plug,
  Globe, Copy, ArrowRight, Zap, Activity,
  CreditCard, Landmark, BarChart3, Settings
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  description: string
  status: 'configured' | 'missing'
  category: string
  action: {
    type: 'env' | 'link'
    key?: string
    hint?: string
    url?: string
    href?: string
    label?: string
  } | null
  capabilities?: string[]
}

interface SiteHealth {
  site: { id: string; name: string; slug: string; domain: string; locale: string }
  checks: { id: string; label: string; ok: boolean; value: string }[]
  score: number
  passed: number
  total: number
}

interface HubData {
  summary: { configured: number; total: number; percentage: number; grade: string }
  sections: {
    infrastructure: CheckItem[]
    revenue: CheckItem[]
    content_seo: CheckItem[]
    distribution: CheckItem[]
    mcp: CheckItem[]
  }
  site_health: SiteHealth[]
}

// ─── Section config ────────────────────────────────────────

const sectionMeta: Record<string, { label: string; icon: React.ElementType; accentColor: 'blue' | 'green' | 'gold' | 'red'; description: string }> = {
  infrastructure: { label: 'Infrastructure', icon: Server, accentColor: 'blue', description: 'Core platform services — database, auth, hosting' },
  revenue: { label: 'Revenue & Payments', icon: DollarSign, accentColor: 'green', description: 'Stripe, digital products, email delivery' },
  content_seo: { label: 'Content & SEO', icon: Search, accentColor: 'gold', description: 'AI providers, analytics, search indexing' },
  distribution: { label: 'Distribution', icon: Share2, accentColor: 'red', description: 'Email marketing, storage, notifications' },
}

// ─── Component ─────────────────────────────────────────────

export default function OperationsHubPage() {
  const [data, setData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'engine' | 'sites' | 'mcp' | 'commands'>('engine')
  const [commandResults, setCommandResults] = useState<Record<string, { status: 'idle' | 'running' | 'success' | 'error'; output?: string }>>({})
  const [commandHistory, setCommandHistory] = useState<Array<{ id: string; name: string; status: string; output: string; timestamp: string }>>([])

  const runCommand = async (commandId: string, label: string, endpoint: string, method = 'GET') => {
    setCommandResults(prev => ({ ...prev, [commandId]: { status: 'running' } }))
    try {
      const res = await fetch(endpoint, { method })
      const text = await res.text()
      let output: string
      try {
        const json = JSON.parse(text)
        output = JSON.stringify(json, null, 2).slice(0, 2000)
      } catch {
        output = text.slice(0, 2000)
      }
      const status = res.ok ? 'success' : 'error'
      setCommandResults(prev => ({ ...prev, [commandId]: { status: status as 'success' | 'error', output } }))
      setCommandHistory(prev => [{ id: commandId, name: label, status, output, timestamp: new Date().toISOString() }, ...prev].slice(0, 20))
    } catch (err) {
      const output = err instanceof Error ? err.message : 'Request failed'
      setCommandResults(prev => ({ ...prev, [commandId]: { status: 'error', output } }))
      setCommandHistory(prev => [{ id: commandId, name: label, status: 'error', output, timestamp: new Date().toISOString() }, ...prev].slice(0, 20))
    }
  }

  const fetchData = () => {
    setLoading(true)
    setError(null)
    fetch('/api/admin/operations-hub')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load operations data')
        const d = await res.json()
        setData(d)
        // Auto-expand sections with missing items
        const toExpand: string[] = []
        Object.entries(d.sections).forEach(([key, items]) => {
          if ((items as CheckItem[]).some(i => i.status === 'missing')) {
            toExpand.push(key)
          }
        })
        setExpandedSections(toExpand)
      })
      .catch((err) => {
        console.error(err)
        setError(err.message || 'Failed to load')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const toggleSection = (key: string) => {
    setExpandedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const gradeColor = (grade: string) => {
    if (grade === 'A') return '#2D5A3D'
    if (grade === 'B') return '#3B7EA1'
    if (grade === 'C') return '#C49A2A'
    return '#C8322B'
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <AdminPageHeader
          title="Operations Hub"
          subtitle="Monitor, configure, and manage everything from one place"
          action={
            <AdminButton
              onClick={fetchData}
              variant="secondary"
              size="sm"
              loading={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </AdminButton>
          }
        />

        {/* Error banner */}
        {error && (
          <AdminAlertBanner
            severity="critical"
            message="Failed to load operations data"
            detail={error}
            action={
              <AdminButton onClick={fetchData} variant="primary" size="sm">
                Retry
              </AdminButton>
            }
          />
        )}

        {/* Summary KPIs */}
        {data && (
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <AdminCard className="text-center p-4">
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 32,
                    color: gradeColor(data.summary.grade),
                    lineHeight: 1,
                  }}
                >
                  {data.summary.grade}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#A8A29E',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: 6,
                  }}
                >
                  Platform Grade
                </div>
              </AdminCard>
              <AdminKPICard value={data.summary.configured} label="Configured" color="#2D5A3D" />
              <AdminKPICard value={data.summary.total - data.summary.configured} label="Missing" color="#C8322B" />
              <AdminKPICard value={`${data.summary.percentage}%`} label="Complete" color="#3B7EA1" />
              <AdminKPICard value={data.site_health.length} label="Active Sites" color="#C49A2A" />
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(214,208,196,0.3)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${data.summary.percentage}%`,
                  backgroundColor: data.summary.percentage >= 80 ? '#2D5A3D' : data.summary.percentage >= 50 ? '#C49A2A' : '#C8322B',
                }}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-5">
          <AdminTabs
            tabs={[
              { id: 'engine', label: 'Engine Setup', count: data ? data.summary.total - data.summary.configured : undefined },
              { id: 'sites', label: 'Site Health', count: data?.site_health.length },
              { id: 'mcp', label: 'MCP Tools', count: data?.sections.mcp.length },
              { id: 'commands', label: 'Commands' },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as typeof activeTab)}
          />
        </div>

        {/* Loading */}
        {loading && <AdminLoadingState label="Loading operations data..." />}

        {/* ── ENGINE SETUP TAB ── */}
        {!loading && data && activeTab === 'engine' && (
          <div className="space-y-3">
            {Object.entries(data.sections)
              .filter(([key]) => key !== 'mcp')
              .map(([sectionKey, items]) => {
                const meta = sectionMeta[sectionKey]
                if (!meta) return null
                const isExpanded = expandedSections.includes(sectionKey)
                const configuredCount = (items as CheckItem[]).filter(i => i.status === 'configured').length
                const totalCount = (items as CheckItem[]).length
                const allDone = configuredCount === totalCount

                return (
                  <AdminCard key={sectionKey} accent accentColor={meta.accentColor}>
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ borderRadius: '12px' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: meta.accentColor === 'blue' ? 'rgba(59,126,161,0.08)' :
                              meta.accentColor === 'green' ? 'rgba(45,90,61,0.08)' :
                              meta.accentColor === 'gold' ? 'rgba(196,154,42,0.08)' :
                              'rgba(200,50,43,0.08)',
                          }}
                        >
                          <meta.icon
                            className="w-4.5 h-4.5"
                            style={{
                              color: meta.accentColor === 'blue' ? '#3B7EA1' :
                                meta.accentColor === 'green' ? '#2D5A3D' :
                                meta.accentColor === 'gold' ? '#C49A2A' :
                                '#C8322B',
                              width: 18,
                              height: 18,
                            }}
                          />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: 14,
                                color: '#1C1917',
                              }}
                            >
                              {meta.label}
                            </span>
                            {allDone ? (
                              <AdminStatusBadge status="success" label="All Set" />
                            ) : (
                              <AdminStatusBadge status="warning" label={`${totalCount - configuredCount} missing`} />
                            )}
                          </div>
                          <p
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              color: '#78716C',
                              marginTop: 2,
                            }}
                          >
                            {meta.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#A8A29E',
                          }}
                        >
                          {configuredCount}/{totalCount}
                        </span>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" style={{ color: '#A8A29E' }} />
                          : <ChevronRight className="w-4 h-4" style={{ color: '#A8A29E' }} />
                        }
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
                        {(items as CheckItem[]).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 px-4 py-3"
                            style={{
                              borderBottom: '1px solid rgba(214,208,196,0.2)',
                              backgroundColor: item.status === 'missing' ? 'rgba(200,50,43,0.02)' : undefined,
                            }}
                          >
                            {/* Status icon */}
                            <div className="pt-0.5 flex-shrink-0">
                              {item.status === 'configured' ? (
                                <CheckCircle className="w-4 h-4" style={{ color: '#2D5A3D' }} />
                              ) : (
                                <XCircle className="w-4 h-4" style={{ color: '#C8322B' }} />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p
                                style={{
                                  fontFamily: 'var(--font-system)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#1C1917',
                                }}
                              >
                                {item.label}
                              </p>
                              <p
                                style={{
                                  fontFamily: 'var(--font-system)',
                                  fontSize: 11,
                                  color: '#78716C',
                                  marginTop: 2,
                                }}
                              >
                                {item.description}
                              </p>

                              {/* Action hint */}
                              {item.status === 'missing' && item.action && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {item.action.type === 'env' && (
                                    <>
                                      <button
                                        onClick={() => copyToClipboard(item.action!.key || '', item.id)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                                        style={{
                                          fontFamily: 'var(--font-system)',
                                          fontSize: 10,
                                          fontWeight: 600,
                                          backgroundColor: 'rgba(214,208,196,0.2)',
                                          color: '#44403C',
                                          letterSpacing: '0.3px',
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                        {copiedKey === item.id ? 'Copied!' : item.action.key}
                                      </button>
                                      {item.action.hint && (
                                        <span
                                          style={{
                                            fontFamily: 'var(--font-system)',
                                            fontSize: 10,
                                            color: '#A8A29E',
                                          }}
                                        >
                                          {item.action.hint}
                                        </span>
                                      )}
                                      {item.action.url && (
                                        <a
                                          href={item.action.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors"
                                          style={{
                                            fontFamily: 'var(--font-system)',
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: '#3B7EA1',
                                            backgroundColor: 'rgba(59,126,161,0.06)',
                                          }}
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Get Key
                                        </a>
                                      )}
                                      <a
                                        href="https://vercel.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors"
                                        style={{
                                          fontFamily: 'var(--font-system)',
                                          fontSize: 10,
                                          fontWeight: 600,
                                          color: '#78716C',
                                          backgroundColor: 'rgba(214,208,196,0.15)',
                                        }}
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                        Add to Vercel
                                      </a>
                                    </>
                                  )}
                                  {item.action.type === 'link' && item.action.href && (
                                    <Link href={item.action.href}>
                                      <AdminButton variant="primary" size="sm">
                                        <ArrowRight className="w-3 h-3" />
                                        {item.action.label || 'Go'}
                                      </AdminButton>
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status badge */}
                            <div className="flex-shrink-0">
                              <AdminStatusBadge
                                status={item.status === 'configured' ? 'success' : 'error'}
                                label={item.status === 'configured' ? 'Ready' : 'Setup Required'}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AdminCard>
                )
              })}
          </div>
        )}

        {/* ── SITE HEALTH TAB ── */}
        {!loading && data && activeTab === 'sites' && (
          <div className="space-y-3">
            {data.site_health.length === 0 ? (
              <AdminEmptyState
                icon={Globe}
                title="No Active Sites"
                description="Create your first site to start tracking its health."
                action={
                  <Link href="/admin/command-center/sites/new">
                    <AdminButton variant="primary" size="md">Create Site</AdminButton>
                  </Link>
                }
              />
            ) : (
              data.site_health.map((sh) => (
                <AdminCard key={sh.site.id}>
                  {/* Site header */}
                  <div
                    className="flex items-center justify-between p-4"
                    style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#C8322B' }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 14,
                            color: '#FAF8F4',
                          }}
                        >
                          {sh.site.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 700,
                              fontSize: 14,
                              color: '#1C1917',
                            }}
                          >
                            {sh.site.name}
                          </span>
                          <AdminStatusBadge status="active" label={sh.site.locale} />
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                          }}
                        >
                          {sh.site.domain || sh.site.slug}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 24,
                          color: sh.score >= 80 ? '#2D5A3D' : sh.score >= 50 ? '#C49A2A' : '#C8322B',
                          lineHeight: 1,
                        }}
                      >
                        {sh.score}%
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                          marginTop: 2,
                        }}
                      >
                        {sh.passed}/{sh.total} checks
                      </p>
                    </div>
                  </div>

                  {/* Checks grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(214,208,196,0.2)' }}>
                    {sh.checks.map((check) => (
                      <div
                        key={check.id}
                        className="p-3"
                        style={{
                          backgroundColor: check.ok ? '#FFFFFF' : 'rgba(200,50,43,0.02)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {check.ok ? (
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2D5A3D' }} />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C49A2A' }} />
                          )}
                          <span
                            className="truncate"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#44403C',
                            }}
                          >
                            {check.label}
                          </span>
                        </div>
                        <p
                          className="ml-5 truncate"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          {check.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              ))
            )}
          </div>
        )}

        {/* ── MCP TOOLS TAB ── */}
        {!loading && data && activeTab === 'mcp' && (
          <div className="space-y-3">
            <AdminAlertBanner
              severity="info"
              message="MCP Integrations"
              detail="Model Context Protocol tools connected to Claude. These let you query Stripe and Mercury directly from your dashboard."
            />

            {data.sections.mcp.map((mcp) => (
              <AdminCard key={mcp.id}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: mcp.id === 'mcp_stripe' ? 'rgba(124,58,237,0.08)' : 'rgba(59,126,161,0.08)',
                      }}
                    >
                      {mcp.id === 'mcp_stripe' ? (
                        <CreditCard className="w-5 h-5" style={{ color: '#7C3AED' }} />
                      ) : (
                        <Landmark className="w-5 h-5" style={{ color: '#3B7EA1' }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 14,
                            color: '#1C1917',
                          }}
                        >
                          {mcp.label}
                        </span>
                        <AdminStatusBadge
                          status={mcp.status === 'configured' ? 'active' : 'inactive'}
                          label={mcp.status === 'configured' ? 'Connected' : 'Not Connected'}
                        />
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#78716C',
                          marginTop: 2,
                        }}
                      >
                        {mcp.description}
                      </p>
                    </div>
                  </div>

                  {mcp.status === 'configured' && mcp.action?.type === 'link' && mcp.action.href && (
                    <Link href={mcp.action.href}>
                      <AdminButton variant="primary" size="sm">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Open Dashboard
                      </AdminButton>
                    </Link>
                  )}
                </div>

                {/* Capabilities */}
                {mcp.capabilities && (
                  <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(214,208,196,0.3)' }}>
                    <AdminSectionLabel>Capabilities</AdminSectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {mcp.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: mcp.status === 'configured' ? '#2D5A3D' : '#D6D0C4' }}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 11,
                              color: '#5C564F',
                            }}
                          >
                            {cap}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Setup action for missing */}
                {mcp.status === 'missing' && mcp.action && mcp.action.type === 'env' && (
                  <div
                    className="px-4 py-3"
                    style={{
                      borderTop: '1px solid rgba(214,208,196,0.3)',
                      backgroundColor: 'rgba(196,154,42,0.04)',
                    }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <AlertTriangle className="w-4 h-4" style={{ color: '#C49A2A' }} />
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                        }}
                      >
                        Setup required:
                      </span>
                      <button
                        onClick={() => copyToClipboard(mcp.action!.key || '', mcp.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid rgba(214,208,196,0.6)',
                          color: '#44403C',
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === mcp.id ? 'Copied!' : mcp.action.key}
                      </button>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                        }}
                      >
                        {mcp.action.hint}
                      </span>
                      {mcp.action.url && (
                        <a
                          href={mcp.action.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 transition-colors"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#3B7EA1',
                          }}
                        >
                          <ExternalLink className="w-3 h-3" /> Get API Key
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </AdminCard>
            ))}
          </div>
        )}

        {/* ── COMMANDS TAB ── */}
        {!loading && activeTab === 'commands' && (
          <div className="space-y-4">
            {/* Command Presets */}
            <AdminCard>
              <div className="p-4">
                <AdminSectionLabel>Safe Operation Presets</AdminSectionLabel>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                    marginBottom: 12,
                    marginTop: -4,
                  }}
                >
                  One-tap commands that are safe to run anytime. No destructive operations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'health-check', label: 'Run Health Check', description: 'Trigger site-health-check cron', endpoint: '/api/cron/site-health-check', method: 'GET', icon: Activity },
                    { id: 'validate-crons', label: 'Validate All Crons', description: 'HEAD request to all cron endpoints', endpoint: '/api/admin/test-connections', method: 'GET', icon: RefreshCw },
                    { id: 'check-env', label: 'Check Env Vars', description: 'Show configured vs missing (redacted)', endpoint: '/api/admin/test-connections', method: 'GET', icon: Settings },
                    { id: 'db-health', label: 'Database Health', description: 'Test DB connection + model count', endpoint: '/api/admin/test-connections', method: 'GET', icon: Server },
                    { id: 'indexing-status', label: 'Indexing Status', description: 'Check URLs submitted vs indexed', endpoint: '/api/admin/content-indexing', method: 'GET', icon: Search },
                    { id: 'pipeline-status', label: 'Pipeline Status', description: 'Content pipeline phase counts', endpoint: '/api/admin/content-generation-monitor', method: 'GET', icon: BarChart3 },
                    { id: 'ai-costs', label: 'AI Cost Summary', description: 'Token usage and costs today', endpoint: '/api/admin/ai-costs?period=today', method: 'GET', icon: DollarSign },
                    { id: 'run-sweeper', label: 'Run Diagnostic Sweep', description: 'Find and fix stuck drafts', endpoint: '/api/cron/diagnostic-sweep', method: 'GET', icon: Zap },
                  ].map(cmd => {
                    const result = commandResults[cmd.id]
                    const isRunning = result?.status === 'running'
                    return (
                      <div
                        key={cmd.id}
                        className="rounded-xl p-3"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid rgba(214,208,196,0.6)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <cmd.icon className="w-4 h-4" style={{ color: '#78716C' }} />
                            <span
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#1C1917',
                              }}
                            >
                              {cmd.label}
                            </span>
                          </div>
                          <AdminButton
                            size="sm"
                            variant={result?.status === 'success' ? 'success' : result?.status === 'error' ? 'danger' : 'secondary'}
                            disabled={isRunning}
                            loading={isRunning}
                            onClick={() => runCommand(cmd.id, cmd.label, cmd.endpoint, cmd.method)}
                          >
                            {isRunning ? (
                              'Running'
                            ) : result?.status === 'success' ? (
                              <><CheckCircle className="w-3 h-3" /> Done</>
                            ) : result?.status === 'error' ? (
                              <><XCircle className="w-3 h-3" /> Retry</>
                            ) : (
                              <><ArrowRight className="w-3 h-3" /> Run</>
                            )}
                          </AdminButton>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          {cmd.description}
                        </p>
                        {result?.output && (
                          <pre
                            className="mt-2 p-2 rounded-lg overflow-x-auto max-h-32"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#5C564F',
                              backgroundColor: '#FAF8F4',
                              border: '1px solid rgba(214,208,196,0.4)',
                            }}
                          >
                            {result.output.slice(0, 500)}
                            {result.output.length > 500 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </AdminCard>

            {/* Command History */}
            {commandHistory.length > 0 && (
              <AdminCard>
                <div className="p-4">
                  <AdminSectionLabel>Recent Commands</AdminSectionLabel>
                  <div className="space-y-1">
                    {commandHistory.map((entry, i) => (
                      <div
                        key={`${entry.id}-${i}`}
                        className="flex items-center gap-3 py-2"
                        style={{
                          borderBottom: i < commandHistory.length - 1 ? '1px solid rgba(214,208,196,0.2)' : undefined,
                        }}
                      >
                        {entry.status === 'success'
                          ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2D5A3D' }} />
                          : <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C8322B' }} />}
                        <span
                          className="flex-1"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#44403C',
                          }}
                        >
                          {entry.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Copyable Terminal Commands */}
            <AdminCard>
              <div className="p-4">
                <AdminSectionLabel>Terminal Commands</AdminSectionLabel>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                    marginBottom: 12,
                    marginTop: -4,
                  }}
                >
                  For operations that must run in a terminal. Copy and paste into Claude Code or SSH.
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Check Prisma migrations', cmd: 'npx prisma migrate status' },
                    { label: 'Run master SEO audit', cmd: 'npm run audit:master -- --site=yalla-london --mode=quick' },
                    { label: 'Run weekly policy monitor', cmd: 'npm run audit:weekly-policy-monitor -- --site=yalla-london' },
                    { label: 'Run smoke tests', cmd: 'npx tsx scripts/smoke-test.ts' },
                    { label: 'Run commerce smoke tests', cmd: 'npx tsx scripts/commerce-smoke-test.ts' },
                    { label: 'Check TypeScript', cmd: 'npx tsc --noEmit' },
                  ].map(item => (
                    <div
                      key={item.cmd}
                      className="flex items-center gap-2 p-2.5 rounded-lg"
                      style={{
                        backgroundColor: '#FAF8F4',
                        border: '1px solid rgba(214,208,196,0.4)',
                      }}
                    >
                      <code
                        className="flex-1"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          color: '#44403C',
                        }}
                      >
                        {item.cmd}
                      </code>
                      <button
                        onClick={() => copyToClipboard(item.cmd, item.cmd)}
                        className="flex-shrink-0 p-1 rounded transition-colors hover:bg-stone-100"
                        title={`Copy: ${item.label}`}
                      >
                        {copiedKey === item.cmd
                          ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#2D5A3D' }} />
                          : <Copy className="w-3.5 h-3.5" style={{ color: '#A8A29E' }} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* Quick Links */}
        {!loading && (
          <div className="mt-5">
            <AdminCard>
              <div className="p-4">
                <AdminSectionLabel>Quick Links</AdminSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Zap },
                    { label: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
                    { label: 'Shop & Products', href: '/admin/shop', icon: DollarSign },
                    { label: 'All Sites', href: '/admin/command-center/sites', icon: Globe },
                  ].map((link) => (
                    <Link key={link.href} href={link.href}>
                      <AdminButton variant="secondary" size="sm">
                        <link.icon className="w-3.5 h-3.5" />
                        {link.label}
                      </AdminButton>
                    </Link>
                  ))}
                </div>
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  )
}
