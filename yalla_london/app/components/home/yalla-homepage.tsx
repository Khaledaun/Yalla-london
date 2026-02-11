'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronDown, ChevronRight, MapPin, Star,
  Download, Play, Image as ImageIcon
} from 'lucide-react'
import { motion } from 'framer-motion'

interface YallaHomepageProps {
  locale?: 'en' | 'ar'
}

// Brand Colors
const colors = {
  primary: '#1A1F36',
  accent: '#E8634B',
  gray: '#A3A3A3'
}

// Trending items
const trendingItems = [
  { en: 'Arsenal vs Chelsea tickets selling fast', ar: 'تذاكر آرسنال ضد تشيلسي تنفذ بسرعة' },
  { en: 'New Year fireworks 2026 guide released', ar: 'دليل ألعاب رأس السنة 2026' },
  { en: 'Harrods winter sale begins', ar: 'بداية تخفيضات هارودز الشتوية' },
]

// Articles data
const articles = {
  en: [
    {
      id: '1',
      slug: 'best-halal-restaurants-central-london-2025',
      category: 'Lifestyle',
      title: 'Best Halal Restaurants in Central London 2025',
      excerpt: 'Discover the finest halal dining experiences in the heart of London. From Mayfair fine dining to hidden gems in Soho.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      date: 'Jan 15, 2026',
      readTime: '5 min read'
    },
    {
      id: '2',
      slug: 'complete-london-guide-arab-visitors',
      category: 'Travel',
      title: 'Complete London Guide for Arab Visitors',
      excerpt: 'Everything you need to know for your first visit. Visa, transport, halal food, and prayer facilities.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: 'Jan 12, 2026',
      readTime: '8 min read'
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-comparison',
      category: 'Shopping',
      title: 'Harrods vs Selfridges: Which is Better?',
      excerpt: 'A detailed comparison of London\'s two iconic department stores for luxury shoppers.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: 'Jan 10, 2026',
      readTime: '6 min read'
    },
  ],
  ar: [
    {
      id: '1',
      slug: 'best-halal-restaurants-central-london-2025',
      category: 'نمط الحياة',
      title: 'أفضل المطاعم الحلال في وسط لندن 2025',
      excerpt: 'اكتشف أفضل تجارب الطعام الحلال في قلب لندن. من المطاعم الفاخرة في مايفير إلى الجواهر المخفية.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      date: '15 يناير 2026',
      readTime: '5 دقائق للقراءة'
    },
    {
      id: '2',
      slug: 'complete-london-guide-arab-visitors',
      category: 'سفر',
      title: 'دليل لندن الشامل للزوار العرب',
      excerpt: 'كل ما تحتاج معرفته لزيارتك الأولى. التأشيرة والمواصلات والطعام الحلال ومرافق الصلاة.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: '12 يناير 2026',
      readTime: '8 دقائق للقراءة'
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-comparison',
      category: 'تسوق',
      title: 'هارودز أم سيلفريدجز: أيهما أفضل؟',
      excerpt: 'مقارنة تفصيلية بين أشهر متجرين في لندن للمتسوقين الفاخرين.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: '10 يناير 2026',
      readTime: '6 دقائق للقراءة'
    },
  ]
}

// Events data
const events = {
  en: [
    {
      id: '1',
      title: 'Arsenal vs Manchester United',
      venue: 'Emirates Stadium',
      date: { day: '25', month: 'Jan', year: '2026' },
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80',
      price: 'From £85'
    },
    {
      id: '2',
      title: 'The Lion King',
      venue: 'Lyceum Theatre',
      date: { day: '02', month: 'Feb', year: '2026' },
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&q=80',
      price: 'From £45'
    },
    {
      id: '3',
      title: 'Ed Sheeran Live',
      venue: 'Wembley Stadium',
      date: { day: '15', month: 'Mar', year: '2026' },
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
      price: 'From £95'
    },
  ],
  ar: [
    {
      id: '1',
      title: 'آرسنال ضد مانشستر يونايتد',
      venue: 'ملعب الإمارات',
      date: { day: '25', month: 'يناير', year: '2026' },
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80',
      price: 'من £85'
    },
    {
      id: '2',
      title: 'الأسد الملك',
      venue: 'مسرح ليسيوم',
      date: { day: '02', month: 'فبراير', year: '2026' },
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&q=80',
      price: 'من £45'
    },
    {
      id: '3',
      title: 'إد شيران مباشر',
      venue: 'ملعب ويمبلي',
      date: { day: '15', month: 'مارس', year: '2026' },
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
      price: 'من £95'
    },
  ]
}

