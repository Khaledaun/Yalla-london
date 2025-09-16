'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Plus, 
  Edit, 
  Eye, 
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlayCircle,
  ArrowRight,
  BarChart3,
  Globe,
  Users,
  Heart,
  MessageSquare
} from 'lucide-react'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: 'draft' | 'generated' | 'reviewed' | 'ready-to-publish' | 'published' | 'scheduled'
  contentType: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  seoScore: number
  publishedAt?: string
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  tags: string[]
  category: string
  featured: boolean
  viewCount: number
  shareCount: number
  commentCount: number
  language: 'en' | 'ar'
  workflow: {
    currentStep: number
    totalSteps: number
    steps: WorkflowStep[]
  }
  analytics: {
    impressions: number
    clicks: number
    ctr: number
    avgPosition: number
  }
}

interface WorkflowStep {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  assignee?: string
  completedAt?: string
  notes?: string
}

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Best Halal Restaurants in London: A Complete Guide',
    slug: 'best-halal-restaurants-london-guide',
    excerpt: 'Discover London\'s finest halal dining destinations, from traditional Middle Eastern cuisine to contemporary fusion restaurants.',
    content: 'Full article content here...',
    status: 'published',
    contentType: 'restaurant-guide',
    author: {
      id: 'user1',
      name: 'Sarah Ahmed',
      avatar: '/avatars/sarah.jpg'
    },
    seoScore: 87,
    publishedAt: '2024-01-10T10:00:00Z',
    createdAt: '2024-01-08T14:30:00Z',
    updatedAt: '2024-01-10T09:45:00Z',
    tags: ['halal', 'restaurants', 'london', 'dining', 'muslim'],
    category: 'Food & Dining',
    featured: true,
    viewCount: 2547,
    shareCount: 89,
    commentCount: 23,
    language: 'en',
    workflow: {
      currentStep: 6,
      totalSteps: 6,
      steps: [
        { id: 'generate', name: 'Content Generation', status: 'completed', completedAt: '2024-01-08T14:30:00Z' },
        { id: 'review', name: 'Human Review', status: 'completed', assignee: 'Sarah Ahmed', completedAt: '2024-01-08T16:00:00Z' },
        { id: 'seo-audit', name: 'SEO Audit', status: 'completed', completedAt: '2024-01-09T09:00:00Z' },
        { id: 'approve', name: 'Editorial Approval', status: 'completed', assignee: 'Editorial Team', completedAt: '2024-01-09T14:00:00Z' },
        { id: 'schedule', name: 'Publishing Schedule', status: 'completed', completedAt: '2024-01-09T16:00:00Z' },
        { id: 'publish', name: 'Published', status: 'completed', completedAt: '2024-01-10T10:00:00Z' }
      ]
    },
    analytics: {
      impressions: 15430,
      clicks: 2547,
      ctr: 16.5,
      avgPosition: 3.2
    }
  },
  {
    id: '2',
    title: 'London Bridge: Ultimate Visitor Guide 2024',
    slug: 'london-bridge-visitor-guide-2024',
    excerpt: 'Everything you need to know about visiting London Bridge, including top attractions, dining options, and insider tips.',
    content: 'Full article content here...',
    status: 'ready-to-publish',
    contentType: 'travel-guide',
    author: {
      id: 'user2',
      name: 'James Wilson',
      avatar: '/avatars/james.jpg'
    },
    seoScore: 94,
    scheduledAt: '2024-01-15T08:00:00Z',
    createdAt: '2024-01-11T10:00:00Z',
    updatedAt: '2024-01-12T15:30:00Z',
    tags: ['london-bridge', 'attractions', 'tourism', 'guide'],
    category: 'Travel & Tourism',
    featured: false,
    viewCount: 0,
    shareCount: 0,
    commentCount: 0,
    language: 'en',
    workflow: {
      currentStep: 5,
      totalSteps: 6,
      steps: [
        { id: 'generate', name: 'Content Generation', status: 'completed', completedAt: '2024-01-11T10:00:00Z' },
        { id: 'review', name: 'Human Review', status: 'completed', assignee: 'James Wilson', completedAt: '2024-01-11T14:00:00Z' },
        { id: 'seo-audit', name: 'SEO Audit', status: 'completed', completedAt: '2024-01-12T09:00:00Z' },
        { id: 'approve', name: 'Editorial Approval', status: 'completed', assignee: 'Editorial Team', completedAt: '2024-01-12T15:30:00Z' },
        { id: 'schedule', name: 'Publishing Schedule', status: 'completed', completedAt: '2024-01-12T16:00:00Z' },
        { id: 'publish', name: 'Publish', status: 'pending' }
      ]
    },
    analytics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0
    }
  },
  {
    id: '3',
    title: 'East London Food Scene: Hidden Gems and Local Favorites',
    slug: 'east-london-food-scene-hidden-gems',
    excerpt: 'Explore the vibrant culinary landscape of East London, from traditional curry houses to trendy pop-ups.',
    content: 'AI-generated content in progress...',
    status: 'reviewed',
    contentType: 'food-guide',
    author: {
      id: 'user1',
      name: 'Sarah Ahmed',
      avatar: '/avatars/sarah.jpg'
    },
    seoScore: 72,
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    tags: ['east-london', 'food', 'restaurants', 'hidden-gems'],
    category: 'Food & Dining',
    featured: false,
    viewCount: 0,
    shareCount: 0,
    commentCount: 0,
    language: 'en',
    workflow: {
      currentStep: 3,
      totalSteps: 6,
      steps: [
        { id: 'generate', name: 'Content Generation', status: 'completed', completedAt: '2024-01-12T11:00:00Z' },
        { id: 'review', name: 'Human Review', status: 'completed', assignee: 'Sarah Ahmed', completedAt: '2024-01-12T16:45:00Z' },
        { id: 'seo-audit', name: 'SEO Audit', status: 'in-progress' },
        { id: 'approve', name: 'Editorial Approval', status: 'pending' },
        { id: 'schedule', name: 'Publishing Schedule', status: 'pending' },
        { id: 'publish', name: 'Publish', status: 'pending' }
      ]
    },
    analytics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0
    }
  },
  {
    id: '4',
    title: 'Weekend Events in London: January 2024',
    slug: 'weekend-events-london-january-2024',
    excerpt: 'Your complete guide to the best weekend events happening in London this January.',
    content: 'AI content generation in progress...',
    status: 'generated',
    contentType: 'events-guide',
    author: {
      id: 'system',
      name: 'AI Content Generator'
    },
    seoScore: 0,
    createdAt: '2024-01-12T18:00:00Z',
    updatedAt: '2024-01-12T18:00:00Z',
    tags: ['events', 'weekend', 'london', 'january'],
    category: 'Events',
    featured: false,
    viewCount: 0,
    shareCount: 0,
    commentCount: 0,
    language: 'en',
    workflow: {
      currentStep: 1,
      totalSteps: 6,
      steps: [
        { id: 'generate', name: 'Content Generation', status: 'completed', completedAt: '2024-01-12T18:00:00Z' },
        { id: 'review', name: 'Human Review', status: 'pending' },
        { id: 'seo-audit', name: 'SEO Audit', status: 'pending' },
        { id: 'approve', name: 'Editorial Approval', status: 'pending' },
        { id: 'schedule', name: 'Publishing Schedule', status: 'pending' },
        { id: 'publish', name: 'Publish', status: 'pending' }
      ]
    },
    analytics: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      avgPosition: 0
    }
  }
]

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>(mockArticles)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const statusColors = {
    'draft': 'bg-gray-100 text-gray-800',
    'generated': 'bg-blue-100 text-blue-800',
    'reviewed': 'bg-yellow-100 text-yellow-800',
    'ready-to-publish': 'bg-green-100 text-green-800',
    'published': 'bg-emerald-100 text-emerald-800',
    'scheduled': 'bg-purple-100 text-purple-800'
  }

  const statusIcons = {
    'draft': Edit,
    'generated': PlayCircle,
    'reviewed': Eye,
    'ready-to-publish': CheckCircle2,
    'published': Globe,
    'scheduled': Calendar
  }

  const workflowStepColors = {
    'pending': 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-600',
    'completed': 'bg-green-100 text-green-600',
    'skipped': 'bg-yellow-100 text-yellow-600'
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         article.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const categories = Array.from(new Set(articles.map(article => article.category)))

  const handleStatusChange = (articleId: string, newStatus: Article['status']) => {
    setArticles(prev => prev.map(article => 
      article.id === articleId 
        ? { 
            ...article, 
            status: newStatus, 
            updatedAt: new Date().toISOString(),
            publishedAt: newStatus === 'published' ? new Date().toISOString() : article.publishedAt
          }
        : article
    ))
  }

  const moveToNextStep = (articleId: string) => {
    setArticles(prev => prev.map(article => {
      if (article.id === articleId) {
        const nextStep = article.workflow.currentStep + 1
        if (nextStep <= article.workflow.totalSteps) {
          const updatedSteps = article.workflow.steps.map((step, index) => {
            if (index === nextStep - 1) {
              return { ...step, status: 'in-progress' as const }
            }
            if (index === article.workflow.currentStep - 1) {
              return { ...step, status: 'completed' as const, completedAt: new Date().toISOString() }
            }
            return step
          })

          // Update article status based on workflow step
          let newStatus = article.status
          if (nextStep === 2) newStatus = 'reviewed'
          else if (nextStep === 5) newStatus = 'ready-to-publish'
          else if (nextStep === 6) newStatus = 'published'

          return {
            ...article,
            status: newStatus,
            workflow: {
              ...article.workflow,
              currentStep: nextStep,
              steps: updatedSteps
            },
            updatedAt: new Date().toISOString()
          }
        }
      }
      return article
    }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score > 0) return 'text-red-600'
    return 'text-gray-400'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <PremiumAdminLayout 
      title="Articles"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Articles' }
      ]}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Articles</p>
                  <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-green-600">
                    {articles.filter(a => a.status === 'published').length}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Review</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {articles.filter(a => ['generated', 'reviewed'].includes(a.status)).length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(articles.reduce((acc, a) => acc + a.viewCount, 0))}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg SEO Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(
                    Math.round(articles.filter(a => a.seoScore > 0).reduce((acc, a) => acc + a.seoScore, 0) / 
                    articles.filter(a => a.seoScore > 0).length || 0)
                  )}`}>
                    {Math.round(articles.filter(a => a.seoScore > 0).reduce((acc, a) => acc + a.seoScore, 0) / 
                    articles.filter(a => a.seoScore > 0).length || 0)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
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
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="ready-to-publish">Ready to Publish</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Articles Grid/Table */}
        <Card>
          <CardHeader>
            <CardTitle>Articles ({filteredArticles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => {
                  const StatusIcon = statusIcons[article.status]
                  return (
                    <div key={article.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <Badge className={statusColors[article.status]}>
                            {article.status.replace('-', ' ')}
                          </Badge>
                          {article.featured && (
                            <Badge variant="outline" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                        {article.seoScore > 0 && (
                          <div className={`text-sm font-bold ${getScoreColor(article.seoScore)}`}>
                            {article.seoScore}%
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {article.excerpt}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {article.author.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {article.contentType}
                        </div>
                      </div>
                      
                      {/* Workflow Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Workflow Progress</span>
                          <span>{article.workflow.currentStep}/{article.workflow.totalSteps}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(article.workflow.currentStep / article.workflow.totalSteps) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Analytics */}
                      {article.status === 'published' && (
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(article.viewCount)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {article.shareCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {article.commentCount}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        {article.workflow.currentStep < article.workflow.totalSteps && (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => moveToNextStep(article.id)}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Author</th>
                      <th className="text-left p-2">SEO Score</th>
                      <th className="text-left p-2">Views</th>
                      <th className="text-left p-2">Updated</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map((article) => (
                      <tr key={article.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <h3 className="font-medium text-sm">{article.title}</h3>
                            <p className="text-xs text-gray-500">{article.category}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge className={statusColors[article.status]}>
                            {article.status.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{article.author.name}</td>
                        <td className="p-2">
                          {article.seoScore > 0 ? (
                            <span className={`font-bold ${getScoreColor(article.seoScore)}`}>
                              {article.seoScore}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-sm">{formatNumber(article.viewCount)}</td>
                        <td className="p-2 text-sm">
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {article.workflow.currentStep < article.workflow.totalSteps && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => moveToNextStep(article.id)}
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PremiumAdminLayout>
  )
}