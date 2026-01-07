'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FileText,
  Image,
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
  Plus,
  Command,
  Sun,
  Moon
} from 'lucide-react'

// Navigation Structure
const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { id: 'articles', label: 'Articles', icon: FileText, href: '/admin/articles', badge: 'Workflow' },
  { id: 'media', label: 'Media', icon: Image, href: '/admin/media' },
  { id: 'seo', label: 'SEO Audits', icon: Search, href: '/admin/seo-audits', badge: 'AI' },
  { id: 'topics', label: 'Topics & Pipeline', icon: TrendingUp, href: '/admin/topics-pipeline', badge: 'Auto' },
  { id: 'prompts', label: 'Prompts', icon: Brain, href: '/admin/prompts' },
  { id: 'content-types', label: 'Content Types', icon: Layers, href: '/admin/content-types' },
  { id: 'automation', label: 'Automation Hub', icon: Bot, href: '/admin/automation-hub', badge: 'Jobs' },
]

const settingsNav = [
  { id: 'theme', label: 'Theme', icon: Palette, href: '/admin/settings/theme' },
  { id: 'api-keys', label: 'API Keys', icon: Key, href: '/admin/command-center/settings/api-keys' },
  { id: 'roles', label: 'Roles', icon: Users, href: '/admin/settings/roles' },
  { id: 'site', label: 'Site Settings', icon: Globe, href: '/admin/site' },
]

const quickActions = [
  { label: 'New Article', icon: FileText, href: '/admin/articles/new' },
  { label: 'Upload Media', icon: Upload, href: '/admin/media/upload' },
  { label: 'New Topic', icon: TrendingUp, href: '/admin/topics-pipeline' },
  { label: 'New Prompt', icon: Brain, href: '/admin/prompts' },
]

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Auto-expand settings if on settings page
  useEffect(() => {
    if (pathname?.includes('/admin/settings') || pathname?.includes('/admin/site')) {
      setSettingsExpanded(true)
    }
  }, [pathname])

  const isActive = (href: string) => {
    if (!pathname) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            {sidebarOpen && (
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Yalla Admin
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon size={20} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'} />
                  {sidebarOpen && (
                    <>
                      <span className="ml-3 flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={`
                          px-2 py-0.5 text-xs rounded-full
                          ${item.badge === 'AI' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : ''}
                          ${item.badge === 'Auto' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : ''}
                          ${item.badge === 'Workflow' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : ''}
                          ${item.badge === 'Jobs' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' : ''}
                        `}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Settings Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`
                w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700
              `}
            >
              <Settings size={20} className="text-gray-500" />
              {sidebarOpen && (
                <>
                  <span className="ml-3 flex-1 text-left">Settings</span>
                  {settingsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </>
              )}
            </button>

            {settingsExpanded && sidebarOpen && (
              <div className="mt-1 ml-4 space-y-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm transition-all
                        ${active
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <Icon size={16} className={active ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {sidebarOpen && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Actions
              </p>
              <div className="space-y-1">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all"
                    >
                      <Icon size={16} className="text-gray-400" />
                      <span className="ml-3">{action.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Toggle */}
        <div className="hidden lg:block p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {sidebarOpen ? <ChevronRight size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>

              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search... (⌘K)"
                    className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {session?.user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {session?.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {session?.user?.email || 'user@example.com'}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/admin/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <User size={16} className="mr-3 text-gray-400" />
                          Profile
                        </Link>
                        <Link
                          href="/admin/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings size={16} className="mr-3 text-gray-400" />
                          Settings
                        </Link>
                        <Link
                          href="/admin/help"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <HelpCircle size={16} className="mr-3 text-gray-400" />
                          Help
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut size={16} className="mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
