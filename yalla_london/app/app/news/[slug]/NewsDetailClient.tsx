'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
import { getCategoryPhoto } from '@/data/news-photos'
import {
  Calendar, ArrowLeft, ExternalLink, Newspaper, Clock,
  AlertTriangle, Zap, Train, Music, Cloud, Heart,
  ShoppingBag, Plane, Sparkles, Globe, Shield, BookOpen,
  ChevronRight,
} from 'lucide-react'
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

const CATEGORY_COLOR_MAP: Record<NewsCategory, 'red' | 'gold' | 'blue' | 'neutral'> = {
  transport: 'blue',
  events: 'gold',
  weather: 'gold',
  health: 'red',
  festivals: 'blue',
  sales: 'red',
  holidays: 'blue',
  strikes: 'red',
  popup: 'gold',
  general: 'neutral',
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

const URGENCY_CONFIG: Record<string, { label_en: string; label_ar: string; color: string; icon: React.ElementType }> = {
  breaking: { label_en: 'Breaking', label_ar: 'عاجل', color: 'bg-yl-red text-white animate-pulse', icon: Zap },
  urgent: { label_en: 'Urgent', label_ar: 'مستعجل', color: 'bg-yl-gold text-yl-charcoal', icon: AlertTriangle },
  normal: { label_en: '', label_ar: '', color: '', icon: Clock },
  low: { label_en: '', label_ar: '', color: '', icon: Clock },
}

function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON_MAP[category as NewsCategory] ?? Globe
}

function getCategoryTagColor(category: string): 'red' | 'gold' | 'blue' | 'neutral' {
  return CATEGORY_COLOR_MAP[category as NewsCategory] ?? 'neutral'
}

