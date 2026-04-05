'use client'

import React, { ReactNode } from 'react'

// ── Sticky Action Bar ───────────────────────────────────────────────────────────
// Sticks to the bottom of the viewport on mobile so the primary action
// is always reachable with one thumb tap.
// On desktop: renders inline (non-sticky).

interface StickyActionBarProps {
  children: ReactNode
  /** Additional class names */
  className?: string
}

export function StickyActionBar({ children, className = '' }: StickyActionBarProps) {
  return (
    <div
      className={`
        /* Mobile: sticky bottom bar */
        fixed bottom-0 inset-x-0 z-30 px-4 py-3
        md:static md:z-auto md:px-0 md:py-0
        ${className}
      `}
      style={{
        backgroundColor: '#FAF8F4',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        // Desktop: remove mobile shadow
      }}
    >
      {/* Safe area padding for iPhone notch */}
      <div className="flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  )
}

// ── Action Button ───────────────────────────────────────────────────────────────
// Pre-styled button for use inside StickyActionBar.

interface ActionButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export function ActionButton({
  label,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex-1 flex items-center justify-center gap-2 rounded-xl
        transition-all active:scale-[0.97] disabled:opacity-50
      `}
      style={{
        fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        minHeight: 48, // WCAG 2.2 target size
        color: isPrimary ? '#FAF8F4' : '#1C1917',
        backgroundColor: isPrimary ? '#C8322B' : '#FAF8F4',
        boxShadow: isPrimary
          ? '0 1px 3px rgba(28,25,23,0.08), 0 0 0 1px rgba(200,50,43,0.2)'
          : '0 1px 2px rgba(28,25,23,0.04)',
        border: isPrimary ? 'none' : '1px solid rgba(214,208,196,0.4)',
      }}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  )
}
