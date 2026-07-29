'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   Admin UI — Shared Component Library
   Clean Light Design System for Yalla London Admin

   Design Principles:
   - Tailwind-first (no inline styles except dynamic values)
   - 4px spacing rhythm (gap-1=4, gap-2=8, gap-3=12, gap-4=16)
   - 44px minimum touch targets on mobile
   - WCAG AA contrast (4.5:1 minimum for text)
   - Typography scale: 11/12/13/14/16/20/28px
   ═══════════════════════════════════════════════════════════════════ */

// ─── AdminCard ──────────────────────────────────────────────────────

export function AdminCard({
  children,
  className = '',
  elevated = false,
  accent = false,
  accentColor = 'red' as 'red' | 'gold' | 'blue' | 'green',
}: {
  children?: React.ReactNode
  className?: string
  elevated?: boolean
  accent?: boolean
  accentColor?: 'red' | 'gold' | 'blue' | 'green'
  [key: string]: unknown
}) {
  const accentBorders: Record<string, string> = {
    red: 'border-t-[3px] border-t-[var(--admin-red)]',
    gold: 'border-t-[3px] border-t-[var(--admin-gold)]',
    blue: 'border-t-[3px] border-t-[var(--admin-blue)]',
    green: 'border-t-[3px] border-t-[var(--admin-green)]',
  }
  return (
    <div
      className={`
        bg-[var(--admin-card-bg,#FFFFFF)] rounded-xl p-5
        border border-[var(--admin-border)]
        ${elevated
          ? 'shadow-[var(--admin-shadow-lg)]'
          : 'shadow-[var(--admin-shadow-sm)]'
        }
        ${accent ? accentBorders[accentColor] : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ─── AdminPageHeader ────────────────────────────────────────────────

export function AdminPageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  backHref?: string
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mt-0.5 p-2 -ml-2 rounded-lg hover:bg-[var(--admin-bg)] transition-colors text-stone-400 hover:text-[var(--admin-text)] flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="font-[var(--font-display)] font-extrabold text-xl text-[var(--admin-text)] tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] mt-1 uppercase tracking-[0.8px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── AdminSectionLabel ──────────────────────────────────────────────

export function AdminSectionLabel({ children }: { children?: React.ReactNode }) {
  return (
    <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--admin-text-muted)] mb-3">
      {children}
    </p>
  )
}

// ─── AdminStatusBadge ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  published: { label: 'Published', dot: 'bg-[var(--admin-green)]', bg: 'bg-[var(--status-green-bg)]', text: 'text-[var(--admin-green)]' },
  draft: { label: 'Draft', dot: 'bg-[var(--admin-gold)]', bg: 'bg-[var(--status-gold-bg)]', text: 'text-[var(--status-gold-text)]' },
  reservoir: { label: 'Ready', dot: 'bg-[var(--admin-blue)]', bg: 'bg-[var(--status-blue-bg)]', text: 'text-[var(--status-blue-text)]' },
  stuck: { label: 'Stuck', dot: 'bg-[var(--admin-red)]', bg: 'bg-[var(--status-red-bg)]', text: 'text-[var(--status-red-text)]' },
  running: { label: 'Running', dot: 'bg-[var(--status-purple)]', bg: 'bg-[var(--status-purple-bg)]', text: 'text-[var(--status-purple-text)]' },
  failed: { label: 'Failed', dot: 'bg-[var(--admin-red)]', bg: 'bg-[var(--status-red-bg)]', text: 'text-[var(--status-red-text)]' },
  success: { label: 'Success', dot: 'bg-[var(--admin-green)]', bg: 'bg-[var(--status-green-bg)]', text: 'text-[var(--admin-green)]' },
  indexed: { label: 'Indexed', dot: 'bg-[var(--admin-green)]', bg: 'bg-[var(--status-green-bg)]', text: 'text-[var(--admin-green)]' },
  pending: { label: 'Pending', dot: 'bg-[var(--admin-gold)]', bg: 'bg-[var(--status-gold-bg)]', text: 'text-[var(--status-gold-text)]' },
  active: { label: 'Active', dot: 'bg-[var(--admin-green)]', bg: 'bg-[var(--status-green-bg)]', text: 'text-[var(--admin-green)]' },
  inactive: { label: 'Inactive', dot: 'bg-stone-400', bg: 'bg-[var(--admin-bg)]', text: 'text-[var(--admin-text-muted)]' },
  error: { label: 'Error', dot: 'bg-[var(--admin-red)]', bg: 'bg-[var(--status-red-bg)]', text: 'text-[var(--status-red-text)]' },
  warning: { label: 'Warning', dot: 'bg-[var(--admin-gold)]', bg: 'bg-[var(--status-gold-bg)]', text: 'text-[var(--status-gold-text)]' },
  rejected: { label: 'Rejected', dot: 'bg-[var(--admin-red)]', bg: 'bg-[var(--status-red-bg)]', text: 'text-[var(--status-red-text)]' },
  generating: { label: 'Generating', dot: 'bg-[var(--status-purple)]', bg: 'bg-[var(--status-purple-bg)]', text: 'text-[var(--status-purple-text)]' },
  promoting: { label: 'Promoting', dot: 'bg-[var(--admin-blue)]', bg: 'bg-[var(--status-blue-bg)]', text: 'text-[var(--status-blue-text)]' },
}

export function AdminStatusBadge({
  status,
  label: overrideLabel,
}: {
  status: string
  label?: string
}) {
  const s = STATUS_CONFIG[status] ?? {
    label: status,
    dot: 'bg-stone-400',
    bg: 'bg-[var(--admin-bg)]',
    text: 'text-[var(--admin-text-muted)]',
  }
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        font-[var(--font-system)] text-[11px] font-semibold tracking-[0.3px]
        ${s.bg} ${s.text}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {overrideLabel ?? s.label}
    </span>
  )
}

// ─── AdminKPICard ───────────────────────────────────────────────────

export function AdminKPICard({
  value,
  label,
  color = 'var(--admin-text-primary, #1C1917)',
  trend,
  onClick,
}: {
  value: string | number
  label: string
  color?: string
  trend?: { value: number; positive?: boolean }
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--admin-card-bg,#FFFFFF)] rounded-xl p-4 text-center
        border border-[var(--admin-border)]
        shadow-[var(--admin-shadow-sm)]
        ${onClick ? 'cursor-pointer hover:shadow-[var(--admin-shadow-lg)] active:scale-[0.98] transition-all' : ''}
      `}
    >
      <div
        className="font-[var(--font-display)] font-extrabold text-[28px] leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {trend && (
        <div className={`font-[var(--font-system)] text-[11px] font-semibold mt-1 ${trend.positive ? 'text-[var(--admin-green)]' : 'text-[var(--admin-red)]'}`}>
          {trend.positive ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
        </div>
      )}
      <div className="font-[var(--font-system)] text-[11px] font-semibold text-[var(--admin-text-muted)] uppercase tracking-[0.8px] mt-2">
        {label}
      </div>
    </div>
  )
}

