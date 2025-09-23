'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar,
  TrendingUp,
  FileText,
  Search,
  Zap,
  RefreshCw
} from 'lucide-react';

interface AutomationStatus {
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  success_rate: number;
  total_runs: number;
}

interface NextOperation {
  type: string;
  title: string;
  scheduled_for: string;
  status: string;
  priority: string;
  details: any;
}

interface CronJob {
  endpoint: string;
  schedule: string;
  last_success: string | null;
  last_failure: string | null;
  success_rate: number;
  avg_execution_time: number;
}

interface PipelineStats {
  total_content: number;
  published_content: number;
  scheduled_content: number;
  pending_topics: number;
  approved_topics: number;
  in_progress_topics: number;
  seo_audits_completed: number;
  automation_runs_today: number;
}

interface PipelineData {
  automation_status: {
    topic_generation: AutomationStatus;
    auto_publishing: AutomationStatus;
    content_pipeline: AutomationStatus;
    seo_audit: AutomationStatus;
  };
  next_operations: NextOperation[];
  cron_effectiveness: {
    auto_generate: CronJob;
    daily_publish: CronJob;
    seo_audit: CronJob;
  };
  pipeline_stats: PipelineStats;
  last_updated: string;
}

export default function PipelineTab() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPipelineData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/pipeline?include_history=true');
      const data = await response.json();
      
      if (data.success) {
        setPipelineData(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch pipeline data');
      }
    } catch (err) {
      setError('Failed to fetch pipeline data');
      console.error('Pipeline fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const triggerOperation = async (operation: string, parameters?: any) => {
    try {
      const response = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation, parameters }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh data after successful operation
        await fetchPipelineData();
        return true;
      } else {
        setError(data.error || 'Operation failed');
        return false;
      }
    } catch (err) {
      setError('Failed to trigger operation');
      console.error('Operation error:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSchedule = (schedule: string) => {
    const scheduleMap: { [key: string]: string } = {
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 10 * * *': 'Daily at 10:00 AM',
      '0 10 * * 1': 'Weekly on Mondays at 10:00 AM',
      '0 */6 * * *': 'Every 6 hours',
      '0 0 * * 0': 'Weekly on Sundays at midnight'
    };
    return scheduleMap[schedule] || schedule;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading pipeline data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <XCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
        <Button onClick={fetchPipelineData} className="ml-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-yellow-500" />
        <span className="ml-2">No pipeline data available</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automation Pipeline</h2>
          <p className="text-gray-600">Monitor and manage your content automation system</p>
        </div>
        <Button 
          onClick={fetchPipelineData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold">{pipelineData.pipeline_stats.total_content}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold">{pipelineData.pipeline_stats.published_content}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{pipelineData.pipeline_stats.scheduled_content}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Runs Today</p>
                <p className="text-2xl font-bold">{pipelineData.pipeline_stats.automation_runs_today}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="automation">Automation Status</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Next Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineData.next_operations.slice(0, 5).map((operation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(operation.status)}
                        <div>
                          <p className="font-medium">{operation.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(operation.scheduled_for).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(operation.priority)}>
                        {operation.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Topic Proposals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Topic Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending Topics</span>
                    <span className="font-medium">{pipelineData.pipeline_stats.pending_topics}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Approved Topics</span>
                    <span className="font-medium">{pipelineData.pipeline_stats.approved_topics}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="font-medium">{pipelineData.pipeline_stats.in_progress_topics}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">SEO Audits</span>
                    <span className="font-medium">{pipelineData.pipeline_stats.seo_audits_completed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Status Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(pipelineData.automation_status).map(([key, status]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <Badge variant={status.enabled ? 'default' : 'secondary'}>
                      {status.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-medium">{status.success_rate}%</span>
                    </div>
                    <Progress value={status.success_rate} className="h-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Runs</span>
                      <span className="font-medium">{status.total_runs}</span>
                    </div>
                    {status.last_run && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Run</span>
                        <span className="text-sm">{new Date(status.last_run).toLocaleString()}</span>
                      </div>
                    )}
                    {status.next_run && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Next Run</span>
                        <span className="text-sm">{new Date(status.next_run).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineData.next_operations.map((operation, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(operation.status)}
                        <h3 className="font-medium">{operation.title}</h3>
                      </div>
                      <Badge className={getPriorityColor(operation.priority)}>
                        {operation.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Scheduled for: {new Date(operation.scheduled_for).toLocaleString()}
                    </p>
                    {operation.details && (
                      <div className="text-sm text-gray-500">
                        {operation.type === 'topic_generation' && (
                          <div>
                            <p>Keywords: {operation.details.keywords?.join(', ')}</p>
                            <p>Longtails: {operation.details.longtails?.slice(0, 3).join(', ')}...</p>
                          </div>
                        )}
                        {operation.type === 'seo_audit' && (
                          <div>
                            <p>Scope: {operation.details.scope}</p>
                            <p>Focus Areas: {operation.details.focus_areas?.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="cron" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(pipelineData.cron_effectiveness).map(([key, job]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-sm">{key.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Schedule</span>
                      <span className="text-sm font-medium">{formatSchedule(job.schedule)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="font-medium">{job.success_rate}%</span>
                    </div>
                    <Progress value={job.success_rate} className="h-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Time</span>
                      <span className="text-sm">{job.avg_execution_time}ms</span>
                    </div>
                    {job.last_success && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Success</span>
                        <span className="text-sm">{new Date(job.last_success).toLocaleString()}</span>
                      </div>
                    )}
                    {job.last_failure && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Failure</span>
                        <span className="text-sm text-red-600">{new Date(job.last_failure).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Manual Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => triggerOperation('generate_topics', { count: 5 })}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Generate Topics
            </Button>
            <Button 
              onClick={() => triggerOperation('publish_scheduled')}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Publish Scheduled
            </Button>
            <Button 
              onClick={() => triggerOperation('seo_audit', { scope: 'all_published_content' })}
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Run SEO Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {new Date(pipelineData.last_updated).toLocaleString()}
      </div>
    </div>
  );
}
