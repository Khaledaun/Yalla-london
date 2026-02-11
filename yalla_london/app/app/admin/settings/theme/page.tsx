'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  Type, 
  Layout, 
  Save, 
  Eye, 
  RotateCcw,
  Download,
  Upload,
  Settings,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react'
import { toast } from 'sonner'

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  layout: 'full-width' | 'contained' | 'split'
  borderRadius: 'none' | 'small' | 'medium' | 'large'
  spacing: 'compact' | 'normal' | 'spacious'
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  fontFamily: 'Inter',
  layout: 'contained',
  borderRadius: 'medium',
  spacing: 'normal'
}

const fontOptions = [
  { value: 'Anybody', label: 'Anybody (Display)' },
  { value: 'Source Serif 4', label: 'Source Serif 4 (Editorial)' },
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Roboto', label: 'Roboto (Clean)' },
  { value: 'Open Sans', label: 'Open Sans (Friendly)' },
  { value: 'Lato', label: 'Lato (Professional)' },
  { value: 'Poppins', label: 'Poppins (Bold)' },
  { value: 'Merriweather', label: 'Merriweather (Readable)' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro (Versatile)' }
]

const presetThemes = [
  {
    name: 'Yalla London',
    colors: { primaryColor: '#C8322B', secondaryColor: '#1C1917', accentColor: '#C49A2A' },
    font: 'Anybody'
  },
  {
    name: 'Modern Blue',
    colors: { primaryColor: '#2563EB', secondaryColor: '#1D4ED8', accentColor: '#06B6D4' },
    font: 'Roboto'
  },
  {
    name: 'Warm Orange',
    colors: { primaryColor: '#EA580C', secondaryColor: '#C2410C', accentColor: '#F59E0B' },
    font: 'Poppins'
  },
  {
    name: 'Elegant Purple',
    colors: { primaryColor: '#7C3AED', secondaryColor: '#5B21B6', accentColor: '#EC4899' },
    font: 'Source Serif 4'
  },
  {
    name: 'Nature Green',
    colors: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#10B981' },
    font: 'Open Sans'
  },
  {
    name: 'Minimal Gray',
    colors: { primaryColor: '#374151', secondaryColor: '#1F2937', accentColor: '#6B7280' },
    font: 'Source Sans Pro'
  }
]

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const [isLoading, setIsLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  useEffect(() => {
    // Load saved theme from localStorage or API
    const savedTheme = localStorage.getItem('yalla-theme')
    if (savedTheme) {
      try {
        setTheme(JSON.parse(savedTheme))
      } catch (error) {
        console.error('Error loading saved theme:', error)
      }
    }
  }, [])

  const saveTheme = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('yalla-theme', JSON.stringify(theme))
      
      // Apply theme to document
      const root = document.documentElement
      root.style.setProperty('--primary-color', theme.primaryColor)
      root.style.setProperty('--secondary-color', theme.secondaryColor)
      root.style.setProperty('--accent-color', theme.accentColor)
      root.style.setProperty('--font-family', theme.fontFamily)
      
      // Save to API (if available)
      const response = await fetch('/api/admin/settings/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme)
      })
      
      if (response.ok) {
        toast.success('Theme saved successfully!')
      } else {
        toast.warning('Theme saved locally (API not available)')
      }
    } catch (error) {
      console.error('Error saving theme:', error)
      toast.error('Failed to save theme')
    } finally {
      setIsLoading(false)
    }
  }

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setTheme(prev => ({
      ...prev,
      ...preset.colors,
      fontFamily: preset.font
    }))
  }

  const resetTheme = () => {
    setTheme(defaultTheme)
    toast.info('Theme reset to default')
  }

  const exportTheme = () => {
    const dataStr = JSON.stringify(theme, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'yalla-theme.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Theme exported!')
  }

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedTheme = JSON.parse(e.target?.result as string)
          setTheme(importedTheme)
          toast.success('Theme imported successfully!')
        } catch (error) {
          toast.error('Invalid theme file')
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Theme Settings</h1>
              <p className="text-gray-600 mt-2">Customize your site's appearance and branding</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetTheme}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={exportTheme}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" asChild>
                <label htmlFor="import-theme">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                  <input
                    id="import-theme"
                    type="file"
                    accept=".json"
                    onChange={importTheme}
                    className="hidden"
                  />
                </label>
              </Button>
              <Button onClick={saveTheme} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Theme'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="colors" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="typography">Typography</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="presets">Presets</TabsTrigger>
              </TabsList>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Color Palette
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="primary-color">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primary-color"
                            type="color"
                            value={theme.primaryColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={theme.primaryColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondary-color">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondary-color"
                            type="color"
                            value={theme.secondaryColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={theme.secondaryColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accent-color">Accent Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="accent-color"
                            type="color"
                            value={theme.accentColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={theme.accentColor}
                            onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Typography Tab */}
              <TabsContent value="typography" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Typography
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="font-family">Font Family</Label>
                      <Select
                        value={theme.fontFamily}
                        onValueChange={(value) => setTheme(prev => ({ ...prev, fontFamily: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5" />
                      Layout & Spacing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="layout">Layout Style</Label>
                        <Select
                          value={theme.layout}
                          onValueChange={(value: any) => setTheme(prev => ({ ...prev, layout: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-width">Full Width</SelectItem>
                            <SelectItem value="contained">Contained</SelectItem>
                            <SelectItem value="split">Split Layout</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="border-radius">Border Radius</Label>
                        <Select
                          value={theme.borderRadius}
                          onValueChange={(value: any) => setTheme(prev => ({ ...prev, borderRadius: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Presets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {presetThemes.map((preset) => (
                        <div
                          key={preset.name}
                          className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
                          onClick={() => applyPreset(preset)}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex gap-1">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: preset.colors.primaryColor }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: preset.colors.secondaryColor }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: preset.colors.accentColor }}
                              />
                            </div>
                            <span className="font-medium">{preset.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{preset.font}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`border rounded-lg overflow-hidden ${
                    previewMode === 'desktop' ? 'w-full' :
                    previewMode === 'tablet' ? 'w-80 mx-auto' : 'w-64 mx-auto'
                  }`}
                >
                  <div
                    className="p-4 text-center"
                    style={{
                      backgroundColor: theme.primaryColor,
                      color: 'white',
                      fontFamily: theme.fontFamily
                    }}
                  >
                    <h3 className="text-lg font-bold">Yalla London</h3>
                    <p className="text-sm opacity-90">Your London Experience</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div
                      className="p-3 rounded"
                      style={{
                        backgroundColor: theme.secondaryColor,
                        color: 'white',
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'small' ? '4px' :
                                   theme.borderRadius === 'medium' ? '8px' : '16px'
                      }}
                    >
                      <p className="text-sm">Featured Article</p>
                    </div>
                    <div
                      className="p-3 border rounded"
                      style={{
                        borderColor: theme.accentColor,
                        borderRadius: theme.borderRadius === 'none' ? '0' :
                                   theme.borderRadius === 'small' ? '4px' :
                                   theme.borderRadius === 'medium' ? '8px' : '16px'
                      }}
                    >
                      <p className="text-sm">Call to Action</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
