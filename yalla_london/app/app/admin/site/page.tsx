'use client'

import { useState } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminSectionLabel,
  AdminTabs,
  AdminKPICard,
  AdminEmptyState,
} from '@/components/admin/admin-ui'
import {
  Settings,
  Home,
  Palette,
  Plus,
  Edit,
  Eye,
  Save,
  Layout,
  Zap,
  Clock,
  Target,
  ToggleLeft,
  ToggleRight,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import NextImage from 'next/image'
import { getSiteDomain, getDefaultSiteId, getSiteConfig } from '@/config/sites'

interface HomepageConfig {
  hero: {
    title: string
    subtitle: string
    backgroundImage: string
    cta1Text: string
    cta1Link: string
    cta2Text: string
    cta2Link: string
  }
  modules: {
    id: string
    type: string
    enabled: boolean
    settings: any
  }[]
}

interface PopupOffer {
  id: string
  name: string
  title: string
  description: string
  image: string
  ctaText: string
  ctaLink: string
  status: 'active' | 'inactive' | 'scheduled'
  schedule: {
    startDate: string
    endDate: string
    frequency: 'once' | 'daily' | 'weekly'
  }
  targeting: {
    pages: string[]
    devices: string[]
    newVisitors: boolean
  }
  analytics: {
    views: number
    clicks: number
    conversions: number
  }
  createdAt: string
}

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  layout: 'full-width' | 'contained' | 'split'
  darkModeEnabled: boolean
}

interface AutomationSettings {
  contentGeneration: {
    enabled: boolean
    frequency: 'hourly' | 'daily' | 'weekly'
    topicsPerGeneration: number
  }
  publishing: {
    enabled: boolean
    schedule: string
    autoPublish: boolean
  }
  seoOptimization: {
    enabled: boolean
    frequency: 'realtime' | 'hourly' | 'daily'
  }
}

const _defaultSite = getSiteConfig(getDefaultSiteId())

