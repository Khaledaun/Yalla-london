
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Globe, 
  Share2, 
  Image, 
  FileText, 
  Calendar,
  MapPin,
  Tag,
  Link2,
  Eye,
  Save,
  RefreshCw,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SeoData {
  title: string;
  description: string;
  canonical: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterCard: 'summary' | 'summary_large_image';
  robotsMeta: string;
  schemaType: string;
  hreflangAlternates: {[key: string]: string};
  structuredData: any;
}

interface SerpPreview {
  title: string;
  url: string;
  description: string;
}

export function SeoManagementDashboard() {
  // Check SEO feature flag directly
  const seoEnabled = process.env.NEXT_PUBLIC_FEATURE_SEO === '1';
  if (!seoEnabled) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">SEO Features Disabled</h3>
          <p className="text-gray-600 mb-4">Enable SEO features by setting FEATURE_SEO=1</p>
          <Badge variant="outline">Feature Flag: SEO</Badge>
        </CardContent>
      </Card>
    );
  }

  const [activeTab, setActiveTab] = useState('meta');
  const [seoData, setSeoData] = useState<SeoData>({
    title: '',
    description: '',
    canonical: '',
    metaKeywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogType: 'website',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    twitterCard: 'summary_large_image',
    robotsMeta: 'index,follow',
    schemaType: 'WebPage',
    hreflangAlternates: { en: '', ar: '' },
    structuredData: {}
  });

  const [serpPreview, setSerpPreview] = useState<SerpPreview>({
    title: '',
    url: '',
    description: ''
  });

  const [isGeneratingOgImage, setIsGeneratingOgImage] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [seoIssues, setSeoIssues] = useState<string[]>([]);

  // Update SERP preview when meta data changes
  useEffect(() => {
    setSerpPreview({
      title: seoData.title || 'Page Title - Yalla London',
      url: seoData.canonical || 'https://yalla-london.com/page',
      description: seoData.description || 'Page description goes here...'
    });

    // Calculate SEO score
    calculateSeoScore();
  }, [seoData]);

  const calculateSeoScore = () => {
    let score = 0;
    const issues = [];

    // Title check
    if (!seoData.title) {
      issues.push('Missing page title');
    } else if (seoData.title.length < 30) {
      issues.push('Title too short (< 30 characters)');
    } else if (seoData.title.length > 60) {
      issues.push('Title too long (> 60 characters)');
    } else {
      score += 20;
    }

    // Description check
    if (!seoData.description) {
      issues.push('Missing meta description');
    } else if (seoData.description.length < 120) {
      issues.push('Description too short (< 120 characters)');
    } else if (seoData.description.length > 160) {
      issues.push('Description too long (> 160 characters)');
    } else {
      score += 20;
    }

    // Open Graph check
    if (seoData.ogTitle && seoData.ogDescription && seoData.ogImage) {
      score += 20;
    } else {
      issues.push('Incomplete Open Graph data');
    }

    // Twitter Card check
    if (seoData.twitterTitle && seoData.twitterDescription) {
      score += 15;
    } else {
      issues.push('Incomplete Twitter Card data');
    }

    // Hreflang check
    if (seoData.hreflangAlternates.en && seoData.hreflangAlternates.ar) {
      score += 15;
    } else {
      issues.push('Missing hreflang alternates');
    }

    // Structured data check
    if (seoData.schemaType !== 'WebPage') {
      score += 10;
    } else {
      issues.push('Consider using more specific schema type');
    }

    setSeoScore(score);
    setSeoIssues(issues);
  };

  const handleInputChange = (field: keyof SeoData, value: string) => {
    setSeoData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHreflangChange = (lang: string, url: string) => {
    setSeoData(prev => ({
      ...prev,
      hreflangAlternates: {
        ...prev.hreflangAlternates,
        [lang]: url
      }
    }));
  };

  const generateOgImage = async () => {
    setIsGeneratingOgImage(true);
    try {
      const response = await fetch('/api/seo/generate-og-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: seoData.title || seoData.ogTitle,
          description: seoData.description || seoData.ogDescription,
          type: seoData.ogType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        handleInputChange('ogImage', data.imageUrl);
        handleInputChange('twitterImage', data.imageUrl);
      }
    } catch (error) {
      console.error('Failed to generate OG image:', error);
    }
    setIsGeneratingOgImage(false);
  };

  const saveSeoData = async () => {
    try {
      const response = await fetch('/api/seo/save-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seoData)
      });
      
      if (response.ok) {
        // Show success message
        console.log('SEO data saved successfully');
      }
    } catch (error) {
      console.error('Failed to save SEO data:', error);
    }
  };

  const previewInGoogleRichResults = () => {
    const testUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(seoData.canonical)}`;
    window.open(testUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* SEO Score Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              SEO Health Score
            </CardTitle>
            <Badge variant={seoScore >= 80 ? "default" : seoScore >= 60 ? "secondary" : "destructive"}>
              {seoScore}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className={`h-2 rounded-full ${
                  seoScore >= 80 ? 'bg-green-500' : 
                  seoScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${seoScore}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            {seoIssues.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-red-600">Issues to Fix:</h4>
                {seoIssues.map((issue, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="meta">Meta Tags</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="international">International</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Meta Tags Tab */}
        <TabsContent value="meta" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  placeholder="Compelling page title (30-60 characters)"
                  value={seoData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={seoData.title.length > 60 ? 'border-red-500' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {seoData.title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">Meta Description</Label>
                <Textarea
                  id="description"
                  placeholder="Compelling description that summarizes the page content (120-160 characters)"
                  value={seoData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className={seoData.description.length > 160 ? 'border-red-500' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {seoData.description.length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="canonical">Canonical URL</Label>
                <Input
                  id="canonical"
                  placeholder="https://yalla-london.com/page"
                  value={seoData.canonical}
                  onChange={(e) => handleInputChange('canonical', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="keywords">Meta Keywords (optional)</Label>
                <Input
                  id="keywords"
                  placeholder="london, travel, guide, luxury"
                  value={seoData.metaKeywords}
                  onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="robots">Robots Meta</Label>
                <Select value={seoData.robotsMeta} onValueChange={(value) => handleInputChange('robotsMeta', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index,follow">Index, Follow</SelectItem>
                    <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
                    <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
                    <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="space-y-6">
          {/* Open Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Open Graph (Facebook, LinkedIn)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="og-title">OG Title</Label>
                <Input
                  id="og-title"
                  placeholder="Engaging title for social sharing"
                  value={seoData.ogTitle}
                  onChange={(e) => handleInputChange('ogTitle', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="og-description">OG Description</Label>
                <Textarea
                  id="og-description"
                  placeholder="Compelling description for social sharing"
                  value={seoData.ogDescription}
                  onChange={(e) => handleInputChange('ogDescription', e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="og-image">OG Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="og-image"
                    placeholder="https://ahrefs.com/blog/wp-content/uploads/2020/01/Screenshot-2020-01-06-at-20.55.25-1.png"
                    value={seoData.ogImage}
                    onChange={(e) => handleInputChange('ogImage', e.target.value)}
                  />
                  <Button 
                    onClick={generateOgImage}
                    disabled={isGeneratingOgImage}
                    variant="outline"
                  >
                    {isGeneratingOgImage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 1200x630px
                </p>
              </div>

              <div>
                <Label htmlFor="og-type">OG Type</Label>
                <Select value={seoData.ogType} onValueChange={(value) => handleInputChange('ogType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="profile">Profile</SelectItem>
                    <SelectItem value="video.movie">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Twitter Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Twitter Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitter-title">Twitter Title</Label>
                <Input
                  id="twitter-title"
                  placeholder="Twitter-optimized title"
                  value={seoData.twitterTitle}
                  onChange={(e) => handleInputChange('twitterTitle', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="twitter-description">Twitter Description</Label>
                <Textarea
                  id="twitter-description"
                  placeholder="Twitter-optimized description"
                  value={seoData.twitterDescription}
                  onChange={(e) => handleInputChange('twitterDescription', e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="twitter-image">Twitter Image URL</Label>
                <Input
                  id="twitter-image"
                  placeholder="https://farm1.staticflickr.com/767/23460165521_990da0fa0c_b.jpg"
                  value={seoData.twitterImage}
                  onChange={(e) => handleInputChange('twitterImage', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 1200x600px
                </p>
              </div>

              <div>
                <Label htmlFor="twitter-card">Twitter Card Type</Label>
                <Select value={seoData.twitterCard} onValueChange={(value: any) => handleInputChange('twitterCard', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Structured Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="schema-type">Schema Type</Label>
                <Select value={seoData.schemaType} onValueChange={(value) => handleInputChange('schemaType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WebPage">Web Page</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="NewsArticle">News Article</SelectItem>
                    <SelectItem value="BlogPosting">Blog Post</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Place">Place</SelectItem>
                    <SelectItem value="LocalBusiness">Local Business</SelectItem>
                    <SelectItem value="Restaurant">Restaurant</SelectItem>
                    <SelectItem value="TouristAttraction">Tourist Attraction</SelectItem>
                    <SelectItem value="FAQPage">FAQ Page</SelectItem>
                    <SelectItem value="HowTo">How-To</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={previewInGoogleRichResults} variant="outline" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test in Rich Results
                </Button>
                <Button variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Schema
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* International Tab */}
        <TabsContent value="international" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Internationalization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hreflang-en">English Version URL</Label>
                <Input
                  id="hreflang-en"
                  placeholder="https://yalla-london.com/en/page"
                  value={seoData.hreflangAlternates.en}
                  onChange={(e) => handleHreflangChange('en', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="hreflang-ar">Arabic Version URL</Label>
                <Input
                  id="hreflang-ar"
                  placeholder="https://yalla-london.com/ar/page"
                  value={seoData.hreflangAlternates.ar}
                  onChange={(e) => handleHreflangChange('ar', e.target.value)}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Hreflang Best Practices</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Each language version should link to all other versions</li>
                  <li>• Include self-referencing hreflang tags</li>
                  <li>• Use x-default for the default language version</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                SERP Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white">
                <div className="space-y-1">
                  <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                    {serpPreview.title}
                  </div>
                  <div className="text-green-700 text-sm">
                    {serpPreview.url}
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    {serpPreview.description}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Media Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden max-w-md">
                {seoData.ogImage && (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    <img 
                      src={seoData.ogImage} 
                      alt="OG Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500"><Image class="h-8 w-8" /></div>';
                      }}
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="font-medium text-gray-900">
                    {seoData.ogTitle || seoData.title || 'Page Title'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {seoData.ogDescription || seoData.description || 'Page description'}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    {new URL(seoData.canonical || 'https://yalla-london.com').hostname}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSeoData} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save SEO Settings
        </Button>
      </div>
    </div>
  );
}
