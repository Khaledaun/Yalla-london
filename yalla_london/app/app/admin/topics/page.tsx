'use client'

import { useState, useEffect } from 'react'
import {
  Lightbulb,
  Search,
  Calendar,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

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

export default function TopicsPipeline() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLocale, setFilterLocale] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-100 text-blue-800'
      case 'planned': return 'bg-indigo-100 text-indigo-800'
      case 'ready': return 'bg-yellow-100 text-yellow-800'
      case 'published': return 'bg-green-100 text-green-800'
      case 'generating': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-3 w-3" />
      case 'queued': case 'planned': return <Clock className="h-3 w-3" />
      case 'ready': return <Zap className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.primary_keyword.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLocale = filterLocale === 'all' || topic.locale === filterLocale
    const matchesStatus = filterStatus === 'all' || topic.status === filterStatus
    return matchesSearch && matchesLocale && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-yellow-500" />
              Topics & Pipeline
            </h1>
            <p className="text-gray-600 mt-1">
              {stats ? `${stats.totalBacklog} topics in backlog — ${stats.queued} queued, ${stats.ready} ready` : 'Loading pipeline...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTopics}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-sm">Dismiss</button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {[
            { label: 'Planned', value: stats.planned, color: 'text-indigo-600' },
            { label: 'Queued', value: stats.queued, color: 'text-blue-600' },
            { label: 'Ready', value: stats.ready, color: 'text-yellow-600' },
            { label: 'Published', value: stats.published, color: 'text-green-600' },
            { label: 'EN Backlog', value: stats.enBacklog, color: 'text-blue-600' },
            { label: 'AR Backlog', value: stats.arBacklog, color: 'text-green-600' },
            { label: 'Total', value: stats.totalBacklog, color: 'text-gray-900' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search topics or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Locale</label>
            <select
              value={filterLocale}
              onChange={(e) => setFilterLocale(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">All Locales</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="queued">Queued</option>
              <option value="ready">Ready</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Topics Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Topics ({filteredTopics.length})</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {topics.length === 0 ? 'No topics in the pipeline yet.' : 'No topics match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locale</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTopics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{topic.title}</div>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Keyword:</span> {topic.primary_keyword}
                        </div>
                        {topic.longtails && topic.longtails.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {topic.longtails.slice(0, 2).join(' · ')}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{topic.suggested_page_type || 'guide'}</span>
                          {topic.evergreen && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Evergreen</span>
                          )}
                          {topic.season && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{topic.season}</span>
                          )}
                          {topic.site_id && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{topic.site_id}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        topic.locale === 'en' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {topic.locale.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(topic.status)}`}>
                        {getStatusIcon(topic.status)}
                        {topic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {topic.confidence_score != null ? (
                        <span className={`font-medium ${topic.confidence_score >= 70 ? 'text-green-600' : topic.confidence_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Math.round(topic.confidence_score)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {topic.planned_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(topic.planned_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {topic.status !== 'published' && topic.status !== 'queued' && (
                          <button
                            onClick={() => queueForGeneration(topic.id)}
                            disabled={actionLoading === topic.id}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                            title="Queue for Generation"
                          >
                            {actionLoading === topic.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
