'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Type, Layout, Paintbrush } from 'lucide-react';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  layout: 'full-width' | 'contained' | 'split';
}

export interface AppearanceCustomizerProps {
  theme: ThemeConfig;
  onUpdate: (theme: ThemeConfig) => void;
}

const fontFamilies = [
  { value: 'Anybody', label: 'Anybody (Display)' },
  { value: 'Source Serif 4', label: 'Source Serif 4 (Editorial)' },
  { value: 'Inter', label: 'Inter (Modern Sans-serif)' },
  { value: 'Roboto', label: 'Roboto (Google Sans-serif)' },
  { value: 'Open Sans', label: 'Open Sans (Friendly Sans-serif)' },
  { value: 'Lato', label: 'Lato (Humanist Sans-serif)' },
  { value: 'Montserrat', label: 'Montserrat (Geometric Sans-serif)' },
  { value: 'Merriweather', label: 'Merriweather (Readable Serif)' },
  { value: 'Georgia', label: 'Georgia (Classic Serif)' }
];

const presetThemes = [
  {
    name: 'Ocean Blue',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    fontFamily: 'Inter'
  },
  {
    name: 'Forest Green',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    fontFamily: 'Inter'
  },
  {
    name: 'Sunset Orange',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    fontFamily: 'Inter'
  },
  {
    name: 'Royal Purple',
    primaryColor: '#9333EA',
    secondaryColor: '#7C3AED',
    fontFamily: 'Inter'
  },
  {
    name: 'Classic Navy',
    primaryColor: '#1E40AF',
    secondaryColor: '#1D4ED8',
    fontFamily: 'Merriweather'
  },
  {
    name: 'Elegant Gold',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    fontFamily: 'Source Serif 4'
  }
];

export function AppearanceCustomizer({ theme, onUpdate }: AppearanceCustomizerProps) {
  const applyPresetTheme = (preset: typeof presetThemes[0]) => {
    onUpdate({
      ...theme,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      fontFamily: preset.fontFamily
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance & Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Themes */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Theme Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            {presetThemes.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPresetTheme(preset)}
                className="justify-start gap-2 h-auto p-3"
              >
                <div className="flex gap-1">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: preset.primaryColor }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: preset.secondaryColor }}
                  />
                </div>
                <span className="text-xs">{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Color Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            Colors
          </Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-xs">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => onUpdate({ ...theme, primaryColor: e.target.value })}
                  className="w-12 h-8 p-1 border"
                />
                <Input
                  value={theme.primaryColor}
                  onChange={(e) => onUpdate({ ...theme, primaryColor: e.target.value })}
                  placeholder="#0EA5E9"
                  className="flex-1 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-xs">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => onUpdate({ ...theme, secondaryColor: e.target.value })}
                  className="w-12 h-8 p-1 border"
                />
                <Input
                  value={theme.secondaryColor}
                  onChange={(e) => onUpdate({ ...theme, secondaryColor: e.target.value })}
                  placeholder="#0284C7"
                  className="flex-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            Typography
          </Label>
          
          <div className="space-y-2">
            <Label htmlFor="font-family" className="text-xs">Font Family</Label>
            <Select
              value={theme.fontFamily}
              onValueChange={(value) => onUpdate({ ...theme, fontFamily: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map((font) => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Preview */}
          <div 
            className="p-3 border rounded-lg bg-gray-50"
            style={{ fontFamily: theme.fontFamily }}
          >
            <div className="text-lg font-bold mb-1" style={{ color: theme.primaryColor }}>
              Sample Heading
            </div>
            <div className="text-sm text-gray-600">
              This is how your text will look with the selected font family. 
              The heading uses your primary color.
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout Style
          </Label>
          
          <Select
            value={theme.layout}
            onValueChange={(value: any) => onUpdate({ ...theme, layout: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-width">Full Width</SelectItem>
              <SelectItem value="contained">Contained (Centered)</SelectItem>
              <SelectItem value="split">Split Layout</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-xs text-gray-500">
            Full Width: Content stretches across the entire screen width
            <br />
            Contained: Content is centered with maximum width constraints
            <br />
            Split: Content is organized in distinct left/right sections
          </div>
        </div>

        {/* Color Preview */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Theme Preview</Label>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                style={{ 
                  backgroundColor: theme.primaryColor,
                  fontFamily: theme.fontFamily 
                }}
              >
                Primary Button
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                style={{ 
                  borderColor: theme.secondaryColor,
                  color: theme.secondaryColor,
                  fontFamily: theme.fontFamily 
                }}
              >
                Secondary Button
              </Button>
            </div>
            
            <div style={{ fontFamily: theme.fontFamily }}>
              <h3 
                className="font-bold text-lg mb-2"
                style={{ color: theme.primaryColor }}
              >
                Sample Heading
              </h3>
              <p className="text-gray-600 text-sm">
                This preview shows how your theme colors and typography will appear 
                on your homepage. The layout style affects how content is organized 
                within containers.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}