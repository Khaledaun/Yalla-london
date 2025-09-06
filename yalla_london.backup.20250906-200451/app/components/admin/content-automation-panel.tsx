
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Loader2, 
  FileText, 
  Calendar, 
  Send, 
  Eye,
  Clock,
  CheckCircle,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  metaDescription: string;
  metaTitle: string;
  tags: string[];
  type: string;
  language: string;
  seoScore?: number;
  createdAt: string;
}

export function ContentAutomationPanel() {
  const [activeTab, setActiveTab] = useState('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  
  // Generation parameters
  const [contentType, setContentType] = useState('blog_post');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('london-guide');
  const [keywords, setKeywords] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Scheduling parameters
  const [scheduleHours, setScheduleHours] = useState(24);
  const [autoPublish, setAutoPublish] = useState(false);

  useEffect(() => {
    fetchGeneratedContent();
  }, []);

  const fetchGeneratedContent = async () => {
    try {
      const response = await fetch('/api/content/auto-generate');
      const result = await response.json();
      
      if (result.success) {
        setGeneratedContent(result.content);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  };

  const generateNewContent = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/content/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          language,
          category,
          keywords: keywords.split(',').map(k => k.trim()),
          customPrompt: customPrompt || undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setGeneratedContent(prev => [result.content, ...prev]);
        setSelectedContent(result.content);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduleContent = async (contentId: string) => {
    try {
      const response = await fetch('/api/content/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          scheduleHours,
          autoPublish
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update UI to show scheduled status
      }
    } catch (error) {
      console.error('Scheduling failed:', error);
    }
  };

  const categories = [
    { value: 'london-guide', label: 'London Guide' },
    { value: 'food-drink', label: 'Food & Drink' },
    { value: 'events', label: 'Events' },
    { value: 'culture-art', label: 'Culture & Art' },
    { value: 'style-shopping', label: 'Style & Shopping' },
    { value: 'uk-travel', label: 'UK Travel' }
  ];

  const contentTypes = [
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'event', label: 'Event Listing' },
    { value: 'recommendation', label: 'Recommendation' },
    { value: 'social_post', label: 'Social Media Post' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Content Automation</h2>
        <Badge variant="outline" className="text-sm">
          {generatedContent.length} Generated Items
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Content Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="London, luxury, travel, guide"
                  />
                </div>

                <div>
                  <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
                  <Textarea
                    id="customPrompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add specific instructions for content generation..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={generateNewContent} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedContent ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedContent.title}</h3>
                      <p className="text-sm text-gray-600">{selectedContent.metaTitle}</p>
                    </div>
                    
                    <div>
                      <Label>Meta Description</Label>
                      <p className="text-sm bg-gray-50 p-2 rounded">{selectedContent.metaDescription}</p>
                    </div>
                    
                    <div>
                      <Label>Content Preview</Label>
                      <div 
                        className="text-sm bg-gray-50 p-2 rounded max-h-32 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: selectedContent.content.substring(0, 300) + '...' 
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedContent.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {selectedContent.seoScore && (
                      <div>
                        <Label>SEO Score</Label>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${selectedContent.seoScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{selectedContent.seoScore}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Generate content to see preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Content Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduleHours">Publish in (hours)</Label>
                  <Input
                    id="scheduleHours"
                    type="number"
                    value={scheduleHours}
                    onChange={(e) => setScheduleHours(Number(e.target.value))}
                    min="1"
                    max="168" // 1 week
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPublish"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                  />
                  <Label htmlFor="autoPublish">Auto-publish when ready</Label>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">Quick Schedule Options</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: '1 Hour', hours: 1 },
                    { label: '6 Hours', hours: 6 },
                    { label: '1 Day', hours: 24 },
                    { label: '3 Days', hours: 72 },
                    { label: '1 Week', hours: 168 }
                  ].map(option => (
                    <Button
                      key={option.hours}
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduleHours(option.hours)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Generated Content Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedContent.length > 0 ? (
                  generatedContent.map((content) => (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{content.title}</h4>
                        <Badge variant="outline">{content.type}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{content.metaDescription}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          {content.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedContent(content)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => scheduleContent(content.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No generated content yet. Start by generating some content!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Publishing Schedule</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Configure automatic content generation and publishing intervals.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Generate content every</Label>
                    <Select defaultValue="24">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="168">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Content approval required</Label>
                    <Select defaultValue="yes">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes, require approval</SelectItem>
                        <SelectItem value="no">No, auto-publish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Content Quality</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Minimum SEO score</span>
                    <Input type="number" className="w-20" defaultValue="80" min="0" max="100" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Minimum word count</span>
                    <Input type="number" className="w-24" defaultValue="500" min="100" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Include schema markup</span>
                    <input type="checkbox" defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
