'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { StatsWidget } from '@/src/components/admin/stats-widget'
import { ActivityFeed, ActivityItem } from '@/src/components/admin/activity-feed'
import { TaskManager, Task } from '@/src/components/admin/task-manager'
import { IntegrationsPanel, Integration, defaultIntegrations } from '@/src/components/admin/integrations-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  RefreshCw,
  Target,
  ShoppingCart,
  DollarSign,
  Upload,
  Edit,
  Settings,
  Brain,
  Search,
  MessageSquare
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface DashboardMetric {
  label: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<any>
  href?: string
  subtitle?: string
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
  trend?: {
    data: number[]
    period: string
  }
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

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ComponentType<any>
  href: string
  color: string
  badge?: string
}

export default function PremiumAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetric[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
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
          href: '/admin/integrations/analytics',
          subtitle: 'This month',
          color: 'primary',
          trend: {
            data: [120, 145, 167, 189, 234, 278, 312],
            period: 'Last 7 days'
          }
        },
        {
          label: 'Active Users',
          value: '1,423',
          change: 8.2,
          changeType: 'increase',
          icon: Users,
          href: '/admin/people/members',
          subtitle: 'Last 30 days',
          color: 'success',
          trend: {
            data: [45, 52, 48, 61, 67, 74, 82],
            period: 'Last 7 days'
          }
        },
        {
          label: 'Published Articles',
          value: 186,
          change: 5.1,
          changeType: 'increase',
          icon: FileText,
          href: '/admin/content/articles',
          subtitle: 'Total published',
          color: 'secondary'
        },
        {
          label: 'Conversion Rate',
          value: '3.24%',
          change: -2.1,
          changeType: 'decrease',
          icon: Target,
          href: '/admin/integrations/analytics',
          subtitle: 'This month',
          color: 'warning'
        },
        {
          label: 'Revenue',
          value: '£12,847',
          change: 15.3,
          changeType: 'increase',
          icon: DollarSign,
          href: '/admin/integrations/analytics',
          subtitle: 'This month',
          color: 'success'
        },
        {
          label: 'SEO Score',
          value: '87%',
          change: 4.2,
          changeType: 'increase',
          icon: TrendingUp,
          href: '/admin/content/seo',
          subtitle: 'Average score',
          color: 'primary'
        }
      ]

      const mockActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'content',
          action: 'publish',
          title: 'New article published',
          description: '"Best London Restaurants 2024" has been published successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          user: {
            name: 'John Doe',
            email: 'john@yallalondon.com',
            avatar: '/avatars/john.jpg'
          },
          status: 'success',
          href: '/admin/content/articles/best-london-restaurants-2024'
        },
        {
          id: '2',
          type: 'user',
          action: 'register',
          title: 'New user registered',
          description: 'Sarah Wilson has joined the platform and completed onboarding',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          user: {
            name: 'Sarah Wilson',
            email: 'sarah@example.com'
          },
          status: 'success'
        },
        {
          id: '3',
          type: 'content',
          action: 'review',
          title: 'Content needs review',
          description: '"London Events Guide" has been flagged by AI for manual review',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          user: {
            name: 'AI System',
            email: 'system@yallalondon.com'
          },
          status: 'warning',
          metadata: {
            contentId: 'london-events-guide',
            reviewReason: 'Content quality check'
          }
        },
        {
          id: '4',
          type: 'system',
          action: 'backup',
          title: 'Backup completed',
          description: 'Daily database backup completed successfully (2.3GB)',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'success',
          metadata: {
            backupSize: '2.3GB',
            backupType: 'automated'
          }
        },
        {
          id: '5',
          type: 'media',
          action: 'upload',
          title: 'Media uploaded',
          description: '12 new images uploaded to media library',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
          user: {
            name: 'Jane Smith',
            email: 'jane@yallalondon.com'
          },
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
          type: 'Event',
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

      const mockTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Review content for SEO optimization',
          description: 'Optimize "London Restaurants" article for better search rankings',
          type: 'seo',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
          assignee: {
            name: 'John Doe',
            email: 'john@yallalondon.com'
          },
          tags: ['SEO', 'Content'],
          progress: 25,
          estimatedTime: 45
        },
        {
          id: 'task-2',
          title: 'Publish weekly newsletter',
          description: 'Compile and send the weekly Yalla London newsletter',
          type: 'publish',
          status: 'in_progress',
          priority: 'medium',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48), // Day after tomorrow
          assignee: {
            name: 'Jane Smith',
            email: 'jane@yallalondon.com'
          },
          tags: ['Newsletter', 'Marketing'],
          progress: 70,
          estimatedTime: 30
        },
        {
          id: 'task-3',
          title: 'Update social media content',
          description: 'Create and schedule social media posts for the week',
          type: 'social',
          status: 'pending',
          priority: 'medium',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 12), // In 12 hours
          assignee: {
            name: 'Sarah Wilson',
            email: 'sarah@yallalondon.com'
          },
          tags: ['Social Media', 'Content'],
          estimatedTime: 60
        },
        {
          id: 'task-4',
          title: 'Conduct monthly site audit',
          description: 'Perform comprehensive site audit and generate report',
          type: 'audit',
          status: 'pending',
          priority: 'low',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // Next week
          assignee: {
            name: 'Mike Johnson',
            email: 'mike@yallalondon.com'
          },
          tags: ['Audit', 'Analytics'],
          estimatedTime: 120
        }
      ]

      const mockIntegrations: Integration[] = [
        {
          id: 'ga4',
          name: 'Google Analytics 4',
          description: 'Website analytics and user behavior tracking',
          category: 'analytics',
          status: 'connected',
          lastSync: new Date(Date.now() - 1000 * 60 * 30),
          metrics: {
            requests: 1247,
            limit: 50000,
            period: 'this month'
          }
        },
        {
          id: 'gsc',
          name: 'Google Search Console',
          description: 'Search performance and SEO insights',
          category: 'seo',
          status: 'connected',
          lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2)
        },
        {
          id: 'openai',
          name: 'OpenAI GPT',
          description: 'AI-powered content generation',
          category: 'ai',
          status: 'connected',
          isPremium: true,
          metrics: {
            requests: 156,
            limit: 1000,
            period: 'this month'
          }
        },
        {
          id: 'claude',
          name: 'Claude AI',
          description: 'Advanced AI assistant',
          category: 'ai',
          status: 'disconnected',
          isPremium: true
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      setMetrics(mockMetrics)
      setRecentActivity(mockActivity)
      setRecentContent(mockContent)
      setUpcomingTasks(mockTasks)
      setIntegrations(mockIntegrations)
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

  // Event handlers
  const handleRefreshData = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const handleTaskComplete = (taskId: string) => {
    setUpcomingTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' as const }
          : task
      )
    )
  }

  const handleIntegrationConnect = (integration: Integration) => {
    console.log('Connecting integration:', integration.name)
    // Implement integration connection logic
  }

  const handleIntegrationDisconnect = (integration: Integration) => {
    console.log('Disconnecting integration:', integration.name)
    // Implement integration disconnection logic
  }

  const quickActions: QuickAction[] = [
    {
      id: 'new-article',
      label: 'New Article',
      description: 'Create a new blog post or article',
      icon: FileText,
      href: '/admin/content/articles/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'upload-media',
      label: 'Upload Media',
      description: 'Add images, videos, or documents',
      icon: Upload,
      href: '/admin/content/media/upload',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'seo-tools',
      label: 'SEO Tools',
      description: 'Optimize content for search engines',
      icon: Search,
      href: '/admin/content/seo',
      color: 'bg-purple-500 hover:bg-purple-600',
      badge: 'AI'
    },
    {
      id: 'content-builder',
      label: 'Content Builder',
      description: 'Drag & drop content creation',
      icon: Edit,
      href: '/admin/content/builder',
      color: 'bg-orange-500 hover:bg-orange-600',
      badge: 'New'
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      description: 'Get help with content and SEO',
      icon: Brain,
      href: '/admin/ai/assistant',
      color: 'bg-violet-500 hover:bg-violet-600',
      badge: 'Premium'
    },
    {
      id: 'social-scheduler',
      label: 'Social Scheduler',
      description: 'Schedule social media posts',
      icon: MessageSquare,
      href: '/admin/social/scheduler',
      color: 'bg-pink-500 hover:bg-pink-600'
    }
  ]

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
        <Button 
          onClick={handleRefreshData} 
          disabled={isLoading}
          className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome back to Yalla London!</h1>
              <p className="text-violet-100 text-lg">
                Here's what's happening with your site today
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{quickStats.totalPageViews.toLocaleString()}</div>
              <div className="text-violet-200">Total page views</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {metrics.map((metric, index) => (
              <StatsWidget
                key={index}
                title={metric.label}
                value={metric.value}
                subtitle={metric.subtitle}
                change={{
                  value: metric.change,
                  period: 'vs last month',
                  type: metric.changeType
                }}
                icon={metric.icon}
                color={metric.color}
                loading={isLoading}
                actions={metric.href ? [{
                  label: 'View details',
                  href: metric.href
                }] : undefined}
                trend={metric.trend}
                size="md"
              />
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Tasks and Activity */}
          <div className="xl:col-span-2 space-y-8">
            {/* Task Manager */}
            <TaskManager
              tasks={upcomingTasks}
              loading={isLoading}
              title="Upcoming Tasks"
              maxItems={6}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={(task) => console.log('Edit task:', task)}
              onTaskDelete={(taskId) => console.log('Delete task:', taskId)}
              onCreateTask={() => console.log('Create new task')}
              onViewAll={() => console.log('View all tasks')}
            />

            {/* Recent Activity */}
            <ActivityFeed
              activities={recentActivity}
              loading={isLoading}
              title="Recent Activity"
              maxItems={8}
              onViewAll={() => console.log('View all activity')}
              onItemClick={(item) => console.log('Activity clicked:', item)}
            />
          </div>

          {/* Right Column - Integrations and Quick Actions */}
          <div className="space-y-8">
            {/* Integrations Panel */}
            <IntegrationsPanel
              integrations={integrations}
              loading={isLoading}
              title="Connected Services"
              onConnect={handleIntegrationConnect}
              onDisconnect={handleIntegrationDisconnect}
              onConfigure={(integration) => console.log('Configure:', integration)}
              onViewAll={() => console.log('View all integrations')}
              compact={true}
              showMetrics={true}
            />

            {/* Recent Content */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Recent Content</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-violet-600 hover:text-violet-700"
                      asChild
                    >
                      <a href="/admin/content/articles/new" className="flex items-center">
                        <Plus size={16} className="mr-1" />
                        New
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-slate-600 hover:text-slate-700"
                      asChild
                    >
                      <a href="/admin/content/articles">
                        View all
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="border-l-4 border-slate-200 pl-4 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                        </div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mt-2"></div>
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
                          'border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-900 hover:text-violet-600 cursor-pointer">
                            {content.title}
                          </h4>
                          {stateTransparency && (
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                content.status === 'published' ? 'border-green-200 text-green-700 bg-green-50' :
                                content.status === 'review' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                                content.status === 'scheduled' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                'border-slate-200 text-slate-700 bg-slate-50'
                              }`}
                            >
                              {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-slate-500">
                            by {content.author} • {formatTimeAgo(content.updatedAt)}
                          </p>
                          {content.views !== undefined && content.views > 0 && (
                            <div className="flex items-center text-xs text-slate-500">
                              <Eye size={12} className="mr-1" />
                              {content.views.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
            <p className="text-sm text-slate-600">Common tasks and shortcuts</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {quickActions.map((action) => {
                const IconComponent = action.icon
                return (
                  <a
                    key={action.id}
                    href={action.href}
                    className="group relative flex flex-col items-center p-6 text-center border-2 border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-lg transition-all duration-200"
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white mb-3 ${action.color} transition-transform group-hover:scale-110`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                        {action.label}
                      </span>
                      {action.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 group-hover:text-slate-600">
                      {action.description}
                    </p>
                  </a>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PremiumAdminLayout>
  )
}