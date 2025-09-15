'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  Globe,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Shield,
  Monitor,
  BarChart3,
  Eye,
  Users,
  FileText,
  Settings,
  Bell,
  Play,
  Pause,
  Square
} from 'lucide-react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature: number
    status: 'healthy' | 'warning' | 'critical'
  }
  memory: {
    used: number
    total: number
    percentage: number
    status: 'healthy' | 'warning' | 'critical'
  }
  disk: {
    used: number
    total: number
    percentage: number
    status: 'healthy' | 'warning' | 'critical'
  }
  network: {
    inbound: number
    outbound: number
    latency: number
    status: 'healthy' | 'warning' | 'critical'
  }
}

interface ServiceStatus {
  id: string
  name: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  uptime: string
  lastCheck: string
  responseTime: number
  endpoint?: string
}

interface AutomationJob {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'queued'
  progress: number
  startTime: string
  estimatedCompletion?: string
  logs: string[]
}

interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
  source: string
}

export default function MonitoringDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [automationJobs, setAutomationJobs] = useState<AutomationJob[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    const loadMonitoringData = () => {
      // Simulate loading
      setTimeout(() => {
        setSystemMetrics({
          cpu: {
            usage: 45,
            cores: 8,
            temperature: 62,
            status: 'healthy'
          },
          memory: {
            used: 12.5,
            total: 32,
            percentage: 39,
            status: 'healthy'
          },
          disk: {
            used: 450,
            total: 1000,
            percentage: 45,
            status: 'healthy'
          },
          network: {
            inbound: 125.5,
            outbound: 89.2,
            latency: 23,
            status: 'healthy'
          }
        })

        setServices([
          {
            id: 'web-server',
            name: 'Web Server',
            status: 'running',
            uptime: '15d 4h 23m',
            lastCheck: '2 seconds ago',
            responseTime: 145,
            endpoint: 'https://yalla-london.com'
          },
          {
            id: 'database',
            name: 'Database',
            status: 'running',
            uptime: '15d 4h 23m',
            lastCheck: '1 second ago',
            responseTime: 12
          },
          {
            id: 'redis-cache',
            name: 'Redis Cache',
            status: 'running',
            uptime: '15d 4h 23m',
            lastCheck: '3 seconds ago',
            responseTime: 2
          },
          {
            id: 'email-service',
            name: 'Email Service',
            status: 'running',
            uptime: '15d 4h 23m',
            lastCheck: '5 seconds ago',
            responseTime: 234
          },
          {
            id: 'backup-service',
            name: 'Backup Service',
            status: 'running',
            uptime: '2h 15m',
            lastCheck: '1 minute ago',
            responseTime: 1200
          }
        ])

        setAutomationJobs([
          {
            id: 'content-sync',
            name: 'Content Synchronization',
            status: 'running',
            progress: 67,
            startTime: '2 minutes ago',
            estimatedCompletion: '3 minutes',
            logs: ['Starting content sync...', 'Processing 150 articles...', 'Syncing media files...']
          },
          {
            id: 'seo-analysis',
            name: 'SEO Analysis',
            status: 'completed',
            progress: 100,
            startTime: '15 minutes ago',
            logs: ['SEO analysis completed', 'Generated 45 recommendations', 'Updated meta tags']
          },
          {
            id: 'backup-job',
            name: 'Database Backup',
            status: 'queued',
            progress: 0,
            startTime: 'Scheduled for 2:00 AM',
            logs: ['Waiting for scheduled time...']
          }
        ])

        setAlerts([
          {
            id: 'alert-1',
            type: 'warning',
            title: 'High Memory Usage',
            message: 'Memory usage has exceeded 85% for the past 10 minutes',
            timestamp: '5 minutes ago',
            acknowledged: false,
            source: 'System Monitor'
          },
          {
            id: 'alert-2',
            type: 'info',
            title: 'Backup Completed',
            message: 'Daily backup completed successfully',
            timestamp: '2 hours ago',
            acknowledged: true,
            source: 'Backup Service'
          }
        ])

        setIsLoading(false)
      }, 1000)
    }

    loadMonitoringData()

    // Set up real-time updates
    const interval = setInterval(() => {
      if (isRealTimeEnabled) {
        loadMonitoringData()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isRealTimeEnabled])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'completed':
        return 'status-success'
      case 'warning':
      case 'starting':
      case 'queued':
        return 'status-warning'
      case 'critical':
      case 'error':
      case 'failed':
      case 'stopped':
        return 'status-error'
      default:
        return 'status-info'
    }
  }

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-purple-text">System Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time system health and performance</p>
          </div>
          <div className="shimmer-effect w-32 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-modern p-6">
              <div className="shimmer-effect h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="shimmer-effect h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="shimmer-effect h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-purple-text">System Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRealTimeEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          <Button
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            variant="outline"
            size="sm"
            className="btn-ghost-modern"
          >
            {isRealTimeEnabled ? <Pause size={16} /> : <Play size={16} />}
            {isRealTimeEnabled ? 'Pause' : 'Resume'}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="btn-ghost-modern"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
          {/* CPU Usage */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                    <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">CPU Usage</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{systemMetrics.cpu.cores} cores</p>
                  </div>
                </div>
                <span className={`status-indicator ${getStatusColor(systemMetrics.cpu.status)}`}>
                  {systemMetrics.cpu.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {systemMetrics.cpu.usage}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {systemMetrics.cpu.temperature}°C
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${systemMetrics.cpu.usage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                    <MemoryStick className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Memory</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{systemMetrics.memory.total}GB total</p>
                  </div>
                </div>
                <span className={`status-indicator ${getStatusColor(systemMetrics.memory.status)}`}>
                  {systemMetrics.memory.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {systemMetrics.memory.percentage}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {systemMetrics.memory.used}GB used
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${systemMetrics.memory.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Disk Space</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{systemMetrics.disk.total}GB total</p>
                  </div>
                </div>
                <span className={`status-indicator ${getStatusColor(systemMetrics.disk.status)}`}>
                  {systemMetrics.disk.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {systemMetrics.disk.percentage}%
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {systemMetrics.disk.used}GB used
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${systemMetrics.disk.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="card-modern glow-on-hover">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
                    <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Network</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{systemMetrics.network.latency}ms latency</p>
                  </div>
                </div>
                <span className={`status-indicator ${getStatusColor(systemMetrics.network.status)}`}>
                  {systemMetrics.network.status}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">In: {systemMetrics.network.inbound} MB/s</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Out: {systemMetrics.network.outbound} MB/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services and Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Services Status */}
        <div className="card-modern">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                  <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Services Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">System services monitoring</p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {services.filter(s => s.status === 'running').length}/{services.length} Running
              </Badge>
            </div>
            
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'running' ? 'bg-green-500 animate-pulse' : 
                      service.status === 'starting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{service.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Uptime: {service.uptime} • Response: {service.responseTime}ms
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`status-indicator ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {service.lastCheck}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Automation Jobs */}
        <div className="card-modern">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Automation Jobs</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Background task monitoring</p>
                </div>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                {automationJobs.filter(j => j.status === 'running').length} Active
              </Badge>
            </div>
            
            <div className="space-y-4">
              {automationJobs.map((job) => (
                <div key={job.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{job.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Started: {job.startTime}
                        {job.estimatedCompletion && ` • ETA: ${job.estimatedCompletion}`}
                      </p>
                    </div>
                    <span className={`status-indicator ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  
                  {job.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {job.logs[job.logs.length - 1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card-modern">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center">
                  <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">System Alerts</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Recent notifications and warnings</p>
                </div>
              </div>
              <Badge variant="outline" className="text-red-600 border-red-200">
                {alerts.filter(a => !a.acknowledged).length} Unacknowledged
              </Badge>
            </div>
            
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-xl border-l-4 ${
                  alert.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                } ${alert.acknowledged ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        alert.type === 'error' ? 'bg-red-100 dark:bg-red-900/50' :
                        alert.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                        'bg-blue-100 dark:bg-blue-900/50'
                      }`}>
                        {alert.type === 'error' ? (
                          <AlertCircle className={`h-4 w-4 ${
                            alert.type === 'error' ? 'text-red-600 dark:text-red-400' :
                            alert.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-blue-600 dark:text-blue-400'
                          }`} />
                        ) : alert.type === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{alert.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{alert.timestamp}</span>
                          <span>•</span>
                          <span>{alert.source}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        onClick={() => acknowledgeAlert(alert.id)}
                        variant="outline"
                        size="sm"
                        className="btn-ghost-modern text-xs"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
