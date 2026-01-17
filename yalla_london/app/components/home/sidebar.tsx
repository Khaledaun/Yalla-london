'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Twitter, Youtube, Send, ArrowRight } from 'lucide-react'
import { BlogCard } from './blog-card'

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
}

interface Category {
  name: string
  slug: string
  count: number
  image?: string
}

interface SidebarProps {
  popularArticles?: Article[]
  categories?: Category[]
  tags?: string[]
  locale?: 'en' | 'ar'
}

const defaultCategories = {
  en: [
    { name: 'Food & Dining', slug: 'food', count: 24, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop&q=80' },
    { name: 'Travel', slug: 'travel', count: 18, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80' },
    { name: 'Events', slug: 'events', count: 12, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop&q=80' },
    { name: 'Shopping', slug: 'shopping', count: 15, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&q=80' },
    { name: 'Lifestyle', slug: 'lifestyle', count: 21, image: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=400&h=400&fit=crop&q=80' },
  ],
  ar: [
    { name: 'طعام و مطاعم', slug: 'food', count: 24, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop&q=80' },
    { name: 'سفر', slug: 'travel', count: 18, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80' },
    { name: 'فعاليات', slug: 'events', count: 12, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop&q=80' },
    { name: 'تسوق', slug: 'shopping', count: 15, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop&q=80' },
    { name: 'نمط الحياة', slug: 'lifestyle', count: 21, image: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=400&h=400&fit=crop&q=80' },
  ]
}

const defaultTags = {
  en: ['London', 'Halal Food', 'Travel Tips', 'Events', 'Shopping', 'Museums', 'Parks', 'Arab Culture', 'Restaurants', 'Weekend', 'Family', 'Nightlife'],
  ar: ['لندن', 'طعام حلال', 'نصائح السفر', 'فعاليات', 'تسوق', 'متاحف', 'حدائق', 'الثقافة العربية', 'مطاعم', 'عطلة نهاية الأسبوع', 'عائلة', 'حياة ليلية']
}

const defaultPopularArticles = {
  en: [
    {
      id: '1',
      title: 'The Best Halal Restaurants in London 2024',
      slug: 'best-halal-restaurants-london-2024',
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    },
    {
      id: '2',
      title: 'Hidden Gems in East London',
      slug: 'hidden-gems-east-london',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    },
    {
      id: '3',
      title: 'Top 10 Things to Do This Weekend',
      slug: 'top-10-things-weekend',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    }
  ],
  ar: [
    {
      id: '1',
      title: 'أفضل المطاعم الحلال في لندن 2024',
      slug: 'best-halal-restaurants-london-2024',
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' }
    },
    {
      id: '2',
      title: 'جواهر مخفية في شرق لندن',
      slug: 'hidden-gems-east-london',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' }
    },
    {
      id: '3',
      title: 'أفضل 10 أنشطة هذا الأسبوع',
      slug: 'top-10-things-weekend',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=300&h=300&fit=crop&q=80',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' }
    }
  ]
}

export function Sidebar({ popularArticles, categories, tags, locale = 'en' }: SidebarProps) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const isRTL = locale === 'ar'
  const cats = categories || defaultCategories[locale]
  const tagList = tags || defaultTags[locale]
  const popular = popularArticles || defaultPopularArticles[locale]

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubscribed(true)
    setEmail('')
  }

  const text = {
    en: {
      aboutTitle: 'About Us',
      aboutText: 'Welcome to Yalla London! Your ultimate guide to experiencing London through an Arabic lens. We cover the best halal restaurants, cultural events, hidden gems, and everything you need to know about life in this amazing city.',
      moreAbout: 'Learn More',
      followUs: 'Follow Us',
      newsletter: 'Newsletter',
      newsletterText: 'Subscribe to get the latest updates from Yalla London',
      emailPlaceholder: 'Your email address',
      subscribe: 'Subscribe',
      subscribed: 'Thanks for subscribing!',
      popularPosts: 'Popular Posts',
      categories: 'Categories',
      tags: 'Tags',
    },
    ar: {
      aboutTitle: 'من نحن',
      aboutText: 'مرحباً بكم في يلا لندن! دليلكم الشامل لاستكشاف لندن من منظور عربي. نغطي أفضل المطاعم الحلال والفعاليات الثقافية والأماكن المخفية وكل ما تحتاج معرفته عن الحياة في هذه المدينة الرائعة.',
      moreAbout: 'اقرأ المزيد',
      followUs: 'تابعنا',
      newsletter: 'النشرة الإخبارية',
      newsletterText: 'اشترك للحصول على آخر التحديثات من يلا لندن',
      emailPlaceholder: 'بريدك الإلكتروني',
      subscribe: 'اشترك',
      subscribed: 'شكراً لاشتراكك!',
      popularPosts: 'المقالات الشائعة',
      categories: 'التصنيفات',
      tags: 'الوسوم',
    }
  }

  const t = text[locale]

  return (
    <aside className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* About Widget */}
      <div className="card-elegant p-6">
        <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-4 pb-3 border-b border-gold-200/30">
          {t.aboutTitle}
          <span className="block w-12 h-0.5 bg-gradient-to-r from-gold-400 to-gold-500 mt-3 rounded-full"></span>
        </h3>
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-3 border-gold-400 shadow-luxury">
            <Image
              src="/images/london-logo.jpg"
              alt="Yalla London"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-warm-gray dark:text-cream-300 text-sm leading-relaxed mb-4">
            {t.aboutText}
          </p>
          <Link
            href={`/${locale === 'ar' ? 'ar/' : ''}about`}
            className="inline-flex items-center gap-2 text-sm text-burgundy-800 hover:text-burgundy-600 font-semibold transition-colors group"
          >
            {t.moreAbout}
            <ArrowRight size={14} className={`${isRTL ? 'rotate-180' : ''} group-hover:translate-x-1 transition-transform`} />
          </Link>
        </div>
      </div>

      {/* Social + Newsletter Widget */}
      <div className="bg-gradient-to-br from-cream-100 to-cream-200 dark:from-cream-900 dark:to-cream-950 rounded-card p-6 border border-gold-200/20">
        {/* Follow Us */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-4">
            {t.followUs}
          </h3>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://facebook.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:scale-110 hover:shadow-luxury transition-all duration-300"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://instagram.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center hover:scale-110 hover:shadow-luxury transition-all duration-300"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://twitter.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:scale-110 hover:shadow-luxury transition-all duration-300"
            >
              <Twitter size={18} />
            </a>
            <a
              href="https://youtube.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center hover:scale-110 hover:shadow-luxury transition-all duration-300"
            >
              <Youtube size={18} />
            </a>
          </div>
        </div>

        {/* Newsletter */}
        <div className="pt-6 border-t border-gold-300/30">
          <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-2 text-center">
            {t.newsletter}
          </h3>
          <p className="text-sm text-warm-gray dark:text-cream-400 text-center mb-4">
            {t.newsletterText}
          </p>
          {subscribed ? (
            <p className="text-center text-emerald-600 font-medium bg-emerald-50 py-3 rounded-lg">{t.subscribed}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                className="flex-1 px-4 py-2.5 rounded-lg border border-gold-300/30 bg-white dark:bg-cream-900 text-warm-charcoal dark:text-cream-100 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-burgundy-800 text-white hover:bg-burgundy-700 transition-all duration-300 hover:shadow-luxury"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Popular Posts */}
      <div className="card-elegant p-6">
        <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-4 pb-3 border-b border-gold-200/30">
          {t.popularPosts}
          <span className="block w-12 h-0.5 bg-gradient-to-r from-gold-400 to-gold-500 mt-3 rounded-full"></span>
        </h3>
        <div className="space-y-4">
          {popular.map((article) => (
            <BlogCard
              key={article.id}
              article={article}
              locale={locale}
              variant="compact"
            />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="card-elegant p-6">
        <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-4 pb-3 border-b border-gold-200/30">
          {t.categories}
          <span className="block w-12 h-0.5 bg-gradient-to-r from-gold-400 to-gold-500 mt-3 rounded-full"></span>
        </h3>
        <div className="space-y-2">
          {cats.map((category) => (
            <Link
              key={category.slug}
              href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${category.slug}`}
              className="group flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-cream-100 dark:hover:bg-cream-900 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                {category.image && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gold-200/30 shadow-sm">
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}
                <span className="text-warm-charcoal dark:text-cream-200 group-hover:text-burgundy-800 font-medium transition-colors">
                  {category.name}
                </span>
              </div>
              <span className="text-sm text-warm-gray bg-cream-200 dark:bg-cream-800 px-2 py-0.5 rounded-full">{category.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="card-elegant p-6">
        <h3 className="text-lg font-serif font-bold text-warm-charcoal dark:text-cream-100 mb-4 pb-3 border-b border-gold-200/30">
          {t.tags}
          <span className="block w-12 h-0.5 bg-gradient-to-r from-gold-400 to-gold-500 mt-3 rounded-full"></span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {tagList.map((tag) => (
            <Link
              key={tag}
              href={`/${locale === 'ar' ? 'ar/' : ''}blog?tag=${encodeURIComponent(tag)}`}
              className="px-3 py-1.5 text-sm bg-cream-100 dark:bg-cream-800 text-warm-charcoal dark:text-cream-200 rounded-lg hover:bg-burgundy-800 hover:text-white border border-gold-200/20 transition-all duration-300"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
