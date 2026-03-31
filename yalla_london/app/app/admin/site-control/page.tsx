'use client'

import React, { useState, useEffect } from 'react'
import NextImage from 'next/image'
import {
  Home,
  Video,
  Image,
  Settings,
  Eye,
  EyeOff,
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
  Phone,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ExternalLink,
  Plus,
  X,
  Star,
  MapPin,
  MessageSquare,
  Newspaper,
  Users,
  BarChart3,
  HelpCircle,
  Tag,
  ImageIcon,
  Megaphone,
} from 'lucide-react'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { AdminEmptyState } from '@/components/admin/admin-ui'

const _siteCfg = getSiteConfig(getDefaultSiteId())

type BlockType =
  | 'hero'
  | 'featured'
  | 'events'
  | 'testimonials'
  | 'blog-grid'
  | 'cta'
  | 'destination-grid'
  | 'newsletter'
  | 'features'
  | 'gallery'
  | 'partners'
  | 'stats'

interface HomepageBlock {
  id: string
  type: BlockType
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  media_id?: string
  position: number
  enabled: boolean
  version: 'draft' | 'published'
  language: 'en' | 'ar' | 'both'
  config: Record<string, unknown>
  // Video hero specific fields
  heroVideoId?: string
  heroVideoPoster?: string
  heroVideoAutoplay?: boolean
  heroVideoMuted?: boolean
  heroVideoLoop?: boolean
}

