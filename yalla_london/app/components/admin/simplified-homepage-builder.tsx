'use client'

import React, { useState } from 'react';
import NextImage from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Upload,
  Eye,
  Image as ImageIcon,
  Type,
  List,
  ArrowUp,
  ArrowDown,
  Settings,
  Play
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  image?: string;
  category: string;
  publishedAt: string;
  featured: boolean;
}

interface HeroConfig {
  image: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
}

interface SimplifiedHomepageBuilderProps {
  siteId: string;
  initialHero?: HeroConfig;
  initialArticles?: Article[];
}

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Best London Food Markets This Weekend',
    excerpt: 'Discover the most amazing food markets across London with authentic cuisine and fresh produce.',
    image: '/images/london-markets.jpg',
    category: 'Food & Dining',
    publishedAt: '2024-01-20',
    featured: true
  },
  {
    id: '2',
    title: 'Hidden Art Galleries in East London',
    excerpt: 'Explore underground art scenes and discover emerging artists in these secret gallery spaces.',
    image: '/images/art-galleries.jpg',
    category: 'Arts & Culture',
    publishedAt: '2024-01-19',
    featured: false
  },
  {
    id: '3',
    title: 'Weekend Events: Live Music & Night Life',
    excerpt: 'Your complete guide to the best concerts, club nights, and live music venues this weekend.',
    image: '/images/nightlife.jpg',
    category: 'Events',
    publishedAt: '2024-01-18',
    featured: true
  },
  {
    id: '4',
    title: 'London Shopping Guide: From Markets to Malls',
    excerpt: 'Complete shopping guide covering vintage markets, luxury boutiques, and everything in between.',
    image: '/images/shopping.jpg',
    category: 'Shopping',
    publishedAt: '2024-01-17',
    featured: false
  }
];

export function SimplifiedHomepageBuilder({ 
  siteId, 
  initialHero,
  initialArticles = mockArticles 
}: SimplifiedHomepageBuilderProps) {
  const [heroConfig, setHeroConfig] = useState<HeroConfig>(
    initialHero || {
      image: '/images/london-hero.jpg',
      headline: 'Discover London Like a Local',
      subheadline: 'Your ultimate guide to the best experiences, hidden gems, and cultural treasures in London.',
      ctaText: 'Explore Now',
      ctaLink: '/recommendations'
    }
  );

  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/homepage/${siteId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero: heroConfig,
          articleOrder: articles.map(a => a.id)
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      toast.success('Draft saved successfully!');
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/admin/homepage/${siteId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero: heroConfig,
          articleOrder: articles.map(a => a.id)
        })
      });

      if (!response.ok) throw new Error('Failed to publish');
      toast.success('Homepage published successfully!');
    } catch (error) {
      toast.error('Failed to publish homepage');
    } finally {
      setPublishing(false);
    }
  };

  const moveArticle = (index: number, direction: 'up' | 'down') => {
    const newArticles = [...articles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newArticles.length) {
      [newArticles[index], newArticles[targetIndex]] = [newArticles[targetIndex], newArticles[index]];
      setArticles(newArticles);
    }
  };

  const toggleFeatured = (id: string) => {
    setArticles(prev => 
      prev.map(article => 
        article.id === id 
          ? { ...article, featured: !article.featured }
          : article
      )
    );
  };

  const autoSort = (criteria: 'latest' | 'category' | 'featured') => {
    const sorted = [...articles].sort((a, b) => {
      switch (criteria) {
        case 'latest':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'category':
          return a.category.localeCompare(b.category);
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        default:
          return 0;
      }
    });
    setArticles(sorted);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-inter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 admin-heading">Homepage Builder</h1>
          <p className="text-gray-600 admin-text-base mt-2">
            Customize your hero section, edit headline text, and organize article display order
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          
          <Button onClick={handlePublish} disabled={publishing} className="bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-2" />
            {publishing ? 'Publishing...' : 'Publish Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="space-y-6">
          {/* 1. Hero Image Control */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <ImageIcon className="h-5 w-5" />
                1. Hero Image
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative group">
                  <NextImage
                    src={heroConfig.image}
                    alt="Hero preview"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-32 object-cover rounded-lg border"
                    style={{ width: '100%', height: '8rem' }}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                    <Button 
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800"
                      onClick={() => setShowMediaLibrary(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Current: {heroConfig.image.split('/').pop()}</p>
                  <p>Click to select from media library or upload new image</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Hero Text Control */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Type className="h-5 w-5" />
                2. Hero Text & Slogan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block admin-text-sm font-medium text-gray-700 mb-2">
                  Main Headline
                </label>
                <Input
                  value={heroConfig.headline}
                  onChange={(e) => setHeroConfig(prev => ({ ...prev, headline: e.target.value }))}
                  className="admin-text-lg font-semibold"
                  placeholder="Your main headline"
                />
              </div>
              
              <div>
                <label className="block admin-text-sm font-medium text-gray-700 mb-2">
                  Subheadline
                </label>
                <Textarea
                  value={heroConfig.subheadline}
                  onChange={(e) => setHeroConfig(prev => ({ ...prev, subheadline: e.target.value }))}
                  className="admin-text-base resize-none"
                  rows={3}
                  placeholder="Supporting text that describes your site"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block admin-text-sm font-medium text-gray-700 mb-2">
                    Button Text
                  </label>
                  <Input
                    value={heroConfig.ctaText}
                    onChange={(e) => setHeroConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder="Call to action"
                  />
                </div>
                <div>
                  <label className="block admin-text-sm font-medium text-gray-700 mb-2">
                    Button Link
                  </label>
                  <Input
                    value={heroConfig.ctaLink}
                    onChange={(e) => setHeroConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
                    placeholder="/recommendations"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Article Order Control */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <List className="h-5 w-5" />
                  3. Article Order
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => autoSort('latest')}>
                    Latest First
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => autoSort('featured')}>
                    Featured First
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {articles.map((article, index) => (
                  <div 
                    key={article.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex flex-col space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveArticle(index, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveArticle(index, 'down')}
                          disabled={index === articles.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="admin-text-sm font-medium text-gray-900">
                            {index + 1}. {article.title}
                          </span>
                          {article.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Featured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{article.category}</p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFeatured(article.id)}
                      className={article.featured ? 'text-yellow-600' : 'text-gray-400'}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Hero Preview */}
              <div className="relative h-64 overflow-hidden">
                <NextImage
                  src={heroConfig.image}
                  alt="Hero"
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="w-full h-full object-cover"
                  style={{ width: '100%', height: '100%' }}
                  unoptimized
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <h2 className="text-2xl font-bold mb-2">{heroConfig.headline}</h2>
                    <p className="admin-text-base mb-4 opacity-90">{heroConfig.subheadline}</p>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      {heroConfig.ctaText}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Articles Preview */}
              <div className="p-6">
                <h3 className="admin-text-lg font-semibold text-gray-900 mb-4">Latest Articles</h3>
                <div className="space-y-4">
                  {articles.slice(0, 3).map((article, index) => (
                    <div key={article.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        {article.image && (
                          <NextImage
                            src={article.image}
                            alt={article.title}
                            width={64}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                          <h4 className="admin-text-sm font-medium text-gray-900 truncate">
                            {article.title}
                          </h4>
                          {article.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Featured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{article.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}