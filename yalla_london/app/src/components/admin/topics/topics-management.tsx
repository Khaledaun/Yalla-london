'use client'

/**
 * Topics Management Dashboard Component
 * Provides topic research management with inline editing, status management, and generation
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles,
  RefreshCw,
  Eye,
  ArrowUpDown
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface TopicProposal {
  id: string
  locale: string
  primary_keyword: string
  longtails: string[]
  featured_longtails: string[]
  questions: string[]
  authority_links_json: Array<{
    url: string
    title: string
    sourceDomain: string
  }>
  intent: 'info' | 'transactional' | 'event'
  suggested_page_type: 'guide' | 'place' | 'event' | 'list' | 'faq' | 'news' | 'itinerary'
  suggested_window_start?: string
  suggested_window_end?: string
  source_weights_json: any
  status: 'proposed' | 'approved' | 'snoozed' | 'rejected'
  confidence_score?: number
  created_at: string
  updated_at: string
}

const statusConfig = {
  proposed: { label: 'Proposed', color: 'bg-blue-500', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  snoozed: { label: 'Snoozed', color: 'bg-yellow-500', icon: Clock },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle }
}

const pageTypeConfig = {
  guide: { label: 'Guide', color: 'bg-blue-100 text-blue-800' },
  place: { label: 'Place', color: 'bg-green-100 text-green-800' },
  event: { label: 'Event', color: 'bg-purple-100 text-purple-800' },
  list: { label: 'List', color: 'bg-orange-100 text-orange-800' },
  faq: { label: 'FAQ', color: 'bg-cyan-100 text-cyan-800' },
  news: { label: 'News', color: 'bg-red-100 text-red-800' },
  itinerary: { label: 'Itinerary', color: 'bg-indigo-100 text-indigo-800' }
}

export default function TopicsManagement() {
  const [topics, setTopics] = useState<TopicProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filters, setFilters] = useState({
    locale: '',
    status: '',
    page_type: '',
    search: ''
  })
  const [selectedTopic, setSelectedTopic] = useState<TopicProposal | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  // Check feature availability
  const isFeatureEnabled = isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH')

  useEffect(() => {
    if (isFeatureEnabled) {
      fetchTopics()
    }
  }, [filters, pagination.page, isFeatureEnabled])

  const fetchTopics = async () => {
    if (!isFeatureEnabled) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })

      const response = await fetch(`/api/admin/topics?${params}`)
      const result = await response.json()

      if (response.ok) {
        setTopics(result.data)
        setPagination(prev => ({ ...prev, ...result.pagination }))
      } else {
        toast.error(result.error || 'Failed to fetch topics')
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
      toast.error('Failed to fetch topics')
    } finally {
      setLoading(false)
    }
  }

  const generateTopics = async (formData: any) => {
    if (!isFeatureEnabled) return

    setGenerating(true)
    try {
      const response = await fetch('/api/admin/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Generated ${result.data.generated_count} topics successfully`)
        fetchTopics()
        setShowGenerateDialog(false)
      } else {
        toast.error(result.error || 'Failed to generate topics')
      }
    } catch (error) {
      console.error('Error generating topics:', error)
      toast.error('Failed to generate topics')
    } finally {
      setGenerating(false)
    }
  }

  const updateTopicStatus = async (topicId: string, status: string) => {
    if (!isFeatureEnabled) return

    try {
      const response = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Topic status updated successfully')
        fetchTopics()
      } else {
        toast.error(result.error || 'Failed to update topic status')
      }
    } catch (error) {
      console.error('Error updating topic status:', error)
      toast.error('Failed to update topic status')
    }
  }

  const deleteTopic = async (topicId: string) => {
    if (!isFeatureEnabled) return

    if (!confirm('Are you sure you want to delete this topic?')) return

    try {
      const response = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Topic deleted successfully')
        fetchTopics()
      } else {
        toast.error(result.error || 'Failed to delete topic')
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
      toast.error('Failed to delete topic')
    }
  }

  if (!isFeatureEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Topics Research
          </CardTitle>
          <CardDescription>
            AI-powered topic research and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Topics research feature is not enabled
            </div>
            <p className="text-sm text-gray-400">
              Enable FEATURE_TOPICS_RESEARCH in your environment to access this feature
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Topics Research</h1>
          <p className="text-gray-600">AI-powered topic proposals and content planning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTopics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Topics
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Topics</DialogTitle>
                <DialogDescription>
                  Use AI to generate topic proposals based on categories and parameters
                </DialogDescription>
              </DialogHeader>
              <GenerateTopicsForm onSubmit={generateTopics} loading={generating} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search keywords..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="locale">Locale</Label>
              <Select value={filters.locale} onValueChange={(value) => setFilters(prev => ({ ...prev, locale: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All locales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locales</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="snoozed">Snoozed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="page_type">Page Type</Label>
              <Select value={filters.page_type} onValueChange={(value) => setFilters(prev => ({ ...prev, page_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {Object.entries(pageTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topics Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Locale</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading topics...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : topics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No topics found
                    </TableCell>
                  </TableRow>
                ) : (
                  topics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{topic.primary_keyword}</div>
                          <div className="text-sm text-gray-500">
                            {topic.featured_longtails.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={topic.status} 
                          onStatusChange={(status) => updateTopicStatus(topic.id, status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={pageTypeConfig[topic.suggested_page_type]?.color || 'bg-gray-100'}>
                          {pageTypeConfig[topic.suggested_page_type]?.label || topic.suggested_page_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {topic.locale.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {topic.confidence_score ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${topic.confidence_score * 100}%` }}
                              />
                            </div>
                            <span className="text-sm">{Math.round(topic.confidence_score * 100)}%</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(topic.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTopic(topic)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTopic(topic.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} topics
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Topic Detail Dialog */}
      {selectedTopic && (
        <TopicDetailDialog
          topic={selectedTopic}
          open={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onUpdate={fetchTopics}
        />
      )}
    </div>
  )
}

