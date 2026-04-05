'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Image as ImageIcon,
  Video,
  Upload,
  Link,
  Palette,
  Type,
  MousePointer,
  Eye,
  Download,
  Plus,
  Star,
  Trash2,
  Edit,
  Search,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';

interface MediaAsset {
  id: string
  url: string
  thumbnailUrl: string
  filename: string
  altText: string
  type: 'image' | 'video'
  isHeroImage: boolean
}

export interface HeroContent {
  title: string;
  subtitle: string;
  backgroundType: 'image' | 'video' | 'gradient';
  backgroundUrl: string;
  backgroundGradient?: {
    from: string;
    to: string;
    direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl';
  };
  ctaText: string;
  ctaUrl: string;
  secondaryCta?: {
    text: string;
    url: string;
  };
  overlay: boolean;
  overlayOpacity: number;
  textAlignment: 'left' | 'center' | 'right';
  contentPosition: 'top' | 'center' | 'bottom';
  textColor: 'white' | 'black' | 'custom';
  customTextColor?: string;
  customCss?: string;
  multilang?: {
    [lang: string]: {
      title: string;
      subtitle: string;
      ctaText: string;
      secondaryCtaText?: string;
    };
  };
}

export interface HeroSectionEditorProps {
  content: HeroContent;
  onUpdate: (content: HeroContent) => void;
}

