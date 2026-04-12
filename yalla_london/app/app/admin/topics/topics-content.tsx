'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Calendar,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { StatusSummary } from '@/components/admin/status-summary'
import { ResponsiveTable, Column } from '@/components/admin/responsive-table'
import { BottomSheet } from '@/components/admin/bottom-sheet'

interface Topic {
  id: string;
  title: string;
  locale: string;
  primary_keyword: string;
  longtails: string[];
  featured_longtails: string[];
  suggested_page_type: string;
  evergreen: boolean;
  season: string | null;
  status: string;
  planned_at: string | null;
  confidence_score: number | null;
  site_id: string | null;
  created_at: string;
}

interface PipelineStats {
  planned: number;
  queued: number;
  ready: number;
  published: number;
  enBacklog: number;
  arBacklog: number;
  totalBacklog: number;
}

export default function TopicsContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocale, setFilterLocale] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetchTopics()
  }, [])

  async function fetchTopics() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/topics')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTopics(data.topics || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics')
    } finally {
      setLoading(false)
    }
  }

  async function queueForGeneration(topicId: string) {
    setActionLoading(topicId)
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue_for_generation',
          data: { topicId, scheduledTime: new Date().toISOString() },
        }),
      })
      if (!res.ok) throw new Error('Failed to queue topic')
      await fetchTopics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Queue failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredTopics = useMemo(() => topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.primary_keyword.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocale = filterLocale === 'all' || topic.locale === filterLocale
    const matchesStatus = filterStatus === 'all' || topic.status === filterStatus
    return matchesSearch && matchesLocale && matchesStatus
  }), [topics, searchTerm, filterLocale, filterStatus])

  const activeFilterCount = (filterLocale !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0)

  // Status Summary cards — Now / Next / Attention
  const statusCards = useMemo(() => {
    if (!stats) return []
    return [
      {
        heading: 'NOW',
        summary: stats.queued > 0
          ? `${stats.queued} topics queued for content generation`
          : 'No topics currently generating',
        metric: stats.queued,
        detail: 'queued for generation',
        accent: stats.queued > 0 ? 'blue' as const : 'neutral' as const,
      },
      {
        heading: 'NEXT',
        summary: stats.ready > 0
          ? `${stats.ready} topics ready to be queued`
          : `${stats.planned} topics planned`,
        metric: stats.ready || stats.planned,
        detail: stats.ready > 0 ? 'ready to queue' : 'planned topics',
        accent: 'green' as const,
      },
      {
        heading: 'BACKLOG',
        summary: `${stats.enBacklog} English, ${stats.arBacklog} Arabic topics waiting`,
        metric: stats.totalBacklog,
        detail: 'total in backlog',
        accent: stats.totalBacklog > 20 ? 'amber' as const : 'neutral' as const,
      },
    ]
  }, [stats])

  // Table columns
  const columns: Column<Topic>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Topic',
      render: (topic) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1C1917', fontSize: 13 }}>{topic.title}</div>
          <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
            {topic.primary_keyword}
          </div>
          {topic.longtails?.length > 0 && (
            <div className="hidden md:block" style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>
              {topic.longtails.slice(0, 2).join(' · ')}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span style={{ fontSize: 10, color: '#78716C' }}>{topic.suggested_page_type || 'guide'}</span>
            {topic.evergreen && (
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, backgroundColor: 'rgba(22,163,74,0.1)', color: '#16A34A' }}>Evergreen</span>
            )}
            {topic.season && (
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 9, backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>{topic.season}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'locale',
      label: 'Locale',
      render: (topic) => (
        <span className="px-2 py-0.5 rounded-full" style={{
          fontSize: 10,
          fontWeight: 600,
          backgroundColor: topic.locale === 'en' ? 'rgba(37,99,235,0.1)' : 'rgba(22,163,74,0.1)',
          color: topic.locale === 'en' ? '#2563EB' : '#16A34A',
        }}>
          {topic.locale.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (topic) => {
        const icons: Record<string, typeof CheckCircle> = { published: CheckCircle, queued: Clock, planned: Clock, ready: Zap }
        const colors: Record<string, string> = { queued: '#2563EB', planned: '#6366F1', ready: '#D97706', published: '#16A34A', generating: '#EA580C' }
        const Icon = icons[topic.status] || AlertCircle
        const color = colors[topic.status] || '#78716C'
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ fontSize: 10, fontWeight: 600, backgroundColor: `${color}15`, color }}>
            <Icon style={{ width: 12, height: 12 }} />
            {topic.status}
          </span>
        )
      },
    },
    {
      key: 'score',
      label: 'Score',
      hideOnMobile: true,
      render: (topic) => topic.confidence_score != null ? (
        <span style={{
          fontWeight: 600,
          fontSize: 12,
          color: topic.confidence_score >= 70 ? '#16A34A' : topic.confidence_score >= 40 ? '#D97706' : '#DC2626',
        }}>
          {Math.round(topic.confidence_score)}%
        </span>
      ) : (
        <span style={{ color: '#A8A29E' }}>—</span>
      ),
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      hideOnMobile: true,
      render: (topic) => topic.planned_at ? (
        <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: '#1C1917' }}>
          <Calendar style={{ width: 12, height: 12, color: '#78716C' }} />
          {new Date(topic.planned_at).toLocaleDateString()}
        </span>
      ) : (
        <span style={{ fontSize: 12, color: '#A8A29E' }}>Not scheduled</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      hideOnMobile: true,
      render: (topic) => (
        topic.status !== 'published' && topic.status !== 'queued' ? (
          <button
            onClick={(e) => { e.stopPropagation(); queueForGeneration(topic.id) }}
            disabled={actionLoading === topic.id}
            className="p-2 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ color: '#D97706', minHeight: 44, minWidth: 44 }}
            title="Queue for Generation"
          >
            {actionLoading === topic.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </button>
        ) : <span />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [actionLoading])

  // Filter controls (shared between inline desktop and mobile bottom sheet)
  const filterControls = (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label style={{
          fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#78716C',
          display: 'block',
          marginBottom: 8,
        }}>
          Locale
        </label>
        <select
          value={filterLocale}
          onChange={(e) => setFilterLocale(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border-none"
          style={{
            backgroundColor: 'rgba(200,50,43,0.04)',
            border: '1px solid rgba(200,50,43,0.12)',
            fontSize: 13,
            color: '#1C1917',
            minHeight: 44,
          }}
        >
          <option value="all">All Locales</option>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </select>
      </div>
      <div>
        <label style={{
          fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#78716C',
          display: 'block',
          marginBottom: 8,
        }}>
          Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border-none"
          style={{
            backgroundColor: 'rgba(200,50,43,0.04)',
            border: '1px solid rgba(200,50,43,0.12)',
            fontSize: 13,
            color: '#1C1917',
            minHeight: 44,
          }}
        >
          <option value="all">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="queued">Queued</option>
          <option value="ready">Ready</option>
          <option value="published">Published</option>
        </select>
      </div>
    </div>
  )

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-3"
             style={{ backgroundColor: 'rgba(200,50,43,0.08)', border: '1px solid rgba(200,50,43,0.2)' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#C8322B', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#C8322B', flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)}
                  style={{ fontSize: 11, color: '#C8322B', fontWeight: 600, minHeight: 44, minWidth: 44 }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Status Summary — Now / Next / Backlog */}
      <StatusSummary cards={statusCards} loading={loading} />

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 16, height: 16, color: '#78716C' }} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-none"
            style={{
              backgroundColor: 'rgba(200,50,43,0.04)',
              border: '1px solid rgba(200,50,43,0.12)',
              fontSize: 13,
              color: '#1C1917',
              minHeight: 44,
            }}
          />
        </div>

        {/* Mobile: filter button */}
        <button
          onClick={() => setFiltersOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all relative"
          style={{
            backgroundColor: '#FAF8F4',
            boxShadow: '0 1px 2px rgba(28,25,23,0.04)',
            border: '1px solid rgba(214,208,196,0.4)',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          <SlidersHorizontal style={{ width: 16, height: 16, color: '#78716C' }} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#C8322B', color: '#FAF8F4', fontSize: 9, fontWeight: 700 }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop: inline filters */}
        <div className="hidden md:flex items-center gap-2">
          <select
            value={filterLocale}
            onChange={(e) => setFilterLocale(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-none"
            style={{
              backgroundColor: 'rgba(200,50,43,0.04)',
              border: '1px solid rgba(200,50,43,0.12)',
              fontSize: 12,
              color: '#1C1917',
              minHeight: 44,
            }}
          >
            <option value="all">All Locales</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border-none"
            style={{
              backgroundColor: 'rgba(200,50,43,0.04)',
              border: '1px solid rgba(200,50,43,0.12)',
              fontSize: 12,
              color: '#1C1917',
              minHeight: 44,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="queued">Queued</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchTopics}
          className="flex items-center justify-center rounded-xl transition-all"
          style={{
            backgroundColor: '#FAF8F4',
            boxShadow: '0 1px 2px rgba(28,25,23,0.04)',
            border: '1px solid rgba(214,208,196,0.4)',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          <RefreshCw style={{ width: 16, height: 16, color: '#78716C' }}
                     className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Mobile filter bottom sheet */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        {filterControls}
        <button
          onClick={() => setFiltersOpen(false)}
          className="w-full mt-4 py-3 rounded-xl transition-all"
          style={{
            fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#FAF8F4',
            backgroundColor: '#C8322B',
            minHeight: 48,
          }}
        >
          Apply Filters ({filteredTopics.length} results)
        </button>
      </BottomSheet>

      {/* Topics count header */}
      <div className="mb-3" style={{
        fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        color: '#78716C',
      }}>
        {filteredTopics.length} topics
      </div>

      {/* Responsive table / cards */}
      <ResponsiveTable<Topic>
        columns={columns}
        data={filteredTopics}
        keyExtractor={(t) => t.id}
        onRowClick={(topic) => {
          if (topic.status !== 'published' && topic.status !== 'queued') {
            queueForGeneration(topic.id)
          }
        }}
        loading={loading}
        loadingRows={5}
        emptyMessage={topics.length === 0 ? 'No topics in the pipeline yet.' : 'No topics match your filters.'}
      />
    </div>
  )
}
