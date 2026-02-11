'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle, XCircle, AlertTriangle, ExternalLink,
  RefreshCw, Loader2, ChevronDown, ChevronRight,
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

const sectionMeta: Record<string, { label: string; icon: React.ElementType; color: string; description: string }> = {
  infrastructure: { label: 'Infrastructure', icon: Server, color: 'blue', description: 'Core platform services — database, auth, hosting' },
  revenue: { label: 'Revenue & Payments', icon: DollarSign, color: 'green', description: 'Stripe, digital products, email delivery' },
  content_seo: { label: 'Content & SEO', icon: Search, color: 'purple', description: 'AI providers, analytics, search indexing' },
  distribution: { label: 'Distribution', icon: Share2, color: 'amber', description: 'Email marketing, storage, notifications' },
  mcp: { label: 'MCP Integrations', icon: Plug, color: 'rose', description: 'Connected tools — Stripe MCP, Mercury Bank MCP' },
}

const colorMap: Record<string, { bg: string; text: string; ring: string; light: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-200', light: 'bg-blue-50' },
  green: { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200', light: 'bg-green-50' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-200', light: 'bg-purple-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200', light: 'bg-amber-50' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-200', light: 'bg-rose-50' },
}

// ─── Component ─────────────────────────────────────────────

export default function OperationsHubPage() {
  const [data, setData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'engine' | 'sites' | 'mcp'>('engine')

  const fetchData = () => {
    setLoading(true)
    fetch('/api/admin/operations-hub')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed')
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
      .catch(console.error)
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
    if (grade === 'A') return 'text-green-600 bg-green-50'
    if (grade === 'B') return 'text-blue-600 bg-blue-50'
    if (grade === 'C') return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <MophyAdminLayout pageTitle="Operations Hub">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              Operations Hub
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor, configure, and manage everything from one place
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Card */}
        {data && (
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-rose-500" />
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="col-span-2 md:col-span-1">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-2xl font-bold ${gradeColor(data.summary.grade)}`}>
                    {data.summary.grade}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Platform Grade</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.configured}</div>
                  <p className="text-sm text-gray-500">Configured</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.total - data.summary.configured}</div>
                  <p className="text-sm text-gray-500">Missing</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.percentage}%</div>
                  <p className="text-sm text-gray-500">Complete</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.site_health.length}</div>
                  <p className="text-sm text-gray-500">Active Sites</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${data.summary.percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
          {[
            { id: 'engine' as const, label: 'Engine Setup', icon: Settings, count: data ? data.summary.total - data.summary.configured : 0 },
            { id: 'sites' as const, label: 'Site Health', icon: Globe, count: data?.site_health.length || 0 },
            { id: 'mcp' as const, label: 'MCP Tools', icon: Plug, count: data?.sections.mcp.length || 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'engine' && tab.count > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* ── ENGINE SETUP TAB ── */}
        {!loading && data && activeTab === 'engine' && (
          <div className="space-y-4">
            {Object.entries(data.sections)
              .filter(([key]) => key !== 'mcp')
              .map(([sectionKey, items]) => {
                const meta = sectionMeta[sectionKey]
                const colors = colorMap[meta.color]
                const isExpanded = expandedSections.includes(sectionKey)
                const configuredCount = (items as CheckItem[]).filter(i => i.status === 'configured').length
                const totalCount = (items as CheckItem[]).length
                const allDone = configuredCount === totalCount

                return (
                  <Card key={sectionKey} className="overflow-hidden">
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.light}`}>
                          <meta.icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">{meta.label}</span>
                            {allDone ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">All Set</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                {totalCount - configuredCount} missing
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{meta.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{configuredCount}/{totalCount}</span>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-slate-800">
                        {(items as CheckItem[]).map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-4 px-4 py-3 border-b last:border-b-0 border-gray-50 dark:border-slate-800/50 ${
                              item.status === 'missing' ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                            }`}
                          >
                            {/* Status icon */}
                            <div className="pt-0.5">
                              {item.status === 'configured' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>

                              {/* Action hint */}
                              {item.status === 'missing' && item.action && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {item.action.type === 'env' && (
                                    <>
                                      <button
                                        onClick={() => copyToClipboard(item.action!.key || '', item.id)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                        {copiedKey === item.id ? 'Copied!' : item.action.key}
                                      </button>
                                      {item.action.hint && (
                                        <span className="text-xs text-gray-400">{item.action.hint}</span>
                                      )}
                                      {item.action.url && (
                                        <a
                                          href={item.action.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 rounded-md transition-colors"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Get Key
                                        </a>
                                      )}
                                      <Link
                                        href="https://vercel.com"
                                        target="_blank"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 rounded-md transition-colors"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                        Add to Vercel
                                      </Link>
                                    </>
                                  )}
                                  {item.action.type === 'link' && item.action.href && (
                                    <Link
                                      href={item.action.href}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                      {item.action.label || 'Go'}
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status badge */}
                            <Badge
                              className={item.status === 'configured'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                              }
                            >
                              {item.status === 'configured' ? 'Ready' : 'Setup Required'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
          </div>
        )}

        {/* ── SITE HEALTH TAB ── */}
        {!loading && data && activeTab === 'sites' && (
          <div className="space-y-4">
            {data.site_health.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Globe className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Active Sites</h3>
                  <p className="text-gray-500 mb-4">Create your first site to start tracking its health.</p>
                  <Link href="/admin/command-center/sites/new">
                    <Button>Create Site</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              data.site_health.map((sh) => (
                <Card key={sh.site.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Site header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{sh.site.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{sh.site.name}</h3>
                            <Badge variant="secondary" className="text-xs">{sh.site.locale}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">{sh.site.domain || sh.site.slug}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${sh.score >= 80 ? 'text-green-600' : sh.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {sh.score}%
                        </div>
                        <p className="text-xs text-gray-500">{sh.passed}/{sh.total} checks</p>
                      </div>
                    </div>

                    {/* Checks grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-gray-100 dark:bg-slate-800">
                      {sh.checks.map((check) => (
                        <div
                          key={check.id}
                          className={`p-3 ${check.ok ? 'bg-white dark:bg-slate-900' : 'bg-red-50/50 dark:bg-red-900/10'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {check.ok ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{check.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 ml-6 truncate">{check.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── MCP TOOLS TAB ── */}
        {!loading && data && activeTab === 'mcp' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-900/10 dark:to-purple-900/10 rounded-xl p-4 border border-rose-100 dark:border-rose-800/30">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">MCP Integrations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Model Context Protocol tools connected to Claude. These let you query Stripe and Mercury directly from your dashboard.
                  </p>
                </div>
              </div>
            </div>

            {data.sections.mcp.map((mcp) => (
              <Card key={mcp.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${mcp.id === 'mcp_stripe' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        {mcp.id === 'mcp_stripe' ? (
                          <CreditCard className={`w-6 h-6 ${mcp.id === 'mcp_stripe' ? 'text-purple-600' : 'text-blue-600'}`} />
                        ) : (
                          <Landmark className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{mcp.label}</h3>
                          <Badge className={mcp.status === 'configured' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {mcp.status === 'configured' ? 'Connected' : 'Not Connected'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{mcp.description}</p>
                      </div>
                    </div>

                    {mcp.status === 'configured' && mcp.action?.type === 'link' && mcp.action.href && (
                      <Link href={mcp.action.href}>
                        <Button size="sm" className="bg-gradient-to-r from-primary to-purple-600">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Open Dashboard
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Capabilities */}
                  {mcp.capabilities && (
                    <div className="border-t border-gray-100 dark:border-slate-800 px-5 py-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-3">Capabilities</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {mcp.capabilities.map((cap, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${mcp.status === 'configured' ? 'text-green-500' : 'text-gray-300'}`} />
                            {cap}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Setup action for missing */}
                  {mcp.status === 'missing' && mcp.action && mcp.action.type === 'env' && (
                    <div className="border-t border-gray-100 dark:border-slate-800 px-5 py-4 bg-amber-50/50 dark:bg-amber-900/5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Setup required:</span>
                        <button
                          onClick={() => copyToClipboard(mcp.action!.key || '', mcp.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedKey === mcp.id ? 'Copied!' : mcp.action.key}
                        </button>
                        <span className="text-xs text-gray-500">{mcp.action.hint}</span>
                        {mcp.action.url && (
                          <a href={mcp.action.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Get API Key
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        {!loading && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-500 mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'API Keys', href: '/admin/command-center/settings/api-keys', icon: Settings },
                  { label: 'Feature Flags', href: '/admin/feature-flags', icon: Zap },
                  { label: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
                  { label: 'Shop & Products', href: '/admin/shop', icon: DollarSign },
                  { label: 'All Sites', href: '/admin/command-center/sites', icon: Globe },
                ].map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="outline" size="sm" className="text-xs">
                      <link.icon className="w-3.5 h-3.5 mr-1.5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MophyAdminLayout>
  )
}
