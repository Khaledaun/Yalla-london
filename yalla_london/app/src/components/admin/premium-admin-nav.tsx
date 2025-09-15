'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
} from 'lucide-react'
import { isPremiumFeatureEnabled, validatePremiumFeatureAccess } from '@/src/lib/feature-flags'

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
 * Premium Admin Navigation Structure
 * Stable left navigation with comprehensive admin sections
 */
export const adminNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    featureFlag: 'ADMIN_DASHBOARD',
    description: 'Site overview with key metrics and quick actions'
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    featureFlag: 'CONTENT_MANAGEMENT',
    children: [
      {
        id: 'articles',
        label: 'Articles',
        icon: FileText,
        href: '/admin/content/articles',
        description: 'Manage blog posts and articles'
      },
      {
        id: 'media',
        label: 'Media Library',
        icon: Image,
        href: '/admin/content/media',
        description: 'Manage images, videos, and other media assets'
      },
      {
        id: 'seo',
        label: 'SEO',
        icon: Search,
        href: '/admin/content/seo',
        description: 'SEO optimization and performance tracking'
      },
      {
        id: 'review-queue',
        label: 'Review Queue',
        icon: CheckSquare,
        href: '/admin/content/review-queue',
        featureFlag: 'REVIEW_QUEUE',
        badgeText: 'AI',
        badgeVariant: 'secondary',
        description: 'AI-powered content review and approval workflow'
      }
    ]
  },
  {
    id: 'design',
    label: 'Design',
    icon: Palette,
    featureFlag: 'DESIGN_TOOLS',
    children: [
      {
        id: 'theme',
        label: 'Theme',
        icon: Palette,
        href: '/admin/design/theme',
        description: 'Customize site theme and branding'
      },
      {
        id: 'logo',
        label: 'Logo & Assets',
        icon: Upload,
        href: '/admin/design/logo',
        description: 'Manage logos, favicons, and brand assets'
      },
      {
        id: 'homepage-builder',
        label: 'Homepage Builder',
        icon: Home,
        href: '/admin/design/homepage',
        featureFlag: 'LIVE_PREVIEWS',
        badgeText: 'Drag & Drop',
        badgeVariant: 'outline',
        description: 'Visual homepage builder with live preview'
      }
    ]
  },
  {
    id: 'people',
    label: 'People',
    icon: Users,
    featureFlag: 'PEOPLE_MANAGEMENT',
    children: [
      {
        id: 'members-roles',
        label: 'Members & Roles',
        icon: Users,
        href: '/admin/people/members',
        description: 'Manage team members and their roles'
      },
      {
        id: 'access-logs',
        label: 'Access Logs',
        icon: Shield,
        href: '/admin/people/access-logs',
        description: 'View user activity and access logs',
        requiresElevated: true
      }
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Zap,
    featureFlag: 'INTEGRATIONS',
    children: [
      {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        href: '/admin/integrations/api-keys',
        description: 'Manage API keys and external service credentials',
        requiresElevated: true
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        href: '/admin/integrations/analytics',
        description: 'Connect Google Analytics, Search Console, and other analytics'
      },
      {
        id: 'llms',
        label: 'AI Models',
        icon: Bot,
        href: '/admin/integrations/llms',
        featureFlag: 'FEATURE_LLM_ROUTER',
        badgeText: 'Premium',
        badgeVariant: 'default',
        description: 'Configure AI models and LLM routing'
      },
      {
        id: 'affiliates',
        label: 'Affiliate Partners',
        icon: DollarSign,
        href: '/admin/integrations/affiliates',
        featureFlag: 'AFFILIATE_HUB',
        description: 'Manage affiliate partnerships and commissions'
      }
    ]
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: Activity,
    featureFlag: 'AUTOMATIONS',
    children: [
      {
        id: 'jobs',
        label: 'Background Jobs',
        icon: Clock,
        href: '/admin/automations/jobs',
        featureFlag: 'JOB_MONITORING',
        description: 'Monitor and manage background job execution'
      },
      {
        id: 'status',
        label: 'System Status',
        icon: Monitor,
        href: '/admin/automations/status',
        description: 'System health and performance monitoring'
      },
      {
        id: 'cron',
        label: 'Scheduled Tasks',
        icon: Clock,
        href: '/admin/automations/cron',
        description: 'Manage cron jobs and scheduled tasks'
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        href: '/admin/automations/notifications',
        description: 'Configure system notifications and alerts'
      }
    ]
  },
  {
    id: 'affiliate-hub',
    label: 'Affiliate Hub',
    icon: Briefcase,
    href: '/admin/affiliate-hub',
    featureFlag: 'AFFILIATE_HUB',
    badgeText: 'Revenue',
    badgeVariant: 'default',
    description: 'Comprehensive affiliate management and revenue tracking'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    featureFlag: 'SETTINGS_MANAGEMENT',
    children: [
      {
        id: 'site',
        label: 'Site Settings',
        icon: Globe,
        href: '/admin/settings/site',
        description: 'General site configuration and preferences'
      },
      {
        id: 'languages',
        label: 'Languages',
        icon: Languages,
        href: '/admin/settings/languages',
        featureFlag: 'PER_SITE_LOCALES',
        description: 'Manage site languages and localization'
      },
      {
        id: 'feature-flags',
        label: 'Feature Flags',
        icon: Flag,
        href: '/admin/settings/feature-flags',
        description: 'Enable/disable features and preview upcoming functionality'
      }
    ]
  },
  {
    id: 'health',
    label: 'Health',
    icon: Heart,
    href: '/api/phase4/status',
    description: 'API endpoint for system health monitoring',
    badgeText: 'API',
    badgeVariant: 'outline'
  },
  {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    children: [
      {
        id: 'docs',
        label: 'Documentation',
        icon: BookOpen,
        href: '/admin/help/docs',
        description: 'Inline documentation and guides'
      },
      {
        id: 'changelog',
        label: 'Changelog',
        icon: FileCheck,
        href: '/admin/help/changelog',
        description: 'Recent updates and new features'
      },
      {
        id: 'support',
        label: 'Support',
        icon: HelpCircle,
        href: '/admin/help/support',
        description: 'Get help and contact support'
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
          child.href && currentPath.startsWith(child.href)
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
    if (item.href) {
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
            href="/admin/content/articles/new"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <FileText size={16} />
            <span>New Article</span>
          </Link>
          <Link 
            href="/admin/content/media/upload"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <Upload size={16} />
            <span>Upload Media</span>
          </Link>
          <Link 
            href="/admin/people/invite"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <Users size={16} />
            <span>Invite User</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}