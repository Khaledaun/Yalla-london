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
    { name: 'Food & Dining', slug: 'food', count: 24, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop' },
    { name: 'Travel', slug: 'travel', count: 18, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=200&fit=crop' },
    { name: 'Events', slug: 'events', count: 12, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop' },
    { name: 'Shopping', slug: 'shopping', count: 15, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=200&fit=crop' },
    { name: 'Lifestyle', slug: 'lifestyle', count: 21, image: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=300&h=200&fit=crop' },
  ],
  ar: [
    { name: 'طعام و مطاعم', slug: 'food', count: 24, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop' },
    { name: 'سفر', slug: 'travel', count: 18, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=200&fit=crop' },
    { name: 'فعاليات', slug: 'events', count: 12, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop' },
    { name: 'تسوق', slug: 'shopping', count: 15, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=200&fit=crop' },
    { name: 'نمط الحياة', slug: 'lifestyle', count: 21, image: 'https://images.unsplash.com/photo-1529604278261-8bfcdb00a7b9?w=300&h=200&fit=crop' },
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
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    },
    {
      id: '2',
      title: 'Hidden Gems in East London',
      slug: 'hidden-gems-east-london',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=150&h=150&fit=crop',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    },
    {
      id: '3',
      title: 'Top 10 Things to Do This Weekend',
      slug: 'top-10-things-weekend',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=150&h=150&fit=crop',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' }
    }
  ],
  ar: [
    {
      id: '1',
      title: 'أفضل المطاعم الحلال في لندن 2024',
      slug: 'best-halal-restaurants-london-2024',
      featuredImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' }
    },
    {
      id: '2',
      title: 'جواهر مخفية في شرق لندن',
      slug: 'hidden-gems-east-london',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=150&h=150&fit=crop',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' }
    },
    {
      id: '3',
      title: 'أفضل 10 أنشطة هذا الأسبوع',
      slug: 'top-10-things-weekend',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=150&h=150&fit=crop',
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
    // TODO: Integrate with actual newsletter API
    setSubscribed(true)
    setEmail('')
  }

  const text = {
    en: {
      aboutTitle: 'About Me',
      aboutText: 'Welcome to Yalla London! Your ultimate guide to experiencing London through an Arabic lens. We cover the best halal restaurants, cultural events, hidden gems, and everything you need to know about life in this amazing city.',
      moreAbout: 'more about me',
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
      moreAbout: 'اقرأ المزيد عنا',
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          {t.aboutTitle}
          <span className="block w-8 h-0.5 bg-orange-500 mt-2"></span>
        </h3>
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-orange-500">
            <Image
              src="/images/london-logo.jpg"
              alt="Yalla London"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
            {t.aboutText}
          </p>
          <Link
            href={`/${locale === 'ar' ? 'ar/' : ''}about`}
            className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            {t.moreAbout}
            <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
          </Link>
        </div>
      </div>

      {/* Social + Newsletter Widget */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6">
        {/* Follow Us */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4">
            {t.followUs}
          </h3>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://facebook.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://instagram.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://twitter.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Twitter size={18} />
            </a>
            <a
              href="https://youtube.com/yallalondon"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Youtube size={18} />
            </a>
          </div>
        </div>

        {/* Newsletter */}
        <div className="pt-6 border-t border-orange-200 dark:border-gray-700">
          <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-2 text-center">
            {t.newsletter}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            {t.newsletterText}
          </p>
          {subscribed ? (
            <p className="text-center text-green-600 font-medium">{t.subscribed}</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Popular Posts */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          {t.popularPosts}
          <span className="block w-8 h-0.5 bg-orange-500 mt-2"></span>
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          {t.categories}
          <span className="block w-8 h-0.5 bg-orange-500 mt-2"></span>
        </h3>
        <div className="space-y-2">
          {cats.map((category) => (
            <Link
              key={category.slug}
              href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${category.slug}`}
              className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {category.image && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden">
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-orange-500 transition-colors">
                  {category.name}
                </span>
              </div>
              <span className="text-sm text-gray-400">{category.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          {t.tags}
          <span className="block w-8 h-0.5 bg-orange-500 mt-2"></span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {tagList.map((tag) => (
            <Link
              key={tag}
              href={`/${locale === 'ar' ? 'ar/' : ''}blog?tag=${encodeURIComponent(tag)}`}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-orange-500 hover:text-white transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