interface BlockTemplate {
  type: BlockType
  label: string
  description: string
  icon: React.ElementType
  color: string
  defaults: {
    title_en: string
    title_ar: string
    content_en: string
    content_ar: string
    config: Record<string, unknown>
  }
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    description: 'Full-width hero with headline, subtitle, CTA, and video/image background',
    icon: Megaphone,
    color: 'purple',
    defaults: {
      title_en: 'Welcome to London',
      title_ar: 'مرحباً بكم في لندن',
      content_en: 'Discover the finest luxury experiences in London',
      content_ar: 'اكتشف أفخم التجارب الفاخرة في لندن',
      config: { backgroundType: 'image', ctaLabel: 'Explore Now', ctaHref: '/blog' },
    },
  },
  {
    type: 'featured',
    label: 'Featured Articles',
    description: 'Highlight top articles in a 3-column card grid',
    icon: Star,
    color: 'amber',
    defaults: {
      title_en: 'Editor\'s Picks',
      title_ar: 'اختيارات المحرر',
      content_en: 'Hand-picked articles by our editorial team',
      content_ar: 'مقالات مختارة من فريق التحرير',
      config: { columns: 3, maxItems: 6, showExcerpt: true },
    },
  },
  {
    type: 'events',
    label: 'Events Calendar',
    description: 'Upcoming events with dates, venues and ticket links',
    icon: Newspaper,
    color: 'green',
    defaults: {
      title_en: 'Upcoming Events',
      title_ar: 'الفعاليات القادمة',
      content_en: 'Don\'t miss these exciting events',
      content_ar: 'لا تفوتوا هذه الفعاليات المميزة',
      config: { maxItems: 6, showTicketLink: true, layout: 'grid' },
    },
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Rotating visitor reviews with name, avatar and rating',
    icon: MessageSquare,
    color: 'pink',
    defaults: {
      title_en: 'What Travellers Say',
      title_ar: 'ماذا يقول المسافرون',
      content_en: 'Real experiences from our community',
      content_ar: 'تجارب حقيقية من مجتمعنا',
      config: { autoRotate: true, intervalMs: 5000, showRating: true },
    },
  },
  {
    type: 'blog-grid',
    label: 'Blog Grid',
    description: 'Latest articles in a responsive masonry-style grid',
    icon: Layout,
    color: 'blue',
    defaults: {
      title_en: 'Latest Articles',
      title_ar: 'أحدث المقالات',
      content_en: 'Fresh guides and recommendations',
      content_ar: 'أدلة وتوصيات جديدة',
      config: { columns: 3, maxItems: 9, showCategory: true, showDate: true },
    },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Eye-catching banner with heading, text and action button',
    icon: Megaphone,
    color: 'red',
    defaults: {
      title_en: 'Start Your Journey',
      title_ar: 'ابدأ رحلتك',
      content_en: 'Subscribe to get exclusive travel tips and deals',
      content_ar: 'اشترك للحصول على نصائح سفر حصرية',
      config: { buttonLabel: 'Subscribe Now', buttonHref: '#subscribe', style: 'gradient' },
    },
  },
  {
    type: 'destination-grid',
    label: 'Destination Grid',
    description: 'Neighbourhood or area cards with images, names and article counts',
    icon: MapPin,
    color: 'teal',
    defaults: {
      title_en: 'Explore London',
      title_ar: 'استكشف لندن',
      content_en: 'Browse guides by neighbourhood',
      content_ar: 'تصفح الأدلة حسب الحي',
      config: { columns: 4, showArticleCount: true, destinations: [] },
    },
  },
  {
    type: 'newsletter',
    label: 'Newsletter Signup',
    description: 'Email capture form with headline, description and input field',
    icon: Mail,
    color: 'indigo',
    defaults: {
      title_en: 'Stay in the Loop',
      title_ar: 'ابقَ على اطلاع',
      content_en: 'Weekly luxury travel tips delivered to your inbox',
      content_ar: 'نصائح سفر فاخرة أسبوعية في بريدك',
      config: { placeholder: 'Enter your email', buttonLabel: 'Join', style: 'inline' },
    },
  },
  {
    type: 'features',
    label: 'Features / USPs',
    description: 'Icon grid showcasing site unique selling points (3-4 columns)',
    icon: Shield,
    color: 'emerald',
    defaults: {
      title_en: 'Why Choose Us',
      title_ar: 'لماذا تختارنا',
      content_en: '',
      content_ar: '',
      config: {
        columns: 3,
        items: [
          { icon: 'star', titleEn: 'Expert Guides', titleAr: 'أدلة خبراء', descEn: 'Written by London insiders', descAr: 'بقلم خبراء لندن' },
          { icon: 'shield', titleEn: 'Trusted Reviews', titleAr: 'تقييمات موثوقة', descEn: 'First-hand experiences only', descAr: 'تجارب مباشرة فقط' },
          { icon: 'globe', titleEn: 'Bilingual Content', titleAr: 'محتوى ثنائي اللغة', descEn: 'Full Arabic & English', descAr: 'عربي وإنجليزي كامل' },
        ],
      },
    },
  },
  {
    type: 'gallery',
    label: 'Photo Gallery',
    description: 'Masonry or carousel image gallery with lightbox preview',
    icon: ImageIcon,
    color: 'violet',
    defaults: {
      title_en: 'Gallery',
      title_ar: 'معرض الصور',
      content_en: 'Visual highlights from London',
      content_ar: 'أبرز المشاهد من لندن',
      config: { layout: 'masonry', columns: 3, images: [] },
    },
  },
  {
    type: 'partners',
    label: 'Partners / Logos',
    description: 'Scrolling logo strip of affiliate and trust partners',
    icon: Users,
    color: 'slate',
    defaults: {
      title_en: 'Our Partners',
      title_ar: 'شركاؤنا',
      content_en: 'Trusted by leading travel brands',
      content_ar: 'موثوق من قبل أبرز العلامات التجارية',
      config: { scroll: true, speed: 'normal', logos: [] },
    },
  },
  {
    type: 'stats',
    label: 'Stats Counter',
    description: 'Animated counters showing key numbers (articles, destinations, readers)',
    icon: BarChart3,
    color: 'orange',
    defaults: {
      title_en: 'By the Numbers',
      title_ar: 'بالأرقام',
      content_en: '',
      content_ar: '',
      config: {
        items: [
          { value: 200, suffix: '+', labelEn: 'Articles', labelAr: 'مقال' },
          { value: 50, suffix: '+', labelEn: 'Destinations', labelAr: 'وجهة' },
          { value: 10, suffix: 'K+', labelEn: 'Monthly Readers', labelAr: 'قارئ شهري' },
          { value: 4.8, suffix: '/5', labelEn: 'Rating', labelAr: 'تقييم' },
        ],
      },
    },
  },
]

