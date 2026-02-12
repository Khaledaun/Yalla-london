'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { SiteSelector } from '@/components/admin/site-selector'
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Search,
  TrendingUp,
  Brain,
  Layers,
  Bot,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Bell,
  User,
  LogOut,
  HelpCircle,
  Palette,
  Key,
  Users,
  Globe,
  Upload,
  MessageSquare,
  BarChart3,
  Wallet,
  CreditCard,
  Calendar,
  ShoppingCart,
  Mail,
  Sun,
  Moon,
  Command,
  Plus,
  Zap,
  Images,
  Link2,
  Store,
  Package,
  Brush,
  Activity,
  BookOpen,
  Newspaper,
  ShieldCheck,
  Edit3,
  Home,
} from 'lucide-react'

// MOPHY-styled Navigation Structure
// All admin pages must be reachable from the sidebar.
const mainNavigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
    children: [
      { label: 'Command Center', href: '/admin' },
      { label: 'Analytics', href: '/admin/command-center/analytics' },
      { label: 'SEO Audits', href: '/admin/seo-audits' },
      { label: 'SEO Command', href: '/admin/seo-command' },
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    href: '/admin/operations',
    badge: 'Ops',
    children: [
      { label: 'Operations Hub', href: '/admin/operations' },
      { label: 'Skills Engine', href: '/admin/operations/skills' },
      { label: 'Stripe MCP', href: '/admin/operations/mcp/stripe' },
      { label: 'Mercury Bank', href: '/admin/operations/mcp/mercury' },
    ]
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileText,
    href: '/admin/articles',
    badge: 'CMS',
    children: [
      { label: 'All Articles', href: '/admin/articles' },
      { label: 'New Article', href: '/admin/articles/new' },
      { label: 'Topics Pipeline', href: '/admin/topics' },
      { label: 'Content Pipeline', href: '/admin/pipeline' },
      { label: 'Categories', href: '/admin/content-types' },
      { label: 'WordPress', href: '/admin/wordpress' },
    ]
  },
  {
    id: 'information',
    label: 'Information Hub',
    icon: BookOpen,
    href: '/admin/information',
    badge: 'Guide',
    children: [
      { label: 'Overview', href: '/admin/information' },
      { label: 'Sections', href: '/admin/information' },
      { label: 'Articles', href: '/admin/information' },
    ]
  },
  {
    id: 'news',
    label: 'London News',
    icon: Newspaper,
    href: '/admin/news',
    badge: 'Live',
    children: [
      { label: 'Dashboard', href: '/admin/news' },
      { label: 'Published', href: '/admin/news' },
      { label: 'Research Logs', href: '/admin/news' },
    ]
  },
  {
    id: 'facts',
    label: 'Fact Checker',
    icon: ShieldCheck,
    href: '/admin/facts',
    badge: 'Agent',
    children: [
      { label: 'All Facts', href: '/admin/facts' },
      { label: 'Pending', href: '/admin/facts' },
      { label: 'Outdated', href: '/admin/facts' },
    ]
  },
  {
    id: 'media',
    label: 'Media',
    icon: ImageIcon,
    href: '/admin/media',
    children: [
      { label: 'Media Library', href: '/admin/media' },
      { label: 'Photo Pool', href: '/admin/photo-pool' },
      { label: 'Upload', href: '/admin/media/upload' },
    ]
  },
  {
    id: 'seo',
    label: 'SEO & Marketing',
    icon: TrendingUp,
    href: '/admin/seo',
    badge: 'AI',
    children: [
      { label: 'SEO Dashboard', href: '/admin/seo' },
      { label: 'Keywords & GSC', href: '/admin/seo/report' },
      { label: 'Affiliates', href: '/admin/affiliate-marketing' },
      { label: 'Affiliate Pool', href: '/admin/affiliate-pool' },
    ]
  },
  {
    id: 'automation',
    label: 'AI & Automation',
    icon: Bot,
    href: '/admin/automation-hub',
    badge: 'New',
    children: [
      { label: 'Automation Hub', href: '/admin/automation-hub' },
      { label: 'AI Studio', href: '/admin/ai-studio' },
      { label: 'Prompt Studio', href: '/admin/ai-prompt-studio' },
      { label: 'Workflow', href: '/admin/workflow' },
    ]
  },
  {
    id: 'design',
    label: 'Design & Media',
    icon: Palette,
    href: '/admin/design-studio',
    children: [
      { label: 'Design Studio', href: '/admin/design-studio' },
      { label: 'Video Studio', href: '/admin/video-studio' },
      { label: 'PDF Generator', href: '/admin/pdf-generator' },
      { label: 'Homepage Builder', href: '/admin/design/homepage' },
      { label: 'Brand Assets', href: '/admin/brand-assets' },
    ]
  },
  {
    id: 'monetization',
    label: 'Monetization',
    icon: Store,
    href: '/admin/shop',
    children: [
      { label: 'Shop & Products', href: '/admin/shop' },
      { label: 'Transactions', href: '/admin/transactions' },
      { label: 'Billing', href: '/admin/billing' },
    ]
  },
  {
    id: 'command',
    label: 'Multi-Site',
    icon: Globe,
    href: '/admin/command-center',
    badge: 'Pro',
    children: [
      { label: 'All Sites', href: '/admin/command-center/sites' },
      { label: 'Add New Site', href: '/admin/command-center/sites/new' },
      { label: 'Autopilot', href: '/admin/command-center/autopilot' },
      { label: 'Social Media', href: '/admin/command-center/social' },
    ]
  },
  {
    id: 'team',
    label: 'People',
    icon: Users,
    href: '/admin/team',
    children: [
      { label: 'Team', href: '/admin/team' },
      { label: 'CRM', href: '/admin/crm' },
      { label: 'Members', href: '/admin/people/members' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/admin/settings/theme',
    children: [
      { label: 'Theme', href: '/admin/settings/theme' },
      { label: 'API Keys', href: '/admin/command-center/settings/api-keys' },
      { label: 'Feature Flags', href: '/admin/feature-flags' },
      { label: 'Site Control', href: '/admin/site-control' },
      { label: 'API Security', href: '/admin/api-security' },
    ]
  },
]

// Mobile bottom nav — the five most essential admin sections
const mobileBottomNav = [
  { label: 'Home', icon: Home, href: '/admin' },
  { label: 'Content', icon: FileText, href: '/admin/articles' },
  { label: 'New', icon: Plus, href: '/admin/articles/new', primary: true },
  { label: 'SEO', icon: TrendingUp, href: '/admin/seo' },
  { label: 'More', icon: Menu, href: '__menu__' },
]

interface MophyAdminLayoutProps {
  children: React.ReactNode
  pageTitle?: string
}

export function MophyAdminLayout({ children, pageTitle }: MophyAdminLayoutProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dashboard'])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [chatboxOpen, setChatboxOpen] = useState(false)

  const isLoginPage = pathname === '/admin/login'

  // Redirect unauthenticated users to login (except on the login page itself)
  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.replace('/admin/login')
    }
  }, [status, isLoginPage, router])

  // Auto-expand active menu
  useEffect(() => {
    mainNavigation.forEach(item => {
      if (item.children?.some(child => pathname?.startsWith(child.href))) {
        setExpandedMenus(prev => prev.includes(item.id) ? prev : [...prev, item.id])
      }
    })
  }, [pathname])

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
    setChatboxOpen(false)
  }, [pathname])

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')
  const isMenuActive = (item: typeof mainNavigation[0]) => {
    if (isActive(item.href)) return true
    return item.children?.some(child => isActive(child.href))
  }

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  // Sample notifications
  const notifications = [
    { id: 1, title: 'New article published', time: '5 min ago', type: 'success' },
    { id: 2, title: 'SEO score improved', time: '1 hour ago', type: 'info' },
    { id: 3, title: 'Automation completed', time: '2 hours ago', type: 'success' },
  ]

  // If on the login page, render children without admin chrome
  if (isLoginPage) {
    return <>{children}</>
  }

  // While checking auth, show a loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">Y</span>
          </div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If still unauthenticated (redirect pending), show nothing
  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className={`min-h-screen font-inter ${darkMode ? 'dark' : ''}`}>
      <div id="main-wrapper" className="show">
        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Nav Header (Logo Area) — hidden on mobile, shown on lg+ */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className={`
          fixed top-0 left-0 z-50 h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800
          transition-all duration-300 hidden lg:block
          ${sidebarOpen ? 'w-64' : 'w-20'}
        `}>
          <div className="h-full flex items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-bold text-lg">Y</span>
              </div>
              {sidebarOpen && (
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Yalla Admin
                </span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Chatbox / Notifications Panel */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {chatboxOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 lg:bg-transparent" onClick={() => setChatboxOpen(false)} />
            <div className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <button onClick={() => setChatboxOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-5rem)]">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Mobile Sidebar Overlay + Slide-in Panel */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={closeMobileMenu} />

            {/* Sidebar panel */}
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-slide-in-left">
              {/* Header with close + brand */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-slate-800">
                <Link href="/admin" className="flex items-center gap-3" onClick={closeMobileMenu}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="text-white font-bold text-lg">Y</span>
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Yalla Admin
                  </span>
                </Link>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* User info (mobile) */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white text-sm font-semibold">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session?.user?.name || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session?.user?.email || 'admin@yallalondon.com'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Navigation */}
              <nav className="flex-1 overflow-y-auto py-3 px-3 overscroll-contain">
                <ul className="space-y-0.5">
                  {mainNavigation.map((item) => {
                    const Icon = item.icon
                    const isExpanded = expandedMenus.includes(item.id)
                    const active = isMenuActive(item)

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => item.children ? toggleMenu(item.id) : null}
                          className={`
                            w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all
                            ${active
                              ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary dark:text-primary'
                              : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-slate-800'
                            }
                          `}
                        >
                          <div className={`
                            w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                            ${active
                              ? 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/30'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                            }
                          `}>
                            <Icon size={18} />
                          </div>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className={`
                              px-2 py-0.5 text-xs font-medium rounded-full
                              ${item.badge === 'AI' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                              ${item.badge === 'CMS' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                              ${item.badge === 'New' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : ''}
                              ${item.badge === 'Pro' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                              ${item.badge === 'Ops' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                              ${item.badge === 'Live' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                              ${item.badge === 'Agent' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : ''}
                              ${item.badge === 'Guide' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : ''}
                            `}>
                              {item.badge}
                            </span>
                          )}
                          {item.children && (
                            <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {/* Submenu */}
                        {item.children && isExpanded && (
                          <ul className="mt-1 ml-12 space-y-0.5">
                            {item.children.map((child) => (
                              <li key={child.href + child.label}>
                                <Link
                                  href={child.href}
                                  onClick={closeMobileMenu}
                                  className={`
                                    block px-3 py-2.5 text-sm rounded-lg transition-all
                                    ${isActive(child.href)
                                      ? 'text-primary font-medium bg-primary/5'
                                      : 'text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-slate-800'
                                    }
                                  `}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Bottom actions */}
              <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <Link
                  href="/admin/articles/new"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-primary/30 active:shadow-sm transition-all"
                >
                  <Plus size={18} />
                  New Article
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-all"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Desktop Sidebar (lg+) */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <aside className={`
          fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800
          transition-all duration-300 overflow-hidden hidden lg:block
          ${sidebarOpen ? 'w-64' : 'w-20'}
        `}>
          <div className="h-full flex flex-col">
            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
              <ul className="space-y-1">
                {mainNavigation.map((item) => {
                  const Icon = item.icon
                  const isExpanded = expandedMenus.includes(item.id)
                  const active = isMenuActive(item)

                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => item.children ? toggleMenu(item.id) : null}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                          ${active
                            ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary dark:text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        <div className={`
                          w-9 h-9 rounded-lg flex items-center justify-center transition-all
                          ${active
                            ? 'bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/30'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                          }
                        `}>
                          <Icon size={18} />
                        </div>
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className={`
                                px-2 py-0.5 text-xs font-medium rounded-full
                                ${item.badge === 'AI' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                                ${item.badge === 'CMS' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                                ${item.badge === 'New' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : ''}
                                ${item.badge === 'Pro' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                                ${item.badge === 'Ops' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                                ${item.badge === 'Live' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                                ${item.badge === 'Agent' ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' : ''}
                                ${item.badge === 'Guide' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : ''}
                              `}>
                                {item.badge}
                              </span>
                            )}
                            {item.children && (
                              <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </>
                        )}
                      </button>

                      {item.children && isExpanded && sidebarOpen && (
                        <ul className="mt-1 ml-12 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`
                                  block px-3 py-2 text-sm rounded-lg transition-all
                                  ${isActive(child.href)
                                    ? 'text-primary font-medium bg-primary/5'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
                                  }
                                `}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>

            {sidebarOpen && (
              <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                <Link
                  href="/admin/articles/new"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                >
                  <Plus size={18} />
                  New Article
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Top Header */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <header className={`
          fixed top-0 right-0 z-40 h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800
          transition-all duration-300 left-0
          ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}
        `}>
          <div className="h-full px-3 lg:px-6 flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-2 lg:gap-4 min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0"
                aria-label="Open menu"
              >
                <Menu size={22} className="text-gray-700 dark:text-gray-300" />
              </button>

              {/* Brand mark (mobile only) */}
              <Link href="/admin" className="lg:hidden flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white font-bold text-sm">Y</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">Yalla</span>
              </Link>

              {/* Site Selector */}
              <div className="hidden sm:block">
                <SiteSelector />
              </div>

              {pageTitle && (
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden md:block truncate">
                  {pageTitle}
                </h1>
              )}

              {/* Desktop Search */}
              <div className="hidden lg:flex items-center">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 rounded">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 lg:p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setChatboxOpen(!chatboxOpen)}
                className="relative p-2 lg:p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
              </button>

              {/* User Menu (desktop) */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white text-sm font-semibold">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session?.user?.name || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-gray-400 hidden md:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {session?.user?.name || 'Admin User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session?.user?.email || 'admin@yallalondon.com'}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link href="/admin/team" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                          <User size={16} className="text-gray-400" /> Team Profile
                        </Link>
                        <Link href="/admin/settings/theme" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                          <Settings size={16} className="text-gray-400" /> Settings
                        </Link>
                        <Link href="/admin/command-center/settings/api-keys" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                          <HelpCircle size={16} className="text-gray-400" /> API & Integrations
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 dark:border-slate-700 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Main Content */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <main className={`
          min-h-screen pt-14 lg:pt-16 pb-20 lg:pb-0 transition-all duration-300
          ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
          bg-gray-50 dark:bg-slate-950
        `}>
          <div className="p-3 sm:p-4 lg:p-6">
            {children}
          </div>
        </main>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Mobile Bottom Navigation Bar (lg:hidden) */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 lg:hidden safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {mobileBottomNav.map((item) => {
              const Icon = item.icon
              const isTrigger = item.href === '__menu__'
              const active = !isTrigger && isActive(item.href)

              if (isTrigger) {
                return (
                  <button
                    key={item.label}
                    onClick={() => setMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-gray-400"
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                )
              }

              if (item.primary) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/30"
                  >
                    <Icon size={22} />
                  </Link>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                    active ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Inline animation for mobile sidebar slide-in */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s ease-out forwards;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  )
}
