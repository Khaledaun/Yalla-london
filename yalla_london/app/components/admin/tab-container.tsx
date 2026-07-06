'use client'

import React, { useState, useCallback, Suspense, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

// ── Tab Container ─────────────────────────────────────────────────────────────
// Shared component for all consolidated admin pages.
// Uses URL query param ?tab=X for deep linking + browser back/forward.
// Tabs scroll horizontally on mobile.

interface TabConfig {
  id: string
  label: string
  /** Optional badge count (e.g. "3" for issues) */
  badge?: number
}

interface TabContainerProps {
  tabs: TabConfig[]
  defaultTab?: string
  children: (activeTab: string) => ReactNode
  /** Optional heading above tabs */
  title?: string
}

function TabContainerInner({ tabs, defaultTab, children, title }: TabContainerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tabFromUrl = searchParams.get('tab')
  const activeTab = tabFromUrl && tabs.some(t => t.id === tabFromUrl) ? tabFromUrl : (defaultTab || tabs[0]?.id || '')

  const setTab = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id === (defaultTab || tabs[0]?.id)) {
      params.delete('tab')
    } else {
      params.set('tab', id)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, router, pathname, defaultTab, tabs])

  return (
    <div>
      {title && (
        <h1 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display,'Anybody',sans-serif)", color: '#1C1917' }}>
          {title}
        </h1>
      )}

      {/* Tab bar — scrolls horizontally on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-1 px-1"
           style={{ WebkitOverflowScrolling: 'touch' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
              style={{
                fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: isActive ? '#FAF8F4' : '#78716C',
                backgroundColor: isActive ? '#C8322B' : '#FAF8F4',
                boxShadow: isActive ? '0 1px 3px rgba(28,25,23,0.08)' : '0 1px 2px rgba(28,25,23,0.04)',
                border: isActive ? 'none' : '1px solid rgba(214,208,196,0.4)',
                minHeight: 44, // WCAG 2.2 target size
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#C8322B',
                        color: isActive ? '#FAF8F4' : '#FAF8F4',
                      }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content with loading fallback */}
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-3 flex items-center justify-center animate-pulse"
                 style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.12)' }}>
              <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)", fontSize: 9, color: '#78716C' }}>...</span>
            </div>
          </div>
        </div>
      }>
        {children(activeTab)}
      </Suspense>
    </div>
  )
}

export function TabContainer(props: TabContainerProps) {
  return (
    <Suspense fallback={<div />}>
      <TabContainerInner {...props} />
    </Suspense>
  )
}

export type { TabConfig }
