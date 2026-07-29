'use client'

import React, { useState, useEffect } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminTabs,
  AdminSectionLabel,
  AdminAlertBanner,
} from '@/components/admin/admin-ui'
import {
  Palette,
  Type,
  Layout,
  Save,
  Eye,
  RotateCcw,
  Download,
  Upload,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { toast } from 'sonner'
import { safeLocalGetJSON, safeLocalSetJSON } from '@/lib/safe-storage'

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
  spacing: 'normal',
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
  { value: 'Source Sans Pro', label: 'Source Sans Pro (Versatile)' },
]

const presetThemes = [
  {
    name: 'Yalla London',
    colors: { primaryColor: '#C8322B', secondaryColor: '#1C1917', accentColor: '#C49A2A' },
    font: 'Anybody',
  },
  {
    name: 'Modern Blue',
    colors: { primaryColor: '#2563EB', secondaryColor: '#1D4ED8', accentColor: '#06B6D4' },
    font: 'Roboto',
  },
  {
    name: 'Warm Orange',
    colors: { primaryColor: '#EA580C', secondaryColor: '#C2410C', accentColor: '#F59E0B' },
    font: 'Poppins',
  },
  {
    name: 'Elegant Purple',
    colors: { primaryColor: '#7C3AED', secondaryColor: '#5B21B6', accentColor: '#EC4899' },
    font: 'Source Serif 4',
  },
  {
    name: 'Nature Green',
    colors: { primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#10B981' },
    font: 'Open Sans',
  },
  {
    name: 'Minimal Gray',
    colors: { primaryColor: '#374151', secondaryColor: '#1F2937', accentColor: '#6B7280' },
    font: 'Source Sans Pro',
  },
]

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const [isLoading, setIsLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState('colors')

  useEffect(() => {
    // Load saved theme from localStorage or API
    const savedTheme = safeLocalGetJSON<ThemeConfig>('yalla-theme')
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const saveTheme = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage
      safeLocalSetJSON('yalla-theme', theme)

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
        body: JSON.stringify(theme),
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

  const applyPreset = (preset: (typeof presetThemes)[0]) => {
    setTheme((prev) => ({
      ...prev,
      ...preset.colors,
      fontFamily: preset.font,
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
        } catch {
          toast.error('Invalid theme file')
        }
      }
      reader.readAsText(file)
    }
  }

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'layout', label: 'Layout' },
    { id: 'presets', label: 'Presets' },
  ]

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Theme Settings"
        subtitle="Customize your site's appearance and branding"
        backHref="/admin/settings"
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="ghost" size="sm" onClick={resetTheme}>
              <RotateCcw size={14} />
              Reset
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={exportTheme}>
              <Download size={14} />
              Export
            </AdminButton>
            <AdminButton variant="secondary" size="sm" className="relative">
              <label htmlFor="import-theme" className="flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} />
                Import
                <input
                  id="import-theme"
                  type="file"
                  accept=".json"
                  onChange={importTheme}
                  className="hidden"
                />
              </label>
            </AdminButton>
            <AdminButton variant="primary" size="sm" onClick={saveTheme} loading={isLoading}>
              <Save size={14} />
              {isLoading ? 'Saving...' : 'Save Theme'}
            </AdminButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2">
          <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mt-4">
            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <AdminCard>
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Palette size={16} style={{ color: '#3B7EA1' }} />
                    <AdminSectionLabel>Color Palette</AdminSectionLabel>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Primary Color */}
                    <div>
                      <label
                        htmlFor="primary-color"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Primary Color
                      </label>
                      <div className="flex gap-2 mt-2">
                        <input
                          id="primary-color"
                          type="color"
                          value={theme.primaryColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, primaryColor: e.target.value }))
                          }
                          className="w-12 h-10 rounded-lg border border-stone-200 p-0.5 cursor-pointer"
                        />
                        <input
                          value={theme.primaryColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, primaryColor: e.target.value }))
                          }
                          className="admin-input flex-1"
                          style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                        />
                      </div>
                    </div>
                    {/* Secondary Color */}
                    <div>
                      <label
                        htmlFor="secondary-color"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Secondary Color
                      </label>
                      <div className="flex gap-2 mt-2">
                        <input
                          id="secondary-color"
                          type="color"
                          value={theme.secondaryColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, secondaryColor: e.target.value }))
                          }
                          className="w-12 h-10 rounded-lg border border-stone-200 p-0.5 cursor-pointer"
                        />
                        <input
                          value={theme.secondaryColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, secondaryColor: e.target.value }))
                          }
                          className="admin-input flex-1"
                          style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                        />
                      </div>
                    </div>
                    {/* Accent Color */}
                    <div>
                      <label
                        htmlFor="accent-color"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Accent Color
                      </label>
                      <div className="flex gap-2 mt-2">
                        <input
                          id="accent-color"
                          type="color"
                          value={theme.accentColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, accentColor: e.target.value }))
                          }
                          className="w-12 h-10 rounded-lg border border-stone-200 p-0.5 cursor-pointer"
                        />
                        <input
                          value={theme.accentColor}
                          onChange={(e) =>
                            setTheme((prev) => ({ ...prev, accentColor: e.target.value }))
                          }
                          className="admin-input flex-1"
                          style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Color preview swatches */}
                  <div className="flex gap-2 mt-5">
                    <div
                      className="h-8 flex-1 rounded-lg"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <div
                      className="h-8 flex-1 rounded-lg"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <div
                      className="h-8 flex-1 rounded-lg"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Typography Tab */}
            {activeTab === 'typography' && (
              <AdminCard>
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Type size={16} style={{ color: '#3B7EA1' }} />
                    <AdminSectionLabel>Typography</AdminSectionLabel>
                  </div>
                  <div>
                    <label
                      htmlFor="font-family"
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#44403C',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Font Family
                    </label>
                    <select
                      id="font-family"
                      value={theme.fontFamily}
                      onChange={(e) =>
                        setTheme((prev) => ({ ...prev, fontFamily: e.target.value }))
                      }
                      className="admin-select mt-2 w-full"
                      style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Font preview */}
                  <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.6)' }}>
                    <p
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#1C1917',
                        lineHeight: 1.3,
                      }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </p>
                    <p
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: 14,
                        color: '#57534E',
                        marginTop: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                      incididunt ut labore et dolore magna aliqua.
                    </p>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <AdminCard>
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Layout size={16} style={{ color: '#3B7EA1' }} />
                    <AdminSectionLabel>Layout & Spacing</AdminSectionLabel>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="layout-style"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Layout Style
                      </label>
                      <select
                        id="layout-style"
                        value={theme.layout}
                        onChange={(e) =>
                          setTheme((prev) => ({
                            ...prev,
                            layout: e.target.value as ThemeConfig['layout'],
                          }))
                        }
                        className="admin-select mt-2 w-full"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                      >
                        <option value="full-width">Full Width</option>
                        <option value="contained">Contained</option>
                        <option value="split">Split Layout</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="border-radius"
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Border Radius
                      </label>
                      <select
                        id="border-radius"
                        value={theme.borderRadius}
                        onChange={(e) =>
                          setTheme((prev) => ({
                            ...prev,
                            borderRadius: e.target.value as ThemeConfig['borderRadius'],
                          }))
                        }
                        className="admin-select mt-2 w-full"
                        style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}
                      >
                        <option value="none">None</option>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Presets Tab */}
            {activeTab === 'presets' && (
              <AdminCard>
                <div className="p-4 md:p-5">
                  <AdminSectionLabel>Theme Presets</AdminSectionLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    {presetThemes.map((preset) => (
                      <div
                        key={preset.name}
                        className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid rgba(214,208,196,0.6)',
                        }}
                        onClick={() => applyPreset(preset)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex gap-1">
                            <div
                              className="w-5 h-5 rounded-full"
                              style={{
                                backgroundColor: preset.colors.primaryColor,
                                border: '2px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                              }}
                            />
                            <div
                              className="w-5 h-5 rounded-full -ml-1"
                              style={{
                                backgroundColor: preset.colors.secondaryColor,
                                border: '2px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                              }}
                            />
                            <div
                              className="w-5 h-5 rounded-full -ml-1"
                              style={{
                                backgroundColor: preset.colors.accentColor,
                                border: '2px solid rgba(255,255,255,0.8)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                              }}
                            />
                          </div>
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#1C1917',
                          }}
                        >
                          {preset.name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 11,
                            color: '#78716C',
                            marginTop: 2,
                          }}
                        >
                          {preset.font}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </AdminCard>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <AdminCard>
            <div className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye size={16} style={{ color: '#3B7EA1' }} />
                  <AdminSectionLabel>Live Preview</AdminSectionLabel>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor:
                        previewMode === 'desktop' ? 'rgba(59,126,161,0.1)' : 'transparent',
                      color: previewMode === 'desktop' ? '#3B7EA1' : '#A8A29E',
                    }}
                  >
                    <Monitor size={16} />
                  </button>
                  <button
                    onClick={() => setPreviewMode('tablet')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor:
                        previewMode === 'tablet' ? 'rgba(59,126,161,0.1)' : 'transparent',
                      color: previewMode === 'tablet' ? '#3B7EA1' : '#A8A29E',
                    }}
                  >
                    <Tablet size={16} />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor:
                        previewMode === 'mobile' ? 'rgba(59,126,161,0.1)' : 'transparent',
                      color: previewMode === 'mobile' ? '#3B7EA1' : '#A8A29E',
                    }}
                  >
                    <Smartphone size={16} />
                  </button>
                </div>
              </div>
              <div
                className={`rounded-xl overflow-hidden ${
                  previewMode === 'desktop'
                    ? 'w-full'
                    : previewMode === 'tablet'
                      ? 'w-80 mx-auto'
                      : 'w-64 mx-auto'
                }`}
                style={{ border: '1px solid rgba(214,208,196,0.6)' }}
              >
                <div
                  className="p-4 text-center"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: 'white',
                    fontFamily: theme.fontFamily,
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>Yalla London</h3>
                  <p style={{ fontSize: 12, opacity: 0.9 }}>Your London Experience</p>
                </div>
                <div className="p-4 space-y-3">
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: theme.secondaryColor,
                      color: 'white',
                      borderRadius:
                        theme.borderRadius === 'none'
                          ? '0'
                          : theme.borderRadius === 'small'
                            ? '4px'
                            : theme.borderRadius === 'medium'
                              ? '8px'
                              : '16px',
                    }}
                  >
                    <p style={{ fontSize: 12 }}>Featured Article</p>
                  </div>
                  <div
                    className="p-3"
                    style={{
                      border: `2px solid ${theme.accentColor}`,
                      borderRadius:
                        theme.borderRadius === 'none'
                          ? '0'
                          : theme.borderRadius === 'small'
                            ? '4px'
                            : theme.borderRadius === 'medium'
                              ? '8px'
                              : '16px',
                    }}
                  >
                    <p style={{ fontSize: 12, color: '#44403C' }}>Call to Action</p>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}
