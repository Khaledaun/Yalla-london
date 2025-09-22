'use client'

import { useState } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Bot,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Topic {
  id: string
  title: string
  description: string
  category: string
  keywords: string[]
  status: 'draft' | 'approved' | 'in-progress' | 'published'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  aiGenerated: boolean
  seoScore?: number
  targetAudience: string
  estimatedWordCount: number
}

interface Category {
  id: string
  name: string
  description: string
  color: string
  topicCount: number
}

export default function TopicsManagement() {
  const [topics, setTopics] = useState<Topic[]>([
    {
      id: '1',
      title: 'Best Rooftop Bars in London',
      description: 'Discover London\'s most stunning rooftop bars with panoramic city views and exceptional cocktails.',
      category: 'Food & Dining',
      keywords: ['rooftop bars', 'london', 'city views', 'cocktails', 'nightlife'],
      status: 'approved',
      priority: 'high',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      aiGenerated: true,
      seoScore: 89,
      targetAudience: 'adults, tourists, locals',
      estimatedWordCount: 1500
    },
    {
      id: '2',
      title: 'Hidden Food Markets in London',
      description: 'Explore London\'s secret food markets loved by locals, featuring authentic cuisines and unique vendors.',
      category: 'Food & Dining',
      keywords: ['food markets', 'london', 'local food', 'hidden gems', 'street food'],
      status: 'draft',
      priority: 'medium',
      createdAt: '2024-01-14',
      updatedAt: '2024-01-14',
      aiGenerated: true,
      seoScore: 92,
      targetAudience: 'food lovers, locals, tourists',
      estimatedWordCount: 1800
    },
    {
      id: '3',
      title: 'London\'s Best Free Museums',
      description: 'A comprehensive guide to London\'s world-class museums that offer free admission.',
      category: 'Culture & Arts',
      keywords: ['museums', 'london', 'free admission', 'culture', 'art'],
      status: 'in-progress',
      priority: 'high',
      createdAt: '2024-01-13',
      updatedAt: '2024-01-15',
      aiGenerated: false,
      seoScore: 85,
      targetAudience: 'tourists, culture enthusiasts, families',
      estimatedWordCount: 2000
    }
  ])

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Food & Dining', description: 'Restaurants, cafes, food markets, and dining experiences', color: '#EF4444', topicCount: 12 },
    { id: '2', name: 'Culture & Arts', description: 'Museums, galleries, theaters, and cultural attractions', color: '#8B5CF6', topicCount: 8 },
    { id: '3', name: 'Travel & Tourism', description: 'Attractions, tours, and travel tips', color: '#06B6D4', topicCount: 15 },
    { id: '4', name: 'Events & Entertainment', description: 'Concerts, festivals, and entertainment venues', color: '#10B981', topicCount: 6 },
    { id: '5', name: 'Shopping & Lifestyle', description: 'Shopping districts, markets, and lifestyle content', color: '#F59E0B', topicCount: 9 }
  ])

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'approved' | 'in-progress' | 'published'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || topic.status === filterStatus
    const matchesCategory = filterCategory === 'all' || topic.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-500">Draft</Badge>
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'published':
        return <Badge className="bg-purple-500">Published</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>
      case 'low':
        return <Badge className="bg-green-500">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in-progress':
        return <Zap className="h-4 w-4 text-blue-500" />
      case 'published':
        return <Eye className="h-4 w-4 text-purple-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const createNewTopic = async (topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTopic: Topic = {
        ...topicData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
      
      setTopics(prev => [newTopic, ...prev])
      setIsCreatingTopic(false)
      toast.success('Topic created successfully!')
    } catch (error) {
      toast.error('Failed to create topic')
    }
  }

  const updateTopicStatus = async (topicId: string, newStatus: Topic['status']) => {
    try {
      setTopics(prev => prev.map(topic => 
        topic.id === topicId 
          ? { ...topic, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] }
          : topic
      ))
      toast.success('Topic status updated!')
    } catch (error) {
      toast.error('Failed to update topic status')
    }
  }

  const deleteTopic = async (topicId: string) => {
    try {
      setTopics(prev => prev.filter(topic => topic.id !== topicId))
      setSelectedTopic(null)
      toast.success('Topic deleted successfully!')
    } catch (error) {
      toast.error('Failed to delete topic')
    }
  }

  return (
    <PremiumAdminLayout>
      <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="h-8 w-8 text-purple-500" />
                Topics Management
              </h1>
              <p className="text-gray-600 mt-1">Create, manage, and organize your content topics</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCreatingCategory(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </Button>
              <Button
                onClick={() => setIsCreatingTopic(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Topic
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="topics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Topics List */}
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search topics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="in-progress">In Progress</option>
                    <option value="published">Published</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>

                {/* Topics List */}
                <div className="space-y-3">
                  {filteredTopics.map((topic) => (
                    <Card 
                      key={topic.id} 
                      className={`cursor-pointer transition-all ${
                        selectedTopic?.id === topic.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(topic.status)}
                              <h4 className="font-medium text-gray-900">{topic.title}</h4>
                              {getStatusBadge(topic.status)}
                              {getPriorityBadge(topic.priority)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Category: {topic.category}</span>
                              <span>Words: {topic.estimatedWordCount}</span>
                              {topic.seoScore && <span>SEO: {topic.seoScore}/100</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {topic.keywords.slice(0, 3).map((keyword) => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {topic.keywords.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{topic.keywords.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                updateTopicStatus(topic.id, 'approved')
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTopic(topic)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTopic(topic.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Topic Details */}
              <div>
                {selectedTopic ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Topic Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold">{selectedTopic.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(selectedTopic.status)}
                          {getPriorityBadge(selectedTopic.priority)}
                          {selectedTopic.aiGenerated && (
                            <Badge className="bg-blue-500">
                              <Bot className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedTopic.description} readOnly rows={3} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <Input value={selectedTopic.category} readOnly />
                        </div>
                        <div>
                          <Label>Target Audience</Label>
                          <Input value={selectedTopic.targetAudience} readOnly />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Estimated Word Count</Label>
                          <Input value={selectedTopic.estimatedWordCount.toString()} readOnly />
                        </div>
                        <div>
                          <Label>SEO Score</Label>
                          <Input value={selectedTopic.seoScore ? `${selectedTopic.seoScore}/100` : 'Not calculated'} readOnly />
                        </div>
                      </div>

                      <div>
                        <Label>Keywords</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTopic.keywords.map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Created</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedTopic.createdAt}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Last Updated</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedTopic.updatedAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateTopicStatus(selectedTopic.id, 'approved')}
                          className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => updateTopicStatus(selectedTopic.id, 'in-progress')}
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Start Writing
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Topic</h3>
                      <p className="text-gray-600">Choose a topic from the list to view details and manage it</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card key={category.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{category.topicCount} topics</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </PremiumAdminLayout>
  )
}
