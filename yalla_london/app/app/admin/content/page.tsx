'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText,
  Upload,
  Search,
  Eye,
  Edit,
  Trash2,
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Plus,
  Filter,
  Download,
  Star,
  TrendingUp,
  Clock,
  User
} from 'lucide-react'
import { toast } from 'sonner'

interface Article {
  id: string
  title: string
  excerpt: string
  content: string
  author: string
  publishedAt: string
  seoScore: number
  status: 'published' | 'draft' | 'review'
  category: string
  tags: string[]
  featuredImage?: string
}

interface SocialPreview {
  platform: string
  title: string
  description: string
  image: string
  url: string
}

export default function ContentHub() {
  const [articles, setArticles] = useState<Article[]>([
    {
      id: '1',
      title: 'Best London Restaurants 2024',
      excerpt: 'Discover the finest dining experiences in London with our curated list of top restaurants.',
      content: 'London is home to some of the world\'s most exceptional restaurants...',
      author: 'AI Assistant',
      publishedAt: '2024-01-15',
      seoScore: 92,
      status: 'published',
      category: 'Food & Dining',
      tags: ['restaurants', 'london', 'dining', 'food'],
      featuredImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
    },
    {
      id: '2',
      title: 'Hidden Gems in London',
      excerpt: 'Explore London\'s best-kept secrets and off-the-beaten-path attractions.',
      content: 'Beyond the famous landmarks, London hides countless treasures...',
      author: 'AI Assistant',
      publishedAt: '2024-01-14',
      seoScore: 87,
      status: 'published',
      category: 'Travel & Culture',
      tags: ['hidden gems', 'london', 'attractions', 'culture'],
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800'
    },
    {
      id: '3',
      title: 'London Events Guide',
      excerpt: 'Your complete guide to the best events happening in London this month.',
      content: 'London never sleeps, and neither do its events...',
      author: 'AI Assistant',
      publishedAt: '2024-01-13',
      seoScore: 89,
      status: 'published',
      category: 'Events',
      tags: ['events', 'london', 'guide', 'entertainment'],
      featuredImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800'
    }
  ])

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'review'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || article.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newArticle: Article = {
        id: Date.now().toString(),
        title: files[0].name.replace(/\.[^/.]+$/, ''),
        excerpt: 'Uploaded content - review and edit as needed',
        content: 'Content will be processed and made available for editing...',
        author: 'Uploaded',
        publishedAt: new Date().toISOString().split('T')[0],
        seoScore: 0,
        status: 'review',
        category: 'Uploaded',
        tags: ['uploaded', 'review']
      }

      setArticles(prev => [newArticle, ...prev])
      toast.success('Content uploaded successfully!')
    } catch (error) {
      toast.error('Failed to upload content')
    } finally {
      setIsUploading(false)
    }
  }

  const generateSocialPreviews = (article: Article): SocialPreview[] => {
    return [
      {
        platform: 'Facebook',
        title: article.title,
        description: article.excerpt,
        image: article.featuredImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        url: `https://yalla-london.com/blog/${article.id}`
      },
      {
        platform: 'Twitter',
        title: article.title,
        description: article.excerpt.substring(0, 200) + '...',
        image: article.featuredImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        url: `https://yalla-london.com/blog/${article.id}`
      },
      {
        platform: 'Instagram',
        title: article.title,
        description: article.excerpt,
        image: article.featuredImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        url: `https://yalla-london.com/blog/${article.id}`
      },
      {
        platform: 'LinkedIn',
        title: article.title,
        description: article.excerpt,
        image: article.featuredImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        url: `https://yalla-london.com/blog/${article.id}`
      }
    ]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-500">Published</Badge>
      case 'draft':
        return <Badge variant="secondary" className="bg-yellow-500">Draft</Badge>
      case 'review':
        return <Badge variant="outline" className="bg-blue-500">Review</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSeoScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />
      case 'Twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />
      case 'Instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />
      case 'LinkedIn':
        return <Linkedin className="h-4 w-4 text-blue-700" />
      default:
        return <Share2 className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-500" />
                Content Hub
              </h1>
              <p className="text-gray-600 mt-1">Manage articles, media, and social previews</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Content'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="media">Media Library</TabsTrigger>
            <TabsTrigger value="social">Social Previews</TabsTrigger>
          </TabsList>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search articles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Articles List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{article.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{article.excerpt}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {article.author}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.publishedAt}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span className={getSeoScoreColor(article.seoScore)}>
                              SEO: {article.seoScore}/100
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(article.status)}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedArticle(article)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {article.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Media Library Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Media Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload Hero Images</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload Article Images</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Upload Branding Assets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Previews Tab */}
          <TabsContent value="social" className="space-y-6">
            {selectedArticle ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media Previews for: {selectedArticle.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {generateSocialPreviews(selectedArticle).map((preview) => (
                        <Card key={preview.platform} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(preview.platform)}
                              <span className="font-medium">{preview.platform}</span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <img
                                src={preview.image}
                                alt={preview.title}
                                className="w-full h-32 object-cover rounded"
                              />
                              <div>
                                <h4 className="font-medium text-sm">{preview.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{preview.description}</p>
                                <p className="text-xs text-blue-600 mt-1">{preview.url}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Article</h3>
                  <p className="text-gray-600">Choose an article from the Articles tab to see social media previews</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
