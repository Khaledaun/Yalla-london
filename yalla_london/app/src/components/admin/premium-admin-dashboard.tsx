'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { MetricTile, MetricTileSkeleton } from '@/src/components/admin/metric-tile'
import { ActivityFeed, ActivityItem } from '@/src/components/admin/activity-feed'
import { TaskManager, Task } from '@/src/components/admin/task-manager'
import { IntegrationsPanel, Integration } from '@/src/components/admin/integrations-panel'
import { ContentPipelinePanel } from '@/src/components/admin/content-pipeline-panel'
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
  Globe,
  Bot
} from 'lucide-react'
import { DashboardErrorBoundary } from '@/src/components/admin/dashboard-error-boundary'
import { AsyncActionManager, AsyncAction } from '@/src/components/admin/async-action-toast'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface DashboardData {
  metrics: {
    sessions: number
    organicClicks: number
    avgSeoScore: number
    indexedPages: number
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
      href: '/admin/articles/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'upload-media',
      label: 'Upload Media',
      description: 'Add images, videos, or documents',
      icon: Upload,
      href: '/admin/media/upload',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'seo-audit',
      label: 'SEO Audit',
      description: 'Run AI-powered SEO analysis',
      icon: Search,
      href: '/admin/seo-audits',
      color: 'bg-purple-500 hover:bg-purple-600',
      badge: 'AI'
    },
    {
      id: 'topics-pipeline',
      label: 'Topics Pipeline',
      description: 'Manage content topic research',
      icon: TrendingUp,
      href: '/admin/topics-pipeline',
      color: 'bg-orange-500 hover:bg-orange-600',
      badge: 'Auto'
    },
    {
      id: 'prompts-editor',
      label: 'Prompts Editor',
      description: 'Edit AI prompt templates',
      icon: Brain,
      href: '/admin/prompts',
      color: 'bg-violet-500 hover:bg-violet-600',
      badge: 'AI'
    },
    // Show automation hub only for admin role
    ...(adminRole ? [{
      id: 'automation-hub',
      label: 'Automation Hub',
      description: 'Manage publishing schedules',
      icon: Bot,
      href: '/admin/automation-hub',
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
              className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
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
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 text-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Welcome back to Yalla London!</h1>
                <p className="text-gray-800 text-lg">
                  Here&apos;s what&apos;s happening with your site today
                </p>
                {dashboardData && (
                  <div className="mt-2 text-sm text-gray-700">
                    Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                    {stateTransparency && (
                      <span className="ml-2 px-2 py-1 bg-yellow-600/30 rounded text-xs">
                        Real-time data
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {dashboardData?.metrics.totalPageViews.toLocaleString() || '0'}
                </div>
                <div className="text-gray-700">Total page views</div>
              </div>
            </div>
          </div>

        {/* Above-the-fold: My Tasks / Pipeline Health / Connections & Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Tasks Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>My Tasks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardData.taskSummary.pending}
                      </div>
                      <div className="text-sm text-gray-500">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardData.taskSummary.inProgress}
                      </div>
                      <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                  </div>
                  <Progress 
                    value={(dashboardData.taskSummary.total - dashboardData.taskSummary.pending) / dashboardData.taskSummary.total * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{dashboardData.taskSummary.total} total tasks</span>
                    <span>{dashboardData.taskSummary.highPriority} high priority</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">Unable to load tasks</div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Health */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Pipeline Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Content Pipeline</span>
                    <Badge variant={
                      dashboardData.pipelineHealth.contentPipeline.status === 'healthy' ? 'default' :
                      dashboardData.pipelineHealth.contentPipeline.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {dashboardData.pipelineHealth.contentPipeline.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SEO Health</span>
                    <Badge variant={
                      dashboardData.pipelineHealth.seoHealth.status === 'healthy' ? 'default' :
                      dashboardData.pipelineHealth.seoHealth.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {dashboardData.pipelineHealth.seoHealth.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Health</span>
                    <Badge variant={
                      dashboardData.pipelineHealth.systemHealth.status === 'healthy' ? 'default' :
                      dashboardData.pipelineHealth.systemHealth.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {dashboardData.pipelineHealth.systemHealth.status}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      Draft: {dashboardData.pipelineHealth.contentPipeline.articlesInDraft} • 
                      Review: {dashboardData.pipelineHealth.contentPipeline.articlesInReview} • 
                      Scheduled: {dashboardData.pipelineHealth.contentPipeline.scheduledContent}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">Unable to load pipeline health</div>
              )}
            </CardContent>
          </Card>

          {/* Connections & Flags */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="h-5 w-5" />
                <span>Connections & Flags</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : dashboardData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Analytics</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.analytics.connected ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={dashboardData.connectionStates.analytics.connected ? 'default' : 'destructive'}>
                        {dashboardData.connectionStates.analytics.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span className="text-sm">Search Console</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.searchConsole.connected ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={dashboardData.connectionStates.searchConsole.connected ? 'default' : 'destructive'}>
                        {dashboardData.connectionStates.searchConsole.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">WordPress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {dashboardData.connectionStates.wordpress.connected ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <Badge variant={dashboardData.connectionStates.wordpress.connected ? 'default' : 'destructive'}>
                        {dashboardData.connectionStates.wordpress.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">Unable to load connections</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics with Source Badges and Connection States */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <MetricTileSkeleton key={i} />
              ))
            ) : dashboardData ? (
              <>
                <MetricTile
                  title="Sessions"
                  value={dashboardData.metrics.sessions || 'No data'}
                  subtitle={`${timeRange} period`}
                  icon={Users}
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
                  title="Organic Clicks"
                  value={dashboardData.metrics.organicClicks || 'No data'}
                  subtitle={`${timeRange} period`}
                  icon={Search}
                  sourceLabel="Search Console"
                  lastSynced={dashboardData.connectionStates.searchConsole.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.searchConsole.connected}
                  onConnect={handleConnectSearchConsole}
                  error={dashboardData.connectionStates.searchConsole.error}
                  href="/admin/seo-audits"
                  color="success"
                />
                <MetricTile
                  title="Avg SEO Score"
                  value={dashboardData.metrics.avgSeoScore ? `${dashboardData.metrics.avgSeoScore}%` : 'No data'}
                  subtitle="Content quality"
                  icon={TrendingUp}
                  sourceLabel="Yalla London AI"
                  lastSynced={dashboardData.lastUpdated}
                  timeRange="Real-time"
                  connected={true}
                  href="/admin/seo-audits"
                  color="warning"
                />
                <MetricTile
                  title="Indexed Pages"
                  value={dashboardData.metrics.indexedPages || 'No data'}
                  subtitle="Search visibility"
                  icon={Globe}
                  sourceLabel="Search Console"
                  lastSynced={dashboardData.connectionStates.searchConsole.lastSync}
                  timeRange={timeRange}
                  connected={dashboardData.connectionStates.searchConsole.connected}
                  onConnect={handleConnectSearchConsole}
                  error={dashboardData.connectionStates.searchConsole.error}
                  href="/admin/seo-audits"
                  color="secondary"
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
                  href="/admin/articles"
                  color="secondary"
                />
                <MetricTile
                  title="Active Users"
                  value={dashboardData.metrics.totalUsers}
                  subtitle="Automation status"
                  icon={Activity}
                  sourceLabel="Yalla London DB"
                  lastSynced={dashboardData.lastUpdated}
                  timeRange="All time"
                  connected={true}
                  href="/admin/automation-hub"
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
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
                <p className="text-sm text-slate-600">Common tasks and shortcuts</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-4">
                  {quickActions.map((action) => {
                    const IconComponent = action.icon
                    return (
                      <a
                        key={action.id}
                        href={action.href}
                        className="group relative flex items-center p-4 text-left border-2 border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-lg transition-all duration-200"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white mr-4 ${action.color} transition-transform group-hover:scale-110`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
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
                        </div>
                      </a>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Pipeline Section */}
        <div className="mt-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Content Pipeline</span>
              </CardTitle>
              <p className="text-sm text-slate-600">Monitor content workflow and publishing status</p>
            </CardHeader>
            <CardContent className="pt-0">
              <ContentPipelinePanel />
            </CardContent>
          </Card>
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