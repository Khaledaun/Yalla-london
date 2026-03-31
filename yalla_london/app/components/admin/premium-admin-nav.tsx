'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { safeLocalGet, safeLocalSet } from '@/lib/safe-storage'
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
  Share2,
  Mail,
  Video,
  Sparkles,
  Inbox,
  Phone,
  FolderOpen,
  HardDrive
} from 'lucide-react'
import { isPremiumFeatureEnabled, validatePremiumFeatureAccess } from '@/lib/feature-flags'
import { getActiveSiteIds, getSiteConfig, getDefaultSiteId } from '@/config/sites'

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

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Premium Admin Navigation Structure
 * Grouped into logical sections for Khaled's iPhone workflow
 */
export const adminSections: NavSection[] = [
  /* ── COCKPIT ── */
  {
    id: 'cockpit',
    label: 'Cockpit',
    items: [
      {
        id: 'dashboard',
        label: 'HQ',
        icon: LayoutDashboard,
        href: '/admin/cockpit',
        description: 'Mission control — KPIs, alerts, quick actions',
      },
      {
        id: 'departures',
        label: 'Departures',
        icon: Clock,
        href: '/admin/departures',
        description: 'Cron schedule, live countdowns, Do Now',
      },
      {
        id: 'activity-feed',
        label: 'Activity',
        icon: Activity,
        href: '/admin/cockpit/activity',
        badgeText: 'Live',
        badgeVariant: 'default',
        description: 'Timeline, self-healing, observations',
      },
    ],
  },

  /* ── COMMS ── */
  {
    id: 'comms',
    label: 'Comms',
    items: [
      {
        id: 'inbox',
        label: 'Inbox',
        icon: Inbox,
        href: '/admin/communications',
        description: 'All conversations — WhatsApp, email, web',
      },
      {
        id: 'crm',
        label: 'CRM',
        icon: Users,
        href: '/admin/crm',
        description: 'Contacts, pipeline, subscribers, consent',
      },
      {
        id: 'social-hub',
        label: 'Social Hub',
        icon: Share2,
        href: '/admin/social-hub',
        description: 'Social accounts, posts, scheduling',
      },
      {
        id: 'email-campaigns',
        label: 'Email Campaigns',
        icon: Mail,
        href: '/admin/email-campaigns',
        description: 'Templates, campaigns, subscriber management',
      },
    ],
  },

  /* ── CONTENT ── */
  {
    id: 'content',
    label: 'Content',
    items: [
      {
        id: 'articles',
        label: 'Articles',
        icon: FileText,
        href: '/admin/articles',
        description: 'Drafts, published, workflow status',
      },
      {
        id: 'topics-pipeline',
        label: 'Topics & Pipeline',
        icon: TrendingUp,
        href: '/admin/topics-pipeline',
        badgeText: 'Auto',
        badgeVariant: 'default',
        description: 'Topic research, approval, pipeline status',
      },
      {
        id: 'pipeline-phases',
        label: 'Pipeline Phases',
        icon: Layers,
        href: '/admin/pipeline-phases',
        badgeText: 'Live',
        badgeVariant: 'default',
        description: 'Per-phase view — advance, retry, delete',
      },
      {
        id: 'content-engine',
        label: 'Content Engine',
        icon: Sparkles,
        href: '/admin/content-engine',
        badgeText: 'AI',
        badgeVariant: 'secondary',
        description: '4-agent AI content generation',
      },
      {
        id: 'prompts',
        label: 'Prompts',
        icon: Brain,
        href: '/admin/prompts',
        description: 'Editable, versioned prompt templates',
      },
    ],
  },

  /* ── SEO ── */
  {
    id: 'seo',
    label: 'SEO',
    items: [
      {
        id: 'seo-audits',
        label: 'SEO Audits',
        icon: Search,
        href: '/admin/seo-audits',
        badgeText: 'AI',
        badgeVariant: 'secondary',
        description: 'Scoring, fixes, preview, history',
      },
      {
        id: 'master-audit',
        label: 'Master Audit',
        icon: Shield,
        href: '/admin/master-audit',
        badgeText: 'Full Site',
        badgeVariant: 'outline',
        description: '8 validators, 6 hard gates, per-page results',
      },
    ],
  },

  /* ── DESIGN & MEDIA ── */
  {
    id: 'design',
    label: 'Design & Media',
    items: [
      {
        id: 'design-hub',
        label: 'Design Hub',
        icon: Palette,
        href: '/admin/design',
        badgeText: 'Studio',
        badgeVariant: 'outline',
        description: 'Create and manage visual assets',
      },
      {
        id: 'asset-library',
        label: 'Asset Library',
        icon: FolderOpen,
        href: '/admin/asset-library',
        description: 'All media assets, Canva clips, uploads',
      },
      {
        id: 'google-drive',
        label: 'Google Drive',
        icon: HardDrive,
        href: '/admin/google-drive',
        description: 'Import files from Drive to Asset Library',
      },
      {
        id: 'media',
        label: 'Media Library',
        icon: Image,
        href: '/admin/media',
        description: 'Upload/manage files with metadata',
      },
    ],
  },

  /* ── COMMERCE ── */
  {
    id: 'commerce',
    label: 'Commerce',
    items: [
      {
        id: 'affiliate-hq',
        label: 'Affiliate HQ',
        icon: DollarSign,
        href: '/admin/affiliate-hq',
        description: 'Revenue, partners, coverage, links',
      },
      {
        id: 'finance-hub',
        label: 'Finance Hub',
        icon: Briefcase,
        href: '/admin/cockpit/finance',
        description: 'Stripe + Mercury + Affiliate revenue',
      },
      {
        id: 'kaspo-b2b',
        label: 'Kaspo B2B',
        icon: Users,
        href: '/admin/kaspo',
        description: 'B2B agent management, content access',
      },
    ],
  },

  /* ── SYSTEM ── */
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'integrations',
        label: 'Integrations',
        icon: Activity,
        href: '/admin/integrations',
        badgeText: 'Health',
        badgeVariant: 'default',
        description: 'API health, monetization status',
      },
      {
        id: 'ai-costs',
        label: 'AI Costs',
        icon: BarChart3,
        href: '/admin/ai-costs',
        description: 'Provider spend, per-task breakdown',
      },
      {
        id: 'automation-hub',
        label: 'Automation',
        icon: Bot,
        href: '/admin/automation-hub',
        description: 'Publishing schedules, cron jobs',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        children: [
          { id: 'theme', label: 'Theme', icon: Palette, href: '/admin/settings/theme', description: 'Theme, logo/colors' },
          { id: 'api-keys', label: 'API Keys', icon: Key, description: 'External service credentials', comingSoon: true },
          { id: 'roles', label: 'Roles', icon: Users, description: 'User roles and permissions', comingSoon: true },
          { id: 'site', label: 'Site Settings', icon: Globe, href: '/admin/cockpit/new-site', description: 'General site configuration' },
        ],
      },
    ],
  },
]