function getTemplateColorClasses(color: string): { bg: string; text: string; border: string; hoverBg: string } {
  const map: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', hoverBg: 'hover:bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hoverBg: 'hover:bg-amber-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', hoverBg: 'hover:bg-green-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', hoverBg: 'hover:bg-pink-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hoverBg: 'hover:bg-blue-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', hoverBg: 'hover:bg-red-100' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', hoverBg: 'hover:bg-teal-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hoverBg: 'hover:bg-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', hoverBg: 'hover:bg-violet-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', hoverBg: 'hover:bg-slate-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', hoverBg: 'hover:bg-orange-100' },
  }
  return map[color] || map.purple
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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [previewPath, setPreviewPath] = useState('/')
  const [previewKey, setPreviewKey] = useState(0)
  const [selectedBlock, setSelectedBlock] = useState<HomepageBlock | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  useEffect(() => {
    loadSiteData()
  }, [])

  const loadSiteData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/homepage-blocks?version=draft')
      if (res.ok) {
        const data = await res.json()
        setBlocks(Array.isArray(data) ? data : [])
      } else {
        setBlocks([])
      }

      const defaultConfig: SiteConfig = {
        id: 'default',
        homepage_json: {},
        hero_autoplay: true,
        hero_muted: true,
        hero_loop: true,
        theme_config: {
          primaryColor: '#8B5CF6',
          secondaryColor: '#F59E0B',
          fontFamily: 'Inter'
        }
      }

      setMediaAssets([])
      setSiteConfig(defaultConfig)
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

  const handleAddBlock = (type: BlockType) => {
    const template = BLOCK_TEMPLATES.find(t => t.type === type)
    const defaults = template?.defaults
    const newBlock: HomepageBlock = {
      id: `block_${Date.now()}`,
      type,
      title_en: defaults?.title_en || `New ${type} Block`,
      title_ar: defaults?.title_ar || `كتلة ${type} جديدة`,
      content_en: defaults?.content_en || '',
      content_ar: defaults?.content_ar || '',
      position: blocks.length + 1,
      enabled: true,
      version: 'draft',
      language: 'both',
      config: defaults?.config || {},
    }
    setBlocks(prev => [...prev, newBlock])
    setSelectedBlock(newBlock)
    setShowTemplateLibrary(false)
  }

  const handleSaveHomepage = async (version: 'draft' | 'published' = 'draft') => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const results = await Promise.allSettled(
        blocks.map(block =>
          fetch('/api/homepage-blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: block.type,
              titleEn: block.title_en,
              titleAr: block.title_ar,
              contentEn: block.content_en,
              contentAr: block.content_ar,
              config: block.config,
              mediaId: block.media_id,
              position: block.position,
              enabled: block.enabled,
              version,
              language: block.language,
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed: ${res.status}`)
            return res.json()
          })
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        setSaveMessage({ type: 'error', text: `${failed} of ${blocks.length} blocks failed to save` })
      } else {
        setSaveMessage({ type: 'success', text: version === 'published' ? 'Published!' : 'Draft saved!' })
        await loadSiteData()
      }
    } catch (error) {
      console.error('Failed to save homepage:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save homepage' })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 4000)
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
          {/* Preview Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                previewMode
                  ? 'bg-[var(--admin-red)] text-white'
                  : 'bg-[var(--admin-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] hover:bg-white'
              }`}
            >
              {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewMode ? 'Exit Preview' : 'Preview'}
            </button>
            {previewMode && (
              <div className="flex items-center gap-1 ml-1 bg-[var(--admin-bg)] rounded-lg p-1 border border-[var(--admin-border)]">
                {([
                  { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
                  { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                  { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
                ] as const).map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setPreviewDevice(device.id)}
                    title={device.label}
                    className={`p-1.5 rounded transition-colors ${
                      previewDevice === device.id
                        ? 'bg-white text-[var(--admin-red)] shadow-sm'
                        : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <device.icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  onClick={() => setPreviewKey(k => k + 1)}
                  title="Refresh preview"
                  className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <button
            disabled={saving || blocks.length === 0}
            onClick={() => handleSaveHomepage('draft')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              saving || blocks.length === 0
                ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            disabled={saving || blocks.length === 0}
            onClick={() => handleSaveHomepage('published')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              saving || blocks.length === 0
                ? 'bg-purple-600/50 text-white/60 opacity-50 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <Upload className="h-4 w-4" />
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </span>
          )}
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

      {/* Tab Content + Preview Panel */}
      <div className={`flex gap-6 ${previewMode ? 'items-start' : ''}`}>
        {/* Main Content Area */}
        <div className={previewMode ? 'flex-1 min-w-0' : 'w-full'}>

      {activeTab === 'homepage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocks List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Homepage Blocks</h3>
              <button
                onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Add Block
              </button>
            </div>

            {showTemplateLibrary && (
              <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Block Template Library</h4>
                  <button onClick={() => setShowTemplateLibrary(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BLOCK_TEMPLATES.map((template) => {
                    const colors = getTemplateColorClasses(template.color)
                    const Icon = template.icon
                    return (
                      <button
                        key={template.type}
                        onClick={() => handleAddBlock(template.type)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${colors.border} ${colors.bg} ${colors.hoverBg} transition-colors text-left`}
                      >
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                        <span className={`text-sm font-medium ${colors.text}`}>{template.label}</span>
                        <span className="text-xs text-gray-500 text-center leading-tight">{template.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {blocks.length === 0 ? (
                <AdminEmptyState icon={Layout} title="No homepage blocks" description="Click &quot;Add Block&quot; to get started with a template." />
              ) : (
                blocks.map((block) => (
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
                ))
              )}
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

                  {selectedBlock.type === 'cta' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">CTA Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Button Text</label>
                        <input type="text" value={(selectedBlock.config?.buttonText as string) || ''} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, buttonText: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Button URL</label>
                        <input type="text" value={(selectedBlock.config?.buttonUrl as string) || ''} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, buttonUrl: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                        <select value={(selectedBlock.config?.style as string) || 'gradient'} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, style: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value="gradient">Gradient</option>
                          <option value="solid">Solid</option>
                          <option value="outline">Outline</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedBlock.type === 'destination-grid' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Destination Grid Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                        <select value={(selectedBlock.config?.columns as number) || 3} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, columns: parseInt(e.target.value) } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value={2}>2 Columns</option>
                          <option value={3}>3 Columns</option>
                          <option value={4}>4 Columns</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.showMap as boolean) || false} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, showMap: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Show map overlay</span>
                      </label>
                    </div>
                  )}

                  {selectedBlock.type === 'newsletter' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Newsletter Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Placeholder Text</label>
                        <input type="text" value={(selectedBlock.config?.placeholder as string) || ''} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, placeholder: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Submit Button Text</label>
                        <input type="text" value={(selectedBlock.config?.submitText as string) || ''} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, submitText: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.showIncentive as boolean) || false} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, showIncentive: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Show incentive text</span>
                      </label>
                    </div>
                  )}

                  {selectedBlock.type === 'features' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Features Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                        <select value={(selectedBlock.config?.layout as string) || 'grid'} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, layout: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value="grid">Grid</option>
                          <option value="list">List</option>
                          <option value="cards">Cards</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Items per Row</label>
                        <select value={(selectedBlock.config?.itemsPerRow as number) || 3} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, itemsPerRow: parseInt(e.target.value) } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.showIcons as boolean) ?? true} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, showIcons: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Show icons</span>
                      </label>
                    </div>
                  )}

                  {selectedBlock.type === 'gallery' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Gallery Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                        <select value={(selectedBlock.config?.layout as string) || 'masonry'} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, layout: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value="masonry">Masonry</option>
                          <option value="grid">Grid</option>
                          <option value="carousel">Carousel</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Images</label>
                        <input type="number" min={4} max={24} value={(selectedBlock.config?.maxImages as number) || 12} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, maxImages: parseInt(e.target.value) } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.lightbox as boolean) ?? true} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, lightbox: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Enable lightbox</span>
                      </label>
                    </div>
                  )}

                  {selectedBlock.type === 'partners' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Partner Logos Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Display Style</label>
                        <select value={(selectedBlock.config?.displayStyle as string) || 'scroll'} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, displayStyle: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value="scroll">Auto-scroll</option>
                          <option value="grid">Static grid</option>
                          <option value="carousel">Carousel</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.grayscale as boolean) ?? true} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, grayscale: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Grayscale logos</span>
                      </label>
                    </div>
                  )}

                  {selectedBlock.type === 'stats' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Stats Counter Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                        <select value={(selectedBlock.config?.columns as number) || 4} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, columns: parseInt(e.target.value) } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={(selectedBlock.config?.animate as boolean) ?? true} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, animate: e.target.checked } })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                        <span className="text-sm text-gray-700">Animate count-up on scroll</span>
                      </label>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background</label>
                        <select value={(selectedBlock.config?.background as string) || 'dark'} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, background: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                          <option value="brand">Brand colors</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(selectedBlock.type === 'blog-grid' || selectedBlock.type === 'testimonials' || selectedBlock.type === 'events' || selectedBlock.type === 'featured') && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">{BLOCK_TEMPLATES.find(t => t.type === selectedBlock.type)?.label} Settings</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Items</label>
                        <input type="number" min={1} max={20} value={(selectedBlock.config?.maxItems as number) || (selectedBlock.config?.count as number) || 6} onChange={(e) => handleBlockUpdate(selectedBlock.id, { config: { ...selectedBlock.config, maxItems: parseInt(e.target.value) } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
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

          {mediaAssets.length === 0 ? (
            <AdminEmptyState icon={Image} title="No media assets" description="Upload media in the Media Library." />
          ) : (
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
          )}
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
                        <NextImage src={logoPreview} alt="Logo preview" width={0} height={0} sizes="100vw" className="w-full h-full object-contain" style={{ width: '100%', height: '100%' }} unoptimized />
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
                        <NextImage src={faviconPreview} alt="Favicon preview" width={0} height={0} sizes="100vw" className="w-full h-full object-contain" style={{ width: '100%', height: '100%' }} unoptimized />
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

        </div>{/* End Main Content Area */}

        {/* Preview Panel */}
        {previewMode && (
          <div className="sticky top-4" style={{ width: previewDevice === 'desktop' ? '50%' : previewDevice === 'tablet' ? '768px' : '375px', flexShrink: 0 }}>
            <div className="bg-white rounded-xl border border-[var(--admin-border)] shadow-sm overflow-hidden">
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-[var(--admin-bg)] border-b border-[var(--admin-border)]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-[var(--admin-text-muted)] ml-2 font-mono truncate max-w-[200px]">
                    {(() => { try { return getSiteDomain(getDefaultSiteId()); } catch { return 'localhost:3000'; } })()}{previewPath}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={previewPath}
                    onChange={(e) => setPreviewPath(e.target.value)}
                    className="text-xs border border-[var(--admin-border)] rounded px-2 py-1 bg-white text-[var(--admin-text)]"
                  >
                    <option value="/">Homepage</option>
                    <option value="/blog">Blog</option>
                    <option value="/about">About</option>
                    <option value="/contact">Contact</option>
                    <option value="/hotels">Hotels</option>
                    <option value="/experiences">Experiences</option>
                    <option value="/recommendations">Recommendations</option>
                    <option value="/events">Events</option>
                  </select>
                  <a
                    href={`${(() => { try { return getSiteDomain(getDefaultSiteId()); } catch { return ''; } })()}${previewPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              {/* Iframe */}
              <div className="relative bg-gray-100" style={{ height: previewDevice === 'mobile' ? '667px' : previewDevice === 'tablet' ? '1024px' : '600px' }}>
                <iframe
                  key={previewKey}
                  src={`${(() => { try { return getSiteDomain(getDefaultSiteId()); } catch { return 'http://localhost:3000'; } })()}${previewPath}`}
                  className="w-full h-full border-0"
                  title="Site Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
              {/* Preview Footer */}
              <div className="px-4 py-2 bg-[var(--admin-bg)] border-t border-[var(--admin-border)] flex items-center justify-between">
                <span className="text-xs text-[var(--admin-text-muted)]">
                  {previewDevice === 'desktop' ? '1440×900' : previewDevice === 'tablet' ? '768×1024' : '375×667'}
                </span>
                <span className="text-xs text-[var(--admin-text-muted)] capitalize">{previewDevice}</span>
              </div>
            </div>
          </div>
        )}

      </div>{/* End Flex Container */}
    </div>
  )
}
