'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
  Zap
} from 'lucide-react'

// MOPHY-styled Navigation Structure
const mainNavigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    children: [
      { label: 'Overview', href: '/admin/dashboard' },
      { label: 'Analytics', href: '/admin/command-center/analytics' },
      { label: 'Performance', href: '/admin/seo-audits' },
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
      { label: 'Categories', href: '/admin/content-types' },
      { label: 'Media Library', href: '/admin/media' },
      { label: 'Pipeline', href: '/admin/pipeline' },
    ]
  },
  {
    id: 'seo',
    label: 'SEO & Marketing',
    icon: TrendingUp,
    href: '/admin/seo-audits',
    badge: 'AI',
    children: [
      { label: 'SEO Audits', href: '/admin/seo-audits' },
      { label: 'Keywords', href: '/admin/seo' },
      { label: 'Topics Research', href: '/admin/topics-pipeline' },
      { label: 'Affiliates', href: '/admin/affiliates' },
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
      { label: 'Prompts', href: '/admin/prompts' },
      { label: 'Scheduler', href: '/admin/automation-hub' },
    ]
  },
  {
    id: 'design',
    label: 'Design',
    icon: Palette,
    href: '/admin/design/homepage',
    children: [
      { label: 'Homepage Builder', href: '/admin/design/homepage' },
      { label: 'Theme Settings', href: '/admin/settings/theme' },
    ]
  },
  {
    id: 'command',
    label: 'Command Center',
    icon: Command,
    href: '/admin/command-center',
    badge: 'Pro',
    children: [
      { label: 'Overview', href: '/admin/command-center' },
      { label: 'Sites', href: '/admin/command-center/sites/new' },
      { label: 'Social Media', href: '/admin/command-center/social' },
      { label: 'Autopilot', href: '/admin/command-center/autopilot' },
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
      { label: 'Site Settings', href: '/admin/site' },
    ]
  },
]

interface MophyAdminLayoutProps {
  children: React.ReactNode
  pageTitle?: string
}

export function MophyAdminLayout({ children, pageTitle }: MophyAdminLayoutProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['dashboard'])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [chatboxOpen, setChatboxOpen] = useState(false)

  // Auto-expand active menu
  useEffect(() => {
    mainNavigation.forEach(item => {
      if (item.children?.some(child => pathname?.startsWith(child.href))) {
        setExpandedMenus(prev => prev.includes(item.id) ? prev : [...prev, item.id])
      }
    })
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  // Sample notifications
  const notifications = [
    { id: 1, title: 'New article published', time: '5 min ago', type: 'success' },
    { id: 2, title: 'SEO score improved', time: '1 hour ago', type: 'info' },
    { id: 3, title: 'Automation completed', time: '2 hours ago', type: 'success' },
  ]

  return (
    <div className={`min-h-screen font-inter ${darkMode ? 'dark' : ''}`}>
      {/* Preloader would go here in production */}

      <div id="main-wrapper" className="show">
        {/* Nav Header (Logo Area) */}
        <div className={`
          fixed top-0 left-0 z-50 h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800
          transition-all duration-300
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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

            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Chatbox Panel */}
        {chatboxOpen && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <button onClick={() => setChatboxOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {notifications.map(notif => (
                <div key={notif.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className={`
          fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800
          transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full flex flex-col">
            {/* Scrollable Navigation */}
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

                      {/* Submenu */}
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

            {/* Bottom Actions */}
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

        {/* Top Header */}
        <header className={`
          fixed top-0 right-0 z-40 h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800
          transition-all duration-300
          ${sidebarOpen ? 'left-64' : 'left-20'}
          max-lg:left-0
        `}>
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <Menu size={20} className="text-gray-500" />
              </button>

              {pageTitle && (
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
                  {pageTitle}
                </h1>
              )}

              {/* Search */}
              <div className="hidden md:flex items-center">
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
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Notifications */}
              <button
                onClick={() => setChatboxOpen(!chatboxOpen)}
                className="relative p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-white text-sm font-semibold">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session?.user?.name || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
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

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`
          min-h-screen pt-16 transition-all duration-300
          ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
          bg-gray-50 dark:bg-slate-950
        `}>
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
