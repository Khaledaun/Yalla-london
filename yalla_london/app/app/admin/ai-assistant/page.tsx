'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageSquare, Send, Loader2, Copy, Code, FileText, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Zap, BarChart3, Activity,
  TrendingUp, DollarSign, Search, Settings, Globe,
} from 'lucide-react'

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
}

// Quick action chips — dynamic based on context
const DEFAULT_CHIPS = [
  { label: 'What needs attention?', icon: AlertCircle },
  { label: 'Pipeline status', icon: Activity },
  { label: 'Revenue report', icon: DollarSign },
  { label: 'Run diagnostics', icon: Settings },
  { label: "This week's wins", icon: TrendingUp },
  { label: 'SEO health', icon: Search },
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

export default function CEOAgent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [siteId, setSiteId] = useState('')
  const [showBriefing, setShowBriefing] = useState(true)
  const [briefing, setBriefing] = useState<ContextData | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch briefing on mount
  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Give me a quick morning briefing. What happened overnight? What needs attention? Any wins?',
          siteId: siteId || undefined,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setBriefing(data.context || null)
      if (data.response) {
        setMessages([{
          id: 'briefing',
          role: 'assistant',
          content: data.response,
          context: data.context,
          patches: data.patches,
          claudePrompts: data.claudePrompts,
          timestamp: new Date().toISOString(),
        }])
      }
    } catch {
      // Briefing is optional — don't block the UI
    } finally {
      setBriefingLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    const lastBriefing = localStorage.getItem('ceo-briefing-date')
    const today = new Date().toISOString().split('T')[0]
    if (lastBriefing !== today) {
      fetchBriefing()
      localStorage.setItem('ceo-briefing-date', today)
    }
  }, [fetchBriefing])

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || loading) return
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          siteId: siteId || undefined,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: data.response || 'No response',
        patches: data.patches,
        claudePrompts: data.claudePrompts,
        context: data.context,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Render markdown-like content with basic formatting
  const renderContent = (content: string) => {
    // Split by code blocks first
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
      // Render text with bold, urgency tags, and bullet points
      return (
        <span key={i}>
          {part.split('\n').map((line, j) => {
            // Urgency tags
            if (line.includes('CRITICAL:') || line.includes('CRITICAL -')) {
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(200,50,43,0.08)', borderLeft: '3px solid #C8322B', fontSize: 12 }}>{renderInline(line)}</div>
            }
            if (line.includes('WARNING:') || line.includes('WARNING -')) {
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #F59E0B', fontSize: 12 }}>{renderInline(line)}</div>
            }
            if (line.includes('WIN:') || line.includes('WIN -')) {
              return <div key={j} className="my-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderLeft: '3px solid #10B981', fontSize: 12 }}>{renderInline(line)}</div>
            }
            // Headers
            if (line.startsWith('### ')) return <div key={j} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{line.slice(4)}</div>
            if (line.startsWith('## ')) return <div key={j} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>
            // NEXT STEPS section
            if (line.startsWith('NEXT STEPS:') || line.startsWith('**NEXT STEPS:**')) {
              return <div key={j} className="mt-3 mb-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderLeft: '3px solid #6366F1', fontWeight: 700, fontSize: 12 }}>{line}</div>
            }
            // Bullet points
            if (line.match(/^\s*[-*]\s/)) return <div key={j} style={{ paddingLeft: 12, fontSize: 12, lineHeight: 1.5 }}>{renderInline(line)}</div>
            // Numbered list
            if (line.match(/^\s*\d+\.\s/)) return <div key={j} style={{ paddingLeft: 12, fontSize: 12, lineHeight: 1.5 }}>{renderInline(line)}</div>
            // [DETAILS] blocks — collapsible
            if (line.includes('[DETAILS]')) {
              const key = `detail-${i}-${j}`
              return (
                <button key={j} onClick={() => toggleSection(key)} className="flex items-center gap-1 my-1" style={{ fontSize: 10, color: '#78716C' }}>
                  {expandedSections[key] ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                  Technical Details
                </button>
              )
            }
            // Regular line
            if (line.trim()) return <div key={j} style={{ fontSize: 12, lineHeight: 1.6 }}>{renderInline(line)}</div>
            return <div key={j} style={{ height: 6 }} />
          })}
        </span>
      )
    })
  }

  const renderInline = (text: string) => {
    // Bold
    return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i}>{seg.slice(2, -2)}</strong>
      }
      return <span key={i}>{seg}</span>
    })
  }

  // KPI mini cards from context
  const renderKPICards = (ctx: ContextData) => {
    const cards: Array<{ label: string; value: string; color: string; icon: React.ReactNode }> = []
    if (ctx.contentVelocity) {
      cards.push({
        label: 'Published Today',
        value: String(ctx.contentVelocity.publishedToday),
        color: ctx.contentVelocity.publishedToday > 0 ? '#10B981' : '#78716C',
        icon: <BarChart3 style={{ width: 12, height: 12 }} />,
      })
      if (ctx.contentVelocity.stuck > 0) {
        cards.push({
          label: 'Stuck',
          value: String(ctx.contentVelocity.stuck),
          color: '#F59E0B',
          icon: <AlertCircle style={{ width: 12, height: 12 }} />,
        })
      }
    }
    if (ctx.seoHealth) {
      cards.push({
        label: 'Indexed',
        value: `${ctx.seoHealth.indexed}`,
        color: ctx.seoHealth.indexingRate > 0.5 ? '#10B981' : '#F59E0B',
        icon: <Globe style={{ width: 12, height: 12 }} />,
      })
    }
    if (ctx.cronHealth) {
      cards.push({
        label: 'Crons',
        value: `${ctx.cronHealth.healthy}/${ctx.cronHealth.total}`,
        color: ctx.cronHealth.failed24h === 0 ? '#10B981' : '#C8322B',
        icon: <Activity style={{ width: 12, height: 12 }} />,
      })
    }
    if (ctx.revenueSnapshot) {
      cards.push({
        label: 'Revenue 7d',
        value: `$${(ctx.revenueSnapshot.commissions7d || 0).toFixed(2)}`,
        color: '#6366F1',
        icon: <DollarSign style={{ width: 12, height: 12 }} />,
      })
    }
    if (ctx.aiCosts) {
      cards.push({
        label: 'AI Cost Today',
        value: `$${(ctx.aiCosts.todayUsd || 0).toFixed(2)}`,
        color: '#78716C',
        icon: <Zap style={{ width: 12, height: 12 }} />,
      })
    }

    if (cards.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
        {cards.map((c, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(120,113,108,0.1)' }}>
            <span style={{ color: c.color }}>{c.icon}</span>
            <span style={{ fontSize: 9, color: '#78716C', fontFamily: "'IBM Plex Mono', monospace" }}>{c.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.color, fontFamily: "'IBM Plex Mono', monospace" }}>{c.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Alert badges from context
  const renderAlerts = (ctx: ContextData) => {
    if (!ctx.activeAlerts || ctx.activeAlerts.length === 0) return null
    const severityColors = { critical: '#C8322B', warning: '#F59E0B', info: '#6366F1' }
    const severityBg = { critical: 'rgba(200,50,43,0.06)', warning: 'rgba(245,158,11,0.06)', info: 'rgba(99,102,241,0.06)' }
    return (
      <div className="space-y-1 mt-2">
        {ctx.activeAlerts.slice(0, 3).map((alert, i) => (
          <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: severityBg[alert.severity] }}>
            <AlertCircle style={{ width: 11, height: 11, color: severityColors[alert.severity], marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: severityColors[alert.severity], lineHeight: 1.4 }}>
              <strong>{alert.area}:</strong> {alert.message}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: '#6366F1' }}>
            <Zap style={{ width: 16, height: 16, color: '#FAF8F4' }} />
          </div>
          <div>
            <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 15, color: '#1C1917', display: 'block', lineHeight: 1.2 }}>
              CEO Agent
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
              {briefing?.cronHealth
                ? `Connected · ${briefing.cronHealth.healthy} crons healthy · ${briefing?.seoHealth?.indexed || 0} indexed`
                : 'Strategic Operations Intelligence'}
            </span>
          </div>
        </div>
        {/* Site Selector */}
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="rounded-lg px-2 py-1"
          style={{
            fontSize: 10, color: '#1C1917', backgroundColor: 'var(--neu-bg, #EDE9E1)',
            border: '1px solid rgba(120,113,108,0.15)', fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {SITES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Morning Briefing Banner */}
      {showBriefing && briefing && !briefingLoading && messages.length <= 1 && (
        <div className="mb-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1 }}>
              Daily Briefing
            </span>
            <div className="flex items-center gap-2">
              <button onClick={fetchBriefing} className="p-1" title="Refresh">
                <RefreshCw style={{ width: 11, height: 11, color: '#6366F1' }} />
              </button>
              <button onClick={() => setShowBriefing(false)} style={{ fontSize: 9, color: '#78716C' }}>Dismiss</button>
            </div>
          </div>
          {renderKPICards(briefing)}
          {renderAlerts(briefing)}
        </div>
      )}

      {/* Quick Action Chips */}
      {messages.length === 0 && !briefingLoading && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-[0.97]"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                }}
              >
                <chip.icon style={{ width: 12, height: 12 }} />
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading briefing */}
      {briefingLoading && messages.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 style={{ width: 16, height: 16, color: '#6366F1' }} className="animate-spin" />
            <span style={{ fontSize: 12, color: '#78716C' }}>Preparing your briefing...</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-xl px-4 py-3 max-w-[90%]"
              style={{
                backgroundColor: msg.role === 'user' ? '#6366F1' : 'var(--neu-bg, #EDE9E1)',
                color: msg.role === 'user' ? '#FAF8F4' : '#1C1917',
                boxShadow: msg.role === 'user' ? 'none' : 'var(--neu-flat)',
              }}
            >
              {/* Content with rich rendering for assistant messages */}
              <div style={{ lineHeight: 1.6 }}>
                {msg.role === 'assistant' ? renderContent(msg.content) : (
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
              </div>

              {/* KPI cards from context */}
              {msg.role === 'assistant' && msg.context && renderKPICards(msg.context)}

              {/* Alert badges */}
              {msg.role === 'assistant' && msg.context && renderAlerts(msg.context)}

              {/* Patches */}
              {msg.patches && msg.patches.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.patches.map((patch, i) => (
                    <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,113,108,0.2)' }}>
                      <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#78716C' }}>
                          <Code style={{ width: 12, height: 12 }} />
                          {patch.file}
                        </span>
                        <button onClick={() => copyText(patch.diff)} style={{ fontSize: 9, color: '#6366F1' }}>
                          <Copy style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <pre className="px-3 py-2 text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200 }}>
                        {patch.diff}
                      </pre>
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
                          <FileText style={{ width: 12, height: 12 }} />
                          Paste into Claude Code
                        </span>
                        <button
                          onClick={() => copyText(prompt)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }}
                        >
                          <Copy style={{ width: 12, height: 12 }} /> Copy
                        </button>
                      </div>
                      <pre className="text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
                        {prompt}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
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
      {error && (
        <div className="mb-2 p-2 rounded-lg flex items-center gap-2"
             style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
          <AlertCircle style={{ width: 14, height: 14, color: '#C8322B' }} />
          <span style={{ fontSize: 11, color: '#C8322B' }}>{error}</span>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-2" style={{ borderTop: '1px solid rgba(120,113,108,0.12)' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about revenue, pipeline health, SEO, or request action..."
          rows={2}
          className="flex-1 px-3 py-2.5 rounded-xl border-none resize-none"
          style={{
            backgroundColor: 'var(--neu-bg, #EDE9E1)',
            boxShadow: 'var(--neu-inset)',
            fontSize: 13,
            color: '#1C1917',
            minHeight: 48,
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center rounded-xl transition-all active:scale-[0.95] disabled:opacity-50"
          style={{
            backgroundColor: '#6366F1',
            color: '#FAF8F4',
            minWidth: 48,
            minHeight: 48,
            boxShadow: '3px 3px 8px var(--neu-shadow-dark, #CAC5BC)',
          }}
        >
          {loading ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" /> : <Send style={{ width: 18, height: 18 }} />}
        </button>
      </div>
    </div>
  )
}
