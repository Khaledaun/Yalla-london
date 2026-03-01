'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  Save, 
  Monitor, 
  Tablet, 
  Smartphone,
  Plus,
  Settings,
  Palette,
  Layout,
  Image as ImageIcon,
  Type,
  MousePointer,
  Layers,
  Undo2,
  Redo2
} from 'lucide-react';

import { HomepagePreview } from './homepage-preview';
import { ModuleLibrary } from './module-library';
import { HeroSectionEditor } from './hero-section-editor';
import { PopupDealEditor } from './popup-deal-editor';
import { AppearanceCustomizer } from './appearance-customizer';
import { PublishingWorkflow } from './publishing-workflow';

export interface HomepageModule {
  id: string;
  type: 'hero' | 'deals' | 'articles' | 'map' | 'social' | 'newsletter' | 'affiliates';
  title: string;
  content: any;
  settings: {
    enabled: boolean;
    order: number;
    customCss?: string;
  };
}

export interface HomepageConfig {
  modules: HomepageModule[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    layout: 'full-width' | 'contained' | 'split';
  };
  popup?: {
    enabled: boolean;
    content: any;
    trigger: 'time' | 'scroll' | 'exit';
    frequency: 'once' | 'daily' | 'always';
  };
  meta: {
    draft: boolean;
    lastModified: Date;
    publishedAt?: Date;
  };
}

export interface HomepageBuilderProps {
  siteId?: string;
  initialConfig?: HomepageConfig;
}

