'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

  const statusColors: Record<string, string> = {
    'planned': 'bg-gray-100 text-gray-800',
    'queued': 'bg-yellow-100 text-yellow-800',
    'generated': 'bg-blue-100 text-blue-800',
    'drafted': 'bg-purple-100 text-purple-800',
    'ready': 'bg-emerald-100 text-emerald-800',
    'published': 'bg-green-100 text-green-800'
  }

  const intentColors: Record<string, string> = {
    'info': 'bg-blue-100 text-blue-800',
    'transactional': 'bg-green-100 text-green-800',
    'navigational': 'bg-purple-100 text-purple-800',
    'commercial': 'bg-amber-100 text-amber-800'
  }

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Topics & Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Manage content topics and publishing pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTopics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreatingTopic(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Topic
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Topics</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : (stats?.totalBacklog || topics.length)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Queued</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {loading ? '...' : (stats?.queued || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? '...' : (stats?.ready || 0)}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {loading ? '...' : (stats?.published || 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Topics Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="drafted">Drafted</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading topics...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && topics.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No topics found</h3>
                <p className="text-gray-500 mt-1">Create a new topic to get started</p>
              </div>
            )}

            {/* Topics Table */}
            {!loading && topics.length > 0 && (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <div key={topic.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                          <Badge className={statusColors[topic.status] || 'bg-gray-100 text-gray-800'}>
                            {topic.status}
                          </Badge>
                          <Badge className={intentColors[topic.intent] || 'bg-gray-100 text-gray-800'}>
                            {topic.intent}
                          </Badge>
                          <Badge variant="outline">{topic.locale.toUpperCase()}</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-600 mb-1">Primary Keyword:</p>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {topic.primary_keyword}
                            </span>
                          </div>

                          <div>
                            <p className="font-medium text-gray-600 mb-1">Featured Long-tails:</p>
                            <div className="space-y-1">
                              {(topic.featured_longtails || []).slice(0, 2).map((longtail, index) => (
                                <p key={index} className="text-gray-700 text-xs">{longtail}</p>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="font-medium text-gray-600 mb-1">Authority Links:</p>
                            <div className="space-y-1">
                              {(topic.authority_links_json || []).slice(0, 2).map((link, index) => (
                                <a key={index} href={link.url} target="_blank" rel="noopener noreferrer"
                                   className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  {link.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>Type: {topic.suggested_page_type}</span>
                          {topic.planned_at && (
                            <span>Planned: {new Date(topic.planned_at).toLocaleDateString()}</span>
                          )}
                          <span>Updated: {new Date(topic.updated_at).toLocaleDateString()}</span>
                          {topic.evergreen && <Badge variant="outline" className="text-xs">Evergreen</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={topic.status}
                          onValueChange={(value) => handleStatusChange(topic.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="queued">Queued</SelectItem>
                            <SelectItem value="generated">Generated</SelectItem>
                            <SelectItem value="drafted">Drafted</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCreateArticleFromTopic(topic)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Create Article
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/admin/editor?title=${encodeURIComponent(topic.title)}&keyword=${encodeURIComponent(topic.primary_keyword || '')}`;
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTopic(topic.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Topic Modal */}
        {isCreatingTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Create New Topic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <Input
                    value={newTopic.title}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter topic title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Primary Keyword *</label>
                  <Input
                    value={newTopic.primary_keyword}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, primary_keyword: e.target.value }))}
                    placeholder="Main keyword for SEO..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Locale *</label>
                    <Select
                      value={newTopic.locale}
                      onValueChange={(value) => setNewTopic(prev => ({ ...prev, locale: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Intent</label>
                    <Select
                      value={newTopic.intent}
                      onValueChange={(value) => setNewTopic(prev => ({ ...prev, intent: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informational</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="navigational">Navigational</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Page Type</label>
                    <Select
                      value={newTopic.suggested_page_type}
                      onValueChange={(value) => setNewTopic(prev => ({ ...prev, suggested_page_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="how-to">How-To</SelectItem>
                        <SelectItem value="comparison">Comparison</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Long-tail Keywords (comma-separated)</label>
                  <Textarea
                    value={newTopic.longtails}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, longtails: e.target.value }))}
                    placeholder="long tail phrase 1, long tail phrase 2..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Featured Long-tails * (exactly 2, comma-separated)</label>
                  <Input
                    value={newTopic.featured_longtails}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, featured_longtails: e.target.value }))}
                    placeholder="featured phrase 1, featured phrase 2"
                  />
                  <p className="text-xs text-gray-500 mt-1">These will be used as H2 headings</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Authority Links * (3-4 URLs, comma-separated)</label>
                  <Textarea
                    value={newTopic.authority_links}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, authority_links: e.target.value }))}
                    placeholder="https://example.com, https://authority.com, https://source.com..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Planned Date (optional)</label>
                  <Input
                    type="date"
                    value={newTopic.planned_at}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, planned_at: e.target.value }))}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingTopic(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTopic}
                    disabled={!newTopic.title || !newTopic.primary_keyword || saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Topic'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}