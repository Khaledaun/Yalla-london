'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { SyncStatusIndicator } from '@/components/admin/SyncStatusIndicator'
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
  const [articles, setArticles] = useState<BlogPostAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedArticle, setSelectedArticle] = useState<BlogPostAdmin | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

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
        
        const response = await fetch(`/api/admin/content?${cleanParams}`)
        const data = await response.json()
        
        if (data.success) {
          setArticles(data.data)
          // Extract unique categories
          const uniqueCategories = Array.from(new Set(
            data.data.map((article: BlogPostAdmin) => article.category?.name_en).filter(Boolean)
          )) as string[]
          setCategories(uniqueCategories)
        } else {
          throw new Error(data.error || 'Failed to fetch articles')
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
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return
    }
    
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

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      article.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'published' && article.published) ||
      (selectedStatus === 'draft' && !article.published)
    
    const matchesCategory = selectedCategory === 'all' || 
      article.category?.name_en === selectedCategory
    
    return matchesSearch && matchesStatus && matchesCategory
  })

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
            onClick={() => window.location.href = '/admin/articles/new'}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sync Status Indicator */}
        <SyncStatusIndicator />

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
                    {articles.filter(a => a.published).length}
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
                  <p className="text-sm font-medium text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {articles.filter(a => !a.published).length}
                  </p>
                </div>
                <Edit className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {categories.length}
                  </p>
                </div>
                <Tag className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg SEO Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(
                    Math.round(articles.filter(a => a.seo_score > 0).reduce((acc, a) => acc + a.seo_score, 0) / 
                    articles.filter(a => a.seo_score > 0).length || 0)
                  )}`}>
                    {articles.filter(a => a.seo_score > 0).length > 0 ? 
                      Math.round(articles.filter(a => a.seo_score > 0).reduce((acc, a) => acc + a.seo_score, 0) / 
                      articles.filter(a => a.seo_score > 0).length) : 0}%
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
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
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
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-video rounded-t-lg"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-red-800 font-medium">Error Loading Articles</p>
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {articles.length === 0 
                    ? "Get started by creating your first article."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                <Button className="mt-4" onClick={() => {/* TODO: Add create article logic */}}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Article
                </Button>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {article.published ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Edit className="h-4 w-4 text-gray-500" />
                        )}
                        <Badge className={article.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {article.published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      {article.seo_score > 0 && (
                        <div className={`text-sm font-bold ${getScoreColor(article.seo_score)}`}>
                          {article.seo_score}%
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {article.title_en}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {article.excerpt_en}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {article.author.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {article.page_type}
                      </div>
                    </div>
                    
                    {/* Category */}
                    {article.category && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {article.category.name_en}
                        </span>
                      </div>
                    )}
                    
                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{article.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/admin/articles/edit/${article.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {article.published ? 'View' : 'Preview'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={article.published ? "secondary" : "default"}
                        onClick={() => handleTogglePublish(article.id, article.published)}
                        className={article.published ? "bg-orange-100 text-orange-800 hover:bg-orange-200" : "bg-green-600 hover:bg-green-700"}
                      >
                        {article.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteArticle(article.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Author</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">SEO Score</th>
                      <th className="text-left p-2">Updated</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map((article) => (
                      <tr key={article.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <h3 className="font-medium text-sm">{article.title_en}</h3>
                            <p className="text-xs text-gray-500">{article.page_type}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge className={article.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {article.published ? 'Published' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{article.author.name}</td>
                        <td className="p-2 text-sm">
                          {article.category ? article.category.name_en : '-'}
                        </td>
                        <td className="p-2">
                          {article.seo_score > 0 ? (
                            <span className={`font-bold ${getScoreColor(article.seo_score)}`}>
                              {article.seo_score}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(article.updated_at).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {/* TODO: Edit functionality */}}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePublish(article.id, article.published)}
                              className={article.published ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            >
                              {article.published ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteArticle(article.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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