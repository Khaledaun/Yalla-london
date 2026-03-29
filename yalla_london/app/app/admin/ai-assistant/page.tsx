'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare, Send, Loader2, Copy, Code, FileText, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Zap, BarChart3, Activity,
  TrendingUp, DollarSign, Search, Settings, Globe, Wrench,
  Shield, Heart, CheckCircle, XCircle, Play, Eye, ClipboardList,
  Download, Terminal,
} from 'lucide-react'
import {
  AdminCard, AdminPageHeader, AdminButton, AdminStatusBadge,
  AdminKPICard, AdminLoadingState, AdminEmptyState, AdminAlertBanner,
  AdminSectionLabel, AdminTabs,
} from '@/components/admin/admin-ui'

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  patches?: Array<{ file: string; diff: string }>
  claudePrompts?: string[]
  context?: ContextData
  timestamp: string
}

interface ContextData {
  cronLogs?: number
  errors?: number
  pipelinePhases?: number
  contentVelocity?: {
    publishedToday: number; published7d: number; published30d: number
    reservoir: number; stuck: number; activeInPipeline: number
  }
  seoHealth?: {
    indexed: number; submitted: number; errors: number
    neverSubmitted: number; indexingRate: number; avgSeoScore: number
  }
  revenueSnapshot?: {
    clicks7d: number; commissions7d: number; commissions30d: number
    affiliateCoverage: number; cjSyncHealthy: boolean
  }
  cronHealth?: {
    total: number; healthy: number; failed24h: number
    overdueCrons: string[]
  }
  aiCosts?: {
    todayUsd: number; weekUsd: number; monthUsd: number
  }
  activeAlerts?: Array<{ severity: 'critical' | 'warning' | 'info'; message: string; area: string }>
  perplexityStatus?: {
    tasksQueued: number; tasksRunning: number
    tasksFailed24h: number; tasksCompleted24h: number
    creditsUsed7d: number; activeSchedules: number
  }
}

interface CycleIssue {
  id: string; category: string; severity: string
  title: string; description: string
  fixAction?: { method: string; endpoint: string; payload?: Record<string, unknown>; label: string; description: string }
}

interface HealthReport {
  grade: string; score: number; sections: Record<string, unknown>[]
  issues: Array<{ severity: string; message: string; category: string }>
}

