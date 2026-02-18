'use client'

import React, { useState, useCallback } from 'react'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 70) return 'text-amber-600 dark:text-amber-400'
    if (score >= 50) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30'
    if (score >= 70) return 'bg-amber-100 dark:bg-amber-900/30'
    if (score >= 50) return 'bg-orange-100 dark:bg-orange-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  const getIndexingBadge = (status: string) => {
    switch (status) {
      case 'indexed':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Indexed</Badge>
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Submitted</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Error</Badge>
      case 'not_indexed':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Not Indexed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Never Submitted</Badge>
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading SEO data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="SEO Audits" description="Analyze and optimize your pages for search engines" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'SEO Audits' }]} />
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={loadArticles} className="mt-4">Retry</Button>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Audits"
        description="Analyze and optimize your pages for search engines"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'SEO Audits' }
        ]}
        actions={
          <Button
            onClick={runFullSiteAudit}
            disabled={isRunningFullAudit}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            {isRunningFullAudit ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Auditing All Pages...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Full Site Audit
              </>
            )}
          </Button>
        }
      />

      {/* Audit Result Message */}
      {auditMessage && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          {auditMessage}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Average SEO Score</p>
                <p className={`text-3xl font-bold mt-1 ${getScoreColor(summary?.averageScore || 0)}`}>
                  {summary?.averageScore || 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Articles Indexed</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary?.indexed || 0}/{summary?.total || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border-red-200 dark:border-red-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Critical Score (&lt;50)</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{summary?.criticalScore || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 border-purple-200 dark:border-purple-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Needs Audit</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {summary?.needsAudit || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Articles ({articles.length})</option>
              <option value="critical">Critical Score ({articles.filter(a => a.seoScore < 50).length})</option>
              <option value="needs-audit">Needs Audit ({articles.filter(a => !a.lastAudited).length})</option>
              <option value="indexed">Indexed ({articles.filter(a => a.indexingStatus === 'indexed').length})</option>
              <option value="not-indexed">Not Indexed ({articles.filter(a => a.indexingStatus !== 'indexed').length})</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Published Articles
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Publish articles through the content pipeline to see them here for SEO auditing.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Main Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Articles List */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" />
                  Articles ({filteredArticles.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        selectedArticle?.id === article.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                          : 'border-l-4 border-l-transparent'
                      }`}
                      onClick={() => setSelectedArticle(article)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {article.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {article.url}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getScoreBgColor(article.seoScore)} ${getScoreColor(article.seoScore)}`}>
                              {article.seoScore}%
                            </span>
                            {getIndexingBadge(article.indexingStatus)}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {article.wordCount} words · {article.lastAudited ? new Date(article.lastAudited).toLocaleDateString() : 'Never audited'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            runSingleAudit(article.id)
                          }}
                          disabled={auditingId === article.id}
                          className="shrink-0"
                        >
                          {auditingId === article.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Article Details */}
          <div className="lg:col-span-2">
            {selectedArticle ? (
              <div className="space-y-6">
                {/* Score Overview */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{selectedArticle.title}</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{selectedArticle.url}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {getIndexingBadge(selectedArticle.indexingStatus)}
                          <span className="text-xs text-gray-500">{selectedArticle.wordCount} words</span>
                          {!selectedArticle.hasArabicContent && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">No Arabic</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-4xl font-bold ${getScoreColor(selectedArticle.seoScore)}`}>
                          {selectedArticle.seoScore}%
                        </div>
                        {selectedArticle.lastAudited && (
                          <p className="text-xs text-gray-500 mt-1">
                            Audited {new Date(selectedArticle.lastAudited).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {Object.keys(selectedArticle.breakdown).length > 0 && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        {Object.entries(selectedArticle.breakdown).map(([key, value]) => {
                          const meta = breakdownLabels[key]
                          return (
                            <div key={key} className="text-center">
                              <div className={`text-xl font-bold ${getScoreColor(value)}`}>
                                {value}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {meta?.label || key}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Tabs defaultValue="suggestions" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <TabsTrigger value="suggestions" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                      Suggestions ({selectedArticle.suggestions.length})
                    </TabsTrigger>
                    <TabsTrigger value="quick-fixes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                      Quick Fixes ({selectedArticle.quickFixes.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="suggestions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <TrendingUp className="h-4 w-4" />
                          SEO Improvement Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedArticle.suggestions.length > 0 ? (
                          <div className="space-y-3">
                            {selectedArticle.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <div className="flex items-start gap-3">
                                  <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{idx + 1}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No Suggestions
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              {selectedArticle.lastAudited
                                ? 'This article is well optimized. Great work!'
                                : 'Run an audit to get improvement suggestions.'}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="quick-fixes" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Zap className="h-4 w-4" />
                          Quick Fixes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedArticle.quickFixes.length > 0 ? (
                          <div className="space-y-3">
                            {selectedArticle.quickFixes.map((fix, idx) => {
                              const fixLabels: Record<string, string> = {
                                missing_meta_title: 'Missing meta title — will copy from article title',
                                missing_meta_description: 'Missing meta description — will use excerpt or title',
                                missing_featured_image: 'Missing featured image — will add placeholder',
                              }
                              return (
                                <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      {fixLabels[fix] || fix}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => applyQuickFix(selectedArticle.id, fix)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shrink-0"
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Fix
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              No Quick Fixes Needed
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                              All basic SEO elements are in place.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select an Article to Audit
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Choose an article from the list to view its SEO audit results and optimization suggestions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
