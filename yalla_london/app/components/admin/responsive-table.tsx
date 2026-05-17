'use client'

import React, { ReactNode } from 'react'

// ── Responsive Table ──────────────────────────────────────────────────────────
// On desktop (>=768px): renders a standard table.
// On mobile (<768px): renders each row as a card with label/value pairs.
// Tap a card to trigger onRowClick if provided.

interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** Hide this column on mobile cards (still visible in desktop table) */
  hideOnMobile?: boolean
  /** Alignment for desktop table */
  align?: 'left' | 'center' | 'right'
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  /** Show when data is empty */
  emptyMessage?: string
  /** Loading skeleton rows count */
  loading?: boolean
  loadingRows?: number
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data found.',
  loading = false,
  loadingRows = 5,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse"
               style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.12)' }}>
            <div className="h-4 rounded w-3/4 mb-2" style={{ backgroundColor: 'rgba(120,113,108,0.15)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'rgba(120,113,108,0.1)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl"
           style={{ backgroundColor: 'rgba(200,50,43,0.04)', border: '1px solid rgba(200,50,43,0.12)' }}>
        <p style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)", fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl"
           style={{ backgroundColor: '#FAF8F4', boxShadow: '0 1px 3px rgba(28,25,23,0.06)', border: '1px solid rgba(214,208,196,0.4)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(120,113,108,0.12)' }}>
              {columns.map((col) => (
                <th key={col.key}
                    className={`px-4 py-3 text-${col.align || 'left'}`}
                    style={{
                      fontFamily: "var(--font-system,'IBM Plex Mono',monospace)",
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                      color: '#78716C',
                    }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer transition-all hover:bg-black/[0.02]' : ''}
                  style={{ borderBottom: '1px solid rgba(120,113,108,0.08)' }}>
                {columns.map((col) => (
                  <td key={col.key}
                      className={`px-4 py-3 text-${col.align || 'left'}`}
                      style={{ fontSize: 13, color: '#1C1917' }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {data.map((row) => (
          <div key={keyExtractor(row)}
               onClick={() => onRowClick?.(row)}
               className={`rounded-xl p-4 ${onRowClick ? 'cursor-pointer active:scale-[0.98]' : ''} transition-all`}
               style={{ backgroundColor: '#FAF8F4', boxShadow: '0 1px 2px rgba(28,25,23,0.04)', border: '1px solid rgba(214,208,196,0.4)' }}>
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col, i) => (
                <div key={col.key} className={i === 0 ? 'mb-2' : 'flex items-center justify-between py-1'}
                     style={i > 0 ? { borderTop: '1px solid rgba(120,113,108,0.08)' } : undefined}>
                  {i === 0 ? (
                    <div style={{ fontFamily: "var(--font-display,'Anybody',sans-serif)", fontWeight: 700, fontSize: 14, color: '#1C1917' }}>
                      {col.render(row)}
                    </div>
                  ) : (
                    <>
                      <span style={{ fontFamily: "var(--font-system,'IBM Plex Mono',monospace)", fontSize: 9, color: '#78716C', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {col.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#1C1917' }}>
                        {col.render(row)}
                      </span>
                    </>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  )
}

export type { Column, ResponsiveTableProps }
