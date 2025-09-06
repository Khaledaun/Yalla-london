
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Eye, 
  Send,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Plus,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface ScheduledContent {
  id: string;
  title: string;
  content: string;
  contentType: string;
  language: string;
  category?: string;
  tags: string[];
  scheduledTime: string;
  publishedTime?: string;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  platform?: string;
  createdAt: string;
}

interface ContentCalendarProps {
  className?: string;
}

export function ContentCalendar({ className }: ContentCalendarProps) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchScheduledContent();
  }, []);

  const fetchScheduledContent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/scheduled-content');
      const result = await response.json();
      
      if (result.success) {
        setScheduledContent(result.content);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled content:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateContentStatus = async (contentId: string, status: string) => {
    try {
      const response = await fetch('/api/admin/scheduled-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, status })
      });

      if (response.ok) {
        setScheduledContent(prev => 
          prev.map(item => 
            item.id === contentId ? { ...item, status: status as any } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to update content status:', error);
    }
  };

  const deleteScheduledContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/admin/scheduled-content?id=${contentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setScheduledContent(prev => prev.filter(item => item.id !== contentId));
      }
    } catch (error) {
      console.error('Failed to delete scheduled content:', error);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getContentForDate = (date: Date) => {
    return scheduledContent.filter(content => 
      isSameDay(parseISO(content.scheduledTime), date) &&
      (filterStatus === 'all' || content.status === filterStatus) &&
      (filterType === 'all' || content.contentType === filterType)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'blog_post': return '📝';
      case 'instagram_post': return '📸';
      case 'tiktok_video': return '🎬';
      case 'social_post': return '💬';
      default: return '📄';
    }
  };

  const statusCounts = scheduledContent.reduce((acc, content) => {
    acc[content.status] = (acc[content.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Content Calendar</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50">
            {statusCounts.pending || 0} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            {statusCounts.published || 0} Published
          </Badge>
          <Button size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1 border rounded-lg text-sm"
              >
                <option value="all">All Types</option>
                <option value="blog_post">Blog Posts</option>
                <option value="instagram_post">Instagram</option>
                <option value="tiktok_video">TikTok</option>
                <option value="social_post">Social</option>
              </select>
            </div>

            {/* Calendar Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Week of {format(getWeekDays()[0], 'MMM d, yyyy')}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                    >
                      Next →
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {/* Headers */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="p-2 text-center font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar Days */}
                  {getWeekDays().map((date, index) => {
                    const dayContent = getContentForDate(date);
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[120px] p-2 border rounded-lg ${
                          isToday ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-2 ${
                          isToday ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {format(date, 'd')}
                        </div>
                        
                        <div className="space-y-1">
                          {dayContent.slice(0, 3).map(content => (
                            <motion.div
                              key={content.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-1 rounded text-xs cursor-pointer ${getStatusColor(content.status)}`}
                              title={content.title}
                            >
                              <div className="flex items-center gap-1">
                                <span>{getContentTypeIcon(content.contentType)}</span>
                                <span className="truncate font-medium">
                                  {content.title.slice(0, 20)}...
                                </span>
                              </div>
                              <div className="text-xs opacity-75">
                                {format(parseISO(content.scheduledTime), 'HH:mm')}
                              </div>
                            </motion.div>
                          ))}
                          
                          {dayContent.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayContent.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Content List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledContent
                  .filter(content => 
                    (filterStatus === 'all' || content.status === filterStatus) &&
                    (filterType === 'all' || content.contentType === filterType)
                  )
                  .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
                  .map(content => (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getContentTypeIcon(content.contentType)}</span>
                            <h4 className="font-semibold text-lg">{content.title}</h4>
                            <Badge className={getStatusColor(content.status)}>
                              {content.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(content.scheduledTime), 'MMM d, yyyy HH:mm')}
                              </span>
                              <span>Language: {content.language.toUpperCase()}</span>
                              {content.category && <span>Category: {content.category}</span>}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {content.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {content.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{content.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          
                          {content.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateContentStatus(content.id, 'cancelled')}
                              >
                                <PauseCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateContentStatus(content.id, 'published')}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Publish Now
                              </Button>
                            </>
                          )}
                          
                          {content.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateContentStatus(content.id, 'pending')}
                            >
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Resume
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteScheduledContent(content.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {content.content.length > 200 
                          ? content.content.substring(0, 200) + '...'
                          : content.content
                        }
                      </div>
                    </motion.div>
                  ))}
                
                {scheduledContent.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled content yet. Start by generating and scheduling some content!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.pending || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Published</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.published || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.failed || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <PauseCircle className="h-8 w-8 text-gray-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.cancelled || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Content Types</h4>
                      <div className="space-y-2">
                        {Object.entries(
                          scheduledContent.reduce((acc, content) => {
                            acc[content.contentType] = (acc[content.contentType] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Languages</h4>
                      <div className="space-y-2">
                        {Object.entries(
                          scheduledContent.reduce((acc, content) => {
                            acc[content.language] = (acc[content.language] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([lang, count]) => (
                          <div key={lang} className="flex justify-between items-center">
                            <span className="text-sm uppercase">{lang}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">This Week</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Scheduled</span>
                          <Badge variant="outline">
                            {scheduledContent.filter(c => {
                              const scheduleDate = parseISO(c.scheduledTime);
                              const now = new Date();
                              const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                              const weekEnd = addDays(weekStart, 7);
                              return scheduleDate >= weekStart && scheduleDate < weekEnd;
                            }).length}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Published</span>
                          <Badge variant="outline">
                            {scheduledContent.filter(c => 
                              c.status === 'published' && 
                              c.publishedTime &&
                              parseISO(c.publishedTime) >= startOfWeek(new Date(), { weekStartsOn: 1 })
                            ).length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
