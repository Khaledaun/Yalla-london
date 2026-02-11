'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings,
  Home,
  Palette,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  Upload,
  Image,
  Type,
  Layout,
  Zap,
  Clock,
  Target,
  Users,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function SiteControl() {
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>({
    hero: {
      title: 'Discover London with Yalla London',
      subtitle: 'Your ultimate guide to the best experiences in London',
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
      title: 'Welcome to Yalla London!',
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-500">Inactive</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getConversionRate = (views: number, conversions: number) => {
    return views > 0 ? ((conversions / views) * 100).toFixed(1) : '0.0'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-500" />
                Site Control
              </h1>
              <p className="text-gray-600 mt-1">Homepage, theme, pop-ups, and automation settings</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview Site
              </Button>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="homepage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="theme">Theme & Branding</TabsTrigger>
            <TabsTrigger value="popups">Pop-up Offers</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          {/* Homepage Tab */}
          <TabsContent value="homepage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Hero Section
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="hero-title">Hero Title</Label>
                    <Input
                      id="hero-title"
                      value={homepageConfig.hero.title}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hero-subtitle">Hero Subtitle</Label>
                    <Textarea
                      id="hero-subtitle"
                      value={homepageConfig.hero.subtitle}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value }
                      }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hero-image">Background Image URL</Label>
                    <Input
                      id="hero-image"
                      value={homepageConfig.hero.backgroundImage}
                      onChange={(e) => setHomepageConfig(prev => ({
                        ...prev,
                        hero: { ...prev.hero, backgroundImage: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cta1-text">CTA 1 Text</Label>
                      <Input
                        id="cta1-text"
                        value={homepageConfig.hero.cta1Text}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta1Text: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cta1-link">CTA 1 Link</Label>
                      <Input
                        id="cta1-link"
                        value={homepageConfig.hero.cta1Link}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta1Link: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cta2-text">CTA 2 Text</Label>
                      <Input
                        id="cta2-text"
                        value={homepageConfig.hero.cta2Text}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta2Text: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cta2-link">CTA 2 Link</Label>
                      <Input
                        id="cta2-link"
                        value={homepageConfig.hero.cta2Link}
                        onChange={(e) => setHomepageConfig(prev => ({
                          ...prev,
                          hero: { ...prev.hero, cta2Link: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                  <Button onClick={saveHomepageConfig} className="w-full bg-purple-500 hover:bg-purple-600">
                    <Save className="h-4 w-4 mr-2" />
                    Save Hero Section
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-64 rounded-lg overflow-hidden">
                    <img
                      src={homepageConfig.hero.backgroundImage}
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="text-center text-white p-4">
                        <h2 className="text-2xl font-bold mb-2">{homepageConfig.hero.title}</h2>
                        <p className="text-lg mb-4">{homepageConfig.hero.subtitle}</p>
                        <div className="flex gap-4 justify-center">
                          <Button className="bg-white text-black hover:bg-gray-100">
                            {homepageConfig.hero.cta1Text}
                          </Button>
                          <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                            {homepageConfig.hero.cta2Text}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Homepage Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {homepageConfig.modules.map((module) => (
                    <div key={module.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">
                          {module.type === 'article-grid' ? '📄' : '📧'}
                        </div>
                        <div>
                          <div className="font-medium">{module.settings.title}</div>
                          <div className="text-sm text-gray-600 capitalize">{module.type.replace('-', ' ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {module.enabled ? (
                          <ToggleRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-gray-400" />
                        )}
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Scheme
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={themeConfig.primaryColor}
                        onChange={(e) => setThemeConfig(prev => ({
                          ...prev,
                          primaryColor: e.target.value
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeConfig.primaryColor}
                        onChange={(e) => setThemeConfig(prev => ({
                          ...prev,
                          primaryColor: e.target.value
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={themeConfig.secondaryColor}
                        onChange={(e) => setThemeConfig(prev => ({
                          ...prev,
                          secondaryColor: e.target.value
                        }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={themeConfig.secondaryColor}
                        onChange={(e) => setThemeConfig(prev => ({
                          ...prev,
                          secondaryColor: e.target.value
                        }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="font-family">Font Family</Label>
                    <select
                      id="font-family"
                      value={themeConfig.fontFamily}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        fontFamily: e.target.value
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    <Label htmlFor="layout">Layout Style</Label>
                    <select
                      id="layout"
                      value={themeConfig.layout}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        layout: e.target.value as any
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="full-width">Full Width</option>
                      <option value="contained">Contained (Centered)</option>
                      <option value="split">Split Layout (Sidebar)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="dark-mode"
                      checked={themeConfig.darkModeEnabled}
                      onChange={(e) => setThemeConfig(prev => ({
                        ...prev,
                        darkModeEnabled: e.target.checked
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="dark-mode">Enable Dark Mode</Label>
                  </div>
                  <Button onClick={saveThemeConfig} className="w-full bg-purple-500 hover:bg-purple-600">
                    <Save className="h-4 w-4 mr-2" />
                    Save Theme Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Theme Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="w-full h-64 border rounded-lg flex items-center justify-center text-center p-4 overflow-hidden relative"
                    style={{
                      backgroundColor: themeConfig.primaryColor,
                      color: themeConfig.secondaryColor,
                      fontFamily: themeConfig.fontFamily,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20" />
                    <div className="relative z-10">
                      <h3 className="text-2xl font-bold mb-2">Yalla London</h3>
                      <p className="text-lg mb-4">Your site, your style.</p>
                      <div className="flex gap-2 justify-center">
                        <div
                          className="px-4 py-2 rounded"
                          style={{ backgroundColor: themeConfig.secondaryColor, color: themeConfig.primaryColor }}
                        >
                          Primary Button
                        </div>
                        <div
                          className="px-4 py-2 border rounded"
                          style={{ borderColor: themeConfig.secondaryColor, color: themeConfig.secondaryColor }}
                        >
                          Secondary Button
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pop-ups Tab */}
          <TabsContent value="popups" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pop-ups List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Pop-up Offers</h3>
                  <Button
                    onClick={() => setIsCreatingPopup(true)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pop-up
                  </Button>
                </div>
                {popupOffers.map((popup) => (
                  <Card 
                    key={popup.id} 
                    className={`cursor-pointer transition-all ${
                      selectedPopup?.id === popup.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedPopup(popup)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={popup.image}
                          alt={popup.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{popup.name}</h4>
                            {getStatusBadge(popup.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{popup.title}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Views: {popup.analytics.views}</span>
                            <span>Clicks: {popup.analytics.clicks}</span>
                            <span>Conversions: {popup.analytics.conversions}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pop-up Details */}
              <div>
                {selectedPopup ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Pop-up Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={selectedPopup.image}
                          alt={selectedPopup.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="text-xl font-bold">{selectedPopup.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(selectedPopup.status)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Title</Label>
                        <Input value={selectedPopup.title} readOnly />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedPopup.description} readOnly rows={3} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>CTA Text</Label>
                          <Input value={selectedPopup.ctaText} readOnly />
                        </div>
                        <div>
                          <Label>CTA Link</Label>
                          <Input value={selectedPopup.ctaLink} readOnly />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedPopup.analytics.views}
                          </div>
                          <div className="text-xs text-gray-600">Views</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedPopup.analytics.clicks}
                          </div>
                          <div className="text-xs text-gray-600">Clicks</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {getConversionRate(selectedPopup.analytics.views, selectedPopup.analytics.conversions)}%
                          </div>
                          <div className="text-xs text-gray-600">Conversion Rate</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => togglePopupStatus(selectedPopup.id)}
                          className="flex-1"
                        >
                          {selectedPopup.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Pop-up</h3>
                      <p className="text-gray-600">Choose a pop-up from the list to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Content Generation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto Content Generation</div>
                      <div className="text-sm text-gray-600">Automatically generate new content</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {automationSettings.contentGeneration.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Generation Frequency</Label>
                    <select
                      value={automationSettings.contentGeneration.frequency}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        contentGeneration: {
                          ...prev.contentGeneration,
                          frequency: e.target.value as any
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <Label>Topics Per Generation</Label>
                    <Input
                      type="number"
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Publishing Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto Publishing</div>
                      <div className="text-sm text-gray-600">Automatically publish content</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {automationSettings.publishing.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Publishing Time</Label>
                    <Input
                      type="time"
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
                  <div className="flex items-center gap-2">
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
                      className="h-4 w-4"
                    />
                    <Label>Auto-publish without review</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  SEO Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Real-time SEO Optimization</div>
                    <div className="text-sm text-gray-600">Automatically optimize content for SEO</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {automationSettings.seoOptimization.enabled ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
                <div>
                  <Label>Optimization Frequency</Label>
                  <select
                    value={automationSettings.seoOptimization.frequency}
                    onChange={(e) => setAutomationSettings(prev => ({
                      ...prev,
                      seoOptimization: {
                        ...prev.seoOptimization,
                        frequency: e.target.value as any
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveAutomationSettings} className="bg-purple-500 hover:bg-purple-600">
                <Save className="h-4 w-4 mr-2" />
                Save Automation Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
