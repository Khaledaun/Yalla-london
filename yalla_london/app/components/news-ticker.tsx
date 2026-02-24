'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Newspaper,
  Train,
  Calendar,
  Cloud,
  Heart,
  Music,
  ShoppingBag,
  Plane,
  AlertTriangle,
  Sparkles,
  Globe,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TickerItem {
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

interface NewsTickerProps {
  items?: TickerItem[]
  /** Speed in seconds for one full cycle. Default 40. */
  speed?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

type NewsCategory =
  | 'transport'
  | 'events'
  | 'weather'
  | 'health'
  | 'festivals'
  | 'sales'
  | 'holidays'
  | 'strikes'
  | 'popup'
  | 'general'

const CATEGORY_ICON_MAP: Record<NewsCategory, React.ElementType> = {
  transport: Train,
  events: Calendar,
  weather: Cloud,
  health: Heart,
  festivals: Music,
  sales: ShoppingBag,
  holidays: Plane,
  strikes: AlertTriangle,
  popup: Sparkles,
  general: Globe,
}

const CATEGORY_DOT_COLOR: Record<NewsCategory, string> = {
  transport: 'bg-blue-500',
  events: 'bg-purple-500',
  weather: 'bg-orange-500',
  health: 'bg-red-500',
  festivals: 'bg-green-500',
  sales: 'bg-pink-500',
  holidays: 'bg-teal-500',
  strikes: 'bg-red-700',
  popup: 'bg-indigo-500',
  general: 'bg-gray-500',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewsTicker({ items: propItems, speed = 40, className }: NewsTickerProps) {
  const { language, isRTL } = useLanguage()
  const [fetchedItems, setFetchedItems] = useState<TickerItem[] | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (propItems) return undefined
    let cancelled = false

    async function fetchNews() {
      try {
        const res = await fetch('/api/news?limit=10')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setFetchedItems(data.data ?? data.items ?? data)
        }
      } catch {
        // Silent — ticker just won't show
      }
    }

    fetchNews()
    return () => { cancelled = true }
  }, [propItems])

  const newsItems = propItems ?? fetchedItems
  if (!newsItems || newsItems.length === 0) return null

  // Double the items so the marquee loops seamlessly
  const doubled = [...newsItems, ...newsItems]
  const isAr = language === 'ar'

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-charcoal border-b border-white/10',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="marquee"
      aria-label={isAr ? 'شريط الأخبار' : 'News ticker'}
    >
      {/* Left label */}
      <div className={cn(
        'absolute top-0 bottom-0 z-10 flex items-center px-3 md:px-4',
        'bg-london-600',
        isRTL ? 'right-0' : 'left-0'
      )}>
        <Newspaper className="w-3.5 h-3.5 text-white mr-1.5" />
        <span className="font-sans text-[11px] font-bold tracking-[1px] uppercase text-white hidden sm:inline">
          {isAr ? 'عاجل' : 'LIVE'}
        </span>
        <span className="relative flex h-2 w-2 ml-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      </div>

      {/* Right fade-out gradient */}
      <div className={cn(
        'absolute top-0 bottom-0 w-16 z-10 pointer-events-none',
        isRTL
          ? 'left-0 bg-gradient-to-r from-charcoal to-transparent'
          : 'right-0 bg-gradient-to-l from-charcoal to-transparent'
      )} />

      {/* Scrolling content */}
      <div
        className={cn(
          'flex items-center py-2.5',
          isRTL ? 'pr-24 sm:pr-28' : 'pl-24 sm:pl-28',
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={cn(
            'flex items-center gap-0 whitespace-nowrap',
            isRTL ? 'animate-ticker-rtl' : 'animate-ticker'
          )}
          style={{
            animationDuration: `${speed}s`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {doubled.map((item, index) => {
            const headline = isAr ? item.headline_ar : item.headline_en
            const announcement = isAr ? item.announcement_ar : item.announcement_en
            const displayText = announcement || headline
            const isBreaking = item.urgency === 'breaking'
            const isUrgent = item.urgency === 'urgent'
            const CategoryIcon = CATEGORY_ICON_MAP[item.news_category as NewsCategory] ?? Globe
            const dotColor = CATEGORY_DOT_COLOR[item.news_category as NewsCategory] ?? 'bg-gray-500'

            return (
              <Link
                key={`${item.id}-${index}`}
                href={`/news/${item.slug}`}
                className="inline-flex items-center gap-2 px-4 group shrink-0"
              >
                {/* Separator dot between items */}
                {index > 0 && (
                  <span className="w-1 h-1 rounded-full bg-white/20 mr-2 shrink-0" />
                )}

                {/* Breaking/Urgent badge */}
                {(isBreaking || isUrgent) && (
                  <span className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider shrink-0',
                    isBreaking ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                  )}>
                    <Zap className="w-2.5 h-2.5" />
                    {isBreaking ? (isAr ? 'عاجل' : 'BREAKING') : (isAr ? 'مهم' : 'URGENT')}
                  </span>
                )}

                {/* Category indicator */}
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
                <CategoryIcon className="w-3 h-3 text-white/50 shrink-0" />

                {/* Headline text */}
                <span className={cn(
                  'text-xs text-white/80 group-hover:text-yalla-gold-400 transition-colors duration-200',
                  isAr ? 'font-arabic' : 'font-editorial',
                  item.is_major && 'font-semibold text-white'
                )}>
                  {displayText}
                </span>

                {/* Source */}
                <span className="text-[11px] text-white/30 font-sans shrink-0">
                  {item.source_name}
                </span>

                <ChevronRight className={cn(
                  'w-3 h-3 text-white/20 group-hover:text-yalla-gold-400 transition-colors shrink-0',
                  isRTL && 'rotate-180'
                )} />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NewsTicker
