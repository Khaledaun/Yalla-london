'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
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
  Users
} from 'lucide-react'

interface Topic {
  id: string
  title: string
  keywords: string[]
  longtails: string[]
  authorityLinks: string[]
  publishDate: string
  status: 'generated' | 'pending' | 'approved' | 'auto-draft' | 'human-review' | 'seo-audit' | 'ready' | 'scheduled-publish'
  priority: 'low' | 'medium' | 'high'
  contentType: string
  createdAt: string
  updatedAt: string
}

const mockTopics: Topic[] = [
  {
    id: '1',
    title: 'Best Luxury Shopping Districts in London 2024',
    keywords: ['luxury shopping London', 'Mayfair shopping', 'Bond Street'],
    longtails: ['best luxury shopping areas in London', 'where to shop luxury brands London'],
    authorityLinks: ['https://visitlondon.com/shopping', 'https://timeout.com/london/shopping'],
    publishDate: '2024-01-15',
    status: 'approved',
    priority: 'high',
    contentType: 'guide',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: '2',
    title: 'Hidden Halal Restaurants in East London',
    keywords: ['halal restaurants London', 'East London food', 'Muslim dining'],
    longtails: ['best halal restaurants East London', 'authentic halal food London'],
    authorityLinks: ['https://halalguys.com', 'https://zomato.com/london/halal'],
    publishDate: '2024-01-20',
    status: 'pending',
    priority: 'medium',
    contentType: 'food',
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02'
  }
]

export default function TopicsPipelinePage() {
  const [topics, setTopics] = useState<Topic[]>(mockTopics)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)
  const [newTopic, setNewTopic] = useState({
    title: '',
    keywords: '',
    longtails: '',
    authorityLinks: '',
    publishDate: '',
    priority: 'medium',
    contentType: 'guide'
  })

  const statusColors = {
    'generated': 'bg-blue-100 text-blue-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'auto-draft': 'bg-purple-100 text-purple-800',
    'human-review': 'bg-orange-100 text-orange-800',
    'seo-audit': 'bg-indigo-100 text-indigo-800',
    'ready': 'bg-emerald-100 text-emerald-800',
    'scheduled-publish': 'bg-cyan-100 text-cyan-800'
  }

  const priorityColors = {
    'low': 'bg-gray-100 text-gray-800',
    'medium': 'bg-blue-100 text-blue-800',
    'high': 'bg-red-100 text-red-800'
  }

  const filteredTopics = selectedStatus === 'all' 
    ? topics 
    : topics.filter(topic => topic.status === selectedStatus)

  const handleCreateTopic = () => {
    const topic: Topic = {
      id: Date.now().toString(),
      title: newTopic.title,
      keywords: newTopic.keywords.split(',').map(k => k.trim()),
      longtails: newTopic.longtails.split(',').map(k => k.trim()),
      authorityLinks: newTopic.authorityLinks.split(',').map(k => k.trim()),
      publishDate: newTopic.publishDate,
      status: 'pending',
      priority: newTopic.priority as 'low' | 'medium' | 'high',
      contentType: newTopic.contentType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setTopics(prev => [topic, ...prev])
    setNewTopic({
      title: '',
      keywords: '',
      longtails: '',
      authorityLinks: '',
      publishDate: '',
      priority: 'medium',
      contentType: 'guide'
    })
    setIsCreatingTopic(false)
  }

  const handleStatusChange = (topicId: string, newStatus: Topic['status']) => {
    setTopics(prev => prev.map(topic => 
      topic.id === topicId 
        ? { ...topic, status: newStatus, updatedAt: new Date().toISOString() }
        : topic
    ))
  }

  const handleDeleteTopic = (topicId: string) => {
    setTopics(prev => prev.filter(topic => topic.id !== topicId))
  }

  return (
    <PremiumAdminLayout 
      title="Topics & Pipeline"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Topics & Pipeline' }
      ]}
      actions={
        <Button 
          onClick={() => setIsCreatingTopic(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Topic
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Topics</p>
                  <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {topics.filter(t => t.status === 'approved').length}
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
                  <p className="text-sm font-medium text-gray-600">In Review</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {topics.filter(t => t.status === 'pending' || t.status === 'human-review').length}
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
                  <p className="text-sm font-medium text-gray-600">Ready to Publish</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {topics.filter(t => t.status === 'ready' || t.status === 'scheduled-publish').length}
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
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="auto-draft">Auto-Draft</SelectItem>
                  <SelectItem value="human-review">Human Review</SelectItem>
                  <SelectItem value="seo-audit">SEO Audit</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="scheduled-publish">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Topics Table */}
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{topic.title}</h3>
                        <Badge className={statusColors[topic.status]}>
                          {topic.status.replace('-', ' ')}
                        </Badge>
                        <Badge className={priorityColors[topic.priority]}>
                          {topic.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Keywords:</p>
                          <div className="flex flex-wrap gap-1">
                            {topic.keywords.map((keyword, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Long-tail Keywords:</p>
                          <div className="space-y-1">
                            {topic.longtails.slice(0, 2).map((longtail, index) => (
                              <p key={index} className="text-gray-700 text-xs">{longtail}</p>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-600 mb-1">Authority Links:</p>
                          <div className="space-y-1">
                            {topic.authorityLinks.slice(0, 2).map((link, index) => (
                              <a key={index} href={link} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                {new URL(link).hostname}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>Content Type: {topic.contentType}</span>
                        <span>Publish Date: {new Date(topic.publishDate).toLocaleDateString()}</span>
                        <span>Updated: {new Date(topic.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={topic.status}
                        onValueChange={(value) => handleStatusChange(topic.id, value as Topic['status'])}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generated">Generated</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="auto-draft">Auto-Draft</SelectItem>
                          <SelectItem value="human-review">Human Review</SelectItem>
                          <SelectItem value="seo-audit">SEO Audit</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="scheduled-publish">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button variant="ghost" size="sm">
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
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <Input
                    value={newTopic.title}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter topic title..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <Select 
                      value={newTopic.priority} 
                      onValueChange={(value) => setNewTopic(prev => ({ ...prev, priority: value }))}
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
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Content Type</label>
                    <Select 
                      value={newTopic.contentType} 
                      onValueChange={(value) => setNewTopic(prev => ({ ...prev, contentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guide">Guide</SelectItem>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="culture">Culture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
                  <Input
                    value={newTopic.keywords}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Long-tail Keywords (comma-separated)</label>
                  <Textarea
                    value={newTopic.longtails}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, longtails: e.target.value }))}
                    placeholder="long tail phrase 1, long tail phrase 2..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Authority Links (comma-separated)</label>
                  <Textarea
                    value={newTopic.authorityLinks}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, authorityLinks: e.target.value }))}
                    placeholder="https://example.com, https://authority.com..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Publish Date</label>
                  <Input
                    type="date"
                    value={newTopic.publishDate}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, publishDate: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingTopic(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTopic}
                    disabled={!newTopic.title}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Create Topic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PremiumAdminLayout>
  )
}