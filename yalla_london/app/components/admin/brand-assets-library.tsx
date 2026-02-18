'use client'

import { useState, useMemo } from 'react'
import { sanitizeSvg } from '@/lib/html-sanitizer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Download, Copy, Check, Palette, Type, Image as ImageIcon,
  Square, Circle, FileText, Brush, Sparkles, ExternalLink, Eye
} from 'lucide-react'
import { useSite } from '@/components/site-provider'

// Helper to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 'rgb(0, 0, 0)'
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
}

// Default brand colors (can be overridden by site settings)
const defaultBrandColors = [
  {
    name: 'Navy Primary',
    hex: '#1C1917',
    rgb: 'rgb(26, 31, 54)',
    usage: 'Primary text, headers, buttons, footer'
  },
  {
    name: 'Coral Accent',
    hex: '#C8322B',
    rgb: 'rgb(232, 99, 75)',
    usage: 'CTA buttons, highlights, badges, links'
  },
  {
    name: 'Gray Secondary',
    hex: '#A3A3A3',
    rgb: 'rgb(163, 163, 163)',
    usage: 'Secondary text, borders, subtle elements'
  },
  {
    name: 'Light Navy',
    hex: '#3D3835',
    rgb: 'rgb(45, 52, 82)',
    usage: 'Hover states, gradients, darker sections'
  },
  {
    name: 'Background Light',
    hex: '#F9FAFB',
    rgb: 'rgb(249, 250, 251)',
    usage: 'Page backgrounds, cards, light sections'
  },
  {
    name: 'White',
    hex: '#FFFFFF',
    rgb: 'rgb(255, 255, 255)',
    usage: 'Card backgrounds, text on dark, buttons'
  },
]

// Typography
const typography = [
  {
    name: 'Anybody',
    weights: ['400 Regular', '500 Medium', '600 SemiBold', '700 Bold', '800 ExtraBold'],
    usage: 'English text, headings, body copy',
    link: 'https://fonts.google.com/specimen/Plus+Jakarta+Sans'
  },
  {
    name: 'Cairo',
    weights: ['400 Regular', '500 Medium', '600 SemiBold', '700 Bold'],
    usage: 'Arabic text, RTL content',
    link: 'https://fonts.google.com/specimen/Cairo'
  }
]

// Logo variations
const logos = [
  {
    id: 'primary-dark',
    name: 'Primary Logo (Dark)',
    description: 'Main logo for light backgrounds',
    svg: `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="5" width="40" height="40" rx="8" fill="#1C1917"/>
      <text x="20" y="33" font-family="Anybody, sans-serif" font-weight="800" font-size="22" fill="white" text-anchor="middle">Y</text>
      <circle cx="32" cy="14" r="5" fill="#C8322B"/>
      <text x="52" y="35" font-family="Anybody, sans-serif" font-weight="800" font-size="28" fill="#1C1917">Yalla</text>
      <text x="115" y="35" font-family="Anybody, sans-serif" font-weight="500" font-size="28" fill="#A3A3A3">London</text>
    </svg>`,
    background: 'light'
  },
  {
    id: 'primary-light',
    name: 'Primary Logo (Light)',
    description: 'Main logo for dark backgrounds',
    svg: `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="5" width="40" height="40" rx="8" fill="white"/>
      <text x="20" y="33" font-family="Anybody, sans-serif" font-weight="800" font-size="22" fill="#1C1917" text-anchor="middle">Y</text>
      <circle cx="32" cy="14" r="5" fill="#C8322B"/>
      <text x="52" y="35" font-family="Anybody, sans-serif" font-weight="800" font-size="28" fill="white">Yalla</text>
      <text x="115" y="35" font-family="Anybody, sans-serif" font-weight="500" font-size="28" fill="#A3A3A3">London</text>
    </svg>`,
    background: 'dark'
  },
  {
    id: 'icon-dark',
    name: 'App Icon (Dark)',
    description: 'Square icon for apps and favicons',
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="50" rx="10" fill="#1C1917"/>
      <text x="25" y="34" font-family="Anybody, sans-serif" font-weight="800" font-size="26" fill="white" text-anchor="middle">Y</text>
      <circle cx="38" cy="14" r="6" fill="#C8322B"/>
    </svg>`,
    background: 'light'
  },
  {
    id: 'icon-light',
    name: 'App Icon (Light)',
    description: 'Light version for dark contexts',
    svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="50" rx="10" fill="white"/>
      <text x="25" y="34" font-family="Anybody, sans-serif" font-weight="800" font-size="26" fill="#1C1917" text-anchor="middle">Y</text>
      <circle cx="38" cy="14" r="6" fill="#C8322B"/>
    </svg>`,
    background: 'dark'
  },
]

