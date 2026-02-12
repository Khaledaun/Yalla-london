'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { Newspaper, Train, Calendar, Lightbulb, Search, AlertTriangle } from 'lucide-react'
import { FollowUs } from '@/components/follow-us'

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

const CATEGORIES = [
  { key: 'all', labelEn: 'All News', labelAr: 'كل الأخبار', icon: Newspaper },
  { key: 'transport', labelEn: 'Transport', labelAr: 'المواصلات', icon: Train },
  { key: 'events', labelEn: 'Events', labelAr: 'الفعاليات', icon: Calendar },
  { key: 'general', labelEn: 'Tips & Guides', labelAr: 'نصائح وأدلة', icon: Lightbulb },
]

function getCategoryIcon(category: string) {
  switch (category) {
    case 'transport': return Train
    case 'events': return Calendar
    case 'general': return Lightbulb
    default: return Newspaper
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'transport': return 'bg-thames-500/10 text-thames-600 border-thames-500/20'
    case 'events': return 'bg-yalla-gold-500/10 text-yalla-gold-600 border-yalla-gold-500/20'
    case 'general': return 'bg-london-600/10 text-london-600 border-london-600/20'
    default: return 'bg-stone/10 text-stone border-stone/20'
  }
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

export default function NewsListClient({ items }: { items: NewsItem[] }) {
  const { language, isRTL } = useLanguage()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const isAr = language === 'ar'

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

  const majorItems = filtered.filter((i) => i.is_major)
  const regularItems = filtered.filter((i) => !i.is_major)

  return (
    <div className={`min-h-screen bg-cream ${isRTL ? 'rtl font-arabic' : 'ltr font-editorial'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="bg-charcoal text-cream-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[9px] font-semibold tracking-[2px] uppercase text-yalla-gold-500 border border-yalla-gold-500/30 px-2.5 py-1 rounded">
              {isAr ? 'لندن اليوم' : 'LONDON TODAY'}
            </span>
          </div>
          <h1 className={`font-display text-4xl md:text-5xl font-bold text-cream-100 mb-4 ${isRTL ? 'font-arabic' : ''}`}>
            {isAr ? 'أخبار لندن' : 'London News & Updates'}
          </h1>
          <p className={`font-editorial text-lg font-light text-stone max-w-2xl ${isRTL ? 'font-arabic' : ''}`}>
            {isAr
              ? 'ابق على اطلاع بآخر أخبار لندن وتحديثات المواصلات والفعاليات والنصائح المنسقة خصيصاً للزوار العرب.'
              : 'Stay informed with the latest London news, transport updates, events, and travel tips curated for Arab visitors.'}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-[52px] z-30 bg-white/95 backdrop-blur-sm border-b border-sand/40 py-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] font-medium tracking-[1px] uppercase transition-all duration-200 ${
                      activeCategory === cat.key
                        ? 'bg-charcoal text-cream'
                        : 'bg-cream-100 text-stone hover:bg-sand/50'
                    }`}
                  >
                    <Icon size={12} />
                    {isAr ? cat.labelAr : cat.labelEn}
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <input
                type="text"
                placeholder={isAr ? 'بحث في الأخبار...' : 'Search news...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-cream-100 border border-sand/40 rounded text-sm font-editorial text-charcoal placeholder:text-stone/50 focus:outline-none focus:border-yalla-gold-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Major / Breaking News */}
      {majorItems.length > 0 && (
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-london-600" />
              <span className="font-mono text-[9px] font-semibold tracking-[2px] uppercase text-london-600">
                {isAr ? 'أخبار عاجلة' : 'IMPORTANT UPDATES'}
              </span>
            </div>
            <div className="space-y-4">
              {majorItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                return (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="block bg-london-600/5 border-2 border-london-600/20 rounded-lg p-6 hover:border-london-600/40 transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded bg-london-600/10 flex items-center justify-center">
                        <Icon size={18} className="text-london-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-mono text-[8px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded border ${getCategoryColor(item.news_category)}`}>
                            {item.news_category}
                          </span>
                          <span className="font-mono text-[8px] text-stone tracking-[1px]">
                            {timeAgo(item.published_at, isAr)}
                          </span>
                          <span className="font-mono text-[8px] text-stone tracking-[1px]">
                            · {item.source_name}
                          </span>
                        </div>
                        <h2 className={`font-display text-xl font-bold text-charcoal group-hover:text-london-600 transition-colors mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                          {isAr ? item.headline_ar : item.headline_en}
                        </h2>
                        <p className={`font-editorial text-sm font-light text-stone line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
                          {isAr ? item.summary_ar : item.summary_en}
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

      {/* Regular News Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          {regularItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularItems.map((item) => {
                const Icon = getCategoryIcon(item.news_category)
                return (
                  <Link
                    key={item.id}
                    href={`/news/${item.slug}`}
                    className="group bg-white border border-sand/40 rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Tri-color bar */}
                    <div className="flex h-[3px] w-full">
                      <div className="flex-1 bg-london-600" />
                      <div className="flex-1 bg-yalla-gold-500" />
                      <div className="flex-1 bg-thames-500" />
                    </div>

                    {/* Card Image or Gradient */}
                    <div className="h-36 bg-gradient-to-br from-charcoal to-graphite flex items-center justify-center relative overflow-hidden">
                      {item.featured_image ? (
                        <img
                          src={item.featured_image}
                          alt={isAr ? item.headline_ar : item.headline_en}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon size={40} className="text-stone/30" />
                      )}
                      {/* Category badge */}
                      <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} font-mono text-[8px] font-semibold tracking-[1.5px] uppercase px-2 py-0.5 rounded border bg-white/90 backdrop-blur-sm ${getCategoryColor(item.news_category)}`}>
                        {item.news_category}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
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
                      <p className={`font-editorial text-[11px] font-light text-stone line-clamp-3 ${isRTL ? 'font-arabic' : ''}`}>
                        {isAr ? item.summary_ar : item.summary_en}
                      </p>

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
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
                      <span className="font-mono text-[7px] tracking-[1.5px] uppercase text-stone/50">
                        {isAr ? 'اقرأ المزيد' : 'READ MORE'}
                      </span>
                      <span className="font-mono text-[7px] tracking-[1.5px] uppercase text-stone/50">
                        GATE Y · NEWS
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

      {/* CTA Section */}
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
