'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity,
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Send,
  Eye,
  Users,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Play,
  Pause,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Globe,
  Languages,
  Star,
  ThumbsUp,
  MessageSquare,
  Share2,
  Download
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WorkflowStage {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  completedAt?: Date
  duration?: number
  details?: string
  assignee?: string
}

interface ContentItem {
  id: string
  title: string
  type: 'article' | 'media' | 'page'
  language: 'en' | 'ar'
  status: 'draft' | 'in-review' | 'approved' | 'published' | 'scheduled'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  scheduledFor?: Date
  author: string
  reviewer?: string
  workflow: WorkflowStage[]
  metrics?: {
    views?: number
    engagement?: number
    conversionRate?: number
    seoScore?: number
  }
  tags: string[]
  category: string
}

interface PipelineMetrics {
  totalItems: number
  published: number
  inReview: number
  drafts: number
  scheduled: number
  averageProcessingTime: number
  successRate: number
  topPerformingContent: ContentItem[]
}

export function ContentPipelinePanel() {
  const { toast } = useToast()
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    {
      id: '1',
      title: 'Best Hidden Gems in London 2024',
      type: 'article',
      language: 'en',
      status: 'in-review',
      priority: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
      author: 'AI Content Generator',
      reviewer: 'John Doe',
      category: 'attractions',
      tags: ['london', 'hidden gems', 'travel'],
      workflow: [
        {
          id: 'research',
          name: 'Topic Research',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          duration: 120,
          details: 'AI research completed with 95% relevance score'
        },
        {
          id: 'content-generation',
          name: 'Content Generation',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
          duration: 300,
          details: '2,500 words generated in English'
        },
        {
          id: 'media-selection',
          name: 'Media Selection',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60),
          duration: 60,
          details: '5 high-quality images selected from media library'
        },
        {
          id: 'review',
          name: 'Editorial Review',
          status: 'in-progress',
          assignee: 'John Doe',
          details: 'Content quality review in progress'
        },
        {
          id: 'publish',
          name: 'Publish',
          status: 'pending'
        }
      ]
    },
    {
      id: '2',
      title: 'دليل أسواق لندن الكامل',
      type: 'article',
      language: 'ar',
      status: 'approved',
      priority: 'medium',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15),
      author: 'AI Content Generator',
      reviewer: 'Ahmad Hassan',
      category: 'food',
      tags: ['أسواق', 'طعام', 'لندن'],
      workflow: [
        {
          id: 'research',
          name: 'Topic Research',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
          duration: 150
        },
        {
          id: 'content-generation',
          name: 'Content Generation',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
          duration: 420
        },
        {
          id: 'media-selection',
          name: 'Media Selection',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          duration: 90
        },
        {
          id: 'review',
          name: 'Editorial Review',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 15),
          duration: 1800
        },
        {
          id: 'publish',
          name: 'Publish',
          status: 'pending'
        }
      ]
    },
    {
      id: '3',
      title: 'London Bridge Hero Image',
      type: 'media',
      language: 'en',
      status: 'published',
      priority: 'high',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      author: 'Media Team',
      category: 'hero-images',
      tags: ['hero', 'london', 'bridge'],
      workflow: [
        {
          id: 'upload',
          name: 'Media Upload',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          duration: 30
        },
        {
          id: 'optimization',
          name: 'Image Optimization',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
          duration: 60
        },
        {
          id: 'set-hero',
          name: 'Set as Hero Image',
          status: 'completed',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
          duration: 5
        }
      ],
      metrics: {
        views: 15420,
        engagement: 85,
        conversionRate: 12.3
      }
    }
  ])

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedView, setSelectedView] = useState<'pipeline' | 'metrics' | 'performance'>('pipeline')

  const metrics: PipelineMetrics = {
    totalItems: contentItems.length,
    published: contentItems.filter(item => item.status === 'published').length,
    inReview: contentItems.filter(item => item.status === 'in-review').length,
    drafts: contentItems.filter(item => item.status === 'draft').length,
    scheduled: contentItems.filter(item => item.status === 'scheduled').length,
    averageProcessingTime: 4.2, // hours
    successRate: 94.5,
    topPerformingContent: contentItems.filter(item => item.metrics?.views).slice(0, 3)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'in-review': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkflowProgress = (workflow: WorkflowStage[]) => {
    const completed = workflow.filter(stage => stage.status === 'completed').length
    return (completed / workflow.length) * 100
  }

  const getCurrentStage = (workflow: WorkflowStage[]) => {
    return workflow.find(stage => stage.status === 'in-progress') || 
           workflow.find(stage => stage.status === 'pending')
  }

  const executeAction = async (itemId: string, action: string) => {
    const item = contentItems.find(i => i.id === itemId)
    if (!item) return

    switch (action) {
      case 'approve':
        setContentItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, status: 'approved' as const } : i
        ))
        toast({
          title: "Content Approved",
          description: `"${item.title}" has been approved for publication.`,
        })
        break
      
      case 'publish':
        setContentItems(prev => prev.map(i => 
          i.id === itemId ? { 
            ...i, 
            status: 'published' as const,
            publishedAt: new Date(),
            workflow: i.workflow.map(stage => 
              stage.id === 'publish' ? { ...stage, status: 'completed' as const, completedAt: new Date() } : stage
            )
          } : i
        ))
        toast({
          title: "Content Published",
          description: `"${item.title}" has been published successfully.`,
        })
        break
      
      case 'reject':
        setContentItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, status: 'draft' as const } : i
        ))
        toast({
          title: "Content Rejected",
          description: `"${item.title}" has been sent back for revision.`,
        })
        break
    }
  }

  const filteredItems = contentItems.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus
    const typeMatch = filterType === 'all' || item.type === filterType
    return statusMatch && typeMatch
  })

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalItems}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">{metrics.published}</p>
              </div>
              <Send className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">In Review</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.inReview}</p>
              </div>
              <Eye className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="in-review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="article">Articles</option>
              <option value="media">Media</option>
              <option value="page">Pages</option>
            </select>

            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="pipeline" className="space-y-4">
          {filteredItems.map(item => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-lg">{item.title}</h3>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('-', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline">
                          {item.language === 'en' ? '🇬🇧 English' : '🇸🇦 العربية'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{item.author}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.updatedAt.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{item.type}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.status === 'in-review' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => executeAction(item.id, 'reject')}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => executeAction(item.id, 'approve')}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      
                      {item.status === 'approved' && (
                        <Button 
                          size="sm"
                          onClick={() => executeAction(item.id, 'publish')}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Workflow Progress</span>
                      <span>{Math.round(getWorkflowProgress(item.workflow))}% Complete</span>
                    </div>
                    <Progress value={getWorkflowProgress(item.workflow)} className="h-2" />
                  </div>

                  {/* Workflow Stages */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {item.workflow.map((stage, index) => (
                      <div key={stage.id} className="flex items-center space-x-3">
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                          ${stage.status === 'completed' ? 'bg-green-100 text-green-800' :
                            stage.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            stage.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {stage.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : stage.status === 'in-progress' ? (
                            <Play className="h-4 w-4" />
                          ) : stage.status === 'failed' ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                          {stage.details && (
                            <p className="text-xs text-gray-500 truncate">{stage.details}</p>
                          )}
                          {stage.assignee && (
                            <p className="text-xs text-blue-600">Assigned: {stage.assignee}</p>
                          )}
                          {stage.completedAt && stage.duration && (
                            <p className="text-xs text-gray-500">
                              {Math.round(stage.duration / 60)}m {stage.duration % 60}s
                            </p>
                          )}
                        </div>

                        {index < item.workflow.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400 hidden md:block" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Current Stage Details */}
                  {(() => {
                    const currentStage = getCurrentStage(item.workflow)
                    if (currentStage) {
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-900">
                              Current Stage: {currentStage.name}
                            </span>
                          </div>
                          {currentStage.assignee && (
                            <p className="text-sm text-blue-700 mt-1">
                              Assigned to: {currentStage.assignee}
                            </p>
                          )}
                          {currentStage.details && (
                            <p className="text-sm text-blue-600 mt-1">
                              {currentStage.details}
                            </p>
                          )}
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No content items</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No content matches your current filters.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Average Processing Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{metrics.averageProcessingTime}h</span>
                    <Badge className="bg-green-100 text-green-800">
                      ↓ 15% from last month
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Topic Research</span>
                      <span className="text-sm font-medium">2.5h avg</span>
                    </div>
                    <Progress value={25} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Content Generation</span>
                      <span className="text-sm font-medium">5.2h avg</span>
                    </div>
                    <Progress value={52} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Editorial Review</span>
                      <span className="text-sm font-medium">3.1h avg</span>
                    </div>
                    <Progress value={31} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Publishing</span>
                      <span className="text-sm font-medium">0.1h avg</span>
                    </div>
                    <Progress value={1} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Content Quality</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">94.5%</p>
                      <p className="text-sm text-gray-500">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">8.7/10</p>
                      <p className="text-sm text-gray-500">Avg Quality Score</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SEO Optimization</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Readability</span>
                      <span className="text-sm font-medium">89%</span>
                    </div>
                    <Progress value={89} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fact Accuracy</span>
                      <span className="text-sm font-medium">96%</span>
                    </div>
                    <Progress value={96} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Engagement Potential</span>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Language Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Languages className="h-5 w-5" />
                <span>Content by Language</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>🇬🇧</span>
                      <span>English</span>
                    </div>
                    <span className="font-medium">65%</span>
                  </div>
                  <Progress value={65} className="h-3" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>🇸🇦</span>
                      <span>Arabic</span>
                    </div>
                    <span className="font-medium">35%</span>
                  </div>
                  <Progress value={35} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Top Performing Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Top Performing Content</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topPerformingContent.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{item.metrics?.views?.toLocaleString()} views</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{item.metrics?.engagement}% engagement</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Target className="h-3 w-3" />
                          <span>{item.metrics?.conversionRate}% conversion</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Traffic Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">+23%</p>
                  <p className="text-sm text-gray-500">vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">8.4%</p>
                  <p className="text-sm text-gray-500">avg engagement</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">12.1%</p>
                  <p className="text-sm text-gray-500">content to action</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}