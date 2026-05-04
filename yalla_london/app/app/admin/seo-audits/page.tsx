'use client'

import React, { useState, useCallback } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminKPICard,
  AdminSectionLabel,
  AdminAlertBanner,
  AdminTabs,
} from '@/components/admin/admin-ui'
import {
  Search,
  Play,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
  Globe,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  BarChart3,
  Loader2,
} from 'lucide-react'

interface ArticleAudit {
  id: string
  title: string
  slug: string
  url: string
  seoScore: number
  wordCount: number
  hasFeaturedImage: boolean
  hasMetaTitle: boolean
  hasMetaDescription: boolean
  hasArabicContent: boolean
  indexingStatus: string
  lastAudited: string | null
  breakdown: Record<string, number>
  suggestions: string[]
  quickFixes: string[]
  createdAt: string
}

interface AuditSummary {
  total: number
  averageScore: number
  indexed: number
  submitted: number
  neverSubmitted: number
  needsAudit: number
  criticalScore: number
}

export default function SEOAuditsPage() {
  const [articles, setArticles] = useState<ArticleAudit[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ArticleAudit | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false)
  const [auditingId, setAuditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [auditMessage, setAuditMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('suggestions')

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/seo?type=articles')
      if (!res.ok) throw new Error('Failed to load articles')
      const data = await res.json()
      setArticles(data.articles || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const runFullSiteAudit = async () => {
    setIsRunningFullAudit(true)
    setAuditMessage(null)
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_full_audit' }),
      })
      if (!res.ok) { setAuditMessage(`Audit failed (${res.status})`); return }
      const data = await res.json()
      if (data.success) {
        setAuditMessage(`Audited ${data.audited}/${data.total} articles. Average score: ${data.averageScore}%. Took ${Math.round(data.durationMs / 1000)}s.`)
        await loadArticles()
      } else {
        setAuditMessage(`Audit failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setAuditMessage(`Audit error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRunningFullAudit(false)
    }
  }

  const runSingleAudit = async (articleId: string) => {
    setAuditingId(articleId)
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_audit', data: { contentId: articleId } }),
      })
      if (!res.ok) { console.warn(`[seo-audits] Single audit failed (${res.status})`); return }
      const data = await res.json()
      if (data.success) {
        await loadArticles()
        // Update selected article if it was the one audited
        if (selectedArticle?.id === articleId) {
          const updated = articles.find(a => a.id === articleId)
          if (updated) setSelectedArticle(updated)
        }
      }
    } catch (err) {
      console.warn('[seo-audits] Single audit failed:', err)
    } finally {
      setAuditingId(null)
    }
  }

  const applyQuickFix = async (articleId: string, fixType: string) => {
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_quick_fix', data: { articleId, fixType } }),
      })
      if (!res.ok) { console.warn(`[seo-audits] Quick fix failed (${res.status})`); return }
      const data = await res.json()
      if (data.success) {
        // Re-audit after fix
        await runSingleAudit(articleId)
      }
    } catch (err) {
      console.warn('[seo-audits] Quick fix failed:', err)
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.slug.toLowerCase().includes(searchQuery.toLowerCase())
    if (selectedFilter === 'all') return matchesSearch
    if (selectedFilter === 'critical') return matchesSearch && article.seoScore < 50
    if (selectedFilter === 'needs-audit') return matchesSearch && !article.lastAudited
    if (selectedFilter === 'indexed') return matchesSearch && article.indexingStatus === 'indexed'
    if (selectedFilter === 'not-indexed') return matchesSearch && article.indexingStatus !== 'indexed'
    return matchesSearch
  })

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#2D5A3D'
    if (score >= 60) return '#C49A2A'
    return '#C8322B'
  }

  const getIndexingStatus = (status: string): string => {
    switch (status) {
      case 'indexed': return 'indexed'
      case 'submitted': return 'pending'
      case 'error': return 'error'
      case 'not_indexed': return 'warning'
      default: return 'inactive'
    }
  }

  const getIndexingLabel = (status: string): string => {
    switch (status) {
      case 'indexed': return 'Indexed'
      case 'submitted': return 'Submitted'
      case 'error': return 'Error'
      case 'not_indexed': return 'Not Indexed'
      default: return 'Never Submitted'
    }
  }

  const breakdownLabels: Record<string, { label: string; icon: React.ElementType }> = {
    title: { label: 'Title', icon: FileText },
    meta_description: { label: 'Meta Desc', icon: Globe },
    headings: { label: 'Headings', icon: BarChart3 },
    content_quality: { label: 'Content', icon: FileText },
    images: { label: 'Images', icon: ImageIcon },
    internal_links: { label: 'Links', icon: LinkIcon },
  }

  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader title="SEO Audits" subtitle="Search engine optimization reports" />
        <AdminLoadingState label="Loading SEO audits..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader title="SEO Audits" subtitle="Search engine optimization reports" />
        <AdminAlertBanner
          severity="critical"
          message={error}
          action={
            <AdminButton variant="primary" size="sm" onClick={loadArticles}>
              Retry
            </AdminButton>
          }
        />
      </div>
    )
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="SEO Audits"
        subtitle="Search engine optimization reports"
        action={
          <AdminButton
            variant="primary"
            size="md"
            onClick={runFullSiteAudit}
            loading={isRunningFullAudit}
            disabled={isRunningFullAudit}
          >
            <RefreshCw size={13} />
            {isRunningFullAudit ? 'Auditing...' : 'Full Site Audit'}
          </AdminButton>
        }
      />

      {/* Audit Result Message */}
      {auditMessage && (
        <AdminAlertBanner
          severity="info"
          message={auditMessage}
          onDismiss={() => setAuditMessage(null)}
        />
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <AdminKPICard
          value={`${summary?.averageScore || 0}%`}
          label="Avg SEO Score"
          color={getScoreColor(summary?.averageScore || 0)}
        />
        <AdminKPICard
          value={`${summary?.indexed || 0}/${summary?.total || 0}`}
          label="Indexed"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={summary?.criticalScore || 0}
          label="Critical (<50)"
          color="#C8322B"
        />
        <AdminKPICard
          value={summary?.needsAudit || 0}
          label="Needs Audit"
          color="#7C3AED"
        />
      </div>

      {/* Search and Filters */}
      <AdminCard className="mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#A8A29E' }}
              />
              <input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input w-full pl-9"
                style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
              />
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="admin-input"
              style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
            >
              <option value="all">All Articles ({articles.length})</option>
              <option value="critical">Critical Score ({articles.filter(a => a.seoScore < 50).length})</option>
              <option value="needs-audit">Needs Audit ({articles.filter(a => !a.lastAudited).length})</option>
              <option value="indexed">Indexed ({articles.filter(a => a.indexingStatus === 'indexed').length})</option>
              <option value="not-indexed">Not Indexed ({articles.filter(a => a.indexingStatus !== 'indexed').length})</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {articles.length === 0 ? (
        <AdminCard>
          <AdminEmptyState
            icon={FileText}
            title="No Published Articles"
            description="Publish articles through the content pipeline to see them here for SEO auditing."
          />
        </AdminCard>
      ) : (
        /* Main Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Articles List */}
          <div className="lg:col-span-1">
            <AdminCard>
              <div className="p-4 pb-2">
                <AdminSectionLabel>Articles ({filteredArticles.length})</AdminSectionLabel>
              </div>
              <div
                className="divide-y max-h-[600px] overflow-y-auto"
                style={{ borderColor: 'rgba(214,208,196,0.4)' }}
              >
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="p-4 cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: selectedArticle?.id === article.id
                        ? 'rgba(59,126,161,0.06)'
                        : 'transparent',
                      borderLeft: selectedArticle?.id === article.id
                        ? '3px solid #3B7EA1'
                        : '3px solid transparent',
                    }}
                    onClick={() => setSelectedArticle(article)}
                    onMouseEnter={(e) => {
                      if (selectedArticle?.id !== article.id) {
                        e.currentTarget.style.backgroundColor = 'rgba(214,208,196,0.12)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedArticle?.id !== article.id) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 13,
                            color: '#1C1917',
                          }}
                        >
                          {article.title}
                        </p>
                        <p
                          className="truncate mt-1"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          {article.url}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 700,
                              color: getScoreColor(article.seoScore),
                              backgroundColor: `${getScoreColor(article.seoScore)}12`,
                            }}
                          >
                            {article.seoScore}%
                          </span>
                          <AdminStatusBadge
                            status={getIndexingStatus(article.indexingStatus)}
                            label={getIndexingLabel(article.indexingStatus)}
                          />
                        </div>
                        <p
                          className="mt-2"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 10,
                            color: '#A8A29E',
                          }}
                        >
                          {article.wordCount} words · {article.lastAudited ? new Date(article.lastAudited).toLocaleDateString() : 'Never audited'}
                        </p>
                      </div>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          runSingleAudit(article.id)
                        }}
                        disabled={auditingId === article.id}
                      >
                        {auditingId === article.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Play size={14} />
                        )}
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>

          {/* Article Details */}
          <div className="lg:col-span-2">
            {selectedArticle ? (
              <div className="space-y-4">
                {/* Score Overview */}
                <AdminCard elevated>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2
                          className="truncate"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 16,
                            color: '#1C1917',
                          }}
                        >
                          {selectedArticle.title}
                        </h2>
                        <p
                          className="truncate mt-1"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#A8A29E',
                          }}
                        >
                          {selectedArticle.url}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <AdminStatusBadge
                            status={getIndexingStatus(selectedArticle.indexingStatus)}
                            label={getIndexingLabel(selectedArticle.indexingStatus)}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#78716C',
                            }}
                          >
                            {selectedArticle.wordCount} words
                          </span>
                          {!selectedArticle.hasArabicContent && (
                            <AdminStatusBadge status="warning" label="No Arabic" />
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 36,
                            color: getScoreColor(selectedArticle.seoScore),
                            lineHeight: 1,
                          }}
                        >
                          {selectedArticle.seoScore}%
                        </div>
                        {selectedArticle.lastAudited && (
                          <p
                            className="mt-1"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#A8A29E',
                            }}
                          >
                            Audited {new Date(selectedArticle.lastAudited).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {Object.keys(selectedArticle.breakdown).length > 0 && (
                    <div className="px-5 pb-5">
                      <div className="admin-card-inset rounded-xl p-4">
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                          {Object.entries(selectedArticle.breakdown).map(([key, value]) => {
                            const meta = breakdownLabels[key]
                            return (
                              <div key={key} className="text-center">
                                <div
                                  style={{
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 800,
                                    fontSize: 18,
                                    color: getScoreColor(value),
                                  }}
                                >
                                  {value}
                                </div>
                                <div
                                  className="mt-1"
                                  style={{
                                    fontFamily: 'var(--font-system)',
                                    fontSize: 9,
                                    color: '#A8A29E',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  {meta?.label || key}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </AdminCard>

                {/* Tabs */}
                <AdminTabs
                  tabs={[
                    { id: 'suggestions', label: 'Suggestions', count: selectedArticle.suggestions.length },
                    { id: 'quick-fixes', label: 'Quick Fixes', count: selectedArticle.quickFixes.length },
                  ]}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />

                {activeTab === 'suggestions' && (
                  <AdminCard>
                    <div className="p-4 pb-2">
                      <AdminSectionLabel>SEO Improvement Suggestions</AdminSectionLabel>
                    </div>
                    <div className="px-4 pb-4">
                      {selectedArticle.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          {selectedArticle.suggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className="admin-card-inset rounded-xl p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                  style={{
                                    backgroundColor: 'rgba(196,154,42,0.12)',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-system)',
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: '#C49A2A',
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    fontFamily: 'var(--font-system)',
                                    fontSize: 12,
                                    color: '#44403C',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {suggestion}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <AdminEmptyState
                          icon={CheckCircle2}
                          title="No Suggestions"
                          description={
                            selectedArticle.lastAudited
                              ? 'This article is well optimized. Great work!'
                              : 'Run an audit to get improvement suggestions.'
                          }
                        />
                      )}
                    </div>
                  </AdminCard>
                )}

                {activeTab === 'quick-fixes' && (
                  <AdminCard>
                    <div className="p-4 pb-2">
                      <AdminSectionLabel>Quick Fixes</AdminSectionLabel>
                    </div>
                    <div className="px-4 pb-4">
                      {selectedArticle.quickFixes.length > 0 ? (
                        <div className="space-y-2">
                          {selectedArticle.quickFixes.map((fix, idx) => {
                            const fixLabels: Record<string, string> = {
                              missing_meta_title: 'Missing meta title — will copy from article title',
                              missing_meta_description: 'Missing meta description — will use excerpt or title',
                              missing_featured_image: 'Missing featured image — will add placeholder',
                            }
                            return (
                              <div
                                key={idx}
                                className="admin-card-inset rounded-xl p-4 flex items-center justify-between gap-4"
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <AlertTriangle size={16} style={{ color: '#C49A2A', flexShrink: 0, marginTop: 2 }} />
                                  <p
                                    style={{
                                      fontFamily: 'var(--font-system)',
                                      fontSize: 12,
                                      color: '#44403C',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {fixLabels[fix] || fix}
                                  </p>
                                </div>
                                <AdminButton
                                  variant="primary"
                                  size="sm"
                                  onClick={() => applyQuickFix(selectedArticle.id, fix)}
                                >
                                  <Zap size={11} />
                                  Fix
                                </AdminButton>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <AdminEmptyState
                          icon={CheckCircle2}
                          title="No Quick Fixes Needed"
                          description="All basic SEO elements are in place."
                        />
                      )}
                    </div>
                  </AdminCard>
                )}
              </div>
            ) : (
              <AdminCard className="min-h-[400px] flex items-center justify-center">
                <AdminEmptyState
                  icon={Search}
                  title="Select an Article to Audit"
                  description="Choose an article from the list to view its SEO audit results and optimization suggestions."
                />
              </AdminCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
