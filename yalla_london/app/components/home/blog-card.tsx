'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Share2, Facebook, Twitter } from 'lucide-react'

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
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <Image
            src={article.featuredImage || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=300&fit=crop&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-2 text-sm">
            <Link href={blogUrl}>{article.title}</Link>
          </h4>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {article.author && (
              <>
                {article.author.avatar && (
                  <Image
                    src={article.author.avatar}
                    alt={article.author.name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span>{article.author.name}</span>
              </>
            )}
            {article.publishedAt && (
              <span>{formatDate(article.publishedAt)}</span>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg mb-5">
        <Link href={blogUrl}>
          <Image
            src={article.featuredImage || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=675&fit=crop&q=80'}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Like Button */}
        <button className={`absolute ${isRTL ? 'right-4' : 'left-4'} bottom-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-gray-700 hover:bg-white transition-colors`}>
          <Heart size={16} className="text-red-500" />
          <span>{article.likes || Math.floor(Math.random() * 200) + 50}</span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title */}
        <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors leading-tight">
          <Link href={blogUrl}>{article.title}</Link>
        </h3>

        {/* Meta Info */}
        <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
          {article.author && (
            <div className="flex items-center gap-2">
              {article.author.avatar ? (
                <Image
                  src={article.author.avatar}
                  alt={article.author.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-medium text-xs">
                    {article.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {article.author.name}
              </span>
            </div>
          )}
          {article.publishedAt && (
            <span>{formatDate(article.publishedAt)}</span>
          )}
          {article.category && (
            <Link
              href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${article.category.slug}`}
              className="text-orange-500 hover:text-orange-600"
            >
              {article.category.name}
            </Link>
          )}
        </div>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* Social Share */}
        <div className="flex items-center gap-3 pt-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            {locale === 'ar' ? 'شارك' : 'Share'}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + blogUrl : blogUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Facebook size={16} />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + blogUrl : blogUrl)}&text=${encodeURIComponent(article.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-sky-500 transition-colors"
            >
              <Twitter size={16} />
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
