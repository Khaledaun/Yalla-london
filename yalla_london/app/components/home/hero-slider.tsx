'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react'

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

interface HeroSliderProps {
  articles?: Article[]
  locale?: 'en' | 'ar'
}

// London-focused default slides with high quality images
const defaultSlides = {
  en: [
    {
      id: '1',
      title: 'Discover London\'s Best Halal Restaurants',
      slug: 'best-halal-restaurants-london',
      excerpt: 'Your guide to the finest halal dining experiences in the city',
      featuredImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' },
      category: { name: 'Food', slug: 'food' }
    },
    {
      id: '2',
      title: 'Hidden Gems: East London\'s Cultural Treasures',
      slug: 'east-london-cultural-gems',
      excerpt: 'Explore the vibrant multicultural neighborhoods of East London',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' },
      category: { name: 'Travel', slug: 'travel' }
    },
    {
      id: '3',
      title: 'Top 10 Things to Do in London This Weekend',
      slug: 'things-to-do-london-weekend',
      excerpt: 'From markets to museums, discover what\'s happening in London',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'Yalla London' },
      category: { name: 'Events', slug: 'events' }
    }
  ],
  ar: [
    {
      id: '1',
      title: 'اكتشف أفضل المطاعم الحلال في لندن',
      slug: 'best-halal-restaurants-london',
      excerpt: 'دليلك لأفضل تجارب الطعام الحلال في المدينة',
      featuredImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'طعام', slug: 'food' }
    },
    {
      id: '2',
      title: 'جواهر مخفية: كنوز شرق لندن الثقافية',
      slug: 'east-london-cultural-gems',
      excerpt: 'استكشف الأحياء متعددة الثقافات النابضة بالحياة في شرق لندن',
      featuredImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'سفر', slug: 'travel' }
    },
    {
      id: '3',
      title: 'أفضل 10 أنشطة في لندن هذا الأسبوع',
      slug: 'things-to-do-london-weekend',
      excerpt: 'من الأسواق إلى المتاحف، اكتشف ما يحدث في لندن',
      featuredImage: 'https://images.unsplash.com/photo-1529180184525-78f99adb8e98?w=1920&h=900&fit=crop&q=85',
      publishedAt: new Date().toISOString(),
      author: { name: 'يلا لندن' },
      category: { name: 'فعاليات', slug: 'events' }
    }
  ]
}

export function HeroSlider({ articles, locale = 'en' }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const isRTL = locale === 'ar'
  const slides = articles && articles.length > 0 ? articles : defaultSlides[locale]

  const goToSlide = useCallback((index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentSlide(index)
    setTimeout(() => setIsAnimating(false), 500)
  }, [isAnimating])

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length)
  }, [currentSlide, slides.length, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }, [currentSlide, slides.length, goToSlide])

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(nextSlide, 6000)
    return () => clearInterval(timer)
  }, [nextSlide])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <section className="relative h-[75vh] min-h-[550px] max-h-[750px] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 ease-out ${
            index === currentSlide
              ? 'opacity-100 z-10 scale-100'
              : 'opacity-0 z-0 scale-105'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={slide.featuredImage || 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&h=900&fit=crop&q=85'}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            {/* Elegant Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/90 via-burgundy-900/40 to-burgundy-900/20" />
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 bg-pattern-arabesque opacity-30" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-4xl px-6">
              {/* Category Badge */}
              {slide.category && (
                <Link
                  href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${slide.category.slug}`}
                  className="inline-flex items-center gap-2 mb-6 px-5 py-2 bg-gold-400/90 backdrop-blur-sm text-burgundy-900 rounded-full text-sm font-semibold uppercase tracking-wider hover:bg-gold-300 transition-colors shadow-lg"
                >
                  <span className="w-1.5 h-1.5 bg-burgundy-800 rounded-full" />
                  {slide.category.name}
                </Link>
              )}

              {/* Title */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight drop-shadow-lg">
                <Link
                  href={`/${locale === 'ar' ? 'ar/' : ''}blog/${slide.slug}`}
                  className="hover:text-gold-300 transition-colors duration-300"
                >
                  {slide.title}
                </Link>
              </h2>

              {/* Excerpt */}
              {slide.excerpt && (
                <p className="text-lg md:text-xl text-cream-200 mb-8 max-w-2xl mx-auto leading-relaxed">
                  {slide.excerpt}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex items-center justify-center gap-6 text-cream-300 text-sm">
                {slide.publishedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gold-400" />
                    <span>{formatDate(slide.publishedAt)}</span>
                  </div>
                )}
                {slide.author && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gold-400" />
                    <span>{slide.author.name}</span>
                  </div>
                )}
              </div>

              {/* Read More Button */}
              <Link
                href={`/${locale === 'ar' ? 'ar/' : ''}blog/${slide.slug}`}
                className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 bg-white text-burgundy-800 rounded-lg font-semibold shadow-elegant hover:bg-cream-100 hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
              >
                <span>{locale === 'ar' ? 'اقرأ المزيد' : 'Read More'}</span>
                <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={isRTL ? nextSlide : prevSlide}
        className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-gold-400 hover:text-burgundy-900 transition-all duration-300 hover:scale-110 border border-white/20`}
        aria-label="Previous slide"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={isRTL ? prevSlide : nextSlide}
        className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-gold-400 hover:text-burgundy-900 transition-all duration-300 hover:scale-110 border border-white/20`}
        aria-label="Next slide"
      >
        <ChevronRight size={28} />
      </button>

      {/* Progress Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative h-2 rounded-full transition-all duration-300 overflow-hidden ${
              index === currentSlide
                ? 'w-10 bg-gold-400'
                : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === currentSlide && (
              <span className="absolute inset-0 bg-gradient-to-r from-gold-300 to-gold-500 animate-shimmer" />
            )}
          </button>
        ))}
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-gold-400/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-gold-400/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-gold-400/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-gold-400/30 pointer-events-none" />
    </section>
  )
}
