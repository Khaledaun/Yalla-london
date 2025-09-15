'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { MetricTile, MetricTileSkeleton } from '@/src/components/admin/metric-tile'
import { ActivityFeed, ActivityItem } from '@/src/components/admin/activity-feed'
import { TaskManager, Task } from '@/src/components/admin/task-manager'
import { IntegrationsPanel, Integration } from '@/src/components/admin/integrations-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Eye, 
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Zap,
  Calendar,
  Plus,
  RefreshCw,
  DollarSign,
  Upload,
  Edit,
  Settings,
  Brain,
  Search,
  MessageSquare,
  Wifi,
  WifiOff,
  Server,
  Shield,
  Database,
  Globe
} from 'lucide-react'
import { DashboardErrorBoundary } from '@/src/components/admin/dashboard-error-boundary'
import { AsyncActionManager, AsyncAction } from '@/src/components/admin/async-action-toast'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface DashboardData {
  metrics: {
    totalPageViews: number
    uniqueVisitors: number
    publishedContent: number
    totalUsers: number
    conversionRate: number
    lastUpdated: string
    source: string
    timeRange: string
  }
  taskSummary: {
    total: number
    pending: number
    inProgress: number
    overdue: number
    highPriority: number
  }
  pipelineHealth: {
    contentPipeline: {
      status: 'healthy' | 'warning' | 'error'
      articlesInDraft: number
      articlesInReview: number
      scheduledContent: number
    }
    seoHealth: {
      status: 'healthy' | 'warning' | 'error'
      averageScore: number
      issuesCount: number
    }
    systemHealth: {
      status: 'healthy' | 'warning' | 'error'
      uptime: number
      lastBackup: string
    }
  }
  connectionStates: {
    analytics: {
      connected: boolean
      service: string
      lastSync?: string
      error?: string
    }
    searchConsole: {
      connected: boolean
      service: string
      lastSync?: string
      error?: string
    }
    wordpress: {
      connected: boolean
      service: string
      lastSync?: string
      error?: string
    }
  }
  recentActivity: ActivityItem[]
  lastUpdated: string
  cached: boolean
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [asyncActions, setAsyncActions] = useState<AsyncAction[]>([])
  const { toast } = useToast()

  // Check feature flags
  const dashboardEnabled = isPremiumFeatureEnabled('ADMIN_DASHBOARD') || process.env.NODE_ENV === 'development'
  const stateTransparency = isPremiumFeatureEnabled('STATE_TRANSPARENCY')
  const homepageBuilderEnabled = isPremiumFeatureEnabled('HOMEPAGE_BUILDER')
  const adminRole = isPremiumFeatureEnabled('ADMIN_ROLE')
  const editorRole = isPremiumFeatureEnabled('EDITOR_ROLE')

  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  const addAsyncAction = (action: Omit<AsyncAction, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setAsyncActions(prev => [...prev, { ...action, id }])
    return id
  }

  const updateAsyncAction = (id: string, updates: Partial<AsyncAction>) => {
    setAsyncActions(prev => prev.map(action => 
      action.id === id ? { ...action, ...updates } : action
    ))
  }

  const removeAsyncAction = (id: string) => {
    setAsyncActions(prev => prev.filter(action => action.id !== id))
  }

  const loadDashboardData = async () => {
    const actionId = addAsyncAction({
      title: 'Loading dashboard data',
      description: `Fetching metrics for ${timeRange} period`,
      progress: 0,
      status: 'in_progress'
    })

    try {
      setIsLoading(true)
      setError(null)
      
      updateAsyncAction(actionId, { progress: 25, description: 'Connecting to database...' })
      
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`)
      
      updateAsyncAction(actionId, { progress: 50, description: 'Processing metrics...' })
      
      const result = await response.json()
      
      updateAsyncAction(actionId, { progress: 75, description: 'Updating dashboard...' })
      
      if (result.status === 'error') {
        setError(result.message)
        if (result.fallback) {
          setDashboardData(result.fallback)
        }
        updateAsyncAction(actionId, { 
          progress: 100, 
          status: 'error', 
          error: result.message,
          description: 'Failed to load dashboard data'
        })
        toast({
          title: "Dashboard Error",
          description: result.message,
          variant: "destructive",
        })
      } else {
        setDashboardData(result.data)
        updateAsyncAction(actionId, { 
          progress: 100, 
          status: 'completed',
          description: 'Dashboard data loaded successfully'
        })
      }
    } catch (err) {
      const errorMessage = 'Failed to load dashboard data'
      setError(errorMessage)
      updateAsyncAction(actionId, { 
        progress: 100, 
        status: 'error', 
        error: errorMessage,
        description: 'Connection failed'
      })
      toast({
        title: "Connection Error",
        description: "Unable to load dashboard data. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshData = async () => {
    await loadDashboardData()
    toast({
      title: "Dashboard Refreshed",
      description: "All dashboard data has been updated.",
    })
  }

  const handleConnectAnalytics = () => {
    const actionId = addAsyncAction({
      title: 'Opening Analytics Integration',
      description: 'Redirecting to Google Analytics setup...',
      progress: 100,
      status: 'completed'
    })
    window.open('/admin/integrations/analytics', '_blank')
  }

  const handleConnectSearchConsole = () => {
    const actionId = addAsyncAction({
      title: 'Opening Search Console Integration',
      description: 'Redirecting to Google Search Console setup...',
      progress: 100,
      status: 'completed'
    })
    window.open('/admin/integrations/seo', '_blank')
  }

  const handleConnectWordPress = () => {
    const actionId = addAsyncAction({
      title: 'Opening WordPress Integration',
      description: 'Redirecting to WordPress connection setup...',
      progress: 100,
      status: 'completed'
    })
    window.open('/admin/integrations/wordpress', '_blank')
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
    // Show content builder only if feature flag is enabled
    ...(homepageBuilderEnabled ? [{
      id: 'content-builder',
      label: 'Homepage Builder',
      description: 'Drag & drop homepage creation',
      icon: Edit,
      href: '/admin/design/homepage',
      color: 'bg-orange-500 hover:bg-orange-600',
      badge: 'Feature'
    }] : []),
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      description: 'Get help with content and SEO',
      icon: Brain,
      href: '/admin/ai/assistant',
      color: 'bg-violet-500 hover:bg-violet-600',
      badge: 'Premium'
    },
    // Show settings only for admin role
    ...(adminRole ? [{
      id: 'integrations',
      label: 'Integrations',
      description: 'Connect services and tools',
      icon: Settings,
      href: '/admin/integrations',
      color: 'bg-gray-500 hover:bg-gray-600'
    }] : [])
  ]

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
    <DashboardErrorBoundary onRetry={handleRefreshData}>
      <PremiumAdminLayout 
        title="Dashboard"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Dashboard' }
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              aria-label="Select time range for dashboard metrics"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button 
              onClick={handleRefreshData} 
              disabled={isLoading}
              className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-8" dir="auto">
          {/* Welcome Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl p-8 text-white shadow-luxury animate-fade-in">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Activity size={24} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold mb-1">Welcome back to Yalla London!</h1>
                      <p className="text-purple-100 text-lg">
                        Here&apos;s what&apos;s happening with your site today
                      </p>
                    </div>
                  </div>
                  
                  {dashboardData && (
                    <div className="flex items-center space-x-4 text-sm text-purple-200">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} />
                        <span>Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}</span>
                      </div>
                      {stateTransparency && (
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                          Real-time data
                        </span>
                      )}
                      <span className="px-3 py-1 bg-green-500/20 text-green-200 rounded-full text-xs font-medium backdrop-blur-sm">
                        Phase 3 Enhanced
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl font-bold mb-2">
                      {dashboardData?.metrics.totalPageViews.toLocaleString() || '0'}
                    </div>
                    <div className="text-purple-200 text-sm font-medium">Total Page Views</div>
                    <div className="mt-2 flex items-center text-green-200 text-xs">
                      <TrendingUp size={12} className="mr-1" />
                      <span>+12% from last week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Above-the-fold: My Tasks / Pipeline Health / Connections & Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {/* My Tasks Summary */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Tasks</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current workload overview</p>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shimmer-effect h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {dashboardData.taskSummary.pending}
                      </div>
                      <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {dashboardData.taskSummary.inProgress}
                      </div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">In Progress</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {Math.round((dashboardData.taskSummary.total - dashboardData.taskSummary.pending) / dashboardData.taskSummary.total * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${(dashboardData.taskSummary.total - dashboardData.taskSummary.pending) / dashboardData.taskSummary.total * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{dashboardData.taskSummary.total}</span> total tasks
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      <span className="font-medium">{dashboardData.taskSummary.highPriority}</span> high priority
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>Unable to load tasks</p>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Health */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pipeline Health</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">System status overview</p>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="shimmer-effect h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="shimmer-effect h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                        <FileText size={16} className="text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Content Pipeline</span>
                    </div>
                    <span className={`status-indicator ${
                      dashboardData.pipelineHealth.contentPipeline.status === 'healthy' ? 'status-success' :
                      dashboardData.pipelineHealth.contentPipeline.status === 'warning' ? 'status-warning' : 'status-error'
                    }`}>
                      {dashboardData.pipelineHealth.contentPipeline.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                        <Search size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">SEO Health</span>
                    </div>
                    <span className={`status-indicator ${
                      dashboardData.pipelineHealth.seoHealth.status === 'healthy' ? 'status-success' :
                      dashboardData.pipelineHealth.seoHealth.status === 'warning' ? 'status-warning' : 'status-error'
                    }`}>
                      {dashboardData.pipelineHealth.seoHealth.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                        <Server size={16} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">System Health</span>
                    </div>
                    <span className={`status-indicator ${
                      dashboardData.pipelineHealth.systemHealth.status === 'healthy' ? 'status-success' :
                      dashboardData.pipelineHealth.systemHealth.status === 'warning' ? 'status-warning' : 'status-error'
                    }`}>
                      {dashboardData.pipelineHealth.systemHealth.status}
                    </span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {dashboardData.pipelineHealth.contentPipeline.articlesInDraft}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Draft</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {dashboardData.pipelineHealth.contentPipeline.articlesInReview}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Review</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {dashboardData.pipelineHealth.contentPipeline.scheduledContent}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Scheduled</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>Unable to load pipeline health</p>
                </div>
              )}
            </div>
          </div>

          {/* Connections & Flags */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Connections & Flags</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Integration status</p>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="shimmer-effect w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="shimmer-effect h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="shimmer-effect h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Analytics</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Google Analytics</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.analytics.connected ? (
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`status-indicator ${
                        dashboardData.connectionStates.analytics.connected ? 'status-success' : 'status-error'
                      }`}>
                        {dashboardData.connectionStates.analytics.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                        <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Search Console</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Google Search Console</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.searchConsole.connected ? (
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`status-indicator ${
                        dashboardData.connectionStates.searchConsole.connected ? 'status-success' : 'status-error'
                      }`}>
                        {dashboardData.connectionStates.searchConsole.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                        <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">WordPress</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Content Management</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.wordpress.connected ? (
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      )}
                      <span className={`status-indicator ${
                        dashboardData.connectionStates.wordpress.connected ? 'status-success' : 'status-error'
                      }`}>
                        {dashboardData.connectionStates.wordpress.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p>Unable to load connections</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics with Source Badges and Connection States */}
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold gradient-purple-text">Performance Overview</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Key metrics and analytics insights</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Live data</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <MetricTileSkeleton key={i} />
              ))
            ) : dashboardData ? (
              <>
                <MetricTile
                  title="Page Views"
                  value={dashboardData.metrics.totalPageViews || 'No data'}
                  subtitle={`${timeRange} period`}
                  icon={Eye}
                  sourceLabel="Google Analytics"
                  lastSynced={dashboardData.connectionStates.analytics.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.analytics.connected}
                  onConnect={handleConnectAnalytics}
                  error={dashboardData.connectionStates.analytics.error}
                  href="/admin/integrations/analytics"
                  color="primary"
                />
                <MetricTile
                  title="Unique Visitors"
                  value={dashboardData.metrics.uniqueVisitors || 'No data'}
                  subtitle={`${timeRange} period`}
                  icon={Users}
                  sourceLabel="Google Analytics"
                  lastSynced={dashboardData.connectionStates.analytics.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.analytics.connected}
                  onConnect={handleConnectAnalytics}
                  error={dashboardData.connectionStates.analytics.error}
                  href="/admin/integrations/analytics"
                  color="success"
                />
                <MetricTile
                  title="Published Content"
                  value={dashboardData.metrics.publishedContent}
                  subtitle="Total articles"
                  icon={FileText}
                  sourceLabel="Yalla London DB"
                  lastSynced={dashboardData.lastUpdated}
                  timeRange="All time"
                  connected={true}
                  href="/admin/content/articles"
                  color="secondary"
                />
                <MetricTile
                  title="Conversion Rate"
                  value={dashboardData.metrics.conversionRate ? `${dashboardData.metrics.conversionRate}%` : 'No data'}
                  subtitle={`${timeRange} period`}
                  icon={Target}
                  sourceLabel="Google Analytics"
                  lastSynced={dashboardData.connectionStates.analytics.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.analytics.connected}
                  onConnect={handleConnectAnalytics}
                  error={dashboardData.connectionStates.analytics.error}
                  href="/admin/integrations/analytics"
                  color="warning"
                />
                <MetricTile
                  title="Active Users"
                  value={dashboardData.metrics.totalUsers}
                  subtitle="Registered users"
                  icon={Users}
                  sourceLabel="Yalla London DB"
                  lastSynced={dashboardData.lastUpdated}
                  timeRange="All time"
                  connected={true}
                  href="/admin/people/members"
                  color="success"
                />
                <MetricTile
                  title="SEO Performance"
                  value="No data"
                  subtitle={`${timeRange} period`}
                  icon={TrendingUp}
                  sourceLabel="Search Console"
                  lastSynced={dashboardData.connectionStates.searchConsole.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.searchConsole.connected}
                  onConnect={handleConnectSearchConsole}
                  error={dashboardData.connectionStates.searchConsole.error}
                  href="/admin/integrations/seo"
                  color="primary"
                />
              </>
            ) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                Unable to load metrics. Please check your connections.
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Activity */}
          <div className="xl:col-span-2 space-y-8">
            {/* Recent Activity */}
            <ActivityFeed
              activities={dashboardData?.recentActivity || []}
              loading={isLoading}
              title="Recent Activity"
              maxItems={8}
              onViewAll={() => window.open('/admin/audit/logs', '_blank')}
              onItemClick={(item) => console.log('Activity clicked:', item)}
            />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="card-modern glow-on-hover">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quick Actions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Common tasks and shortcuts</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {quickActions.map((action) => {
                    const IconComponent = action.icon
                    return (
                      <a
                        key={action.id}
                        href={action.href}
                        className="group relative flex items-center p-4 text-left border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-purple transition-all duration-300 bg-gradient-to-r hover:from-purple-50 hover:to-purple-100/50 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mr-4 ${action.color} transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:shadow-xl`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                              {action.label}
                            </span>
                            {action.badge && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {action.description}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-4 w-4 text-purple-500" />
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumAdminLayout>

    {/* Async Action Manager for Progress Toasts */}
    <AsyncActionManager
      actions={asyncActions}
      onDismiss={removeAsyncAction}
      onRetry={(id) => {
        const action = asyncActions.find(a => a.id === id)
        if (action?.title.includes('dashboard')) {
          loadDashboardData()
        }
        removeAsyncAction(id)
      }}
    />
  </DashboardErrorBoundary>
  )
}