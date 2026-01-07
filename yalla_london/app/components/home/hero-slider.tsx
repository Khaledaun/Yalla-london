'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
    <section className="relative h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-4xl px-6">
              {/* Category */}
              {slide.category && (
                <Link
                  href={`/${locale === 'ar' ? 'ar/' : ''}blog?category=${slide.category.slug}`}
                  className="inline-block mb-4 text-sm font-medium text-orange-400 hover:text-orange-300 uppercase tracking-wider"
                >
                  {slide.category.name}
                </Link>
              )}

              {/* Title */}
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 leading-tight">
                <Link
                  href={`/${locale === 'ar' ? 'ar/' : ''}blog/${slide.slug}`}
                  className="hover:text-orange-400 transition-colors"
                >
                  {slide.title}
                </Link>
              </h2>

              {/* Meta */}
              <div className="flex items-center justify-center space-x-4 text-white/80 text-sm">
                {slide.publishedAt && (
                  <span>{formatDate(slide.publishedAt)}</span>
                )}
                {slide.author && (
                  <>
                    <span className="text-white/50">/</span>
                    <span>{slide.author.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={isRTL ? nextSlide : prevSlide}
        className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 z-20 p-3 text-white/70 hover:text-white transition-colors`}
        aria-label="Previous slide"
      >
        <ChevronLeft size={40} />
      </button>
      <button
        onClick={isRTL ? prevSlide : nextSlide}
        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 z-20 p-3 text-white/70 hover:text-white transition-colors`}
        aria-label="Next slide"
      >
        <ChevronRight size={40} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-orange-500 w-8'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
