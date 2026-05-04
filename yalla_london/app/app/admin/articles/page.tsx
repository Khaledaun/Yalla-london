'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SyncStatusIndicator } from '@/components/admin/SyncStatusIndicator'
import { RichArticleList } from '@/components/admin/RichArticleList'
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
  useConfirm,
} from '@/components/admin/admin-ui'
import {
  FileText,
  Plus,
  Edit,
  Eye,
  Trash2,
  Search,
  Calendar,
  User,
  Tag,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Globe,
  ClipboardCheck
} from 'lucide-react'

// M-016 fix: removed dead Article/WorkflowStep interfaces (fields don't exist in schema)

interface BlogPostAdmin {
  id: string
  title_en: string
  title_ar: string
  slug: string
  excerpt_en: string
  excerpt_ar: string
  content_en?: string
  content_ar?: string
  published: boolean
  page_type: string
  author: {
    id: string
    name: string
    email: string
    image?: string
  }
  category: {
    id: string
    name_en: string
    name_ar: string
    slug: string
  }
  place?: {
    id: string
    name: string
    slug: string
    category: string
  }
  seo_score: number
  tags: string[]
  featured_image?: string
  meta_title_en?: string
  meta_title_ar?: string
  meta_description_en?: string
  meta_description_ar?: string
  created_at: string
  updated_at: string
}