// Status Badge Component with Quick Actions
function StatusBadge({ status, onStatusChange }: { 
  status: string
  onStatusChange: (status: string) => void 
}) {
  const config = statusConfig[status as keyof typeof statusConfig]
  const Icon = config?.icon || Clock

  return (
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger className="w-fit border-none bg-transparent p-0 h-auto">
        <Badge className={`${config?.color || 'bg-gray-500'} text-white`}>
          <Icon className="h-3 w-3 mr-1" />
          {config?.label || status}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, conf]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <conf.icon className="h-4 w-4" />
              {conf.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Generate Topics Form Component
function GenerateTopicsForm({ onSubmit, loading }: {
  onSubmit: (data: any) => void
  loading: boolean
}) {
  const [formData, setFormData] = useState({
    categories: ['london-travel', 'london-events', 'london-food'],
    count: 5,
    locale: 'en',
    priority: 'medium',
    force_generate: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="count">Number of Topics</Label>
        <Input
          id="count"
          type="number"
          min="1"
          max="20"
          value={formData.count}
          onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
        />
      </div>
      
      <div>
        <Label htmlFor="locale">Locale</Label>
        <Select 
          value={formData.locale} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, locale: value }))}
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
        <Label htmlFor="priority">Priority</Label>
        <Select 
          value={formData.priority} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="force_generate"
          checked={formData.force_generate}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, force_generate: checked }))}
        />
        <Label htmlFor="force_generate">Force Generate (bypass existing)</Label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Topics
          </>
        )}
      </Button>
    </form>
  )
}

// Topic Detail Dialog Component
function TopicDetailDialog({ 
  topic, 
  open, 
  onClose, 
  onUpdate 
}: {
  topic: TopicProposal
  open: boolean
  onClose: () => void
  onUpdate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{topic.primary_keyword}</DialogTitle>
          <DialogDescription>
            Topic proposal details and configuration
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="authority">Authority Links</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  <StatusBadge 
                    status={topic.status} 
                    onStatusChange={(status) => {
                      // Handle status update
                      onUpdate()
                    }}
                  />
                </div>
              </div>
              <div>
                <Label>Page Type</Label>
                <div className="mt-1">
                  <Badge className={pageTypeConfig[topic.suggested_page_type]?.color}>
                    {pageTypeConfig[topic.suggested_page_type]?.label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Intent</Label>
                <div className="mt-1 capitalize">{topic.intent}</div>
              </div>
              <div>
                <Label>Confidence Score</Label>
                <div className="mt-1">
                  {topic.confidence_score ? `${Math.round(topic.confidence_score * 100)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="keywords" className="space-y-4">
            <div>
              <Label>Featured Long-tails</Label>
              <div className="mt-2 space-y-1">
                {topic.featured_longtails.map((keyword, index) => (
                  <Badge key={index} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>All Long-tails</Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {topic.longtails.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="authority" className="space-y-4">
            {topic.authority_links_json.map((link, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="font-medium">{link.title}</div>
                <div className="text-sm text-blue-600">{link.url}</div>
                <div className="text-xs text-gray-500">{link.sourceDomain}</div>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="questions" className="space-y-2">
            {topic.questions.map((question, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                {question}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}