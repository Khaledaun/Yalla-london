'use client'

import React, { useState, useEffect } from 'react'
import {
  Flag,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  RefreshCw,
  Server,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminTabs,
} from '@/components/admin/admin-ui'

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

  const handleCreateFlag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const rolloutPercentage = parseInt(data.get('rollout') as string || '0', 10);
    if (!name) return;
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, description, rolloutPercentage }),
      });
      if (res.ok) {
        form.reset();
        setShowAddFlag(false);
        await loadFeatureData();
      }
    } catch { /* ignore */ }
  };

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
    const flag = featureFlags.find(f => f.id === flagId);
    if (!flag) return;
    const newEnabled = !flag.enabled;
    setFeatureFlags(prev => prev.map(f =>
      f.id === flagId ? { ...f, enabled: newEnabled } : f
    ));
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: flagId, enabled: newEnabled }),
      });
    } catch (err) {
      console.error('[feature-flags] Failed to persist toggle:', err);
      // Revert on failure
      setFeatureFlags(prev => prev.map(f =>
        f.id === flagId ? { ...f, enabled: !newEnabled } : f
      ));
    }
  }

  const handleUpdateRollout = async (flagId: string, percentage: number) => {
    setFeatureFlags(prev => prev.map(f =>
      f.id === flagId ? { ...f, rolloutPercentage: percentage } : f
    ));
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: flagId, rolloutPercentage: percentage }),
      });
    } catch (err) {
      console.error('[feature-flags] Failed to persist rollout:', err);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-[#2D5A3D] bg-[rgba(45,90,61,0.08)]'
      case 'warning': return 'text-[#C49A2A] bg-[rgba(196,154,42,0.08)]'
      case 'critical': return 'text-[#C8322B] bg-[rgba(200,50,43,0.10)]'
      default: return 'text-stone-500 bg-stone-50'
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
      case 'up': return <TrendingUp className="h-4 w-4 text-[#C8322B]" />
      case 'down': return <TrendingDown className="h-4 w-4 text-[#2D5A3D]" />
      case 'stable': return <Minus className="h-4 w-4 text-stone-400" />
      default: return <Minus className="h-4 w-4 text-stone-400" />
    }
  }

  const healthStatusMap: Record<string, string> = {
    healthy: 'success',
    warning: 'warning',
    critical: 'error',
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminLoadingState label="Loading Feature Flags & Health..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Feature Flags & Health"
        subtitle="Manage feature rollouts and monitor system health"
        action={
          <div className="flex items-center gap-2">
            <AdminButton variant="secondary" onClick={loadFeatureData}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </AdminButton>
            <AdminButton variant="primary" onClick={() => setShowAddFlag(true)}>
              <Flag className="h-4 w-4 mr-1.5" />
              Add Flag
            </AdminButton>
          </div>
        }
      />

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">System Status</p>
              <div className="mt-1.5 flex items-center gap-2">
                <AdminStatusBadge status={healthStatusMap[systemHealth?.overall || 'healthy'] || 'success'} label={systemHealth?.overall || 'healthy'} />
              </div>
            </div>
            <div className={`p-2 rounded-full ${getStatusColor(systemHealth?.overall || 'healthy')}`}>
              {getStatusIcon(systemHealth?.overall || 'healthy')}
            </div>
          </div>
        </AdminCard>

        <AdminKPICard
          value={`${systemHealth?.uptime ?? 0}%`}
          label="Uptime"
          color="green"
        />

        <AdminKPICard
          value={`${systemHealth?.responseTime ?? 0}ms`}
          label="Response Time"
          color="blue"
        />

        <AdminKPICard
          value={`${systemHealth?.errorRate ?? 0}%`}
          label="Error Rate"
          color="red"
        />
      </div>

      {/* Tabs */}
      <AdminTabs
        tabs={[
          { id: 'flags', label: 'Feature Flags', count: featureFlags.length },
          { id: 'health', label: 'System Health' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'flags' | 'health' | 'analytics')}
      />

      {/* Tab Content */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          {featureFlags.length === 0 && !showAddFlag && (
            <AdminEmptyState
              icon={Flag}
              title="No feature flags"
              description="Create your first feature flag to start managing rollouts."
              action={
                <AdminButton variant="primary" onClick={() => setShowAddFlag(true)}>
                  <Flag className="h-4 w-4 mr-1.5" />
                  Add Flag
                </AdminButton>
              }
            />
          )}

          {featureFlags.map((flag) => (
            <AdminCard key={flag.id}>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-stone-800">{flag.name}</h3>
                      <AdminStatusBadge
                        status={flag.enabled ? 'active' : 'inactive'}
                        label={flag.enabled ? 'Enabled' : 'Disabled'}
                      />
                    </div>
                    <p className="text-sm text-stone-500 mb-4">{flag.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <AdminSectionLabel>Rollout</AdminSectionLabel>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={flag.rolloutPercentage}
                            onChange={(e) => handleUpdateRollout(flag.id, parseInt(e.target.value))}
                            className="flex-1 accent-[#3B7EA1]"
                          />
                          <span className="text-sm font-medium text-stone-800 w-12">{flag.rolloutPercentage}%</span>
                        </div>
                      </div>

                      <div>
                        <AdminSectionLabel>Metrics</AdminSectionLabel>
                        <div className="text-sm text-stone-500 space-y-0.5">
                          <div>Impressions: {flag.metrics.impressions.toLocaleString()}</div>
                          <div>Conversions: {flag.metrics.conversions}</div>
                          <div>Rate: {flag.metrics.conversionRate}%</div>
                        </div>
                      </div>

                      <div>
                        <AdminSectionLabel>Target Users</AdminSectionLabel>
                        <div className="flex flex-wrap gap-1">
                          {flag.targetUsers.map((user) => (
                            <span key={user} className="px-2 py-1 bg-[rgba(59,126,161,0.08)] text-[#3B7EA1] rounded text-xs font-medium">
                              {user}
                            </span>
                          ))}
                          {flag.targetUsers.length === 0 && (
                            <span className="text-xs text-stone-400">All users</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <AdminButton
                      variant={flag.enabled ? 'danger' : 'success'}
                      size="sm"
                      onClick={() => handleToggleFlag(flag.id)}
                    >
                      {flag.enabled ? 'Disable' : 'Enable'}
                    </AdminButton>
                    <AdminButton variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </AdminButton>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}

          {/* Add Flag Form */}
          {showAddFlag && (
            <AdminCard accent accentColor="blue">
              <div className="p-5">
                <h3 className="text-base font-semibold text-stone-800 mb-4">Add New Feature Flag</h3>
                <form className="space-y-4" onSubmit={handleCreateFlag}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="e.g., New Dashboard UI"
                        required
                        className="w-full px-3 py-2 border rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#3B7EA1] focus:border-transparent"
                        style={{ borderColor: 'rgba(214,208,196,0.5)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Rollout Percentage</label>
                      <input
                        type="number"
                        name="rollout"
                        min="0"
                        max="100"
                        defaultValue="0"
                        className="w-full px-3 py-2 border rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#3B7EA1] focus:border-transparent"
                        style={{ borderColor: 'rgba(214,208,196,0.5)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Describe what this feature flag enables..."
                      className="w-full px-3 py-2 border rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-[#3B7EA1] focus:border-transparent"
                      style={{ borderColor: 'rgba(214,208,196,0.5)' }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <AdminButton type="submit" variant="primary">
                      Add Flag
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="secondary"
                      onClick={() => setShowAddFlag(false)}
                    >
                      Cancel
                    </AdminButton>
                  </div>
                </form>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-4">
          {(!systemHealth?.metrics || systemHealth.metrics.length === 0) && (
            <AdminEmptyState
              icon={Activity}
              title="No health metrics"
              description="Health metrics will appear here once system monitoring is active."
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth?.metrics.map((metric) => (
              <AdminCard key={metric.id}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-stone-800">{metric.name}</h3>
                    <div className={`p-1 rounded-full ${getStatusColor(metric.status)}`}>
                      {getStatusIcon(metric.status)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-stone-800">
                        {metric.value}{metric.unit}
                      </span>
                      {getTrendIcon(metric.trend)}
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          metric.status === 'healthy' ? 'bg-[#2D5A3D]' :
                          metric.status === 'warning' ? 'bg-[#C49A2A]' : 'bg-[#C8322B]'
                        }`}
                        style={{ width: `${Math.min((metric.value / metric.threshold) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="text-sm text-stone-500">
                      Threshold: {metric.threshold}{metric.unit}
                    </div>

                    <div className="text-xs text-stone-400">
                      Last checked: {new Date(metric.lastChecked).toLocaleString()}
                    </div>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AdminCard>
              <div className="p-5">
                <h3 className="text-base font-semibold text-stone-800 mb-4">Feature Flag Performance</h3>
                <div className="space-y-3">
                  {featureFlags.length === 0 && (
                    <p className="text-sm text-stone-400">No feature flags to analyze.</p>
                  )}
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-3 bg-[var(--admin-bg)] rounded-lg">
                      <div>
                        <p className="font-medium text-stone-800 text-sm">{flag.name}</p>
                        <p className="text-xs text-stone-500">
                          {flag.metrics.impressions} impressions &middot; {flag.metrics.conversionRate}% conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-stone-800">
                          {flag.metrics.conversions} conversions
                        </div>
                        <div className="text-xs text-stone-400">
                          {flag.rolloutPercentage}% rollout
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="p-5">
                <h3 className="text-base font-semibold text-stone-800 mb-4">System Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">Average Response Time</span>
                    <span className="text-sm font-medium text-stone-800">{systemHealth?.responseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">Uptime (30 days)</span>
                    <span className="text-sm font-medium text-stone-800">{systemHealth?.uptime}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">Error Rate</span>
                    <span className="text-sm font-medium text-stone-800">{systemHealth?.errorRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">Active Feature Flags</span>
                    <span className="text-sm font-medium text-stone-800">
                      {featureFlags.filter(f => f.enabled).length} / {featureFlags.length}
                    </span>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  )
}