// Guides data
const guides = {
  en: [
    {
      id: '1',
      title: 'Complete London Guide 2025',
      pages: '45 pages',
      price: '£9.99',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
      badge: 'Bestseller'
    },
    {
      id: '2',
      title: 'Halal Restaurant Guide',
      pages: '32 pages',
      price: '£7.99',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
      badge: 'New'
    },
    {
      id: '3',
      title: 'London Shopping Secrets',
      pages: '28 pages',
      price: '£6.99',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
      badge: null
    },
  ],
  ar: [
    {
      id: '1',
      title: 'دليل لندن الشامل 2025',
      pages: '45 صفحة',
      price: '£9.99',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
      badge: 'الأكثر مبيعاً'
    },
    {
      id: '2',
      title: 'دليل المطاعم الحلال',
      pages: '32 صفحة',
      price: '£7.99',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
      badge: 'جديد'
    },
    {
      id: '3',
      title: 'أسرار التسوق في لندن',
      pages: '28 صفحة',
      price: '£6.99',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
      badge: null
    },
  ]
}

// Hotels data
const hotels = {
  en: [
    {
      id: '1',
      name: 'The Dorchester',
      location: 'Mayfair, London',
      rating: 5,
      price: 'From £650/night',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      badge: 'Luxury'
    },
    {
      id: '2',
      name: 'The Ritz London',
      location: 'Piccadilly, London',
      rating: 5,
      price: 'From £750/night',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80',
      badge: '5 Star'
    },
    {
      id: '3',
      name: 'Claridges',
      location: 'Mayfair, London',
      rating: 5,
      price: 'From £580/night',
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
      badge: 'Historic'
    },
  ],
  ar: [
    {
      id: '1',
      name: 'دورتشستر',
      location: 'مايفير، لندن',
      rating: 5,
      price: 'من £650/ليلة',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      badge: 'فاخر'
    },
    {
      id: '2',
      name: 'ريتز لندن',
      location: 'بيكاديلي، لندن',
      rating: 5,
      price: 'من £750/ليلة',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80',
      badge: '5 نجوم'
    },
    {
      id: '3',
      name: 'كلاريدجز',
      location: 'مايفير، لندن',
      rating: 5,
      price: 'من £580/ليلة',
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
      badge: 'تاريخي'
    },
  ]
}

// Experiences data
const experiences = {
  en: [
    {
      id: '1',
      title: 'Harry Potter Studio Tour',
      rating: 4.9,
      reviews: 2453,
      price: 'From £55',
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80'
    },
    {
      id: '2',
      title: 'London Eye Experience',
      rating: 4.7,
      reviews: 3821,
      price: 'From £32',
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80'
    },
    {
      id: '3',
      title: 'Thames River Cruise',
      rating: 4.8,
      reviews: 1567,
      price: 'From £25',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80'
    },
    {
      id: '4',
      title: 'Tower of London Tour',
      rating: 4.8,
      reviews: 2891,
      price: 'From £30',
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80'
    },
  ],
  ar: [
    {
      id: '1',
      title: 'جولة استوديو هاري بوتر',
      rating: 4.9,
      reviews: 2453,
      price: 'من £55',
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80'
    },
    {
      id: '2',
      title: 'عين لندن',
      rating: 4.7,
      reviews: 3821,
      price: 'من £32',
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80'
    },
    {
      id: '3',
      title: 'رحلة نهر التايمز',
      rating: 4.8,
      reviews: 1567,
      price: 'من £25',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80'
    },
    {
      id: '4',
      title: 'جولة برج لندن',
      rating: 4.8,
      reviews: 2891,
      price: 'من £30',
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80'
    },
  ]
}

// Sidebar most read
const mostRead = {
  en: [
    'Best Shisha Lounges in London 2025',
    'Where to Find Arabic Speaking Staff',
    'Prayer Times & Mosques Guide',
    'London Transport for Tourists',
    'Best Family-Friendly Hotels',
  ],
  ar: [
    'أفضل صالات الشيشة في لندن 2025',
    'أين تجد موظفين يتحدثون العربية',
    'دليل أوقات الصلاة والمساجد',
    'مواصلات لندن للسياح',
    'أفضل الفنادق المناسبة للعائلات',
  ]
}

