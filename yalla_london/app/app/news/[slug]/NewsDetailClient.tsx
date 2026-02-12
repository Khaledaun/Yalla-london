'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  ArrowLeft,
  ExternalLink,
  Newspaper,
  Clock,
  AlertTriangle,
  Zap,
  Train,
  Music,
  Cloud,
  Heart,
  ShoppingBag,
  Plane,
  Sparkles,
  Globe,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { RelatedArticles, type RelatedArticleData } from '@/components/related-articles'
import { ShareButtons } from '@/components/share-buttons'
import { FollowUs } from '@/components/follow-us'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewsItemData {
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
  source_logo: string | null
  featured_image: string | null
  image_alt_en: string | null
  image_alt_ar: string | null
  image_credit: string | null
  news_category: string
  relevance_score: number
  is_major: boolean
  urgency: string
  event_start_date: string | null
  event_end_date: string | null
  meta_title_en: string | null
  meta_title_ar: string | null
  meta_description_en: string | null
  meta_description_ar: string | null
  tags: string[]
  keywords: string[]
  related_article_slugs: string[]
  related_shop_slugs: string[]
  published_at: string
}

interface NewsDetailClientProps {
  item: NewsItemData
  relatedArticles?: RelatedArticleData[]
}

// ---------------------------------------------------------------------------
// Category helpers (same as news-carousel for consistency)
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

const URGENCY_CONFIG: Record<string, { label_en: string; label_ar: string; color: string; icon: React.ElementType }> = {
  breaking: {
    label_en: 'Breaking',
    label_ar: 'عاجل',
    color: 'bg-red-600 text-white animate-pulse',
    icon: Zap,
  },
  urgent: {
    label_en: 'Urgent',
    label_ar: 'مستعجل',
    color: 'bg-orange-500 text-white',
    icon: AlertTriangle,
  },
  normal: {
    label_en: '',
    label_ar: '',
    color: '',
    icon: Clock,
  },
  low: {
    label_en: '',
    label_ar: '',
    color: '',
    icon: Clock,
  },
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
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(dateStr: string, language: 'en' | 'ar'): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateRange(
  startStr: string | null,
  endStr: string | null,
  language: 'en' | 'ar',
): string | null {
  if (!startStr) return null
  const start = formatDate(startStr, language)
  if (!endStr) return start
  const end = formatDate(endStr, language)
  return language === 'ar' ? `${start} - ${end}` : `${start} - ${end}`
}

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

// ---------------------------------------------------------------------------
// Default hero image when none is provided
// ---------------------------------------------------------------------------

const DEFAULT_NEWS_IMAGE = '/images/london-news-default.jpg'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsDetailClient({ item, relatedArticles = [] }: NewsDetailClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const headline = language === 'en' ? item.headline_en : item.headline_ar
  const summary = language === 'en' ? item.summary_en : item.summary_ar
  const announcement = language === 'en' ? item.announcement_en : item.announcement_ar
  const imageAlt = language === 'en'
    ? (item.image_alt_en || item.headline_en)
    : (item.image_alt_ar || item.headline_ar)
  const heroImage = item.featured_image || DEFAULT_NEWS_IMAGE

  const CategoryIcon = getCategoryIcon(item.news_category)
  const categoryColor = getCategoryColor(item.news_category)
  const categoryLabel = getCategoryLabel(item.news_category, language)
  const urgencyConfig = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.normal
  const showUrgency = item.urgency === 'breaking' || item.urgency === 'urgent'

  const eventDateRange = formatDateRange(item.event_start_date, item.event_end_date, language)

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative h-[28rem] md:h-[32rem] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={imageAlt}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-charcoal/20" />
        </div>

        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-4xl mx-auto px-6 pb-12 w-full">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${categoryColor}`}
                >
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {categoryLabel}
                </span>

                {showUrgency && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${urgencyConfig.color}`}
                  >
                    <urgencyConfig.icon className="h-3.5 w-3.5" />
                    {language === 'en' ? urgencyConfig.label_en : urgencyConfig.label_ar}
                  </span>
                )}

                {item.is_major && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yalla-gold-500 text-charcoal">
                    <Sparkles className="h-3.5 w-3.5" />
                    {language === 'en' ? 'Featured' : 'مميز'}
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1
                className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight ${
                  isRTL ? 'font-arabic' : 'font-display'
                }`}
              >
                {headline}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-cream-200 text-sm">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.published_at, language)}
                </span>
                <span className="hidden sm:inline text-cream-400">|</span>
                <span className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  {item.source_name}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Image credit */}
        {item.image_credit && (
          <div className="absolute bottom-2 right-3 z-10 text-xs text-white/60">
            {item.image_credit}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Article Content */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-sand">
              <Button asChild variant="outline" size="sm">
                <Link href="/news">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {language === 'en' ? 'Back to News' : 'العودة للأخبار'}
                </Link>
              </Button>

              <ShareButtons
                title={headline}
                excerpt={announcement}
              />
            </div>

            {/* Event date range */}
            {eventDateRange && (
              <div className="mb-6 p-4 rounded-lg bg-cream border border-sand flex items-center gap-3">
                <Calendar className="h-5 w-5 text-london-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-stone">
                    {language === 'en' ? 'Event Dates' : 'تواريخ الفعالية'}
                  </span>
                  <p className="text-charcoal font-semibold text-sm mt-0.5">
                    {eventDateRange}
                  </p>
                </div>
              </div>
            )}

            {/* Summary content */}
            <div
              className={`text-charcoal text-lg leading-relaxed mb-10 whitespace-pre-line ${
                isRTL ? 'font-arabic' : ''
              }`}
            >
              {summary}
            </div>

            {/* -------------------------------------------------------------- */}
            {/* Source Credit Box */}
            {/* -------------------------------------------------------------- */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-xl border border-sand bg-cream p-6 md:p-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Source icon / logo */}
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-london-600/10 flex items-center justify-center">
                    {item.source_logo ? (
                      <Image
                        src={item.source_logo}
                        alt={item.source_name}
                        width={32}
                        height={32}
                        className="rounded-full object-contain"
                      />
                    ) : (
                      <Newspaper className="h-6 w-6 text-london-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone mb-1">
                      {language === 'en' ? 'Source' : 'المصدر'}
                    </p>
                    <p className={`text-charcoal font-semibold ${isRTL ? 'font-arabic' : 'font-display'}`}>
                      {language === 'en'
                        ? `Originally reported by ${item.source_name}`
                        : `نُشر في الأصل بواسطة ${item.source_name}`}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="bg-london-600 hover:bg-london-700 text-white flex-shrink-0"
                >
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'View Original Source' : 'عرض المصدر الأصلي'}
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-cream-100 text-stone border border-sand"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Related Articles */}
      {/* ----------------------------------------------------------------- */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-cream">
          <div className="max-w-6xl mx-auto px-6">
            <RelatedArticles articles={relatedArticles} currentType="blog" />
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Follow Us */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-10 bg-cream border-t border-sand">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FollowUs variant="light" />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom CTA / Back to News */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-10 bg-white border-t border-sand">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-london-600 hover:text-london-700 font-medium transition-colors duration-200"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {language === 'en' ? 'Back to All News' : 'العودة لجميع الأخبار'}
          </Link>
        </div>
      </section>
    </div>
  )
}
