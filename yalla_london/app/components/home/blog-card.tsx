'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Facebook, Twitter, Calendar, User } from 'lucide-react'

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

interface BlogCardProps {
  article: Article
  locale?: 'en' | 'ar'
  variant?: 'default' | 'featured' | 'compact'
}

export function BlogCard({ article, locale = 'en', variant = 'default' }: BlogCardProps) {
  const isRTL = locale === 'ar'

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const blogUrl = `/${locale === 'ar' ? 'ar/' : ''}blog/${article.slug}`

  if (variant === 'compact') {
    return (
      <article className="flex gap-4 group" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-gold-200/30">
          <Image
            src={article.featuredImage || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=300&fit=crop&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-warm-charcoal dark:text-cream-100 group-hover:text-burgundy-800 transition-colors line-clamp-2 text-sm leading-snug">
            <Link href={blogUrl}>{article.title}</Link>
          </h4>
          <div className="flex items-center gap-2 mt-2 text-xs text-warm-gray">
            {article.author && (
              <span className="font-medium">{article.author.name}</span>
            )}
            {article.publishedAt && (
              <>
                <span className="text-gold-400">•</span>
                <span>{formatDate(article.publishedAt)}</span>
              </>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group card-elegant p-0 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <Link href={blogUrl}>
          <Image
            src={article.featuredImage || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>

        {/* Category Badge */}
        {article.category && (
          <Link
            href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${article.category.slug}`}
            className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} px-4 py-1.5 bg-gold-400 text-burgundy-900 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-gold-300 transition-colors shadow-lg`}
          >
            {article.category.name}
          </Link>
        )}

        {/* Like Button */}
        <button className={`absolute ${isRTL ? 'left-4' : 'right-4'} bottom-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-warm-charcoal hover:bg-burgundy-800 hover:text-white transition-all duration-300 shadow-lg`}>
          <Heart size={14} className="text-burgundy-600" />
          <span className="font-medium">{article.likes || Math.floor(Math.random() * 200) + 50}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Title */}
        <h3 className="text-xl md:text-2xl font-serif font-bold text-warm-charcoal dark:text-cream-100 group-hover:text-burgundy-800 transition-colors leading-tight">
          <Link href={blogUrl} className="hover:text-burgundy-700">
            {article.title}
          </Link>
        </h3>

        {/* Meta Info */}
        <div className="flex items-center flex-wrap gap-4 text-sm text-warm-gray">
          {article.author && (
            <div className="flex items-center gap-2">
              {article.author.avatar ? (
                <Image
                  src={article.author.avatar}
                  alt={article.author.name}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-gold-300"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-gold-300 to-gold-400 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-burgundy-800 font-semibold text-xs">
                    {article.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="font-medium text-warm-charcoal dark:text-cream-200">
                {article.author.name}
              </span>
            </div>
          )}
          {article.publishedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gold-500" />
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          )}
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-warm-gray dark:text-cream-300 leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* Footer: Read More & Share */}
        <div className="flex items-center justify-between pt-4 border-t border-gold-200/30">
          <Link
            href={blogUrl}
            className="inline-flex items-center gap-2 text-burgundy-800 font-semibold hover:text-burgundy-600 transition-colors group/link"
          >
            <span>{locale === 'ar' ? 'اقرأ المزيد' : 'Read More'}</span>
            <span className="w-0 group-hover/link:w-4 overflow-hidden transition-all duration-300">→</span>
          </Link>

          {/* Social Share */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-warm-gray uppercase tracking-wider">
              {locale === 'ar' ? 'شارك' : 'Share'}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + blogUrl : blogUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-cream-200 dark:bg-cream-800 flex items-center justify-center text-warm-gray hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <Facebook size={14} />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + blogUrl : blogUrl)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-cream-200 dark:bg-cream-800 flex items-center justify-center text-warm-gray hover:bg-sky-500 hover:text-white transition-all duration-300"
              >
                <Twitter size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
