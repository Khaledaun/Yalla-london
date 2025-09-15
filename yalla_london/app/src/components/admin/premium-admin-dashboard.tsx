'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Globe,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Plus,
  RefreshCw
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface DashboardMetric {
  label: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<any>
  href?: string
}

interface RecentActivity {
  id: string
  type: 'article' | 'user' | 'system' | 'content'
  title: string
  description: string
  timestamp: Date
  user?: string
  status?: 'success' | 'warning' | 'error'
}

interface ContentItem {
  id: string
  title: string
  type: string
  status: 'draft' | 'published' | 'review' | 'scheduled'
  author: string
  updatedAt: Date
  views?: number
}

export default function PremiumAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [quickStats, setQuickStats] = useState({
    totalPageViews: 0,
    totalUsers: 0,
    contentCount: 0,
    conversionRate: 0
  })

  // Check feature flags
  const dashboardEnabled = isPremiumFeatureEnabled('ADMIN_DASHBOARD')
  const stateTransparency = isPremiumFeatureEnabled('STATE_TRANSPARENCY')

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      // Mock data - in real implementation, this would fetch from APIs
      const mockMetrics: DashboardMetric[] = [
        {
          label: 'Page Views',
          value: '24,832',
          change: 12.5,
          changeType: 'increase',
          icon: Eye,
          href: '/admin/integrations/analytics'
        },
        {
          label: 'Active Users',
          value: '1,423',
          change: 8.2,
          changeType: 'increase',
          icon: Users,
          href: '/admin/people/members'
        },
        {
          label: 'Published Articles',
          value: 186,
          change: 5.1,
          changeType: 'increase',
          icon: FileText,
          href: '/admin/content/articles'
        },
        {
          label: 'Conversion Rate',
          value: '3.24%',
          change: -2.1,
          changeType: 'decrease',
          icon: TrendingUp,
          href: '/admin/integrations/analytics'
        }
      ]

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'article',
          title: 'New article published',
          description: '"Best London Restaurants 2024" by John Doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          user: 'John Doe',
          status: 'success'
        },
        {
          id: '2',
          type: 'user',
          title: 'New user registered',
          description: 'sarah@example.com joined the platform',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'success'
        },
        {
          id: '3',
          type: 'content',
          title: 'Content needs review',
          description: '"London Events Guide" flagged by AI for review',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          user: 'AI System',
          status: 'warning'
        },
        {
          id: '4',
          type: 'system',
          title: 'Backup completed',
          description: 'Daily database backup completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'success'
        }
      ]

      const mockContent: ContentItem[] = [
        {
          id: '1',
          title: 'Complete Guide to London Museums',
          type: 'Article',
          status: 'published',
          author: 'John Doe',
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          views: 1247
        },
        {
          id: '2',
          title: 'Best London Markets 2024',
          type: 'Article',
          status: 'review',
          author: 'Jane Smith',
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
          views: 0
        },
        {
          id: '3',
          title: 'London Food Festival Preview',
          type: 'Article',
          status: 'scheduled',
          author: 'Mike Johnson',
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
          views: 0
        },
        {
          id: '4',
          title: 'Hidden Gems in East London',
          type: 'Article',
          status: 'draft',
          author: 'Sarah Wilson',
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
          views: 0
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setMetrics(mockMetrics)
      setRecentActivity(mockActivity)
      setRecentContent(mockContent)
      setQuickStats({
        totalPageViews: 247832,
        totalUsers: 5420,
        contentCount: 186,
        conversionRate: 3.24
      })
      setIsLoading(false)
    }

    loadDashboardData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  if (!dashboardEnabled) {
    return (
      <PremiumAdminLayout title="Dashboard">
        <div className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Dashboard Not Available</h2>
          <p className="mt-2 text-gray-500">
            The admin dashboard feature is not currently enabled.
          </p>
        </div>
      </PremiumAdminLayout>
    )
  }

  return (
    <PremiumAdminLayout 
      title="Dashboard"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Dashboard' }
      ]}
      actions={
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            ))
          ) : (
            metrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Icon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <div className={`flex items-center text-sm ${
                      metric.changeType === 'increase' ? 'text-green-600' : 
                      metric.changeType === 'decrease' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {metric.changeType === 'increase' ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : metric.changeType === 'decrease' ? (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      ) : null}
                      <span>{Math.abs(metric.change)}%</span>
                    </div>
                    <span className="text-sm text-gray-500 ml-2">vs last month</span>
                  </div>
                  {metric.href && (
                    <div className="mt-4">
                      <a 
                        href={metric.href}
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        View details →
                      </a>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <a 
                  href="/admin/people/access-logs"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </a>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.status === 'success' ? 'bg-green-100' :
                          activity.status === 'warning' ? 'bg-yellow-100' :
                          activity.status === 'error' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {activity.type === 'article' && <FileText size={16} className={getStatusColor(activity.status || 'success')} />}
                          {activity.type === 'user' && <Users size={16} className={getStatusColor(activity.status || 'success')} />}
                          {activity.type === 'system' && <Activity size={16} className={getStatusColor(activity.status || 'success')} />}
                          {activity.type === 'content' && <CheckCircle2 size={16} className={getStatusColor(activity.status || 'warning')} />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Content</h3>
                <div className="flex items-center space-x-2">
                  <a 
                    href="/admin/content/articles/new"
                    className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    New
                  </a>
                  <a 
                    href="/admin/content/articles"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    View all
                  </a>
                </div>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-l-4 border-gray-200 pl-4 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentContent.map((content) => (
                    <div 
                      key={content.id} 
                      className={`border-l-4 pl-4 ${
                        content.status === 'published' ? 'border-green-400' :
                        content.status === 'review' ? 'border-yellow-400' :
                        content.status === 'scheduled' ? 'border-blue-400' :
                        'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                          {content.title}
                        </h4>
                        {stateTransparency && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(content.status)}`}>
                            {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          by {content.author} • {formatTimeAgo(content.updatedAt)}
                        </p>
                        {content.views !== undefined && content.views > 0 && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Eye size={12} className="mr-1" />
                            {content.views.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <a 
              href="/admin/content/articles/new"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Plus className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">New Article</span>
            </a>
            
            <a 
              href="/admin/content/media/upload"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Plus className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Upload Media</span>
            </a>
            
            <a 
              href="/admin/people/invite"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Users className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Invite User</span>
            </a>
            
            <a 
              href="/admin/design/homepage"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Globe className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Edit Homepage</span>
            </a>
            
            <a 
              href="/admin/integrations/analytics"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <BarChart3 className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">View Analytics</span>
            </a>
            
            <a 
              href="/admin/settings/feature-flags"
              className="flex flex-col items-center p-4 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Zap className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Feature Flags</span>
            </a>
          </div>
        </div>
      </div>
    </PremiumAdminLayout>
  )
}