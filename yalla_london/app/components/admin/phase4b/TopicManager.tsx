/**
 * Enhanced Phase 4B Topic Manager Component
 * Admin interface for managing AI-researched topics with status tracking
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, CheckCircle, Clock, RefreshCw, Search, Star, Tag, TrendingUp, 
  Plus, Edit, Trash2, ArrowUp, ArrowDown, ExternalLink, Calendar, Globe
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface TopicProposal {
  id: string;
  locale: string;
  primary_keyword: string;
  longtails: string[];
  featured_longtails: string[];
  questions: string[];
  authority_links_json: Array<{
    url: string;
    title: string;
    sourceDomain: string;
  }>;
  intent: string;
  suggested_page_type: string;
  confidence_score: number;
  status: 'proposed' | 'approved' | 'rejected' | 'used';
  source_weights_json: {
    original_data?: {
      title?: string;
      description?: string;
      category?: string;
      priority?: number;
    };
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  // For published content tracking
  scheduled_content?: Array<{
    id: string;
    title: string;
    status: string;
    metadata?: {
      articleUrl?: string;
    };
  }>;
}

interface TopicStats {
  proposed: number;
  approved: number;
  rejected: number;
  used: number;
  total: number;
}

export function TopicManager() {
  const [topics, setTopics] = useState<TopicProposal[]>([]);
  const [stats, setStats] = useState<TopicStats>({ proposed: 0, approved: 0, rejected: 0, used: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [reasonDialog, setReasonDialog] = useState<{ topicId: string; category: string } | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');

  // Check if features are enabled
  const isPhase4BEnabled = isFeatureEnabled('PHASE4B_ENABLED');
  const isTopicResearchEnabled = isFeatureEnabled('TOPIC_RESEARCH');

  useEffect(() => {
    if (isPhase4BEnabled) {
      fetchTopics();
      fetchStats();
    }
  }, [isPhase4BEnabled, filter, selectedCategory]);

  const fetchTopics = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('limit', '100');

      const response = await fetch(`/api/phase4b/topics/research?${params}`);
      if (!response.ok) throw new Error('Failed to fetch topics');

      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/phase4b/topics/manage');
      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.stats || { proposed: 0, approved: 0, rejected: 0, used: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const runTopicResearch = async (category: string) => {
    if (!isTopicResearchEnabled) {
      alert('Topic research feature is disabled');
      return;
    }

    setResearching(true);
    try {
      const response = await fetch('/api/phase4b/topics/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, locale: 'en' }),
      });

      if (!response.ok) throw new Error('Failed to generate topics');

      const data = await response.json();
      alert(`Generated ${data.count} new topics successfully!`);
      
      // Refresh the topics list
      fetchTopics();
      fetchStats();
    } catch (error) {
      console.error('Error generating topics:', error);
      alert('Failed to generate topics. Please try again.');
    } finally {
      setResearching(false);
    }
  };

  const updateTopicStatus = async (topicId: string, newStatus: string, reason?: string) => {
    try {
      // Check if this requires a reason (consecutive same-category approval)
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;

      const category = topic.source_weights_json?.original_data?.category;
      
      if (newStatus === 'approved' && category) {
        const checkResponse = await fetch(`/api/phase4b/topics/manage?action=check_consecutive&category=${category}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.requiresReason && !reason) {
            setReasonDialog({ topicId, category });
            return;
          }
        }
      }

      const response = await fetch('/api/phase4b/topics/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          topicId,
          status: newStatus,
          reason,
        }),
      });

      if (response.ok) {
        setTopics(topics.map(t => 
          t.id === topicId ? { ...t, status: newStatus as any } : t
        ));
        fetchStats(); // Refresh stats
        setReasonDialog(null);
        setStatusChangeReason('');
      }
    } catch (error) {
      console.error('Error updating topic status:', error);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      const response = await fetch(`/api/phase4b/topics/manage?id=${topicId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTopics(topics.filter(t => t.id !== topicId));
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'used': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'proposed': return <Clock className="h-3 w-3" />;
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <AlertCircle className="h-3 w-3" />;
      case 'used': return <ExternalLink className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.primary_keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.source_weights_json?.original_data?.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!isPhase4BEnabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Phase 4B features are disabled. Enable PHASE4B_ENABLED in your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats.proposed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Published</p>
                <p className="text-2xl font-bold">{stats.used}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Research & Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button
              onClick={() => runTopicResearch('weekly_mixed')}
              disabled={researching || !isTopicResearchEnabled}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${researching ? 'animate-spin' : ''}`} />
              Generate Weekly Topics (30)
            </Button>
            
            <Button
              onClick={() => runTopicResearch('london_events')}
              disabled={researching || !isTopicResearchEnabled}
              variant="outline"
            >
              Events Research
            </Button>
            
            <Button
              onClick={() => runTopicResearch('london_travel')}
              disabled={researching || !isTopicResearchEnabled}
              variant="outline"
            >
              Travel Research
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="proposed">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="used">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Topics List */}
      <Card>
        <CardHeader>
          <CardTitle>Topics ({filteredTopics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading topics...</p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No topics found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{topic.source_weights_json?.original_data?.title || topic.primary_keyword}</h3>
                        <Badge className={`${getStatusColor(topic.status)} flex items-center gap-1`}>
                          {getStatusIcon(topic.status)}
                          {topic.status}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {topic.confidence_score ? Math.round(topic.confidence_score * 100) : 80}%
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {topic.locale}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {topic.source_weights_json?.original_data?.description || `Keywords: ${topic.longtails.slice(0, 3).join(', ')}`}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {topic.source_weights_json?.original_data?.category || topic.suggested_page_type}
                        </span>
                        <span>{topic.intent}</span>
                        <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {topic.featured_longtails && topic.featured_longtails.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.featured_longtails.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Show published article URL if available */}
                      {topic.scheduled_content && topic.scheduled_content.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-800">Published Articles:</p>
                          {topic.scheduled_content.map((content) => (
                            <div key={content.id} className="flex items-center gap-2 text-sm">
                              <ExternalLink className="h-3 w-3" />
                              <span>{content.title}</span>
                              {content.metadata?.articleUrl && (
                                <a 
                                  href={content.metadata.articleUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  View Article
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {topic.status === 'proposed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTopicStatus(topic.id, 'approved')}
                            className="text-green-600 hover:bg-green-50"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTopicStatus(topic.id, 'rejected')}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTopic(topic.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason Dialog for Consecutive Same-Category Approval */}
      {reasonDialog && (
        <Dialog open={!!reasonDialog} onOpenChange={(open) => !open && setReasonDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reason Required</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                The last approved topic was also in the "{reasonDialog.category}" category. 
                Please provide a reason for approving another topic from the same category consecutively.
              </p>
              <Textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="Enter reason (10-30 characters)"
                maxLength={30}
                minLength={10}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReasonDialog(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (statusChangeReason.length >= 10) {
                      updateTopicStatus(reasonDialog.topicId, 'approved', statusChangeReason);
                    }
                  }}
                  disabled={statusChangeReason.length < 10}
                >
                  Approve with Reason
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default TopicManager;