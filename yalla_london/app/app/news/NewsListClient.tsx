'use client'

import Link from 'next/link'
import Image from 'next/image'
import React, { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { NewsTicker } from '@/components/news-ticker'
import { FollowUs } from '@/components/follow-us'
import { getCategoryPhoto } from '@/data/news-photos'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'
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

const CATEGORY_TAG_COLOR: Record<NewsCategory, 'red' | 'gold' | 'blue' | 'neutral'> = {
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

function getCategoryTagColor(category: string): 'red' | 'gold' | 'blue' | 'neutral' {
  return CATEGORY_TAG_COLOR[category as NewsCategory] ?? 'neutral'
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
    <div className={`min-h-screen bg-yl-cream ${isRTL ? 'rtl font-arabic' : 'ltr font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ════════ Moving News Ticker ════════ */}
      <NewsTicker items={items as unknown as Parameters<typeof NewsTicker>[0]['items']} speed={50} />

      {/* ════════ Hero ════════ */}
      <section className="relative bg-yl-dark-navy text-yl-gray-100 py-12 md:py-16 pt-28">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: isAr ? 'الرئيسية' : 'Home', href: '/' },
              { label: isAr ? 'الأخبار' : 'News' },
            ]}
            className="mb-4"
          />

          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yl-red opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yl-red" />
            </span>
            <SectionLabel className="mb-0">{isAr ? 'لندن اليوم' : 'LONDON TODAY'}</SectionLabel>
          </div>
          <h1 className={`font-heading text-4xl md:text-5xl font-bold text-yl-gray-100 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {isAr ? 'أخبار وتحديثات لندن' : 'London News & Updates'}
          </h1>
          <p className={`font-body text-lg font-light text-yl-gray-500 max-w-2xl ${isRTL ? 'font-arabic' : ''}`}>
            {isAr
              ? 'ملخصات أصلية لأحدث أخبار لندن — مواصلات، فعاليات، نصائح سفر — مع روابط للمصادر الأصلية.'
              : 'Original summaries of the latest London news — transport, events, travel tips — with links to full original reporting.'}
          </p>
        </div>
      </section>

      <TriBar />

      {/* ════════ Filters ════════ */}
      <section className="sticky top-[52px] z-30 bg-white/95 backdrop-blur-sm border-b border-yl-gray-200/40 py-3">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Category Filters — scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] font-body text-[11px] font-medium tracking-[1px] uppercase transition-all duration-200 whitespace-nowrap shrink-0 ${
                      activeCategory === cat.key
                        ? 'bg-yl-dark-navy text-cream'
                        : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200/50'
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
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-yl-gray-500 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث في الأخبار...' : 'Search news...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 bg-yl-gray-100 border border-yl-gray-200/40 rounded-[14px] text-sm font-body text-yl-charcoal placeholder:text-yl-gray-500/50 focus:outline-none focus:border-yl-gold transition-colors ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════ Breaking / Major News ════════ */}
      {majorItems.length > 0 && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-7">
            <div className="flex items-center gap-2 mb-5">
              <Zap size={14} className="text-yl-red" />
              <span className="font-body text-[11px] font-semibold tracking-[2px] uppercase text-yl-red">
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
                    className={`block rounded-[14px] overflow-hidden hover:shadow-lg transition-all duration-200 group ${
                      isBreaking
                        ? 'bg-yl-red/5 border-2 border-yl-red/30'
                        : 'bg-yl-red/5 border-2 border-yl-red/20 hover:border-yl-red/40'
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
                              <div className="w-full h-full bg-yl-dark-navy flex items-center justify-center">
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
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[14px] text-[11px] font-bold uppercase tracking-wider ${
                              isBreaking ? 'bg-yl-red text-white' : 'bg-yl-gold text-yl-charcoal'
                            }`}>
                              <Zap size={9} />
                              {isBreaking ? (isAr ? 'عاجل' : 'BREAKING') : (isAr ? 'مهم' : 'URGENT')}
                            </span>
                          )}
                          <BrandTag color={getCategoryTagColor(item.news_category)}>
                            {getCategoryLabel(item.news_category, isAr ? 'ar' : 'en')}
                          </BrandTag>
                          <span className="font-body text-[11px] text-yl-gray-500 tracking-[1px]">
                            {timeAgo(item.published_at, isAr)}
                          </span>
                          <span className="font-body text-[11px] text-yl-gray-500 tracking-[1px]">
                            · {item.source_name}
                          </span>
                        </div>
                        <h2 className={`font-heading text-lg md:text-xl font-bold text-yl-charcoal group-hover:text-yl-red transition-colors mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                          {isAr ? item.headline_ar : item.headline_en}
                        </h2>
                        <p className={`font-body text-sm font-light text-yl-gray-500 line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
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
        <div className="max-w-7xl mx-auto px-7">
          {regularItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                return (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="group bg-white border border-yl-gray-200/40 rounded-[14px] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Tri-color bar */}
                    <TriBar />

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
                            <div className="w-full h-full bg-yl-dark-navy flex items-center justify-center">
                              <Icon size={48} className="text-white/15" />
                            </div>
                          )}
                          {/* Gradient overlay for readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {/* Category badge */}
                          <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                            <BrandTag color={getCategoryTagColor(item.news_category)}>
                              {getCategoryLabel(item.news_category, isAr ? 'ar' : 'en')}
                            </BrandTag>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock size={10} className="text-yl-gray-500/50" />
                        <span className="font-body text-[11px] text-yl-gray-500 tracking-[1px]">
                          {timeAgo(item.published_at, isAr)}
                        </span>
                        <span className="font-body text-[11px] text-yl-gray-500 tracking-[1px]">
                          · {item.source_name}
                        </span>
                      </div>
                      <h3 className={`font-heading text-base font-bold text-yl-charcoal group-hover:text-yl-red transition-colors mb-2 line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
                        {isAr ? item.headline_ar : item.headline_en}
                      </h3>
                      <p className={`font-body text-[11px] font-light text-yl-gray-500 line-clamp-3 mb-3 ${isRTL ? 'font-arabic' : ''}`}>
                        {truncateSummary(isAr ? item.summary_ar : item.summary_en, 160)}
                      </p>

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 3).map((tag) => (
                            <BrandTag key={tag} color="neutral" className="text-[9px]">
                              {tag}
                            </BrandTag>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Boarding pass footer */}
                    <div className="border-t border-dashed border-yl-gray-200/40 px-5 py-2.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-body text-[11px] tracking-[1.5px] uppercase text-yl-gray-500/50">
                        {isAr ? 'اقرأ المزيد' : 'READ MORE'}
                        <ArrowIcon size={8} />
                      </span>
                      <span className="inline-flex items-center gap-1 font-body text-[11px] tracking-[1.5px] uppercase text-yl-gray-500/50">
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
              <Newspaper size={48} className="mx-auto text-yl-gray-500/30 mb-4" />
              <h3 className={`font-heading text-xl font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                {isAr ? 'لا توجد أخبار' : 'No news found'}
              </h3>
              <p className={`font-body text-sm font-light text-yl-gray-500 ${isRTL ? 'font-arabic' : ''}`}>
                {isAr
                  ? 'جرب تغيير الفئة أو مصطلح البحث.'
                  : 'Try changing the category or search term.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ════════ Content Integrity Notice ════════ */}
      <section className="py-6 border-t border-yl-gray-200/40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-start gap-3 p-4 rounded-[14px] bg-yl-gray-100/80 border border-yl-gray-200/30">
            <Shield size={16} className="text-yl-red shrink-0 mt-0.5" />
            <p className={`text-[11px] text-yl-gray-500 leading-relaxed ${isRTL ? 'font-arabic' : 'font-body'}`}>
              {isAr
                ? 'يحتوي هذا القسم على ملخصات وتعليقات أصلية لمعلومات مُبلغ عنها علنيًا. للسياق الكامل، اقرأ التقارير الأصلية من المصادر المرتبطة.'
                : 'This section contains original commentary and summaries of publicly reported information. For full context, read the original reporting at the linked sources.'}
            </p>
          </div>
        </div>
      </section>

      {/* ════════ CTA Section ════════ */}
      <section className="relative py-16 bg-yl-dark-navy">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <h2 className={`font-heading text-2xl md:text-3xl font-bold text-yl-gray-100 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {isAr ? 'هل تريد المزيد من نصائح لندن؟' : 'Want More London Tips?'}
          </h2>
          <p className={`font-body text-base font-light text-yl-gray-500 mb-8 max-w-xl mx-auto ${isRTL ? 'font-arabic' : ''}`}>
            {isAr
              ? 'استكشف أدلتنا المتعمقة ومقالاتنا وتوصياتنا المنسقة لتحقيق أقصى استفادة من زيارتك للندن.'
              : 'Explore our in-depth guides, articles, and curated recommendations to make the most of your London visit.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <BrandButton variant="primary" href="/information" size="md">
              {isAr ? 'مركز المعلومات' : 'Information Hub'}
            </BrandButton>
            <BrandButton variant="outline" href="/blog" size="md">
              {isAr ? 'حكايات لندن' : 'London Stories'}
            </BrandButton>
          </div>
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  )
}
