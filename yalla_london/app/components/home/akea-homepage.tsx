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
const defaultArticles = {
  en: [
    {
      id: '1',
      title: 'Best Halal Restaurants in Central London',
      slug: 'best-halal-restaurants-central-london',
      excerpt: 'Discover the finest halal dining experiences in the heart of London. From Middle Eastern cuisine to Pakistani flavors, we\'ve got you covered.',
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'Sarah Ahmed' },
      category: { name: 'Food', slug: 'food' },
      likes: 245
    },
    {
      id: '2',
      title: 'A Weekend Guide to East London',
      slug: 'weekend-guide-east-london',
      excerpt: 'Explore the vibrant streets of Shoreditch, Brick Lane, and beyond. East London offers an incredible mix of cultures, cuisines, and creativity.',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      author: { name: 'Omar Hassan' },
      category: { name: 'Travel', slug: 'travel' },
      likes: 189
    },
    {
      id: '3',
      title: 'Top Cultural Events in London This Month',
      slug: 'cultural-events-london-month',
      excerpt: 'From art exhibitions to food festivals, discover the best cultural events happening in London this month.',
      featuredImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      author: { name: 'Layla Mahmoud' },
      category: { name: 'Events', slug: 'events' },
      likes: 156
    },
    {
      id: '4',
      title: 'Hidden Gems: Markets You Must Visit',
      slug: 'hidden-gems-markets-london',
      excerpt: 'Beyond Borough Market lies a world of incredible local markets. Discover where Londoners really shop for food and fashion.',
      featuredImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      author: { name: 'Ahmed Khan' },
      category: { name: 'Shopping', slug: 'shopping' },
      likes: 203
    },
    {
      id: '5',
      title: 'Family-Friendly Activities in London',
      slug: 'family-friendly-activities-london',
      excerpt: 'Planning a family day out? Here are the best activities and attractions that kids and parents will both love.',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      author: { name: 'Fatima Ali' },
      category: { name: 'Lifestyle', slug: 'lifestyle' },
      likes: 178
    },
    {
      id: '6',
      title: 'The Best Shisha Lounges in London',
      slug: 'best-shisha-lounges-london',
      excerpt: 'Looking for a relaxing evening with great shisha? We\'ve rounded up London\'s best spots for an authentic experience.',
      featuredImage: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      author: { name: 'Yusuf Ibrahim' },
      category: { name: 'Lifestyle', slug: 'lifestyle' },
      likes: 312
    }
  ],
  ar: [
    {
      id: '1',
      title: 'أفضل المطاعم الحلال في وسط لندن',
      slug: 'best-halal-restaurants-central-london',
      excerpt: 'اكتشف أفضل تجارب الطعام الحلال في قلب لندن. من المطبخ الشرق أوسطي إلى النكهات الباكستانية، لدينا كل ما تحتاجه.',
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'سارة أحمد' },
      category: { name: 'طعام', slug: 'food' },
      likes: 245
    },
    {
      id: '2',
      title: 'دليل عطلة نهاية الأسبوع في شرق لندن',
      slug: 'weekend-guide-east-london',
      excerpt: 'استكشف شوارع شورديتش وبريك لين النابضة بالحياة وما وراءها. شرق لندن يقدم مزيجاً رائعاً من الثقافات والمأكولات والإبداع.',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      author: { name: 'عمر حسن' },
      category: { name: 'سفر', slug: 'travel' },
      likes: 189
    },
    {
      id: '3',
      title: 'أفضل الفعاليات الثقافية في لندن هذا الشهر',
      slug: 'cultural-events-london-month',
      excerpt: 'من المعارض الفنية إلى مهرجانات الطعام، اكتشف أفضل الفعاليات الثقافية التي تحدث في لندن هذا الشهر.',
      featuredImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      author: { name: 'ليلى محمود' },
      category: { name: 'فعاليات', slug: 'events' },
      likes: 156
    },
    {
      id: '4',
      title: 'جواهر مخفية: أسواق يجب زيارتها',
      slug: 'hidden-gems-markets-london',
      excerpt: 'وراء سوق بورو يكمن عالم من الأسواق المحلية الرائعة. اكتشف أين يتسوق سكان لندن حقاً للطعام والأزياء.',
      featuredImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      author: { name: 'أحمد خان' },
      category: { name: 'تسوق', slug: 'shopping' },
      likes: 203
    },
    {
      id: '5',
      title: 'أنشطة مناسبة للعائلات في لندن',
      slug: 'family-friendly-activities-london',
      excerpt: 'هل تخطط ليوم عائلي؟ إليك أفضل الأنشطة والمعالم السياحية التي سيحبها الأطفال والآباء على حد سواء.',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      author: { name: 'فاطمة علي' },
      category: { name: 'نمط الحياة', slug: 'lifestyle' },
      likes: 178
    },
    {
      id: '6',
      title: 'أفضل صالات الشيشة في لندن',
      slug: 'best-shisha-lounges-london',
      excerpt: 'هل تبحث عن أمسية مريحة مع شيشة رائعة؟ جمعنا لك أفضل الأماكن في لندن لتجربة أصيلة.',
      featuredImage: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=1200&h=675&fit=crop&q=80',
      publishedAt: new Date(Date.now() - 432000000).toISOString(),
      author: { name: 'يوسف إبراهيم' },
      category: { name: 'نمط الحياة', slug: 'lifestyle' },
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