// ─── AdminButton ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--admin-red)] text-[var(--admin-bg)] border-transparent hover:bg-[var(--admin-red-hover)] shadow-sm',
  secondary: 'bg-[var(--admin-card-bg)] text-[var(--admin-text)] border-[var(--admin-border-hover)] hover:bg-[var(--admin-bg)] shadow-[var(--admin-shadow-sm)]',
  danger: 'bg-[var(--admin-red)] text-[var(--admin-bg)] border-transparent hover:bg-[var(--admin-red-hover)] shadow-sm',
  success: 'bg-[var(--admin-green)] text-[var(--admin-bg)] border-transparent hover:bg-[var(--admin-green-hover)] shadow-sm',
  ghost: 'bg-transparent text-[var(--admin-text-muted)] border-transparent hover:bg-[var(--admin-bg)]',
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[11px] min-h-[36px]',
  md: 'px-4 py-2 text-[11px] min-h-[40px]',
  lg: 'px-5 py-2.5 text-xs min-h-[44px]',
}

export function AdminButton({
  children,
  onClick,
  variant = 'secondary',
  loading,
  disabled,
  size = 'md',
  className = '',
  type = 'button',
}: {
  children?: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-1.5
        rounded-lg border font-[var(--font-system)] font-semibold
        uppercase tracking-[0.5px]
        transition-all active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}

// ─── AdminLoadingState ──────────────────────────────────────────────

export function AdminLoadingState({ label = 'Loading\u2026' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--admin-border)] border-t-[var(--admin-red)] rounded-full animate-spin mx-auto mb-3" />
        <p className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] uppercase tracking-[1.2px]">
          {label}
        </p>
      </div>
    </div>
  )
}

