'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, RefreshCw, FileText, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface AuditReportSummary {
  id: string
  timestamp: string
  overallScore: number
  sectionCount: number
  totalFindings: number
  estimatedCostUsd: number
}

interface AuditFinding {
  severity: string
  title: string
  description: string
  affectedUrls: string[]
  currentState: string
  expectedState: string
  autoFixable: boolean
  fixType: string
  sectionId: string
  sectionTitle: string
}

interface AuditSection {
  id: string
  title: string
  score: number
  findings: AuditFinding[]
  citations: { url: string }[]
}

interface FullReport {
  id: string
  siteId: string
  domain: string
  timestamp: string
  overallScore: number
  sections: AuditSection[]
  executiveSummary: string
  totalTokensUsed: number
  estimatedCostUsd: number
}

export default function SeoAuditPublicPage() {
  const [activeTab, setActiveTab] = useState<'run' | 'report' | 'actions'>('run')
  const [siteId, setSiteId] = useState('yalla-london')
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [isRunning, setIsRunning] = useState(false)
  const [reports, setReports] = useState<AuditReportSummary[]>([])
  const [currentReport, setCurrentReport] = useState<FullReport | null>(null)
  const [currentMarkdown, setCurrentMarkdown] = useState('')
  const [actionItems, setActionItems] = useState<AuditFinding[]>([])
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/seo-audit-public?action=list&siteId=${encodeURIComponent(siteId)}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports || [])
      }
    } catch (e) {
      console.warn('[seo-audit] Failed to fetch reports:', e)
    }
  }, [siteId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const runAudit = async () => {
    setIsRunning(true)
    setError('')
    try {
      const res = await fetch('/api/admin/seo-audit-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_audit', siteId, depth }),
      })
      if (!res.ok) {
        let msg = 'Audit failed'
        try { const d = await res.json(); msg = d.error || msg } catch { /* non-JSON response */ }
        setError(msg)
        return
      }
      const data = await res.json()
      // Load the new report
      await fetchReports()
      if (data.reportId) {
        await loadReport(data.reportId)
        setActiveTab('report')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setIsRunning(false)
    }
  }

  const loadReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/seo-audit-public?action=report&reportId=${encodeURIComponent(reportId)}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentReport(data.report)
        setCurrentMarkdown(data.markdown || '')
        setActionItems(data.actionItems || [])
      }
    } catch (e) {
      console.warn('[seo-audit] Failed to load report:', e)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Public SEO Audit</h1>
          <p className="text-sm text-muted-foreground">Perplexity-powered deep site analysis</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {(['run', 'report', 'actions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === tab
                ? 'bg-white border border-b-white -mb-[1px] text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'run' ? 'Run Audit' : tab === 'report' ? 'Latest Report' : 'Action Items'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tab: Run Audit */}
      {activeTab === 'run' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Audit</CardTitle>
              <CardDescription>Select site and depth for Perplexity-powered SEO analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Site</label>
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yalla-london">Yalla London</SelectItem>
                      <SelectItem value="arabaldives">Arabaldives</SelectItem>
                      <SelectItem value="french-riviera">Yalla Riviera</SelectItem>
                      <SelectItem value="istanbul">Yalla Istanbul</SelectItem>
                      <SelectItem value="thailand">Yalla Thailand</SelectItem>
                      <SelectItem value="zenitha-yachts-med">Zenitha Yachts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Depth</label>
                  <Select value={depth} onValueChange={(v) => setDepth(v as 'quick' | 'standard' | 'deep')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick (5 sections, ~2 min)</SelectItem>
                      <SelectItem value="standard">Standard (10 sections, ~5 min)</SelectItem>
                      <SelectItem value="deep">Deep (10 sections + follow-ups, ~10 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={runAudit}
                disabled={isRunning}
                className="w-full md:w-auto"
              >
                {isRunning ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Running Audit...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" />Run SEO Audit</>
                )}
              </Button>

              {isRunning && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  Audit is running. This may take several minutes as Perplexity researches each section.
                  Do not close this page.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Audits */}
          <Card>
            <CardHeader>
              <CardTitle>Past Audits</CardTitle>
              <CardDescription>Click to view a previous report</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audits run yet for this site.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { loadReport(r.id); setActiveTab('report') }}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {new Date(r.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-lg font-bold ${scoreColor(r.overallScore)}`}>
                          {r.overallScore}/100
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>{r.sectionCount} sections</span>
                        <span>{r.totalFindings} findings</span>
                        <span>${r.estimatedCostUsd.toFixed(4)} cost</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {!currentReport ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No report loaded. Run an audit or select a past report.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Score Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{currentReport.domain}</CardTitle>
                      <CardDescription>
                        {new Date(currentReport.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </CardDescription>
                    </div>
                    <div className={`text-4xl font-bold ${scoreColor(currentReport.overallScore)}`}>
                      {currentReport.overallScore}/100
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{currentReport.executiveSummary}</p>
                </CardContent>
              </Card>

              {/* Section Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentReport.sections.map(section => (
                  <Card key={section.id} className="cursor-pointer" onClick={() => toggleSection(section.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{section.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${scoreColor(section.score)}`}>
                            {section.score}
                          </span>
                          {expandedSections.has(section.id)
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                      </div>
                    </CardHeader>
                    {expandedSections.has(section.id) && (
                      <CardContent className="pt-0">
                        {section.findings.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No issues found.</p>
                        ) : (
                          <div className="space-y-2">
                            {section.findings.map((f, i) => (
                              <div key={i} className={`p-2 rounded border text-xs ${severityColor(f.severity)}`}>
                                <div className="font-medium">{f.severity.toUpperCase()}: {f.title}</div>
                                <div className="mt-1 opacity-80">{f.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.citations.length > 0 && (
                          <div className="mt-3 pt-2 border-t">
                            <p className="text-xs font-medium mb-1">Sources:</p>
                            {section.citations.slice(0, 3).map((c, i) => (
                              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline block truncate">
                                {c.url}
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Cost Info */}
              <div className="text-xs text-muted-foreground text-center">
                Tokens: {currentReport.totalTokensUsed.toLocaleString()} | Cost: ${currentReport.estimatedCostUsd.toFixed(4)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Action Items */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {actionItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <p className="text-muted-foreground">No action items. Run an audit to get recommendations.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
                  const count = actionItems.filter(a => a.severity === sev).length
                  return (
                    <Card key={sev}>
                      <CardContent className="py-3 text-center">
                        <div className={`text-2xl font-bold ${
                          sev === 'critical' ? 'text-red-600' :
                          sev === 'high' ? 'text-orange-600' :
                          sev === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>{count}</div>
                        <div className="text-xs text-muted-foreground capitalize">{sev}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {actionItems.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${severityColor(item.severity)}`}>
                          {item.severity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="text-muted-foreground">{item.sectionTitle}</span>
                            <span className="text-muted-foreground">{item.fixType}</span>
                            {item.autoFixable && (
                              <span className="text-green-600 font-medium">Auto-fixable</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
