
/**
 * Phase 4B Topic Manager Component
 * Admin interface for managing AI-researched topics
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Search, Star, Tag, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isFeatureEnabled } from '@/config/feature-flags';

interface TopicProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  keywords: string[];
  searchIntent: string;
  locale: string;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  source: string;
  createdAt: string;
  metadata?: any;
}

interface TopicStats {
  total: number;
  pending: number;
  approved: number;
  used: number;
  rejected: number;
}

export function TopicManager() {
  const [topics, setTopics] = useState<TopicProposal[]>([]);
  const [stats, setStats] = useState<TopicStats>({ total: 0, pending: 0, approved: 0, used: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Check if features are enabled
  const isPhase4BEnabled = isFeatureEnabled('PHASE4B_ENABLED');
  const isTopicResearchEnabled = isFeatureEnabled('TOPIC_RESEARCH');

  useEffect(() => {
    if (isPhase4BEnabled) {
      fetchTopics();
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
      calculateStats(data.topics || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (topicList: TopicProposal[]) => {
    const stats = topicList.reduce((acc, topic) => {
      acc.total++;
      acc[topic.status as keyof TopicStats]++;
      return acc;
    }, { total: 0, pending: 0, approved: 0, used: 0, rejected: 0 });
    
    setStats(stats);
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
        body: JSON.stringify({
          category,
          locale: 'en'
        })
      });

      if (!response.ok) throw new Error('Research failed');

      const data = await response.json();
      await fetchTopics(); // Refresh the list
      
      alert(`Successfully researched ${data.count} new topics for ${category}`);
    } catch (error) {
      console.error('Research error:', error);
      alert('Failed to research topics. Please try again.');
    } finally {
      setResearching(false);
    }
  };

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    try {
      // This would be an actual API call in a real implementation
      const response = await fetch(`/api/phase4b/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setTopics(topics.map(t => 
          t.id === topicId ? { ...t, status: newStatus as any } : t
        ));
      }
    } catch (error) {
      console.error('Error updating topic status:', error);
    }
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'used': return <Star className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Topic Manager</h1>
          <p className="text-gray-600">AI-powered topic research and content planning</p>
        </div>
        <Button 
          onClick={() => runTopicResearch('london_travel')} 
          disabled={researching || !isTopicResearchEnabled}
          className="flex items-center gap-2"
        >
          {researching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Research Topics
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Topics</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Used</p>
                <p className="text-2xl font-bold text-blue-600">{stats.used}</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Research Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Research</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['london_travel', 'london_events', 'london_football', 'london_hidden_gems'].map((category) => (
              <Button
                key={category}
                variant="outline"
                onClick={() => runTopicResearch(category)}
                disabled={researching || !isTopicResearchEnabled}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {category.replace('london_', '').replace('_', ' ').toUpperCase()}
              </Button>
            ))}
          </div>
          {!isTopicResearchEnabled && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Topic research is disabled. Enable FEATURE_TOPIC_RESEARCH to use this feature.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="london_travel">London Travel</SelectItem>
                <SelectItem value="london_events">London Events</SelectItem>
                <SelectItem value="london_football">London Football</SelectItem>
                <SelectItem value="london_hidden_gems">Hidden Gems</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchTopics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
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
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading topics...</p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No topics found. Try running topic research.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{topic.title}</h3>
                        <Badge className={`${getStatusColor(topic.status)} flex items-center gap-1`}>
                          {getStatusIcon(topic.status)}
                          {topic.status}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {topic.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {topic.category}
                        </span>
                        <span>{topic.searchIntent}</span>
                        <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                      </div>
                      {topic.keywords && topic.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {topic.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTopicStatus(topic.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTopicStatus(topic.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TopicManager;
