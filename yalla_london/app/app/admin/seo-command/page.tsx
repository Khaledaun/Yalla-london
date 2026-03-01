'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, AlertTriangle, CheckCircle, RefreshCw, Filter,
  Eye, TrendingUp, Globe, Clock, Loader2, XCircle, ExternalLink,
} from 'lucide-react'

interface SeoOverview {
  averageScore: number
  totalArticles: number
  publishedArticles: number
  autoPublishRate: number
  reviewQueue: number
  criticalIssues: number
  scoreRanges: { good: number; fair: number; poor: number; unscored: number }
}

interface QuickFix {
  id: string
  title: string
  slug: string
  issue: string
  severity: 'high' | 'medium' | 'low'
}

interface AuditResult {
  id: string
  content_id: string
  content_type: string
  score: number
  suggestions: string | null
  quick_fixes: string | null
  created_at: string
}

export default function SeoCommandCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'quick-fixes'>('overview')
  const [overview, setOverview] = useState<SeoOverview | null>(null)
  const [quickFixes, setQuickFixes] = useState<QuickFix[]>([])
  const [audits, setAudits] = useState<AuditResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [applying, setApplying] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [overviewRes, fixesRes, auditsRes] = await Promise.all([
        fetch('/api/admin/seo?type=overview').catch(() => null),
        fetch('/api/admin/seo?type=quick-fixes').catch(() => null),
        fetch('/api/admin/seo?type=audits').catch(() => null),
      ])

      if (overviewRes?.ok) {
        const data = await overviewRes.json()
        setOverview(data)
      }
      if (fixesRes?.ok) {
        const data = await fixesRes.json()
        // Transform quick-fix data into display format
        const fixes: QuickFix[] = []
        if (data.missingMetaTitle) {
          data.missingMetaTitle.forEach((p: any) => fixes.push({
            id: p.id, title: p.title_en || p.slug, slug: p.slug,
            issue: 'Missing meta title', severity: 'high'
          }))
        }
        if (data.missingMetaDescription) {
          data.missingMetaDescription.forEach((p: any) => fixes.push({
            id: p.id, title: p.title_en || p.slug, slug: p.slug,
            issue: 'Missing meta description', severity: 'high'
          }))
        }
        if (data.missingImage) {
          data.missingImage.forEach((p: any) => fixes.push({
            id: p.id, title: p.title_en || p.slug, slug: p.slug,
            issue: 'Missing featured image', severity: 'medium'
          }))
        }
        if (data.lowSeoScore) {
          data.lowSeoScore.forEach((p: any) => fixes.push({
            id: p.id, title: p.title_en || p.slug, slug: p.slug,
            issue: `Low SEO score (${p.seo_score || 0})`, severity: 'medium'
          }))
        }
        setQuickFixes(fixes)
      }
      if (auditsRes?.ok) {
        const data = await auditsRes.json()
        setAudits(Array.isArray(data) ? data : data.audits || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleQuickFix = async (fix: QuickFix) => {
    setApplying(fix.id)
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_quick_fix', postId: fix.id, fixType: fix.issue.includes('meta title') ? 'meta_title' : fix.issue.includes('meta description') ? 'meta_description' : 'image' }),
      })
      if (res.ok) {
        await loadData()
      }
    } catch {
      // Silently fail — user will see no change
    } finally {
      setApplying(null)
    }
  }

  const runAudit = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_audit' }),
      })
      await loadData()
    } catch {
      setError('Audit failed')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFixes = quickFixes.filter(f => filter === 'all' || f.severity === filter)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading SEO data...</p>
        </div>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center space-y-3">
          <XCircle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadData} className="text-sm text-blue-600 underline">Retry</button>
        </div>
      </div>
    )
  }

  const score = overview?.averageScore || 0
  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-purple-500" />
            SEO Command Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Real-time SEO health from your database</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAudit}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Audit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500">SEO Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}%</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className={`${scoreBg} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500">Published</p>
          <p className="text-2xl font-bold text-gray-900">{overview?.publishedArticles || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500">Issues</p>
          <p className="text-2xl font-bold text-red-600">{quickFixes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-500">Review Queue</p>
          <p className="text-2xl font-bold text-amber-600">{overview?.reviewQueue || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'issues', label: `Issues (${quickFixes.length})`, icon: AlertTriangle },
          { id: 'quick-fixes', label: `Audits (${audits.length})`, icon: CheckCircle },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Score Distribution</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Good (70+)', value: overview.scoreRanges?.good || 0, color: 'bg-emerald-100 text-emerald-700' },
                { label: 'Fair (40-69)', value: overview.scoreRanges?.fair || 0, color: 'bg-amber-100 text-amber-700' },
                { label: 'Poor (<40)', value: overview.scoreRanges?.poor || 0, color: 'bg-red-100 text-red-700' },
                { label: 'Unscored', value: overview.scoreRanges?.unscored || 0, color: 'bg-gray-100 text-gray-700' },
              ].map((r) => (
                <div key={r.label} className={`rounded-lg p-3 text-center ${r.color}`}>
                  <div className="text-lg font-bold">{r.value}</div>
                  <div className="text-[10px] font-medium">{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {['all', 'high', 'medium', 'low'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  filter === s ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {filteredFixes.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">No SEO issues found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFixes.map((fix) => (
                <div key={`${fix.id}-${fix.issue}`} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getSeverityColor(fix.severity)}`}>
                      {fix.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{fix.title}</div>
                      <div className="text-xs text-gray-500">{fix.issue}</div>
                    </div>
                    <button
                      onClick={() => handleQuickFix(fix)}
                      disabled={applying === fix.id}
                      className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 disabled:opacity-50 flex-shrink-0"
                    >
                      {applying === fix.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Fix'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quick-fixes' && (
        <div className="space-y-2">
          {audits.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No SEO audits yet. Click &quot;Run Audit&quot; to generate one.</p>
            </div>
          ) : (
            audits.map((audit) => (
              <div key={audit.id} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-bold ${
                    audit.score >= 70 ? 'text-emerald-600' : audit.score >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {audit.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{audit.content_type} #{audit.content_id}</div>
                    <div className="text-[10px] text-gray-500">{new Date(audit.created_at).toLocaleString()}</div>
                  </div>
                  {audit.suggestions && (
                    <span className="text-[10px] text-gray-400">Has suggestions</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
