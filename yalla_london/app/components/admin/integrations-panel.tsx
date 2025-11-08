'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Settings,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  ExternalLink,
  Key,
  Shield,
  Zap,
  BarChart3,
  Bot,
  Mail,
  MessageSquare,
  Search,
  Globe,
  Camera,
  Headphones,
  Brain,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react'

export interface Integration {
  id: string
  name: string
  description: string
  category: 'analytics' | 'ai' | 'seo' | 'communication' | 'social' | 'productivity' | 'security'
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  icon?: string
  iconComponent?: React.ComponentType<any>
  lastSync?: Date
  features?: string[]
  connectionDetails?: {
    apiKey?: string
    email?: string
    accountId?: string
    [key: string]: any
  }
  metrics?: {
    requests?: number
    limit?: number
    period?: string
  }
  isPremium?: boolean
  isRequired?: boolean
}

export interface IntegrationsPanelProps {
  integrations: Integration[]
  loading?: boolean
  title?: string
  showHeader?: boolean
  onConnect?: (integration: Integration) => void
  onDisconnect?: (integration: Integration) => void
  onConfigure?: (integration: Integration) => void
  onViewAll?: () => void
  compact?: boolean
  showMetrics?: boolean
}

// Predefined integrations with icons
const defaultIntegrations: Omit<Integration, 'id' | 'status'>[] = [
  {
    name: 'Google Analytics 4',
    description: 'Website analytics and user behavior tracking',
    category: 'analytics',
    iconComponent: BarChart3,
    features: ['Real-time analytics', 'Audience insights', 'Conversion tracking'],
    isPremium: false,
    isRequired: true
  },
  {
    name: 'Google Search Console',
    description: 'Search performance and SEO insights',
    category: 'seo',
    iconComponent: Search,
    features: ['Search performance', 'Index status', 'SEO issues'],
    isPremium: false,
    isRequired: true
  },
  {
    name: 'OpenAI GPT',
    description: 'AI-powered content generation and assistance',
    category: 'ai',
    iconComponent: Bot,
    features: ['Content generation', 'SEO optimization', 'Translation'],
    isPremium: true
  },
  {
    name: 'Claude AI',
    description: 'Advanced AI assistant for content and analysis',
    category: 'ai',
    iconComponent: Brain,
    features: ['Content analysis', 'Research assistance', 'Writing improvement'],
    isPremium: true
  },
  {
    name: 'Perplexity AI',
    description: 'Research and fact-checking AI assistant',
    category: 'ai',
    iconComponent: Brain,
    features: ['Research assistance', 'Fact checking', 'Content verification'],
    isPremium: true
  },
  {
    name: 'Semrush',
    description: 'SEO and digital marketing analytics',
    category: 'seo',
    iconComponent: TrendingUp,
    features: ['Keyword research', 'Competitor analysis', 'Backlink tracking'],
    isPremium: true
  },
  {
    name: 'Ahrefs',
    description: 'SEO toolset for backlinks and keywords',
    category: 'seo',
    iconComponent: TrendingUp,
    features: ['Backlink analysis', 'Keyword tracking', 'Site audit'],
    isPremium: true
  },
  {
    name: 'WhatsApp Business',
    description: 'Business messaging and customer support',
    category: 'communication',
    iconComponent: MessageSquare,
    features: ['Business messaging', 'Automated responses', 'Customer support'],
    isPremium: false
  },
  {
    name: 'Mailchimp',
    description: 'Email marketing and automation',
    category: 'communication',
    iconComponent: Mail,
    features: ['Email campaigns', 'Audience segmentation', 'Automation'],
    isPremium: false
  },
  {
    name: 'Trello',
    description: 'Project management and task tracking',
    category: 'productivity',
    iconComponent: Settings,
    features: ['Task management', 'Project boards', 'Team collaboration'],
    isPremium: false
  }
]

