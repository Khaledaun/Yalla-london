
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Eye, 
  Globe, 
  Image as ImageIcon, 
  Link, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  Target,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SeoData {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  keywords?: string;
  schema?: any;
  hreflang?: Record<string, string>;
  noindex?: boolean;
  nofollow?: boolean;
}

interface SeoMetaEditorProps {
  initialData?: Partial<SeoData>;
  contentType: 'page' | 'article' | 'event' | 'place';
  onSave: (data: SeoData) => void;
  previewUrl?: string;
}

export function SeoMetaEditor({ 
  initialData = {},
  contentType,
  onSave,
  previewUrl
}: SeoMetaEditorProps) {
  const [seoData, setSeoData] = useState<SeoData>({
    title: '',
    metaTitle: '',
    metaDescription: '',
    ...initialData
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [seoScore, setSeoScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    calculateSeoScore();
  }, [seoData]);

  const calculateSeoScore = () => {
    let score = 0;
    const newSuggestions: string[] = [];

    // Title checks
    if (seoData.metaTitle) {
      if (seoData.metaTitle.length >= 30 && seoData.metaTitle.length <= 60) {
        score += 15;
      } else {
        newSuggestions.push('Meta title should be 30-60 characters');
      }
    } else {
      newSuggestions.push('Meta title is required');
    }

    // Description checks
    if (seoData.metaDescription) {
      if (seoData.metaDescription.length >= 120 && seoData.metaDescription.length <= 160) {
        score += 15;
      } else {
        newSuggestions.push('Meta description should be 120-160 characters');
      }
    } else {
      newSuggestions.push('Meta description is required');
    }

    // OG data checks
    if (seoData.ogTitle) score += 10;
    else newSuggestions.push('Open Graph title recommended');

    if (seoData.ogDescription) score += 10;
    else newSuggestions.push('Open Graph description recommended');

    if (seoData.ogImage) score += 10;
    else newSuggestions.push('Open Graph image recommended');

    // Keywords check
    if (seoData.keywords && seoData.keywords.split(',').length >= 3) {
      score += 10;
    } else {
      newSuggestions.push('Add at least 3 relevant keywords');
    }

    // Canonical URL
    if (seoData.canonical) score += 5;
    
    // Twitter cards
    if (seoData.twitterTitle && seoData.twitterDescription) score += 5;

    // Schema markup
    if (seoData.schema) score += 10;
    else newSuggestions.push('Structured data (schema) recommended');

    // Hreflang
    if (seoData.hreflang && Object.keys(seoData.hreflang).length > 0) {
      score += 10;
    } else {
      newSuggestions.push('Hreflang tags recommended for multilingual content');
    }

    setSeoScore(Math.min(score, 100));
    setSuggestions(newSuggestions);
  };

  const handleSave = () => {
    onSave(seoData);
  };

  const generatePreview = () => {
    const title = seoData.metaTitle || seoData.title;
    const description = seoData.metaDescription;
    const url = previewUrl || 'https://example.com/page';

    return (
      <div className="border rounded-lg p-4 bg-white">
        <div className="text-sm text-blue-600 mb-1">{url}</div>
        <div className="text-lg text-blue-600 hover:underline cursor-pointer mb-1">
          {title}
        </div>
        <div className="text-sm text-gray-600">
          {description}
        </div>
      </div>
    );
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeoScoreBadge = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">SEO & Meta Data</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${seoScore}%` }}
              />
            </div>
            <span className={`font-semibold ${getSeoScoreColor(seoScore)}`}>
              {seoScore}/100
            </span>
          </div>
          <Badge variant={seoScore >= 80 ? 'default' : seoScore >= 60 ? 'secondary' : 'destructive'}>
            {getSeoScoreBadge(seoScore)}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic">Basic SEO</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title *</Label>
                <Input
                  id="metaTitle"
                  value={seoData.metaTitle}
                  onChange={(e) => setSeoData(prev => ({ ...prev, metaTitle: e.target.value }))}
                  placeholder="SEO-optimized page title (30-60 characters)"
                  maxLength={60}
                />
                <div className="text-sm text-gray-500 mt-1">
                  {seoData.metaTitle.length}/60 characters
                </div>
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta Description *</Label>
                <Textarea
                  id="metaDescription"
                  value={seoData.metaDescription}
                  onChange={(e) => setSeoData(prev => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="Compelling description that appears in search results (120-160 characters)"
                  maxLength={160}
                  rows={3}
                />
                <div className="text-sm text-gray-500 mt-1">
                  {seoData.metaDescription.length}/160 characters
                </div>
              </div>

              <div>
                <Label htmlFor="keywords">Focus Keywords</Label>
                <Input
                  id="keywords"
                  value={seoData.keywords || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="london, luxury travel, guide (comma-separated)"
                />
              </div>

              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  value={seoData.canonical || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, canonical: e.target.value }))}
                  placeholder="https://example.com/canonical-url"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={seoData.noindex || false}
                    onChange={(e) => setSeoData(prev => ({ ...prev, noindex: e.target.checked }))}
                  />
                  <span>No Index</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={seoData.nofollow || false}
                    onChange={(e) => setSeoData(prev => ({ ...prev, nofollow: e.target.checked }))}
                  />
                  <span>No Follow</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Open Graph (Facebook)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={seoData.ogTitle || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, ogTitle: e.target.value }))}
                  placeholder="Facebook share title"
                />
              </div>

              <div>
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={seoData.ogDescription || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, ogDescription: e.target.value }))}
                  placeholder="Facebook share description"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="ogImage">OG Image URL</Label>
                <Input
                  id="ogImage"
                  value={seoData.ogImage || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, ogImage: e.target.value }))}
                  placeholder="https://img-a.ryte.com/f/117064/c659b64f07/og-image-size-guide.png"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Recommended: 1200x630px
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Twitter Cards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitterTitle">Twitter Title</Label>
                <Input
                  id="twitterTitle"
                  value={seoData.twitterTitle || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, twitterTitle: e.target.value }))}
                  placeholder="Twitter share title"
                />
              </div>

              <div>
                <Label htmlFor="twitterDescription">Twitter Description</Label>
                <Textarea
                  id="twitterDescription"
                  value={seoData.twitterDescription || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, twitterDescription: e.target.value }))}
                  placeholder="Twitter share description"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="twitterImage">Twitter Image URL</Label>
                <Input
                  id="twitterImage"
                  value={seoData.twitterImage || ''}
                  onChange={(e) => setSeoData(prev => ({ ...prev, twitterImage: e.target.value }))}
                  placeholder="https://media.analyzify.com/4/8887/2wUw01jG3s2rgDwnk8Hmk5QpR6JZjBN4K300pdJH_twitter-image-sizes.png"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Recommended: 1200x600px
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                International SEO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hreflang Tags</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="en"
                      className="w-20"
                      value="en"
                      disabled
                    />
                    <Input
                      placeholder="English URL"
                      value={seoData.hreflang?.en || ''}
                      onChange={(e) => setSeoData(prev => ({ 
                        ...prev, 
                        hreflang: { ...prev.hreflang, en: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ar"
                      className="w-20"
                      value="ar"
                      disabled
                    />
                    <Input
                      placeholder="Arabic URL"
                      value={seoData.hreflang?.ar || ''}
                      onChange={(e) => setSeoData(prev => ({ 
                        ...prev, 
                        hreflang: { ...prev.hreflang, ar: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Structured Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="schemaType">Schema Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schema type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Place">Place</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="FAQ">FAQ Page</SelectItem>
                    <SelectItem value="HowTo">How-To</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schemaData">Schema JSON-LD</Label>
                <Textarea
                  id="schemaData"
                  value={seoData.schema ? JSON.stringify(seoData.schema, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setSeoData(prev => ({ ...prev, schema: parsed }));
                    } catch {
                      // Invalid JSON, but keep the value for editing
                    }
                  }}
                  placeholder="Auto-generated based on content"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Auto-Generate Schema
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Search Result Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatePreview()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                SEO Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    {suggestion}
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    All SEO checks passed!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave}>
          Save SEO Settings
        </Button>
      </div>
    </div>
  );
}