// ─── AdminEmptyState ────────────────────────────────────────────────

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ size?: number | string; color?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-[var(--admin-bg)] border border-[var(--admin-border)]">
        <Icon size={24} color="var(--admin-text-muted, #78716C)" />
      </div>
      <p className="font-[var(--font-display)] font-bold text-base text-[var(--admin-text)]">
        {title}
      </p>
      {description && (
        <p className="font-[var(--font-system)] text-[12px] text-[var(--admin-text-muted)] mt-2 max-w-[300px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── AdminAlertBanner ───────────────────────────────────────────────

const ALERT_CONFIG = {
  critical: {
    wrapper: 'bg-[var(--status-red-bg)] border-[var(--admin-red)]/20 border-l-[var(--admin-red)]',
    title: 'text-[var(--status-red-text)]',
    icon: '\uD83D\uDD34',
  },
  warning: {
    wrapper: 'bg-[var(--status-gold-bg)] border-[var(--admin-gold)]/20 border-l-[var(--admin-gold)]',
    title: 'text-[var(--status-gold-text)]',
    icon: '\uD83D\uDFE1',
  },
  info: {
    wrapper: 'bg-[var(--status-blue-bg)] border-[var(--admin-blue)]/20 border-l-[var(--admin-blue)]',
    title: 'text-[var(--status-blue-text)]',
    icon: '\u2139\uFE0F',
  },
}

export function AdminAlertBanner({
  severity,
  message,
  detail,
  onDismiss,
  action,
}: {
  severity: 'critical' | 'warning' | 'info'
  message: string
  detail?: string
  onDismiss?: () => void
  action?: React.ReactNode
}) {
  const c = ALERT_CONFIG[severity]
  return (
    <div className={`rounded-xl px-4 py-3 mb-4 flex items-start gap-3 border border-l-[3px] ${c.wrapper}`}>
      <span className="text-base mt-0.5 flex-shrink-0">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-[var(--font-system)] text-[12px] font-semibold ${c.title}`}>
          {message}
        </p>
        {detail && (
          <p className="font-[var(--font-system)] text-[11px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">
            {detail}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1.5 -mr-1 rounded-lg text-stone-400 hover:text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg)] transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

// ─── AdminTabs ──────────────────────────────────────────────────────

export function AdminTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  activeTab: string
  onTabChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            inline-flex items-center gap-1.5
            px-3.5 py-2 rounded-full
            font-[var(--font-system)] text-[11px] font-medium
            whitespace-nowrap transition-all min-h-[36px]
            ${activeTab === tab.id
              ? 'bg-[var(--status-red-bg)] text-[var(--admin-red)] font-semibold'
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg)]'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`
              font-[var(--font-system)] text-[10px] tabular-nums
              ${activeTab === tab.id ? 'text-[var(--admin-red)]/60' : 'text-stone-400'}
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ConfirmModal — Accessible replacement for window.confirm()
   ═════════════════════════════════════════════════════════════════ */

export function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  details?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  [key: string]: unknown
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (open && confirmRef.current) confirmRef.current.focus()
  }, [open])

  React.useEffect(() => {
    if (!open) return () => {}
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const colors = variant === 'danger'
    ? { icon: '#dc2626', bg: 'rgba(220,38,38,0.06)', btn: '#dc2626', btnHover: '#b91c1c' }
    : { icon: '#d97706', bg: 'rgba(217,119,6,0.06)', btn: '#d97706', btnHover: '#b45309' }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-[var(--admin-card-bg,#FFFFFF)] rounded-xl shadow-xl border border-[var(--admin-border)] max-w-md w-full p-6 font-[var(--font-system)]">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: colors.bg }}>
            <AlertTriangle size={18} color={colors.icon} />
          </div>
          <div>
            <h3 id="confirm-title" className="text-[15px] font-semibold text-[var(--admin-text)]">{title}</h3>
            <p id="confirm-desc" className="text-[13px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        {details && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[12px] text-[var(--admin-text-muted)] leading-relaxed max-h-32 overflow-y-auto">
            {details}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--admin-text-muted)] bg-[var(--admin-bg)] hover:bg-[var(--admin-border)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: colors.btn }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.btnHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.btn)}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   useConfirm — Promise-based hook replacing window.confirm()
   Usage:
     const { confirm, ConfirmDialog } = useConfirm()
     // in handler: const ok = await confirm({ title, message })
     // in JSX:     <ConfirmDialog />
   ═════════════════════════════════════════════════════════════════ */

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean
    title: string
    message: string
    details?: string
    confirmLabel?: string
    variant?: 'danger' | 'warning'
    resolve: ((v: boolean) => void) | null
  }>({ open: false, title: '', message: '', resolve: null })

  const confirm = React.useCallback(
    (opts: { title: string; message: string; details?: string; confirmLabel?: string; variant?: 'danger' | 'warning' }) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve })
      }),
    []
  )

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }, [state.resolve])

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }, [state.resolve])

  const ConfirmDialog = React.useCallback(
    () => (
      <ConfirmModal
        open={state.open}
        title={state.title}
        message={state.message}
        details={state.details}
        confirmLabel={state.confirmLabel || 'Confirm'}
        variant={state.variant || 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [state.open, state.title, state.message, state.details, state.confirmLabel, state.variant, handleConfirm, handleCancel]
  )

  return { confirm, ConfirmDialog }
}

/* ═══════════════════════════════════════════════════════════════════
   AdminToast — Auto-dismissing notification
   ═════════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}
const TOAST_COLORS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
}

export function AdminToast({
  message,
  type = 'info',
  duration = 4000,
  onDismiss,
}: {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onDismiss: () => void
  [key: string]: unknown
}) {
  React.useEffect(() => {
    if (duration <= 0) return () => {}
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  const Icon = TOAST_ICONS[type]
  const c = TOAST_COLORS[type]

  return (
    <div
      className="fixed top-4 right-4 z-[9998] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border font-[var(--font-system)] text-[13px] max-w-sm"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
      role="alert"
    >
      <Icon size={16} color={c.icon} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 p-0.5 rounded hover:bg-black/5">
        <X size={14} />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   AdminSkeletonLoader — Shimmer placeholder for loading states
   ═════════════════════════════════════════════════════════════════ */

export function AdminSkeletonLoader({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
  [key: string]: unknown
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-[var(--admin-border)] animate-pulse"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   AdminProgressBar — Determinate or indeterminate progress
   ═════════════════════════════════════════════════════════════════ */

export function AdminProgressBar({
  value,
  max = 100,
  label,
  color = 'var(--admin-red)',
  size = 'sm',
}: {
  value?: number
  max?: number
  label?: string
  color?: string
  size?: 'sm' | 'md'
  [key: string]: unknown
}) {
  const pct = value !== undefined ? Math.min(100, (value / max) * 100) : undefined
  const h = size === 'md' ? 'h-2.5' : 'h-1.5'

  return (
    <div className="font-[var(--font-system)]">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-[var(--admin-text-muted)]">{label}</span>
          {pct !== undefined && <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full ${h} rounded-full bg-[var(--admin-border)] overflow-hidden`}>
        {pct !== undefined ? (
          <div
            className={`${h} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%`, background: color }}
          />
        ) : (
          <div
            className={`${h} rounded-full w-1/3`}
            style={{ background: color, animation: 'indeterminate 1.5s ease-in-out infinite' }}
          />
        )}
      </div>
    </div>
  )
}