export function IntegrationsPanel({
  integrations = [],
  loading = false,
  title = "Integrations",
  showHeader = true,
  onConnect,
  onDisconnect,
  onConfigure,
  onViewAll,
  compact = false,
  showMetrics = true
}: IntegrationsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai', label: 'AI Tools', icon: Bot },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'productivity', label: 'Productivity', icon: Settings },
  ]

  // Merge provided integrations with defaults
  const allIntegrations = [
    ...integrations,
    ...defaultIntegrations
      .filter(defaultInt => !integrations.find(int => int.name === defaultInt.name))
      .map((defaultInt, index) => ({
        ...defaultInt,
        id: `default-${index}`,
        status: 'disconnected' as const
      }))
  ]

  const filteredIntegrations = selectedCategory === 'all' 
    ? allIntegrations 
    : allIntegrations.filter(int => int.category === selectedCategory)

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-3 w-3" />
      case 'error':
        return <AlertCircle className="h-3 w-3" />
      case 'pending':
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  const getCategoryIcon = (category: Integration['category']) => {
    const categoryConfig = categories.find(c => c.id === category)
    const IconComponent = categoryConfig?.icon || Settings
    return <IconComponent className="h-4 w-4" />
  }

  const handleToggleIntegration = (integration: Integration) => {
    if (integration.status === 'connected') {
      onDisconnect?.(integration)
    } else {
      onConnect?.(integration)
    }
  }

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : ""}>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="w-8 h-4 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
            {onViewAll && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onViewAll}
                className="text-violet-600 hover:text-violet-700"
              >
                View all
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "pt-0" : ""}>
        {/* Category filter */}
        {!compact && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <IconComponent className="h-3 w-3" />
                  {category.label}
                </Button>
              )
            })}
          </div>
        )}

        {/* Integrations grid */}
        <div className={`space-y-${compact ? '2' : '3'}`}>
          {filteredIntegrations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No integrations available</p>
              <p className="text-xs text-slate-400 mt-1">
                Contact support to request additional integrations
              </p>
            </div>
          ) : (
            filteredIntegrations.map((integration) => {
              const IconComponent = integration.iconComponent || Settings
              
              return (
                <div
                  key={integration.id}
                  className={`
                    group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-all
                    ${integration.status === 'connected' ? 'bg-emerald-50/50' : 'bg-white'}
                    ${compact ? 'py-3' : 'py-4'}
                  `}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${integration.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                    `}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium text-slate-900 ${compact ? 'text-sm' : ''}`}>
                          {integration.name}
                        </h4>
                        
                        {/* Status badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0.5 ${getStatusColor(integration.status)}`}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(integration.status)}
                            <span className="capitalize">{integration.status}</span>
                          </div>
                        </Badge>

                        {/* Premium badge */}
                        {integration.isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            Premium
                          </Badge>
                        )}

                        {/* Required badge */}
                        {integration.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>

                      <p className={`text-slate-600 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {integration.description}
                      </p>

                      {/* Features */}
                      {integration.features && integration.features.length > 0 && !compact && (
                        <div className="flex items-center gap-1 mb-2">
                          {integration.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-[10px] px-1 py-0">
                              {feature}
                            </Badge>
                          ))}
                          {integration.features.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{integration.features.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metrics */}
                      {showMetrics && integration.metrics && integration.status === 'connected' && (
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {integration.metrics.requests && integration.metrics.limit && (
                            <div>
                              <span className="font-medium">{integration.metrics.requests.toLocaleString()}</span>
                              <span> / </span>
                              <span>{integration.metrics.limit.toLocaleString()}</span>
                              <span className="ml-1">requests {integration.metrics.period}</span>
                            </div>
                          )}
                          
                          {integration.lastSync && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Last sync: {integration.lastSync.toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-3">
                    {/* Toggle switch */}
                    <Switch
                      checked={integration.status === 'connected'}
                      onCheckedChange={() => handleToggleIntegration(integration)}
                      disabled={integration.status === 'pending'}
                    />

                    {/* Configure button */}
                    {integration.status === 'connected' && onConfigure && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConfigure(integration)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Summary stats */}
        {!compact && filteredIntegrations.length > 0 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-sm text-slate-600">
            <span>
              {filteredIntegrations.filter(i => i.status === 'connected').length} of {filteredIntegrations.length} connected
            </span>
            <span className="text-xs text-slate-500">
              {filteredIntegrations.filter(i => i.isPremium).length} premium features available
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { defaultIntegrations }