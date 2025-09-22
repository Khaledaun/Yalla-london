'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  User,
  X,
  File,
  Image,
  Video,
  Palette
} from 'lucide-react'
import { toast } from 'sonner'

interface Article {
  id: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  content_en: string
  content_ar: string
  author: {
    name: string
    email: string
  }
  created_at: string
  updated_at: string
  seo_score: number | null
  published: boolean
  category: {
    name_en: string
    name_ar: string
  }
  tags: string[]
  featured_image?: string
  page_type?: string
  keywords_json?: any
  featured_longtails_json?: any
  authority_links_json?: any
}

interface MediaAsset {
  id: string
  filename: string
  original_name: string
  url: string
  file_type: string
  mime_type: string
  file_size: number
  width?: number
  height?: number
  alt_text?: string
  title?: string
  tags: string[]
  created_at: string
}

interface ContentStats {
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  scheduledContent: number
  mediaAssets: number
}

export default function ContentHub() {
  const [articles, setArticles] = useState<Article[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [stats, setStats] = useState<ContentStats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    scheduledContent: 0,
    mediaAssets: 0
  })
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadType, setUploadType] = useState<'articles' | 'media' | 'branding'>('articles')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load real data on component mount
  useEffect(() => {
    loadContentData()
  }, [])

  const loadContentData = async () => {
    try {
      const response = await fetch('/api/admin/content')
      if (response.ok) {
        const data = await response.json()
        setArticles(data.articles || [])
        setMediaAssets(data.mediaAssets || [])
        setStats(data.stats || stats)
      } else {
        toast.error('Failed to load content data')
      }
    } catch (error) {
      console.error('Error loading content data:', error)
      toast.error('Failed to load content data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.excerpt_en.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && article.published) ||
                         (filterStatus === 'draft' && !article.published)
    return matchesSearch && matchesStatus
  })

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('type', 'import_content')
      formData.append('data', JSON.stringify({
        importType: 'csv', // or detect from file extension
        fileData: {
          name: files[0].name,
          content: await files[0].text()
        },
        mapping: {
          title: 'title',
          content: 'content',
          excerpt: 'excerpt',
          category: 'category',
          tags: 'tags'
        }
      }))

      const response = await fetch('/api/admin/content', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Content uploaded successfully! ${result.importedCount} items imported.`)
        loadContentData() // Reload data
      } else {
        toast.error('Failed to upload content')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload content')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusBadge = (published: boolean) => {
    return published 
      ? <Badge variant="default" className="bg-green-500">Published</Badge>
      : <Badge variant="secondary" className="bg-yellow-500">Draft</Badge>
  }

  const getSeoScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500'
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const UploadContentModal = () => (
    <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
        </DialogHeader>
        
        <Tabs value={uploadType} onValueChange={(value) => setUploadType(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="media">Media Library</TabsTrigger>
            <TabsTrigger value="branding">Branding Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Import Type</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="csv">CSV File</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                </select>
              </div>
              
              <div>
                <Label>File Upload</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <File className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Drop your file here or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.md,.html,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Supported formats:</strong> CSV, Markdown, HTML</p>
                <p><strong>Required fields:</strong> title, content, excerpt</p>
                <p><strong>Optional fields:</strong> category, tags, keywords</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Media Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Image className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Images</p>
                    <p className="text-xs text-gray-500">JPG, PNG, WebP, AVIF</p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Video className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Videos</p>
                    <p className="text-xs text-gray-500">MP4, WebM</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Upload Media</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Drag and drop images or videos</p>
                  <Button variant="outline" disabled>
                    Choose Files
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Branding Assets</Label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Palette className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Logo & Favicon</p>
                    <p className="text-xs text-gray-500">PNG, SVG, ICO</p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Upload Branding</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload logo, favicon, and brand assets</p>
                  <Button variant="outline" disabled>
                    Choose Files
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Content Hub...</p>
        </div>
      </div>
    )
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
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{stats.totalArticles} Articles</span>
                <span>{stats.publishedArticles} Published</span>
                <span>{stats.draftArticles} Drafts</span>
                <span>{stats.mediaAssets} Media Assets</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
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
              {filteredArticles.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                  <p className="text-gray-600">Start by uploading content or creating a new article.</p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">{article.title_en}</h3>
                          <p className="text-gray-600 text-sm mb-3">{article.excerpt_en}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {article.author.name || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(article.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span className={getSeoScoreColor(article.seo_score)}>
                                SEO: {article.seo_score || 'N/A'}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(article.published)}
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
                          {article.page_type && (
                            <Badge variant="secondary" className="text-xs">
                              {article.page_type}
                            </Badge>
                          )}
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
                ))
              )}
            </div>
          </TabsContent>

          {/* Media Library Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Media Library ({mediaAssets.length} assets)</CardTitle>
              </CardHeader>
              <CardContent>
                {mediaAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No media assets</h3>
                    <p className="text-gray-600 mb-4">Upload images and videos to get started.</p>
                    <Button onClick={() => setUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Media
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mediaAssets.map((asset) => (
                      <div key={asset.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        {asset.file_type === 'image' ? (
                          <img
                            src={asset.url}
                            alt={asset.alt_text || asset.title || 'Media asset'}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-sm truncate">{asset.title || asset.original_name}</h4>
                          <p className="text-xs text-gray-500">
                            {asset.file_type} • {formatFileSize(asset.file_size)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(asset.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Previews Tab */}
          <TabsContent value="social" className="space-y-6">
            {selectedArticle ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Media Previews for: {selectedArticle.title_en}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {['Facebook', 'Twitter', 'Instagram', 'LinkedIn'].map((platform) => (
                        <Card key={platform} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              {platform === 'Facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                              {platform === 'Twitter' && <Twitter className="h-4 w-4 text-blue-400" />}
                              {platform === 'Instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                              {platform === 'LinkedIn' && <Linkedin className="h-4 w-4 text-blue-700" />}
                              <span className="font-medium">{platform}</span>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                                {selectedArticle.featured_image ? (
                                  <img
                                    src={selectedArticle.featured_image}
                                    alt={selectedArticle.title_en}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <Image className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{selectedArticle.title_en}</h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {selectedArticle.excerpt_en.substring(0, 100)}...
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  https://yalla-london.com/blog/{selectedArticle.id}
                                </p>
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

      {/* Upload Modal */}
      <UploadContentModal />
    </div>
  )

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
