'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, X } from 'lucide-react'

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
    red: 'border-t-[3px] border-t-[#C8322B]',
    gold: 'border-t-[3px] border-t-[#C49A2A]',
    blue: 'border-t-[3px] border-t-[#3B7EA1]',
    green: 'border-t-[3px] border-t-[#2D5A3D]',
  }
  return (
    <div
      className={`
        bg-white rounded-xl p-5
        border border-[rgba(214,208,196,0.6)]
        ${elevated
          ? 'shadow-[0_2px_8px_rgba(28,25,23,0.06),0_8px_24px_rgba(28,25,23,0.06)]'
          : 'shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]'
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
            className="mt-0.5 p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700 flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="font-[var(--font-display)] font-extrabold text-xl text-stone-900 tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="font-[var(--font-system)] text-[11px] text-stone-500 mt-1 uppercase tracking-[0.8px]">
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
    <p className="font-[var(--font-system)] text-[11px] font-semibold uppercase tracking-[1.2px] text-stone-500 mb-3">
      {children}
    </p>
  )
}

// ─── AdminStatusBadge ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  published: { label: 'Published', dot: 'bg-[#2D5A3D]', bg: 'bg-[rgba(45,90,61,0.08)]', text: 'text-[#2D5A3D]' },
  draft: { label: 'Draft', dot: 'bg-[#C49A2A]', bg: 'bg-[rgba(196,154,42,0.08)]', text: 'text-[#6B4F0F]' },
  reservoir: { label: 'Ready', dot: 'bg-[#3B7EA1]', bg: 'bg-[rgba(59,126,161,0.08)]', text: 'text-[#1B5070]' },
  stuck: { label: 'Stuck', dot: 'bg-[#C8322B]', bg: 'bg-[rgba(200,50,43,0.10)]', text: 'text-[#9B2520]' },
  running: { label: 'Running', dot: 'bg-[#7C3AED]', bg: 'bg-[rgba(124,58,237,0.08)]', text: 'text-[#5B21B6]' },
  failed: { label: 'Failed', dot: 'bg-[#C8322B]', bg: 'bg-[rgba(200,50,43,0.10)]', text: 'text-[#9B2520]' },
  success: { label: 'Success', dot: 'bg-[#2D5A3D]', bg: 'bg-[rgba(45,90,61,0.08)]', text: 'text-[#2D5A3D]' },
  indexed: { label: 'Indexed', dot: 'bg-[#2D5A3D]', bg: 'bg-[rgba(45,90,61,0.08)]', text: 'text-[#2D5A3D]' },
  pending: { label: 'Pending', dot: 'bg-[#C49A2A]', bg: 'bg-[rgba(196,154,42,0.08)]', text: 'text-[#6B4F0F]' },
  active: { label: 'Active', dot: 'bg-[#2D5A3D]', bg: 'bg-[rgba(45,90,61,0.08)]', text: 'text-[#2D5A3D]' },
  inactive: { label: 'Inactive', dot: 'bg-stone-400', bg: 'bg-stone-100', text: 'text-stone-600' },
  error: { label: 'Error', dot: 'bg-[#C8322B]', bg: 'bg-[rgba(200,50,43,0.10)]', text: 'text-[#9B2520]' },
  warning: { label: 'Warning', dot: 'bg-[#C49A2A]', bg: 'bg-[rgba(196,154,42,0.08)]', text: 'text-[#6B4F0F]' },
  rejected: { label: 'Rejected', dot: 'bg-[#C8322B]', bg: 'bg-[rgba(200,50,43,0.10)]', text: 'text-[#9B2520]' },
  generating: { label: 'Generating', dot: 'bg-[#7C3AED]', bg: 'bg-[rgba(124,58,237,0.08)]', text: 'text-[#5B21B6]' },
  promoting: { label: 'Promoting', dot: 'bg-[#3B7EA1]', bg: 'bg-[rgba(59,126,161,0.08)]', text: 'text-[#1B5070]' },
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
    bg: 'bg-stone-100',
    text: 'text-stone-600',
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
  color = '#1C1917',
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
        bg-white rounded-xl p-4 text-center
        border border-[rgba(214,208,196,0.6)]
        shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]
        ${onClick ? 'cursor-pointer hover:shadow-[0_2px_8px_rgba(28,25,23,0.08),0_8px_24px_rgba(28,25,23,0.06)] active:scale-[0.98] transition-all' : ''}
      `}
    >
      <div
        className="font-[var(--font-display)] font-extrabold text-[28px] leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {trend && (
        <div className={`font-[var(--font-system)] text-[11px] font-semibold mt-1 ${trend.positive ? 'text-[#2D5A3D]' : 'text-[#C8322B]'}`}>
          {trend.positive ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
        </div>
      )}
      <div className="font-[var(--font-system)] text-[11px] font-semibold text-stone-500 uppercase tracking-[0.8px] mt-2">
        {label}
      </div>
    </div>
  )
}

// ─── AdminButton ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[#C8322B] text-[#FAF8F4] border-transparent hover:bg-[#B02D26] shadow-sm',
  secondary: 'bg-white text-stone-800 border-[rgba(214,208,196,0.8)] hover:bg-stone-50 shadow-[0_1px_3px_rgba(28,25,23,0.06)]',
  danger: 'bg-[#C8322B] text-[#FAF8F4] border-transparent hover:bg-[#B02D26] shadow-sm',
  success: 'bg-[#2D5A3D] text-[#FAF8F4] border-transparent hover:bg-[#24493A] shadow-sm',
  ghost: 'bg-transparent text-stone-600 border-transparent hover:bg-stone-100',
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
        <div className="w-8 h-8 border-2 border-stone-200 border-t-[#C8322B] rounded-full animate-spin mx-auto mb-3" />
        <p className="font-[var(--font-system)] text-[11px] text-stone-500 uppercase tracking-[1.2px]">
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
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-stone-100 border border-stone-200">
        <Icon size={24} color="#78716C" />
      </div>
      <p className="font-[var(--font-display)] font-bold text-base text-stone-700">
        {title}
      </p>
      {description && (
        <p className="font-[var(--font-system)] text-[12px] text-stone-500 mt-2 max-w-[300px] leading-relaxed">
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
    wrapper: 'bg-[rgba(200,50,43,0.06)] border-[#C8322B33] border-l-[#C8322B]',
    title: 'text-[#9B2520]',
    icon: '\uD83D\uDD34',
  },
  warning: {
    wrapper: 'bg-[rgba(196,154,42,0.06)] border-[#C49A2A33] border-l-[#C49A2A]',
    title: 'text-[#6B4F0F]',
    icon: '\uD83D\uDFE1',
  },
  info: {
    wrapper: 'bg-[rgba(59,126,161,0.06)] border-[#3B7EA133] border-l-[#3B7EA1]',
    title: 'text-[#1B5070]',
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
          <p className="font-[var(--font-system)] text-[11px] text-stone-500 mt-1 leading-relaxed">
            {detail}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1.5 -mr-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
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
              ? 'bg-[rgba(200,50,43,0.06)] text-[#C8322B] font-semibold'
              : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`
              font-[var(--font-system)] text-[10px] tabular-nums
              ${activeTab === tab.id ? 'text-[#C8322B]/60' : 'text-stone-400'}
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
