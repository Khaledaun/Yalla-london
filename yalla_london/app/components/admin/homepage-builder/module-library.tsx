'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Home,
  Tag,
  FileText,
  Map,
  Share2,
  Mail,
  DollarSign,
  Image,
  Video,
  Grid3X3,
  Type,
  MousePointer
} from 'lucide-react';
import { HomepageModule } from './homepage-builder';

export interface ModuleLibraryProps {
  onAddModule: (type: HomepageModule['type']) => void;
}

interface ModuleType {
  id: HomepageModule['type'];
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'content' | 'engagement' | 'monetization';
  preview?: string;
}

const moduleTypes: ModuleType[] = [
  {
    id: 'hero',
    title: 'Hero Section',
    description: 'Main banner with image/video background, headline, and CTA',
    icon: Home,
    category: 'content',
    preview: '/images/previews/hero.png'
  },
  {
    id: 'deals',
    title: 'Featured Deals',
    description: 'Showcase special offers and promotional content',
    icon: Tag,
    category: 'monetization',
    preview: '/images/previews/deals.png'
  },
  {
    id: 'articles',
    title: 'Article Grid',
    description: 'Display latest blog posts and articles',
    icon: FileText,
    category: 'content',
    preview: '/images/previews/articles.png'
  },
  {
    id: 'map',
    title: 'Location Map',
    description: 'Interactive map showing business location',
    icon: Map,
    category: 'content',
    preview: '/images/previews/map.png'
  },
  {
    id: 'social',
    title: 'Social Media',
    description: 'Social media feeds and follow buttons',
    icon: Share2,
    category: 'engagement',
    preview: '/images/previews/social.png'
  },
  {
    id: 'newsletter',
    title: 'Newsletter Signup',
    description: 'Email subscription form with customizable design',
    icon: Mail,
    category: 'engagement',
    preview: '/images/previews/newsletter.png'
  },
  {
    id: 'affiliates',
    title: 'Affiliate Links',
    description: 'Partner logos and affiliate product showcase',
    icon: DollarSign,
    category: 'monetization',
    preview: '/images/previews/affiliates.png'
  }
];

const categoryColors = {
  content: 'bg-blue-50 text-blue-700 border-blue-200',
  engagement: 'bg-green-50 text-green-700 border-green-200',
  monetization: 'bg-purple-50 text-purple-700 border-purple-200'
};

export function ModuleLibrary({ onAddModule }: ModuleLibraryProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const filteredModules = selectedCategory 
    ? moduleTypes.filter(module => module.category === selectedCategory)
    : moduleTypes;

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Modules
        </Button>
        <Button
          variant={selectedCategory === 'content' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('content')}
        >
          Content
        </Button>
        <Button
          variant={selectedCategory === 'engagement' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('engagement')}
        >
          Engagement
        </Button>
        <Button
          variant={selectedCategory === 'monetization' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('monetization')}
        >
          Monetization
        </Button>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredModules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onAdd={() => onAddModule(module.id)}
          />
        ))}
      </div>

      {/* Quick Add Buttons for Common Modules */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Add:</div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddModule('hero')}
            className="text-xs"
          >
            <Home className="h-3 w-3 mr-1" />
            Hero
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddModule('deals')}
            className="text-xs"
          >
            <Tag className="h-3 w-3 mr-1" />
            Deals
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddModule('articles')}
            className="text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Articles
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: ModuleType;
  onAdd: () => void;
}

function ModuleCard({ module, onAdd }: ModuleCardProps) {
  const Icon = module.icon;
  
  return (
    <div className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="bg-gray-100 p-2 rounded-md">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {module.title}
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[module.category]}`}>
              {module.category}
            </span>
          </div>
          
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
            {module.description}
          </p>
          
          <Button
            size="sm"
            onClick={onAdd}
            className="w-full text-xs"
          >
            Add Module
          </Button>
        </div>
      </div>
    </div>
  );
}