export default function ArticlesPage() {
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirm()
  const [articles, setArticles] = useState<BlogPostAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedArticle, setSelectedArticle] = useState<BlogPostAdmin | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'pipeline'>('pipeline')
  const [bulkAuditing, setBulkAuditing] = useState(false)
  const [bulkAuditResult, setBulkAuditResult] = useState<{
    averageCompliance: number;
    articlesAudited: number;
    fullComplianceCount: number;
  } | null>(null)

  // Fetch articles from backend
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          limit: '100', // Get all articles for admin view
          status: selectedStatus === 'all' ? '' : selectedStatus,
          category: selectedCategory === 'all' ? '' : selectedCategory,
          search: searchQuery
        })

        // Remove empty parameters
        const cleanParams = new URLSearchParams()
        for (const [key, value] of params.entries()) {
          if (value) cleanParams.set(key, value)
        }

        // C-004 fix: use /api/admin/articles (new, site-scoped API) instead of /api/admin/content
        const response = await fetch(`/api/admin/articles?${cleanParams}&source=published`)

        // Auth failures — show empty list, not an error
        if (response.status === 401 || response.status === 403) {
          setArticles([])
          setLoading(false)
          return
        }

        if (!response.ok) {
          console.warn('[articles] Fetch failed:', response.status)
          setArticles([])
          setLoading(false)
          return
        }

        const data = await response.json().catch(() => null)

        if (data?.success && data.articles) {
          // Map from new API shape to BlogPostAdmin shape for Card/Table views
          const mapped: BlogPostAdmin[] = data.articles.map((a: Record<string, unknown>) => ({
            id: a.id,
            title_en: a.title || '',
            title_ar: a.titleAr || '',
            slug: a.slug || '',
            excerpt_en: (a.metaDescription as string) || '',
            excerpt_ar: '',
            published: a.status === 'published',
            page_type: 'blog',
            author: { id: '', name: (a.author as string) || 'Editorial', email: '' },
            category: a.category ? { id: '', name_en: a.category as string, name_ar: '', slug: '' } : undefined,
            seo_score: (a.seoScore as number) || 0,
            tags: [],
            created_at: a.createdAt as string,
            updated_at: a.updatedAt as string,
          }))
          setArticles(mapped)
          const uniqueCategories = Array.from(new Set(
            mapped.map((article: BlogPostAdmin) => article.category?.name_en).filter(Boolean)
          )) as string[]
          setCategories(uniqueCategories)
        } else {
          console.warn('Articles API error:', data?.error)
          setArticles([])
        }
      } catch (err) {
        console.error('Error fetching articles:', err)
        setError('Failed to load articles. Please try again later.')
        setArticles([])
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [selectedStatus, selectedCategory, searchQuery])

  // Bulk SEO compliance audit
  const handleBulkAudit = async () => {
    setBulkAuditing(true)
    setBulkAuditResult(null)
    const BATCH_SIZE = 10
    let allResults: Array<{ compliancePercent: number }> = []
    let currentOffset = 0
    let totalArticles = 0
    try {
      // Batched audit to avoid Vercel timeouts
      let hasMore = true
      while (hasMore) {
        const res = await fetch('/api/admin/seo/article-compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'audit_all', offset: currentOffset, limit: BATCH_SIZE }),
        })
        const data = await res.json()
        if (!data.success) break
        totalArticles = data.totalArticles || totalArticles
        allResults = [...allResults, ...data.results]
        hasMore = !!data.hasMore
        currentOffset = data.nextOffset ?? totalArticles
      }
      if (allResults.length > 0) {
        const avg = Math.round(allResults.reduce((s, r) => s + r.compliancePercent, 0) / allResults.length)
        const full = allResults.filter(r => r.compliancePercent === 100).length
        setBulkAuditResult({
          averageCompliance: avg,
          articlesAudited: allResults.length,
          fullComplianceCount: full,
        })
      }
    } catch (err) {
      console.error('Bulk audit failed:', err)
    } finally {
      setBulkAuditing(false)
    }
  }

  // Toggle publish status
  const handleTogglePublish = async (articleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: articleId,
          published: !currentStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setArticles(prev => prev.map(article =>
          article.id === articleId
            ? { ...article, published: !currentStatus, updated_at: new Date().toISOString() }
            : article
        ))
      } else {
        throw new Error(data.error || 'Failed to update article')
      }
    } catch (err) {
      console.error('Error updating article:', err)
      alert('Failed to update article status')
    }
  }

  // Delete article
  const handleDeleteArticle = async (articleId: string) => {
    const ok = await confirm({ title: 'Delete Article', message: 'Are you sure you want to delete this article? This action cannot be undone.', variant: 'danger', confirmLabel: 'Delete' })
    if (!ok) return

    try {
      const response = await fetch(`/api/admin/content?id=${articleId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setArticles(prev => prev.filter(article => article.id !== articleId))
      } else {
        throw new Error(data.error || 'Failed to delete article')
      }
    } catch (err) {
      console.error('Error deleting article:', err)
      alert('Failed to delete article')
    }
  }

  // H-010 fix: add null-safety to prevent crashes on missing fields
  const filteredArticles = articles.filter(article => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      (article.title_en || '').toLowerCase().includes(q) ||
      (article.title_ar || '').toLowerCase().includes(q) ||
      (article.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
      (article.author?.name || '').toLowerCase().includes(q)

    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'published' && article.published) ||
      (selectedStatus === 'draft' && !article.published)

    const matchesCategory = selectedCategory === 'all' ||
      article.category?.name_en === selectedCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'score-high'
    if (score >= 60) return 'score-medium'
    if (score > 0) return 'score-low'
    return ''
  }

  const publishedCount = articles.filter(a => a.published).length
  const draftCount = articles.filter(a => !a.published).length
  const avgScore = articles.filter(a => a.seo_score > 0).length > 0
    ? Math.round(articles.filter(a => a.seo_score > 0).reduce((acc, a) => acc + a.seo_score, 0) / articles.filter(a => a.seo_score > 0).length)
    : 0

  // Suppress unused var warning — selectedArticle used for future detail panel
  void selectedArticle

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Articles"
        subtitle={`${articles.length} total · ${publishedCount} published`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={handleBulkAudit}
              loading={bulkAuditing}
            >
              <ClipboardCheck size={13} />
              SEO Audit
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => router.push('/admin/articles/new')}
            >
              <Plus size={14} />
              New Article
            </AdminButton>
          </div>
        }
      />

      {/* Sync Status */}
      <SyncStatusIndicator />

      {/* Bulk Audit Result */}
      {bulkAuditResult && (
        <AdminAlertBanner
          severity={bulkAuditResult.averageCompliance >= 80 ? 'info' : bulkAuditResult.averageCompliance >= 60 ? 'warning' : 'critical'}
          message="SEO Compliance Audit Complete"
          detail={`${bulkAuditResult.articlesAudited} audited · ${bulkAuditResult.fullComplianceCount} at 100% · Average: ${bulkAuditResult.averageCompliance}%`}
          onDismiss={() => setBulkAuditResult(null)}
        />
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <AdminKPICard value={articles.length} label="Total" />
        <AdminKPICard value={publishedCount} label="Published" color="#2D5A3D" />
        <AdminKPICard value={draftCount} label="Drafts" color="#C49A2A" />
        <AdminKPICard value={categories.length} label="Categories" />
        <AdminKPICard
          value={`${avgScore}%`}
          label="Avg SEO"
          color={avgScore >= 80 ? '#2D5A3D' : avgScore >= 60 ? '#C49A2A' : '#C8322B'}
        />
      </div>

      {/* Sticky Filter Bar */}
      <div className="admin-sticky-bar mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            <input
              type="text"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-9"
            />
          </div>

          {/* View Mode Tabs */}
          <AdminTabs
            tabs={[
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'cards', label: 'Cards' },
              { id: 'table', label: 'Table' },
            ]}
            activeTab={viewMode}
            onTabChange={(id) => setViewMode(id as 'pipeline' | 'cards' | 'table')}
          />

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="admin-select"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Articles Content */}
      <AdminCard elevated>
        {loading ? (
          <AdminLoadingState label="Loading articles…" />
        ) : error ? (
          <div className="text-center py-12">
            <AdminAlertBanner
              severity="critical"
              message="Error Loading Articles"
              detail={error}
              action={
                <AdminButton variant="secondary" size="sm" onClick={() => window.location.reload()}>
                  Try Again
                </AdminButton>
              }
            />
          </div>
        ) : filteredArticles.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title="No articles found"
            description={
              articles.length === 0
                ? 'Get started by creating your first article.'
                : 'Try adjusting your search or filter criteria.'
            }
            action={
              <Link href="/admin/editor">
                <AdminButton variant="primary">
                  <Plus size={14} />
                  Create Article
                </AdminButton>
              </Link>
            }
          />
        ) : viewMode === 'pipeline' ? (
          <div className="mt-2">
            <RichArticleList source="all" showHeader={true} siteId={typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)?.[1] ?? undefined : undefined} />
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <div key={article.id} className="admin-card-inset">
                {/* Header: status + score */}
                <div className="flex items-center justify-between mb-3">
                  <AdminStatusBadge status={article.published ? 'published' : 'draft'} />
                  {article.seo_score > 0 && (
                    <span
                      className={`${getScoreClass(article.seo_score)}`}
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}
                    >
                      {article.seo_score}%
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="line-clamp-2 mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917', lineHeight: 1.3 }}
                >
                  {article.title_en}
                </h3>

                {/* Excerpt */}
                <p className="line-clamp-2 mb-3" style={{ fontSize: 12, color: '#78716C' }}>
                  {article.excerpt_en}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-3 mb-3" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                  <span className="flex items-center gap-1"><User size={10} />{article.author.name}</span>
                  <span className="flex items-center gap-1"><Calendar size={10} />{new Date(article.updated_at).toLocaleDateString()}</span>
                </div>

                {/* Category */}
                {article.category && (
                  <span className="admin-filter-pill mb-3 inline-block" style={{ fontSize: 9, padding: '3px 10px' }}>
                    {article.category.name_en}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}>
                  <AdminButton size="sm" variant="secondary" className="flex-1" onClick={() => router.push(`/admin/articles/edit/${article.id}`)}>
                    <Edit size={11} /> Edit
                  </AdminButton>
                  <AdminButton size="sm" variant="secondary" className="flex-1" onClick={() => window.open(`/blog/${article.slug}`, '_blank')}>
                    <Eye size={11} /> {article.published ? 'View' : 'Preview'}
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant={article.published ? 'ghost' : 'success'}
                    onClick={() => handleTogglePublish(article.id, article.published)}
                  >
                    {article.published ? <XCircle size={11} /> : <CheckCircle2 size={11} />}
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost" onClick={() => handleDeleteArticle(article.id)}>
                    <Trash2 size={11} />
                  </AdminButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto -mx-5">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>SEO</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{article.title_en}</p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>{article.page_type}</p>
                      </div>
                    </td>
                    <td>
                      <AdminStatusBadge status={article.published ? 'published' : 'draft'} />
                    </td>
                    <td style={{ fontSize: 12 }}>{article.author.name}</td>
                    <td style={{ fontSize: 12 }}>{article.category ? article.category.name_en : '—'}</td>
                    <td>
                      {article.seo_score > 0 ? (
                        <span className={getScoreClass(article.seo_score)} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
                          {article.seo_score}%
                        </span>
                      ) : (
                        <span style={{ color: '#D6D0C4' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                      {new Date(article.updated_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <AdminButton variant="ghost" size="sm" onClick={() => router.push(`/admin/editor?slug=${article.slug}`)}>
                          <Edit size={12} />
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => window.open(`/blog/${article.slug}`, '_blank')}>
                          <Eye size={12} />
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => router.push(`/admin/articles/${article.slug}/seo-checklist`)}>
                          <ClipboardCheck size={12} />
                        </AdminButton>
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(article.id, article.published)}
                        >
                          {article.published ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                        </AdminButton>
                        <AdminButton variant="ghost" size="sm" onClick={() => handleDeleteArticle(article.id)}>
                          <Trash2 size={12} />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
      <ConfirmDialog />
    </div>
  )
}
