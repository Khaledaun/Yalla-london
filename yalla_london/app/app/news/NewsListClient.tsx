'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { NewsTicker } from '@/components/news-ticker'
import { FollowUs } from '@/components/follow-us'
import { getCategoryPhoto } from '@/data/news-photos'
import {
  Newspaper, Train, Calendar, Lightbulb, Search, AlertTriangle,
  Cloud, Heart, Music, ShoppingBag, Plane, Sparkles, Globe,
  ExternalLink, Clock, Zap, ArrowRight, ArrowLeft, Shield,
} from 'lucide-react'

type NewsItem = {
  id: string
  slug: string
  headline_en: string
  headline_ar: string
  summary_en: string
  summary_ar: string
  source_name: string
  featured_image: string | null
  news_category: string
  is_major: boolean
  urgency: string
  tags: string[]
  published_at: string
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

type NewsCategory =
  | 'transport' | 'events' | 'weather' | 'health' | 'festivals'
  | 'sales' | 'holidays' | 'strikes' | 'popup' | 'general'

const CATEGORIES = [
  { key: 'all', labelEn: 'All News', labelAr: 'كل الأخبار', icon: Newspaper },
  { key: 'transport', labelEn: 'Transport', labelAr: 'المواصلات', icon: Train },
  { key: 'events', labelEn: 'Events', labelAr: 'الفعاليات', icon: Calendar },
  { key: 'weather', labelEn: 'Weather', labelAr: 'الطقس', icon: Cloud },
  { key: 'health', labelEn: 'Health', labelAr: 'الصحة', icon: Heart },
  { key: 'festivals', labelEn: 'Festivals', labelAr: 'المهرجانات', icon: Music },
  { key: 'sales', labelEn: 'Sales', labelAr: 'التخفيضات', icon: ShoppingBag },
  { key: 'general', labelEn: 'Tips & Guides', labelAr: 'نصائح وأدلة', icon: Lightbulb },
]

const CATEGORY_ICON_MAP: Record<NewsCategory, React.ElementType> = {
  transport: Train, events: Calendar, weather: Cloud, health: Heart,
  festivals: Music, sales: ShoppingBag, holidays: Plane,
  strikes: AlertTriangle, popup: Sparkles, general: Globe,
}

const CATEGORY_LABEL: Record<NewsCategory, { en: string; ar: string }> = {
  transport: { en: 'Transport', ar: 'مواصلات' },
  events: { en: 'Events', ar: 'فعاليات' },
  weather: { en: 'Weather', ar: 'طقس' },
  health: { en: 'Health', ar: 'صحة' },
  festivals: { en: 'Festivals', ar: 'مهرجانات' },
  sales: { en: 'Sales', ar: 'تخفيضات' },
  holidays: { en: 'Holidays', ar: 'عطلات' },
  strikes: { en: 'Strikes', ar: 'إضرابات' },
  popup: { en: 'Pop-up', ar: 'مؤقت' },
  general: { en: 'General', ar: 'عام' },
}

/** Category-themed gradient thumbnails — legally safe, no copied images */
const CATEGORY_GRADIENT: Record<NewsCategory, string> = {
  transport: 'from-blue-700 via-blue-900 to-slate-900',
  events: 'from-purple-700 via-purple-900 to-slate-900',
  weather: 'from-orange-600 via-amber-800 to-slate-900',
  health: 'from-red-700 via-red-900 to-slate-900',
  festivals: 'from-green-600 via-emerald-800 to-slate-900',
  sales: 'from-pink-600 via-rose-800 to-slate-900',
  holidays: 'from-teal-600 via-teal-800 to-slate-900',
  strikes: 'from-red-800 via-red-950 to-slate-900',
  popup: 'from-indigo-600 via-indigo-800 to-slate-900',
  general: 'from-stone-600 via-stone-800 to-slate-900',
}

const CATEGORY_BADGE_COLOR: Record<NewsCategory, string> = {
  transport: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  events: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  weather: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  health: 'bg-red-500/20 text-red-300 border-red-500/30',
  festivals: 'bg-green-500/20 text-green-300 border-green-500/30',
  sales: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  holidays: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  strikes: 'bg-red-700/20 text-red-300 border-red-700/30',
  popup: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  general: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON_MAP[category as NewsCategory] ?? Globe
}

function getCategoryLabel(category: string, lang: 'en' | 'ar'): string {
  const labels = CATEGORY_LABEL[category as NewsCategory]
  return labels ? labels[lang] : category
}

function getCategoryGradient(category: string): string {
  return CATEGORY_GRADIENT[category as NewsCategory] ?? CATEGORY_GRADIENT.general
}

function getCategoryBadgeColor(category: string): string {
  return CATEGORY_BADGE_COLOR[category as NewsCategory] ?? CATEGORY_BADGE_COLOR.general
}

function timeAgo(dateStr: string, isAr: boolean): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return isAr ? 'الآن' : 'Just now'
  if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
  if (diffDays < 7) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
  return date.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { month: 'short', day: 'numeric' })
}

