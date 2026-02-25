'use client'

import React, { useState, useEffect } from 'react'
import { 
  Home, 
  Video, 
  Image, 
  Settings, 
  Eye, 
  Save, 
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Palette,
  Type,
  Layout,
  Globe,
  Shield,
  FileText,
  Mail,
  Phone
} from 'lucide-react'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'

const _siteCfg = getSiteConfig(getDefaultSiteId())

interface HomepageBlock {
  id: string
  type: 'hero' | 'featured' | 'events' | 'testimonials' | 'blog-grid' | 'cta'
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  media_id?: string
  position: number
  enabled: boolean
  version: 'draft' | 'published'
  language: 'en' | 'ar' | 'both'
  config: any
  // Video hero specific fields
  heroVideoId?: string
  heroVideoPoster?: string
  heroVideoAutoplay?: boolean
  heroVideoMuted?: boolean
  heroVideoLoop?: boolean
}

interface MediaAsset {
  id: string
  filename: string
  url: string
  file_type: 'image' | 'video'
  width?: number
  height?: number
  isVideo: boolean
  isHeroVideo: boolean
  duration?: number
}

interface SiteConfig {
  id: string
  homepage_json: any
  hero_video_url?: string
  hero_mobile_video_url?: string
  hero_poster_url?: string
  hero_autoplay: boolean
  hero_muted: boolean
  hero_loop: boolean
  hero_cta_label?: string
  hero_cta_href?: string
  hero_headline?: string
  hero_subheadline?: string
  theme_config: any
}

