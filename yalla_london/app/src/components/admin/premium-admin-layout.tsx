'use client'

import React, { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PremiumAdminNav } from './premium-admin-nav'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { 
  Menu,
  Search, 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  HelpCircle,
  Palette,
  Globe,
  Shield,
  ChevronDown,
  Command,
  Plus,
  Undo2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/src/lib/feature-flags'

interface PremiumAdminLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: React.ReactNode
  siteContext?: {
    siteId: string
    siteName: string
    canSwitchSites: boolean
  }
}

interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  undoAction?: () => void
  timestamp: Date
}

export function PremiumAdminLayout({ 
  children, 
  title, 
  breadcrumbs, 
  actions,
  siteContext 
}: PremiumAdminLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  // Check if premium features are enabled
  const premiumEnabled = isPremiumFeatureEnabled('PREMIUM_BACKEND') || process.env.NODE_ENV === 'development'
  const keyboardShortcuts = isPremiumFeatureEnabled('KEYBOARD_SHORTCUTS')
  const optimisticUpdates = isPremiumFeatureEnabled('OPTIMISTIC_UPDATES')
  const instantUndo = isPremiumFeatureEnabled('INSTANT_UNDO')

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!keyboardShortcuts) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      
      // Command/Ctrl + Z for undo (when available)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && instantUndo) {
        e.preventDefault()
        handleUndo()
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [keyboardShortcuts, instantUndo])

  const handleUndo = () => {
    // TODO: Implement undo functionality
    addNotification({
      type: 'info',
      title: 'Undo',
      message: 'Undo functionality will be implemented here'
    })
  }

  const addNotification = (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const newNotification: ToastNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]) // Keep only 5 notifications
    
    // Auto-remove after 5 seconds unless it has an action
    if (!notification.action && !notification.undoAction) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, 5000)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  if (!premiumEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Premium Backend Not Enabled</h1>
          <p className="mt-2 text-gray-600">
            The premium backend features are not currently enabled.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Contact your administrator to enable premium features.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {siteContext?.siteName || 'Yalla London'} Admin
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <PremiumAdminNav 
              siteContext={siteContext}
              onSiteSwitch={(siteId) => {
                // TODO: Implement site switching
                console.log('Switch to site:', siteId)
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && <span className="text-gray-400 mx-2">/</span>}
                      {crumb.href ? (
                        <a 
                          href={crumb.href}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {title && !breadcrumbs && (
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Command palette trigger */}
            {keyboardShortcuts && (
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                <Search size={16} />
                <span>Search</span>
                <kbd className="text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded">⌘K</kbd>
              </button>
            )}

            {/* Undo button */}
            {instantUndo && (
              <button
                onClick={handleUndo}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Undo last action (⌘Z)"
              >
                <Undo2 size={18} />
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 relative">
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Actions */}
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <User size={18} />
                <ChevronDown size={14} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {session?.user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session?.user?.email}
                    </p>
                  </div>
                  
                  <a
                    href="/admin/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User size={16} className="mr-3" />
                    Profile
                  </a>
                  
                  <a
                    href="/admin/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings size={16} className="mr-3" />
                    Settings
                  </a>
                  
                  <a
                    href="/admin/help"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <HelpCircle size={16} className="mr-3" />
                    Help
                  </a>
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      {optimisticUpdates && notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5
                ${notification.type === 'success' ? 'border-l-4 border-green-400' : ''}
                ${notification.type === 'error' ? 'border-l-4 border-red-400' : ''}
                ${notification.type === 'warning' ? 'border-l-4 border-yellow-400' : ''}
                ${notification.type === 'info' ? 'border-l-4 border-blue-400' : ''}
              `}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-400" />}
                    {notification.type === 'error' && <AlertCircle className="h-6 w-6 text-red-400" />}
                    {notification.type === 'warning' && <AlertCircle className="h-6 w-6 text-yellow-400" />}
                    {notification.type === 'info' && <AlertCircle className="h-6 w-6 text-blue-400" />}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {notification.message}
                    </p>
                    {notification.action && (
                      <div className="mt-3">
                        <button
                          onClick={notification.action.onClick}
                          className="text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {notification.action.label}
                        </button>
                      </div>
                    )}
                    {notification.undoAction && (
                      <div className="mt-3">
                        <button
                          onClick={notification.undoAction}
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Command Palette Modal */}
      {commandPaletteOpen && keyboardShortcuts && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen pt-16 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <Command size={20} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search for actions..."
                    className="flex-1 border-none outline-none text-gray-900 dark:text-gray-100 bg-transparent text-lg"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
                    QUICK ACTIONS
                  </div>
                  
                  <div className="space-y-1">
                    <button className="w-full text-left px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                      <Plus size={16} className="mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">New Article</span>
                    </button>
                    
                    <button className="w-full text-left px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                      <Settings size={16} className="mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">Site Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}