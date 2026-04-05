'use client'

import React, { ReactNode } from 'react'

// ── Status Summary ──────────────────────────────────────────────────────────────
// "Now / Next / Attention" triptych for the top of operational pages.
// ADHD-friendly: at-a-glance status, one-sentence context, plain English.
// Renders as 3 stacked cards on mobile, side-by-side on desktop.

interface StatusCard {
  /** e.g. "NOW", "NEXT", "ATTENTION" */
  heading: string
  /** Plain-English one-liner, e.g. "3 articles publishing today" */
  summary: string
  /** Optional metric number to highlight */
  metric?: number | string
  /** Optional detail below metric */
  detail?: string
  /** Color accent — maps to the card's left border */
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'neutral'
  /** Optional icon */
  icon?: ReactNode
  /** Optional action */
  action?: { label: string; onClick: () => void }
}

interface StatusSummaryProps {
  cards: StatusCard[]
  /** Show loading skeleton */
  loading?: boolean
}

const accentColors: Record<string, string> = {
  green: '#16A34A',
  blue: '#2563EB',
  amber: '#D97706',
  red: '#C8322B',
  neutral: '#78716C',
}

export function StatusSummary({ cards, loading = false }: StatusSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse"
               style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.12)' }}>
            <div className="h-3 rounded w-16 mb-3" style={{ backgroundColor: 'rgba(120,113,108,0.15)' }} />
            <div className="h-6 rounded w-12 mb-2" style={{ backgroundColor: 'rgba(120,113,108,0.12)' }} />
            <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'rgba(120,113,108,0.1)' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {cards.map((card) => {
        const borderColor = accentColors[card.accent || 'neutral']
        return (
          <div
            key={card.heading}
            className="rounded-xl p-4 transition-all"
            style={{
              backgroundColor: '#FAF8F4',
              boxShadow: '0 1px 2px rgba(28,25,23,0.04)',
              border: '1px solid rgba(214,208,196,0.4)',
              borderLeft: `3px solid ${borderColor}`,
            }}
          >
            {/* Heading label */}
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span style={{
                fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                color: borderColor,
              }}>
                {card.heading}
              </span>
            </div>

            {/* Metric */}
            {card.metric !== undefined && (
              <div style={{
                fontFamily: "var(--font-display,'Anybody',sans-serif)",
                fontSize: 28,
                fontWeight: 800,
                color: '#1C1917',
                lineHeight: 1.1,
              }}>
                {card.metric}
              </div>
            )}

            {/* Detail */}
            {card.detail && (
              <p style={{
                fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
                fontSize: 10,
                color: '#78716C',
                marginTop: 2,
              }}>
                {card.detail}
              </p>
            )}

            {/* Summary */}
            <p style={{
              fontSize: 13,
              color: '#44403C',
              marginTop: 6,
              lineHeight: 1.4,
            }}>
              {card.summary}
            </p>

            {/* Action */}
            {card.action && (
              <button
                onClick={card.action.onClick}
                className="mt-3 px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
                style={{
                  fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: borderColor,
                  backgroundColor: 'transparent',
                  border: `1px solid ${borderColor}`,
                  minHeight: 36,
                }}
              >
                {card.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export type { StatusCard, StatusSummaryProps }
