'use client'

import React, { useEffect, useState } from 'react'
import { AkeaHeader } from './akea-header'
import { HeroSlider } from './hero-slider'
import { BlogCard } from './blog-card'
import { Sidebar } from './sidebar'
import { AkeaFooter } from './akea-footer'

interface Article {
  id: string
  title: string
  slug: string
  excerpt?: string
  featuredImage?: string
  publishedAt?: string
  author?: {
    name: string
    avatar?: string
  }
  category?: {
    name: string
    slug: string
  }
  likes?: number
}

interface AkeaHomepageProps {
  locale?: 'en' | 'ar'
  initialArticles?: Article[]
  featuredArticles?: Article[]
  showHeader?: boolean
  showFooter?: boolean
}

// Default London-focused articles with high quality images
// These slugs match actual blog posts in data/blog-content.ts and data/blog-content-extended.ts
const defaultArticles = {
  en: [
    {
      id: '1',
      title: 'Best Halal Restaurants in Central London 2025',
      slug: 'best-halal-restaurants-central-london-2025',
      excerpt: 'Discover the finest halal dining experiences in the heart of London. From Mayfair fine dining to quick bites in Soho, our curated list of the best halal restaurants.',
      featuredImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Restaurants', slug: 'restaurants' },
      likes: 245
    },
    {
      id: '2',
      title: 'First Time in London? Complete 2025 Guide for Arab Visitors',
      slug: 'first-time-london-guide-arab-tourists-2025',
      excerpt: 'Everything Arab tourists need to know before visiting London. Visa requirements, best areas to stay, halal food guide, prayer facilities, and money-saving tips.',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Travel Guides', slug: 'guides' },
      likes: 189
    },
    {
      id: '3',
      title: 'London New Year\'s Eve Fireworks 2025: A Spectacular Night',
      slug: 'london-new-years-eve-fireworks-2025-complete-guide',
      excerpt: 'Experience the magic of London\'s iconic New Year\'s Eve fireworks display. Learn how to get tickets for next year and what to expect.',
      featuredImage: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Events', slug: 'events' },
      likes: 156
    },
    {
      id: '4',
      title: 'Harrods vs Selfridges 2025: Which is Better?',
      slug: 'harrods-vs-selfridges-which-better-2025',
      excerpt: 'Detailed comparison of London\'s two iconic department stores. Compare brands, prices, services, and which is better for Arab shoppers.',
      featuredImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Shopping', slug: 'shopping' },
      likes: 203
    },
    {
      id: '5',
      title: '20 Best London Attractions for Arab Families 2025',
      slug: 'best-london-attractions-arab-families-2025',
      excerpt: 'From the Tower of London to Harry Potter Studios. Complete guide to family-friendly attractions with prayer facilities, halal food, and Arabic tours.',
      featuredImage: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Attractions', slug: 'attractions' },
      likes: 178
    },
    {
      id: '6',
      title: 'Best Shisha Lounges in London 2025: Complete Guide',
      slug: 'best-shisha-lounges-london',
      excerpt: 'Discover London\'s finest shisha lounges. From luxury rooftop terraces to authentic Arabic cafes, find the perfect spot for premium shisha.',
      featuredImage: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      author: { name: 'Yalla London Editorial' },
      category: { name: 'Restaurants', slug: 'restaurants' },
      likes: 312
    }
  ],
  ar: [
    {
      id: '1',
      title: 'أفضل المطاعم الحلال في وسط لندن 2025',
      slug: 'best-halal-restaurants-central-london-2025',
      excerpt: 'اكتشف أفضل تجارب الطعام الحلال في قلب لندن. من المطاعم الفاخرة في مايفير إلى الوجبات السريعة في سوهو.',
      featuredImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'مطاعم', slug: 'restaurants' },
      likes: 245
    },
    {
      id: '2',
      title: 'أول مرة في لندن؟ دليل 2025 الشامل للزوار العرب',
      slug: 'first-time-london-guide-arab-tourists-2025',
      excerpt: 'كل ما يحتاج السياح العرب معرفته قبل زيارة لندن. متطلبات التأشيرة وأفضل مناطق الإقامة ودليل الطعام الحلال.',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'أدلة السفر', slug: 'guides' },
      likes: 189
    },
    {
      id: '3',
      title: 'ألعاب نارية ليلة رأس السنة في لندن 2025',
      slug: 'london-new-years-eve-fireworks-2025-complete-guide',
      excerpt: 'اكتشف سحر عرض الألعاب النارية الأيقوني في ليلة رأس السنة بلندن. تعرف على كيفية الحصول على التذاكر.',
      featuredImage: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'فعاليات', slug: 'events' },
      likes: 156
    },
    {
      id: '4',
      title: 'هارودز مقابل سيلفريدجز 2025: أيهما أفضل؟',
      slug: 'harrods-vs-selfridges-which-better-2025',
      excerpt: 'مقارنة تفصيلية بين متجري لندن الشهيرين. قارن العلامات التجارية والأسعار والخدمات.',
      featuredImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'تسوق', slug: 'shopping' },
      likes: 203
    },
    {
      id: '5',
      title: 'أفضل 20 معلم سياحي في لندن للعائلات العربية 2025',
      slug: 'best-london-attractions-arab-families-2025',
      excerpt: 'من برج لندن إلى استوديوهات هاري بوتر. دليل شامل للمعالم المناسبة للعائلات مع مرافق الصلاة والطعام الحلال.',
      featuredImage: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'معالم', slug: 'attractions' },
      likes: 178
    },
    {
      id: '6',
      title: 'أفضل صالات الشيشة في لندن 2025: دليل شامل',
      slug: 'best-shisha-lounges-london',
      excerpt: 'اكتشف أفضل صالات الشيشة في لندن. من التراسات الفاخرة إلى المقاهي العربية الأصيلة.',
      featuredImage: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'مطاعم', slug: 'restaurants' },
      likes: 312
    }
  ]
}

