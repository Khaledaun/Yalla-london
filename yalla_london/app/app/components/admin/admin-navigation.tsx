'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Newspaper,
  BookOpen,
  Image,
  Search,
  Bot,
  Users,
  DollarSign,
  Settings,
  Palette,
  Home,
  Megaphone,
  Key,
  BarChart3,
  FileText,
  Folder,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Link as LinkIcon,
  Globe,
  Brain
} from 'lucide-react'
// Simple auth hook for navigation
const useAuth = () => {
  const logout = () => {
    // Simple logout - in a real app, this would call your auth service
    window.location.href = '/admin/login'
  }
  return { logout }
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    name: 'Content Hub',
    href: '/admin/content',
    icon: Newspaper,
    children: [
      { name: 'All Articles', href: '/admin/content', icon: FileText },
      { name: 'New Article', href: '/admin/articles/new', icon: Plus },
      { name: 'Media Library', href: '/admin/media', icon: Folder }
    ]
  },
  {
    name: 'Topics',
    href: '/admin/topics',
    icon: BookOpen
  },
  {
    name: 'SEO Command Center',
    href: '/admin/seo',
    icon: Search,
    children: [
      { name: 'Overview', href: '/admin/seo', icon: BarChart3 },
      { name: 'Backlinks', href: '/admin/seo/backlinks', icon: LinkIcon },
      { name: 'Article SEO', href: '/admin/seo/articles', icon: FileText },
      { name: 'Site Crawler', href: '/admin/seo/crawler', icon: Globe }
    ]
  },
  {
    name: 'Automation Hub',
    href: '/admin/automation-hub',
    icon: Bot
  },
  {
    name: 'Site Control',
    href: '/admin/site',
    icon: Settings,
    children: [
      { name: 'Homepage Builder', href: '/admin/design/homepage', icon: Home },
      { name: 'Theme Customizer', href: '/admin/settings/theme', icon: Palette },
      { name: 'Pop-up Offers', href: '/admin/site/popups', icon: Megaphone }
    ]
  },
  {
    name: 'AI Prompt Studio',
    href: '/admin/ai-prompt-studio',
    icon: Brain
  },
  {
    name: 'Affiliate Program',
    href: '/admin/affiliates',
    icon: DollarSign
  },
  {
    name: 'CRM & Newsletter',
    href: '/admin/crm',
    icon: Users
  },
  {
    name: 'API & Security',
    href: '/admin/api-security',
    icon: Key
  }
]

export function AdminNavigation() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const hasActiveChild = (children: NavigationItem[]) => {
    return children.some(child => isActive(child.href))
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)
    const isItemActive = isActive(item.href)
    const hasActiveChildItem = hasChildren && hasActiveChild(item.children!)

    return (
      <div key={item.name}>
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.name)}
              className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isItemActive || hasActiveChildItem
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-2">
                  {item.badge}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 ml-2" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-2" />
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isItemActive
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-2">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation */}
      <nav
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">YL</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Yalla London</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationItems.map(item => renderNavigationItem(item))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
}