export function HeroSectionEditor({ content, onUpdate }: HeroSectionEditorProps) {
  const [activeTab, setActiveTab] = useState('content');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const { toast } = useToast();

  // Mock media assets - in real app this would come from API
  const [mediaAssets] = useState<MediaAsset[]>([
    {
      id: '1',
      url: '/images/london-bridge.jpg',
      thumbnailUrl: '/images/london-bridge-thumb.jpg',
      filename: 'london-bridge-hero.jpg',
      altText: 'Beautiful view of London Bridge at sunset',
      type: 'image',
      isHeroImage: true
    },
    {
      id: '2',
      url: '/images/london-markets.jpg',
      thumbnailUrl: '/images/london-markets-thumb.jpg',
      filename: 'london-markets.jpg',
      altText: 'Busy London market with fresh produce and vendors',
      type: 'image',
      isHeroImage: false
    },
    {
      id: '3',
      url: '/images/london-skyline.jpg',
      thumbnailUrl: '/images/london-skyline-thumb.jpg',
      filename: 'london-skyline.jpg',
      altText: 'London skyline at dusk',
      type: 'image',
      isHeroImage: false
    }
  ]);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'hero-background');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      onUpdate({
        ...content,
        backgroundType: 'image',
        backgroundUrl: url
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUnsplashSelect = (imageUrl: string) => {
    onUpdate({
      ...content,
      backgroundType: 'image',
      backgroundUrl: imageUrl
    });
  };

  const selectImageFromLibrary = (asset: MediaAsset) => {
    onUpdate({
      ...content,
      backgroundType: 'image',
      backgroundUrl: asset.url
    });
    
    setIsMediaLibraryOpen(false);
    
    toast({
      title: "Hero Background Updated",
      description: `Selected "${asset.filename}" as the new hero background.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Hero Section Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="hero-title">Headline</Label>
              <Input
                id="hero-title"
                value={content.title}
                onChange={(e) => onUpdate({ ...content, title: e.target.value })}
                placeholder="Enter compelling headline"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="hero-subtitle">Subheading</Label>
              <Textarea
                id="hero-subtitle"
                value={content.subtitle}
                onChange={(e) => onUpdate({ ...content, subtitle: e.target.value })}
                placeholder="Enter supporting text"
                rows={3}
              />
            </div>

            {/* Primary CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta-text">Primary CTA Text</Label>
                <Input
                  id="cta-text"
                  value={content.ctaText}
                  onChange={(e) => onUpdate({ ...content, ctaText: e.target.value })}
                  placeholder="Get Started"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-url">Primary CTA URL</Label>
                <Input
                  id="cta-url"
                  value={content.ctaUrl}
                  onChange={(e) => onUpdate({ ...content, ctaUrl: e.target.value })}
                  placeholder="/recommendations"
                />
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Secondary CTA</Label>
                <Switch
                  checked={!!content.secondaryCta}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onUpdate({
                        ...content,
                        secondaryCta: { text: 'Learn More', url: '/about' }
                      });
                    } else {
                      onUpdate({
                        ...content,
                        secondaryCta: undefined
                      });
                    }
                  }}
                />
              </div>
              
              {content.secondaryCta && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={content.secondaryCta.text}
                    onChange={(e) => onUpdate({
                      ...content,
                      secondaryCta: { ...content.secondaryCta!, text: e.target.value }
                    })}
                    placeholder="Learn More"
                  />
                  <Input
                    value={content.secondaryCta.url}
                    onChange={(e) => onUpdate({
                      ...content,
                      secondaryCta: { ...content.secondaryCta!, url: e.target.value }
                    })}
                    placeholder="/about"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="background" className="space-y-4">
            {/* Background Type */}
            <div className="space-y-2">
              <Label>Background Type</Label>
              <Select
                value={content.backgroundType}
                onValueChange={(value: any) => onUpdate({ ...content, backgroundType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image/Video Background */}
            {(content.backgroundType === 'image' || content.backgroundType === 'video') && (
              <div className="space-y-4">
                {/* Current Background Preview */}
                {content.backgroundUrl && (
                  <div className="space-y-2">
                    <Label>Current Background</Label>
                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      {content.backgroundType === 'image' ? (
                        <Image
                          src={content.backgroundUrl}
                          alt="Background preview"
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-full object-cover"
                          style={{ width: '100%', height: '100%' }}
                          unoptimized
                        />
                      ) : (
                        <video
                          src={content.backgroundUrl}
                          className="w-full h-full object-cover"
                          muted
                          controls
                        />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Options */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Media Library Selection */}
                  <div className="space-y-2">
                    <Label>Select from Media Library</Label>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setIsMediaLibraryOpen(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Browse Media Library
                    </Button>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Upload from Computer</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drop your {content.backgroundType} here or click to browse
                      </p>
                      <input
                        type="file"
                        accept={content.backgroundType === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                        id="background-upload"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('background-upload')?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : 'Choose File'}
                      </Button>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="space-y-2">
                    <Label>Or Enter URL</Label>
                    <Input
                      value={content.backgroundUrl}
                      onChange={(e) => onUpdate({ ...content, backgroundUrl: e.target.value })}
                      placeholder={`Enter ${content.backgroundType} URL`}
                    />
                  </div>

                  {/* Unsplash Integration (for images only) */}
                  {content.backgroundType === 'image' && (
                    <div className="space-y-2">
                      <Label>Browse Unsplash</Label>
                      <UnsplashBrowser onSelect={handleUnsplashSelect} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gradient Background */}
            {content.backgroundType === 'gradient' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Color</Label>
                    <Input
                      type="color"
                      value={content.backgroundGradient?.from || '#3B82F6'}
                      onChange={(e) => onUpdate({
                        ...content,
                        backgroundGradient: {
                          ...content.backgroundGradient,
                          from: e.target.value,
                          to: content.backgroundGradient?.to || '#1E40AF',
                          direction: content.backgroundGradient?.direction || 'to-r'
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Color</Label>
                    <Input
                      type="color"
                      value={content.backgroundGradient?.to || '#1E40AF'}
                      onChange={(e) => onUpdate({
                        ...content,
                        backgroundGradient: {
                          ...content.backgroundGradient,
                          from: content.backgroundGradient?.from || '#3B82F6',
                          to: e.target.value,
                          direction: content.backgroundGradient?.direction || 'to-r'
                        }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select
                    value={content.backgroundGradient?.direction || 'to-r'}
                    onValueChange={(value: any) => onUpdate({
                      ...content,
                      backgroundGradient: {
                        ...content.backgroundGradient,
                        from: content.backgroundGradient?.from || '#3B82F6',
                        to: content.backgroundGradient?.to || '#1E40AF',
                        direction: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-r">Left to Right</SelectItem>
                      <SelectItem value="to-br">Top-Left to Bottom-Right</SelectItem>
                      <SelectItem value="to-b">Top to Bottom</SelectItem>
                      <SelectItem value="to-bl">Top-Right to Bottom-Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gradient Preview */}
                <div 
                  className="w-full h-20 rounded-lg border"
                  style={{
                    background: `linear-gradient(${content.backgroundGradient?.direction || 'to-r'}, ${content.backgroundGradient?.from || '#3B82F6'}, ${content.backgroundGradient?.to || '#1E40AF'})`
                  }}
                />
              </div>
            )}

            {/* Overlay Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Dark Overlay</Label>
                <Switch
                  checked={content.overlay}
                  onCheckedChange={(checked) => onUpdate({ ...content, overlay: checked })}
                />
              </div>
              
              {content.overlay && (
                <div className="space-y-2">
                  <Label>Overlay Opacity: {Math.round(content.overlayOpacity * 100)}%</Label>
                  <Slider
                    value={[content.overlayOpacity]}
                    onValueChange={([value]) => onUpdate({ ...content, overlayOpacity: value })}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            {/* Text Alignment */}
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select
                value={content.textAlignment}
                onValueChange={(value: any) => onUpdate({ ...content, textAlignment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Position */}
            <div className="space-y-2">
              <Label>Content Position</Label>
              <Select
                value={content.contentPosition}
                onValueChange={(value: any) => onUpdate({ ...content, contentPosition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Color */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Text Color</Label>
                <Select
                  value={content.textColor}
                  onValueChange={(value: any) => onUpdate({ ...content, textColor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {content.textColor === 'custom' && (
                <div className="space-y-2">
                  <Label>Custom Text Color</Label>
                  <Input
                    type="color"
                    value={content.customTextColor || '#000000'}
                    onChange={(e) => onUpdate({ ...content, customTextColor: e.target.value })}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Advanced settings for multi-language support and custom styling.
            </div>

            {/* Multi-language Support */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Multi-language Content</Label>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Language
                </Button>
              </div>
              
              <div className="text-sm text-gray-500">
                Configure different content for each supported language.
                Coming soon in Phase 4B.
              </div>
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <Label>Custom CSS</Label>
              <Textarea
                value={content.customCss || ''}
                onChange={(e) => onUpdate({ ...content, customCss: e.target.value })}
                placeholder="Enter custom CSS for this module..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Media Library Modal */}
      <Dialog open={isMediaLibraryOpen} onOpenChange={setIsMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Select Hero Background</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Choose an image from your media library to set as the hero background
              </p>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMediaLibraryOpen(false);
                  // In real app, would navigate to media upload page
                  window.open('/admin/content/media/upload', '_blank');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaAssets.filter(asset => asset.type === 'image').map(asset => (
                <div 
                  key={asset.id}
                  className={`
                    relative group border rounded-lg overflow-hidden cursor-pointer transition-all
                    ${asset.isHeroImage ? 'ring-2 ring-yellow-400' : 'border-gray-200 hover:border-blue-300'}
                  `}
                  onClick={() => selectImageFromLibrary(asset)}
                >
                  {/* Current Hero Badge */}
                  {asset.isHeroImage && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                        <Star className="h-3 w-3" />
                        <span>Current</span>
                      </div>
                    </div>
                  )}

                  {/* Image Preview */}
                  <div className="aspect-video bg-gray-100">
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.altText}
                      width={300}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Asset Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {asset.altText}
                    </p>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4 mr-2" />
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {mediaAssets.filter(asset => asset.type === 'image').length === 0 && (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No images found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload some images to use as hero backgrounds.
                </p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Simplified Unsplash Browser Component
function UnsplashBrowser({ onSelect }: { onSelect: (url: string) => void }) {
  const sampleImages = [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800'
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {sampleImages.map((url, index) => (
        <button
          key={index}
          onClick={() => onSelect(url)}
          className="relative aspect-video rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
        >
          <Image
            src={url}
            alt={`Unsplash image ${index + 1}`}
            width={0}
            height={0}
            sizes="50vw"
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
            unoptimized
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="secondary">
              Select
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}