export function HomepageBuilder({ siteId, initialConfig }: HomepageBuilderProps) {
  const [config, setConfig] = useState<HomepageConfig>(
    initialConfig || {
      modules: [],
      theme: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        fontFamily: 'Inter',
        layout: 'full-width'
      },
      meta: {
        draft: true,
        lastModified: new Date()
      }
    }
  );

  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [undoStack, setUndoStack] = useState<HomepageConfig[]>([]);
  const [redoStack, setRedoStack] = useState<HomepageConfig[]>([]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/homepage/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          config: {
            ...config,
            meta: { ...config.meta, lastModified: new Date() }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save draft');

      toast.success('Draft saved');
    } catch (error) {
      toast.error('Failed to save draft');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }, [siteId, config]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (config.meta.draft) {
        handleSaveDraft();
      }
    }, 2000);

    return () => clearTimeout(autoSave);
  }, [config, handleSaveDraft]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig(prev => {
        // Add to undo stack
        setUndoStack(stack => [...stack.slice(-9), prev]);
        setRedoStack([]);

        const oldIndex = prev.modules.findIndex(module => module.id === active.id);
        const newIndex = prev.modules.findIndex(module => module.id === over.id);

        const newModules = arrayMove(prev.modules, oldIndex, newIndex);
        
        return {
          ...prev,
          modules: newModules.map((module, index) => ({
            ...module,
            settings: { ...module.settings, order: index }
          })),
          meta: { ...prev.meta, lastModified: new Date() }
        };
      });
    }
  };

  const handleAddModule = (moduleType: HomepageModule['type']) => {
    const newModule: HomepageModule = {
      id: `module_${Date.now()}`,
      type: moduleType,
      title: getModuleTitle(moduleType),
      content: getDefaultModuleContent(moduleType),
      settings: {
        enabled: true,
        order: config.modules.length
      }
    };

    setConfig(prev => {
      setUndoStack(stack => [...stack.slice(-9), prev]);
      setRedoStack([]);
      
      return {
        ...prev,
        modules: [...prev.modules, newModule],
        meta: { ...prev.meta, lastModified: new Date() }
      };
    });

    toast.success(`${getModuleTitle(moduleType)} module added`);
  };

  const handleUpdateModule = (moduleId: string, updates: Partial<HomepageModule>) => {
    setConfig(prev => {
      setUndoStack(stack => [...stack.slice(-9), prev]);
      setRedoStack([]);

      return {
        ...prev,
        modules: prev.modules.map(module =>
          module.id === moduleId ? { ...module, ...updates } : module
        ),
        meta: { ...prev.meta, lastModified: new Date() }
      };
    });
  };

  const handleRemoveModule = (moduleId: string) => {
    setConfig(prev => {
      setUndoStack(stack => [...stack.slice(-9), prev]);
      setRedoStack([]);

      return {
        ...prev,
        modules: prev.modules.filter(module => module.id !== moduleId),
        meta: { ...prev.meta, lastModified: new Date() }
      };
    });

    toast.success('Module removed');
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/admin/homepage/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          config: {
            ...config,
            meta: {
              ...config.meta,
              draft: false,
              publishedAt: new Date(),
              lastModified: new Date()
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to publish');

      setConfig(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          draft: false,
          publishedAt: new Date()
        }
      }));

      toast.success('Homepage published successfully!');
    } catch (error) {
      toast.error('Failed to publish homepage');
      console.error('Publish error:', error);
    } finally {
      setPublishing(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prevConfig = undoStack[undoStack.length - 1];
      setRedoStack(stack => [config, ...stack.slice(0, 9)]);
      setUndoStack(stack => stack.slice(0, -1));
      setConfig(prevConfig);
      toast.success('Undone');
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextConfig = redoStack[0];
      setUndoStack(stack => [...stack.slice(-9), config]);
      setRedoStack(stack => stack.slice(1));
      setConfig(nextConfig);
      toast.success('Redone');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Homepage Builder</h1>
          <Badge variant={config.meta.draft ? 'secondary' : 'default'}>
            {config.meta.draft ? 'Draft' : 'Published'}
          </Badge>
          {config.meta.lastModified && (
            <span className="text-sm text-gray-500">
              Last modified: {config.meta.lastModified.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          {/* Preview mode switcher */}
          <div className="flex border rounded-md">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <PublishingWorkflow
            isDraft={config.meta.draft}
            saving={saving}
            publishing={publishing}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Editor */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="w-full grid grid-cols-2 m-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="p-4 space-y-4">
              {/* Module Library */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Module
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ModuleLibrary onAddModule={handleAddModule} />
                </CardContent>
              </Card>

              {/* Current Modules */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Page Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={config.modules.map(m => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {config.modules.map((module) => (
                          <ModuleCard
                            key={module.id}
                            module={module}
                            onUpdate={(updates) => handleUpdateModule(module.id, updates)}
                            onRemove={() => handleRemoveModule(module.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>

              {/* Theme & Appearance */}
              <AppearanceCustomizer
                theme={config.theme}
                onUpdate={(theme) => setConfig(prev => ({ ...prev, theme }))}
              />
            </TabsContent>

            <TabsContent value="preview" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-4">
                    Preview your homepage as visitors will see it.
                    Use the device toggle above to test responsive design.
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(`/preview/homepage?siteId=${siteId}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 bg-gray-100 p-4">
          <HomepagePreview
            config={config}
            previewMode={previewMode}
          />
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getModuleTitle(type: HomepageModule['type']): string {
  const titles = {
    hero: 'Hero Section',
    deals: 'Featured Deals',
    articles: 'Latest Articles',
    map: 'Location Map',
    social: 'Social Media',
    newsletter: 'Newsletter Signup',
    affiliates: 'Affiliate Links'
  };
  return titles[type];
}

function getDefaultModuleContent(type: HomepageModule['type']): any {
  const defaults = {
    hero: {
      title: 'Welcome to Your Site',
      subtitle: 'Discover amazing places and experiences',
      backgroundType: 'image',
      backgroundUrl: '',
      ctaText: 'Get Started',
      ctaUrl: '/recommendations',
      overlay: true,
      overlayOpacity: 0.5
    },
    deals: {
      title: 'Featured Deals',
      maxItems: 6,
      layout: 'grid',
      showPrices: true
    },
    articles: {
      title: 'Latest Articles',
      maxItems: 4,
      layout: 'grid',
      showExcerpts: true
    },
    map: {
      title: 'Find Us',
      location: { lat: 51.5074, lng: -0.1278 },
      zoom: 12,
      showMarker: true
    },
    social: {
      title: 'Follow Us',
      platforms: ['instagram', 'twitter', 'facebook'],
      showFeed: false
    },
    newsletter: {
      title: 'Stay Updated',
      subtitle: 'Get the latest news and offers',
      placeholder: 'Enter your email',
      buttonText: 'Subscribe'
    },
    affiliates: {
      title: 'Our Partners',
      layout: 'carousel',
      showLogos: true
    }
  };
  return defaults[type];
}

// Module Card Component for drag and drop
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Settings as SettingsIcon, Trash2 } from 'lucide-react';

interface ModuleCardProps {
  module: HomepageModule;
  onUpdate: (updates: Partial<HomepageModule>) => void;
  onRemove: () => void;
}

function ModuleCard({ module, onUpdate, onRemove }: ModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-md p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm">{module.title}</div>
          <div className="text-xs text-gray-500 capitalize">{module.type}</div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ 
              settings: { ...module.settings, enabled: !module.settings.enabled } 
            })}
          >
            {module.settings.enabled ? 
              <Eye className="h-3 w-3" /> : 
              <EyeOff className="h-3 w-3 text-gray-400" />
            }
          </Button>
          <Button variant="ghost" size="sm">
            <SettingsIcon className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}