'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Newspaper, RefreshCw, Loader2, CheckCircle, XCircle,
  Clock, AlertTriangle, Zap, Train, Calendar, Cloud, Heart,
  Music, ShoppingBag, Plane, Sparkles, Globe, ExternalLink,
  Play, Archive, Eye, TrendingUp, Search, Filter,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewsItem {
  id: string
  slug: string
  headline_en: string
  headline_ar: string
  summary_en: string
  source_name: string
  source_url: string
  news_category: string
  is_major: boolean
  urgency: string
  status: string
  tags: string[]
  published_at: string | null
  created_at: string
  expires_at: string | null
  siteId: string | null
}

interface ResearchLog {
  id: string
  run_type: string
  status: string
  items_found: number
  items_published: number
  items_skipped: number
  facts_flagged: number
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

interface NewsStats {
  total: number
  published: number
  draft: number
  archived: number
  expiringSoon: number
  byCategory: Record<string, number>
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

type NewsCategory =
  | 'transport' | 'events' | 'weather' | 'health' | 'festivals'
  | 'sales' | 'holidays' | 'strikes' | 'popup' | 'general'

const CATEGORY_ICON_MAP: Record<NewsCategory, React.ElementType> = {
  transport: Train, events: Calendar, weather: Cloud, health: Heart,
  festivals: Music, sales: ShoppingBag, holidays: Plane,
  strikes: AlertTriangle, popup: Sparkles, general: Globe,
}

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  transport: 'bg-blue-100 text-blue-700',
  events: 'bg-purple-100 text-purple-700',
  weather: 'bg-orange-100 text-orange-700',
  health: 'bg-red-100 text-red-700',
  festivals: 'bg-green-100 text-green-700',
  sales: 'bg-pink-100 text-pink-700',
  holidays: 'bg-teal-100 text-teal-700',
  strikes: 'bg-red-200 text-red-800',
  popup: 'bg-indigo-100 text-indigo-700',
  general: 'bg-gray-100 text-gray-700',
}

function getCategoryIcon(cat: string) {
  return CATEGORY_ICON_MAP[cat as NewsCategory] ?? Globe
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLOR[cat as NewsCategory] ?? 'bg-gray-100 text-gray-700'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminNewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [researchLogs, setResearchLogs] = useState<ResearchLog[]>([])
  const [stats, setStats] = useState<NewsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'items' | 'logs'>('items')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/news')
      if (res.ok) {
        const data = await res.json()
        setNewsItems(data.items ?? [])
        setResearchLogs(data.logs ?? [])
        setStats(data.stats ?? null)
      }
    } catch (err) {
      console.warn('[admin-news] Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Trigger cron
  const triggerCron = async (type: 'daily' | 'weekly_deep') => {
    setTriggering(true)
    setTriggerResult(null)
    try {
      const res = await fetch(`/api/cron/london-news?type=${type}`, { method: 'GET' })
      const data = await res.json()
      setTriggerResult({
        ok: res.ok,
        message: res.ok
          ? `Generated ${data.metrics?.itemsPublished ?? 0} news items`
          : (data.error || 'Failed to trigger'),
      })
      if (res.ok) fetchData()
    } catch {
      setTriggerResult({ ok: false, message: 'Network error' })
    } finally {
      setTriggering(false)
    }
  }

  // Archive item
  const archiveItem = async (id: string) => {
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', id }),
      })
      if (res.ok) fetchData()
    } catch {
      console.warn('[admin-news] Archive failed')
    }
  }

  // Filter items
  const filteredItems = newsItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (categoryFilter !== 'all' && item.news_category !== categoryFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!item.headline_en.toLowerCase().includes(q) && !item.source_name.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Categories present
  const categoriesInUse = Array.from(new Set(newsItems.map((i) => i.news_category)))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ────── Header ────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-blue-600" />
            London News Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated news curation, research logs, and content management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => triggerCron('daily')}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {triggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Generate News
          </button>
          <button
            onClick={() => triggerCron('weekly_deep')}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {triggering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            Deep Research
          </button>
        </div>
      </div>

      {/* Trigger result feedback */}
      {triggerResult && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          triggerResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {triggerResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {triggerResult.message}
        </div>
      )}

      {/* ────── Stats Cards ────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon={Newspaper} color="text-gray-600" />
          <StatCard label="Published" value={stats.published} icon={CheckCircle} color="text-green-600" />
          <StatCard label="Draft" value={stats.draft} icon={Clock} color="text-yellow-600" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} color="text-gray-400" />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={AlertTriangle} color="text-orange-600" />
        </div>
      )}

      {/* Category breakdown */}
      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(stats.byCategory).map(([cat, count]) => {
            const Icon = getCategoryIcon(cat)
            return (
              <span key={cat} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(cat)}`}>
                <Icon className="h-3 w-3" />
                {cat}: {count}
              </span>
            )
          })}
        </div>
      )}

      {/* ────── Tabs ────── */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'items' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          News Items ({newsItems.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Research Logs ({researchLogs.length})
        </button>
      </div>

      {/* ────── News Items Tab ────── */}
      {activeTab === 'items' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search headlines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categoriesInUse.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <Newspaper className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No news items found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting filters or trigger a news generation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(item.news_category)}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {/* Status badge */}
                          <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                            item.status === 'published' ? 'bg-green-100 text-green-700' :
                            item.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {item.status}
                          </span>
                          {/* Urgency */}
                          {(item.urgency === 'breaking' || item.urgency === 'urgent') && (
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                              item.urgency === 'breaking' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              <Zap className="h-2.5 w-2.5" />
                              {item.urgency}
                            </span>
                          )}
                          {item.is_major && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-yellow-100 text-yellow-700">
                              Major
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {timeAgo(item.published_at || item.created_at)}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-0.5">
                          {item.headline_en}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                          {item.summary_en?.slice(0, 120)}...
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            Source: {item.source_name}
                          </span>
                          {item.expires_at && (
                            <span className="text-[10px] text-orange-500">
                              Expires: {new Date(item.expires_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        <a
                          href={`/news/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title="View on site"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 transition-colors"
                            title="View original source"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {item.status === 'published' && (
                          <button
                            onClick={() => archiveItem(item.id)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-orange-600 hover:border-orange-200 transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ────── Research Logs Tab ────── */}
      {activeTab === 'logs' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          ) : researchLogs.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No research logs yet</p>
              <p className="text-xs text-gray-400 mt-1">Logs appear after the news cron runs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {researchLogs.map((log) => (
                <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.status === 'completed' ? 'bg-green-100' :
                      log.status === 'running' ? 'bg-blue-100' :
                      'bg-red-100'
                    }`}>
                      {log.status === 'completed' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                       log.status === 'running' ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> :
                       <XCircle className="h-4 w-4 text-red-600" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 capitalize">
                          {log.run_type.replace('_', ' ')} Run
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded ${
                          log.status === 'completed' ? 'bg-green-100 text-green-700' :
                          log.status === 'running' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(log.created_at)}
                        </span>
                      </div>

                      {/* Metrics row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3 text-gray-400" />
                          Found: {log.items_found}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Published: {log.items_published}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-gray-400" />
                          Skipped: {log.items_skipped}
                        </span>
                        {log.facts_flagged > 0 && (
                          <span className="inline-flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            Facts Flagged: {log.facts_flagged}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatDuration(log.duration_ms)}
                        </span>
                      </div>

                      {log.error_message && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
