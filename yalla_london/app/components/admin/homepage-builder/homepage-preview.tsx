'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { HomepageConfig } from './homepage-builder';
import { HeroModulePreview } from './modules/hero-module-preview';
import { DealsModulePreview } from './modules/deals-module-preview';
import { ArticlesModulePreview } from './modules/articles-module-preview';
import { MapModulePreview } from './modules/map-module-preview';
import { SocialModulePreview } from './modules/social-module-preview';
import { NewsletterModulePreview } from './modules/newsletter-module-preview';
import { AffiliatesModulePreview } from './modules/affiliates-module-preview';

export interface HomepagePreviewProps {
  config: HomepageConfig;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  fullscreen?: boolean;
}

export function HomepagePreview({ config, previewMode, fullscreen = false }: HomepagePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);

  const previewStyles = {
    desktop: 'w-full max-w-none',
    tablet: 'w-[768px] max-w-[768px]',
    mobile: 'w-[375px] max-w-[375px]'
  };

  const containerStyles = {
    desktop: 'min-h-[600px]',
    tablet: 'min-h-[1024px]',
    mobile: 'min-h-[667px]'
  };

  const enabledModules = config.modules
    .filter(module => module.settings.enabled)
    .sort((a, b) => a.settings.order - b.settings.order);

  if (enabledModules.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Eye className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No modules added yet
              </h3>
              <p className="text-gray-500 max-w-md">
                Add modules from the library to start building your homepage. 
                Your changes will appear here in real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      {/* Preview Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h2 className="font-medium">Live Preview</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            {previewMode === 'desktop' && <Monitor className="h-3 w-3" />}
            {previewMode === 'tablet' && <Tablet className="h-3 w-3" />}
            {previewMode === 'mobile' && <Smartphone className="h-3 w-3" />}
            {previewMode.charAt(0).toUpperCase() + previewMode.slice(1)}
          </Badge>
          {config.meta.draft && (
            <Badge variant="secondary">Draft Mode</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/preview/homepage`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? 
              <Minimize2 className="h-4 w-4" /> : 
              <Maximize2 className="h-4 w-4" />
            }
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 bg-gray-100 p-4 overflow-auto">
        <div className="flex justify-center">
          <div className={`bg-white shadow-lg ${previewStyles[previewMode]} ${containerStyles[previewMode]}`}>
            {/* Apply theme styles */}
            <div 
              style={{
                '--primary-color': config.theme.primaryColor,
                '--secondary-color': config.theme.secondaryColor,
                '--font-family': config.theme.fontFamily
              } as React.CSSProperties}
              className="min-h-full"
            >
              {/* Render enabled modules */}
              {enabledModules.map((module) => (
                <div key={module.id} className="relative">
                  {/* Module wrapper with edit indicators */}
                  <div className="group relative">
                    {/* Edit overlay (shows on hover in editor mode) */}
                    <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/10 border-2 border-blue-500 border-dashed pointer-events-none">
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                        {module.title}
                      </div>
                    </div>

                    {/* Module content */}
                    <ModuleRenderer module={module} />
                  </div>
                </div>
              ))}

              {/* Footer with branding */}
              <footer className="bg-gray-50 border-t py-8 px-4">
                <div className="max-w-6xl mx-auto text-center text-sm text-gray-600">
                  <p>Built with Yalla London Homepage Builder</p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Module Renderer Component
interface ModuleRendererProps {
  module: any;
}

function ModuleRenderer({ module }: ModuleRendererProps) {
  switch (module.type) {
    case 'hero':
      return <HeroModulePreview module={module} />;
    case 'deals':
      return <DealsModulePreview module={module} />;
    case 'articles':
      return <ArticlesModulePreview module={module} />;
    case 'map':
      return <MapModulePreview module={module} />;
    case 'social':
      return <SocialModulePreview module={module} />;
    case 'newsletter':
      return <NewsletterModulePreview module={module} />;
    case 'affiliates':
      return <AffiliatesModulePreview module={module} />;
    default:
      return (
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-8 m-4 rounded-lg text-center">
          <p className="text-gray-500">
            Unknown module type: {module.type}
          </p>
        </div>
      );
  }
}