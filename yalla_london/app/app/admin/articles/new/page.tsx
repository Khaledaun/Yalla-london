'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Save,
  Eye,
  ArrowLeft,
  Plus,
  X,
  Upload,
  Image,
  Video,
  Link,
  Bold,
  Italic,
  List,
  Quote
} from 'lucide-react'
import { toast } from 'sonner'

interface Article {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  status: 'draft' | 'published'
  featuredImage?: string
  seoTitle?: string
  seoDescription?: string
  metaKeywords?: string[]
}

export default function NewArticlePage() {
  const router = useRouter()
  const [article, setArticle] = useState<Article>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    status: 'draft',
    featuredImage: '',
    seoTitle: '',
    seoDescription: '',
    metaKeywords: []
  })

  const [newTag, setNewTag] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const categories = [
    'Food & Dining',
    'Culture & Arts',
    'Travel & Tourism',
    'Events & Entertainment',
    'Shopping & Lifestyle'
  ]

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setArticle(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      seoTitle: title
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !article.tags.includes(newTag.trim())) {
      setArticle(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
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

  const addKeyword = () => {
    if (newKeyword.trim() && !article.metaKeywords?.includes(newKeyword.trim())) {
      setArticle(prev => ({
        ...prev,
        metaKeywords: [...(prev.metaKeywords || []), newKeyword.trim()]
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      metaKeywords: prev.metaKeywords?.filter(keyword => keyword !== keywordToRemove) || []
    }))
  }

  const saveArticle = async (status: 'draft' | 'published') => {
    if (!article.title.trim()) {
      toast.error('Please enter a title for your article')
      return
    }

    if (!article.content.trim()) {
      toast.error('Please add some content to your article')
      return
    }

    try {
      if (status === 'draft') {
        setIsSaving(true)
      } else {
        setIsPublishing(true)
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const articleData = {
        ...article,
        status,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Here you would typically save to your database
      console.log('Saving article:', articleData)

      toast.success(status === 'draft' ? 'Article saved as draft!' : 'Article published successfully!')
      router.push('/admin/content')
    } catch (error) {
      toast.error('Failed to save article')
    } finally {
      setIsSaving(false)
      setIsPublishing(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8 text-purple-500" />
                New Article
              </h1>
              <p className="text-gray-600 mt-1">Create a new article for your website</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => saveArticle('draft')}
              disabled={isSaving || isPublishing}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => saveArticle('published')}
              disabled={isSaving || isPublishing}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Article Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={article.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter article title..."
                  className="text-lg"
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
                <p className="text-xs text-gray-500 mt-1">
                  URL: /blog/{article.slug || 'article-url-slug'}
                </p>
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

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={article.category}
                  onChange={(e) => setArticle(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-300 rounded-lg">
                {/* Toolbar */}
                <div className="border-b border-gray-300 p-3 flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Quote className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Image className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Editor */}
                <Textarea
                  value={article.content}
                  onChange={(e) => setArticle(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your article content here..."
                  rows={20}
                  className="border-0 resize-none focus:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="featured-image">Image URL</Label>
                  <Input
                    id="featured-image"
                    value={article.featuredImage}
                    onChange={(e) => setArticle(prev => ({ ...prev, featuredImage: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                {article.featuredImage && (
                  <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                    <NextImage
                      src={article.featuredImage}
                      alt="Featured image preview"
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-full h-full object-cover"
                      style={{ width: '100%', height: '100%' }}
                      unoptimized
                    />
                  </div>
                )}
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload from Media Library
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
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
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={article.seoTitle}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="SEO optimized title"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {article.seoTitle?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seo-description">SEO Description</Label>
                <Textarea
                  id="seo-description"
                  value={article.seoDescription}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="SEO meta description"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {article.seoDescription?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <Label>Meta Keywords</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.metaKeywords?.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="flex items-center gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article Status */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={article.status === 'draft' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setArticle(prev => ({ ...prev, status: 'draft' }))}
                    >
                      Draft
                    </Button>
                    <Button
                      variant={article.status === 'published' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setArticle(prev => ({ ...prev, status: 'published' }))}
                    >
                      Published
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => saveArticle('draft')}
                    disabled={isSaving || isPublishing}
                    variant="outline"
                    className="w-full mb-2"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={() => saveArticle('published')}
                    disabled={isSaving || isPublishing}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isPublishing ? 'Publishing...' : 'Publish Article'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}