// Design elements
const designElements = [
  {
    name: 'Card Shadow',
    css: 'box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)',
    usage: 'Cards, modals, elevated elements'
  },
  {
    name: 'Primary Gradient',
    css: 'background: linear-gradient(to right, #1C1917, #3D3835)',
    usage: 'Headers, hero sections, CTAs'
  },
  {
    name: 'Coral Gradient',
    css: 'background: linear-gradient(to right, #C8322B, #e34040)',
    usage: 'Buttons, highlights, accent areas'
  },
  {
    name: 'Border Radius (Cards)',
    css: 'border-radius: 12px (0.75rem)',
    usage: 'Cards, modals, large containers'
  },
  {
    name: 'Border Radius (Buttons)',
    css: 'border-radius: 8px (0.5rem)',
    usage: 'Buttons, inputs, small elements'
  },
  {
    name: 'Border Radius (Pills)',
    css: 'border-radius: 9999px (full)',
    usage: 'Tags, badges, rounded buttons'
  },
]

export function BrandAssetsLibrary() {
  // Get current site context
  const { currentSite } = useSite()
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  // Generate brand colors based on current site
  const brandColors = useMemo(() => {
    const primaryColor = currentSite.primary_color || '#1C1917'
    const secondaryColor = currentSite.secondary_color || '#C8322B'

    return [
      {
        name: 'Primary Color',
        hex: primaryColor,
        rgb: hexToRgb(primaryColor),
        usage: 'Primary text, headers, buttons, footer'
      },
      {
        name: 'Accent Color',
        hex: secondaryColor,
        rgb: hexToRgb(secondaryColor),
        usage: 'CTA buttons, highlights, badges, links'
      },
      {
        name: 'Gray Secondary',
        hex: '#A3A3A3',
        rgb: 'rgb(163, 163, 163)',
        usage: 'Secondary text, borders, subtle elements'
      },
      {
        name: 'Light Primary',
        hex: '#3D3835',
        rgb: 'rgb(45, 52, 82)',
        usage: 'Hover states, gradients, darker sections'
      },
      {
        name: 'Background Light',
        hex: '#F9FAFB',
        rgb: 'rgb(249, 250, 251)',
        usage: 'Page backgrounds, cards, light sections'
      },
      {
        name: 'White',
        hex: '#FFFFFF',
        rgb: 'rgb(255, 255, 255)',
        usage: 'Card backgrounds, text on dark, buttons'
      },
    ]
  }, [currentSite.primary_color, currentSite.secondary_color])

  // Generate site-specific logos
  const siteLogos = useMemo(() => {
    const primaryColor = currentSite.primary_color || '#1C1917'
    const secondaryColor = currentSite.secondary_color || '#C8322B'
    const siteName = currentSite.name || 'Yalla London'
    const firstLetter = siteName.charAt(0).toUpperCase()

    return [
      {
        id: 'primary-dark',
        name: 'Primary Logo (Dark)',
        description: `Main logo for light backgrounds`,
        svg: `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="5" width="40" height="40" rx="8" fill="${primaryColor}"/>
          <text x="20" y="33" font-family="Anybody, sans-serif" font-weight="800" font-size="22" fill="white" text-anchor="middle">${firstLetter}</text>
          <circle cx="32" cy="14" r="5" fill="${secondaryColor}"/>
          <text x="52" y="35" font-family="Anybody, sans-serif" font-weight="800" font-size="28" fill="${primaryColor}">${siteName.split(' ')[0] || 'Site'}</text>
        </svg>`,
        background: 'light'
      },
      {
        id: 'primary-light',
        name: 'Primary Logo (Light)',
        description: 'Main logo for dark backgrounds',
        svg: `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="5" width="40" height="40" rx="8" fill="white"/>
          <text x="20" y="33" font-family="Anybody, sans-serif" font-weight="800" font-size="22" fill="${primaryColor}" text-anchor="middle">${firstLetter}</text>
          <circle cx="32" cy="14" r="5" fill="${secondaryColor}"/>
          <text x="52" y="35" font-family="Anybody, sans-serif" font-weight="800" font-size="28" fill="white">${siteName.split(' ')[0] || 'Site'}</text>
        </svg>`,
        background: 'dark'
      },
      {
        id: 'icon-dark',
        name: 'App Icon (Dark)',
        description: 'Square icon for apps and favicons',
        svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <rect width="50" height="50" rx="10" fill="${primaryColor}"/>
          <text x="25" y="34" font-family="Anybody, sans-serif" font-weight="800" font-size="26" fill="white" text-anchor="middle">${firstLetter}</text>
          <circle cx="38" cy="14" r="6" fill="${secondaryColor}"/>
        </svg>`,
        background: 'light'
      },
      {
        id: 'icon-light',
        name: 'App Icon (Light)',
        description: 'Light version for dark contexts',
        svg: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <rect width="50" height="50" rx="10" fill="white"/>
          <text x="25" y="34" font-family="Anybody, sans-serif" font-weight="800" font-size="26" fill="${primaryColor}" text-anchor="middle">${firstLetter}</text>
          <circle cx="38" cy="14" r="6" fill="${secondaryColor}"/>
        </svg>`,
        background: 'dark'
      },
    ]
  }, [currentSite.name, currentSite.primary_color, currentSite.secondary_color])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(id)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const downloadSVG = (svg: string, filename: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Current Site Info */}
      <Card className="bg-gradient-to-r from-gray-50 to-white border-l-4" style={{ borderLeftColor: currentSite.primary_color || '#1C1917' }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: currentSite.primary_color || '#1C1917' }}
            >
              {currentSite.name?.charAt(0) || 'Y'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentSite.name || 'Yalla London'}</h3>
              <p className="text-sm text-gray-500">Brand assets for {currentSite.domain || currentSite.slug}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Palette className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{brandColors.length}</div>
              <div className="text-sm text-gray-500">Brand Colors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Type className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{typography.length}</div>
              <div className="text-sm text-gray-500">Fonts</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ImageIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{siteLogos.length}</div>
              <div className="text-sm text-gray-500">Logo Variations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Brush className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{designElements.length}</div>
              <div className="text-sm text-gray-500">Design Elements</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" /> Colors
          </TabsTrigger>
          <TabsTrigger value="logos" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Logos
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-2">
            <Type className="w-4 h-4" /> Typography
          </TabsTrigger>
          <TabsTrigger value="elements" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Elements
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Color Palette</CardTitle>
              <CardDescription>Official colors for all Yalla London materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brandColors.map((color, index) => (
                  <div key={index} className="border rounded-xl overflow-hidden">
                    <div
                      className="h-24 w-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{color.name}</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(color.hex, `hex-${index}`)}
                          >
                            {copiedItem === `hex-${index}` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>HEX</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded">{color.hex}</code>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>RGB</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{color.rgb}</code>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logos Tab */}
        <TabsContent value="logos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo Variations</CardTitle>
              <CardDescription>Download SVG files for use in Canva, Figma, or any design tool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {siteLogos.map((logo) => (
                  <div key={logo.id} className="border rounded-xl overflow-hidden">
                    <div
                      className={`p-8 flex items-center justify-center ${
                        logo.background === 'dark' ? 'bg-[#1C1917]' : 'bg-gray-50'
                      }`}
                      style={{ minHeight: '120px' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(logo.svg || '') }}
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{logo.name}</h4>
                          <p className="text-sm text-gray-500">{logo.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(logo.svg, logo.id)}
                          >
                            {copiedItem === logo.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => downloadSVG(logo.svg, `${currentSite.slug || 'site'}-${logo.id}`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Typography</CardTitle>
              <CardDescription>Font families used across all Yalla London materials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {typography.map((font, index) => (
                <div key={index} className="border rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900" style={{ fontFamily: font.name }}>
                        {font.name}
                      </h4>
                      <p className="text-sm text-gray-500">{font.usage}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={font.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" /> Google Fonts
                      </a>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Available Weights:</h5>
                    <div className="flex flex-wrap gap-2">
                      {font.weights.map((weight) => (
                        <Badge key={weight} variant="secondary">{weight}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl mb-2" style={{ fontFamily: font.name }}>
                      The quick brown fox jumps over the lazy dog
                    </p>
                    <p className="text-sm text-gray-600" style={{ fontFamily: font.name }}>
                      ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Elements Tab */}
        <TabsContent value="elements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Design Elements</CardTitle>
              <CardDescription>CSS values and design tokens for consistent styling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {designElements.map((element, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{element.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(element.css, `elem-${index}`)}
                      >
                        {copiedItem === `elem-${index}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <code className="block text-sm bg-gray-100 p-2 rounded mb-2 break-all">
                      {element.css}
                    </code>
                    <p className="text-xs text-gray-500">{element.usage}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Canva Export Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Using in Canva</CardTitle>
              <CardDescription>Quick guide for importing brand assets into Canva</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Import Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-amber-700">
                  <li>Download SVG logos from the Logos tab</li>
                  <li>In Canva, go to Uploads &gt; Upload files</li>
                  <li>Select your downloaded SVG files</li>
                  <li>Add brand colors using the HEX codes above</li>
                  <li>Use Anybody (available in Canva fonts)</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Download className="w-6 h-6" />
                  <span>Download All Logos (ZIP)</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <FileText className="w-6 h-6" />
                  <span>Download Brand Guidelines (PDF)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
