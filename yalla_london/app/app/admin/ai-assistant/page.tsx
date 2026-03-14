'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare, Send, Loader2, Copy, Code, FileText, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Zap, BarChart3, Activity,
  TrendingUp, DollarSign, Search, Settings, Globe, Wrench,
  Shield, Heart, CheckCircle, XCircle, Play, Eye, ClipboardList,
  Download, Terminal,
} from 'lucide-react'

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

const TABS = ['Operations', 'CEO Chat', 'Health Report', 'Test Runner'] as const
type TabName = typeof TABS[number]

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
  { label: 'Run Diagnostics', icon: Wrench, endpoint: '/api/admin/cycle-health', method: 'POST', payload: { action: 'diagnose' }, color: '#6366F1' },
  { label: 'Fix All Issues', icon: Shield, endpoint: '/api/admin/cycle-health', method: 'POST', payload: { action: 'fix_all' }, color: '#C8322B' },
  { label: 'Publish Ready', icon: Play, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/content-selector' }, color: '#10B981' },
  { label: 'Run Pipeline', icon: Activity, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/content-builder' }, color: '#8B5CF6' },
  { label: 'SEO Agent', icon: Search, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/seo-agent' }, color: '#F59E0B' },
  { label: 'Sync Affiliates', icon: DollarSign, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/affiliate/cron/sync-advertisers' }, color: '#EC4899' },
  { label: 'Health Check', icon: Heart, endpoint: '/api/admin/aggregated-report', method: 'GET', color: '#06B6D4' },
  { label: 'Perplexity Tasks', icon: Zap, endpoint: '/api/admin/departures', method: 'POST', payload: { path: '/api/cron/perplexity-executor' }, color: '#7C3AED' },
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
  high: { color: '#EA580C', bg: 'rgba(234,88,12,0.06)', label: 'HIGH' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', label: 'WARNING' },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', label: 'MEDIUM' },
  info: { color: '#6366F1', bg: 'rgba(99,102,241,0.06)', label: 'INFO' },
  low: { color: '#78716C', bg: 'rgba(120,113,108,0.06)', label: 'LOW' },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CEOOperationsDashboard() {
  const [activeTab, setActiveTab] = useState<TabName>('Operations')
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

      // Extract context from cockpit
      if (cockpitRes.status === 'fulfilled' && cockpitRes.value) {
        const d = cockpitRes.value
        setContext({
          contentVelocity: d.content || d.contentVelocity,
          seoHealth: d.seo || d.seoHealth,
          revenueSnapshot: d.revenue || d.revenueSnapshot,
          cronHealth: d.crons || d.cronHealth,
          aiCosts: d.costs || d.aiCosts,
          activeAlerts: d.alerts || d.activeAlerts || [],
          perplexityStatus: d.perplexity || d.perplexityStatus,
        })
      }

      // Issues from cycle-health
      if (healthRes.status === 'fulfilled' && healthRes.value?.issues) {
        setIssues(healthRes.value.issues)
      }

      // Auto-fixes
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
    if (activeTab === 'Operations') fetchOpsData()
  }, [activeTab, fetchOpsData])

  // Auto-refresh every 60s on Operations tab
  useEffect(() => {
    if (activeTab !== 'Operations') return undefined
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
      const siteParam = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '?siteId=yalla-london'
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
    if (activeTab === 'Health Report' && !healthReport) fetchHealthReport()
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
          <div key={i} className="my-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,113,108,0.2)' }}>
            <div className="flex items-center justify-between px-3 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 9, color: '#78716C', fontFamily: "'IBM Plex Mono', monospace" }}>{lang || 'code'}</span>
              <button onClick={() => copyText(code)} className="p-1"><Copy style={{ width: 11, height: 11, color: '#6366F1' }} /></button>
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
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #F59E0B', fontSize: 12 }}>{renderInline(line)}</div>
            if (line.includes('WIN:') || line.includes('WIN -'))
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderLeft: '3px solid #10B981', fontSize: 12 }}>{renderInline(line)}</div>
            if (line.startsWith('### ')) return <div key={j} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{line.slice(4)}</div>
            if (line.startsWith('## ')) return <div key={j} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>
            if (line.startsWith('NEXT STEPS:') || line.startsWith('**NEXT STEPS:**'))
              return <div key={j} className="mt-3 mb-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderLeft: '3px solid #6366F1', fontWeight: 700, fontSize: 12 }}>{line}</div>
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
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 style={{ width: 20, height: 20, color: '#6366F1' }} className="animate-spin" />
          <span className="ml-2" style={{ fontSize: 12, color: '#78716C' }}>Loading operations data...</span>
        </div>
      )
    }

    const alerts = context?.activeAlerts || []
    const criticals = alerts.filter(a => a.severity === 'critical')
    const warnings = alerts.filter(a => a.severity === 'warning')

    return (
      <div className="space-y-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Health Grade Banner */}
        {context && (
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg" style={{
                  width: 40, height: 40, backgroundColor: '#6366F1', fontWeight: 800, fontSize: 20, color: '#FAF8F4',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {healthReport?.grade || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1917' }}>Platform Health</div>
                  <div style={{ fontSize: 10, color: '#78716C', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Score: {healthReport?.score || '—'}/100 · {alerts.length} alert{alerts.length !== 1 ? 's' : ''} · {issues.length} issue{issues.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button onClick={fetchOpsData} className="p-2 rounded-lg hover:bg-white/50">
                <RefreshCw style={{ width: 14, height: 14, color: '#6366F1' }} className={opsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}

        {/* Alert Banners */}
        {criticals.length > 0 && (
          <div className="space-y-1">
            {criticals.map((a, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: SEVERITY.critical.bg, border: '1px solid rgba(200,50,43,0.15)' }}>
                <XCircle style={{ width: 14, height: 14, color: SEVERITY.critical.color, marginTop: 1, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: SEVERITY.critical.color, textTransform: 'uppercase' }}>{a.area}</div>
                  <div style={{ fontSize: 12, color: '#1C1917' }}>{a.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: SEVERITY.warning.bg }}>
                <AlertCircle style={{ width: 12, height: 12, color: SEVERITY.warning.color, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: SEVERITY.warning.color }}><strong>{a.area}:</strong> {a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* KPI Row */}
        {context && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Published', value: context.contentVelocity?.publishedToday ?? 0, icon: BarChart3, color: (context.contentVelocity?.publishedToday ?? 0) > 0 ? '#10B981' : '#78716C' },
              { label: 'Stuck', value: context.contentVelocity?.stuck ?? 0, icon: AlertCircle, color: (context.contentVelocity?.stuck ?? 0) > 0 ? '#F59E0B' : '#10B981' },
              { label: 'Indexed', value: context.seoHealth?.indexed ?? 0, icon: Globe, color: '#6366F1' },
              { label: 'Crons OK', value: `${context.cronHealth?.healthy ?? 0}/${context.cronHealth?.total ?? 24}`, icon: Activity, color: (context.cronHealth?.failed24h ?? 0) === 0 ? '#10B981' : '#C8322B' },
              { label: 'Revenue 7d', value: `$${(context.revenueSnapshot?.commissions7d ?? 0).toFixed(2)}`, icon: DollarSign, color: '#6366F1' },
              { label: 'AI Cost', value: `$${(context.aiCosts?.todayUsd ?? 0).toFixed(2)}`, icon: Zap, color: '#78716C' },
              { label: 'Coverage', value: `${context.revenueSnapshot?.affiliateCoverage ?? 0}%`, icon: TrendingUp, color: (context.revenueSnapshot?.affiliateCoverage ?? 0) >= 80 ? '#10B981' : '#F59E0B' },
              { label: 'Perplexity', value: `${context.perplexityStatus?.tasksQueued ?? 0}q/${context.perplexityStatus?.tasksCompleted24h ?? 0}d`, icon: Zap, color: '#7C3AED' },
            ].map((card, i) => (
              <div key={i} className="flex flex-col items-center px-2 py-2 rounded-xl" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
                <card.icon style={{ width: 14, height: 14, color: card.color, marginBottom: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: card.color, fontFamily: "'IBM Plex Mono', monospace" }}>{card.value}</span>
                <span style={{ fontSize: 8, color: '#78716C', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Issues Panel */}
        {issues.length > 0 && (
          <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1 }}>
                Active Issues ({issues.length})
              </span>
              <button
                onClick={() => runAction('Fix All Issues', '/api/admin/cycle-health', 'POST', { action: 'fix_all' })}
                disabled={actionLoading !== null}
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(200,50,43,0.08)', color: '#C8322B' }}
              >
                {actionLoading === 'Fix All Issues' ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin inline" /> : 'Fix All'}
              </button>
            </div>
            <div className="space-y-1.5">
              {issues.slice(0, 8).map((issue) => {
                const sev = getSeverity(issue.severity)
                return (
                  <div key={issue.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: sev.bg }}>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ color: sev.color, backgroundColor: `${sev.color}15`, flexShrink: 0 }}>
                      {sev.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1C1917' }}>{issue.title}</div>
                      <div style={{ fontSize: 10, color: '#78716C', lineHeight: 1.4 }}>{issue.description}</div>
                    </div>
                    {issue.fixAction && (
                      <button
                        onClick={() => fixIssue(issue)}
                        disabled={actionLoading === `fix-${issue.id}`}
                        className="px-2 py-1 rounded text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: `${sev.color}15`, color: sev.color }}
                      >
                        {actionLoading === `fix-${issue.id}` ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> : 'Fix Now'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1 }}>
            Quick Actions
          </span>
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
                <span style={{ fontSize: 8, color: action.color, fontFamily: "'IBM Plex Mono', monospace", textAlign: 'center', lineHeight: 1.2 }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Result Toast */}
        {actionResult && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: actionResult.includes('Error') || actionResult.includes('Failed') ? 'rgba(200,50,43,0.06)' : 'rgba(16,185,129,0.06)' }}>
            {actionResult.includes('Error') || actionResult.includes('Failed')
              ? <XCircle style={{ width: 14, height: 14, color: '#C8322B' }} />
              : <CheckCircle style={{ width: 14, height: 14, color: '#10B981' }} />
            }
            <span style={{ fontSize: 11, color: '#1C1917' }}>{actionResult}</span>
            <button onClick={() => setActionResult(null)} className="ml-auto" style={{ fontSize: 10, color: '#78716C' }}>Dismiss</button>
          </div>
        )}

        {/* Recent Auto-Fixes */}
        {autoFixes.length > 0 && (
          <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1 }}>
              Recent Auto-Fixes
            </span>
            <div className="space-y-1 mt-2">
              {autoFixes.map((fix) => (
                <div key={fix.id} className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.04)' }}>
                  <CheckCircle style={{ width: 10, height: 10, color: '#10B981', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#1C1917', flex: 1 }}>{fix.description || fix.type}</span>
                  <span style={{ fontSize: 8, color: '#78716C', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fix.createdAt ? new Date(fix.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
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
              backgroundColor: msg.role === 'user' ? '#6366F1' : 'var(--neu-bg, #EDE9E1)',
              color: msg.role === 'user' ? '#FAF8F4' : '#1C1917',
              boxShadow: msg.role === 'user' ? 'none' : 'var(--neu-flat)',
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
                    <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,113,108,0.2)' }}>
                      <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#78716C' }}><Code style={{ width: 12, height: 12 }} />{patch.file}</span>
                        <button onClick={() => copyText(patch.diff)}><Copy style={{ width: 12, height: 12, color: '#6366F1' }} /></button>
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
                    <div key={i} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#6366F1' }}>
                          <FileText style={{ width: 12, height: 12 }} />Paste into Claude Code
                        </span>
                        <button onClick={() => copyText(prompt)} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }}>
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
            <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--neu-bg)', boxShadow: 'var(--neu-flat)' }}>
              <Loader2 style={{ width: 16, height: 16, color: '#6366F1' }} className="animate-spin" />
              <span style={{ fontSize: 11, color: '#78716C' }}>Analyzing platform data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {chatError && (
        <div className="mb-2 p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
          <AlertCircle style={{ width: 14, height: 14, color: '#C8322B' }} />
          <span style={{ fontSize: 11, color: '#C8322B' }}>{chatError}</span>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
        <textarea
          ref={inputRef}
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask about revenue, pipeline, SEO, or request action..."
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-xl border-none resize-none"
          style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-inset)', fontSize: 13, color: '#1C1917', minHeight: 48 }}
        />
        <button onClick={() => sendMessage()} disabled={chatLoading || !input.trim()}
          className="flex items-center justify-center rounded-xl transition-all active:scale-[0.95] disabled:opacity-50"
          style={{ backgroundColor: '#6366F1', color: '#FAF8F4', minWidth: 48, minHeight: 48 }}>
          {chatLoading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <Send style={{ width: 18, height: 18 }} />}
        </button>
      </div>
    </div>
  )

  // ── TAB 3: Health Report ────────────────────────────────────────────────

  const renderHealthTab = () => {
    if (healthLoading && !healthReport) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 style={{ width: 20, height: 20, color: '#6366F1' }} className="animate-spin" />
          <span className="ml-2" style={{ fontSize: 12, color: '#78716C' }}>Loading health report...</span>
        </div>
      )
    }

    if (!healthReport) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Heart style={{ width: 32, height: 32, color: '#78716C' }} />
          <span style={{ fontSize: 12, color: '#78716C' }}>No health report loaded</span>
          <button onClick={fetchHealthReport} className="px-4 py-2 rounded-xl" style={{ backgroundColor: '#6366F1', color: '#FAF8F4', fontSize: 12 }}>
            Run Full Audit
          </button>
        </div>
      )
    }

    const report = healthReport
    const gradeColor = report.grade === 'A' ? '#10B981' : report.grade === 'B' ? '#6366F1' : report.grade === 'C' ? '#F59E0B' : '#C8322B'

    return (
      <div className="space-y-4 overflow-y-auto pb-20" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Grade Header */}
        <div className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ backgroundColor: `${gradeColor}08`, border: `1px solid ${gradeColor}20` }}>
          <div className="flex items-center justify-center rounded-xl" style={{ width: 56, height: 56, backgroundColor: gradeColor, fontWeight: 800, fontSize: 28, color: '#FAF8F4', fontFamily: "'IBM Plex Mono', monospace" }}>
            {report.grade}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1C1917' }}>Health Score: {report.score}/100</div>
            <div style={{ fontSize: 11, color: '#78716C' }}>
              {report.issues?.length || 0} issues found · {(report.sections || []).length} sections analyzed
            </div>
          </div>
          <button onClick={fetchHealthReport} className="ml-auto p-2 rounded-lg hover:bg-white/50" title="Refresh">
            <RefreshCw style={{ width: 14, height: 14, color: gradeColor }} className={healthLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Issues Summary */}
        {report.issues && report.issues.length > 0 && (
          <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#1C1917', textTransform: 'uppercase', letterSpacing: 1 }}>
              Top Issues ({report.issues.length})
            </span>
            <div className="space-y-1 mt-2">
              {report.issues.slice(0, 10).map((issue, i) => {
                const sev = getSeverity(issue.severity)
                return (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: sev.bg }}>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0" style={{ color: sev.color, backgroundColor: `${sev.color}15` }}>
                      {sev.label}
                    </span>
                    <div>
                      <span style={{ fontSize: 10, color: '#78716C' }}>[{issue.category}]</span>{' '}
                      <span style={{ fontSize: 11, color: '#1C1917' }}>{issue.message}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Report Sections */}
        {Array.isArray(report.sections) && report.sections.map((section: Record<string, unknown>, i: number) => {
          const name = String(section.name || section.title || `Section ${i + 1}`)
          const isExpanded = expandedHealthSections[name] ?? false
          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <button
                onClick={() => setExpandedHealthSections(prev => ({ ...prev, [name]: !prev[name] }))}
                className="w-full flex items-center justify-between px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Eye style={{ width: 12, height: 12, color: '#6366F1' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1917' }}>{name}</span>
                </div>
                {isExpanded ? <ChevronUp style={{ width: 14, height: 14, color: '#78716C' }} /> : <ChevronDown style={{ width: 14, height: 14, color: '#78716C' }} />}
              </button>
              {isExpanded && (
                <div className="px-3 pb-3">
                  <pre className="text-xs overflow-x-auto p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.03)', color: '#1C1917', maxHeight: 300 }}>
                    {JSON.stringify(section, null, 2)}
                  </pre>
                </div>
              )}
            </div>
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
    setActiveTab('CEO Chat')
    sendMessage(prompt)
  }

  const renderTestRunnerTab = () => {
    const statusIcon = (s: string) => {
      if (s === 'PASS') return <CheckCircle style={{ width: 12, height: 12, color: '#10B981', flexShrink: 0 }} />
      if (s === 'FAIL') return <XCircle style={{ width: 12, height: 12, color: '#C8322B', flexShrink: 0 }} />
      if (s === 'WARN') return <AlertCircle style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0 }} />
      return <CheckCircle style={{ width: 12, height: 12, color: '#78716C', flexShrink: 0 }} />
    }

    return (
      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {/* Suite Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => runTestSuite('smoke')}
            disabled={!!testLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            {testLoading === 'smoke'
              ? <Loader2 style={{ width: 18, height: 18, color: '#6366F1' }} className="animate-spin" />
              : <Terminal style={{ width: 18, height: 18, color: '#6366F1' }} />
            }
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: '#1C1917' }}>
              Smoke Tests
            </span>
            <span style={{ fontSize: 9, color: '#78716C' }}>131+ tests · Pipeline, Security, CEO</span>
          </button>

          <button
            onClick={() => runTestSuite('validation')}
            disabled={!!testLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            {testLoading === 'validation'
              ? <Loader2 style={{ width: 18, height: 18, color: '#10B981' }} className="animate-spin" />
              : <ClipboardList style={{ width: 18, height: 18, color: '#10B981' }} />
            }
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: '#1C1917' }}>
              Validation Suite
            </span>
            <span style={{ fontSize: 9, color: '#78716C' }}>60+ tests · API, Timeout, Coherence</span>
          </button>
        </div>

        {/* Loading indicator */}
        {testLoading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.06)' }}>
            <Loader2 style={{ width: 14, height: 14, color: '#6366F1' }} className="animate-spin" />
            <span style={{ fontSize: 11, color: '#6366F1', fontFamily: "'IBM Plex Mono', monospace" }}>
              Running {testLoading === 'smoke' ? 'Smoke Tests' : 'Validation Suite'}... (up to 2 min)
            </span>
          </div>
        )}

        {/* Results */}
        {testResults && (
          <>
            {/* Score Banner */}
            <div className="rounded-xl px-4 py-3" style={{
              backgroundColor: (testResults.score ?? 0) >= 90 ? 'rgba(16,185,129,0.08)' : (testResults.score ?? 0) >= 70 ? 'rgba(217,119,6,0.08)' : 'rgba(200,50,43,0.08)',
              border: `1px solid ${(testResults.score ?? 0) >= 90 ? 'rgba(16,185,129,0.3)' : (testResults.score ?? 0) >= 70 ? 'rgba(217,119,6,0.3)' : 'rgba(200,50,43,0.3)'}`,
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 800, fontSize: 28, color: '#1C1917' }}>
                    {testResults.score ?? '—'}%
                  </span>
                  <span style={{ fontSize: 11, color: '#78716C', marginLeft: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {testResults.suite}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#1C1917', fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span style={{ color: '#10B981' }}>{testResults.summary?.pass ?? 0} PASS</span>
                    {' · '}
                    <span style={{ color: '#C8322B' }}>{testResults.summary?.fail ?? 0} FAIL</span>
                    {' · '}
                    <span style={{ color: '#D97706' }}>{testResults.summary?.warn ?? 0} WARN</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#78716C', marginTop: 2 }}>
                    {new Date(testResults.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={copyTestJson}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all active:scale-[0.97]"
                style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366F1' }}
              >
                {testJsonCopied
                  ? <><CheckCircle style={{ width: 12, height: 12 }} /> Copied!</>
                  : <><Copy style={{ width: 12, height: 12 }} /> Copy JSON</>
                }
              </button>
              <button
                onClick={shareWithCEO}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all active:scale-[0.97]"
                style={{ fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", backgroundColor: '#6366F1', color: '#FAF8F4' }}
              >
                <MessageSquare style={{ width: 12, height: 12 }} /> Share with CEO
              </button>
            </div>

            {/* Failed Tests */}
            {testResults.results.filter(r => r.status === 'FAIL').length > 0 && (
              <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.15)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#C8322B', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Failed Tests ({testResults.results.filter(r => r.status === 'FAIL').length})
                </span>
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
              </div>
            )}

            {/* Warnings */}
            {testResults.results.filter(r => r.status === 'WARN').length > 0 && (
              <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.15)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Warnings ({testResults.results.filter(r => r.status === 'WARN').length})
                </span>
                <div className="space-y-1 mt-2">
                  {testResults.results.filter(r => r.status === 'WARN').map((r, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(217,119,6,0.04)' }}>
                      {statusIcon(r.status)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 10, color: '#1C1917' }}>[{r.category}] {r.name}</span>
                        <span style={{ fontSize: 9, color: '#78716C', display: 'block', wordBreak: 'break-all' }}>{r.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Passing Tests (collapsed by default) */}
            {testResults.results.filter(r => r.status === 'PASS').length > 0 && (
              <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <button
                  onClick={() => {
                    const el = document.getElementById('passing-tests')
                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
                  }}
                  className="flex items-center gap-1 w-full"
                >
                  <CheckCircle style={{ width: 12, height: 12, color: '#10B981' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Passing ({testResults.results.filter(r => r.status === 'PASS').length})
                  </span>
                  <ChevronDown style={{ width: 12, height: 12, color: '#10B981', marginLeft: 'auto' }} />
                </button>
                <div id="passing-tests" style={{ display: 'none' }} className="space-y-0.5 mt-2">
                  {testResults.results.filter(r => r.status === 'PASS').map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-1 py-0.5">
                      {statusIcon(r.status)}
                      <span style={{ fontSize: 9, color: '#78716C' }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Output Toggle */}
            <button
              onClick={() => setShowRawOutput(!showRawOutput)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl w-full transition-all"
              style={{ fontSize: 10, color: '#78716C', backgroundColor: 'rgba(120,113,108,0.04)', border: '1px solid rgba(120,113,108,0.1)', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <Terminal style={{ width: 12, height: 12 }} />
              {showRawOutput ? 'Hide' : 'Show'} Raw Output
              {showRawOutput ? <ChevronUp style={{ width: 12, height: 12, marginLeft: 'auto' }} /> : <ChevronDown style={{ width: 12, height: 12, marginLeft: 'auto' }} />}
            </button>

            {showRawOutput && (
              <pre className="rounded-xl px-3 py-3 overflow-x-auto" style={{
                fontSize: 9, color: '#D4D4D8', backgroundColor: '#18181B',
                fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5,
                maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {testResults.rawOutput || '(no output)'}
              </pre>
            )}
          </>
        )}

        {/* No results yet */}
        {!testResults && !testLoading && (
          <div className="text-center py-8" style={{ color: '#78716C' }}>
            <Terminal style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              Tap a test suite above to run it
            </p>
            <p style={{ fontSize: 10, marginTop: 4 }}>
              Results appear here with Copy JSON + Share with CEO buttons
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Main Layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-1" style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: '#6366F1' }}>
            <Zap style={{ width: 16, height: 16, color: '#FAF8F4' }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 15, color: '#1C1917', display: 'block', lineHeight: 1.2 }}>
              CEO Operations
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
              Zenitha.Luxury Operations Centre
            </span>
          </div>
        </div>
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
          className="rounded-lg px-2 py-1"
          style={{ fontSize: 10, color: '#1C1917', backgroundColor: 'var(--neu-bg, #EDE9E1)', border: '1px solid rgba(120,113,108,0.15)', fontFamily: "'IBM Plex Mono', monospace" }}>
          {SITES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-xl transition-all text-center"
            style={{
              fontSize: 11, fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: activeTab === tab ? '#6366F1' : 'transparent',
              color: activeTab === tab ? '#FAF8F4' : '#78716C',
              border: activeTab === tab ? 'none' : '1px solid rgba(120,113,108,0.1)',
            }}
          >
            {tab === 'Operations' && <Activity style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />}
            {tab === 'CEO Chat' && <MessageSquare style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />}
            {tab === 'Health Report' && <Heart style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />}
            {tab === 'Test Runner' && <Terminal style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />}
            {tab === 'Test Runner' ? 'Tests' : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Operations' && renderOperationsTab()}
      {activeTab === 'CEO Chat' && renderChatTab()}
      {activeTab === 'Health Report' && renderHealthTab()}
      {activeTab === 'Test Runner' && renderTestRunnerTab()}
    </div>
  )
}
