'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  LayoutDashboard, 
  FileText, 
  Image, 
  Search, 
  CheckSquare,
  Palette,
  Upload,
  Home,
  Users,
  Shield,
  Activity,
  Zap,
  Settings,
  Briefcase,
  Heart,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Bell,
  Globe,
  Monitor,
  Smartphone,
  BarChart3,
  Key,
  Bot,
  DollarSign,
  Clock,
  AlertTriangle,
  FileCheck,
  Languages,
  Flag,
  Database,
  BookOpen,
  Brain,
  MessageSquare,
  Calendar,
  Edit,
  Star,
  TrendingUp,
  Target,
  Layers,
  Building,
  Map,
  Link as LinkIcon,
  Share2
} from 'lucide-react'
import { isPremiumFeatureEnabled, validatePremiumFeatureAccess } from '@/lib/feature-flags'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  href?: string
  children?: NavItem[]
  featureFlag?: string
  badgeText?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  description?: string
  comingSoon?: boolean
  requiresElevated?: boolean
}

export interface SiteContext {
  siteId: string
  siteName: string
  canSwitchSites: boolean
}

/**
 * Premium Admin Navigation Structure - Enterprise Grade
 * Aligned with Yalla London requirements
 */
export const adminNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    featureFlag: 'ADMIN_DASHBOARD',
    description: 'KPIs, analytics, automation status'
  },
  {
    id: 'articles',
    label: 'Articles',
    icon: FileText,
    href: '/admin/articles',
    featureFlag: 'CONTENT_MANAGEMENT',
    badgeText: 'Workflow',
    badgeVariant: 'outline',
    description: 'Drafts, generated, reviewed, ready-to-publish, published'
  },
  {
    id: 'media',
    label: 'Media',
    icon: Image,
    href: '/admin/media',
    description: 'Upload/manage assets with progress %, metadata'
  },
  {
    id: 'seo-audits',
    label: 'SEO Audits',
    icon: Search,
    href: '/admin/seo-audits',
    badgeText: 'AI',
    badgeVariant: 'secondary',
    description: 'Scoring, fixes, preview, history'
  },
  {
    id: 'topics-pipeline',
    label: 'Topics & Pipeline',
    icon: TrendingUp,
    href: '/admin/topics-pipeline',
    badgeText: 'Auto',
    badgeVariant: 'default',
    description: 'Topic research, approval, content pipeline status'
  },
  {
    id: 'prompts',
    label: 'Prompts',
    icon: Brain,
    href: '/admin/prompts',
    description: 'Editable, versioned prompt templates'
  },
  {
    id: 'content-types',
    label: 'Content Types',
    icon: Layers,
    href: '/admin/content-types',
    description: 'Taxonomy management'
  },
  {
    id: 'automation-hub',
    label: 'Automation Hub',
    icon: Bot,
    href: '/admin/automation-hub',
    badgeText: 'Jobs',
    badgeVariant: 'outline',
    description: 'Publishing schedules, jobs'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    featureFlag: 'SETTINGS_MANAGEMENT',
    children: [
      {
        id: 'theme',
        label: 'Theme',
        icon: Palette,
        href: '/admin/settings/theme',
        description: 'Theme, logo/colors'
      },
      {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        href: '/admin/settings/api-keys',
        description: 'External service credentials',
        requiresElevated: true
      },
      {
        id: 'ai-providers',
        label: 'AI Providers',
        icon: Brain,
        href: '/admin/ai-providers',
        description: 'Configure AI models for content',
        badgeText: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: Users,
        href: '/admin/settings/roles',
        description: 'User roles and permissions'
      },
      {
        id: 'site',
        label: 'Site Settings',
        icon: Globe,
        href: '/admin/settings/site',
        description: 'General site configuration'
      }
    ]
  }
]

interface PremiumAdminNavProps {
  siteContext?: SiteContext
  onSiteSwitch?: (siteId: string) => void
  className?: string
}

export function PremiumAdminNav({ 
  siteContext, 
  onSiteSwitch, 
  className = '' 
}: PremiumAdminNavProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [currentSite, setCurrentSite] = useState(siteContext?.siteId || 'default')

  // Auto-expand current section
  useEffect(() => {
    const currentPath = pathname
    const newExpanded = new Set<string>()
    
    adminNavigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          child.href && currentPath && currentPath.startsWith(child.href)
        )
        if (hasActiveChild) {
          newExpanded.add(item.id)
        }
      }
    })
    
    setExpandedItems(newExpanded)
  }, [pathname])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const isItemAvailable = (item: NavItem): boolean => {
    if (!item.featureFlag) return true
    
    const access = validatePremiumFeatureAccess(item.featureFlag, currentSite)
    return access.allowed
  }

  const getItemAccessInfo = (item: NavItem) => {
    if (!item.featureFlag) return null
    
    return validatePremiumFeatureAccess(item.featureFlag, currentSite)
  }

  const isItemActive = (item: NavItem): boolean => {
    if (item.href && pathname) {
      return pathname === item.href || pathname.startsWith(item.href + '/')
    }
    return false
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isAvailable = isItemAvailable(item)
    const accessInfo = getItemAccessInfo(item)
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    const Icon = item.icon
    const paddingLeft = level * 16 + 16

    const content = (
      <div
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors
          ${isActive 
            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100' 
            : isAvailable 
              ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              : 'text-gray-400 dark:text-gray-600'
          }
          ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{ paddingLeft }}
      >
        <div className="flex items-center space-x-3">
          <Icon size={18} />
          <span>{item.label}</span>
          {item.badgeText && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${item.badgeVariant === 'default' ? 'bg-blue-100 text-blue-800' : ''}
              ${item.badgeVariant === 'secondary' ? 'bg-gray-100 text-gray-800' : ''}
              ${item.badgeVariant === 'outline' ? 'border border-gray-300 text-gray-700' : ''}
            `}>
              {item.badgeText}
            </span>
          )}
          {item.comingSoon && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-700">
              Soon
            </span>
          )}
          {!isAvailable && accessInfo?.reason && (
            <AlertTriangle size={14} className="text-amber-500" />
          )}
        </div>
        {hasChildren && (
          <div className="ml-auto">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        )}
      </div>
    )

    const element = (
      <div key={item.id}>
        {item.href && isAvailable ? (
          <Link href={item.href}>
            {content}
          </Link>
        ) : hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.id)}
            className="w-full text-left"
            disabled={!isAvailable}
          >
            {content}
          </button>
        ) : (
          <div className="w-full">
            {content}
          </div>
        )}
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )

    return element
  }

  return (
    <nav className={`space-y-2 ${className}`}>
      {/* Site Switcher (if multi-site enabled) */}
      {siteContext?.canSwitchSites && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Current Site
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {siteContext.siteName}
              </p>
            </div>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => {/* TODO: Implement site switcher */}}
            >
              Switch
            </button>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="space-y-1">
        {adminNavigation.map(item => renderNavItem(item))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">
          Quick Actions
        </p>
        <div className="space-y-1">
          <Link 
            href="/admin/articles/new"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <FileText size={16} />
            <span>New Article</span>
          </Link>
          <Link 
            href="/admin/media/upload"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <Upload size={16} />
            <span>Upload Media</span>
          </Link>
          <Link 
            href="/admin/topics-pipeline/new"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <TrendingUp size={16} />
            <span>New Topic</span>
          </Link>
          <Link 
            href="/admin/prompts/new"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <Brain size={16} />
            <span>New Prompt</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}