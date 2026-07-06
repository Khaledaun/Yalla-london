'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, AlertTriangle, AlertCircle, Info, Clock, Search, TrendingUp, Link2, Server } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminNotification {
  id: string
  type: 'cron_failure' | 'pipeline_alert' | 'seo_alert' | 'affiliate_alert' | 'system'
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  timestamp: string
  read: boolean
  meta?: Record<string, unknown>
}

interface NotificationsResponse {
  notifications: AdminNotification[]
  unreadCount: number
  total: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function typeIcon(type: AdminNotification['type']): React.ReactNode {
  switch (type) {
    case 'cron_failure': return <Clock size={14} />
    case 'pipeline_alert': return <Server size={14} />
    case 'seo_alert': return <Search size={14} />
    case 'affiliate_alert': return <Link2 size={14} />
    case 'system': return <TrendingUp size={14} />
    default: return <Bell size={14} />
  }
}

function severityStyles(severity: AdminNotification['severity']): {
  border: string
  icon: React.ReactNode
  badge: string
} {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-l-[var(--admin-red)]',
        icon: <AlertCircle size={14} className="text-[var(--admin-red)] flex-shrink-0" />,
        badge: 'bg-[var(--admin-red)]/10 text-[var(--admin-red)]',
      }
    case 'warning':
      return {
        border: 'border-l-[var(--admin-gold)]',
        icon: <AlertTriangle size={14} className="text-[var(--admin-gold)] flex-shrink-0" />,
        badge: 'bg-[var(--admin-gold)]/10 text-[var(--admin-gold)]',
      }
    case 'info':
    default:
      return {
        border: 'border-l-[var(--admin-blue)]',
        icon: <Info size={14} className="text-[var(--admin-blue)] flex-shrink-0" />,
        badge: 'bg-[var(--admin-blue)]/10 text-[var(--admin-blue)]',
      }
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Fetch notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) return
      const data: NotificationsResponse = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // silent — bell just shows stale data
    }
  }, [])

  // Initial fetch + 60s poll
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Refetch when panel opens
  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
    }
  }, [open, fetchNotifications])

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return undefined
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // ── Actions ─────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  const dismiss = async (notificationId: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', notificationId }),
      })
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const wasDismissedUnread = notifications.find(n => n.id === notificationId && !n.read)
        return wasDismissedUnread ? prev - 1 : prev
      })
    } catch {
      // silent
    }
  }

  const markRead = async (notificationId: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId }),
      })
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  // ── Group by severity ───────────────────────────────────────────────────
  const critical = notifications.filter(n => n.severity === 'critical')
  const warnings = notifications.filter(n => n.severity === 'warning')
  const infos = notifications.filter(n => n.severity === 'info')

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg bg-zh-navy-light border border-zh-navy-border hover:border-zh-gold-dim transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        <Bell size={16} className="text-zh-cream-muted" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--admin-red)] text-white text-[10px] font-bold px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notifications panel">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-zh-navy border-l border-zh-navy-border shadow-xl flex flex-col animate-slide-in-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zh-navy-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-zh-gold" />
                <h2 className="font-zh-ui font-semibold text-sm text-zh-cream">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-[var(--admin-red)] text-white text-[10px] font-bold px-1.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="font-zh-mono text-[10px] uppercase tracking-[1px] text-zh-gold hover:text-zh-gold/80 transition-colors px-2 py-1.5 rounded-md hover:bg-zh-navy-mid"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-zh-cream-muted hover:text-zh-cream transition-colors hover:bg-zh-navy-mid"
                  aria-label="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="font-zh-mono text-[11px] text-zh-cream-muted uppercase tracking-[2px]">
                    Loading...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-12 h-12 rounded-full bg-zh-navy-mid flex items-center justify-center">
                    <Bell size={20} className="text-zh-cream-dim" />
                  </div>
                  <p className="font-zh-mono text-[11px] text-zh-cream-muted uppercase tracking-[2px]">
                    All clear
                  </p>
                  <p className="font-zh-ui text-xs text-zh-cream-dim text-center px-8">
                    No notifications right now. Systems are running normally.
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Critical section */}
                  {critical.length > 0 && (
                    <NotificationGroup
                      label="Critical"
                      notifications={critical}
                      onDismiss={dismiss}
                      onMarkRead={markRead}
                    />
                  )}

                  {/* Warnings section */}
                  {warnings.length > 0 && (
                    <NotificationGroup
                      label="Warnings"
                      notifications={warnings}
                      onDismiss={dismiss}
                      onMarkRead={markRead}
                    />
                  )}

                  {/* Info section */}
                  {infos.length > 0 && (
                    <NotificationGroup
                      label="Info"
                      notifications={infos}
                      onDismiss={dismiss}
                      onMarkRead={markRead}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="flex-shrink-0 px-4 py-3 border-t border-zh-navy-border">
                <p className="font-zh-mono text-[10px] text-zh-cream-dim uppercase tracking-[1px] text-center">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''} &middot; Auto-refreshes every 60s
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

// ─── Notification Group ─────────────────────────────────────────────────────

function NotificationGroup({
  label,
  notifications,
  onDismiss,
  onMarkRead,
}: {
  label: string
  notifications: AdminNotification[]
  onDismiss: (id: string) => void
  onMarkRead: (id: string) => void
}) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1.5">
        <span className="font-zh-mono text-[10px] uppercase tracking-[1.5px] text-zh-cream-muted font-semibold">
          {label} ({notifications.length})
        </span>
      </div>
      <div className="space-y-px px-2">
        {notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onDismiss={onDismiss}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Single Notification Item ───────────────────────────────────────────────

interface NotificationItemProps {
  notification: AdminNotification
  onDismiss: (id: string) => void
  onMarkRead: (id: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onMarkRead,
}) => {
  const styles = severityStyles(notification.severity)

  return (
    <div
      className={`
        group relative flex gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-colors cursor-pointer
        ${styles.border}
        ${notification.read
          ? 'bg-transparent hover:bg-zh-navy-mid/50'
          : 'bg-zh-navy-mid/30 hover:bg-zh-navy-mid/60'
        }
      `}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !notification.read) {
          e.preventDefault()
          onMarkRead(notification.id)
        }
      }}
    >
      {/* Unread dot */}
      {!notification.read && (
        <div className="absolute top-3 left-1 w-1.5 h-1.5 rounded-full bg-[var(--admin-red)]" />
      )}

      {/* Type icon */}
      <div className={`
        w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
        ${notification.read ? 'bg-zh-navy-mid text-zh-cream-dim' : 'bg-zh-navy-light text-zh-cream-muted'}
      `}>
        {typeIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {styles.icon}
            <span className={`font-zh-ui text-xs truncate ${notification.read ? 'text-zh-cream-muted' : 'text-zh-cream font-semibold'}`}>
              {notification.title}
            </span>
          </div>
          <span className="font-zh-mono text-[9px] text-zh-cream-dim flex-shrink-0 mt-0.5">
            {relativeTime(notification.timestamp)}
          </span>
        </div>
        <p className={`font-zh-ui text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${notification.read ? 'text-zh-cream-dim' : 'text-zh-cream-muted'}`}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-zh-mono uppercase tracking-wider ${styles.badge}`}>
            {notification.severity}
          </span>
          <span className="font-zh-mono text-[9px] text-zh-cream-dim uppercase tracking-wider">
            {notification.type.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(notification.id)
        }}
        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded-md text-zh-cream-dim hover:text-zh-cream hover:bg-zh-navy-light transition-all"
        aria-label={`Dismiss: ${notification.title}`}
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  )
}
