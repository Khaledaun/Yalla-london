'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import {
  FileText,
  Save,
  Eye,
  Plus,
  X,
  Upload,
  Image,
  Bold,
  Italic,
  List,
  Quote,
  Link,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminPageHeader,
  AdminCard,
  AdminButton,
  AdminSectionLabel,
  AdminStatusBadge,
} from '@/components/admin/admin-ui'

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

  // Shared input styles
  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-system)',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(214,208,196,0.8)',
    backgroundColor: '#FFFFFF',
    color: '#1C1917',
    width: '100%',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-system)',
    fontSize: 11,
    fontWeight: 600,
    color: '#44403C',
    display: 'block',
    marginBottom: 6,
  }

  const charCountStyle: React.CSSProperties = {
    fontFamily: 'var(--font-system)',
    fontSize: 10,
    color: '#A8A29E',
    marginTop: 4,
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="New Article"
        subtitle="Create a new article for your website"
        backHref="/admin/content"
        action={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => saveArticle('draft')}
              loading={isSaving}
              disabled={isPublishing}
            >
              <Save size={14} />
              Save Draft
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              onClick={() => saveArticle('published')}
              loading={isPublishing}
              disabled={isSaving}
            >
              <Eye size={14} />
              Publish
            </AdminButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Information */}
          <AdminCard>
            <div className="p-5 space-y-4">
              <AdminSectionLabel>Article Information</AdminSectionLabel>

              <div>
                <label htmlFor="title" style={labelStyle}>Title *</label>
                <input
                  id="title"
                  type="text"
                  value={article.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter article title..."
                  style={{ ...inputStyle, fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label htmlFor="slug" style={labelStyle}>URL Slug</label>
                <input
                  id="slug"
                  type="text"
                  value={article.slug}
                  onChange={(e) => setArticle(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="article-url-slug"
                  style={inputStyle}
                />
                <p style={charCountStyle}>
                  URL: /blog/{article.slug || 'article-url-slug'}
                </p>
              </div>

              <div>
                <label htmlFor="excerpt" style={labelStyle}>Excerpt</label>
                <textarea
                  id="excerpt"
                  value={article.excerpt}
                  onChange={(e) => setArticle(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description of the article..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>

              <div>
                <label htmlFor="category" style={labelStyle}>Category</label>
                <select
                  id="category"
                  value={article.category}
                  onChange={(e) => setArticle(prev => ({ ...prev, category: e.target.value }))}
                  className="admin-select"
                  style={inputStyle}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </AdminCard>

          {/* Content Editor */}
          <AdminCard>
            <div className="p-5">
              <AdminSectionLabel>Article Content</AdminSectionLabel>
              <div style={{ border: '1px solid rgba(214,208,196,0.8)', borderRadius: 8, overflow: 'hidden' }}>
                {/* Toolbar */}
                <div
                  className="flex items-center gap-1.5 p-2.5"
                  style={{ borderBottom: '1px solid rgba(214,208,196,0.6)', backgroundColor: '#FAF8F4' }}
                >
                  {[
                    { icon: Bold, label: 'Bold' },
                    { icon: Italic, label: 'Italic' },
                    { icon: List, label: 'List' },
                    { icon: Quote, label: 'Quote' },
                    { icon: Link, label: 'Link' },
                    { icon: Image, label: 'Image' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="p-1.5 rounded-md hover:bg-stone-200 transition-colors"
                      title={label}
                      style={{ color: '#5C564F' }}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>

                {/* Editor */}
                <textarea
                  value={article.content}
                  onChange={(e) => setArticle(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your article content here..."
                  rows={20}
                  style={{
                    ...inputStyle,
                    border: 'none',
                    borderRadius: 0,
                    resize: 'vertical' as const,
                    minHeight: 400,
                  }}
                />
              </div>
            </div>
          </AdminCard>

          {/* Featured Image */}
          <AdminCard>
            <div className="p-5 space-y-4">
              <AdminSectionLabel>Featured Image</AdminSectionLabel>

              <div>
                <label htmlFor="featured-image" style={labelStyle}>Image URL</label>
                <input
                  id="featured-image"
                  type="text"
                  value={article.featuredImage}
                  onChange={(e) => setArticle(prev => ({ ...prev, featuredImage: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  style={inputStyle}
                />
              </div>

              {article.featuredImage && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden" style={{ backgroundColor: '#F5F3EF' }}>
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

              <AdminButton variant="secondary" className="w-full">
                <Upload size={14} />
                Upload from Media Library
              </AdminButton>
            </div>
          </AdminCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Tags */}
          <AdminCard>
            <div className="p-5 space-y-4">
              <AdminSectionLabel>Tags</AdminSectionLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <AdminButton onClick={addTag} size="sm" variant="secondary">
                  <Plus size={14} />
                </AdminButton>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: 'rgba(59,126,161,0.08)',
                      fontFamily: 'var(--font-system)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#1e5a7a',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:opacity-70 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </AdminCard>

          {/* SEO Settings */}
          <AdminCard accent accentColor="gold">
            <div className="p-5 space-y-4">
              <AdminSectionLabel>SEO Settings</AdminSectionLabel>

              <div>
                <label htmlFor="seo-title" style={labelStyle}>SEO Title</label>
                <input
                  id="seo-title"
                  type="text"
                  value={article.seoTitle}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="SEO optimized title"
                  style={inputStyle}
                />
                <p style={{
                  ...charCountStyle,
                  color: (article.seoTitle?.length || 0) > 60 ? '#C8322B' : '#A8A29E',
                }}>
                  {article.seoTitle?.length || 0}/60 characters
                </p>
              </div>

              <div>
                <label htmlFor="seo-description" style={labelStyle}>SEO Description</label>
                <textarea
                  id="seo-description"
                  value={article.seoDescription}
                  onChange={(e) => setArticle(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="SEO meta description"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
                <p style={{
                  ...charCountStyle,
                  color: (article.seoDescription?.length || 0) > 160 ? '#C8322B' : '#A8A29E',
                }}>
                  {article.seoDescription?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <label style={labelStyle}>Meta Keywords</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <AdminButton onClick={addKeyword} size="sm" variant="secondary">
                    <Plus size={14} />
                  </AdminButton>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {article.metaKeywords?.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: 'rgba(196,154,42,0.08)',
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#7a5a10',
                        border: '1px solid rgba(196,154,42,0.2)',
                      }}
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-0.5 hover:opacity-70 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Publishing */}
          <AdminCard>
            <div className="p-5 space-y-4">
              <AdminSectionLabel>Publishing</AdminSectionLabel>

              <div>
                <label style={labelStyle}>Status</label>
                <div className="flex gap-2 mt-1">
                  <AdminButton
                    variant={article.status === 'draft' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setArticle(prev => ({ ...prev, status: 'draft' }))}
                  >
                    Draft
                  </AdminButton>
                  <AdminButton
                    variant={article.status === 'published' ? 'success' : 'secondary'}
                    size="sm"
                    onClick={() => setArticle(prev => ({ ...prev, status: 'published' }))}
                  >
                    Published
                  </AdminButton>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(214,208,196,0.5)', paddingTop: 16 }}>
                <AdminButton
                  onClick={() => saveArticle('draft')}
                  loading={isSaving}
                  disabled={isPublishing}
                  variant="secondary"
                  className="w-full mb-2"
                >
                  <Save size={14} />
                  Save Draft
                </AdminButton>
                <AdminButton
                  onClick={() => saveArticle('published')}
                  loading={isPublishing}
                  disabled={isSaving}
                  variant="primary"
                  className="w-full"
                >
                  <Eye size={14} />
                  Publish Article
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
