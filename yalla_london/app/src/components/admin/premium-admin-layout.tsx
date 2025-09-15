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
  X,
  Upload
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 sidebar-modern dark:bg-gray-800 dark:border-gray-700 transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-purple-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">Y</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {siteContext?.siteName || 'Yalla London'}
                </h1>
                <p className="text-xs text-purple-200">Admin Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-purple-200 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white to-purple-50/30 dark:from-gray-800 dark:to-gray-900">
            <PremiumAdminNav 
              siteContext={siteContext}
              onSiteSwitch={(siteId) => {
                // TODO: Implement site switching
                console.log('Switch to site:', siteId)
              }}
            />
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <p>Phase 3 UI Enhanced</p>
              <p className="text-purple-600 dark:text-purple-400 font-medium">v2.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Top bar */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-purple-200/50 dark:border-gray-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-purple-600 lg:hidden transition-colors p-2 rounded-lg hover:bg-purple-50"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && <span className="text-purple-300 mx-2">/</span>}
                      {crumb.href ? (
                        <a 
                          href={crumb.href}
                          className="text-sm text-gray-500 hover:text-purple-600 transition-colors px-2 py-1 rounded-md hover:bg-purple-50"
                        >
                          {crumb.label}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {title && !breadcrumbs && (
              <h1 className="text-xl font-bold gradient-purple-text">
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Command palette trigger */}
            {keyboardShortcuts && (
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-all duration-200 border border-purple-200 dark:border-purple-700"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Search</span>
                <kbd className="text-xs bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded font-mono">⌘K</kbd>
              </button>
            )}

            {/* Undo button */}
            {instantUndo && (
              <button
                onClick={handleUndo}
                className="p-2 text-gray-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 glow-on-hover"
                title="Undo last action (⌘Z)"
              >
                <Undo2 size={18} />
              </button>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 relative transition-all duration-200 glow-on-hover">
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse-glow">
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
                className="flex items-center space-x-2 p-2 text-gray-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200 border border-transparent hover:border-purple-200 dark:hover:border-purple-700"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <ChevronDown size={14} className="hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-luxury py-2 z-50 border border-purple-200/50 dark:border-gray-700 animate-scale-in">
                  <div className="px-4 py-3 border-b border-purple-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 mx-2 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {session?.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <a
                      href="/admin/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 mx-2 rounded-lg"
                    >
                      <User size={16} className="mr-3 text-purple-500" />
                      Profile Settings
                    </a>
                    
                    <a
                      href="/admin/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 mx-2 rounded-lg"
                    >
                      <Settings size={16} className="mr-3 text-purple-500" />
                      Admin Settings
                    </a>
                    
                    <a
                      href="/admin/help"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200 mx-2 rounded-lg"
                    >
                      <HelpCircle size={16} className="mr-3 text-purple-500" />
                      Help & Support
                    </a>
                    
                    <div className="border-t border-purple-100 dark:border-gray-700 my-2"></div>
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 mx-2 rounded-lg"
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 animate-fade-in">
          <div className="container-modern">
            {children}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      {optimisticUpdates && notifications.length > 0 && (
        <div className="fixed top-20 right-6 z-50 space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                max-w-sm w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-luxury rounded-xl pointer-events-auto flex border animate-slide-in-right
                ${notification.type === 'success' ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : ''}
                ${notification.type === 'error' ? 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50' : ''}
                ${notification.type === 'warning' ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : ''}
                ${notification.type === 'info' ? 'border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50' : ''}
              `}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.type === 'success' && (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    {notification.type === 'error' && (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    {notification.type === 'warning' && (
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      </div>
                    )}
                    {notification.type === 'info' && (
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {notification.message}
                    </p>
                    {notification.action && (
                      <div className="mt-3">
                        <button
                          onClick={notification.action.onClick}
                          className="btn-ghost-modern text-xs py-1 px-3"
                        >
                          {notification.action.label}
                        </button>
                      </div>
                    )}
                    {notification.undoAction && (
                      <div className="mt-3">
                        <button
                          onClick={notification.undoAction}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="rounded-none rounded-r-xl p-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200"
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
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            </div>

            <div className="inline-block align-bottom bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl text-left overflow-hidden shadow-luxury transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-purple-200/50 dark:border-gray-700 animate-scale-in">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 px-6 pt-6 pb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mr-4">
                    <Command size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Command Palette</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Search for actions and navigate quickly</p>
                  </div>
                </div>
                
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search for actions, pages, or settings..."
                    className="w-full pl-12 pr-4 py-3 border border-purple-200 dark:border-purple-700 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 px-2 uppercase tracking-wider">
                      Quick Actions
                    </div>
                    
                    <div className="space-y-1">
                      <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center transition-all duration-200 group">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                          <Plus size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">New Article</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Create a new blog post or article</p>
                        </div>
                        <kbd className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono">⌘N</kbd>
                      </button>
                      
                      <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center transition-all duration-200 group">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                          <Settings size={16} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Site Settings</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Configure your site preferences</p>
                        </div>
                        <kbd className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono">⌘,</kbd>
                      </button>
                      
                      <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center transition-all duration-200 group">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                          <Upload size={16} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Upload Media</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Add images, videos, or documents</p>
                        </div>
                        <kbd className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono">⌘U</kbd>
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-purple-100 dark:border-gray-700 pt-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Press <kbd className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">Esc</kbd> to close
                    </div>
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