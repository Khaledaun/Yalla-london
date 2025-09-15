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
    const paddingLeft = level * 12 + 16

    const content = (
      <div
        className={`
          flex items-center justify-between w-full px-4 py-3 text-sm rounded-xl transition-all duration-200 group
          ${isActive 
            ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 shadow-purple border-l-4 border-purple-600 dark:from-purple-900/40 dark:to-purple-800/40 dark:text-purple-200' 
            : isAvailable 
              ? 'text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-300'
              : 'text-gray-400 dark:text-gray-600'
          }
          ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${level > 0 ? 'ml-4 border-l-2 border-purple-100 dark:border-purple-800' : ''}
        `}
        style={{ paddingLeft }}
      >
        <div className="flex items-center space-x-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
            ${isActive 
              ? 'bg-purple-600 text-white shadow-purple' 
              : isAvailable 
                ? 'bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600 dark:bg-gray-700 dark:text-gray-400 dark:group-hover:bg-purple-900/50 dark:group-hover:text-purple-400'
                : 'bg-gray-50 text-gray-400 dark:bg-gray-800'
            }
          `}>
            <Icon size={16} />
          </div>
          <div className="flex-1">
            <span className="font-medium">{item.label}</span>
            {item.description && level === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {item.badgeText && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
                ${item.badgeVariant === 'default' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : ''}
                ${item.badgeVariant === 'secondary' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : ''}
                ${item.badgeVariant === 'outline' ? 'border border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300' : ''}
              `}>
                {item.badgeText}
              </span>
            )}
            {item.comingSoon && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:bg-orange-900/20">
                Soon
              </span>
            )}
            {!isAvailable && accessInfo?.reason && (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
          </div>
        </div>
        {hasChildren && (
          <div className="ml-2">
            <div className={`
              w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200
              ${isExpanded ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' : 'text-gray-400 group-hover:text-purple-500'}
            `}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
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
          <div className="mt-2 space-y-1 animate-fade-in">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )

    return element
  }

  return (
    <nav className={`space-y-4 ${className}`}>
      {/* Site Switcher (if multi-site enabled) */}
      {siteContext?.canSwitchSites && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Globe size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Current Site
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {siteContext.siteName}
                </p>
              </div>
            </div>
            <button
              className="btn-ghost-modern text-xs py-1 px-3"
              onClick={() => {/* TODO: Implement site switcher */}}
            >
              Switch
            </button>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="space-y-2">
        {adminNavigation.map(item => renderNavItem(item))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-6 border-t border-purple-200/50 dark:border-gray-700">
        <div className="mb-4 px-2">
          <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Quick Actions
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Common tasks and shortcuts
          </p>
        </div>
        <div className="space-y-2">
          <Link 
            href="/admin/content/articles/new"
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-300 rounded-xl transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="font-medium">New Article</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Create blog post
              </p>
            </div>
          </Link>
          <Link 
            href="/admin/content/media/upload"
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-300 rounded-xl transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
              <Upload size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="font-medium">Upload Media</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Add images & files
              </p>
            </div>
          </Link>
          <Link 
            href="/admin/people/invite"
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-300 rounded-xl transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="font-medium">Invite User</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Add team member
              </p>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}