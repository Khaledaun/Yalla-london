'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Clock,
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsItemData {
  id: string
  slug: string
  headline_en: string
  headline_ar: string
  summary_en: string
  summary_ar: string
  announcement_en: string
  announcement_ar: string
  source_name: string
  source_url: string
  featured_image?: string
  image_alt_en?: string
  image_alt_ar?: string
  image_credit?: string
  news_category: string
  is_major: boolean
  urgency: string
  event_start_date?: string
  event_end_date?: string
  related_article_slugs: string[]
  published_at: string
}

export interface NewsCarouselProps {
  items?: NewsItemData[]
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

const CATEGORY_COLOR_MAP: Record<NewsCategory, string> = {
  transport: 'bg-blue-500/90 text-white',
  events: 'bg-purple-500/90 text-white',
  weather: 'bg-orange-500/90 text-white',
  health: 'bg-red-500/90 text-white',
  festivals: 'bg-green-500/90 text-white',
  sales: 'bg-pink-500/90 text-white',
  holidays: 'bg-teal-500/90 text-white',
  strikes: 'bg-red-800/90 text-white',
  popup: 'bg-indigo-500/90 text-white',
  general: 'bg-gray-500/90 text-white',
}

const CATEGORY_LABEL_EN: Record<NewsCategory, string> = {
  transport: 'Transport',
  events: 'Events',
  weather: 'Weather',
  health: 'Health',
  festivals: 'Festivals',
  sales: 'Sales',
  holidays: 'Holidays',
  strikes: 'Strikes',
  popup: 'Pop-up',
  general: 'General',
}

const CATEGORY_LABEL_AR: Record<NewsCategory, string> = {
  transport: 'مواصلات',
  events: 'فعاليات',
  weather: 'طقس',
  health: 'صحة',
  festivals: 'مهرجانات',
  sales: 'تخفيضات',
  holidays: 'عطلات',
  strikes: 'إضرابات',
  popup: 'مؤقت',
  general: 'عام',
}

function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON_MAP[category as NewsCategory] ?? Globe
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category as NewsCategory] ?? CATEGORY_COLOR_MAP.general
}

function getCategoryLabel(category: string, language: 'en' | 'ar'): string {
  if (language === 'ar') {
    return CATEGORY_LABEL_AR[category as NewsCategory] ?? category
  }
  return CATEGORY_LABEL_EN[category as NewsCategory] ?? category
}

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

function formatDate(dateStr: string, language: 'en' | 'ar'): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-GB' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ---------------------------------------------------------------------------
// Truncation utility
// ---------------------------------------------------------------------------