// Flat list for backward compatibility
export const adminNavigation: NavItem[] = adminSections.flatMap(s => s.items)

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
  const activeSiteIds = getActiveSiteIds()
  const [selectedSiteId, setSelectedSiteId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = safeLocalGet('selectedSiteId')
      if (stored && activeSiteIds.includes(stored)) return stored
    }
    return activeSiteIds[0] || getDefaultSiteId()
  })
  const currentSiteConfig = getSiteConfig(selectedSiteId)
  const currentSite = selectedSiteId

  const handleSiteSwitch = () => {
    if (activeSiteIds.length < 2) return
    const idx = activeSiteIds.indexOf(selectedSiteId)
    const nextId = activeSiteIds[(idx + 1) % activeSiteIds.length]
    safeLocalSet('selectedSiteId', nextId)
    document.cookie = `x-site-id=${nextId};path=/;max-age=31536000`
    window.location.reload()
  }

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
      {activeSiteIds.length > 1 && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Current Site
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentSiteConfig?.name || selectedSiteId}
              </p>
            </div>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleSiteSwitch}
            >
              Switch
            </button>
          </div>
        </div>
      )}

      {/* Navigation — grouped by section */}
      <div className="space-y-4">
        {adminSections.map(section => (
          <div key={section.id}>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => renderNavItem(item))}
            </div>
          </div>
        ))}
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
            href="/admin/topics-pipeline"
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
          >
            <TrendingUp size={16} />
            <span>New Topic</span>
          </Link>
          <Link
            href="/admin/prompts"
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

/* ── Mobile Bottom Navigation ── */
export function MobileBottomNav() {
  const pathname = usePathname()

  const tabs = [
    { id: 'hq', label: 'HQ', icon: LayoutDashboard, href: '/admin/cockpit' },
    { id: 'content', label: 'Content', icon: FileText, href: '/admin/articles' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, href: '/admin/communications' },
    { id: 'crm', label: 'CRM', icon: Users, href: '/admin/crm' },
    { id: 'more', label: 'More', icon: Settings, href: '/admin/settings' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          const Icon = tab.icon
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-medium transition-colors
                ${isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
                }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="mt-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}