function truncateSummary(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsListClient({ items }: { items: NewsItem[] }) {
  const { language, isRTL } = useLanguage()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const isAr = language === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const filtered = items.filter((item) => {
    if (activeCategory !== 'all' && item.news_category !== activeCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchEn = item.headline_en.toLowerCase().includes(q) || item.summary_en.toLowerCase().includes(q)
      const matchAr = item.headline_ar.includes(searchQuery) || item.summary_ar.includes(searchQuery)
      if (!matchEn && !matchAr) return false
    }
    return true
  })

  const majorItems = filtered.filter((i) => i.is_major || i.urgency === 'breaking' || i.urgency === 'urgent')
  const regularItems = filtered.filter((i) => !i.is_major && i.urgency !== 'breaking' && i.urgency !== 'urgent')

  return (
    <div className={`min-h-screen bg-cream ${isRTL ? 'rtl font-arabic' : 'ltr font-editorial'}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ════════ Moving News Ticker ════════ */}
      <NewsTicker items={items as unknown as Parameters<typeof NewsTicker>[0]['items']} speed={50} />

      {/* ════════ Hero ════════ */}
      <section className="bg-charcoal text-cream-100 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="font-mono text-[9px] font-semibold tracking-[2px] uppercase text-yalla-gold-500 border border-yalla-gold-500/30 px-2.5 py-1 rounded">
              {isAr ? 'لندن اليوم' : 'LONDON TODAY'}
            </span>
          </div>
          <h1 className={`font-display text-4xl md:text-5xl font-bold text-cream-100 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {isAr ? 'أخبار وتحديثات لندن' : 'London News & Updates'}
          </h1>
          <p className={`font-editorial text-lg font-light text-stone max-w-2xl ${isRTL ? 'font-arabic' : ''}`}>
            {isAr
              ? 'ملخصات أصلية لأحدث أخبار لندن — مواصلات، فعاليات، نصائح سفر — مع روابط للمصادر الأصلية.'
              : 'Original summaries of the latest London news — transport, events, travel tips — with links to full original reporting.'}
          </p>
        </div>
      </section>

      {/* ════════ Filters ════════ */}
      <section className="sticky top-[52px] z-30 bg-white/95 backdrop-blur-sm border-b border-sand/40 py-3">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Category Filters — scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] font-medium tracking-[1px] uppercase transition-all duration-200 whitespace-nowrap shrink-0 ${
                      activeCategory === cat.key
                        ? 'bg-charcoal text-cream'
                        : 'bg-cream-100 text-stone hover:bg-sand/50'
                    }`}
                  >
                    <Icon size={11} />
                    {isAr ? cat.labelAr : cat.labelEn}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-stone ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث في الأخبار...' : 'Search news...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 bg-cream-100 border border-sand/40 rounded text-sm font-editorial text-charcoal placeholder:text-stone/50 focus:outline-none focus:border-yalla-gold-500 transition-colors ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════ Breaking / Major News ════════ */}
      {majorItems.length > 0 && (
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={14} className="text-red-500" />
              <span className="font-mono text-[9px] font-semibold tracking-[2px] uppercase text-red-600">
                {isAr ? 'تحديثات عاجلة' : 'BREAKING & IMPORTANT'}
              </span>
            </div>
            <div className="space-y-4">
              {majorItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                const isBreaking = item.urgency === 'breaking'
                return (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className={`block rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 group ${
                      isBreaking
                        ? 'bg-red-50 border-2 border-red-300/50'
                        : 'bg-london-600/5 border-2 border-london-600/20 hover:border-london-600/40'
                    }`}
                  >
                    <div className="flex items-stretch">
                      {/* Category photo thumbnail — curated Unsplash photos */}
                      {(() => {
                        const photo = item.featured_image ? null : getCategoryPhoto(item.news_category, item.slug)
                        return (
                          <div className="hidden sm:block w-28 md:w-36 relative shrink-0 overflow-hidden">
                            {item.featured_image ? (
                              <Image src={item.featured_image} alt={isAr ? item.headline_ar : item.headline_en} fill className="object-cover" sizes="144px" />
                            ) : photo ? (
                              <Image src={photo.thumbnail} alt={isAr ? photo.alt_ar : photo.alt_en} fill className="object-cover" sizes="144px" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(item.news_category)} flex items-center justify-center`}>
                                <Icon size={32} className="text-white/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/10" />
                          </div>
                        )
                      })()}

                      <div className="flex-1 p-5 md:p-6">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* Urgency badge */}
                          {(item.urgency === 'breaking' || item.urgency === 'urgent') && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              isBreaking ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                            }`}>
                              <Zap size={9} />
                              {isBreaking ? (isAr ? 'عاجل' : 'BREAKING') : (isAr ? 'مهم' : 'URGENT')}
                            </span>
                          )}
                          <span className={`font-mono text-[8px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded border bg-white/80 ${getCategoryBadgeColor(item.news_category).replace(/text-\w+-300/g, (m) => m.replace('300', '700')).replace(/bg-\w+-500\/20/g, (m) => m.replace('500/20', '100')).replace(/border-\w+-500\/30/g, (m) => m.replace('500/30', '300'))}`}>
                            {getCategoryLabel(item.news_category, isAr ? 'ar' : 'en')}
                          </span>
                          <span className="font-mono text-[8px] text-stone tracking-[1px]">
                            {timeAgo(item.published_at, isAr)}
                          </span>
                          <span className="font-mono text-[8px] text-stone tracking-[1px]">
                            · {item.source_name}
                          </span>
                        </div>
                        <h2 className={`font-display text-lg md:text-xl font-bold text-charcoal group-hover:text-london-600 transition-colors mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                          {isAr ? item.headline_ar : item.headline_en}
                        </h2>
                        <p className={`font-editorial text-sm font-light text-stone line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
                          {truncateSummary(isAr ? item.summary_ar : item.summary_en, 200)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ════════ Regular News Grid ════════ */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          {regularItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                return (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="group bg-white border border-sand/40 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Tri-color bar */}
                    <div className="flex h-[3px] w-full">
                      <div className="flex-1 bg-london-600" />
                      <div className="flex-1 bg-yalla-gold-500" />
                      <div className="flex-1 bg-thames-500" />
                    </div>

                    {/* Category photo thumbnail — curated Unsplash photos */}
                    {(() => {
                      const photo = item.featured_image ? null : getCategoryPhoto(item.news_category, item.slug)
                      return (
                        <div className="h-40 relative overflow-hidden">
                          {item.featured_image ? (
                            <Image src={item.featured_image} alt={isAr ? item.headline_ar : item.headline_en} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                          ) : photo ? (
                            <Image src={photo.url} alt={isAr ? photo.alt_ar : photo.alt_en} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(item.news_category)} flex items-center justify-center`}>
                              <Icon size={48} className="text-white/15" />
                            </div>
                          )}
                          {/* Gradient overlay for readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {/* Category badge */}
                          <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} font-mono text-[8px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded border backdrop-blur-sm ${getCategoryBadgeColor(item.news_category)}`}>
                            {getCategoryLabel(item.news_category, isAr ? 'ar' : 'en')}
                          </span>
                        </div>
                      )
                    })()}

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={10} className="text-stone/50" />
                        <span className="font-mono text-[8px] text-stone tracking-[1px]">
                          {timeAgo(item.published_at, isAr)}
                        </span>
                        <span className="font-mono text-[8px] text-stone tracking-[1px]">
                          · {item.source_name}
                        </span>
                      </div>
                      <h3 className={`font-display text-base font-bold text-charcoal group-hover:text-london-600 transition-colors mb-2 line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
                        {isAr ? item.headline_ar : item.headline_en}
                      </h3>
                      <p className={`font-editorial text-[11px] font-light text-stone line-clamp-3 mb-3 ${isRTL ? 'font-arabic' : ''}`}>
                        {truncateSummary(isAr ? item.summary_ar : item.summary_en, 160)}
                      </p>

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="font-mono text-[7px] tracking-[1px] uppercase text-stone/60 bg-cream-100 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Boarding pass footer */}
                    <div className="border-t border-dashed border-sand/40 px-5 py-2.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-[7px] tracking-[1.5px] uppercase text-stone/50">
                        {isAr ? 'اقرأ المزيد' : 'READ MORE'}
                        <ArrowIcon size={8} />
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[7px] tracking-[1.5px] uppercase text-stone/50">
                        <ExternalLink size={7} />
                        {isAr ? 'المصدر' : 'SOURCE'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Newspaper size={48} className="mx-auto text-stone/30 mb-4" />
              <h3 className={`font-display text-xl font-bold text-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {isAr ? 'لا توجد أخبار' : 'No news found'}
              </h3>
              <p className={`font-editorial text-sm font-light text-stone ${isRTL ? 'font-arabic' : ''}`}>
                {isAr
                  ? 'جرب تغيير الفئة أو مصطلح البحث.'
                  : 'Try changing the category or search term.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ════════ Content Integrity Notice ════════ */}
      <section className="py-6 border-t border-sand/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-cream-100/80 border border-sand/30">
            <Shield size={16} className="text-london-600 shrink-0 mt-0.5" />
            <p className={`text-[11px] text-stone leading-relaxed ${isRTL ? 'font-arabic' : 'font-editorial'}`}>
              {isAr
                ? 'يحتوي هذا القسم على ملخصات وتعليقات أصلية لمعلومات مُبلغ عنها علنيًا. للسياق الكامل، اقرأ التقارير الأصلية من المصادر المرتبطة.'
                : 'This section contains original commentary and summaries of publicly reported information. For full context, read the original reporting at the linked sources.'}
            </p>
          </div>
        </div>
      </section>

      {/* ════════ CTA Section ════════ */}
      <section className="py-16 bg-charcoal">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`font-display text-2xl md:text-3xl font-bold text-cream-100 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {isAr ? 'هل تريد المزيد من نصائح لندن؟' : 'Want More London Tips?'}
          </h2>
          <p className={`font-editorial text-base font-light text-stone mb-8 max-w-xl mx-auto ${isRTL ? 'font-arabic' : ''}`}>
            {isAr
              ? 'استكشف أدلتنا المتعمقة ومقالاتنا وتوصياتنا المنسقة لتحقيق أقصى استفادة من زيارتك للندن.'
              : 'Explore our in-depth guides, articles, and curated recommendations to make the most of your London visit.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/information"
              className={`px-6 py-3 bg-london-600 text-cream rounded font-mono text-[10px] font-semibold uppercase transition-all duration-200 hover:bg-london-700 ${isRTL ? 'font-arabic tracking-normal text-sm normal-case' : 'tracking-[1.5px]'}`}
            >
              {isAr ? 'مركز المعلومات' : 'Information Hub'}
            </Link>
            <Link
              href="/blog"
              className={`px-6 py-3 bg-transparent border border-cream-100/30 text-cream-100 rounded font-mono text-[10px] font-semibold uppercase transition-all duration-200 hover:bg-cream-100/10 ${isRTL ? 'font-arabic tracking-normal text-sm normal-case' : 'tracking-[1.5px]'}`}
            >
              {isAr ? 'حكايات لندن' : 'London Stories'}
            </Link>
          </div>
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  )
}
