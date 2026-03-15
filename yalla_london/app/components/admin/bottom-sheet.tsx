'use client'

import React, { ReactNode, useEffect, useCallback, useRef } from 'react'

// ── Bottom Sheet ────────────────────────────────────────────────────────────────
// Mobile-first drawer that slides up from the bottom.
// On desktop (>=768px): renders as a modal overlay.
// Trap focus inside the sheet when open.

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Max height on mobile (default: 85vh) */
  maxHeight?: string
}

export function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Sheet'}
        className="fixed z-50 transition-transform duration-300 ease-out
                   /* Mobile: bottom sheet */
                   inset-x-0 bottom-0 md:inset-auto
                   /* Desktop: centered modal */
                   md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                   md:w-full md:max-w-lg md:rounded-xl
                   rounded-t-2xl overflow-hidden"
        style={{
          maxHeight,
          backgroundColor: '#FAF8F4',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(120,113,108,0.3)' }} />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3"
               style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
            <h2 style={{
              fontFamily: "var(--font-display,'Anybody',sans-serif)",
              fontWeight: 700,
              fontSize: 15,
              color: '#1C1917',
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: '#78716C' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </div>
    </>
  )
}
