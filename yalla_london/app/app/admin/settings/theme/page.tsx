'use client'

import React, { useState, useEffect } from 'react'
import { PremiumAdminLayout } from '@/src/components/admin/premium-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Palette, 
  Save, 
  RotateCcw, 
  Upload, 
  Eye, 
  Smartphone, 
  Tablet, 
  Monitor,
  Sun,
  Moon,
  Settings,
  Image as ImageIcon,
  Type,
  Layout,
  Paintbrush
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ThemeSettings {
  id?: string
  siteName: string
  siteTagline: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  linkColor: string
  fontFamily: string
  fontSize: 'small' | 'medium' | 'large'
  logoUrl: string
  faviconUrl: string
  headerLayout: 'classic' | 'minimal' | 'centered'
  footerStyle: 'simple' | 'detailed' | 'social'
  darkModeEnabled: boolean
  customCSS: string
  brandColors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
  }
  typography: {
    headingFont: string
    bodyFont: string
    monoFont: string
  }
  layout: {
    containerWidth: 'narrow' | 'normal' | 'wide' | 'full'
    borderRadius: 'none' | 'small' | 'medium' | 'large'
    shadows: boolean
  }
  updatedAt?: string
}

const defaultTheme: ThemeSettings = {
  siteName: 'Yalla London',
  siteTagline: 'Your Guide to London\'s Best',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  linkColor: '#2563EB',
  fontFamily: 'Inter',
  fontSize: 'medium',
  logoUrl: '',
  faviconUrl: '',
  headerLayout: 'classic',
  footerStyle: 'detailed',
  darkModeEnabled: true,
  customCSS: '',
  brandColors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono'
  },
  layout: {
    containerWidth: 'normal',
    borderRadius: 'medium',
    shadows: true
  }
}

