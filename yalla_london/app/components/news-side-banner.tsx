'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Newspaper, X, ChevronRight, ChevronLeft,
  Train, Calendar, Cloud, Heart, Music, ShoppingBag, Plane,
  AlertTriangle, Sparkles, Globe, Zap,
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'

interface NewsItem {
  id: string
  slug: string
  headline_en: string
  headline_ar: string
  announcement_en: string
  announcement_ar: string
  news_category: string
  urgency: string
  is_major: boolean
  source_name: string
  published_at: string
}

type NewsCategory =
  | 'transport' | 'events' | 'weather' | 'health' | 'festivals'
  | 'sales' | 'holidays' | 'strikes' | 'popup' | 'general'

const CATEGORY_ICON: Record<NewsCategory, React.ElementType> = {
  transport: Train, events: Calendar, weather: Cloud, health: Heart,
  festivals: Music, sales: ShoppingBag, holidays: Plane,
  strikes: AlertTriangle, popup: Sparkles, general: Globe,
}

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  transport: 'bg-blue-500', events: 'bg-purple-500', weather: 'bg-orange-500',
  health: 'bg-red-500', festivals: 'bg-green-500', sales: 'bg-pink-500',
  holidays: 'bg-teal-500', strikes: 'bg-red-700', popup: 'bg-indigo-500',
  general: 'bg-gray-500',
}

export function NewsSideBanner() {
  const { language, isRTL } = useLanguage()
  const [items, setItems] = useState<NewsItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const isAr = language === 'ar'

  useEffect(() => {
    let cancelled = false
    async function fetchNews() {
      try {
        const res = await fetch('/api/news?limit=15')
        if (!res.ok) return
        const data = await res.json()
        const newsItems = data.data ?? data.items ?? data
        if (!cancelled && Array.isArray(newsItems) && newsItems.length > 0) {
          setItems(newsItems)
          setHasLoaded(true)
        }
      } catch {
        // Silent — banner just won't show
      }
    }
    fetchNews()
    return () => { cancelled = true }
  }, [])

  // Don't render if no news
  if (!hasLoaded || items.length === 0) return null

  // Sort latest to oldest
  const sorted = [...items].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  )

  const CollapseIcon = isRTL ? ChevronRight : ChevronLeft
  const ExpandIcon = isRTL ? ChevronLeft : ChevronRight

  return (
    <>
      {/* Collapsed tab — always visible */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed top-1/3 z-40 flex items-center gap-1 px-2 py-4 rounded-l-xl',
            'bg-yl-red text-white shadow-lg hover:bg-[#a82924] transition-all duration-300',
            'writing-mode-vertical',
            isRTL ? 'left-0 rounded-l-none rounded-r-xl' : 'right-0'
          )}
          style={{ writingMode: 'vertical-lr' }}
          aria-label={isAr ? 'فتح الأخبار' : 'Open News'}
        >
          <Newspaper className="w-4 h-4 mb-1 rotate-90" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase">
            {isAr ? 'أخبار' : 'NEWS'}
          </span>
          <span className="relative flex h-2 w-2 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        </button>
      )}

      {/* Expanded panel */}
      <div
        className={cn(
          'fixed top-0 z-50 h-full w-[320px] sm:w-[360px] transition-transform duration-400 ease-yl',
          'bg-[#0f1621] border-l border-white/10 shadow-2xl',
          isRTL ? 'left-0 border-l-0 border-r border-white/10' : 'right-0',
          isOpen
            ? 'translate-x-0'
            : isRTL ? '-translate-x-full' : 'translate-x-full'
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yl-red flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-yl-parchment text-sm">
                {isAr ? 'أخبار لندن' : 'London News'}
              </h3>
              <p className="font-mono text-xs text-yl-gray-500 tracking-widest uppercase">
                {isAr ? 'عاجل ومباشر' : 'LIVE UPDATES'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 text-yl-gray-400 hover:text-white transition-colors"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tri-color accent bar */}
        <div className="flex h-[3px]">
          <div className="flex-1 bg-yl-red" />
          <div className="flex-1 bg-yl-gold" />
          <div className="flex-1 bg-yl-blue" />
        </div>

        {/* News items — scrollable */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] pb-20">
          {sorted.map((item, index) => {
            const headline = isAr ? item.headline_ar : item.headline_en
            const announcement = isAr ? item.announcement_ar : item.announcement_en
            const text = announcement || headline
            const isBreaking = item.urgency === 'breaking'
            const isUrgent = item.urgency === 'urgent'
            const Icon = CATEGORY_ICON[item.news_category as NewsCategory] ?? Globe
            const dotColor = CATEGORY_COLOR[item.news_category as NewsCategory] ?? 'bg-gray-500'

            const timeAgo = formatTimeAgo(item.published_at, isAr)

            return (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className={cn(
                  'block px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors duration-200 group',
                  index === 0 && 'bg-white/[0.03]'
                )}
              >
                {/* Top row: badges + time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', dotColor)} />
                    <Icon className="w-3.5 h-3.5 text-white/40" />
                    {(isBreaking || isUrgent) && (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
                        isBreaking ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                      )}>
                        <Zap className="w-2.5 h-2.5" />
                        {isBreaking ? (isAr ? 'عاجل' : 'BREAKING') : (isAr ? 'مهم' : 'URGENT')}
                      </span>
                    )}
                    {item.is_major && !isBreaking && !isUrgent && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-yl-gold/20 text-yl-gold">
                        <Sparkles className="w-2.5 h-2.5" />
                        {isAr ? 'مميز' : 'FEATURED'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-white/50 tracking-wider">
                    {timeAgo}
                  </span>
                </div>

                {/* Headline */}
                <p className={cn(
                  'text-sm text-white leading-relaxed group-hover:text-yl-gold transition-colors duration-200',
                  isAr ? 'font-arabic' : 'font-body',
                  item.is_major && 'font-semibold'
                )}>
                  {text}
                </p>

                {/* Source */}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-xs text-white/50 tracking-wider">
                    {item.source_name}
                  </span>
                  <ExpandIcon className="w-3 h-3 text-white/40 group-hover:text-yl-gold transition-colors" />
                </div>
              </Link>
            )
          })}

          {/* View all link */}
          <Link
            href="/news"
            className="block px-5 py-4 text-center font-mono text-xs text-yl-gold tracking-widest uppercase hover:bg-white/5 transition-colors"
          >
            {isAr ? 'عرض جميع الأخبار ←' : 'View All News →'}
          </Link>
        </div>
      </div>

      {/* Backdrop when open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function formatTimeAgo(dateStr: string, isAr: boolean): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return isAr ? 'الآن' : 'now'
  if (diffMin < 60) return isAr ? `${diffMin} د` : `${diffMin}m`
  if (diffH < 24) return isAr ? `${diffH} س` : `${diffH}h`
  if (diffD < 7) return isAr ? `${diffD} ي` : `${diffD}d`
  return date.toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })
}

export default NewsSideBanner
