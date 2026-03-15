'use client'

import { useState, useRef, useEffect } from 'react'
import { useSite } from '@/components/site-provider'
import { ChevronDown, Globe, Check, Plus, Settings, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface SiteSelectorProps {
  compact?: boolean
}

export function SiteSelector({ compact = false }: SiteSelectorProps) {
  const { currentSite, sites, setCurrentSite, isLoading } = useSite()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        {!compact && <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded" />}
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all
          ${isOpen
            ? 'bg-gray-100 dark:bg-slate-700'
            : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'
          }
          border border-gray-200 dark:border-slate-700
        `}
      >
        {/* Site Color Indicator */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ backgroundColor: currentSite.primary_color || '#1C1917' }}
        >
          {currentSite.name.charAt(0)}
        </div>

        {!compact && (
          <>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                {currentSite.name}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[120px]">
                {currentSite.domain || currentSite.slug}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-50">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500">
                <Globe size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Switch Site</span>
              </div>
              <span className="text-xs text-gray-400">{sites.length} sites</span>
            </div>
          </div>

          {/* Sites List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => {
                  setCurrentSite(site)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${currentSite.id === site.id
                    ? 'bg-primary/5 dark:bg-primary/10'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                  }
                `}
              >
                {/* Site Color */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                  style={{ backgroundColor: site.primary_color || '#1C1917' }}
                >
                  {site.name.charAt(0)}
                </div>

                {/* Site Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {site.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {site.domain || site.slug}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {site.is_active ? (
                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                  ) : (
                    <span className="w-2 h-2 bg-gray-300 rounded-full" title="Inactive" />
                  )}
                  {currentSite.id === site.id && (
                    <Check size={16} className="text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 dark:border-slate-700 pt-2 mt-1">
            <Link
              href="/admin/command-center/sites/new"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Plus size={16} className="text-gray-500" />
              </div>
              <span>Add New Site</span>
            </Link>
            <Link
              href="/admin/site"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Settings size={16} className="text-gray-500" />
              </div>
              <span>Site Settings</span>
            </Link>
            {currentSite.domain && (
              <a
                href={`https://${currentSite.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                  <ExternalLink size={16} className="text-gray-500" />
                </div>
                <span>View Live Site</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebar
export function SiteSelectorCompact() {
  return <SiteSelector compact />
}
