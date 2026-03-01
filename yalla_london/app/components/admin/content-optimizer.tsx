
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Eye, 
  Search, 
  Target, 
  BarChart3, 
  Globe,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SEOPreview {
  title: string;
  description: string;
  url: string;
}

interface ContentAnalysis {
  readabilityScore: number;
  keywordDensity: { [key: string]: number };
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  headingStructure: { level: number; text: string }[];
  suggestions: string[];
}

export function ContentOptimizer() {
  const [activeTab, setActiveTab] = useState('editor');
  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [seoPreview, setSeoPreview] = useState<SEOPreview>({ title: '', description: '', url: '' });

  const generateSEOTitle = async () => {
    if (!content) return;

    try {
      const response = await fetch('/api/seo/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, language, keywords }),
      });

      const result = await response.json();
      if (result.success) {
        setTitle(result.title);
        updateSEOPreview({ title: result.title });
      }
    } catch (error) {
      console.error('Failed to generate SEO title:', error);
    }
  };

  const generateMetaDescription = async () => {
    if (!content) return;

    try {
      const response = await fetch('/api/seo/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, language }),
      });

      const result = await response.json();
      if (result.success) {
        setMetaDescription(result.description);
        updateSEOPreview({ description: result.description });
      }
    } catch (error) {
      console.error('Failed to generate meta description:', error);
    }
  };

  const generateSlug = (titleText: string = title) => {
    const slug = titleText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(slug);
    updateSEOPreview({ url: slug });
  };

  const analyzeContent = async () => {
    if (!content) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/seo/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          title, 
          keywords: keywords.split(',').map(k => k.trim()),
          language 
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Failed to analyze content:', error);
    }
    setIsAnalyzing(false);
  };

  const optimizeContent = async () => {
    if (!content) return;

    try {
      const response = await fetch('/api/seo/optimize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          title, 
          keywords: keywords.split(',').map(k => k.trim()),
          language 
        }),
      });

      const result = await response.json();
      if (result.success) {
        setContent(result.optimizedContent);
      }
    } catch (error) {
      console.error('Failed to optimize content:', error);
    }
  };

  const updateSEOPreview = (updates: Partial<SEOPreview>) => {
    setSeoPreview(prev => ({
      title: updates.title || prev.title || title,
      description: updates.description || prev.description || metaDescription,
      url: updates.url || prev.url || `${process.env.NEXT_PUBLIC_SITE_URL}/${slug}`
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content SEO Optimizer</h1>
          <p className="text-gray-600">AI-powered SEO optimization for better rankings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={language === 'en' ? 'default' : 'secondary'}>
            English
          </Badge>
          <Badge variant={language === 'ar' ? 'default' : 'secondary'}>
            العربية
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Content Editor</TabsTrigger>
          <TabsTrigger value="analysis">SEO Analysis</TabsTrigger>
          <TabsTrigger value="preview">SERP Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Content Editor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">SEO Title</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          generateSlug(e.target.value);
                        }}
                        placeholder="Enter your SEO-optimized title..."
                        className="flex-1"
                        maxLength={60}
                      />
                      <Button onClick={generateSEOTitle} size="sm" variant="outline">
                        <Wand2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{title.length}/60 characters</p>
                  </div>

                  <div>
                    <Label htmlFor="meta">Meta Description</Label>
                    <div className="flex items-start space-x-2 mt-1">
                      <Textarea
                        id="meta"
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Write a compelling meta description..."
                        className="flex-1"
                        rows={3}
                        maxLength={160}
                      />
                      <Button onClick={generateMetaDescription} size="sm" variant="outline">
                        <Wand2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{metaDescription.length}/160 characters</p>
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="url-friendly-slug"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">Target Keywords</Label>
                    <Input
                      id="keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your content here..."
                      className="mt-1 h-64"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {content.split(/\s+/).filter(w => w.length > 0).length} words
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button onClick={analyzeContent} size="sm" variant="outline" disabled={isAnalyzing}>
                          <BarChart3 className="w-4 h-4 mr-1" />
                          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                        </Button>
                        <Button onClick={optimizeContent} size="sm">
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI Optimize
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SEO Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    SEO Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SEO Title</span>
                      {title.length > 0 && title.length <= 60 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Meta Description</span>
                      {metaDescription.length > 0 && metaDescription.length <= 160 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">URL Slug</span>
                      {slug.length > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Target Keywords</span>
                      {keywords.length > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Content Length</span>
                      {content.split(/\s+/).filter(w => w.length > 0).length >= 300 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analysis && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Readability:</span>
                        <Badge variant="outline">{analysis.readabilityScore}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Internal Links:</span>
                        <span>{analysis.internalLinks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>External Links:</span>
                        <span>{analysis.externalLinks}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Readability Score</span>
                        <Badge variant={analysis.readabilityScore >= 70 ? 'default' : 'destructive'}>
                          {analysis.readabilityScore}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${analysis.readabilityScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
                      <div className="space-y-2">
                        {Object.entries(analysis.keywordDensity).slice(0, 5).map(([keyword, density]) => (
                          <div key={keyword} className="flex items-center justify-between">
                            <span className="text-xs">{keyword}</span>
                            <Badge variant="outline">{(density * 100).toFixed(1)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Heading Structure</h4>
                      <div className="space-y-1">
                        {analysis.headingStructure.map((heading, idx) => (
                          <div key={idx} className="text-xs flex items-center">
                            <span className="w-8 text-gray-500">H{heading.level}</span>
                            <span className="truncate">{heading.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SEO Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Yet</h3>
                <p className="text-gray-600 mb-4">Add content and click &quot;Analyze&quot; to see SEO insights</p>
                <Button onClick={analyzeContent} disabled={!content || isAnalyzing}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                SERP Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg p-4 max-w-lg">
                <div className="text-xs text-green-600 mb-1">
                  {process.env.NEXT_PUBLIC_SITE_URL}/{slug || 'your-page-slug'}
                </div>
                <div className="text-blue-600 text-lg hover:underline cursor-pointer mb-1">
                  {title || 'Your SEO title will appear here'}
                </div>
                <div className="text-gray-600 text-sm">
                  {metaDescription || 'Your meta description will appear here. Make it compelling to encourage clicks from search results.'}
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(title)}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Title
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(metaDescription)}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Description
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 border rounded-lg p-4 max-w-md">
                <div className="bg-gray-200 h-32 rounded mb-3 flex items-center justify-center text-gray-500">
                  Featured Image
                </div>
                <div className="text-sm font-medium mb-1">
                  {title || 'Your title here'}
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {metaDescription?.substring(0, 100) || 'Your description preview...'}
                </div>
                <div className="text-xs text-gray-500">
                  {typeof window !== 'undefined' ? window.location.hostname : 'zenitha.luxury'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
