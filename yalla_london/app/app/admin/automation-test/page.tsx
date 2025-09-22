'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Bot,
  TrendingUp,
  FileText,
  Search,
  Calendar,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

interface AutomationJob {
  id: string
  name: string
  description: string
  schedule: string
  status: 'active' | 'paused' | 'error' | 'pending'
  lastRun?: string
  nextRun?: string
  successRate: number
  category: 'content' | 'seo' | 'publishing' | 'analytics'
}

export default function AutomationTestPage() {
  const [jobs, setJobs] = useState<AutomationJob[]>([
    {
      id: 'weekly-topics',
      name: 'Weekly Topic Generation',
      description: 'Generate trending topics for the week',
      schedule: 'Every Monday at 9:00 AM',
      status: 'active',
      lastRun: '2024-01-15 09:00:00',
      nextRun: '2024-01-22 09:00:00',
      successRate: 95,
      category: 'content'
    },
    {
      id: 'daily-publish',
      name: 'Daily Content Publishing',
      description: 'Publish scheduled content automatically',
      schedule: 'Every day at 10:00 AM',
      status: 'active',
      lastRun: '2024-01-15 10:00:00',
      nextRun: '2024-01-16 10:00:00',
      successRate: 98,
      category: 'publishing'
    },
    {
      id: 'auto-generate',
      name: 'Auto Content Generation',
      description: 'Generate content from approved topics',
      schedule: 'Every hour',
      status: 'active',
      lastRun: '2024-01-15 14:00:00',
      nextRun: '2024-01-15 15:00:00',
      successRate: 92,
      category: 'content'
    },
    {
      id: 'seo-optimization',
      name: 'Real-time SEO Optimization',
      description: 'Optimize content for search engines',
      schedule: 'Every 30 minutes',
      status: 'active',
      lastRun: '2024-01-15 14:30:00',
      nextRun: '2024-01-15 15:00:00',
      successRate: 89,
      category: 'seo'
    },
    {
      id: 'seo-reports',
      name: 'SEO Health Reports',
      description: 'Generate daily SEO performance reports',
      schedule: 'Every day at 2:00 AM',
      status: 'active',
      lastRun: '2024-01-15 02:00:00',
      nextRun: '2024-01-16 02:00:00',
      successRate: 96,
      category: 'analytics'
    }
  ])

  const [isRunning, setIsRunning] = useState(false)

  const runJob = async (jobId: string) => {
    setIsRunning(true)
    try {
      const job = jobs.find(j => j.id === jobId)
      if (!job) return

      // Simulate API call
      const response = await fetch(`/api/cron/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-secret'}`
        }
      })

      if (response.ok) {
        toast.success(`${job.name} executed successfully!`)
        // Update job status
        setJobs(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, lastRun: new Date().toISOString(), status: 'active' as const }
            : j
        ))
      } else {
        toast.error(`Failed to execute ${job.name}`)
        setJobs(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, status: 'error' as const }
            : j
        ))
      }
    } catch (error) {
      toast.error(`Error running ${jobId}`)
      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, status: 'error' as const }
          : j
      ))
    } finally {
      setIsRunning(false)
    }
  }

  const toggleJob = (jobId: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId 
        ? { ...j, status: j.status === 'active' ? 'paused' : 'active' }
        : j
    ))
    toast.info(`Job ${jobs.find(j => j.id === jobId)?.name} ${jobs.find(j => j.id === jobId)?.status === 'active' ? 'paused' : 'activated'}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'paused':
        return <Badge variant="secondary" className="bg-yellow-500">Paused</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content':
        return <FileText className="h-4 w-4" />
      case 'seo':
        return <Search className="h-4 w-4" />
      case 'publishing':
        return <TrendingUp className="h-4 w-4" />
      case 'analytics':
        return <Calendar className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  const activeJobs = jobs.filter(j => j.status === 'active').length
  const totalJobs = jobs.length
  const averageSuccessRate = Math.round(jobs.reduce((sum, job) => sum + job.successRate, 0) / jobs.length)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Automation Workflow Test</h1>
              <p className="text-gray-600 mt-2">Test and monitor your automated content pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{activeJobs}/{totalJobs}</div>
                <div className="text-sm text-gray-600">Active Jobs</div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getSuccessRateColor(averageSuccessRate)}`}>
                  {averageSuccessRate}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{totalJobs}</div>
                  <div className="text-sm text-gray-600">Total Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{activeJobs}</div>
                  <div className="text-sm text-gray-600">Active Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{averageSuccessRate}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm text-gray-600">Automation</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automation Jobs */}
        <div className="space-y-6">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{job.name}</h3>
                        {getCategoryIcon(job.category)}
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-gray-600 mb-2">{job.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Schedule: {job.schedule}</span>
                        {job.lastRun && <span>Last run: {job.lastRun}</span>}
                        {job.nextRun && <span>Next run: {job.nextRun}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getSuccessRateColor(job.successRate)}`}>
                        {job.successRate}%
                      </div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleJob(job.id)}
                        disabled={isRunning}
                      >
                        {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runJob(job.id)}
                        disabled={isRunning}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Business Model Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              "Launch & Forget" Business Model Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">Content Generation</div>
                <div className="text-xs text-gray-500 mt-1">Automated topic research & content creation</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">Publishing Pipeline</div>
                <div className="text-xs text-gray-500 mt-1">Scheduled content publishing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">✅</div>
                <div className="text-sm font-medium">SEO Optimization</div>
                <div className="text-xs text-gray-500 mt-1">Real-time SEO improvements</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Your automation workflow is fully operational!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                All critical automation jobs are running successfully. Your "launch and forget" business model is active.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