export default function SiteControl() {
  const [activeTab, setActiveTab] = useState<'homepage' | 'media' | 'pages' | 'theme' | 'settings'>('homepage')
  const [blocks, setBlocks] = useState<HomepageBlock[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<HomepageBlock | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)

  useEffect(() => {
    loadSiteData()
  }, [])

  const loadSiteData = async () => {
    setIsLoading(true)
    try {
      // Mock data - will be replaced with real API calls
      const mockBlocks: HomepageBlock[] = [
        {
          id: '1',
          type: 'hero',
          title_en: 'Welcome to London',
          title_ar: 'مرحباً بك في لندن',
          content_en: 'Discover the best of London with our comprehensive guides and recommendations',
          content_ar: 'اكتشف أفضل ما في لندن من خلال أدلتنا الشاملة والتوصيات',
          position: 1,
          enabled: true,
          version: 'draft',
          language: 'both',
          config: {
            backgroundType: 'video',
            overlay: true,
            overlayOpacity: 0.4
          },
          heroVideoId: 'video_1',
          heroVideoPoster: '/images/hero-poster.jpg',
          heroVideoAutoplay: true,
          heroVideoMuted: true,
          heroVideoLoop: true
        },
        {
          id: '2',
          type: 'featured',
          title_en: 'Featured Experiences',
          title_ar: 'التجارب المميزة',
          content_en: 'Handpicked experiences for your London adventure',
          content_ar: 'تجارب مختارة بعناية لمغامرتك في لندن',
          position: 2,
          enabled: true,
          version: 'draft',
          language: 'both',
          config: {
            layout: 'grid',
            itemsPerRow: 3,
            showRatings: true
          }
        },
        {
          id: '3',
          type: 'events',
          title_en: 'Upcoming Events',
          title_ar: 'الأحداث القادمة',
          content_en: 'Don\'t miss out on London\'s exciting events',
          content_ar: 'لا تفوت الأحداث المثيرة في لندن',
          position: 3,
          enabled: true,
          version: 'draft',
          language: 'both',
          config: {
            limit: 6,
            showDates: true,
            showLocations: true
          }
        }
      ]

      const mockMedia: MediaAsset[] = [
        {
          id: 'video_1',
          filename: 'london-hero-video.mp4',
          url: '/videos/london-hero-video.mp4',
          file_type: 'video',
          width: 1920,
          height: 1080,
          isVideo: true,
          isHeroVideo: true,
          duration: 30
        },
        {
          id: 'image_1',
          filename: 'hero-poster.jpg',
          url: '/images/hero-poster.jpg',
          file_type: 'image',
          width: 1920,
          height: 1080,
          isVideo: false,
          isHeroVideo: false
        },
        {
          id: 'video_2',
          filename: 'london-mobile-hero.mp4',
          url: '/videos/london-mobile-hero.mp4',
          file_type: 'video',
          width: 1080,
          height: 1920,
          isVideo: true,
          isHeroVideo: true,
          duration: 25
        }
      ]

      const mockConfig: SiteConfig = {
        id: '1',
        homepage_json: {},
        hero_video_url: '/videos/london-hero-video.mp4',
        hero_mobile_video_url: '/videos/london-mobile-hero.mp4',
        hero_poster_url: '/images/hero-poster.jpg',
        hero_autoplay: true,
        hero_muted: true,
        hero_loop: true,
        hero_cta_label: 'Explore London',
        hero_cta_href: '/recommendations',
        hero_headline: 'Welcome to London',
        hero_subheadline: 'Discover the best of London with our comprehensive guides',
        theme_config: {
          primaryColor: '#8B5CF6',
          secondaryColor: '#F59E0B',
          fontFamily: 'Inter'
        }
      }

      setBlocks(mockBlocks)
      setMediaAssets(mockMedia)
      setSiteConfig(mockConfig)
    } catch (error) {
      console.error('Failed to load site data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBlockUpdate = (blockId: string, updates: Partial<HomepageBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ))
  }

  const handleAddBlock = (type: HomepageBlock['type']) => {
    const newBlock: HomepageBlock = {
      id: `block_${Date.now()}`,
      type,
      title_en: `New ${type} Block`,
      title_ar: `كتلة ${type} جديدة`,
      content_en: '',
      content_ar: '',
      position: blocks.length + 1,
      enabled: true,
      version: 'draft',
      language: 'both',
      config: {}
    }
    setBlocks(prev => [...prev, newBlock])
  }

  const handleSaveHomepage = async () => {
    try {
      // Implement save logic
      console.log('Saving homepage configuration...')
      // API call to save blocks and config
    } catch (error) {
      console.error('Failed to save homepage:', error)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploadingLogo(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      // Upload to API
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Logo uploaded successfully! URL: ${result.url}`)
        
        // Update site config
        setSiteConfig(prev => prev ? {
          ...prev,
          logo_url: result.url
        } : null)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 1MB for favicon)
    if (file.size > 1 * 1024 * 1024) {
      alert('Favicon size must be less than 1MB')
      return
    }

    setUploadingFavicon(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setFaviconPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'favicon')

      // Upload to API
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Favicon uploaded successfully! URL: ${result.url}`)
        
        // Update site config
        setSiteConfig(prev => prev ? {
          ...prev,
          favicon_url: result.url
        } : null)
      } else {
        const error = await response.json()
        alert(`Upload failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Favicon upload error:', error)
      alert('Failed to upload favicon. Please try again.')
    } finally {
      setUploadingFavicon(false)
    }
  }

  const handlePublishHomepage = async () => {
    try {
      // Implement publish logic
      console.log('Publishing homepage...')
      // API call to publish blocks
    } catch (error) {
      console.error('Failed to publish homepage:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Home className="h-12 w-12 animate-pulse text-purple-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Site Control...</h2>
          <p className="text-gray-600">Setting up your site management tools</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Home className="h-8 w-8 text-purple-500" />
            Site Control
          </h1>
          <p className="text-gray-600 mt-1">Manage your homepage, media, and site settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              previewMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            onClick={handleSaveHomepage}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={handlePublishHomepage}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Upload className="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'homepage', label: 'Homepage Builder', icon: Layout },
            { id: 'media', label: 'Media Library', icon: Image },
            { id: 'pages', label: 'Static Pages', icon: FileText },
            { id: 'theme', label: 'Theme & Branding', icon: Palette },
            { id: 'settings', label: 'Site Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'homepage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocks List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Homepage Blocks</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddBlock('hero')}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
                >
                  + Hero
                </button>
                <button
                  onClick={() => handleAddBlock('featured')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                >
                  + Featured
                </button>
                <button
                  onClick={() => handleAddBlock('events')}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                >
                  + Events
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBlock?.id === block.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBlock(block)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{block.title_en}</h4>
                      <p className="text-sm text-gray-600">{block.type} • Position {block.position}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        block.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {block.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        block.version === 'published' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {block.version}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block Editor */}
          <div className="space-y-6">
            {selectedBlock ? (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Block</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title (English)</label>
                    <input
                      type="text"
                      value={selectedBlock.title_en}
                      onChange={(e) => handleBlockUpdate(selectedBlock.id, { title_en: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title (Arabic)</label>
                    <input
                      type="text"
                      value={selectedBlock.title_ar}
                      onChange={(e) => handleBlockUpdate(selectedBlock.id, { title_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {selectedBlock.type === 'hero' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Hero Media Settings</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background Type</label>
                        <select
                          value={selectedBlock.config?.backgroundType || 'image'}
                          onChange={(e) => handleBlockUpdate(selectedBlock.id, { 
                            config: { ...selectedBlock.config, backgroundType: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="image">Hero Image</option>
                          <option value="video">Hero Video</option>
                        </select>
                      </div>

                      {selectedBlock.config?.backgroundType === 'video' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video</label>
                          <select
                            value={selectedBlock.heroVideoId || ''}
                            onChange={(e) => handleBlockUpdate(selectedBlock.id, { heroVideoId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Select Video</option>
                            {mediaAssets.filter(asset => asset.isVideo && asset.isHeroVideo).map(asset => (
                              <option key={asset.id} value={asset.id}>{asset.filename}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedBlock.config?.backgroundType === 'image' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                          <select
                            value={selectedBlock.media_id || ''}
                            onChange={(e) => handleBlockUpdate(selectedBlock.id, { media_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Select Image</option>
                            {mediaAssets.filter(asset => !asset.isVideo).map(asset => (
                              <option key={asset.id} value={asset.id}>{asset.filename}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedBlock.heroVideoAutoplay || false}
                            onChange={(e) => handleBlockUpdate(selectedBlock.id, { heroVideoAutoplay: e.target.checked })}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">Autoplay</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedBlock.heroVideoMuted || false}
                            onChange={(e) => handleBlockUpdate(selectedBlock.id, { heroVideoMuted: e.target.checked })}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">Muted</span>
                        </label>
                        
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedBlock.heroVideoLoop || false}
                            onChange={(e) => handleBlockUpdate(selectedBlock.id, { heroVideoLoop: e.target.checked })}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">Loop</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBlock.enabled}
                        onChange={(e) => handleBlockUpdate(selectedBlock.id, { enabled: e.target.checked })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Enabled</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a block to edit its settings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Media Library</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Upload className="h-4 w-4" />
              Upload Media
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mediaAssets.map((asset) => (
              <div key={asset.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {asset.isVideo ? (
                    <Video className="h-8 w-8 text-gray-400" />
                  ) : (
                    <Image className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">{asset.filename}</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {asset.file_type} • {asset.width}x{asset.height}
                  {asset.duration && ` • ${asset.duration}s`}
                </p>
                <div className="flex items-center gap-2">
                  {asset.isHeroVideo && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      Hero Video
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Static Pages</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'privacy', title: 'Privacy Policy', icon: Shield, url: '/privacy' },
              { id: 'terms', title: 'Terms of Service', icon: FileText, url: '/terms' },
              { id: 'contact', title: 'Contact Us', icon: Mail, url: '/contact' },
              { id: 'about', title: 'About Us', icon: Globe, url: '/about' }
            ].map((page) => (
              <div key={page.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <page.icon className="h-6 w-6 text-purple-500" />
                  <h4 className="font-medium text-gray-900">{page.title}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">Manage content and SEO for this page</p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200">
                    Edit
                  </button>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'theme' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Theme & Branding</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Logo & Branding</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <Image className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadingLogo ? 'Uploading...' : 'Recommended: 200x60px, PNG or SVG'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                      {faviconPreview ? (
                        <img src={faviconPreview} alt="Favicon preview" className="w-full h-full object-contain" />
                      ) : (
                        <Image className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        disabled={uploadingFavicon}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadingFavicon ? 'Uploading...' : 'Recommended: 32x32px, ICO or PNG'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    defaultValue={_siteCfg?.name || 'Yalla London'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Color Scheme</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={siteConfig?.theme_config?.primaryColor || '#8B5CF6'}
                      className="w-12 h-10 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={siteConfig?.theme_config?.primaryColor || '#8B5CF6'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={siteConfig?.theme_config?.secondaryColor || '#F59E0B'}
                      className="w-12 h-10 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={siteConfig?.theme_config?.secondaryColor || '#F59E0B'}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Typography</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Site Settings</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">General Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                  <input
                    type="text"
                    defaultValue={_siteCfg?.name || 'Yalla London'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                  <textarea
                    rows={3}
                    defaultValue="Your comprehensive guide to London"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">SEO Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Meta Description</label>
                  <textarea
                    rows={2}
                    defaultValue="Discover the best of London with our comprehensive guides and recommendations"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Keywords</label>
                  <input
                    type="text"
                    defaultValue="London, travel, attractions, restaurants, events"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
