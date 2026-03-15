'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft, X } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   Admin UI — Shared Component Library
   Clean Light Design System for Yalla London Admin
   Created: 2026-03-15
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
}) {
  const accentColors = {
    red: '#C8322B',
    gold: '#C49A2A',
    blue: '#3B7EA1',
    green: '#2D5A3D',
  }
  return (
    <div
      className={`${elevated ? 'admin-card-elevated' : 'admin-card'} ${className}`}
      style={accent ? { borderTop: `3px solid ${accentColors[accentColor]}` } : undefined}
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
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700"
          >
            <ChevronLeft size={18} />
          </Link>
        )}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 22,
              color: '#1C1917',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 11,
                color: '#78716C',
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

// ─── AdminSectionLabel ──────────────────────────────────────────────

export function AdminSectionLabel({ children }: { children?: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-system)',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#78716C',
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  )
}

// ─── AdminStatusBadge ───────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  published: { label: 'Published', dot: '#2D5A3D', bg: 'rgba(45,90,61,0.08)', text: '#2D5A3D' },
  draft: { label: 'Draft', dot: '#C49A2A', bg: 'rgba(196,154,42,0.08)', text: '#7a5a10' },
  reservoir: { label: 'Ready', dot: '#3B7EA1', bg: 'rgba(59,126,161,0.08)', text: '#1e5a7a' },
  stuck: { label: 'Stuck', dot: '#C8322B', bg: 'rgba(200,50,43,0.10)', text: '#C8322B' },
  running: { label: 'Running', dot: '#7C3AED', bg: 'rgba(124,58,237,0.08)', text: '#5B21B6' },
  failed: { label: 'Failed', dot: '#C8322B', bg: 'rgba(200,50,43,0.10)', text: '#C8322B' },
  success: { label: 'Success', dot: '#2D5A3D', bg: 'rgba(45,90,61,0.08)', text: '#2D5A3D' },
  indexed: { label: 'Indexed', dot: '#2D5A3D', bg: 'rgba(45,90,61,0.08)', text: '#2D5A3D' },
  pending: { label: 'Pending', dot: '#C49A2A', bg: 'rgba(196,154,42,0.08)', text: '#7a5a10' },
  active: { label: 'Active', dot: '#2D5A3D', bg: 'rgba(45,90,61,0.08)', text: '#2D5A3D' },
  inactive: { label: 'Inactive', dot: '#78716C', bg: 'rgba(120,113,108,0.08)', text: '#78716C' },
  error: { label: 'Error', dot: '#C8322B', bg: 'rgba(200,50,43,0.10)', text: '#C8322B' },
  warning: { label: 'Warning', dot: '#C49A2A', bg: 'rgba(196,154,42,0.08)', text: '#7a5a10' },
  rejected: { label: 'Rejected', dot: '#C8322B', bg: 'rgba(200,50,43,0.10)', text: '#C8322B' },
  generating: { label: 'Generating', dot: '#7C3AED', bg: 'rgba(124,58,237,0.08)', text: '#5B21B6' },
  promoting: { label: 'Promoting', dot: '#3B7EA1', bg: 'rgba(59,126,161,0.08)', text: '#1e5a7a' },
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
    dot: '#78716C',
    bg: 'rgba(120,113,108,0.08)',
    text: '#44403C',
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: s.bg,
        fontFamily: 'var(--font-system)',
        fontSize: 10,
        fontWeight: 600,
        color: s.text,
        letterSpacing: '0.5px',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: s.dot }}
      />
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
      className={`admin-card text-center ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 28,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {trend && (
        <div
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 9,
            color: trend.positive ? '#2D5A3D' : '#C8322B',
            marginTop: 2,
          }}
        >
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
      <div
        style={{
          fontFamily: 'var(--font-system)',
          fontSize: 9,
          fontWeight: 600,
          color: '#A8A29E',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ─── AdminButton ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

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
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { backgroundColor: '#C8322B', color: '#FAF8F4', border: 'none' },
    secondary: {
      backgroundColor: '#FFFFFF',
      color: '#1C1917',
      border: '1px solid rgba(214,208,196,0.8)',
    },
    danger: { backgroundColor: '#C8322B', color: '#FAF8F4', border: 'none' },
    success: { backgroundColor: '#2D5A3D', color: '#FAF8F4', border: 'none' },
    ghost: {
      backgroundColor: 'transparent',
      color: '#5C564F',
      border: '1px solid transparent',
    },
  }
  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: 10 },
    md: { padding: '8px 16px', fontSize: 11 },
    lg: { padding: '12px 20px', fontSize: 12 },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${className}`}
      style={{
        fontFamily: 'var(--font-system)',
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        boxShadow:
          variant === 'secondary' ? '0 1px 3px rgba(28,25,23,0.06)' : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
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

export function AdminLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-[#C8322B] rounded-full animate-spin mx-auto mb-3" />
        <p
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 11,
            color: '#78716C',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
          }}
        >
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
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          backgroundColor: '#FAF8F4',
          border: '1px solid rgba(214,208,196,0.6)',
        }}
      >
        <Icon size={22} color="#A8A29E" />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: '#44403C',
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 11,
            color: '#78716C',
            marginTop: 6,
            maxWidth: 280,
          }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── AdminAlertBanner ───────────────────────────────────────────────

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
  const config = {
    critical: {
      bg: 'rgba(200,50,43,0.06)',
      border: '#C8322B',
      text: '#C8322B',
      icon: '🔴',
    },
    warning: {
      bg: 'rgba(196,154,42,0.06)',
      border: '#C49A2A',
      text: '#7a5a10',
      icon: '🟡',
    },
    info: {
      bg: 'rgba(59,126,161,0.06)',
      border: '#3B7EA1',
      text: '#1e5a7a',
      icon: 'ℹ️',
    },
  }
  const c = config[severity]
  return (
    <div
      className="rounded-xl px-4 py-3 mb-4 flex items-start gap-3"
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}33`,
        borderLeft: `3px solid ${c.border}`,
      }}
    >
      <span className="text-base mt-0.5">{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 12,
            fontWeight: 600,
            color: c.text,
          }}
        >
          {message}
        </p>
        {detail && (
          <p
            style={{
              fontFamily: 'var(--font-system)',
              fontSize: 11,
              color: '#78716C',
              marginTop: 2,
            }}
          >
            {detail}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-stone-400 hover:text-stone-600 transition-colors flex-shrink-0"
        >
          <X size={14} />
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
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`admin-filter-pill ${activeTab === tab.id ? 'active' : ''}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 9,
                opacity: 0.7,
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
