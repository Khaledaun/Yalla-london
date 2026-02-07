'use client'

import { useState, useEffect } from 'react'
import { 
  Home, 
  FileText, 
  Lightbulb, 
  Edit3, 
  Search, 
  Settings, 
  Brain, 
  Shield, 
  Flag,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Zap
} from 'lucide-react'

export default function AdminCommandCenter() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    readyToPublish: 0,
    scheduledContent: 0,
    totalArticles: 0,
    totalTopics: 0,
    seoScore: 0,
    automationJobs: 0
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/admin/dashboard')
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard: ${res.status}`)
        }
        const data = await res.json()
        setStats({
          readyToPublish: data.readyToPublish ?? 0,
          scheduledContent: data.scheduledContent ?? 0,
          totalArticles: data.totalArticles ?? 0,
          totalTopics: data.totalTopics ?? 0,
          seoScore: data.seoScore ?? 0,
          automationJobs: data.automationJobs ?? 0
        })
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Command Center...</h2>
          <p className="text-gray-600">Please wait while we fetch your dashboard data.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Dashboard Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      name: 'Create New Article',
      href: '/admin/editor',
      icon: Edit3,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Start writing or paste from Word'
    },
    {
      name: 'Add Topic',
      href: '/admin/topics',
      icon: Lightbulb,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Add new topic to pipeline'
    },
    {
      name: 'AI Studio',
      href: '/admin/ai-studio',
      icon: Brain,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Manage prompts and models'
    },
    {
      name: 'SEO Audit',
      href: '/admin/seo',
      icon: Search,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      description: 'Run SEO analysis'
    }
  ]

  const readyToPublishItems = [
    {
      id: 1,
      title: 'Best Luxury Hotels in Mayfair',
      locale: 'en',
      seoScore: 92,
      scheduledTime: '2024-01-15T10:00:00Z',
      status: 'ready'
    },
    {
      id: 2,
      title: 'أفضل المطاعم العربية في لندن',
      locale: 'ar',
      seoScore: 88,
      scheduledTime: '2024-01-15T14:00:00Z',
      status: 'ready'
    },
    {
      id: 3,
      title: 'London Shopping Guide 2024',
      locale: 'en',
      seoScore: 85,
      scheduledTime: '2024-01-16T09:00:00Z',
      status: 'ready'
    }
  ]

  const upcomingGeneration = [
    {
      id: 1,
      topic: 'Chelsea FC Stadium Tour Guide',
      locale: 'en',
      scheduledTime: '2024-01-15T16:00:00Z',
      prompt: 'Event Guide v2.1',
      model: 'GPT-4'
    },
    {
      id: 2,
      topic: 'دليل التسوق في أكسفورد ستريت',
      locale: 'ar',
      scheduledTime: '2024-01-15T18:00:00Z',
      prompt: 'Shopping Guide v1.8',
      model: 'Claude 3.5'
    },
    {
      id: 3,
      topic: 'Best Afternoon Tea in London',
      locale: 'en',
      scheduledTime: '2024-01-16T11:00:00Z',
      prompt: 'Food Guide v2.0',
      model: 'GPT-4'
    }
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Home className="h-8 w-8 text-purple-500" />
              Command Center
            </h1>
            <p className="text-gray-600 mt-1">Complete control over your website and automation</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <a
              key={action.name}
              href={action.href}
              className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200`}
            >
              <div className="flex items-center gap-3">
                <action.icon className="h-6 w-6" />
                <div>
                  <div className="font-medium">{action.name}</div>
                  <div className="text-sm opacity-90">{action.description}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ready to Publish</p>
              <p className="text-2xl font-bold text-gray-900">{stats.readyToPublish}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled Content</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduledContent}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalArticles}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Topics</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTopics}</p>
            </div>
            <Lightbulb className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average SEO Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.seoScore}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Automation Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.automationJobs}</p>
            </div>
            <Zap className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ready to Publish */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready to Publish
            </h3>
            <p className="text-sm text-gray-600 mt-1">Articles ready for immediate publishing</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {readyToPublishItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${item.locale === 'en' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                        {item.locale.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        SEO: {item.seoScore}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.scheduledTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
                    Publish Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              What's Next
            </h3>
            <p className="text-sm text-gray-600 mt-1">Upcoming content generation events</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {upcomingGeneration.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.topic}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${item.locale === 'en' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                        {item.locale.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {item.prompt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {item.model}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(item.scheduledTime).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.scheduledTime).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}