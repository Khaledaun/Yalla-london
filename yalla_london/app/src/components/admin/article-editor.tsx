'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  FileText,
  Image as ImageIcon,
  Eye,
  Save,
  Send,
  Globe,
  Tag,
  Calendar,
  User,
  Target,
  Brain,
  Lightbulb,
  Search,
  Plus,
  X,
  Sparkles,
  Languages,
  MapPin,
  Clock,
  Star,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface Article {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  language: 'en' | 'ar'
  status: 'draft' | 'published' | 'scheduled'
  publishedAt?: Date
  scheduledFor?: Date
  featuredImage?: string
  tags: string[]
  category: string
  seoTitle: string
  seoDescription: string
  authorId: string
  readingTime: number
}

interface TopicSuggestion {
  id: string
  title: string
  description: string
  relevanceScore: number
  trendingScore: number
  competition: 'low' | 'medium' | 'high'
  estimatedTraffic: number
  keywords: string[]
  suggestedLength: number
}

interface MediaAsset {
  id: string
  url: string
  thumbnailUrl: string
  filename: string
  altText: string
  type: 'image' | 'video'
}

export function ArticleEditor() {
  const { toast } = useToast()
  const [article, setArticle] = useState<Article>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    language: 'en',
    status: 'draft',
    tags: [],
    category: '',
    seoTitle: '',
    seoDescription: '',
    authorId: 'current-user',
    readingTime: 0
  })

  // Load pre-filled data from URL parameters (when coming from topics)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      
      if (urlParams.get('title')) {
        setArticle(prev => ({
          ...prev,
          title: urlParams.get('title') || '',
          excerpt: urlParams.get('excerpt') || '',
          content: urlParams.get('content') || '',
          category: urlParams.get('category') || '',
          seoTitle: urlParams.get('seoTitle') || urlParams.get('title') || '',
          seoDescription: urlParams.get('seoDescription') || '',
          tags: urlParams.get('tags')?.split(',').filter(Boolean) || []
        }))
      }
    }
  }, [])

  const [isTopicResearchOpen, setIsTopicResearchOpen] = useState(false)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [contentGenerationProgress, setContentGenerationProgress] = useState(0)
  const [newTag, setNewTag] = useState('')

  // Mock media assets
  const [mediaAssets] = useState<MediaAsset[]>([
    {
      id: '1',
      url: '/images/london-bridge.jpg',
      thumbnailUrl: '/images/london-bridge-thumb.jpg',
      filename: 'london-bridge-hero.jpg',
      altText: 'Beautiful view of London Bridge at sunset',
      type: 'image'
    },
    {
      id: '2',
      url: '/images/london-markets.jpg',
      thumbnailUrl: '/images/london-markets-thumb.jpg',
      filename: 'london-markets.jpg',
      altText: 'Busy London market with fresh produce and vendors',
      type: 'image'
    }
  ])

  // Auto-generate slug from title
  useEffect(() => {
    if (article.title && !article.slug) {
      const slug = article.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      setArticle(prev => ({ ...prev, slug }))
    }
  }, [article.title, article.slug])

  // Calculate reading time
  useEffect(() => {
    const wordCount = article.content.split(/\s+/).filter(word => word.length > 0).length
    const readingTime = Math.ceil(wordCount / 200) // 200 words per minute
    setArticle(prev => ({ ...prev, readingTime }))
  }, [article.content])

  // Mock topic research
  const performTopicResearch = async (query: string) => {
    // Simulate API call
    const mockSuggestions: TopicSuggestion[] = [
      {
        id: '1',
        title: 'Best Hidden Gems in London 2024',
        description: 'Discover secret spots and lesser-known attractions that locals love',
        relevanceScore: 95,
        trendingScore: 88,
        competition: 'medium',
        estimatedTraffic: 15000,
        keywords: ['london hidden gems', 'secret london', 'off beaten path'],
        suggestedLength: 2500
      },
      {
        id: '2',
        title: 'London Food Markets: A Complete Guide',
        description: 'Comprehensive guide to the best food markets in London with insider tips',
        relevanceScore: 92,
        trendingScore: 76,
        competition: 'high',
        estimatedTraffic: 25000,
        keywords: ['london food markets', 'borough market', 'street food london'],
        suggestedLength: 3000
      },
      {
        id: '3',
        title: 'Free Things to Do in London This Weekend',
        description: 'Budget-friendly activities and events happening in London',
        relevanceScore: 89,
        trendingScore: 91,
        competition: 'low',
        estimatedTraffic: 12000,
        keywords: ['free london activities', 'weekend london', 'budget travel london'],
        suggestedLength: 2000
      }
    ]

    setTopicSuggestions(mockSuggestions)
  }

  const selectTopicAndGenerateContent = async (topic: TopicSuggestion) => {
    setSelectedTopic(topic)
    setIsGeneratingContent(true)
    setContentGenerationProgress(0)

    // Update article with topic data
    setArticle(prev => ({
      ...prev,
      title: topic.title,
      excerpt: topic.description,
      tags: topic.keywords,
      seoTitle: topic.title,
      seoDescription: topic.description
    }))

    // Simulate content generation with progress
    const steps = ['Researching topic...', 'Generating outline...', 'Writing introduction...', 'Creating main content...', 'Adding conclusion...', 'Optimizing SEO...']
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setContentGenerationProgress(((i + 1) / steps.length) * 100)
      
      toast({
        title: "Generating Content",
        description: steps[i],
      })
    }

    // Generate mock content based on language and topic
    const generatedContent = generateMockContent(topic, article.language)
    setArticle(prev => ({ ...prev, content: generatedContent }))
    
    setIsGeneratingContent(false)
    setIsTopicResearchOpen(false)
    
    toast({
      title: "Content Generated Successfully",
      description: `Article content has been generated for "${topic.title}"`,
    })
  }

  const generateMockContent = (topic: TopicSuggestion, language: string) => {
    if (language === 'ar') {
      return `# ${topic.title}

## مقدمة
${topic.description}

## النقاط الرئيسية

### النقطة الأولى
هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة، لقد تم توليد هذا النص من مولد النص العربى.

### النقطة الثانية
حيث يمكنك أن تولد مثل هذا النص أو العديد من النصوص الأخرى إضافة إلى زيادة عدد الحروف التى يولدها التطبيق.

### النقطة الثالثة
إذا كنت تحتاج إلى عدد أكبر من الفقرات يتيح لك مولد النص العربى زيادة عدد الفقرات كما تريد.

## الخلاصة
النص المولد مفيد جداً لفهم كيف سيبدو النص النهائي وتخطيط التصميم.`
    }

    return `# ${topic.title}

## Introduction
${topic.description}

## Main Points

### Point One
London is a city that never ceases to amaze. From its rich history to its vibrant modern culture, there's always something new to discover.

### Point Two
Whether you're a first-time visitor or a long-time resident, this guide will help you uncover some of the city's best-kept secrets.

### Point Three
Each recommendation comes with insider tips and practical information to help you make the most of your experience.

## Key Highlights
- Detailed information about each location
- Insider tips from locals
- Best times to visit
- Transportation options
- Budget considerations

## Conclusion
London's charm lies in its diversity and the countless opportunities it offers for exploration and discovery.`
  }

  const addTag = () => {
    if (newTag && !article.tags.includes(newTag)) {
      setArticle(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const insertImage = (asset: MediaAsset) => {
    const imageMarkdown = `![${asset.altText}](${asset.url})`
    setArticle(prev => ({
      ...prev,
      content: prev.content + '\n\n' + imageMarkdown + '\n\n'
    }))
    setIsMediaLibraryOpen(false)
    
    toast({
      title: "Image Added",
      description: "Image has been inserted into the article content.",
    })
  }

  const setFeaturedImage = (asset: MediaAsset) => {
    setArticle(prev => ({ ...prev, featuredImage: asset.url }))
    setIsMediaLibraryOpen(false)
    
    toast({
      title: "Featured Image Set",
      description: "Featured image has been updated for this article.",
    })
  }

  const saveArticle = async (status: 'draft' | 'published') => {
    try {
      setArticle(prev => ({ ...prev, status }))
      
      const response = await fetch('/api/admin/content', {
        method: article.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          title_en: article.title,
          title_ar: article.title, // TODO: Add proper translation
          slug: article.slug,
          excerpt_en: article.excerpt,
          excerpt_ar: article.excerpt,
          content_en: article.content,
          content_ar: article.content,
          published: status === 'published',
          category_id: article.category || 'default-category',
          author_id: article.authorId || 'system-user',
          tags: article.tags,
          meta_title_en: article.seoTitle,
          meta_description_en: article.seoDescription,
          featured_image: article.featuredImage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save article')
      }

      const result = await response.json()
      
      // Update article with the ID from server
      if (result.data?.id) {
        setArticle(prev => ({ ...prev, id: result.data.id }))
      }
      
      toast({
        title: status === 'draft' ? "Draft Saved" : "Article Published",
        description: status === 'draft' 
          ? "Your article has been saved as a draft."
          : "Your article has been published successfully.",
      })
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save article. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setIsTopicResearchOpen(true)}
            className="flex items-center space-x-2"
          >
            <Brain className="h-4 w-4" />
            <span>Topic Research</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsMediaLibraryOpen(true)}
            className="flex items-center space-x-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Media Library</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
            {article.status}
          </Badge>
          <Select
            value={article.language}
            onValueChange={(value: 'en' | 'ar') => setArticle(prev => ({ ...prev, language: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Article Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={article.title}
                  onChange={(e) => setArticle(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter article title..."
                  className="text-lg font-medium"
                />
              </div>
              
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={article.slug}
                  onChange={(e) => setArticle(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="article-url-slug"
                />
              </div>
              
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={article.excerpt}
                  onChange={(e) => setArticle(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description of the article..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          {article.featuredImage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Featured Image</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArticle(prev => ({ ...prev, featuredImage: undefined }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={article.featuredImage}
                  alt="Featured image"
                  width={600}
                  height={300}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Content</span>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{article.readingTime} min read</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGeneratingContent ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="font-medium">Generating content...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${contentGenerationProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    AI is creating high-quality content based on your selected topic and language preferences.
                  </p>
                </div>
              ) : (
                <Textarea
                  value={article.content}
                  onChange={(e) => setArticle(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Start writing your article content here..."
                  className="min-h-96 font-mono"
                  style={{ direction: article.language === 'ar' ? 'rtl' : 'ltr' }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Publish</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={article.status}
                  onValueChange={(value: 'draft' | 'published' | 'scheduled') => 
                    setArticle(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={article.category}
                  onValueChange={(value) => setArticle(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attractions">Attractions</SelectItem>
                    <SelectItem value="food">Food & Dining</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="travel-tips">Travel Tips</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => saveArticle('draft')}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => saveArticle('published')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Tags</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>SEO</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={article.seoTitle}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="SEO optimized title..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {article.seoTitle.length}/60 characters
                </p>
              </div>
              
              <div>
                <Label htmlFor="seo-description">SEO Description</Label>
                <Textarea
                  id="seo-description"
                  value={article.seoDescription}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="SEO meta description..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {article.seoDescription.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Topic Research Modal */}
      <Dialog open={isTopicResearchOpen} onOpenChange={setIsTopicResearchOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Topic Research</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter topic keywords or let AI suggest..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    performTopicResearch((e.target as HTMLInputElement).value)
                  }
                }}
              />
              <Button onClick={() => performTopicResearch('london')}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Research
              </Button>
            </div>

            {topicSuggestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Suggested Topics</h3>
                {topicSuggestions.map(topic => (
                  <Card key={topic.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-2">{topic.title}</h4>
                          <p className="text-gray-600 mb-3">{topic.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {topic.keywords.map(keyword => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span>Trending: {topic.trendingScore}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4 text-blue-500" />
                              <span>Relevance: {topic.relevanceScore}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4 text-purple-500" />
                              <span>{topic.estimatedTraffic.toLocaleString()} views</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <BarChart3 className="h-4 w-4 text-orange-500" />
                              <span>Competition: {topic.competition}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => selectTopicAndGenerateContent(topic)}
                          className="ml-4"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Library Modal */}
      <Dialog open={isMediaLibraryOpen} onOpenChange={setIsMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Media Library</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaAssets.map(asset => (
              <div key={asset.id} className="border rounded-lg overflow-hidden">
                <Image
                  src={asset.thumbnailUrl}
                  alt={asset.altText}
                  width={300}
                  height={200}
                  className="w-full h-40 object-cover"
                />
                <div className="p-3">
                  <p className="font-medium text-sm mb-2">{asset.filename}</p>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => insertImage(asset)}
                    >
                      Insert
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setFeaturedImage(asset)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Article Preview</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="prose max-w-none" style={{ direction: article.language === 'ar' ? 'rtl' : 'ltr' }}>
            {article.featuredImage && (
              <Image
                src={article.featuredImage}
                alt="Featured image"
                width={800}
                height={400}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <h1 className="text-3xl font-bold mb-4">{article.title || 'Untitled Article'}</h1>
            <p className="text-lg text-gray-600 mb-6">{article.excerpt}</p>
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}