
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Type, 
  Image, 
  Globe, 
  Save,
  RefreshCw,
  Eye,
  Download,
  Upload,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { brandConfig, generateCSSVariables } from '@/config/brand-config';
import { brandTemplates, type BusinessType } from '@/config/brand-templates';

export function BrandCustomizationPanel() {
  const [activeTab, setActiveTab] = useState('identity');
  const [currentConfig, setCurrentConfig] = useState(brandConfig);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Brand identity settings
  const [siteName, setSiteName] = useState(brandConfig.siteName);
  const [siteNameAr, setSiteNameAr] = useState(brandConfig.siteNameAr);
  const [tagline, setTagline] = useState(brandConfig.tagline);
  const [taglineAr, setTaglineAr] = useState(brandConfig.taglineAr);
  const [description, setDescription] = useState(brandConfig.description);
  const [descriptionAr, setDescriptionAr] = useState(brandConfig.descriptionAr);
  const [businessType, setBusinessType] = useState<BusinessType>(brandConfig.businessType);
  
  // Color settings
  const [colors, setColors] = useState(brandConfig.colors);
  
  // Contact settings
  const [contactEmail, setContactEmail] = useState(brandConfig.contact.email);
  const [contactPhone, setContactPhone] = useState(brandConfig.contact.phone || '');
  const [socialInstagram, setSocialInstagram] = useState(brandConfig.contact.social.instagram || '');
  const [socialTiktok, setSocialTiktok] = useState(brandConfig.contact.social.tiktok || '');
  const [socialFacebook, setSocialFacebook] = useState(brandConfig.contact.social.facebook || '');
  const [socialTwitter, setSocialTwitter] = useState(brandConfig.contact.social.twitter || '');
  
  // Logo settings
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleColorChange = (colorKey: string, value: string) => {
    setColors(prev => ({ ...prev, [colorKey]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyTemplate = (templateKey: BusinessType) => {
    const template = brandTemplates[templateKey];
    if (template) {
      setSiteName(template.siteName);
      setSiteNameAr(template.siteNameAr);
      setTagline(template.tagline);
      setTaglineAr(template.taglineAr);
      setDescription(template.description);
      setDescriptionAr(template.descriptionAr);
      setBusinessType(template.businessType);
      setColors(template.colors);
      setContactEmail(template.contact.email);
      setContactPhone(template.contact.phone || '');
      setSocialInstagram(template.contact.social.instagram || '');
      setSocialTiktok(template.contact.social.tiktok || '');
      setSocialFacebook(template.contact.social.facebook || '');
      setSocialTwitter(template.contact.social.twitter || '');
    }
  };

  const previewChanges = () => {
    // Apply changes to CSS variables for preview
    const newCSSVariables = `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-text: ${colors.text};
        --color-muted: ${colors.muted};
      }
    `;
    
    // Remove existing preview styles
    const existingStyle = document.getElementById('brand-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add new preview styles
    const style = document.createElement('style');
    style.id = 'brand-preview-styles';
    style.textContent = newCSSVariables;
    document.head.appendChild(style);
    
    setPreviewMode(true);
    
    // Auto-remove preview after 30 seconds
    setTimeout(() => {
      if (document.getElementById('brand-preview-styles')) {
        document.getElementById('brand-preview-styles')?.remove();
        setPreviewMode(false);
      }
    }, 30000);
  };

  const saveBrandChanges = async () => {
    setIsSaving(true);
    
    try {
      // Create updated brand configuration
      const updatedConfig = {
        siteName,
        siteNameAr,
        tagline,
        taglineAr,
        description,
        descriptionAr,
        businessType,
        colors,
        contact: {
          email: contactEmail,
          phone: contactPhone,
          social: {
            instagram: socialInstagram,
            tiktok: socialTiktok,
            facebook: socialFacebook,
            twitter: socialTwitter
          }
        }
      };

      // Save to backend (this would typically update environment variables)
      const response = await fetch('/api/admin/update-brand-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      if (response.ok) {
        // Show success message
        alert('Brand configuration updated successfully!');
      }
    } catch (error) {
      console.error('Failed to save brand changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset to default brand settings?')) {
      applyTemplate('luxury-guide');
    }
  };

  const exportBrandConfig = () => {
    const config = {
      siteName,
      siteNameAr,
      tagline,
      taglineAr,
      description,
      descriptionAr,
      businessType,
      colors,
      contact: {
        email: contactEmail,
        phone: contactPhone,
        social: {
          instagram: socialInstagram,
          tiktok: socialTiktok,
          facebook: socialFacebook,
          twitter: socialTwitter
        }
      }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName.toLowerCase().replace(/\s+/g, '-')}-brand-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Brand Customization</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewChanges}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Changes
          </Button>
          <Button onClick={saveBrandChanges} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {previewMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Preview Mode Active</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Your changes are being previewed. This will automatically end in 30 seconds.
          </p>
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Brand Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select value={businessType} onValueChange={(value: BusinessType) => setBusinessType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="luxury-guide">Luxury Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="siteName">Site Name (English)</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Your Brand Name"
                  />
                </div>

                <div>
                  <Label htmlFor="siteNameAr">Site Name (Arabic)</Label>
                  <Input
                    id="siteNameAr"
                    value={siteNameAr}
                    onChange={(e) => setSiteNameAr(e.target.value)}
                    placeholder="اسم علامتك التجارية"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label htmlFor="tagline">Tagline (English)</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Your brand tagline"
                  />
                </div>

                <div>
                  <Label htmlFor="taglineAr">Tagline (Arabic)</Label>
                  <Input
                    id="taglineAr"
                    value={taglineAr}
                    onChange={(e) => setTaglineAr(e.target.value)}
                    placeholder="شعار علامتك التجارية"
                    dir="rtl"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="description">Description (English)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your brand and what you offer..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                  <Textarea
                    id="descriptionAr"
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    placeholder="وصف علامتك التجارية وما تقدمه..."
                    rows={4}
                    dir="rtl"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="colors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={key}
                        type="color"
                        value={value}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-20 h-10 p-1 border rounded"
                      />
                      <Input
                        value={value}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        placeholder="#000000"
                        className="flex-1 font-mono"
                      />
                    </div>
                    <div 
                      className="w-full h-8 rounded border" 
                      style={{ backgroundColor: value }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Quick Color Schemes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Luxury Purple', colors: { primary: '#7C3AED', secondary: '#EAB308', accent: '#EC4899' } },
                    { name: 'Kids Pink', colors: { primary: '#FF6B9D', secondary: '#4ECDC4', accent: '#FFE066' } },
                    { name: 'Real Estate Blue', colors: { primary: '#1E40AF', secondary: '#059669', accent: '#DC2626' } },
                    { name: 'Elegant Black', colors: { primary: '#000000', secondary: '#FFD700', accent: '#FF6B6B' } }
                  ].map(scheme => (
                    <Button
                      key={scheme.name}
                      variant="outline"
                      size="sm"
                      onClick={() => setColors(prev => ({ ...prev, ...scheme.colors }))}
                      className="flex flex-col items-center p-3 h-auto"
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: scheme.colors.primary }} />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: scheme.colors.secondary }} />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: scheme.colors.accent }} />
                      </div>
                      <span className="text-xs">{scheme.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo & Branding Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="logoUpload">Logo Upload</Label>
                <div className="mt-2">
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logoUpload')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Logo File
                  </Button>
                </div>
                {logoPreview && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    <img src={logoPreview} alt="Logo preview" className="max-h-24 mx-auto" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-3">Logo Requirements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Recommended size: 400x400px minimum</li>
                  <li>• Format: PNG with transparent background preferred</li>
                  <li>• Square or horizontal orientation works best</li>
                  <li>• High contrast for visibility</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Auto-Generated Logo Options</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Generate simple text-based logos using your brand colors
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['circle', 'rounded', 'square', 'minimal'].map(style => (
                    <div key={style} className="text-center">
                      <div 
                        className={`w-16 h-16 mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl ${
                          style === 'circle' ? 'rounded-full' :
                          style === 'rounded' ? 'rounded-lg' :
                          style === 'square' ? 'rounded-none' :
                          'rounded-sm border-2'
                        }`}
                        style={{ backgroundColor: colors.primary }}
                      >
                        {siteName.charAt(0).toUpperCase()}
                      </div>
                      <Button variant="ghost" size="sm" className="capitalize">
                        {style}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contactEmail">Email Address</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="hello@yourbrand.com"
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="socialInstagram">Instagram URL</Label>
                  <Input
                    id="socialInstagram"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/yourbrand"
                  />
                </div>

                <div>
                  <Label htmlFor="socialTiktok">TikTok URL</Label>
                  <Input
                    id="socialTiktok"
                    value={socialTiktok}
                    onChange={(e) => setSocialTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@yourbrand"
                  />
                </div>

                <div>
                  <Label htmlFor="socialFacebook">Facebook URL</Label>
                  <Input
                    id="socialFacebook"
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/yourbrand"
                  />
                </div>

                <div>
                  <Label htmlFor="socialTwitter">Twitter URL</Label>
                  <Input
                    id="socialTwitter"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    placeholder="https://twitter.com/yourbrand"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Templates</CardTitle>
              <p className="text-sm text-gray-600">
                Quick-start with pre-designed brand configurations
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(brandTemplates).map(([key, template]) => (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => applyTemplate(key as BusinessType)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: template.colors.primary }}
                      >
                        {template.siteName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{template.siteName}</h4>
                        <p className="text-sm text-gray-600">{template.tagline}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: template.colors.primary }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: template.colors.secondary }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: template.colors.accent }} />
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3">{template.description}</p>
                    
                    <Button size="sm" className="w-full">
                      Apply Template
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Custom Configuration</h4>
                    <p className="text-sm text-gray-600">Manage your brand settings</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={exportBrandConfig}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Config
                    </Button>
                    <Button variant="outline" onClick={resetToDefaults}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
