'use client'

import { useState, useCallback } from 'react'
import {
  Search, Play, Loader2, AlertCircle, CheckCircle, AlertTriangle,
  FileText, Copy, RefreshCw, BarChart3, Shield,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface AuditIssue {
  url: string
  validator: string
  severity: 'P0' | 'P1' | 'P2'
  message: string
  recommendation?: string
}

interface AuditResult {
  runId: string
  siteId: string
  mode: string
  urlsAudited: number
  totalIssues: number
  bySeverity: { P0: number; P1: number; P2: number }
  hardGates: { name: string; passed: boolean }[]
  issues: AuditIssue[]
  execSummary?: string
  fixPlan?: string
  duration: number
  timestamp: string
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AuditContent() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'quick' | 'full'>('quick')
  const [showFixPlan, setShowFixPlan] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const runAudit = useCallback(async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/seo-audit-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', mode }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setRunning(false)
    }
  }, [mode])

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const severityColor = (s: string) => {
    if (s === 'P0') return { bg: 'rgba(200,50,43,0.08)', text: '#C8322B', label: 'Critical' }
    if (s === 'P1') return { bg: 'rgba(217,119,6,0.08)', text: '#D97706', label: 'High' }
    return { bg: 'rgba(120,113,108,0.08)', text: '#78716C', label: 'Medium' }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Run Controls */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Search style={{ width: 16, height: 16, color: '#6366F1' }} />
          <span style={{ fontFamily: "'Anybody', sans-serif", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
            Master SEO Audit
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#78716C', marginBottom: 12, lineHeight: 1.5 }}>
          Runs the full audit engine: crawls published pages, validates HTTP status, canonical tags,
          hreflang, JSON-LD schema, internal links, metadata, and robots directives. Results include
          a fix plan sorted by severity.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode selector */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(120,113,108,0.2)' }}>
            {(['quick', 'full'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-2 transition-all"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: mode === m ? '#FAF8F4' : '#78716C',
                  backgroundColor: mode === m ? '#6366F1' : 'transparent',
                }}
              >
                {m === 'quick' ? 'Quick (50 pages)' : 'Full Audit'}
              </button>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={runAudit}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#FAF8F4',
              backgroundColor: '#6366F1',
              boxShadow: '3px 3px 8px var(--neu-shadow-dark, #CAC5BC)',
              minHeight: 44,
            }}
          >
            {running ? (
              <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Running...</>
            ) : (
              <><Play style={{ width: 14, height: 14 }} /> Run Audit</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(200,50,43,0.06)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#C8322B' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#C8322B' }}>{error}</p>
            <button onClick={runAudit} className="mt-1 text-xs underline" style={{ color: '#C8322B' }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Pages Audited', value: result.urlsAudited, color: '#2563EB' },
              { label: 'Total Issues', value: result.totalIssues, color: result.totalIssues === 0 ? '#16A34A' : '#D97706' },
              { label: 'Critical (P0)', value: result.bySeverity.P0, color: result.bySeverity.P0 > 0 ? '#C8322B' : '#16A34A' },
              { label: 'Duration', value: `${(result.duration / 1000).toFixed(1)}s`, color: '#78716C' },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {card.label}
                </span>
                <div style={{ fontFamily: "'Anybody', sans-serif", fontSize: 24, fontWeight: 800, color: card.color, marginTop: 2 }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Hard Gates */}
          {result.hardGates.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield style={{ width: 14, height: 14, color: '#78716C' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                  Hard Gates
                </span>
              </div>
              <div className="space-y-1.5">
                {result.hardGates.map(gate => (
                  <div key={gate.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: gate.passed ? 'rgba(22,163,74,0.06)' : 'rgba(200,50,43,0.06)' }}>
                    {gate.passed
                      ? <CheckCircle style={{ width: 14, height: 14, color: '#16A34A' }} />
                      : <AlertCircle style={{ width: 14, height: 14, color: '#C8322B' }} />}
                    <span style={{ fontSize: 12, color: gate.passed ? '#16A34A' : '#C8322B' }}>
                      {gate.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue Severity Breakdown */}
          {result.totalIssues > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 style={{ width: 14, height: 14, color: '#78716C' }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                  Issues by Severity
                </span>
              </div>
              <div className="space-y-2">
                {(['P0', 'P1', 'P2'] as const).map(sev => {
                  const count = result.bySeverity[sev]
                  const pct = result.totalIssues > 0 ? Math.round((count / result.totalIssues) * 100) : 0
                  const sc = severityColor(sev)
                  return (
                    <div key={sev} className="flex items-center gap-3">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: sc.text, width: 65 }}>
                        {sc.label} ({count})
                      </span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(120,113,108,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: sc.text }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Issues List */}
          {result.issues.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle style={{ width: 14, height: 14, color: '#D97706' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                    Issues ({result.issues.length})
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {result.issues.slice(0, 50).map((issue, i) => {
                  const sc = severityColor(issue.severity)
                  return (
                    <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: sc.bg }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: sc.text, textTransform: 'uppercase' }}>
                          {issue.severity}
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#78716C' }}>
                          {issue.validator}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#1C1917', lineHeight: 1.4 }}>{issue.message}</p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#78716C', marginTop: 2 }} className="truncate">
                        {issue.url}
                      </p>
                      {issue.recommendation && (
                        <p style={{ fontSize: 11, color: '#44403C', marginTop: 4, fontStyle: 'italic' }}>
                          Fix: {issue.recommendation}
                        </p>
                      )}
                    </div>
                  )
                })}
                {result.issues.length > 50 && (
                  <p style={{ fontSize: 11, color: '#78716C', textAlign: 'center', paddingTop: 8 }}>
                    Showing 50 of {result.issues.length} issues. Download full report for complete list.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fix Plan */}
          {result.fixPlan && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--neu-bg, #EDE9E1)', boxShadow: 'var(--neu-flat)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText style={{ width: 14, height: 14, color: '#6366F1' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#78716C' }}>
                    Fix Plan
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(result.fixPlan || '', 'fixplan')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }}
                  >
                    <Copy style={{ width: 10, height: 10 }} />
                    {copiedField === 'fixplan' ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setShowFixPlan(!showFixPlan)}
                    className="px-2 py-1 rounded-lg"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6366F1' }}
                  >
                    {showFixPlan ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>
              {showFixPlan && (
                <pre className="text-xs overflow-x-auto" style={{ color: '#1C1917', maxHeight: 400, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {result.fixPlan}
                </pre>
              )}
            </div>
          )}

          {/* Executive Summary */}
          {result.execSummary && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6366F1' }}>
                  Executive Summary
                </span>
                <button
                  onClick={() => copyText(result.execSummary || '', 'summary')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ fontSize: 10, color: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }}
                >
                  <Copy style={{ width: 10, height: 10 }} />
                  {copiedField === 'summary' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs overflow-x-auto" style={{ color: '#1C1917', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {result.execSummary}
              </pre>
            </div>
          )}

          {/* No issues */}
          {result.totalIssues === 0 && (
            <div className="text-center py-8">
              <CheckCircle style={{ width: 32, height: 32, color: '#16A34A', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#16A34A' }}>All checks passed</p>
              <p style={{ fontSize: 12, color: '#78716C', marginTop: 4 }}>
                {result.urlsAudited} pages audited with zero issues found.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !running && !error && (
        <div className="text-center py-12">
          <Search style={{ width: 32, height: 32, color: '#A8A29E', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#78716C' }}>
            Run an audit to check SEO health across all published pages.
          </p>
        </div>
      )}
    </div>
  )
}
