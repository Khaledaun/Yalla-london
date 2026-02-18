'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Calendar, ArrowLeft, ExternalLink, Newspaper, Clock,
  AlertTriangle, Zap, Train, Music, Cloud, Heart,
  ShoppingBag, Plane, Sparkles, Globe, Shield, BookOpen,
  ChevronRight,
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
// Category helpers
// ---------------------------------------------------------------------------

type NewsCategory =
  | 'transport' | 'events' | 'weather' | 'health' | 'festivals'
  | 'sales' | 'holidays' | 'strikes' | 'popup' | 'general'

const CATEGORY_ICON_MAP: Record<NewsCategory, React.ElementType> = {
  transport: Train, events: Calendar, weather: Cloud, health: Heart,
  festivals: Music, sales: ShoppingBag, holidays: Plane,
  strikes: AlertTriangle, popup: Sparkles, general: Globe,
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
  transport: 'Transport', events: 'Events', weather: 'Weather',
  health: 'Health', festivals: 'Festivals', sales: 'Sales',
  holidays: 'Holidays', strikes: 'Strikes', popup: 'Pop-up', general: 'General',
}

const CATEGORY_LABEL_AR: Record<NewsCategory, string> = {
  transport: 'مواصلات', events: 'فعاليات', weather: 'طقس',
  health: 'صحة', festivals: 'مهرجانات', sales: 'تخفيضات',
  holidays: 'عطلات', strikes: 'إضرابات', popup: 'مؤقت', general: 'عام',
}

/** Category-themed gradient for hero — legally safe, no copied images */
const CATEGORY_GRADIENT: Record<NewsCategory, string> = {
  transport: 'from-blue-800 via-blue-900 to-slate-950',
  events: 'from-purple-800 via-purple-900 to-slate-950',
  weather: 'from-orange-700 via-amber-900 to-slate-950',
  health: 'from-red-800 via-red-900 to-slate-950',
  festivals: 'from-green-700 via-emerald-900 to-slate-950',
  sales: 'from-pink-700 via-rose-900 to-slate-950',
  holidays: 'from-teal-700 via-teal-900 to-slate-950',
  strikes: 'from-red-900 via-red-950 to-slate-950',
  popup: 'from-indigo-700 via-indigo-900 to-slate-950',
  general: 'from-stone-700 via-stone-900 to-slate-950',
}

const URGENCY_CONFIG: Record<string, { label_en: string; label_ar: string; color: string; icon: React.ElementType }> = {
  breaking: { label_en: 'Breaking', label_ar: 'عاجل', color: 'bg-red-600 text-white animate-pulse', icon: Zap },
  urgent: { label_en: 'Urgent', label_ar: 'مستعجل', color: 'bg-orange-500 text-white', icon: AlertTriangle },
  normal: { label_en: '', label_ar: '', color: '', icon: Clock },
  low: { label_en: '', label_ar: '', color: '', icon: Clock },
}

function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON_MAP[category as NewsCategory] ?? Globe
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category as NewsCategory] ?? CATEGORY_COLOR_MAP.general
}

function getCategoryLabel(category: string, language: 'en' | 'ar'): string {
  if (language === 'ar') return CATEGORY_LABEL_AR[category as NewsCategory] ?? category
  return CATEGORY_LABEL_EN[category as NewsCategory] ?? category
}

function getCategoryGradient(category: string): string {
  return CATEGORY_GRADIENT[category as NewsCategory] ?? CATEGORY_GRADIENT.general
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(dateStr: string, language: 'en' | 'ar'): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return dateStr }
}