export default function ThemeManagementPage() {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeSection, setActiveSection] = useState<'general' | 'colors' | 'typography' | 'layout' | 'advanced'>('general')

  useEffect(() => {
    loadThemeSettings()
  }, [])

  const loadThemeSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings/theme')
      const data = await response.json()
      
      if (data.success && data.data) {
        setTheme({ ...defaultTheme, ...data.data })
      } else {
        setTheme(defaultTheme)
      }
    } catch (error) {
      console.error('Error loading theme settings:', error)
      toast.error('Failed to load theme settings')
      setTheme(defaultTheme)
    } finally {
      setLoading(false)
    }
  }

  const saveThemeSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Theme settings saved successfully')
        setTheme({ ...theme, updatedAt: new Date().toISOString() })
      } else {
        throw new Error(data.error || 'Failed to save theme settings')
      }
    } catch (error) {
      console.error('Error saving theme settings:', error)
      toast.error('Failed to save theme settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = () => {
    if (confirm('Are you sure you want to reset all theme settings to default? This action cannot be undone.')) {
      setTheme(defaultTheme)
      toast.success('Theme reset to default settings')
    }
  }

  const handleInputChange = (field: string, value: any, section?: string) => {
    if (section) {
      setTheme(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof ThemeSettings],
          [field]: value
        }
      }))
    } else {
      setTheme(prev => ({ ...prev, [field]: value }))
    }
  }

  const getPreviewIcon = () => {
    switch (previewMode) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  const sectionTabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'advanced', label: 'Advanced', icon: Paintbrush }
  ]

  if (loading) {
    return (
      <PremiumAdminLayout title="Theme Management">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PremiumAdminLayout>
    )
  }

  return (
    <PremiumAdminLayout 
      title="Theme Management"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Theme' }
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={saveThemeSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {sectionTabs.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {/* Preview Controls */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={previewMode} onValueChange={(value) => setPreviewMode(value as any)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Desktop
                          </div>
                        </SelectItem>
                        <SelectItem value="tablet">
                          <div className="flex items-center gap-2">
                            <Tablet className="h-4 w-4" />
                            Tablet
                          </div>
                        </SelectItem>
                        <SelectItem value="mobile">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Mobile
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Site
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-300 ${
                    previewMode === 'mobile' ? 'max-w-sm mx-auto' :
                    previewMode === 'tablet' ? 'max-w-2xl mx-auto' :
                    'w-full'
                  }`}
                  style={{ aspectRatio: previewMode === 'mobile' ? '9/16' : '16/9' }}
                >
                  {/* Preview Content */}
                  <div 
                    className="h-full flex flex-col"
                    style={{ 
                      backgroundColor: theme.backgroundColor,
                      color: theme.textColor,
                      fontFamily: theme.fontFamily
                    }}
                  >
                    {/* Header Preview */}
                    <div 
                      className="p-4 border-b"
                      style={{ backgroundColor: theme.primaryColor, color: 'white' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-lg font-bold">{theme.siteName}</h1>
                          <p className="text-sm opacity-90">{theme.siteTagline}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {theme.darkModeEnabled && (
                            <Moon className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Preview */}
                    <div className="flex-1 p-4">
                      <div className="mb-4">
                        <h2 className="text-xl font-bold mb-2" style={{ color: theme.textColor }}>
                          Welcome to {theme.siteName}
                        </h2>
                        <p className="text-gray-600">
                          This is a preview of how your site will look with the current theme settings.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          className="p-3 rounded"
                          style={{ backgroundColor: theme.secondaryColor, color: 'white' }}
                        >
                          <h3 className="font-semibold">Card Title</h3>
                          <p className="text-sm opacity-90">Sample content</p>
                        </div>
                        <div 
                          className="p-3 rounded"
                          style={{ backgroundColor: theme.accentColor, color: 'white' }}
                        >
                          <h3 className="font-semibold">Another Card</h3>
                          <p className="text-sm opacity-90">More content</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <a 
                          href="#" 
                          className="inline-block"
                          style={{ color: theme.linkColor }}
                        >
                          Sample Link
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Sections */}
            {activeSection === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        value={theme.siteName}
                        onChange={(e) => handleInputChange('siteName', e.target.value)}
                        placeholder="Your site name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="siteTagline">Site Tagline</Label>
                      <Input
                        id="siteTagline"
                        value={theme.siteTagline}
                        onChange={(e) => handleInputChange('siteTagline', e.target.value)}
                        placeholder="Your site tagline"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="logoUrl"
                          value={theme.logoUrl}
                          onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="faviconUrl">Favicon URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="faviconUrl"
                          value={theme.faviconUrl}
                          onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                          placeholder="https://example.com/favicon.ico"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="headerLayout">Header Layout</Label>
                      <Select value={theme.headerLayout} onValueChange={(value) => handleInputChange('headerLayout', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="centered">Centered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="footerStyle">Footer Style</Label>
                      <Select value={theme.footerStyle} onValueChange={(value) => handleInputChange('footerStyle', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Select value={theme.fontSize} onValueChange={(value) => handleInputChange('fontSize', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="darkMode">Dark Mode Support</Label>
                      <p className="text-sm text-gray-500">Enable dark mode toggle for users</p>
                    </div>
                    <Switch
                      id="darkMode"
                      checked={theme.darkModeEnabled}
                      onCheckedChange={(checked) => handleInputChange('darkModeEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'colors' && (
              <Card>
                <CardHeader>
                  <CardTitle>Color Scheme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          placeholder="#1E40AF"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.accentColor}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.accentColor}
                          onChange={(e) => handleInputChange('accentColor', e.target.value)}
                          placeholder="#F59E0B"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.backgroundColor}
                          onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.backgroundColor}
                          onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.textColor}
                          onChange={(e) => handleInputChange('textColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.textColor}
                          onChange={(e) => handleInputChange('textColor', e.target.value)}
                          placeholder="#1F2937"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="linkColor">Link Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={theme.linkColor}
                          onChange={(e) => handleInputChange('linkColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={theme.linkColor}
                          onChange={(e) => handleInputChange('linkColor', e.target.value)}
                          placeholder="#2563EB"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Brand Colors</Label>
                    <div className="grid grid-cols-5 gap-4 mt-2">
                      {Object.entries(theme.brandColors).map(([key, value]) => (
                        <div key={key}>
                          <Label className="text-xs capitalize">{key}</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={value}
                              onChange={(e) => handleInputChange(key, e.target.value, 'brandColors')}
                              className="w-12 h-8 p-1"
                            />
                            <Input
                              value={value}
                              onChange={(e) => handleInputChange(key, e.target.value, 'brandColors')}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'typography' && (
              <Card>
                <CardHeader>
                  <CardTitle>Typography Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="headingFont">Heading Font</Label>
                      <Select value={theme.typography.headingFont} onValueChange={(value) => handleInputChange('headingFont', value, 'typography')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                          <SelectItem value="Montserrat">Montserrat</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bodyFont">Body Font</Label>
                      <Select value={theme.typography.bodyFont} onValueChange={(value) => handleInputChange('bodyFont', value, 'typography')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                          <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="monoFont">Monospace Font</Label>
                      <Select value={theme.typography.monoFont} onValueChange={(value) => handleInputChange('monoFont', value, 'typography')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                          <SelectItem value="Fira Code">Fira Code</SelectItem>
                          <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                          <SelectItem value="Monaco">Monaco</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Font Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div style={{ fontFamily: theme.typography.headingFont }}>
                        <h1 className="text-2xl font-bold mb-2">Heading Font Sample (H1)</h1>
                        <h2 className="text-xl font-semibold mb-2">Subheading Sample (H2)</h2>
                      </div>
                      <div style={{ fontFamily: theme.typography.bodyFont }}>
                        <p className="mb-2">
                          This is a sample paragraph using the body font. It demonstrates how regular text will appear on your website with the selected typography settings.
                        </p>
                      </div>
                      <div style={{ fontFamily: theme.typography.monoFont }}>
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          const code = "sample"; // Monospace font
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'layout' && (
              <Card>
                <CardHeader>
                  <CardTitle>Layout Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="containerWidth">Container Width</Label>
                      <Select value={theme.layout.containerWidth} onValueChange={(value) => handleInputChange('containerWidth', value, 'layout')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="narrow">Narrow (768px)</SelectItem>
                          <SelectItem value="normal">Normal (1024px)</SelectItem>
                          <SelectItem value="wide">Wide (1280px)</SelectItem>
                          <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="borderRadius">Border Radius</Label>
                      <Select value={theme.layout.borderRadius} onValueChange={(value) => handleInputChange('borderRadius', value, 'layout')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="small">Small (4px)</SelectItem>
                          <SelectItem value="medium">Medium (8px)</SelectItem>
                          <SelectItem value="large">Large (16px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shadows">Drop Shadows</Label>
                      <p className="text-sm text-gray-500">Enable subtle drop shadows on cards and components</p>
                    </div>
                    <Switch
                      id="shadows"
                      checked={theme.layout.shadows}
                      onCheckedChange={(checked) => handleInputChange('shadows', checked, 'layout')}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'advanced' && (
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="customCSS">Custom CSS</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Add custom CSS to override default styles. Use with caution.
                    </p>
                    <Textarea
                      id="customCSS"
                      value={theme.customCSS}
                      onChange={(e) => handleInputChange('customCSS', e.target.value)}
                      placeholder="/* Enter your custom CSS here */&#10;.custom-class {&#10;  color: #333;&#10;}"
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Custom CSS Warning
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Custom CSS can break your site layout or styling. Always test changes thoroughly before applying them to production.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {theme.updatedAt && (
                    <div className="text-sm text-gray-500">
                      Last updated: {new Date(theme.updatedAt).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PremiumAdminLayout>
  )
}