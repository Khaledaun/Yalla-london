'use client'

import React, { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PremiumAdminNav } from './premium-admin-nav'
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
import styles from './premium-admin-layout.module.css'

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
    <div className={`${styles.adminContainer} ${premiumEnabled ? '' : styles.darkMode}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className={styles.mobileBackdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${styles.sidebarContainer} 
        ${sidebarOpen ? styles.open : ''} 
        ${premiumEnabled ? '' : styles.darkMode}
      `}>
        <div className={styles.sidebarHeader}>
          <h1 className={`${styles.sidebarTitle} ${premiumEnabled ? '' : styles.darkMode}`}>
            {siteContext?.siteName || 'Yalla London'} Admin
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className={styles.closeSidebarButton}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className={styles.sidebarNav}>
          <PremiumAdminNav 
            siteContext={siteContext}
            onSiteSwitch={(siteId) => {
              // TODO: Implement site switching
              console.log('Switch to site:', siteId)
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className={styles.mainContainer}>
        {/* Top bar */}
        <header className={`${styles.topHeader} ${premiumEnabled ? '' : styles.darkMode}`}>
          <div className={styles.topHeaderLeft}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={styles.menuButton}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
                    {crumb.href ? (
                      <a 
                        href={crumb.href}
                        className={styles.breadcrumbItem}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className={`${styles.breadcrumbItem} ${styles.current} ${premiumEnabled ? '' : styles.darkMode}`}>
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            )}

            {title && !breadcrumbs && (
              <h1 className={`${styles.pageTitle} ${premiumEnabled ? '' : styles.darkMode}`}>
                {title}
              </h1>
            )}
          </div>

          <div className={styles.topHeaderRight}>
            {/* Command palette trigger */}
            {keyboardShortcuts && (
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className={`${styles.commandButton} ${premiumEnabled ? '' : styles.darkMode}`}
              >
                <Search size={16} />
                <span>Search</span>
                <kbd className={`${styles.commandKbd} ${premiumEnabled ? '' : styles.darkMode}`}>⌘K</kbd>
              </button>
            )}

            {/* Undo button */}
            {instantUndo && (
              <button
                onClick={handleUndo}
                className={styles.iconButton}
                title="Undo last action (⌘Z)"
              >
                <Undo2 size={18} />
              </button>
            )}

            {/* Notifications */}
            <button className={styles.iconButton}>
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className={styles.notificationBadge}>
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
            <div className={styles.userMenu}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`${styles.userMenuButton} ${premiumEnabled ? '' : styles.darkMode}`}
              >
                <User size={18} />
                <ChevronDown size={14} />
              </button>

              {userMenuOpen && (
                <div className={`${styles.userMenuDropdown} ${premiumEnabled ? '' : styles.darkMode}`}>
                  <div className={`${styles.userMenuHeader} ${premiumEnabled ? '' : styles.darkMode}`}>
                    <p className={`${styles.userMenuName} ${premiumEnabled ? '' : styles.darkMode}`}>
                      {session?.user?.name || 'User'}
                    </p>
                    <p className={`${styles.userMenuEmail} ${premiumEnabled ? '' : styles.darkMode}`}>
                      {session?.user?.email}
                    </p>
                  </div>
                  
                  <a
                    href="/admin/profile"
                    className={`${styles.userMenuItem} ${premiumEnabled ? '' : styles.darkMode}`}
                  >
                    <User size={16} className={styles.userMenuItemIcon} />
                    Profile
                  </a>
                  
                  <a
                    href="/admin/settings"
                    className={`${styles.userMenuItem} ${premiumEnabled ? '' : styles.darkMode}`}
                  >
                    <Settings size={16} className={styles.userMenuItemIcon} />
                    Settings
                  </a>
                  
                  <a
                    href="/admin/help"
                    className={`${styles.userMenuItem} ${premiumEnabled ? '' : styles.darkMode}`}
                  >
                    <HelpCircle size={16} className={styles.userMenuItemIcon} />
                    Help
                  </a>
                  
                  <button
                    onClick={handleSignOut}
                    className={`${styles.userMenuItem} ${premiumEnabled ? '' : styles.darkMode}`}
                  >
                    <LogOut size={16} className={styles.userMenuItemIcon} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      {optimisticUpdates && notifications.length > 0 && (
        <div className={styles.toastContainer}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                ${styles.toast} 
                ${styles[notification.type]} 
                ${premiumEnabled ? '' : styles.darkMode}
              `}
            >
              <div className={styles.toastContent}>
                <div className={styles.toastHeader}>
                  <div className={styles.toastIcon}>
                    {notification.type === 'success' && <CheckCircle2 className="h-6 w-6 text-green-400" />}
                    {notification.type === 'error' && <AlertCircle className="h-6 w-6 text-red-400" />}
                    {notification.type === 'warning' && <AlertCircle className="h-6 w-6 text-yellow-400" />}
                    {notification.type === 'info' && <AlertCircle className="h-6 w-6 text-blue-400" />}
                  </div>
                  <div className={styles.toastText}>
                    <p className={`${styles.toastTitle} ${premiumEnabled ? '' : styles.darkMode}`}>
                      {notification.title}
                    </p>
                    <p className={`${styles.toastMessage} ${premiumEnabled ? '' : styles.darkMode}`}>
                      {notification.message}
                    </p>
                    {notification.action && (
                      <div className={styles.toastActions}>
                        <button
                          onClick={notification.action.onClick}
                          className={`${styles.toastButton} ${premiumEnabled ? '' : styles.darkMode}`}
                        >
                          {notification.action.label}
                        </button>
                      </div>
                    )}
                    {notification.undoAction && (
                      <div className={styles.toastActions}>
                        <button
                          onClick={notification.undoAction}
                          className={`${styles.toastButton} ${styles.primary} ${premiumEnabled ? '' : styles.darkMode}`}
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={`${styles.toastClose} ${premiumEnabled ? '' : styles.darkMode}`}>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className={`${styles.toastCloseButton} ${premiumEnabled ? '' : styles.darkMode}`}
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
        <div className={styles.commandPalette}>
          <div className={styles.commandPaletteBackdrop}>
            <div className={`${styles.commandPaletteContent} ${premiumEnabled ? '' : styles.darkMode}`}>
              <div className={`${styles.commandPaletteHeader} ${premiumEnabled ? '' : styles.darkMode}`}>
                <div className={styles.commandPaletteInputContainer}>
                  <Command size={20} className={styles.commandPaletteInputIcon} />
                  <input
                    type="text"
                    placeholder="Search for actions..."
                    className={`${styles.commandPaletteInput} ${premiumEnabled ? '' : styles.darkMode}`}
                    autoFocus
                  />
                </div>
                
                <div className={styles.commandPaletteResults}>
                  <div className={`${styles.commandPaletteSectionTitle} ${premiumEnabled ? '' : styles.darkMode}`}>
                    QUICK ACTIONS
                  </div>
                  
                  <div className={styles.commandPaletteItems}>
                    <button className={`${styles.commandPaletteItem} ${premiumEnabled ? '' : styles.darkMode}`}>
                      <Plus size={16} className={styles.commandPaletteItemIcon} />
                      <span className={`${styles.commandPaletteItemText} ${premiumEnabled ? '' : styles.darkMode}`}>New Article</span>
                    </button>
                    
                    <button className={`${styles.commandPaletteItem} ${premiumEnabled ? '' : styles.darkMode}`}>
                      <Settings size={16} className={styles.commandPaletteItemIcon} />
                      <span className={`${styles.commandPaletteItemText} ${premiumEnabled ? '' : styles.darkMode}`}>Site Settings</span>
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