function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function NewsCarouselSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-6 rounded bg-sand" />
        <div className="h-6 w-40 rounded bg-sand" />
      </div>
      <div className="rounded-2xl border border-sand bg-cream overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/5 h-48 md:h-64 bg-sand" />
          <div className="flex-1 p-6 space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-sand" />
              <div className="h-6 w-16 rounded-full bg-sand" />
            </div>
            <div className="h-5 w-3/4 rounded bg-sand" />
            <div className="h-4 w-full rounded bg-sand" />
            <div className="h-4 w-5/6 rounded bg-sand" />
            <div className="h-4 w-2/3 rounded bg-sand" />
            <div className="flex justify-between items-center pt-4">
              <div className="h-4 w-24 rounded bg-sand" />
              <div className="h-9 w-32 rounded-full bg-sand" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NewsCarousel({ items: propItems }: NewsCarouselProps) {
  const { language, isRTL } = useLanguage()
  const [fetchedItems, setFetchedItems] = useState<NewsItemData[] | null>(null)
  const [loading, setLoading] = useState(!propItems)
  const [error, setError] = useState(false)

  // Fetch data when no items prop provided
  useEffect(() => {
    if (propItems) return undefined

    let cancelled = false

    async function fetchNews() {
      try {
        setLoading(true)
        const res = await fetch('/api/news?limit=3')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (!cancelled) {
          setFetchedItems(data.data ?? data.items ?? data)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    fetchNews()
    return () => {
      cancelled = true
    }
  }, [propItems])

  const newsItems = propItems ?? fetchedItems
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  // Loading state
  if (loading) {
    return (
      <section className="py-10 px-4 md:px-8 max-w-6xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <NewsCarouselSkeleton />
      </section>
    )
  }

  // Empty / error state — render nothing
  if (error || !newsItems || newsItems.length === 0) {
    return null
  }

  const sectionTitle = language === 'en' ? 'London Today' : 'لندن اليوم'
  const readFullStory = language === 'en' ? 'Read Full Story' : 'اقرأ القصة كاملة'
  const sourceLabel = language === 'en' ? 'Source' : 'المصدر'
  const relatedLabel = getTranslation(language, 'relatedArticles')

  return (
    <motion.section
      className="py-10 px-4 md:px-8 max-w-6xl mx-auto"
      dir={isRTL ? 'rtl' : 'ltr'}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Section header                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-3 mb-8">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-london-600/10">
          <Newspaper className="w-5 h-5 text-london-600" />
        </span>
        <h2
          className={cn(
            'text-2xl md:text-3xl font-bold text-charcoal',
            isRTL ? 'font-arabic' : 'font-display'
          )}
        >
          {sectionTitle}
        </h2>
        <span className="hidden sm:block flex-1 h-px bg-gradient-to-r from-yalla-gold-400/40 to-transparent" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Carousel                                                            */}
      {/* ------------------------------------------------------------------ */}
      <Carousel
        opts={{
          align: 'start',
          loop: newsItems.length > 1,
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {newsItems.map((item) => {
            const headline = language === 'en' ? item.headline_en : item.headline_ar
            const summary = language === 'en' ? item.summary_en : item.summary_ar
            const announcement = language === 'en' ? item.announcement_en : item.announcement_ar
            const CategoryIcon = getCategoryIcon(item.news_category)
            const categoryColor = getCategoryColor(item.news_category)
            const categoryLabel = getCategoryLabel(item.news_category, language)
            const isBreaking = item.urgency === 'breaking'
            const isUrgent = item.urgency === 'urgent'
            const showUrgencyBadge = isBreaking || isUrgent

            return (
              <CarouselItem key={item.id} className="pl-4 basis-full">
                <motion.div variants={cardVariants}>
                  {/* ------------------------------------------------------ */}
                  {/* Card with animated tri-color border                      */}
                  {/* ------------------------------------------------------ */}
                  <article
                    className={cn(
                      'relative rounded-2xl overflow-hidden transition-shadow duration-300 group/card',
                      'bg-cream shadow-card hover:shadow-hover',
                      item.is_major && 'ring-1 ring-yalla-gold-400/50'
                    )}
                    style={{
                      border: '2px solid transparent',
                      backgroundClip: 'padding-box',
                    }}
                  >
                    {/* Animated tri-color border overlay */}
                    <div
                      className="absolute inset-0 -z-10 rounded-2xl opacity-60 group-hover/card:opacity-100 transition-opacity duration-300"
                      style={{
                        margin: '-2px',
                        background: 'conic-gradient(from var(--border-angle, 0deg), #C8322B, #C49A2A, #3B7EA1, #C8322B)',
                        borderRadius: 'inherit',
                        animation: 'rotateBorder 4s linear infinite',
                      }}
                    />
                    <div className="absolute inset-0 rounded-2xl bg-cream" style={{ margin: '2px', zIndex: -1 }} />

                    <style jsx>{`
                      @property --border-angle {
                        syntax: "<angle>";
                        initial-value: 0deg;
                        inherits: false;
                      }
                      @keyframes rotateBorder {
                        to { --border-angle: 360deg; }
                      }
                    `}</style>
                    <div className="flex flex-col md:flex-row">
                      {/* Image section */}
                      {item.featured_image && (
                        <div className="relative w-full md:w-2/5 h-52 md:h-auto min-h-[200px] overflow-hidden">
                          <Image
                            src={item.featured_image}
                            alt={(language === 'en' ? item.image_alt_en : item.image_alt_ar) || headline}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 40vw"
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-charcoal/10" />

                          {/* Image credit */}
                          {item.image_credit && (
                            <span className="absolute bottom-2 right-2 text-[11px] text-white/70 bg-charcoal/50 px-1.5 py-0.5 rounded">
                              {item.image_credit}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Content section */}
                      <div
                        className={cn(
                          'flex-1 p-5 md:p-6 flex flex-col justify-between',
                          !item.featured_image && 'w-full'
                        )}
                      >
                        {/* Top: badges */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {/* Category badge */}
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full',
                                categoryColor
                              )}
                            >
                              <CategoryIcon className="w-3 h-3" />
                              {categoryLabel}
                            </span>

                            {/* Urgency badge */}
                            {showUrgencyBadge && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide',
                                  isBreaking
                                    ? 'bg-red-600 text-white'
                                    : 'bg-orange-500 text-white'
                                )}
                              >
                                <span className="relative flex h-2 w-2">
                                  <span
                                    className={cn(
                                      'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                                      isBreaking ? 'bg-red-300' : 'bg-orange-300'
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      'relative inline-flex rounded-full h-2 w-2',
                                      isBreaking ? 'bg-red-100' : 'bg-orange-100'
                                    )}
                                  />
                                </span>
                                {isBreaking
                                  ? language === 'en'
                                    ? 'Breaking'
                                    : 'عاجل'
                                  : language === 'en'
                                    ? 'Urgent'
                                    : 'مستعجل'}
                              </span>
                            )}

                            {/* Date */}
                            <span className="flex items-center gap-1 text-xs text-stone ml-auto">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.published_at, language)}
                            </span>
                          </div>

                          {/* Announcement */}
                          {announcement && (
                            <p
                              className={cn(
                                'text-sm font-bold text-london-700 mb-2 leading-snug',
                                isRTL ? 'font-arabic' : 'font-sans'
                              )}
                            >
                              {announcement}
                            </p>
                          )}

                          {/* Headline */}
                          <h3
                            className={cn(
                              'text-lg md:text-xl font-bold text-charcoal mb-2 leading-tight',
                              isRTL ? 'font-arabic' : 'font-display'
                            )}
                          >
                            {headline}
                          </h3>

                          {/* Summary */}
                          <p
                            className={cn(
                              'text-sm text-stone leading-relaxed mb-4',
                              isRTL ? 'font-arabic' : 'font-sans'
                            )}
                          >
                            <span className="block md:hidden">
                              {truncateText(summary, 150)}
                            </span>
                            <span className="hidden md:block">{summary}</span>
                          </p>
                        </div>

                        {/* Bottom: source + CTA */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-sand">
                          {/* Source */}
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-stone hover:text-london-600 transition-colors"
                          >
                            {sourceLabel}: {item.source_name}
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {/* Read Full Story */}
                          <Link
                            href={`/news/${item.slug}`}
                            className={cn(
                              'inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold',
                              'bg-london-600 text-white hover:bg-london-700',
                              'transition-all duration-200 hover:gap-3 shadow-sm hover:shadow-md'
                            )}
                          >
                            {readFullStory}
                            <ArrowIcon className="w-4 h-4" />
                          </Link>
                        </div>

                        {/* Event dates if applicable */}
                        {(item.event_start_date || item.event_end_date) && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-stone">
                            <Calendar className="w-3.5 h-3.5 text-yalla-gold-500" />
                            <span>
                              {item.event_start_date && formatDate(item.event_start_date, language)}
                              {item.event_start_date && item.event_end_date && ' — '}
                              {item.event_end_date && formatDate(item.event_end_date, language)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ---------------------------------------------------- */}
                    {/* Related articles pills                                */}
                    {/* ---------------------------------------------------- */}
                    {item.related_article_slugs && item.related_article_slugs.length > 0 && (
                      <div className="px-5 md:px-6 pb-4 pt-2 border-t border-sand/50">
                        <p className="text-xs font-medium text-stone mb-2">{relatedLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {item.related_article_slugs.slice(0, 3).map((slug) => (
                            <Link
                              key={slug}
                              href={`/blog/${slug}`}
                              className={cn(
                                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                                'bg-cream-100 text-charcoal border border-sand/80',
                                'hover:border-yalla-gold-400 hover:text-london-600 transition-colors duration-200'
                              )}
                            >
                              <ArrowIcon className="w-3 h-3" />
                              {slug
                                .replace(/-/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </motion.div>
              </CarouselItem>
            )
          })}
        </CarouselContent>

        {/* Carousel navigation */}
        {newsItems.length > 1 && (
          <>
            <CarouselPrevious
              className={cn(
                'hidden sm:flex -left-4 md:-left-5 h-10 w-10 rounded-full',
                'bg-cream border-sand text-charcoal shadow-card',
                'hover:bg-london-600 hover:text-white hover:border-london-600',
                'transition-all duration-200'
              )}
            />
            <CarouselNext
              className={cn(
                'hidden sm:flex -right-4 md:-right-5 h-10 w-10 rounded-full',
                'bg-cream border-sand text-charcoal shadow-card',
                'hover:bg-london-600 hover:text-white hover:border-london-600',
                'transition-all duration-200'
              )}
            />
          </>
        )}
      </Carousel>

      {/* Slide indicators for mobile */}
      {newsItems.length > 1 && (
        <div className="flex justify-center gap-2 mt-5 sm:hidden">
          {newsItems.map((item, index) => (
            <span
              key={item.id}
              className="w-2 h-2 rounded-full bg-sand"
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}

export default NewsCarousel