function formatDateRange(start: string | null, end: string | null, language: 'en' | 'ar'): string | null {
  if (!start) return null
  const s = formatDate(start, language)
  if (!end) return s
  return `${s} — ${formatDate(end, language)}`
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsDetailClient({ item, relatedArticles = [] }: NewsDetailClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const headline = language === 'en' ? item.headline_en : item.headline_ar
  const summary = language === 'en' ? item.summary_en : item.summary_ar
  const announcement = language === 'en' ? item.announcement_en : item.announcement_ar

  const CategoryIcon = getCategoryIcon(item.news_category)
  const categoryColor = getCategoryColor(item.news_category)
  const categoryLabel = getCategoryLabel(item.news_category, language)
  const urgencyConfig = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.normal
  const showUrgency = item.urgency === 'breaking' || item.urgency === 'urgent'

  const eventDateRange = formatDateRange(item.event_start_date, item.event_end_date, language)

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section — category-themed gradient, no copied images         */}
      {/* ----------------------------------------------------------------- */}
      <section className={`relative min-h-[22rem] md:min-h-[26rem] overflow-hidden bg-gradient-to-br ${getCategoryGradient(item.news_category)}`}>
        {/* Decorative elements — original design */}
        <div className="absolute inset-0 overflow-hidden">
          <CategoryIcon className="absolute -right-10 -bottom-10 w-64 h-64 text-white/[0.03]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-4xl mx-auto px-6 pb-12 pt-24 w-full">
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${categoryColor}`}>
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {categoryLabel}
                </span>

                {showUrgency && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${urgencyConfig.color}`}>
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
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight ${isRTL ? 'font-arabic' : 'font-display'}`}>
                {headline}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(item.published_at, language)}
                </span>
                <span className="hidden sm:inline text-white/30">|</span>
                <span className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  {item.source_name}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Article Content                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            {/* Action bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-sand">
              <Button asChild variant="outline" size="sm">
                <Link href="/news">
                  <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  {language === 'en' ? 'Back to News' : 'العودة للأخبار'}
                </Link>
              </Button>
              <ShareButtons title={headline} excerpt={announcement} />
            </div>

            {/* Event date range */}
            {eventDateRange && (
              <div className="mb-6 p-4 rounded-lg bg-cream border border-sand flex items-center gap-3">
                <Calendar className="h-5 w-5 text-london-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-stone">
                    {language === 'en' ? 'Event Dates' : 'تواريخ الفعالية'}
                  </span>
                  <p className="text-charcoal font-semibold text-sm mt-0.5">{eventDateRange}</p>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Summary content — original commentary, fair-use compliant */}
            {/* ─────────────────────────────────────────────────────────── */}
            <div className={`text-charcoal text-lg leading-relaxed mb-8 whitespace-pre-line ${isRTL ? 'font-arabic' : ''}`}>
              {summary}
            </div>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Source Attribution Box — standardized format               */}
            {/* ─────────────────────────────────────────────────────────── */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-xl border border-sand bg-cream p-6 md:p-8 mb-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-london-600/10 flex items-center justify-center">
                    <Newspaper className="h-6 w-6 text-london-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone mb-1">
                      {language === 'en' ? 'Source' : 'المصدر'}
                    </p>
                    <p className={`text-charcoal font-semibold ${isRTL ? 'font-arabic' : 'font-display'}`}>
                      {item.source_name}
                    </p>
                    <p className="text-xs text-stone mt-1">
                      {language === 'en'
                        ? `Published ${formatDate(item.published_at, language)}`
                        : `نُشر ${formatDate(item.published_at, language)}`}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="bg-london-600 hover:bg-london-700 text-white flex-shrink-0"
                >
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Read Original Report' : 'اقرأ التقرير الأصلي'}
                  </a>
                </Button>
              </div>
            </motion.div>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Content Integrity Footer — fair-use compliance notice      */}
            {/* ─────────────────────────────────────────────────────────── */}
            <div className="rounded-lg border border-sand/50 bg-cream-100/60 p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-london-600 shrink-0 mt-0.5" />
                <div className={`text-[11px] text-stone leading-relaxed ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
                  <p>
                    {language === 'en'
                      ? 'This post contains original commentary and a summary of publicly reported information. For full context, read the original reporting at the linked source.'
                      : 'يحتوي هذا المنشور على تعليقات أصلية وملخص لمعلومات مُبلغ عنها علنيًا. للسياق الكامل، اقرأ التقارير الأصلية من المصدر المرتبط.'}
                  </p>
                  {item.published_at && (
                    <p className="mt-1.5 text-stone/60">
                      {language === 'en'
                        ? `Last updated: ${formatDate(item.published_at, language)}`
                        : `آخر تحديث: ${formatDate(item.published_at, language)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
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

            {/* "What this means for you" section — transformative value */}
            <div className="rounded-xl border border-yalla-gold-400/30 bg-yalla-gold-500/5 p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-yalla-gold-600" />
                <h3 className={`text-sm font-bold text-charcoal ${isRTL ? 'font-arabic' : 'font-display'}`}>
                  {language === 'en' ? 'What This Means for Visitors' : 'ماذا يعني هذا للزوار'}
                </h3>
              </div>
              <p className={`text-sm text-stone leading-relaxed ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
                {language === 'en'
                  ? `This ${getCategoryLabel(item.news_category, 'en').toLowerCase()} update may affect your London plans. Check the original source for the latest details, and visit our Information Hub for up-to-date travel guidance.`
                  : `قد يؤثر تحديث ${getCategoryLabel(item.news_category, 'ar')} هذا على خططك في لندن. تحقق من المصدر الأصلي لآخر التفاصيل، وقم بزيارة مركز المعلومات لدينا للحصول على إرشادات سفر محدثة.`}
              </p>
              <div className="mt-3">
                <Link
                  href="/information"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-london-600 hover:text-london-700 transition-colors"
                >
                  {language === 'en' ? 'Visit Information Hub' : 'زيارة مركز المعلومات'}
                  <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Related Articles                                                   */}
      {/* ----------------------------------------------------------------- */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-cream">
          <div className="max-w-6xl mx-auto px-6">
            <RelatedArticles articles={relatedArticles} currentType="blog" />
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Follow Us                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-10 bg-cream border-t border-sand">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FollowUs variant="light" />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom CTA                                                         */}
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