const text = {
  en: {
    nav: ['Events', 'Guides', 'Hotels', 'Restaurants', 'Shopping'],
    subscribe: 'Subscribe',
    trending: 'Trending Now',
    latestArticles: 'Latest Articles',
    viewAll: 'View All',
    upcomingEvents: 'Upcoming Events',
    getTickets: 'Get Tickets',
    pdfGuides: 'PDF Guides',
    downloadNow: 'Download',
    experiences: 'Top Experiences',
    bookNow: 'Book Now',
    luxuryHotels: 'Luxury Hotels',
    viewDeals: 'View Deals',
    mostRead: 'Most Read',
    newsletter: 'Stay Updated',
    newsletterDesc: 'Get the latest London tips and exclusive deals delivered to your inbox.',
    emailPlaceholder: 'Enter your email',
    subscribeBtn: 'Subscribe',
    footerAbout: 'Your trusted guide to exploring London. We help Arab visitors discover the best of the city.',
    footerLinks: 'Quick Links',
    footerContact: 'Contact Us',
    copyright: '© 2026 Yalla London. All rights reserved.'
  },
  ar: {
    nav: ['فعاليات', 'أدلة', 'فنادق', 'مطاعم', 'تسوق'],
    subscribe: 'اشترك',
    trending: 'الأكثر رواجاً',
    latestArticles: 'أحدث المقالات',
    viewAll: 'عرض الكل',
    upcomingEvents: 'الفعاليات القادمة',
    getTickets: 'احصل على التذاكر',
    pdfGuides: 'أدلة PDF',
    downloadNow: 'تحميل',
    experiences: 'أفضل التجارب',
    bookNow: 'احجز الآن',
    luxuryHotels: 'فنادق فاخرة',
    viewDeals: 'عرض العروض',
    mostRead: 'الأكثر قراءة',
    newsletter: 'ابق على اطلاع',
    newsletterDesc: 'احصل على أحدث نصائح لندن والعروض الحصرية مباشرة إلى بريدك الإلكتروني.',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    subscribeBtn: 'اشترك',
    footerAbout: 'دليلك الموثوق لاستكشاف لندن. نساعد الزوار العرب على اكتشاف أفضل ما في المدينة.',
    footerLinks: 'روابط سريعة',
    footerContact: 'اتصل بنا',
    copyright: '© 2026 يلا لندن. جميع الحقوق محفوظة.'
  }
}

