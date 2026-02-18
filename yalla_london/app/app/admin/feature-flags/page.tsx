'use client'

import { useState, useEffect } from 'react'
import { 
  Flag, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  RefreshCw,
  Database,
  Server,
  Globe,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  targetUsers: string[]
  conditions: {
    environment: string[]
    userRoles: string[]
    dateRange?: {
      start: string
      end: string
    }
  }
  metrics: {
    impressions: number
    conversions: number
    conversionRate: number
  }
  createdAt: string
  updatedAt: string
}

interface HealthMetric {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical'
  value: number
  threshold: number
  unit: string
  lastChecked: string
  trend: 'up' | 'down' | 'stable'
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: number
  responseTime: number
  errorRate: number
  lastIncident?: string
  metrics: HealthMetric[]
}

export default function FeatureFlagsHealth() {
  const [activeTab, setActiveTab] = useState<'flags' | 'health' | 'analytics'>('flags')
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddFlag, setShowAddFlag] = useState(false)

  useEffect(() => {
    loadFeatureData()
  }, [])

  const loadFeatureData = async () => {
    setIsLoading(true)
    try {
      // Fetch real feature flags from API
      const flagsRes = await fetch('/api/admin/feature-flags')
      if (flagsRes.ok) {
        const flagsData = await flagsRes.json()
        const dbFlags = (flagsData.flags || []).map((f: any) => ({
          id: f.id,
          name: f.name || f.key,
          description: f.description || '',
          enabled: f.enabled ?? false,
          rolloutPercentage: f.rolloutPercentage ?? (f.enabled ? 100 : 0),
          targetUsers: f.targetUsers || [],
          conditions: f.conditions || { environment: [], userRoles: [] },
          metrics: f.metrics || { impressions: 0, conversions: 0, conversionRate: 0 },
          createdAt: f.createdAt || new Date().toISOString(),
          updatedAt: f.updatedAt || new Date().toISOString(),
        }))
        setFeatureFlags(dbFlags)
      } else {
        setFeatureFlags([])
      }

      // Fetch real system health from cron logs
      const healthRes = await fetch('/api/admin/operations-hub')
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        const cronLogs = healthData.recentCronLogs || []
        const failedCount = cronLogs.filter((l: any) => l.status === 'failed').length
        const successCount = cronLogs.filter((l: any) => l.status === 'completed').length
        const totalLogs = cronLogs.length
        const errorRate = totalLogs > 0 ? Math.round((failedCount / totalLogs) * 100 * 10) / 10 : 0

        setSystemHealth({
          overall: failedCount > 3 ? 'critical' : failedCount > 0 ? 'warning' : 'healthy',
          uptime: totalLogs > 0 ? Math.round((successCount / totalLogs) * 100 * 10) / 10 : 0,
          responseTime: 0,
          errorRate,
          metrics: [],
        })
      } else {
        setSystemHealth({ overall: 'warning', uptime: 0, responseTime: 0, errorRate: 0, metrics: [] })
      }
    } catch (error) {
      console.error('Failed to load feature data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFlag = async (flagId: string) => {
    setFeatureFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
    ))
  }

  const handleUpdateRollout = async (flagId: string, percentage: number) => {
    setFeatureFlags(prev => prev.map(flag => 
      flag.id === flagId ? { ...flag, rolloutPercentage: percentage } : flag
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <XCircle className="h-4 w-4" />
      default: return <Minus className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Flag className="h-12 w-12 animate-pulse text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Feature Flags & Health...</h2>
          <p className="text-gray-600">Monitoring system performance and feature rollouts</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Flag className="h-8 w-8 text-purple-500" />
            Feature Flags & Health
          </h1>
          <p className="text-gray-600 mt-1">Manage feature rollouts and monitor system health</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadFeatureData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddFlag(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Flag className="h-4 w-4" />
            Add Feature Flag
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{systemHealth?.overall}</p>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(systemHealth?.overall || 'healthy')}`}>
              {getStatusIcon(systemHealth?.overall || 'healthy')}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth?.uptime}%</p>
            </div>
            <Server className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth?.responseTime}ms</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth?.errorRate}%</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'flags', label: 'Feature Flags', icon: Flag },
            { id: 'health', label: 'System Health', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'flags' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {featureFlags.map((flag) => (
              <div key={flag.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{flag.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        flag.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{flag.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Rollout</h4>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={flag.rolloutPercentage}
                            onChange={(e) => handleUpdateRollout(flag.id, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium text-gray-900 w-12">{flag.rolloutPercentage}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Metrics</h4>
                        <div className="text-sm text-gray-600">
                          <div>Impressions: {flag.metrics.impressions.toLocaleString()}</div>
                          <div>Conversions: {flag.metrics.conversions}</div>
                          <div>Rate: {flag.metrics.conversionRate}%</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Target Users</h4>
                        <div className="flex flex-wrap gap-1">
                          {flag.targetUsers.map((user) => (
                            <span key={user} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              {user}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleToggleFlag(flag.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        flag.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {flag.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Flag Form */}
          {showAddFlag && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Feature Flag</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., New Dashboard UI"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rollout Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe what this feature flag enables..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFlag(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemHealth?.metrics.map((metric) => (
              <div key={metric.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">{metric.name}</h3>
                  <div className={`p-1 rounded-full ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {metric.value}{metric.unit}
                    </span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        metric.status === 'healthy' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((metric.value / metric.threshold) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Threshold: {metric.threshold}{metric.unit}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Last checked: {new Date(metric.lastChecked).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Flag Performance</h3>
              <div className="space-y-4">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{flag.name}</p>
                      <p className="text-sm text-gray-600">
                        {flag.metrics.impressions} impressions • {flag.metrics.conversionRate}% conversion
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {flag.metrics.conversions} conversions
                      </div>
                      <div className="text-xs text-gray-600">
                        {flag.rolloutPercentage}% rollout
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Average Response Time</span>
                  <span className="font-medium text-gray-900">{systemHealth?.responseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Uptime (30 days)</span>
                  <span className="font-medium text-gray-900">{systemHealth?.uptime}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Error Rate</span>
                  <span className="font-medium text-gray-900">{systemHealth?.errorRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Feature Flags</span>
                  <span className="font-medium text-gray-900">
                    {featureFlags.filter(f => f.enabled).length} / {featureFlags.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