export default function SiteControl() {
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>({
    hero: {
      title: `Discover ${_defaultSite?.destination || 'London'} with ${_defaultSite?.name || 'Us'}`,
      subtitle: `Your ultimate guide to the best experiences in ${_defaultSite?.destination || 'London'}`,
      backgroundImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200',
      cta1Text: 'Explore Articles',
      cta1Link: '/articles',
      cta2Text: 'Find Deals',
      cta2Link: '/deals'
    },
    modules: [
      {
        id: 'featured-articles',
        type: 'article-grid',
        enabled: true,
        settings: {
          title: 'Latest Articles',
          count: 3,
          layout: 'grid'
        }
      },
      {
        id: 'newsletter-signup',
        type: 'newsletter-signup',
        enabled: true,
        settings: {
          title: 'Stay Updated',
          subtitle: 'Subscribe to our newsletter for the latest London insights.'
        }
      }
    ]
  })

  const [popupOffers, setPopupOffers] = useState<PopupOffer[]>([
    {
      id: '1',
      name: 'Welcome Offer',
      title: `Welcome to ${_defaultSite?.name || 'Our Site'}!`,
      description: 'Get 20% off your first booking with our exclusive welcome offer.',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      ctaText: 'Claim Offer',
      ctaLink: '/welcome-offer',
      status: 'active',
      schedule: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        frequency: 'once'
      },
      targeting: {
        pages: ['/'],
        devices: ['desktop', 'mobile'],
        newVisitors: true
      },
      analytics: {
        views: 1247,
        clicks: 234,
        conversions: 89
      },
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      name: 'Restaurant Deal',
      title: 'Best Restaurant Deals',
      description: 'Discover amazing dining experiences with our restaurant partners.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      ctaText: 'View Restaurants',
      ctaLink: '/restaurants',
      status: 'scheduled',
      schedule: {
        startDate: '2024-01-20',
        endDate: '2024-02-20',
        frequency: 'daily'
      },
      targeting: {
        pages: ['/articles', '/blog'],
        devices: ['desktop', 'mobile'],
        newVisitors: false
      },
      analytics: {
        views: 0,
        clicks: 0,
        conversions: 0
      },
      createdAt: '2024-01-15'
    }
  ])

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    primaryColor: '#8B5CF6',
    secondaryColor: '#1E293B',
    fontFamily: 'Inter',
    layout: 'contained',
    darkModeEnabled: false
  })

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    contentGeneration: {
      enabled: true,
      frequency: 'daily',
      topicsPerGeneration: 5
    },
    publishing: {
      enabled: true,
      schedule: '10:00',
      autoPublish: true
    },
    seoOptimization: {
      enabled: true,
      frequency: 'realtime'
    }
  })

  const [selectedPopup, setSelectedPopup] = useState<PopupOffer | null>(null)
  const [isCreatingPopup, setIsCreatingPopup] = useState(false)
  const [activeTab, setActiveTab] = useState('homepage')

  const saveHomepageConfig = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Homepage configuration saved!')
    } catch (error) {
      toast.error('Failed to save homepage configuration')
    }
  }

  const saveThemeConfig = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Theme configuration saved!')
    } catch (error) {
      toast.error('Failed to save theme configuration')
    }
  }

  const saveAutomationSettings = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Automation settings saved!')
    } catch (error) {
      toast.error('Failed to save automation settings')
    }
  }

  const togglePopupStatus = async (popupId: string) => {
    try {
      setPopupOffers(prev => prev.map(popup =>
        popup.id === popupId
          ? { ...popup, status: popup.status === 'active' ? 'inactive' : 'active' }
          : popup
      ))
      toast.success('Popup status updated!')
    } catch (error) {
      toast.error('Failed to update popup status')
    }
  }

  const getConversionRate = (views: number, conversions: number) => {
    return views > 0 ? ((conversions / views) * 100).toFixed(1) : '0.0'
  }

  const tabItems = [
    { id: 'homepage', label: 'Homepage' },
    { id: 'theme', label: 'Theme & Branding' },
    { id: 'popups', label: 'Pop-up Offers' },
    { id: 'automation', label: 'Automation' },
  ]

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Site Control"
        subtitle="Homepage, theme, pop-ups, and automation settings"
        action={
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => window.open(getSiteDomain(getDefaultSiteId()), '_blank')}
            >
              <Eye size={14} />
              Preview
            </AdminButton>
            <AdminButton variant="primary" size="sm">
              <Save size={14} />
              Save All
            </AdminButton>
          </div>
        }
      />

      <AdminTabs tabs={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-5">
        {/* ─── Homepage Tab ─── */}
        {activeTab === 'homepage' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AdminCard>
                <div className="flex items-center gap-2 mb-4">
                  <Home size={16} style={{ color: '#C8322B' }} />
                  <AdminSectionLabel>Hero Section</AdminSectionLabel>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="hero-title"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Hero Title
                    </label>
                    <input
                      id="hero-title"
                      className="admin-input"
                      value={homepageConfig.hero.title}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="hero-subtitle"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Hero Subtitle
                    </label>
                    <textarea
                      id="hero-subtitle"
                      className="admin-input"
                      value={homepageConfig.hero.subtitle}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value }
                      }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="hero-image"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      Background Image URL
                    </label>
                    <input
                      id="hero-image"
                      className="admin-input"
                      value={homepageConfig.hero.backgroundImage}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, backgroundImage: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cta1-text"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        CTA 1 Text
                      </label>
                      <input
                        id="cta1-text"
                        className="admin-input"
                        value={homepageConfig.hero.cta1Text}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta1Text: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cta1-link"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        CTA 1 Link
                      </label>
                      <input
                        id="cta1-link"
                        className="admin-input"
                        value={homepageConfig.hero.cta1Link}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta1Link: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cta2-text"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        CTA 2 Text
                      </label>
                      <input
                        id="cta2-text"
                        className="admin-input"
                        value={homepageConfig.hero.cta2Text}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta2Text: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cta2-link"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        CTA 2 Link
                      </label>
                      <input
                        id="cta2-link"
                        className="admin-input"
                        value={homepageConfig.hero.cta2Link}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta2Link: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <AdminButton onClick={saveHomepageConfig} variant="primary" className="w-full justify-center">
                    <Save size={14} />
                    Save Hero Section
                  </AdminButton>
                </div>
              </AdminCard>

              <AdminCard>
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} style={{ color: '#3B7EA1' }} />
                  <AdminSectionLabel>Live Preview</AdminSectionLabel>
                </div>
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <NextImage
                    src={homepageConfig.hero.backgroundImage}
                    alt="Hero preview"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-full object-cover"
                    style={{ width: '100%', height: '100%' }}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="text-center text-white p-4">
                      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                        {homepageConfig.hero.title}
                      </h2>
                      <p style={{ fontFamily: 'var(--font-system)', fontSize: 14, marginBottom: 16, opacity: 0.9 }}>
                        {homepageConfig.hero.subtitle}
                      </p>
                      <div className="flex gap-3 justify-center">
                        <span
                          className="px-4 py-2 rounded-lg text-sm font-semibold"
                          style={{ backgroundColor: '#FAF8F4', color: '#1C1917' }}
                        >
                          {homepageConfig.hero.cta1Text}
                        </span>
                        <span
                          className="px-4 py-2 rounded-lg text-sm font-semibold"
                          style={{ border: '1px solid rgba(255,255,255,0.7)', color: '#fff' }}
                        >
                          {homepageConfig.hero.cta2Text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>

            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <Layout size={16} style={{ color: '#C49A2A' }} />
                <AdminSectionLabel>Homepage Modules</AdminSectionLabel>
              </div>
              <div className="space-y-3">
                {homepageConfig.modules.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.5)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: 'rgba(200,50,43,0.08)', color: '#C8322B' }}
                      >
                        {module.type === 'article-grid' ? '📄' : '📧'}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                          {module.settings.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {module.type.replace('-', ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {module.enabled ? (
                        <ToggleRight size={22} style={{ color: '#2D5A3D' }} />
                      ) : (
                        <ToggleLeft size={22} style={{ color: '#A8A29E' }} />
                      )}
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setHomepageConfig(prev => ({
                          ...prev,
                          modules: prev.modules.map(m => m.id === module.id ? { ...m, enabled: !m.enabled } : m)
                        }))}
                      >
                        <Edit size={14} />
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* ─── Theme Tab ─── */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <Palette size={16} style={{ color: '#C49A2A' }} />
                <AdminSectionLabel>Color Scheme</AdminSectionLabel>
              </div>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="primary-color"
                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={themeConfig.primaryColor}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        primaryColor: e.target.value
                      }))}
                      className="w-12 h-10 rounded-lg border border-stone-200 cursor-pointer"
                      style={{ padding: 2 }}
                    />
                    <input
                      className="admin-input flex-1"
                      value={themeConfig.primaryColor}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        primaryColor: e.target.value
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="secondary-color"
                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="secondary-color"
                      type="color"
                      value={themeConfig.secondaryColor}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        secondaryColor: e.target.value
                      }))}
                      className="w-12 h-10 rounded-lg border border-stone-200 cursor-pointer"
                      style={{ padding: 2 }}
                    />
                    <input
                      className="admin-input flex-1"
                      value={themeConfig.secondaryColor}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        secondaryColor: e.target.value
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="font-family"
                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    Font Family
                  </label>
                  <select
                    id="font-family"
                    className="admin-select"
                    value={themeConfig.fontFamily}
                    onChange={(e) => setThemeConfig(prev => ({
                      ...prev,
                      fontFamily: e.target.value
                    }))}
                  >
                    <option value="Inter">Inter (Sans-serif)</option>
                    <option value="Roboto">Roboto (Sans-serif)</option>
                    <option value="Open Sans">Open Sans (Sans-serif)</option>
                    <option value="Lato">Lato (Sans-serif)</option>
                    <option value="Montserrat">Montserrat (Sans-serif)</option>
                    <option value="Anybody">Anybody (Display)</option>
                    <option value="Source Serif 4">Source Serif 4 (Editorial)</option>
                    <option value="Merriweather">Merriweather (Serif)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="layout"
                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    Layout Style
                  </label>
                  <select
                    id="layout"
                    className="admin-select"
                    value={themeConfig.layout}
                    onChange={(e) => setThemeConfig(prev => ({
                      ...prev,
                      layout: e.target.value as any
                    }))}
                  >
                    <option value="full-width">Full Width</option>
                    <option value="contained">Contained (Centered)</option>
                    <option value="split">Split Layout (Sidebar)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="dark-mode"
                    checked={themeConfig.darkModeEnabled}
                    onChange={(e) => setThemeConfig(prev => ({
                      ...prev,
                      darkModeEnabled: e.target.checked
                    }))}
                    className="h-4 w-4 rounded border-stone-300"
                    style={{ accentColor: '#C8322B' }}
                  />
                  <label
                    htmlFor="dark-mode"
                    style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}
                  >
                    Enable Dark Mode
                  </label>
                </div>
                <AdminButton onClick={saveThemeConfig} variant="primary" className="w-full justify-center">
                  <Save size={14} />
                  Save Theme Settings
                </AdminButton>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="flex items-center gap-2 mb-4">
                <Eye size={16} style={{ color: '#3B7EA1' }} />
                <AdminSectionLabel>Theme Preview</AdminSectionLabel>
              </div>
              <div
                className="w-full h-64 rounded-xl flex items-center justify-center text-center p-4 overflow-hidden relative"
                style={{
                  backgroundColor: themeConfig.primaryColor,
                  color: themeConfig.secondaryColor,
                  fontFamily: themeConfig.fontFamily,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
                <div className="relative z-10">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>
                    {_defaultSite?.name || 'Your Site'}
                  </h3>
                  <p style={{ fontSize: 14, marginBottom: 16, opacity: 0.9 }}>Your site, your style.</p>
                  <div className="flex gap-2 justify-center">
                    <div
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: themeConfig.secondaryColor, color: themeConfig.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ borderColor: themeConfig.secondaryColor, color: themeConfig.secondaryColor, border: `1px solid ${themeConfig.secondaryColor}` }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* ─── Pop-ups Tab ─── */}
        {activeTab === 'popups' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pop-ups List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AdminSectionLabel>Pop-up Offers</AdminSectionLabel>
                <AdminButton
                  onClick={() => setIsCreatingPopup(true)}
                  variant="primary"
                  size="sm"
                >
                  <Plus size={14} />
                  Create Pop-up
                </AdminButton>
              </div>
              {popupOffers.map((popup) => (
                <AdminCard
                  key={popup.id}
                  className={`cursor-pointer transition-all ${
                    selectedPopup?.id === popup.id ? 'ring-2 ring-[#C8322B]' : ''
                  }`}
                  elevated={selectedPopup?.id === popup.id}
                >
                  <div onClick={() => setSelectedPopup(popup)}>
                    <div className="flex items-start gap-3">
                      <NextImage
                        src={popup.image}
                        alt={popup.name}
                        width={64}
                        height={64}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        unoptimized
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                            {popup.name}
                          </span>
                          <AdminStatusBadge status={popup.status} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#78716C', marginBottom: 6 }}>
                          {popup.title}
                        </p>
                        <div className="flex items-center gap-3" style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <span>Views: {popup.analytics.views}</span>
                          <span>Clicks: {popup.analytics.clicks}</span>
                          <span>Conv: {popup.analytics.conversions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>

            {/* Pop-up Details */}
            <div>
              {selectedPopup ? (
                <AdminCard accent accentColor="red">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={16} style={{ color: '#C8322B' }} />
                    <AdminSectionLabel>Pop-up Details</AdminSectionLabel>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <NextImage
                        src={selectedPopup.image}
                        alt={selectedPopup.name}
                        width={96}
                        height={96}
                        className="w-20 h-20 object-cover rounded-xl"
                        unoptimized
                      />
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917' }}>
                          {selectedPopup.name}
                        </h3>
                        <div className="mt-1">
                          <AdminStatusBadge status={selectedPopup.status} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Title
                      </label>
                      <input className="admin-input" value={selectedPopup.title} readOnly />
                    </div>

                    <div>
                      <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Description
                      </label>
                      <textarea className="admin-input" value={selectedPopup.description} readOnly rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          CTA Text
                        </label>
                        <input className="admin-input" value={selectedPopup.ctaText} readOnly />
                      </div>
                      <div>
                        <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          CTA Link
                        </label>
                        <input className="admin-input" value={selectedPopup.ctaLink} readOnly />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <AdminKPICard
                        value={selectedPopup.analytics.views}
                        label="Views"
                        color="#3B7EA1"
                      />
                      <AdminKPICard
                        value={selectedPopup.analytics.clicks}
                        label="Clicks"
                        color="#2D5A3D"
                      />
                      <AdminKPICard
                        value={`${getConversionRate(selectedPopup.analytics.views, selectedPopup.analytics.conversions)}%`}
                        label="Conversion"
                        color="#C49A2A"
                      />
                    </div>

                    <div className="flex gap-2">
                      <AdminButton
                        variant="secondary"
                        onClick={() => togglePopupStatus(selectedPopup.id)}
                        className="flex-1 justify-center"
                      >
                        {selectedPopup.status === 'active' ? 'Deactivate' : 'Activate'}
                      </AdminButton>
                      <AdminButton
                        variant="secondary"
                        className="flex-1 justify-center"
                        onClick={() => { window.location.href = '/admin/workflow?tab=automation'; }}
                      >
                        <Edit size={14} />
                        Edit
                      </AdminButton>
                    </div>
                  </div>
                </AdminCard>
              ) : (
                <AdminEmptyState
                  icon={Target}
                  title="Select a Pop-up"
                  description="Choose a pop-up from the list to view details and analytics"
                />
              )}
            </div>
          </div>
        )}

        {/* ─── Automation Tab ─── */}
        {activeTab === 'automation' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AdminCard accent accentColor="gold">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} style={{ color: '#C49A2A' }} />
                  <AdminSectionLabel>Content Generation</AdminSectionLabel>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                        Auto Content Generation
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                        Automatically generate new content
                      </div>
                    </div>
                    <button
                      onClick={() => setAutomationSettings(prev => ({
                        ...prev,
                        contentGeneration: { ...prev.contentGeneration, enabled: !prev.contentGeneration.enabled }
                      }))}
                    >
                      {automationSettings.contentGeneration.enabled ? (
                        <ToggleRight size={26} style={{ color: '#2D5A3D' }} />
                      ) : (
                        <ToggleLeft size={26} style={{ color: '#A8A29E' }} />
                      )}
                    </button>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Generation Frequency
                    </label>
                    <select
                      className="admin-select"
                      value={automationSettings.contentGeneration.frequency}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        contentGeneration: {
                          ...prev.contentGeneration,
                          frequency: e.target.value as any
                        }
                      }))}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Topics Per Generation
                    </label>
                    <input
                      type="number"
                      className="admin-input"
                      value={automationSettings.contentGeneration.topicsPerGeneration}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        contentGeneration: {
                          ...prev.contentGeneration,
                          topicsPerGeneration: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>
              </AdminCard>

              <AdminCard accent accentColor="blue">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} style={{ color: '#3B7EA1' }} />
                  <AdminSectionLabel>Publishing Schedule</AdminSectionLabel>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                        Auto Publishing
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                        Automatically publish content
                      </div>
                    </div>
                    <button
                      onClick={() => setAutomationSettings(prev => ({
                        ...prev,
                        publishing: { ...prev.publishing, enabled: !prev.publishing.enabled }
                      }))}
                    >
                      {automationSettings.publishing.enabled ? (
                        <ToggleRight size={26} style={{ color: '#2D5A3D' }} />
                      ) : (
                        <ToggleLeft size={26} style={{ color: '#A8A29E' }} />
                      )}
                    </button>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Publishing Time
                    </label>
                    <input
                      type="time"
                      className="admin-input"
                      value={automationSettings.publishing.schedule}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        publishing: {
                          ...prev.publishing,
                          schedule: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      checked={automationSettings.publishing.autoPublish}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        publishing: {
                          ...prev.publishing,
                          autoPublish: e.target.checked
                        }
                      }))}
                      className="h-4 w-4 rounded border-stone-300"
                      style={{ accentColor: '#C8322B' }}
                    />
                    <label style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      Auto-publish without review
                    </label>
                  </div>
                </div>
              </AdminCard>
            </div>

            <AdminCard accent accentColor="green">
              <div className="flex items-center gap-2 mb-4">
                <Search size={16} style={{ color: '#2D5A3D' }} />
                <AdminSectionLabel>SEO Optimization</AdminSectionLabel>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                      Real-time SEO Optimization
                    </div>
                    <div style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                      Automatically optimize content for SEO
                    </div>
                  </div>
                  <button
                    onClick={() => setAutomationSettings(prev => ({
                      ...prev,
                      seoOptimization: { ...prev.seoOptimization, enabled: !prev.seoOptimization.enabled }
                    }))}
                  >
                    {automationSettings.seoOptimization.enabled ? (
                      <ToggleRight size={26} style={{ color: '#2D5A3D' }} />
                    ) : (
                      <ToggleLeft size={26} style={{ color: '#A8A29E' }} />
                    )}
                  </button>
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#44403C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Optimization Frequency
                  </label>
                  <select
                    className="admin-select"
                    value={automationSettings.seoOptimization.frequency}
                    onChange={(e) => setAutomationSettings(prev => ({
                      ...prev,
                      seoOptimization: {
                        ...prev.seoOptimization,
                        frequency: e.target.value as any
                      }
                    }))}
                  >
                    <option value="realtime">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
            </AdminCard>

            <div className="flex justify-end">
              <AdminButton onClick={saveAutomationSettings} variant="primary">
                <Save size={14} />
                Save Automation Settings
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
