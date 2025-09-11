
/**
 * Phase 4B Content Pipeline Component
 * Admin interface for monitoring and controlling automated content generation
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Play, 
  Pause, 
  Settings,
  TrendingUp,
  FileText,
  Eye,
  Calendar,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { isFeatureEnabled } from '@/config/feature-flags';

interface PipelineStatus {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  draftsCount: number;
  scheduledCount: number;
  publishedToday: number;
  errors: string[];
  performance: {
    successRate: number;
    avgGenerationTime: number;
    qualityScore: number;
  };
}

interface ContentItem {
  id: string;
  title: string;
  status: string;
  locale: string;
  category: string;
  publishedAt?: string;
  createdAt: string;
  metadata?: any;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: string;
}

export function ContentPipeline() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Check if features are enabled
  const isPhase4BEnabled = isFeatureEnabled('PHASE4B_ENABLED');
  const isContentGenerationEnabled = isFeatureEnabled('AUTO_CONTENT_GENERATION');
  const isAutoPublishingEnabled = isFeatureEnabled('AUTO_PUBLISHING');

  useEffect(() => {
    if (isPhase4BEnabled) {
      fetchPipelineStatus();
      fetchRecentContent();
      fetchCronJobs();
    }
  }, [isPhase4BEnabled]);

  const fetchPipelineStatus = async () => {
    try {
      // In a real implementation, this would call the pipeline status API
      // For now, we'll simulate the data structure
      const mockStatus: PipelineStatus = {
        isRunning: false,
        lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        draftsCount: 12,
        scheduledCount: 5,
        publishedToday: 3,
        errors: ['API rate limit exceeded for Perplexity', 'SEO audit failed for content ID: abc123'],
        performance: {
          successRate: 85.5,
          avgGenerationTime: 45,
          qualityScore: 82.3,
        },
      };
      setPipelineStatus(mockStatus);
    } catch (error) {
      console.error('Error fetching pipeline status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentContent = async () => {
    try {
      const response = await fetch('/api/phase4b/content/generate?limit=20');
      if (response.ok) {
        const data = await response.json();
        setRecentContent(data.drafts || []);
      }
    } catch (error) {
      console.error('Error fetching recent content:', error);
    }
  };

  const fetchCronJobs = async () => {
    try {
      // Mock cron jobs data
      const mockJobs: CronJob[] = [
        {
          id: 'content-pipeline',
          name: 'Content Pipeline Runner',
          schedule: '0 9,15 * * *',
          enabled: true,
          running: false,
          lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000),
          status: 'idle',
        },
        {
          id: 'topic-research',
          name: 'Topic Research',
          schedule: '0 8 * * *',
          enabled: true,
          running: false,
          lastRun: new Date(Date.now() - 8 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 16 * 60 * 60 * 1000),
          status: 'idle',
        },
        {
          id: 'analytics-refresh',
          name: 'Analytics Data Refresh',
          schedule: '0 */6 * * *',
          enabled: true,
          running: false,
          lastRun: new Date(Date.now() - 1 * 60 * 60 * 1000),
          nextRun: new Date(Date.now() + 5 * 60 * 60 * 1000),
          status: 'idle',
        },
      ];
      setCronJobs(mockJobs);
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
    }
  };

  const runPipelineNow = async () => {
    if (!isContentGenerationEnabled) {
      alert('Content generation feature is disabled');
      return;
    }

    setRunning(true);
    try {
      // This would trigger the pipeline manually
      const response = await fetch('/api/phase4b/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });

      if (response.ok) {
        await fetchPipelineStatus();
        await fetchRecentContent();
        alert('Pipeline run started successfully');
      } else {
        throw new Error('Pipeline run failed');
      }
    } catch (error) {
      console.error('Pipeline run error:', error);
      alert('Failed to start pipeline run');
    } finally {
      setRunning(false);
    }
  };

  const toggleCronJob = async (jobId: string, enabled: boolean) => {
    try {
      // This would call the cron management API
      setCronJobs(jobs => jobs.map(job => 
        job.id === jobId ? { ...job, enabled } : job
      ));
    } catch (error) {
      console.error('Error toggling cron job:', error);
    }
  };

  if (!isPhase4BEnabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Phase 4B features are currently disabled. Please enable them in your configuration.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !pipelineStatus) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading pipeline status...</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Content Pipeline</h1>
          <p className="text-gray-600">Automated content generation and publishing system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchPipelineStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={runPipelineNow} 
            disabled={running || !isContentGenerationEnabled}
            className="flex items-center gap-2"
          >
            {running ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Backlog</p>
                <p className="text-2xl font-bold">{pipelineStatus.draftsCount}</p>
                <p className="text-xs text-gray-500">Target: 30</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-500" />
            </div>
            <Progress 
              value={(pipelineStatus.draftsCount / 30) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{pipelineStatus.scheduledCount}</p>
                <p className="text-xs text-gray-500">Ready to publish</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published Today</p>
                <p className="text-2xl font-bold">{pipelineStatus.publishedToday}</p>
                <p className="text-xs text-gray-500">Target: 4/day</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress 
              value={(pipelineStatus.publishedToday / 4) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{pipelineStatus.performance.successRate}%</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Pipeline Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {pipelineStatus.performance.successRate}%
              </div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <Progress value={pipelineStatus.performance.successRate} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {pipelineStatus.performance.avgGenerationTime}s
              </div>
              <p className="text-sm text-gray-600">Avg Generation Time</p>
              <Progress value={75} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {pipelineStatus.performance.qualityScore}
              </div>
              <p className="text-sm text-gray-600">Quality Score</p>
              <Progress value={pipelineStatus.performance.qualityScore} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Recent Content</TabsTrigger>
          <TabsTrigger value="schedule">Scheduled Jobs</TabsTrigger>
          <TabsTrigger value="errors">Errors & Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Content Generated</CardTitle>
            </CardHeader>
            <CardContent>
              {recentContent.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No recent content found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentContent.slice(0, 10).map((content) => (
                    <div key={content.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{content.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Badge className={getStatusColor(content.status)}>
                            {content.status}
                          </Badge>
                          <span>{content.category}</span>
                          <span>{content.locale.toUpperCase()}</span>
                          <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cronJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{job.name}</h3>
                        <Badge variant={job.enabled ? 'default' : 'secondary'}>
                          {job.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Schedule: {job.schedule}</p>
                        {job.lastRun && (
                          <p>Last run: {new Date(job.lastRun).toLocaleString()}</p>
                        )}
                        {job.nextRun && (
                          <p>Next run: {new Date(job.nextRun).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCronJob(job.id, !job.enabled)}
                      >
                        {job.enabled ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors & Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineStatus.errors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                  <p className="text-gray-600">No recent errors</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelineStatus.errors.map((error, index) => (
                    <Alert key={index}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Flags Status */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {isContentGenerationEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Content Generation</span>
            </div>
            <div className="flex items-center gap-2">
              {isAutoPublishingEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Auto Publishing</span>
            </div>
            <div className="flex items-center gap-2">
              {isFeatureEnabled('SEO_AUTOMATION') ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>SEO Automation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContentPipeline;