export function AkeaHomepage({ locale = 'en', initialArticles, featuredArticles, showHeader = false, showFooter = false }: AkeaHomepageProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles || defaultArticles[locale])
  const [featured, setFeatured] = useState<Article[]>(featuredArticles || defaultArticles[locale].slice(0, 3))
  const [loading, setLoading] = useState(!initialArticles)
  const [page, setPage] = useState(1)

  const isRTL = locale === 'ar'

  // Fetch articles from API
  useEffect(() => {
    if (initialArticles) return

    const fetchArticles = async () => {
      try {
        const response = await fetch(`/api/articles?locale=${locale}&limit=6&page=1`)
        if (response.ok) {
          const data = await response.json()
          if (data.articles && data.articles.length > 0) {
            setArticles(data.articles)
            setFeatured(data.articles.slice(0, 3))
          }
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [locale, initialArticles])

  const loadMore = async () => {
    const nextPage = page + 1
    try {
      const response = await fetch(`/api/articles?locale=${locale}&limit=6&page=${nextPage}`)
      if (response.ok) {
        const data = await response.json()
        if (data.articles && data.articles.length > 0) {
          setArticles(prev => [...prev, ...data.articles])
          setPage(nextPage)
        }
      }
    } catch (error) {
      console.error('Failed to load more articles:', error)
    }
  }

  const text = {
    en: {
      loadMore: 'Load More Articles',
      loading: 'Loading...',
      latestStories: 'Latest Stories',
    },
    ar: {
      loadMore: 'تحميل المزيد من المقالات',
      loading: 'جاري التحميل...',
      latestStories: 'أحدث القصص',
    }
  }

  const t = text[locale]

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-cream-950" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header - only show if explicitly enabled */}
      {showHeader && <AkeaHeader locale={locale} />}

      {/* Hero Slider */}
      <div className={showHeader ? "pt-24 lg:pt-32" : "pt-0"}>
        <HeroSlider articles={featured} locale={locale} />
      </div>

      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-warm-charcoal dark:text-cream-100 px-4">
            {t.latestStories}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Blog Posts */}
          <div className="lg:col-span-2 space-y-10">
            {loading ? (
              // Loading skeleton
              <div className="space-y-10">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-elegant p-0 overflow-hidden animate-pulse">
                    <div className="aspect-[16/9] bg-cream-200 dark:bg-cream-800" />
                    <div className="p-6 space-y-4">
                      <div className="h-8 bg-cream-200 dark:bg-cream-800 rounded w-3/4" />
                      <div className="h-4 bg-cream-200 dark:bg-cream-800 rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-4 bg-cream-200 dark:bg-cream-800 rounded w-full" />
                        <div className="h-4 bg-cream-200 dark:bg-cream-800 rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {articles.map((article) => (
                  <BlogCard
                    key={article.id}
                    article={article}
                    locale={locale}
                  />
                ))}

                {/* Load More Button */}
                <div className="text-center pt-8">
                  <button
                    onClick={loadMore}
                    className="px-8 py-3.5 bg-burgundy-800 text-white rounded-lg font-semibold shadow-luxury hover:bg-burgundy-700 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
                  >
                    {t.loadMore}
                  </button>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 pt-6">
                  <span className="w-10 h-10 rounded-xl bg-burgundy-800 text-white flex items-center justify-center text-sm font-semibold shadow-luxury">
                    {page}
                  </span>
                  <span className="w-10 h-10 rounded-xl bg-cream-200 dark:bg-cream-800 text-warm-charcoal dark:text-cream-200 flex items-center justify-center text-sm font-medium hover:bg-gold-400 hover:text-burgundy-900 cursor-pointer transition-all duration-300">
                    {page + 1}
                  </span>
                  <span className="w-10 h-10 rounded-xl bg-cream-200 dark:bg-cream-800 text-warm-charcoal dark:text-cream-200 flex items-center justify-center text-sm font-medium hover:bg-gold-400 hover:text-burgundy-900 cursor-pointer transition-all duration-300">
                    {page + 2}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar locale={locale} />
          </div>
        </div>
      </main>

      {/* Footer - only show if explicitly enabled */}
      {showFooter && <AkeaFooter locale={locale} />}
    </div>
  )
}