interface AutoFix {
  id: string; type: string; description: string; createdAt: string
  result: string; draftId?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const TABS_LIST = [
  { id: 'operations', label: 'Operations' },
  { id: 'chat', label: 'CEO Chat' },
  { id: 'health', label: 'Health Report' },
  { id: 'tests', label: 'Tests' },
]

const SITES = [
  { id: '', label: 'All Sites' },
  { id: 'yalla-london', label: 'Yalla London' },
  { id: 'arabaldives', label: 'Arabaldives' },
  { id: 'french-riviera', label: 'Yalla Riviera' },
  { id: 'istanbul', label: 'Yalla Istanbul' },
  { id: 'thailand', label: 'Yalla Thailand' },
  { id: 'zenitha-yachts-med', label: 'Zenitha Yachts' },
]

const QUICK_ACTIONS = [
  { label: 'Run Diagnostics', icon: Wrench, endpoint: '/api/admin/cycle-health', method: 'POST', payload: { action: 'diagnose' }, color: '#3B7EA1' },
  { label: 'Fix All Issues', icon: Shield, endpoint: '/api/admin/cycle-health', method: 'POST', payload: { action: 'fix_all' }, color: '#C8322B' },
  { label: 'Publish Ready', icon: Play, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/content-selector' }, color: '#2D5A3D' },
  { label: 'Run Pipeline', icon: Activity, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/content-builder' }, color: '#C49A2A' },
  { label: 'SEO Agent', icon: Search, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/seo-agent' }, color: '#3B7EA1' },
  { label: 'Sync Affiliates', icon: DollarSign, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/affiliate/cron/sync-advertisers' }, color: '#C49A2A' },
  { label: 'Health Check', icon: Heart, endpoint: '/api/admin/aggregated-report', method: 'GET', color: '#2D5A3D' },
  { label: 'Perplexity Tasks', icon: Zap, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/perplexity-executor' }, color: '#C8322B' },
]

const CHAT_CHIPS = [
  { label: 'What needs attention?', icon: AlertCircle },
  { label: 'Pipeline status', icon: Activity },
  { label: 'Revenue report', icon: DollarSign },
  { label: 'Run diagnostics', icon: Settings },
  { label: "This week's wins", icon: TrendingUp },
  { label: 'SEO health', icon: Search },
]

const SEVERITY = {
  critical: { color: '#C8322B', bg: 'rgba(200,50,43,0.06)', label: 'CRITICAL' },
  high: { color: '#C8322B', bg: 'rgba(200,50,43,0.06)', label: 'HIGH' },
  warning: { color: '#C49A2A', bg: 'rgba(196,154,42,0.06)', label: 'WARNING' },
  medium: { color: '#C49A2A', bg: 'rgba(196,154,42,0.06)', label: 'MEDIUM' },
  info: { color: '#3B7EA1', bg: 'rgba(59,126,161,0.06)', label: 'INFO' },
  low: { color: '#78716C', bg: 'rgba(120,113,108,0.06)', label: 'LOW' },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CEOOperationsDashboard() {
  const [activeTab, setActiveTab] = useState('operations')
  const [siteId, setSiteId] = useState('')

  // Operations tab state
  const [context, setContext] = useState<ContextData | null>(null)
  const [issues, setIssues] = useState<CycleIssue[]>([])
  const [autoFixes, setAutoFixes] = useState<AutoFix[]>([])
  const [opsLoading, setOpsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)

  // Chat tab state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Health report tab state
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Test runner state
  const [testResults, setTestResults] = useState<{ suite: string; exitCode: number; summary: { pass: number; fail: number; warn: number; total: number; skip?: number; score?: number } | null; score: number | null; results: Array<{ name: string; status: string; details: string; category: string; durationMs?: number }>; rawOutput: string; timestamp: string } | null>(null)
  const [testLoading, setTestLoading] = useState<string | null>(null)
  const [testJsonCopied, setTestJsonCopied] = useState(false)
  const [showRawOutput, setShowRawOutput] = useState(false)
  const [expandedHealthSections, setExpandedHealthSections] = useState<Record<string, boolean>>({})

  // ── Data Fetchers ────────────────────────────────────────────────────────

  const fetchOpsData = useCallback(async () => {
    setOpsLoading(true)
    try {
      const siteParam = siteId ? `?siteId=${encodeURIComponent(siteId)}` : ''
      const [cockpitRes, healthRes, autoFixRes] = await Promise.allSettled([
        fetch(`/api/admin/cockpit${siteParam}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/admin/cycle-health${siteParam}`).then(r => r.ok ? r.json() : null),
        fetch('/api/admin/action-logs?limit=10&type=auto_fix').then(r => r.ok ? r.json() : null),
      ])

      if (cockpitRes.status === 'fulfilled' && cockpitRes.value) {
        const d = cockpitRes.value
        const pipeline = d.pipeline
        const indexing = d.indexing
        const crons = d.cronHealth
        const revenue = d.revenue

        const uniqueCompletedCrons = new Set<string>(
          (crons?.recentJobs || [])
            .filter((j: { status: string }) => j.status === 'completed')
            .map((j: { name: string }) => j.name)
        )

        setContext({
          contentVelocity: d.content || d.contentVelocity || (pipeline ? {
            publishedToday: pipeline.publishedToday ?? 0,
            publishedTotal: pipeline.publishedTotal ?? 0,
            reservoir: pipeline.reservoir ?? 0,
            stuck: pipeline.stuckDrafts?.length ?? 0,
            activeInPipeline: pipeline.draftsActive ?? 0,
          } : undefined),
          seoHealth: d.seo || d.seoHealth || (indexing ? {
            indexed: indexing.indexed ?? 0,
            submitted: indexing.submitted ?? 0,
            errors: indexing.errors ?? 0,
            neverSubmitted: indexing.neverSubmitted ?? 0,
            indexingRate: indexing.rate ?? 0,
            avgSeoScore: 0,
          } : undefined),
          revenueSnapshot: d.revenueSnapshot || (revenue ? {
            clicks7d: revenue.affiliateClicksWeek ?? 0,
            commissions7d: revenue.revenueWeekUsd ?? 0,
            commissions30d: 0,
            affiliateCoverage: 0,
            cjSyncHealthy: true,
          } : undefined),
          cronHealth: d.crons || (crons ? {
            total: 24,
            healthy: uniqueCompletedCrons.size,
            failed24h: crons.failedLast24h ?? 0,
            overdueCrons: [],
          } : undefined),
          aiCosts: d.costs || d.aiCosts || (revenue ? {
            todayUsd: 0,
            weekUsd: revenue.aiCostWeekUsd ?? 0,
            monthUsd: 0,
          } : undefined),
          activeAlerts: (d.alerts || d.activeAlerts || []).map((a: { severity: string; code?: string; message: string }) => ({
            severity: a.severity,
            message: a.message,
            area: a.code || 'system',
          })),
          perplexityStatus: d.perplexity || d.perplexityStatus,
        })
      }

      if (healthRes.status === 'fulfilled' && healthRes.value?.issues) {
        setIssues(healthRes.value.issues.map((issue: { id: string; category: string; severity: string; what?: string; why?: string; title?: string; description?: string; fixAction?: CycleIssue['fixAction'] }) => ({
          id: issue.id,
          category: issue.category,
          severity: issue.severity,
          title: issue.title || issue.what || issue.id,
          description: issue.description || issue.why || '',
          fixAction: issue.fixAction,
        })))
      }

      if (autoFixRes.status === 'fulfilled' && autoFixRes.value?.logs) {
        setAutoFixes(autoFixRes.value.logs.slice(0, 10))
      }
    } catch (err) {
      console.warn('[ceo-dashboard] fetch error:', err instanceof Error ? err.message : err)
    } finally {
      setOpsLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    if (activeTab === 'operations') fetchOpsData()
  }, [activeTab, fetchOpsData])

  useEffect(() => {
    if (activeTab !== 'operations') return undefined
    const interval = setInterval(fetchOpsData, 60_000)
    return () => clearInterval(interval)
  }, [activeTab, fetchOpsData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Action Handlers ──────────────────────────────────────────────────────

  const runAction = async (label: string, endpoint: string, method: string, payload?: Record<string, unknown>) => {
    setActionLoading(label)
    setActionResult(null)
    try {
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
      if (payload && method === 'POST') opts.body = JSON.stringify(payload)
      const url = method === 'GET' && siteId ? `${endpoint}?siteId=${encodeURIComponent(siteId)}` : endpoint
      const res = await fetch(url, opts)
      const data = await res.json().catch(() => ({}))
      setActionResult(`${label}: ${data.success !== false ? 'Done' : data.error || 'Failed'}`)
      if (label !== 'Health Check') setTimeout(fetchOpsData, 2000)
    } catch (err) {
      setActionResult(`${label}: Error — ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const fixIssue = async (issue: CycleIssue) => {
    if (!issue.fixAction) return
    setActionLoading(`fix-${issue.id}`)
    try {
      const res = await fetch('/api/admin/cycle-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix', issueId: issue.id }),
      })
      const data = await res.json().catch(() => ({}))
      setActionResult(data.success !== false ? `Fixed: ${issue.title}` : `Failed: ${data.error || issue.title}`)
      setTimeout(fetchOpsData, 2000)
    } catch (err) {
      setActionResult(`Fix failed: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Chat handlers
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || chatLoading) return
    const userMessage: Message = {
      id: `msg-${Date.now()}`, role: 'user', content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setChatLoading(true)
    setChatError(null)

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          siteId: siteId || undefined,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-a`, role: 'assistant',
        content: data.response || 'No response',
        patches: data.patches, claudePrompts: data.claudePrompts,
        context: data.context, timestamp: new Date().toISOString(),
      }])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const copyText = (text: string) => navigator.clipboard.writeText(text).catch(() => {})
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  // Health report
  const fetchHealthReport = async () => {
    setHealthLoading(true)
    try {
      const effectiveSiteId = siteId || (typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)?.[1] : null) || 'yalla-london'
      const siteParam = `?siteId=${encodeURIComponent(effectiveSiteId)}`
      const res = await fetch(`/api/admin/aggregated-report${siteParam}`)
      if (res.ok) {
        const data = await res.json()
        setHealthReport(data)
      }
    } catch (err) {
      console.warn('[health-report] fetch error:', err instanceof Error ? err.message : err)
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'health' && !healthReport) fetchHealthReport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Render Helpers ─────────────────────────────────────────────────────

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        const lang = lines[0]?.trim() || ''
        const code = lines.slice(lang ? 1 : 0).join('\n')
        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(214,208,196,0.6)' }}>
            <div className="flex items-center justify-between px-3 py-1" style={{ backgroundColor: 'rgba(28,25,23,0.03)' }}>
              <span style={{ fontSize: 9, color: '#78716C', fontFamily: 'var(--font-system)' }}>{lang || 'code'}</span>
              <button onClick={() => copyText(code)} className="p-1"><Copy style={{ width: 11, height: 11, color: '#3B7EA1' }} /></button>
            </div>
            <pre className="px-3 py-2 overflow-x-auto" style={{ fontSize: 11, color: '#1C1917', maxHeight: 300 }}>{code}</pre>
          </div>
        )
      }
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => {
            if (line.includes('CRITICAL:') || line.includes('CRITICAL -'))
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(200,50,43,0.08)', borderLeft: '3px solid #C8322B', fontSize: 12 }}>{renderInline(line)}</div>
            if (line.includes('WARNING:') || line.includes('WARNING -'))
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(196,154,42,0.08)', borderLeft: '3px solid #C49A2A', fontSize: 12 }}>{renderInline(line)}</div>
            if (line.includes('WIN:') || line.includes('WIN -'))
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(45,90,61,0.08)', borderLeft: '3px solid #2D5A3D', fontSize: 12 }}>{renderInline(line)}</div>
            if (line.startsWith('### ')) return <div key={j} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{line.slice(4)}</div>
            if (line.startsWith('## ')) return <div key={j} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>
            if (line.startsWith('NEXT STEPS:') || line.startsWith('**NEXT STEPS:**'))
              return <div key={j} className="mt-3 mb-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(59,126,161,0.08)', borderLeft: '3px solid #3B7EA1', fontWeight: 700, fontSize: 12 }}>{line}</div>
            if (line.match(/^\s*[-*]\s/)) return <div key={j} style={{ paddingLeft: 12, fontSize: 12, lineHeight: 1.5 }}>{renderInline(line)}</div>
            if (line.match(/^\s*\d+\.\s/)) return <div key={j} style={{ paddingLeft: 12, fontSize: 12, lineHeight: 1.5 }}>{renderInline(line)}</div>
            if (line.includes('[DETAILS]')) {
              const key = `detail-${i}-${j}`
              return (
                <button key={j} onClick={() => toggleSection(key)} className="flex items-center gap-1 my-1" style={{ fontSize: 10, color: '#78716C' }}>
                  {expandedSections[key] ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                  Technical Details
                </button>
              )
            }
            if (line.trim()) return <div key={j} style={{ fontSize: 12, lineHeight: 1.6 }}>{renderInline(line)}</div>
            return <div key={j} style={{ height: 6 }} />
          })}
        </span>
      )
    })
  }

  const renderInline = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={i}>{seg.slice(2, -2)}</strong>
      return <span key={i}>{seg}</span>
    })
  }

  const getSeverity = (s: string) => SEVERITY[s as keyof typeof SEVERITY] || SEVERITY.info

  // ── TAB 1: Operations Dashboard ─────────────────────────────────────────

  const renderOperationsTab = () => {
    if (opsLoading && !context) {
      return <AdminLoadingState label="Loading operations data..." />
    }

    const alerts = context?.activeAlerts || []
    const criticals = alerts.filter(a => a.severity === 'critical')
    const warnings = alerts.filter(a => a.severity === 'warning')

    return (
      <div className="space-y-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Health Grade Banner */}
        {context && (
          <AdminCard accent accentColor="blue">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{
                  width: 40, height: 40, backgroundColor: '#3B7EA1', fontWeight: 800, fontSize: 20, color: '#FAF8F4',
                  fontFamily: 'var(--font-display)',
                }}>
                  {healthReport?.grade || '?'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>Platform Health</div>
                  <div style={{ fontSize: 10, color: '#78716C', fontFamily: 'var(--font-system)' }}>
                    Score: {healthReport?.score || '\u2014'}/100 · {alerts.length} alert{alerts.length !== 1 ? 's' : ''} · {issues.length} issue{issues.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button onClick={fetchOpsData} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                <RefreshCw style={{ width: 14, height: 14, color: '#3B7EA1' }} className={opsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </AdminCard>
        )}

        {/* Alert Banners */}
        {criticals.length > 0 && (
          <div className="space-y-1">
            {criticals.map((a, i) => (
              <AdminAlertBanner key={i} severity="critical" message={a.message} detail={a.area} />
            ))}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.slice(0, 3).map((a, i) => (
              <AdminAlertBanner key={i} severity="warning" message={`${a.area}: ${a.message}`} />
            ))}
          </div>
        )}

        {/* KPI Row */}
        {context && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Published', value: context.contentVelocity?.publishedToday ?? 0, color: (context.contentVelocity?.publishedToday ?? 0) > 0 ? '#2D5A3D' : '#78716C' },
              { label: 'Stuck', value: context.contentVelocity?.stuck ?? 0, color: (context.contentVelocity?.stuck ?? 0) > 0 ? '#C49A2A' : '#2D5A3D' },
              { label: 'Indexed', value: context.seoHealth?.indexed ?? 0, color: '#3B7EA1' },
              { label: 'Crons OK', value: `${context.cronHealth?.healthy ?? 0}/${context.cronHealth?.total ?? '?'}`, color: (context.cronHealth?.failed24h ?? 0) === 0 ? '#2D5A3D' : '#C8322B' },
              { label: 'Revenue 7d', value: `$${(context.revenueSnapshot?.commissions7d ?? 0).toFixed(2)}`, color: '#C49A2A' },
              { label: 'AI Cost', value: `$${(context.aiCosts?.todayUsd ?? 0).toFixed(2)}`, color: '#78716C' },
              { label: 'Coverage', value: `${context.revenueSnapshot?.affiliateCoverage ?? 0}%`, color: (context.revenueSnapshot?.affiliateCoverage ?? 0) >= 80 ? '#2D5A3D' : '#C49A2A' },
              { label: 'Perplexity', value: `${context.perplexityStatus?.tasksQueued ?? 0}q/${context.perplexityStatus?.tasksCompleted24h ?? 0}d`, color: '#C8322B' },
            ].map((card, i) => (
              <AdminKPICard key={i} value={card.value} label={card.label} color={card.color} />
            ))}
          </div>
        )}

        {/* Issues Panel */}
        {issues.length > 0 && (
          <AdminCard>
            <div className="flex items-center justify-between mb-2">
              <AdminSectionLabel>Active Issues ({issues.length})</AdminSectionLabel>
              <AdminButton
                variant="danger" size="sm"
                onClick={() => runAction('Fix All Issues', '/api/admin/cycle-health', 'POST', { action: 'fix_all' })}
                disabled={actionLoading !== null}
                loading={actionLoading === 'Fix All Issues'}
              >
                Fix All
              </AdminButton>
            </div>
            <div className="space-y-1.5">
              {issues.slice(0, 8).map((issue) => {
                const sev = getSeverity(issue.severity)
                return (
                  <div key={issue.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: sev.bg }}>
                    <AdminStatusBadge status={issue.severity} label={sev.label} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1C1917' }}>{issue.title}</div>
                      <div style={{ fontSize: 10, color: '#78716C', lineHeight: 1.4 }}>{issue.description}</div>
                    </div>
                    {issue.fixAction && (
                      <AdminButton
                        size="sm" variant="ghost"
                        onClick={() => fixIssue(issue)}
                        disabled={actionLoading === `fix-${issue.id}`}
                        loading={actionLoading === `fix-${issue.id}`}
                      >
                        Fix Now
                      </AdminButton>
                    )}
                  </div>
                )
              })}
            </div>
          </AdminCard>
        )}

        {/* Quick Actions Grid */}
        <AdminCard>
          <AdminSectionLabel>Quick Actions</AdminSectionLabel>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => runAction(action.label, action.endpoint, action.method, action.payload)}
                disabled={actionLoading !== null}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all active:scale-[0.95]"
                style={{ backgroundColor: `${action.color}08`, border: `1px solid ${action.color}20` }}
              >
                {actionLoading === action.label
                  ? <Loader2 style={{ width: 16, height: 16, color: action.color }} className="animate-spin" />
                  : <action.icon style={{ width: 16, height: 16, color: action.color }} />
                }
                <span style={{ fontSize: 8, color: action.color, fontFamily: 'var(--font-system)', textAlign: 'center', lineHeight: 1.2 }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </AdminCard>

        {/* Action Result Toast */}
        {actionResult && (
          <AdminAlertBanner
            severity={actionResult.includes('Error') || actionResult.includes('Failed') ? 'critical' : 'info'}
            message={actionResult}
            onDismiss={() => setActionResult(null)}
          />
        )}

        {/* Recent Auto-Fixes */}
        {autoFixes.length > 0 && (
          <AdminCard>
            <AdminSectionLabel>Recent Auto-Fixes</AdminSectionLabel>
            <div className="space-y-1 mt-2">
              {autoFixes.map((fix) => (
                <div key={fix.id} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(45,90,61,0.04)' }}>
                  <CheckCircle style={{ width: 10, height: 10, color: '#2D5A3D', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#1C1917', flex: 1 }}>{fix.description || fix.type}</span>
                  <span style={{ fontSize: 8, color: '#78716C', fontFamily: 'var(--font-system)' }}>
                    {fix.createdAt ? new Date(fix.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>
        )}
      </div>
    )
  }

  // ── TAB 2: CEO Chat ─────────────────────────────────────────────────────

  const renderChatTab = () => (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Quick Action Chips */}
      {messages.length === 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {CHAT_CHIPS.map(chip => (
              <button key={chip.label} onClick={() => sendMessage(chip.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-[0.97]"
                style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#3B7EA1', backgroundColor: 'rgba(59,126,161,0.06)', border: '1px solid rgba(59,126,161,0.15)' }}>
                <chip.icon style={{ width: 12, height: 12 }} />{chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="rounded-xl px-4 py-3 max-w-[90%]" style={{
              backgroundColor: msg.role === 'user' ? '#C8322B' : '#FFFFFF',
              color: msg.role === 'user' ? '#FAF8F4' : '#1C1917',
              boxShadow: msg.role === 'user' ? 'none' : '0 1px 3px rgba(28,25,23,0.06), 0 1px 2px rgba(28,25,23,0.04)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(214,208,196,0.6)',
            }}>
              <div style={{ lineHeight: 1.6 }}>
                {msg.role === 'assistant' ? renderContent(msg.content) : (
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
              </div>

              {/* Patches */}
              {msg.patches && msg.patches.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.patches.map((patch, i) => (
                    <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(214,208,196,0.6)' }}>
                      <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'rgba(28,25,23,0.03)' }}>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#78716C' }}><Code style={{ width: 12, height: 12 }} />{patch.file}</span>
                        <button onClick={() => copyText(patch.diff)}><Copy style={{ width: 12, height: 12, color: '#3B7EA1' }} /></button>
                      </div>
                      <pre className="px-3 py-2 text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200 }}>{patch.diff}</pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Claude Code prompts */}
              {msg.claudePrompts && msg.claudePrompts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.claudePrompts.map((prompt, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(59,126,161,0.06)', border: '1px solid rgba(59,126,161,0.2)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-system)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B7EA1' }}>
                          <FileText style={{ width: 12, height: 12 }} />Paste into Claude Code
                        </span>
                        <button onClick={() => copyText(prompt)} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize: 10, color: '#3B7EA1', backgroundColor: 'rgba(59,126,161,0.1)' }}>
                          <Copy style={{ width: 12, height: 12 }} /> Copy
                        </button>
                      </div>
                      <pre className="text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200, whiteSpace: 'pre-wrap' }}>{prompt}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="flex justify-start">
            <div className="admin-card rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 style={{ width: 16, height: 16, color: '#3B7EA1' }} className="animate-spin" />
              <span style={{ fontSize: 11, color: '#78716C' }}>Analyzing platform data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {chatError && (
        <AdminAlertBanner severity="critical" message={chatError} onDismiss={() => setChatError(null)} />
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(214,208,196,0.6)' }}>
        <textarea
          ref={inputRef}
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask about revenue, pipeline, SEO, or request action..."
          rows={2}
          className="admin-input flex-1 resize-none"
          style={{ fontSize: 13, minHeight: 48 }}
        />
        <AdminButton
          variant="primary"
          onClick={() => sendMessage()}
          disabled={chatLoading || !input.trim()}
          loading={chatLoading}
        >
          <Send style={{ width: 16, height: 16 }} />
        </AdminButton>
      </div>
    </div>
  )

  // ── TAB 3: Health Report ────────────────────────────────────────────────

  const renderHealthTab = () => {
    if (healthLoading && !healthReport) {
      return <AdminLoadingState label="Loading health report..." />
    }

    if (!healthReport) {
      return (
        <AdminEmptyState
          icon={Heart}
          title="No health report loaded"
          description="Run a full audit to see platform health"
          action={<AdminButton variant="primary" onClick={fetchHealthReport}>Run Full Audit</AdminButton>}
        />
      )
    }

    const report = healthReport
    const gradeColor = report.grade === 'A' ? '#2D5A3D' : report.grade === 'B' ? '#3B7EA1' : report.grade === 'C' ? '#C49A2A' : '#C8322B'

    return (
      <div className="space-y-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Grade Header */}
        <AdminCard accent accentColor={report.grade === 'A' ? 'green' : report.grade === 'B' ? 'blue' : report.grade === 'C' ? 'gold' : 'red'}>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 56, height: 56, backgroundColor: gradeColor, fontWeight: 800, fontSize: 28, color: '#FAF8F4', fontFamily: 'var(--font-display)' }}>
              {report.grade}
            </div>
            <div className="flex-1">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#1C1917' }}>Health Score: {report.score}/100</div>
              <div style={{ fontSize: 11, color: '#78716C', fontFamily: 'var(--font-system)' }}>
                {report.issues?.length || 0} issues found · {(report.sections || []).length} sections analyzed
              </div>
            </div>
            <button onClick={fetchHealthReport} className="p-2 rounded-lg hover:bg-stone-100 transition-colors" title="Refresh">
              <RefreshCw style={{ width: 14, height: 14, color: gradeColor }} className={healthLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </AdminCard>

        {/* Issues Summary */}
        {report.issues && report.issues.length > 0 && (
          <AdminCard>
            <AdminSectionLabel>Top Issues ({report.issues.length})</AdminSectionLabel>
            <div className="space-y-1 mt-2">
              {report.issues.slice(0, 10).map((issue, i) => {
                const sev = getSeverity(issue.severity)
                return (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: sev.bg }}>
                    <AdminStatusBadge status={issue.severity} label={sev.label} />
                    <div>
                      <span style={{ fontSize: 10, color: '#78716C' }}>[{issue.category}]</span>{' '}
                      <span style={{ fontSize: 11, color: '#1C1917' }}>{issue.message}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </AdminCard>
        )}

        {/* Report Sections */}
        {Array.isArray(report.sections) && report.sections.map((section: Record<string, unknown>, i: number) => {
          const name = String(section.name || section.title || `Section ${i + 1}`)
          const isExpanded = expandedHealthSections[name] ?? false
          return (
            <AdminCard key={i}>
              <button
                onClick={() => setExpandedHealthSections(prev => ({ ...prev, [name]: !prev[name] }))}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Eye style={{ width: 12, height: 12, color: '#3B7EA1' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1917' }}>{name}</span>
                </div>
                {isExpanded ? <ChevronUp style={{ width: 14, height: 14, color: '#78716C' }} /> : <ChevronDown style={{ width: 14, height: 14, color: '#78716C' }} />}
              </button>
              {isExpanded && (
                <div className="mt-3">
                  <pre className="text-xs overflow-x-auto p-2 rounded admin-card-inset" style={{ color: '#1C1917', maxHeight: 300 }}>
                    {JSON.stringify(section, null, 2)}
                  </pre>
                </div>
              )}
            </AdminCard>
          )
        })}
      </div>
    )
  }

  // ── TAB 4: Test Runner ──────────────────────────────────────────────────

  const runTestSuite = async (suite: string) => {
    setTestLoading(suite)
    setTestResults(null)
    setTestJsonCopied(false)
    setShowRawOutput(false)
    try {
      const res = await fetch('/api/admin/test-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite }),
      })
      if (!res.ok) {
        setTestResults({ suite, exitCode: 1, summary: null, score: null, results: [], rawOutput: `HTTP ${res.status}`, timestamp: new Date().toISOString() })
        return
      }
      const data = await res.json()
      setTestResults(data)
    } catch (err) {
      setTestResults({ suite, exitCode: 1, summary: null, score: null, results: [], rawOutput: `Error: ${err instanceof Error ? err.message : String(err)}`, timestamp: new Date().toISOString() })
    } finally {
      setTestLoading(null)
    }
  }

  const copyTestJson = () => {
    if (!testResults) return
    const json = JSON.stringify({
      suite: testResults.suite,
      timestamp: testResults.timestamp,
      summary: testResults.summary,
      score: testResults.score,
      failedTests: testResults.results.filter(r => r.status === 'FAIL').map(r => ({ category: r.category, name: r.name, details: r.details })),
      warnTests: testResults.results.filter(r => r.status === 'WARN').map(r => ({ category: r.category, name: r.name, details: r.details })),
    }, null, 2)
    navigator.clipboard.writeText(json)
    setTestJsonCopied(true)
    setTimeout(() => setTestJsonCopied(false), 3000)
  }

  const shareWithCEO = () => {
    if (!testResults) return
    const failed = testResults.results.filter(r => r.status === 'FAIL')
    const warned = testResults.results.filter(r => r.status === 'WARN')
    const prompt = `Here are my latest test results from the ${testResults.suite} suite (${testResults.timestamp}):\n\n` +
      `Score: ${testResults.score ?? 'N/A'}%\n` +
      `Summary: ${testResults.summary?.pass ?? 0} PASS | ${testResults.summary?.fail ?? 0} FAIL | ${testResults.summary?.warn ?? 0} WARN\n\n` +
      (failed.length > 0 ? `FAILED TESTS:\n${failed.map(f => `- [${f.category}] ${f.name}: ${f.details}`).join('\n')}\n\n` : '') +
      (warned.length > 0 ? `WARNINGS:\n${warned.map(w => `- [${w.category}] ${w.name}: ${w.details}`).join('\n')}\n\n` : '') +
      `What needs attention? Plan and prioritize fixes.`
    setActiveTab('chat')
    sendMessage(prompt)
  }

  const renderTestRunnerTab = () => {
    const statusIcon = (s: string) => {
      if (s === 'PASS') return <CheckCircle style={{ width: 12, height: 12, color: '#2D5A3D', flexShrink: 0 }} />
      if (s === 'FAIL') return <XCircle style={{ width: 12, height: 12, color: '#C8322B', flexShrink: 0 }} />
      if (s === 'WARN') return <AlertCircle style={{ width: 12, height: 12, color: '#C49A2A', flexShrink: 0 }} />
      return <CheckCircle style={{ width: 12, height: 12, color: '#78716C', flexShrink: 0 }} />
    }

    return (
      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {/* Suite Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <AdminCard className="cursor-pointer hover:shadow-md transition-shadow">
            <button
              onClick={() => runTestSuite('smoke')}
              disabled={!!testLoading}
              className="flex flex-col items-center gap-1 w-full p-1"
            >
              {testLoading === 'smoke'
                ? <Loader2 style={{ width: 18, height: 18, color: '#3B7EA1' }} className="animate-spin" />
                : <Terminal style={{ width: 18, height: 18, color: '#3B7EA1' }} />
              }
              <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#1C1917' }}>
                Smoke Tests
              </span>
              <span style={{ fontSize: 9, color: '#78716C' }}>131+ tests</span>
            </button>
          </AdminCard>

          <AdminCard className="cursor-pointer hover:shadow-md transition-shadow">
            <button
              onClick={() => runTestSuite('validation')}
              disabled={!!testLoading}
              className="flex flex-col items-center gap-1 w-full p-1"
            >
              {testLoading === 'validation'
                ? <Loader2 style={{ width: 18, height: 18, color: '#2D5A3D' }} className="animate-spin" />
                : <ClipboardList style={{ width: 18, height: 18, color: '#2D5A3D' }} />
              }
              <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#1C1917' }}>
                Validation Suite
              </span>
              <span style={{ fontSize: 9, color: '#78716C' }}>60+ tests</span>
            </button>
          </AdminCard>
        </div>

        {/* Loading indicator */}
        {testLoading && (
          <AdminAlertBanner
            severity="info"
            message={`Running ${testLoading === 'smoke' ? 'Smoke Tests' : 'Validation Suite'}... (up to 2 min)`}
          />
        )}

        {/* Results */}
        {testResults && (
          <>
            {/* Score Banner */}
            <AdminCard accent accentColor={(testResults.score ?? 0) >= 90 ? 'green' : (testResults.score ?? 0) >= 70 ? 'gold' : 'red'}>
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#1C1917' }}>
                    {testResults.score ?? '\u2014'}%
                  </span>
                  <span style={{ fontSize: 11, color: '#78716C', marginLeft: 6, fontFamily: 'var(--font-system)' }}>
                    {testResults.suite}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#1C1917', fontFamily: 'var(--font-system)' }}>
                    <span style={{ color: '#2D5A3D' }}>{testResults.summary?.pass ?? 0} PASS</span>
                    {' · '}
                    <span style={{ color: '#C8322B' }}>{testResults.summary?.fail ?? 0} FAIL</span>
                    {' · '}
                    <span style={{ color: '#C49A2A' }}>{testResults.summary?.warn ?? 0} WARN</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#78716C', marginTop: 2 }}>
                    {new Date(testResults.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </AdminCard>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <AdminButton variant="secondary" onClick={copyTestJson} className="flex-1 justify-center">
                {testJsonCopied
                  ? <><CheckCircle style={{ width: 12, height: 12 }} /> Copied!</>
                  : <><Copy style={{ width: 12, height: 12 }} /> Copy JSON</>
                }
              </AdminButton>
              <AdminButton variant="primary" onClick={shareWithCEO} className="flex-1 justify-center">
                <MessageSquare style={{ width: 12, height: 12 }} /> Share with CEO
              </AdminButton>
            </div>

            {/* Failed Tests */}
            {testResults.results.filter(r => r.status === 'FAIL').length > 0 && (
              <AdminCard accent accentColor="red">
                <AdminSectionLabel>Failed Tests ({testResults.results.filter(r => r.status === 'FAIL').length})</AdminSectionLabel>
                <div className="space-y-1.5 mt-2">
                  {testResults.results.filter(r => r.status === 'FAIL').map((r, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(200,50,43,0.04)' }}>
                      {statusIcon(r.status)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#1C1917', display: 'block' }}>[{r.category}] {r.name}</span>
                        <span style={{ fontSize: 9, color: '#78716C', wordBreak: 'break-all' }}>{r.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* Warnings */}
            {testResults.results.filter(r => r.status === 'WARN').length > 0 && (
              <AdminCard accent accentColor="gold">
                <AdminSectionLabel>Warnings ({testResults.results.filter(r => r.status === 'WARN').length})</AdminSectionLabel>
                <div className="space-y-1 mt-2">
                  {testResults.results.filter(r => r.status === 'WARN').map((r, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(196,154,42,0.04)' }}>
                      {statusIcon(r.status)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, color: '#1C1917' }}>[{r.category}] {r.name}</span>
                        <span style={{ fontSize: 9, color: '#78716C', display: 'block', wordBreak: 'break-all' }}>{r.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* All Passing Tests (collapsed by default) */}
            {testResults.results.filter(r => r.status === 'PASS').length > 0 && (
              <AdminCard accent accentColor="green">
                <button
                  onClick={() => {
                    const el = document.getElementById('passing-tests')
                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
                  }}
                  className="flex items-center gap-1 w-full"
                >
                  <CheckCircle style={{ width: 12, height: 12, color: '#2D5A3D' }} />
                  <AdminSectionLabel>Passing ({testResults.results.filter(r => r.status === 'PASS').length})</AdminSectionLabel>
                  <ChevronDown style={{ width: 12, height: 12, color: '#2D5A3D', marginLeft: 'auto' }} />
                </button>
                <div id="passing-tests" style={{ display: 'none' }} className="space-y-0.5 mt-2">
                  {testResults.results.filter(r => r.status === 'PASS').map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-1 py-0.5">
                      {statusIcon(r.status)}
                      <span style={{ fontSize: 9, color: '#78716C' }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* Raw Output Toggle */}
            <AdminButton variant="ghost" onClick={() => setShowRawOutput(!showRawOutput)} className="w-full justify-center">
              <Terminal style={{ width: 12, height: 12 }} />
              {showRawOutput ? 'Hide' : 'Show'} Raw Output
              {showRawOutput ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            </AdminButton>

            {showRawOutput && (
              <pre className="rounded-xl px-3 py-3 overflow-x-auto" style={{
                fontSize: 9, color: '#D4D4D8', backgroundColor: '#18181B',
                fontFamily: 'var(--font-system)', lineHeight: 1.5,
                maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {testResults.rawOutput || '(no output)'}
              </pre>
            )}
          </>
        )}

        {/* No results yet */}
        {!testResults && !testLoading && (
          <AdminEmptyState
            icon={Terminal}
            title="No test results"
            description="Tap a test suite above to run it. Results appear here with Copy JSON and Share with CEO buttons."
          />
        )}
      </div>
    )
  }

  // ── Main Layout ─────────────────────────────────────────────────────────

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="CEO Operations"
        subtitle="Zenitha.Luxury Operations Centre"
        action={
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
            className="admin-select"
            style={{ fontSize: 10, minWidth: 120 }}>
            {SITES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        }
      />

      {/* Tab Bar */}
      <div className="mb-4">
        <AdminTabs
          tabs={TABS_LIST}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'operations' && renderOperationsTab()}
      {activeTab === 'chat' && renderChatTab()}
      {activeTab === 'health' && renderHealthTab()}
      {activeTab === 'tests' && renderTestRunnerTab()}
    </div>
  )
}
