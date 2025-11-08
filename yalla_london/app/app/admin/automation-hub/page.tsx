'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Bot, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Zap,
  Upload,
  Download,
  Database,
  Globe,
  Search,
  FileText,
  Users,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'

interface AutomationJob {
  id: string
  name: string
  type: 'content-generation' | 'seo-audit' | 'publishing' | 'backup' | 'sync' | 'cleanup'
  description: string
  schedule: string
  isActive: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  successCount: number
  failureCount: number
  duration?: number
  createdAt: string
  updatedAt: string
}

interface PublishingSchedule {
  id: string
  name: string
  contentType: string
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  days?: string[]
  isActive: boolean
  nextPublish?: string
  articlesQueue: number
  lastPublished?: string
}

const mockJobs: AutomationJob[] = [
  {
    id: '1',
    name: 'Daily Content Generation',
    type: 'content-generation',
    description: 'Automatically generate 3 articles daily based on approved topics',
    schedule: '0 9 * * *', // 9 AM daily
    isActive: true,
    lastRun: '2024-01-12T09:00:00Z',
    nextRun: '2024-01-13T09:00:00Z',
    status: 'completed',
    successCount: 45,
    failureCount: 2,
    duration: 180,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
  {
    id: '2',
    name: 'SEO Audit Scan',
    type: 'seo-audit',
    description: 'Run comprehensive SEO audits on all published articles',
    schedule: '0 2 * * 0', // 2 AM every Sunday
    isActive: true,
    lastRun: '2024-01-07T02:00:00Z',
    nextRun: '2024-01-14T02:00:00Z',
    status: 'idle',
    successCount: 12,
    failureCount: 0,
    duration: 45,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z'
  },
  {
    id: '3',
    name: 'Analytics Sync',
    type: 'sync',
    description: 'Sync data from Google Analytics and Search Console',
    schedule: '0 */6 * * *', // Every 6 hours
    isActive: true,
    lastRun: '2024-01-12T12:00:00Z',
    nextRun: '2024-01-12T18:00:00Z',
    status: 'running',
    successCount: 234,
    failureCount: 8,
    duration: 15,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z'
  },
  {
    id: '4',
    name: 'Database Backup',
    type: 'backup',
    description: 'Create automated backups of the database',
    schedule: '0 1 * * *', // 1 AM daily
    isActive: true,
    lastRun: '2024-01-12T01:00:00Z',
    nextRun: '2024-01-13T01:00:00Z',
    status: 'completed',
    successCount: 90,
    failureCount: 1,
    duration: 30,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z'
  }
]

const mockSchedules: PublishingSchedule[] = [
  {
    id: '1',
    name: 'Daily Food Reviews',
    contentType: 'restaurant-review',
    frequency: 'daily',
    time: '10:00',
    isActive: true,
    nextPublish: '2024-01-13T10:00:00Z',
    articlesQueue: 12,
    lastPublished: '2024-01-12T10:00:00Z'
  },
  {
    id: '2',
    name: 'Weekly Travel Guides',
    contentType: 'travel-guide',
    frequency: 'weekly',
    time: '08:00',
    days: ['Monday', 'Thursday'],
    isActive: true,
    nextPublish: '2024-01-15T08:00:00Z',
    articlesQueue: 5,
    lastPublished: '2024-01-11T08:00:00Z'
  },
  {
    id: '3',
    name: 'Monthly Event Coverage',
    contentType: 'event-coverage',
    frequency: 'monthly',
    time: '12:00',
    days: ['1st'],
    isActive: false,
    nextPublish: '2024-02-01T12:00:00Z',
    articlesQueue: 2
  }
]

export default function AutomationHubPage() {
  const [jobs, setJobs] = useState<AutomationJob[]>(mockJobs)
  const [schedules, setSchedules] = useState<PublishingSchedule[]>(mockSchedules)
  const [activeTab, setActiveTab] = useState<'jobs' | 'schedules'>('jobs')
  const [selectedJobType, setSelectedJobType] = useState('all')
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)

  const jobTypeColors = {
    'content-generation': 'bg-blue-100 text-blue-800',
    'seo-audit': 'bg-green-100 text-green-800',
    'publishing': 'bg-purple-100 text-purple-800',
    'backup': 'bg-orange-100 text-orange-800',
    'sync': 'bg-cyan-100 text-cyan-800',
    'cleanup': 'bg-gray-100 text-gray-800'
  }

  const statusColors = {
    'idle': 'bg-gray-100 text-gray-800',
    'running': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  }

  const jobTypeIcons = {
    'content-generation': FileText,
    'seo-audit': Search,
    'publishing': Upload,
    'backup': Database,
    'sync': Globe,
    'cleanup': Trash2
  }

  const filteredJobs = selectedJobType === 'all' 
    ? jobs 
    : jobs.filter(job => job.type === selectedJobType)

  const handleToggleJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, isActive: !job.isActive } : job
    ))
  }

  const handleRunJob = (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { 
        ...job, 
        status: 'running' as const,
        lastRun: new Date().toISOString()
      } : job
    ))

    // Simulate job completion
    setTimeout(() => {
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { 
          ...job, 
          status: 'completed' as const,
          successCount: job.successCount + 1,
          duration: Math.floor(Math.random() * 120) + 30
        } : job
      ))
    }, 3000)
  }

  const handleToggleSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId ? { ...schedule, isActive: !schedule.isActive } : schedule
    ))
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const formatSchedule = (schedule: string) => {
    // Convert cron to human readable
    const parts = schedule.split(' ')
    if (parts.length === 5) {
      const [minute, hour, day, month, weekday] = parts
      if (minute === '0' && hour !== '*') {
        return `Daily at ${hour}:00`
      }
      if (weekday !== '*') {
        return `Weekly on ${weekday === '0' ? 'Sunday' : 'Day ' + weekday} at ${hour}:${minute}`
      }
    }
    return schedule
  }

  return (
    <PremiumAdminLayout 
      title="Automation Hub"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Automation Hub' }
      ]}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsCreatingSchedule(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
          <Button 
            onClick={() => setIsCreatingJob(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {jobs.filter(j => j.isActive).length}
                  </p>
                </div>
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Running Now</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {jobs.filter(j => j.status === 'running').length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round((jobs.reduce((acc, j) => acc + j.successCount, 0) / 
                    (jobs.reduce((acc, j) => acc + j.successCount + j.failureCount, 0) || 1)) * 100)}%
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
                  <p className="text-sm font-medium text-gray-600">Scheduled Content</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {schedules.reduce((acc, s) => acc + s.articlesQueue, 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'jobs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('jobs')}
            className="px-4 py-2"
          >
            <Activity className="h-4 w-4 mr-2" />
            Background Jobs
          </Button>
          <Button
            variant={activeTab === 'schedules' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('schedules')}
            className="px-4 py-2"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Publishing Schedules
          </Button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Background Jobs
                </CardTitle>
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="content-generation">Content Generation</SelectItem>
                    <SelectItem value="seo-audit">SEO Audit</SelectItem>
                    <SelectItem value="publishing">Publishing</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                    <SelectItem value="sync">Sync</SelectItem>
                    <SelectItem value="cleanup">Cleanup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const IconComponent = jobTypeIcons[job.type]
                  return (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent className="h-5 w-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-900">{job.name}</h3>
                            <Badge className={jobTypeColors[job.type]}>
                              {job.type.replace('-', ' ')}
                            </Badge>
                            <Badge className={statusColors[job.status]}>
                              {job.status}
                            </Badge>
                            {job.isActive ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-xs text-gray-500">Inactive</span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Schedule:</span>
                              <p className="text-gray-800">{formatSchedule(job.schedule)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Success/Failures:</span>
                              <p className="text-gray-800">{job.successCount}/{job.failureCount}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Last Run:</span>
                              <p className="text-gray-800">
                                {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Duration:</span>
                              <p className="text-gray-800">{formatDuration(job.duration)}</p>
                            </div>
                          </div>
                          
                          {job.nextRun && (
                            <div className="mt-2 text-xs">
                              <span className="font-medium text-gray-600">Next Run:</span>
                              <span className="ml-1 text-gray-800">
                                {new Date(job.nextRun).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRunJob(job.id)}
                            disabled={job.status === 'running' || !job.isActive}
                          >
                            {job.status === 'running' ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleJob(job.id)}
                          >
                            {job.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Publishing Schedules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="h-5 w-5 text-gray-600" />
                          <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                          <Badge variant="outline">
                            {schedule.contentType}
                          </Badge>
                          <Badge className={schedule.frequency === 'daily' ? 'bg-blue-100 text-blue-800' : 
                                          schedule.frequency === 'weekly' ? 'bg-green-100 text-green-800' : 
                                          'bg-purple-100 text-purple-800'}>
                            {schedule.frequency}
                          </Badge>
                          {schedule.isActive ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-xs text-gray-500">Inactive</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="font-medium text-gray-600">Frequency:</span>
                            <p className="text-gray-800 capitalize">
                              {schedule.frequency} at {schedule.time}
                              {schedule.days && schedule.days.length > 0 && 
                                ` (${schedule.days.join(', ')})`}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Articles in Queue:</span>
                            <p className="text-gray-800">{schedule.articlesQueue}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Next Publish:</span>
                            <p className="text-gray-800">
                              {schedule.nextPublish ? 
                                new Date(schedule.nextPublish).toLocaleString() : 
                                'Not scheduled'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Last Published:</span>
                            <p className="text-gray-800">
                              {schedule.lastPublished ? 
                                new Date(schedule.lastPublished).toLocaleDateString() : 
                                'Never'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleSchedule(schedule.id)}
                        >
                          {schedule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Job Scheduler</p>
                  <p className="text-xs text-gray-500">Running normally</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Content Generation</p>
                  <p className="text-xs text-gray-500">3 articles generated today</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">External APIs</p>
                  <p className="text-xs text-gray-500">1 service degraded</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Job Modal */}
      {isCreatingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Automation Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Job Name</label>
                <Input placeholder="Enter job name..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Job Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content-generation">Content Generation</SelectItem>
                    <SelectItem value="seo-audit">SEO Audit</SelectItem>
                    <SelectItem value="publishing">Publishing</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                    <SelectItem value="sync">Sync</SelectItem>
                    <SelectItem value="cleanup">Cleanup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Schedule (Cron)</label>
                <Input placeholder="0 9 * * * (9 AM daily)" />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreatingJob(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Create Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Schedule Modal */}
      {isCreatingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Create Publishing Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Schedule Name</label>
                <Input placeholder="Enter schedule name..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel-guide">Travel Guide</SelectItem>
                    <SelectItem value="restaurant-review">Restaurant Review</SelectItem>
                    <SelectItem value="event-coverage">Event Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Frequency</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Input type="time" />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreatingSchedule(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Create Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PremiumAdminLayout>
  )
}