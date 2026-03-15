'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
} from '@/components/admin/admin-ui'
import {
  TrendingUp,
  Plus,
  Calendar,
  Link as LinkIcon,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Brain,
  Users,
  FileText,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface Topic {
  id: string
  title: string
  primary_keyword: string
  longtails: string[]
  featured_longtails: string[]
  authority_links_json: { url: string; title: string }[]
  planned_at: string | null
  status: string
  intent: string
  suggested_page_type: string
  locale: string
  evergreen: boolean
  created_at: string
  updated_at: string
}

interface PipelineStats {
  planned: number
  queued: number
  generated: number
  drafted: number
  ready: number
  published: number
  totalBacklog: number
}

export default function TopicsPipelinePage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)
  const [newTopic, setNewTopic] = useState({
    title: '',
    primary_keyword: '',
    longtails: '',
    featured_longtails: '',
    authority_links: '',
    planned_at: '',
    intent: 'info',
    suggested_page_type: 'guide',
    locale: 'en'
  })

  // Fetch topics from API
  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = selectedStatus === 'all'
        ? '/api/admin/topics'
        : `/api/admin/topics?status=${selectedStatus}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setTopics(data.topics || [])
        setStats(data.stats || null)
      } else {
        setError(data.error || 'Failed to fetch topics')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedStatus])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Create topic via API
  const handleCreateTopic = async () => {
    try {
      setSaving(true)
      setError(null)

      const longtailsArray = newTopic.longtails.split(',').map(k => k.trim()).filter(Boolean)
      const featuredArray = newTopic.featured_longtails.split(',').map(k => k.trim()).filter(Boolean)
      const linksArray = newTopic.authority_links.split(',').map(url => ({
        url: url.trim(),
        title: new URL(url.trim()).hostname
      })).filter(l => l.url)

      const response = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_topic',
          data: {
            title: newTopic.title,
            primary_keyword: newTopic.primary_keyword,
            longtails: longtailsArray,
            featured_longtails: featuredArray.slice(0, 2),
            authority_links_json: linksArray.slice(0, 4),
            planned_at: newTopic.planned_at || null,
            intent: newTopic.intent,
            suggested_page_type: newTopic.suggested_page_type,
            locale: newTopic.locale
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNewTopic({
          title: '',
          primary_keyword: '',
          longtails: '',
          featured_longtails: '',
          authority_links: '',
          planned_at: '',
          intent: 'info',
          suggested_page_type: 'guide',
          locale: 'en'
        })
        setIsCreatingTopic(false)
        fetchTopics()
      } else {
        setError(data.error || 'Failed to create topic')
      }
    } catch (err) {
      setError('Failed to create topic')
      console.error('Create error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Update topic status via API
  const handleStatusChange = async (topicId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_topic',
          data: { id: topicId, status: newStatus }
        })
      })

      if (response.ok) {
        fetchTopics()
      }
    } catch (err) {
      console.error('Update error:', err)
    }
  }

  // Delete topic via API
  const handleDeleteTopic = async (topicId: string) => {
    try {
      const response = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTopics()
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Create article from topic
  const handleCreateArticleFromTopic = (topic: Topic) => {
    const articleData: Record<string, string> = {
      title: topic.title,
      excerpt: `Comprehensive guide to ${topic.title}`,
      tags: topic.primary_keyword,
      category: topic.suggested_page_type,
      seoTitle: topic.title,
      seoDescription: `Discover everything about ${topic.title}. ${topic.primary_keyword}.`,
      content: `# ${topic.title}\n\n## Introduction\n\n${topic.title} is a fascinating topic. This comprehensive guide will help you discover everything you need to know.\n\n## Key Information\n\n${(topic.featured_longtails || []).map(longtail => `### ${longtail}\n\n[Content to be written]\n`).join('\n')}\n\n## Authority Sources\n\n${(topic.authority_links_json || []).map(link => `- [${link.title}](${link.url})`).join('\n')}\n\n*This article was created from topic research and is ready for content development.*`
    }

    const params = new URLSearchParams()
    Object.entries(articleData).forEach(([key, value]) => {
      params.set(key, value)
    })

    window.location.href = `/admin/articles/new?${params.toString()}`
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Topics & Pipeline"
        subtitle="Topic research and management"
        action={
          <div className="flex gap-2">
            <AdminButton variant="secondary" onClick={fetchTopics} disabled={loading} size="sm">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => setIsCreatingTopic(true)}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New Topic
            </AdminButton>
          </div>
        }
      />

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-6">
        {/* Pipeline Overview KPIs */}
        <div>
          <AdminSectionLabel>Pipeline Overview</AdminSectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AdminKPICard
              value={loading ? '...' : (stats?.totalBacklog || topics.length)}
              label="Total Topics"
              color="#3B7EA1"
            />
            <AdminKPICard
              value={loading ? '...' : (stats?.queued || 0)}
              label="Queued"
              color="#C49A2A"
            />
            <AdminKPICard
              value={loading ? '...' : (stats?.ready || 0)}
              label="Ready"
              color="#2D5A3D"
            />
            <AdminKPICard
              value={loading ? '...' : (stats?.published || 0)}
              label="Published"
              color="#7C3AED"
            />
          </div>
        </div>

        {/* Topics Pipeline */}
        <AdminCard>
          <div className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4" style={{ color: '#78716C' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#1C1917' }}>
                Topics Pipeline
              </span>
            </div>

            {/* Filter */}
            <div className="flex gap-3 mb-5">
              <select className="admin-select" style={{ width: 192 }} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">All Topics</option>
                <option value="planned">Planned</option>
                <option value="queued">Queued</option>
                <option value="generated">Generated</option>
                <option value="drafted">Drafted</option>
                <option value="ready">Ready</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Loading State */}
            {loading && (
              <AdminLoadingState label="Loading topics..." />
            )}

            {/* Empty State */}
            {!loading && topics.length === 0 && (
              <AdminEmptyState
                icon={Brain}
                title="No topics found"
                description="Create a new topic to get started"
                action={
                  <AdminButton variant="primary" size="sm" onClick={() => setIsCreatingTopic(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    New Topic
                  </AdminButton>
                }
              />
            )}

            {/* Topics List */}
            {!loading && topics.length > 0 && (
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div key={topic.id} className="admin-card-inset rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                            {topic.title}
                          </span>
                          <AdminStatusBadge status={topic.status} />
                          <AdminStatusBadge
                            status={
                              topic.intent === 'info' ? 'active'
                              : topic.intent === 'transactional' ? 'success'
                              : topic.intent === 'navigational' ? 'generating'
                              : topic.intent === 'commercial' ? 'warning'
                              : 'inactive'
                            }
                            label={topic.intent}
                          />
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#78716C',
                              backgroundColor: 'rgba(120,113,108,0.08)',
                              border: '1px solid rgba(214,208,196,0.5)',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {topic.locale.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                              Primary Keyword
                            </p>
                            <span
                              className="inline-block px-2 py-0.5 rounded"
                              style={{
                                fontFamily: 'var(--font-system)',
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#1e5a7a',
                                backgroundColor: 'rgba(59,126,161,0.08)',
                              }}
                            >
                              {topic.primary_keyword}
                            </span>
                          </div>

                          <div>
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                              Featured Long-tails
                            </p>
                            <div className="space-y-1">
                              {(topic.featured_longtails || []).slice(0, 2).map((longtail, index) => (
                                <p key={index} style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}>{longtail}</p>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                              Authority Links
                            </p>
                            <div className="space-y-1">
                              {(topic.authority_links_json || []).slice(0, 2).map((link, index) => (
                                <a key={index} href={link.url} target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-1 hover:underline"
                                   style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#3B7EA1' }}>
                                  <ExternalLink className="h-3 w-3" />
                                  {link.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            Type: {topic.suggested_page_type}
                          </span>
                          {topic.planned_at && (
                            <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                              Planned: {new Date(topic.planned_at).toLocaleDateString()}
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                            Updated: {new Date(topic.updated_at).toLocaleDateString()}
                          </span>
                          {topic.evergreen && <AdminStatusBadge status="active" label="Evergreen" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select className="admin-select" style={{ width: 128 }} value={topic.status} onChange={(e) => handleStatusChange(topic.id, e.target.value)}>
                          <option value="planned">Planned</option>
                          <option value="queued">Queued</option>
                          <option value="generated">Generated</option>
                          <option value="drafted">Drafted</option>
                          <option value="ready">Ready</option>
                          <option value="published">Published</option>
                        </select>

                        <AdminButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleCreateArticleFromTopic(topic)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Create Article
                        </AdminButton>

                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/admin/editor?title=${encodeURIComponent(topic.title)}&keyword=${encodeURIComponent(topic.primary_keyword || '')}`;
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </AdminButton>

                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTopic(topic.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" style={{ color: '#C8322B' }} />
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* Create Topic Modal */}
        {isCreatingTopic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(28,25,23,0.5)' }}>
            <AdminCard elevated className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Brain className="h-5 w-5" style={{ color: '#3B7EA1' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917' }}>
                    Create New Topic
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Title *
                    </label>
                    <input
                      className="admin-input w-full"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter topic title..."
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Primary Keyword *
                    </label>
                    <input
                      className="admin-input w-full"
                      value={newTopic.primary_keyword}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, primary_keyword: e.target.value }))}
                      placeholder="Main keyword for SEO..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                        Locale *
                      </label>
                      <select className="admin-select" value={newTopic.locale} onChange={(e) => setNewTopic(prev => ({ ...prev, locale: e.target.value }))}>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                        Intent
                      </label>
                      <select className="admin-select" value={newTopic.intent} onChange={(e) => setNewTopic(prev => ({ ...prev, intent: e.target.value }))}>
                        <option value="info">Informational</option>
                        <option value="transactional">Transactional</option>
                        <option value="navigational">Navigational</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                        Page Type
                      </label>
                      <select className="admin-select" value={newTopic.suggested_page_type} onChange={(e) => setNewTopic(prev => ({ ...prev, suggested_page_type: e.target.value }))}>
                        <option value="guide">Guide</option>
                        <option value="list">List</option>
                        <option value="review">Review</option>
                        <option value="how-to">How-To</option>
                        <option value="comparison">Comparison</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Long-tail Keywords (comma-separated)
                    </label>
                    <textarea
                      className="admin-input w-full"
                      value={newTopic.longtails}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, longtails: e.target.value }))}
                      placeholder="long tail phrase 1, long tail phrase 2..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Featured Long-tails * (exactly 2, comma-separated)
                    </label>
                    <input
                      className="admin-input w-full"
                      value={newTopic.featured_longtails}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, featured_longtails: e.target.value }))}
                      placeholder="featured phrase 1, featured phrase 2"
                    />
                    <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', marginTop: 4 }}>
                      These will be used as H2 headings
                    </p>
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Authority Links * (3-4 URLs, comma-separated)
                    </label>
                    <textarea
                      className="admin-input w-full"
                      value={newTopic.authority_links}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, authority_links: e.target.value }))}
                      placeholder="https://example.com, https://authority.com, https://source.com..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }} className="block mb-2">
                      Planned Date (optional)
                    </label>
                    <input
                      type="date"
                      className="admin-input w-full"
                      value={newTopic.planned_at}
                      onChange={(e) => setNewTopic(prev => ({ ...prev, planned_at: e.target.value }))}
                    />
                  </div>

                  {error && (
                    <AdminAlertBanner
                      severity="critical"
                      message={error}
                    />
                  )}

                  <div className="admin-section-divider" />

                  <div className="flex justify-end gap-2">
                    <AdminButton
                      variant="secondary"
                      onClick={() => setIsCreatingTopic(false)}
                      disabled={saving}
                    >
                      Cancel
                    </AdminButton>
                    <AdminButton
                      variant="primary"
                      onClick={handleCreateTopic}
                      disabled={!newTopic.title || !newTopic.primary_keyword || saving}
                      loading={saving}
                    >
                      {saving ? 'Creating...' : 'Create Topic'}
                    </AdminButton>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  )
}