function getCategoryLabel(category: string, language: 'en' | 'ar'): string {
  if (language === 'ar') return CATEGORY_LABEL_AR[category as NewsCategory] ?? category
  return CATEGORY_LABEL_EN[category as NewsCategory] ?? category
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
// Component
// ---------------------------------------------------------------------------

export default function NewsDetailClient({ item, relatedArticles = [] }: NewsDetailClientProps) {
  const { language, isRTL } = useLanguage()
  const t = (key: string) => getTranslation(language, key)
  const headline = language === 'en' ? item.headline_en : item.headline_ar
  const summary = language === 'en' ? item.summary_en : item.summary_ar
  const announcement = language === 'en' ? item.announcement_en : item.announcement_ar

  const CategoryIcon = getCategoryIcon(item.news_category)
  const categoryTagColor = getCategoryTagColor(item.news_category)
  const categoryLabel = getCategoryLabel(item.news_category, language)
  const urgencyConfig = URGENCY_CONFIG[item.urgency] ?? URGENCY_CONFIG.normal
  const showUrgency = item.urgency === 'breaking' || item.urgency === 'urgent'

  const eventDateRange = formatDateRange(item.event_start_date, item.event_end_date, language)

  // Get a category photo for this news item
  const categoryPhoto = getCategoryPhoto(item.news_category, item.slug)
  const heroImage = item.featured_image || categoryPhoto.url
  const heroAlt = item.featured_image
    ? (language === 'en' ? (item.image_alt_en || item.headline_en) : (item.image_alt_ar || item.headline_ar))
    : (language === 'en' ? categoryPhoto.alt_en : categoryPhoto.alt_ar)

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section — real photo with dark overlay for readability       */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative min-h-[22rem] md:min-h-[26rem] overflow-hidden bg-yl-dark-navy pt-28">
        {/* Background photo */}
        <Image
          src={heroImage}
          alt={heroAlt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        {/* Dark gradient overlay for text readability — stronger at top for header area */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40" />

        <WatermarkStamp />

        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-7xl mx-auto px-7 pb-12 w-full">
            <div>
              {/* Breadcrumbs */}
              <Breadcrumbs
                items={[
                  { label: language === 'en' ? 'Home' : 'الرئيسية', href: '/' },
                  { label: language === 'en' ? 'News' : 'الأخبار', href: '/news' },
                  { label: categoryLabel },
                ]}
                className="mb-4"
              />

              {/* Section label */}
              <SectionLabel>{language === 'en' ? 'London News' : 'أخبار لندن'}</SectionLabel>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <BrandTag color={categoryTagColor} className="gap-1.5">
                  <CategoryIcon className="h-3.5 w-3.5" />
                  {categoryLabel}
                </BrandTag>

                {showUrgency && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${urgencyConfig.color}`}>
                    <urgencyConfig.icon className="h-3.5 w-3.5" />
                    {language === 'en' ? urgencyConfig.label_en : urgencyConfig.label_ar}
                  </span>
                )}

                {item.is_major && (
                  <BrandTag color="gold" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {language === 'en' ? 'Featured' : 'مميز'}
                  </BrandTag>
                )}
              </div>

              {/* Headline */}
              <h1
                className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight ${isRTL ? 'font-arabic' : 'font-heading'}`}
                style={{ textShadow: '0 2px 12px rgba(15,22,33,0.7), 0 1px 3px rgba(15,22,33,0.5)' }}
              >
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
            </div>
          </div>
        </div>
      </section>

      <TriBar />

      {/* ----------------------------------------------------------------- */}
      {/* Article Content                                                    */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-7">
          <div>
            {/* Action bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-yl-gray-200">
              <BrandButton variant="outline" href="/news" size="sm" className="border-yl-gray-200 text-yl-charcoal hover:border-yl-gold hover:text-yl-gold">
                <ArrowLeft className={`mr-2 h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                {language === 'en' ? 'Back to News' : 'العودة للأخبار'}
              </BrandButton>
              <ShareButtons title={headline} excerpt={announcement} />
            </div>

            {/* Event date range */}
            {eventDateRange && (
              <div className="mb-6 p-4 rounded-[14px] bg-yl-cream border border-yl-gray-200 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-yl-red flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-yl-gray-500">
                    {language === 'en' ? 'Event Dates' : 'تواريخ الفعالية'}
                  </span>
                  <p className="text-yl-charcoal font-semibold text-sm mt-0.5">{eventDateRange}</p>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Summary content — original commentary, fair-use compliant */}
            {/* ─────────────────────────────────────────────────────────── */}
            <div className={`text-yl-charcoal text-lg leading-relaxed mb-8 whitespace-pre-line font-body ${isRTL ? 'font-arabic' : ''}`}>
              {summary}
            </div>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Source Attribution Box — standardized format               */}
            {/* ─────────────────────────────────────────────────────────── */}
            <BrandCardLight hoverable={false} className="p-6 md:p-8 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-yl-red/10 flex items-center justify-center">
                    <Newspaper className="h-6 w-6 text-yl-red" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-yl-gray-500 mb-1">
                      {language === 'en' ? 'Source' : 'المصدر'}
                    </p>
                    <p className={`text-yl-charcoal font-semibold ${isRTL ? 'font-arabic' : 'font-heading'}`}>
                      {item.source_name}
                    </p>
                    <p className="text-xs text-yl-gray-500 mt-1">
                      {language === 'en'
                        ? `Published ${formatDate(item.published_at, language)}`
                        : `نُشر ${formatDate(item.published_at, language)}`}
                    </p>
                  </div>
                </div>

                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center font-mono tracking-wider uppercase rounded-lg transition-all duration-300 bg-yl-red text-white hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg py-2 px-4 text-[9px] flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {language === 'en' ? 'Read Original Report' : 'اقرأ التقرير الأصلي'}
                </a>
              </div>
            </BrandCardLight>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Content Integrity Footer — fair-use compliance notice      */}
            {/* ─────────────────────────────────────────────────────────── */}
            <div className="rounded-[14px] border border-yl-gray-200/50 bg-yl-gray-100/60 p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-yl-red shrink-0 mt-0.5" />
                <div className={`text-[11px] text-yl-gray-500 leading-relaxed ${isRTL ? 'font-arabic' : 'font-body'}`}>
                  <p>
                    {language === 'en'
                      ? 'This post contains original commentary and a summary of publicly reported information. For full context, read the original reporting at the linked source.'
                      : 'يحتوي هذا المنشور على تعليقات أصلية وملخص لمعلومات مُبلغ عنها علنيًا. للسياق الكامل، اقرأ التقارير الأصلية من المصدر المرتبط.'}
                  </p>
                  {item.published_at && (
                    <p className="mt-1.5 text-yl-gray-500/60">
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
                  <BrandTag key={tag} color="neutral">
                    #{tag}
                  </BrandTag>
                ))}
              </div>
            )}

            {/* "What this means for you" section — transformative value */}
            <div className="rounded-[14px] border border-yl-gold/30 bg-yl-gold/5 p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-yl-gold" />
                <h3 className={`text-sm font-bold text-yl-charcoal ${isRTL ? 'font-arabic' : 'font-heading'}`}>
                  {language === 'en' ? 'What This Means for Visitors' : 'ماذا يعني هذا للزوار'}
                </h3>
              </div>
              <p className={`text-sm text-yl-gray-500 leading-relaxed ${isRTL ? 'font-arabic' : 'font-body'}`}>
                {language === 'en'
                  ? `This ${getCategoryLabel(item.news_category, 'en').toLowerCase()} update may affect your London plans. Check the original source for the latest details, and visit our Information Hub for up-to-date travel guidance.`
                  : `قد يؤثر تحديث ${getCategoryLabel(item.news_category, 'ar')} هذا على خططك في لندن. تحقق من المصدر الأصلي لآخر التفاصيل، وقم بزيارة مركز المعلومات لدينا للحصول على إرشادات سفر محدثة.`}
              </p>
              <div className="mt-3">
                <Link
                  href="/information"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-yl-red hover:text-[#a82924] transition-colors"
                >
                  {language === 'en' ? 'Visit Information Hub' : 'زيارة مركز المعلومات'}
                  <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Related Articles                                                   */}
      {/* ----------------------------------------------------------------- */}
      {relatedArticles.length > 0 && (
        <section className="py-12 bg-yl-cream">
          <div className="max-w-7xl mx-auto px-7">
            <RelatedArticles articles={relatedArticles} currentType="blog" />
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Follow Us                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-10 bg-yl-cream border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <FollowUs variant="light" />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Bottom CTA                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-10 bg-white border-t border-yl-gray-200">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-yl-red hover:text-[#a82924] font-medium transition-colors duration-200"
          >
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            {language === 'en' ? 'Back to All News' : 'العودة لجميع الأخبار'}
          </Link>
        </div>
      </section>
    </div>
  )
}
