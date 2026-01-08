'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  Send,
  FileText,
  TrendingUp,
  RefreshCw,
  Loader2,
  ArrowRight,
  Eye,
  Zap,
  BarChart3,
  Target,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QueuedTopic {
  id: string;
  title: string;
  locale: string;
  primaryKeyword: string;
  status: string;
  confidenceScore: number | null;
  plannedAt: string | null;
  pageType: string;
  hasScheduledContent: boolean;
  scheduledTime?: string;
}

interface ContentPerformance {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  seoScore: number | null;
  searchMetrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  };
  indexingStatus: {
    isIndexed: boolean;
    lastCrawled: string | null;
  };
}

interface BulkPublishStatus {
  readyToPublish: number;
  scheduled: number;
  published: number;
  failed: number;
}

export function WorkflowControlDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);

  // Queue state
  const [queuedTopics, setQueuedTopics] = useState<QueuedTopic[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Performance state
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [performanceAggregate, setPerformanceAggregate] = useState<any>(null);

  // Bulk publish state
  const [bulkStatus, setBulkStatus] = useState<BulkPublishStatus | null>(null);
  const [readyContent, setReadyContent] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [localeFilter, setLocaleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch queue data
  const fetchQueueData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/topics/queue?status=queued&limit=50');
      const data = await response.json();

      if (data.success) {
        setQueuedTopics(data.queue.topics);
        setQueueStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  }, []);

  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    try {
      const response = await fetch('/api/seo/content-performance?limit=20&sort=impressions');
      const data = await response.json();

      if (data.success) {
        setContentPerformance(data.content);
        setPerformanceAggregate(data.aggregate);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  }, []);

  // Fetch bulk publish status
  const fetchBulkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/content/bulk-publish');
      const data = await response.json();

      if (data.success) {
        setBulkStatus(data.status);
        setReadyContent(data.readyContent);
      }
    } catch (error) {
      console.error('Failed to fetch bulk status:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchQueueData(),
        fetchPerformanceData(),
        fetchBulkStatus(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchQueueData, fetchPerformanceData, fetchBulkStatus]);

  // Queue a topic for content generation
  const queueTopicsForGeneration = async (topicIds: string[], generateImmediately = false) => {
    try {
      const response = await fetch('/api/admin/topics/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicIds,
          priority: 'medium',
          generateImmediately,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchQueueData();
        setSelectedTopics([]);
      }

      return data;
    } catch (error) {
      console.error('Failed to queue topics:', error);
      return { success: false, error: 'Failed to queue topics' };
    }
  };

  // Bulk publish selected content
  const handleBulkPublish = async (action: string = 'publish_now') => {
    if (selectedContent.length === 0) return;

    setBulkPublishing(true);

    try {
      const response = await fetch('/api/content/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIds: selectedContent,
          contentType: 'scheduled_content',
          action,
          options: {
            triggerSeoAudit: true,
            submitToSearchConsole: true,
            submitToIndexNow: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchBulkStatus();
        setSelectedContent([]);
      }

      return data;
    } catch (error) {
      console.error('Bulk publish failed:', error);
    } finally {
      setBulkPublishing(false);
    }
  };

  // Toggle topic selection
  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Toggle content selection
  const toggleContentSelection = (contentId: string) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  // Select all topics
  const selectAllTopics = () => {
    if (selectedTopics.length === queuedTopics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(queuedTopics.map(t => t.id));
    }
  };

  // Select all content
  const selectAllContent = () => {
    if (selectedContent.length === readyContent.length) {
      setSelectedContent([]);
    } else {
      setSelectedContent(readyContent.map(c => c.id));
    }
  };

  // Filter topics
  const filteredTopics = queuedTopics.filter(topic => {
    if (statusFilter !== 'all' && topic.status !== statusFilter) return false;
    if (localeFilter !== 'all' && topic.locale !== localeFilter) return false;
    if (searchQuery && !topic.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading workflow data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Queued Topics</p>
                <p className="text-2xl font-bold">{queueStats?.queued || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p className="text-2xl font-bold">{queueStats?.published || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Impressions</p>
                <p className="text-2xl font-bold">
                  {performanceAggregate?.totalImpressions?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Position</p>
                <p className="text-2xl font-bold">
                  {performanceAggregate?.averagePosition?.toFixed(1) || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Topic Queue
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Bulk Publish
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* Topic Queue Tab */}
        <TabsContent value="queue" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Generation Queue</CardTitle>
                  <CardDescription>
                    Manage topics queued for AI content generation
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchQueueData}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {selectedTopics.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => queueTopicsForGeneration(selectedTopics, true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {selectedTopics.length} Now
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={localeFilter} onValueChange={setLocaleFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <Checkbox
                  checked={selectedTopics.length === filteredTopics.length && filteredTopics.length > 0}
                  onCheckedChange={selectAllTopics}
                />
                <span className="text-sm text-gray-600">
                  Select all ({filteredTopics.length} topics)
                </span>
              </div>

              {/* Topic List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredTopics.map((topic, index) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                        selectedTopics.includes(topic.id) ? 'border-blue-300 bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTopics.includes(topic.id)}
                          onCheckedChange={() => toggleTopicSelection(topic.id)}
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{topic.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {topic.locale.toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                topic.status === 'queued' ? 'bg-blue-100' :
                                topic.status === 'generated' ? 'bg-green-100' :
                                'bg-gray-100'
                              }`}
                            >
                              {topic.status}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-500 mb-2">
                            Keyword: <span className="font-medium">{topic.primaryKeyword}</span>
                            {' • '}
                            Type: <span className="font-medium">{topic.pageType}</span>
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            {topic.confidenceScore && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Confidence: {(topic.confidenceScore * 100).toFixed(0)}%
                              </span>
                            )}
                            {topic.plannedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Scheduled: {new Date(topic.plannedAt).toLocaleDateString()}
                              </span>
                            )}
                            {topic.hasScheduledContent && (
                              <Badge variant="secondary" className="text-xs">
                                Content Scheduled
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => queueTopicsForGeneration([topic.id], true)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredTopics.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No topics in queue. Generate new topics from the Topics page.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Publish Tab */}
        <TabsContent value="publish" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bulk Publishing</CardTitle>
                  <CardDescription>
                    Publish multiple content items at once
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchBulkStatus}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {selectedContent.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleBulkPublish('publish_now')}
                      disabled={bulkPublishing}
                    >
                      {bulkPublishing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Publish {selectedContent.length} Items
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Status Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{bulkStatus?.readyToPublish || 0}</p>
                  <p className="text-sm text-blue-600">Ready to Publish</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{bulkStatus?.scheduled || 0}</p>
                  <p className="text-sm text-yellow-600">Scheduled</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{bulkStatus?.published || 0}</p>
                  <p className="text-sm text-green-600">Published</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{bulkStatus?.failed || 0}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <Checkbox
                  checked={selectedContent.length === readyContent.length && readyContent.length > 0}
                  onCheckedChange={selectAllContent}
                />
                <span className="text-sm text-gray-600">
                  Select all ({readyContent.length} items ready)
                </span>
              </div>

              {/* Content List */}
              <div className="space-y-3">
                {readyContent.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                      selectedContent.includes(content.id) ? 'border-blue-300 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedContent.includes(content.id)}
                        onCheckedChange={() => toggleContentSelection(content.id)}
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{content.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {content.language?.toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              content.status === 'pending' ? 'bg-yellow-100' :
                              content.status === 'generated' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}
                          >
                            {content.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled: {new Date(content.scheduledTime).toLocaleString()}
                          </span>
                          {content.seoScore && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              SEO: {content.seoScore}%
                            </span>
                          )}
                          <span>{content.contentType}</span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {readyContent.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No content ready for publishing. Generate content from queued topics first.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>
                Track SEO metrics from Google Search Console
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Aggregate Stats */}
              {performanceAggregate && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Total Clicks</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {performanceAggregate.totalClicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Avg CTR</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {performanceAggregate.averageCTR.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Indexed Pages</p>
                    <p className="text-2xl font-bold text-green-700">
                      {performanceAggregate.indexedPages}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">Avg SEO Score</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {performanceAggregate.averageSeoScore.toFixed(0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Content Performance List */}
              <div className="space-y-3">
                {contentPerformance.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{content.title}</h4>
                          {content.indexingStatus.isIndexed ? (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                              Indexed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                              Not Indexed
                            </Badge>
                          )}
                        </div>

                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {content.url}
                        </a>
                      </div>

                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-xl font-bold text-gray-800">
                            {content.searchMetrics.impressions.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Impressions</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-800">
                            {content.searchMetrics.clicks}
                          </p>
                          <p className="text-xs text-gray-500">Clicks</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-800">
                            {content.searchMetrics.ctr.toFixed(2)}%
                          </p>
                          <p className="text-xs text-gray-500">CTR</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-800">
                            {content.searchMetrics.position.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500">Position</p>
                        </div>
                        {content.seoScore && (
                          <div>
                            <Progress value={content.seoScore} className="w-16 h-2" />
                            <p className="text-xs text-gray-500 mt-1">SEO {content.seoScore}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {contentPerformance.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No performance data available. Publish content to start tracking metrics.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Workflow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Automation Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Daily Trends Monitor</p>
                        <p className="text-xs text-gray-500">Runs at 6 AM daily</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Auto Content Generation</p>
                        <p className="text-xs text-gray-500">Runs hourly</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Daily Publisher</p>
                        <p className="text-xs text-gray-500">Runs at 10 AM daily</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">SEO Health Report</p>
                        <p className="text-xs text-gray-500">Runs at 2 AM daily</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Topics from Trends
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Content for All Queued Topics
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Publish All Ready Content
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Full Workflow Cycle
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate SEO Health Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