export function YallaHomepage({ locale = 'en' }: YallaHomepageProps) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image')
  const [email, setEmail] = useState('')

  const isRTL = locale === 'ar'
  const t = text[locale]

  // Track touch start position for mobile swipe detection
  const touchStartY = React.useRef<number>(0)

  useEffect(() => {
    // Desktop wheel handler
    const handleWheel = (e: WheelEvent) => {
      if (!showContent) {
        e.preventDefault()
        const delta = e.deltaY * 0.001
        const newProgress = Math.min(Math.max(scrollProgress + delta, 0), 1)
        setScrollProgress(newProgress)
        if (newProgress >= 1) {
          setShowContent(true)
        }
      } else if (window.scrollY <= 5 && e.deltaY < 0) {
        setShowContent(false)
        setScrollProgress(0.99)
      }
    }

    // Mobile touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!showContent) {
        const touchY = e.touches[0].clientY
        const delta = (touchStartY.current - touchY) * 0.003
        const newProgress = Math.min(Math.max(scrollProgress + delta, 0), 1)
        setScrollProgress(newProgress)
        touchStartY.current = touchY
        if (newProgress >= 1) {
          setShowContent(true)
        }
        // Prevent default scroll behavior during hero animation
        if (newProgress < 1) {
          e.preventDefault()
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [scrollProgress, showContent])

  const mediaWidth = 300 + scrollProgress * 1100
  const mediaHeight = 350 + scrollProgress * 350
  const textOffset = scrollProgress * 120

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'font-cairo' : 'font-inter'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className={`fixed top-20 ${isRTL ? 'left-5' : 'right-5'} z-50 flex gap-0.5 bg-white p-1 rounded-lg shadow-md border border-gray-200`}>
        <button
          onClick={() => window.location.href = '?locale=en'}
          className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${locale === 'en' ? 'bg-[#1A1F36] text-white' : 'text-gray-500'}`}
        >
          EN
        </button>
        <button
          onClick={() => window.location.href = '?locale=ar'}
          className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${locale === 'ar' ? 'bg-[#1A1F36] text-white' : 'text-gray-500'}`}
        >
          عربي
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-900">
        {/* Background */}
        <div className="absolute inset-0 z-0" style={{ opacity: 1 - scrollProgress }}>
          <Image
            src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80"
            alt="London skyline"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-gray-900/30 to-gray-900/70" />
        </div>

        {/* Expanding Media Container */}
        <div
          className="absolute z-5 rounded-3xl overflow-hidden shadow-2xl"
          style={{
            width: `${mediaWidth}px`,
            height: `${mediaHeight}px`,
            maxWidth: '95vw',
            maxHeight: '85vh',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 25px 80px rgba(232, 99, 75, 0.2), 0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          {mediaType === 'video' ? (
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0"
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <Image
              src="https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80"
              alt="London Experience"
              fill
              sizes="(max-width: 768px) 95vw, 80vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[#1A1F36]/20" style={{ opacity: 0.5 - scrollProgress * 0.3 }} />
        </div>

        {/* Title */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-playfair font-bold text-white drop-shadow-lg"
            style={{ transform: `translateX(${isRTL ? textOffset : -textOffset}vw)`, textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            {locale === 'ar' ? 'اكتشف' : 'Discover'}
          </motion.h1>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-playfair font-bold text-white drop-shadow-lg"
            style={{ transform: `translateX(${isRTL ? -textOffset : textOffset}vw)`, textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            {locale === 'ar' ? 'لندن' : 'London'}
          </motion.h1>
          <motion.p
            className="text-lg tracking-widest uppercase text-[#E8634B]/80"
            style={{ opacity: 1 - scrollProgress * 1.5 }}
          >
            {locale === 'ar' ? 'دليلك العربي لاستكشاف لندن' : 'Your guide to the extraordinary'}
          </motion.p>
        </div>

        {/* Scroll Hint - Tappable for mobile */}
        <motion.button
          onClick={() => {
            setScrollProgress(1)
            setShowContent(true)
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 cursor-pointer focus:outline-none"
          style={{ opacity: 1 - scrollProgress * 2 }}
        >
          <span className="text-sm tracking-wider uppercase text-gray-400 md:hidden">
            {locale === 'ar' ? 'اضغط للاستكشاف' : 'Tap to explore'}
          </span>
          <span className="text-sm tracking-wider uppercase text-gray-400 hidden md:block">
            {locale === 'ar' ? 'مرر للأسفل للاستكشاف' : 'Scroll to explore'}
          </span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </motion.div>
        </motion.button>
      </section>

      {/* Media Toggle */}
      <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 flex gap-1 bg-white/95 backdrop-blur-lg p-1.5 rounded-full shadow-lg`}>
        <button
          onClick={() => setMediaType('image')}
          className={`p-2.5 rounded-full transition-colors ${mediaType === 'image' ? 'bg-[#1A1F36] text-white' : 'text-gray-500'}`}
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMediaType('video')}
          className={`p-2.5 rounded-full transition-colors ${mediaType === 'video' ? 'bg-[#1A1F36] text-white' : 'text-gray-500'}`}
        >
          <Play className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content - Revealed after scroll */}
      <motion.div
        className="bg-gray-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.7 }}
      >
        {/* Trending Bar */}
        <div className="bg-gray-50 border-b border-gray-200 py-3.5 px-6">
          <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-[#E8634B] uppercase tracking-wide whitespace-nowrap">
              <span className="w-2 h-2 bg-[#E8634B] rounded-full animate-pulse"></span>
              {t.trending}
            </div>
            {trendingItems.map((item, i) => (
              <Link key={i} href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#1A1F36] whitespace-nowrap transition-colors">
                {item[locale]}
                <span className="text-xs text-gray-400">2h</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Articles Column */}
            <div className="lg:col-span-2 space-y-10">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-playfair font-bold text-[#1A1F36]">{t.latestArticles}</h2>
                <Link href="/blog" className="flex items-center gap-1 text-sm font-medium text-[#E8634B] hover:underline">
                  {t.viewAll} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Articles */}
              <div className="space-y-6">
                {articles[locale].map((article) => (
                  <Link key={article.id} href={`/blog/${article.slug}`}>
                    <article className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5 bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                      <div className="space-y-3">
                        <span className="text-xs font-semibold text-[#E8634B] uppercase tracking-wide">{article.category}</span>
                        <h3 className="text-xl font-semibold text-[#1A1F36] group-hover:text-[#E8634B] transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{article.excerpt}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{article.date}</span>
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                      <div className="relative aspect-[4/3] md:aspect-square rounded-lg overflow-hidden">
                        <Image src={article.image} alt={article.title} fill className="object-cover" />
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Most Read */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-playfair font-bold text-[#1A1F36] mb-4 pb-3 border-b border-gray-100">{t.mostRead}</h3>
                <ul className="space-y-3">
                  {mostRead[locale].map((item, i) => (
                    <li key={i}>
                      <Link href="#" className="flex items-start gap-3 group">
                        <span className="text-xl font-bold text-gray-300 group-hover:text-[#E8634B] transition-colors">{i + 1}</span>
                        <span className="text-sm text-gray-700 group-hover:text-[#1A1F36] transition-colors">{item}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter */}
              <div className="bg-gradient-to-br from-[#1A1F36] to-[#2d3452] rounded-xl p-6 text-white">
                <h3 className="text-lg font-playfair font-bold mb-2">{t.newsletter}</h3>
                <p className="text-sm text-gray-300 mb-4">{t.newsletterDesc}</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8634B]"
                  />
                  <button className="w-full py-3 bg-[#E8634B] hover:bg-[#d4543d] text-white font-semibold rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8634B]">
                    {t.subscribeBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Events Section */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-playfair font-bold text-[#1A1F36]">{t.upcomingEvents}</h2>
              <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-[#E8634B] hover:underline">
                {t.viewAll} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events[locale].map((event) => (
                <div key={event.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="relative h-40">
                    <Image src={event.image} alt={event.title} fill className="object-cover" />
                    <div className="absolute top-3 left-3 bg-white rounded-lg px-3 py-2 text-center shadow-md">
                      <div className="text-2xl font-bold text-[#1A1F36]">{event.date.day}</div>
                      <div className="text-xs text-gray-500 uppercase">{event.date.month}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#1A1F36] mb-1">{event.title}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-4 h-4" /> {event.venue}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1A1F36]">{event.price}</span>
                      <button className="px-4 py-2 bg-[#E8634B] text-white text-sm font-medium rounded-lg hover:bg-[#d4543d] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8634B]">
                        {t.getTickets}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guides Section */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-playfair font-bold text-[#1A1F36]">{t.pdfGuides}</h2>
              <Link href="/shop" className="flex items-center gap-1 text-sm font-medium text-[#E8634B] hover:underline">
                {t.viewAll} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {guides[locale].map((guide) => (
                <div key={guide.id} className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="relative h-48">
                    <Image src={guide.image} alt={guide.title} fill className="object-cover" />
                    {guide.badge && (
                      <span className="absolute top-3 left-3 px-3 py-1 bg-[#E8634B] text-white text-xs font-semibold rounded-full">
                        {guide.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#1A1F36] mb-2">{guide.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{guide.pages}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#1A1F36]">{guide.price}</span>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1F36] text-white text-sm font-medium rounded-lg hover:bg-[#2d3452] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1F36]">
                        <Download className="w-4 h-4" /> {t.downloadNow}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Experiences Section */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-playfair font-bold text-[#1A1F36]">{t.experiences}</h2>
              <Link href="/experiences" className="flex items-center gap-1 text-sm font-medium text-[#E8634B] hover:underline">
                {t.viewAll} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {experiences[locale].map((exp) => (
                <div key={exp.id} className="group">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                    <Image src={exp.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {exp.rating}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-semibold text-white text-sm mb-1">{exp.title}</h3>
                      <p className="text-xs text-gray-300">{exp.reviews.toLocaleString()} reviews</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1A1F36]">{exp.price}</span>
                    <button className="text-xs text-[#E8634B] font-medium hover:underline">{t.bookNow}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hotels Section */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-playfair font-bold text-[#1A1F36]">{t.luxuryHotels}</h2>
              <Link href="/hotels" className="flex items-center gap-1 text-sm font-medium text-[#E8634B] hover:underline">
                {t.viewAll} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hotels[locale].map((hotel) => (
                <div key={hotel.id} className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="relative h-48">
                    <Image src={hotel.image} alt={hotel.name} fill className="object-cover" />
                    <span className="absolute top-3 right-3 px-3 py-1 bg-[#1A1F36] text-white text-xs font-semibold rounded-full">
                      {hotel.badge}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: hotel.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <h3 className="font-semibold text-[#1A1F36] mb-1">{hotel.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-4 h-4" /> {hotel.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1A1F36]">{hotel.price}</span>
                      <button className="px-4 py-2 border-2 border-[#1A1F36] text-[#1A1F36] text-sm font-medium rounded-lg hover:bg-[#1A1F36] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1F36]">
                        {t.viewDeals}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </motion.div>
    </div>
  )
}

export default YallaHomepage
