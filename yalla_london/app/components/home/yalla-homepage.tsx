'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronRight, MapPin, Star, Clock,
  Download, ArrowRight, Sparkles, Calendar,
  TrendingUp, BookOpen, Ticket, Compass, Map, Train, Utensils, Users, Gem
} from 'lucide-react'
import { motion } from 'framer-motion'
import { NewsCarousel } from '@/components/news-carousel'
import { FollowUs } from '@/components/follow-us'

interface YallaHomepageProps {
  locale?: 'en' | 'ar'
}

// ─── Data ────────────────────────────────────────────────────────────────────

const heroSlides = {
  en: [
    {
      title: 'Discover London',
      subtitle: 'Like Never Before',
      description: 'Your definitive Arabic guide to the best of London — curated luxury experiences, halal dining, and insider secrets.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80',
      cta: 'Start Exploring',
      ctaLink: '/blog',
    },
  ],
  ar: [
    {
      title: 'اكتشف لندن',
      subtitle: 'كما لم ترها من قبل',
      description: 'دليلك العربي الشامل لأفضل ما في لندن — تجارب فاخرة مختارة، مطاعم حلال، وأسرار من الداخل.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80',
      cta: 'ابدأ الاستكشاف',
      ctaLink: '/blog',
    },
  ],
}

const featuredArticle = {
  en: {
    slug: 'best-halal-restaurants-central-london-2025',
    category: 'Editor\'s Pick',
    title: 'Best Halal Restaurants in Central London 2025',
    excerpt: 'From Mayfair fine dining to hidden gems in Soho — discover the finest halal dining experiences in the heart of London, personally reviewed by our team.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    author: 'Yalla London Team',
    date: 'Jan 15, 2026',
    readTime: '5 min read',
  },
  ar: {
    slug: 'best-halal-restaurants-central-london-2025',
    category: 'اختيار المحرر',
    title: 'أفضل المطاعم الحلال في وسط لندن 2025',
    excerpt: 'من المطاعم الفاخرة في مايفير إلى الجواهر المخفية في سوهو — اكتشف أفضل تجارب الطعام الحلال في قلب لندن.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    author: 'فريق يلا لندن',
    date: '15 يناير 2026',
    readTime: '5 دقائق للقراءة',
  },
}

const articles = {
  en: [
    {
      id: '2',
      slug: 'complete-london-guide-arab-visitors',
      category: 'Travel',
      title: 'Complete London Guide for Arab Visitors',
      excerpt: 'Everything you need to know for your first visit — visa, transport, halal food, and prayer facilities.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: 'Jan 12, 2026',
      readTime: '8 min read',
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-comparison',
      category: 'Shopping',
      title: 'Harrods vs Selfridges: Which is Better?',
      excerpt: 'A detailed comparison of London\'s two iconic department stores for luxury shoppers.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: 'Jan 10, 2026',
      readTime: '6 min read',
    },
    {
      id: '4',
      slug: 'london-new-years-eve-fireworks-2025-complete-guide',
      category: 'Events',
      title: 'London New Year\'s Eve Fireworks 2026',
      excerpt: 'The complete guide to the best viewing spots, tickets, and tips for the iconic NYE fireworks.',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      date: 'Jan 5, 2026',
      readTime: '4 min read',
    },
  ],
  ar: [
    {
      id: '2',
      slug: 'complete-london-guide-arab-visitors',
      category: 'سفر',
      title: 'دليل لندن الشامل للزوار العرب',
      excerpt: 'كل ما تحتاج معرفته لزيارتك الأولى — التأشيرة والمواصلات والطعام الحلال ومرافق الصلاة.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: '12 يناير 2026',
      readTime: '8 دقائق',
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-comparison',
      category: 'تسوق',
      title: 'هارودز أم سيلفريدجز: أيهما أفضل؟',
      excerpt: 'مقارنة تفصيلية بين أشهر متجرين في لندن للمتسوقين الفاخرين.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: '10 يناير 2026',
      readTime: '6 دقائق',
    },
    {
      id: '4',
      slug: 'london-new-years-eve-fireworks-2025-complete-guide',
      category: 'فعاليات',
      title: 'ألعاب رأس السنة في لندن 2026',
      excerpt: 'الدليل الشامل لأفضل أماكن المشاهدة والتذاكر ونصائح لألعاب رأس السنة.',
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      date: '5 يناير 2026',
      readTime: '4 دقائق',
    },
  ],
}

const events = {
  en: [
    { id: '1', title: 'Chelsea vs Arsenal', venue: 'Stamford Bridge', day: '22', month: 'Feb', price: 'From £120', image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80' },
    { id: '2', title: 'Tottenham vs Man City', venue: 'Tottenham Stadium', day: '01', month: 'Mar', price: 'From £95', image: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&q=80' },
    { id: '3', title: 'Hamilton — West End', venue: 'Victoria Palace Theatre', day: '08', month: 'Mar', price: 'From £35', image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80' },
    { id: '4', title: 'Crystal Palace vs Liverpool', venue: 'Selhurst Park', day: '15', month: 'Mar', price: 'From £75', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&q=80' },
    { id: '5', title: 'West Ham vs Arsenal', venue: 'London Stadium', day: '05', month: 'Apr', price: 'From £85', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80' },
    { id: '6', title: 'London Marathon 2026', venue: 'Greenwich to The Mall', day: '26', month: 'Apr', price: 'Free to watch', image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=80' },
  ],
  ar: [
    { id: '1', title: 'تشيلسي ضد آرسنال', venue: 'ستامفورد بريدج', day: '22', month: 'فبراير', price: 'من £120', image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&q=80' },
    { id: '2', title: 'توتنهام ضد مانشستر سيتي', venue: 'ملعب توتنهام', day: '01', month: 'مارس', price: 'من £95', image: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=400&q=80' },
    { id: '3', title: 'هاميلتون — ويست إند', venue: 'مسرح فيكتوريا بالاس', day: '08', month: 'مارس', price: 'من £35', image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80' },
    { id: '4', title: 'كريستال بالاس ضد ليفربول', venue: 'سيلهرست بارك', day: '15', month: 'مارس', price: 'من £75', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&q=80' },
    { id: '5', title: 'وست هام ضد آرسنال', venue: 'ملعب لندن', day: '05', month: 'أبريل', price: 'من £85', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80' },
    { id: '6', title: 'ماراثون لندن 2026', venue: 'غرينيتش إلى ذا مول', day: '26', month: 'أبريل', price: 'مجاني للمشاهدة', image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=80' },
  ],
}

const guides = {
  en: [
    { id: '1', title: 'Complete London Guide 2026', pages: '45 pages', price: '£9.99', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80', badge: 'Bestseller' },
    { id: '2', title: 'Halal Restaurant Guide', pages: '32 pages', price: '£7.99', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80', badge: 'New' },
    { id: '3', title: 'London Shopping Secrets', pages: '28 pages', price: '£6.99', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80', badge: null },
  ],
  ar: [
    { id: '1', title: 'دليل لندن الشامل 2026', pages: '45 صفحة', price: '£9.99', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80', badge: 'الأكثر مبيعاً' },
    { id: '2', title: 'دليل المطاعم الحلال', pages: '32 صفحة', price: '£7.99', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80', badge: 'جديد' },
    { id: '3', title: 'أسرار التسوق في لندن', pages: '28 صفحة', price: '£6.99', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80', badge: null },
  ],
}

const experiences = {
  en: [
    { id: '1', title: 'Harry Potter Studio Tour', rating: 4.9, reviews: 2453, price: 'From £55', image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80' },
    { id: '2', title: 'London Eye Experience', rating: 4.7, reviews: 3821, price: 'From £32', image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80' },
    { id: '3', title: 'Thames River Cruise', rating: 4.8, reviews: 1567, price: 'From £25', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80' },
    { id: '4', title: 'Tower of London Tour', rating: 4.8, reviews: 2891, price: 'From £30', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80' },
  ],
  ar: [
    { id: '1', title: 'جولة استوديو هاري بوتر', rating: 4.9, reviews: 2453, price: 'من £55', image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80' },
    { id: '2', title: 'عين لندن', rating: 4.7, reviews: 3821, price: 'من £32', image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80' },
    { id: '3', title: 'رحلة نهر التايمز', rating: 4.8, reviews: 1567, price: 'من £25', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80' },
    { id: '4', title: 'جولة برج لندن', rating: 4.8, reviews: 2891, price: 'من £30', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80' },
  ],
}

const hotels = {
  en: [
    { id: '1', name: 'The Dorchester', location: 'Mayfair', rating: 5, price: 'From £650/night', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', badge: 'Luxury' },
    { id: '2', name: 'The Ritz London', location: 'Piccadilly', rating: 5, price: 'From £750/night', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80', badge: '5 Star' },
    { id: '3', name: 'Claridges', location: 'Mayfair', rating: 5, price: 'From £580/night', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80', badge: 'Historic' },
  ],
  ar: [
    { id: '1', name: 'دورتشستر', location: 'مايفير', rating: 5, price: 'من £650/ليلة', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', badge: 'فاخر' },
    { id: '2', name: 'ريتز لندن', location: 'بيكاديلي', rating: 5, price: 'من £750/ليلة', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80', badge: '5 نجوم' },
    { id: '3', name: 'كلاريدجز', location: 'مايفير', rating: 5, price: 'من £580/ليلة', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80', badge: 'تاريخي' },
  ],
}

const text = {
  en: {
    trending: 'Trending',
    trendingItems: ['Arsenal vs Chelsea tickets selling fast', 'Harrods winter sale begins', 'New Year fireworks 2026 guide'],
    latestStories: 'Latest Stories',
    viewAll: 'View All',
    readMore: 'Read More',
    upcomingEvents: 'Upcoming Events',
    getTickets: 'Get Tickets',
    pdfGuides: 'Travel Guides',
    guidesSubtitle: 'Expert PDF guides crafted for Arab visitors',
    downloadNow: 'Download',
    topExperiences: 'Top Experiences',
    bookNow: 'Book Now',
    luxuryHotels: 'Luxury Hotels',
    viewDeals: 'View Details',
    newsletter: 'The Yalla Letter',
    newsletterDesc: 'Weekly London tips, exclusive deals, and insider guides delivered to your inbox every Friday.',
    emailPlaceholder: 'Enter your email',
    subscribeBtn: 'Subscribe Free',
    informationHub: 'Information Hub',
    informationHubSubtitle: 'Your complete guide to visiting London — from transport tips to hidden gems',
    exploreHub: 'Explore the Hub',
    infoSections: [
      { icon: 'Compass', title: 'Plan Your Trip', desc: 'Visa, flights, budgets & packing lists' },
      { icon: 'Map', title: 'Neighbourhood Guides', desc: 'Explore London area by area' },
      { icon: 'Train', title: 'Getting Around', desc: 'Tube, bus, Oyster & travel hacks' },
      { icon: 'Utensils', title: 'Food & Dining', desc: 'Halal restaurants & markets' },
      { icon: 'Users', title: 'Family & Kids', desc: 'Kid-friendly activities & tips' },
      { icon: 'Gem', title: 'Hidden Gems', desc: 'Secret spots locals love' },
    ],
    quickLinks: ['Experiences', 'Hotels', 'Events', 'Shop'],
    quickLinksHref: ['/experiences', '/hotels', '/events', '/shop'],
  },
  ar: {
    trending: 'الأكثر رواجاً',
    trendingItems: ['تذاكر آرسنال ضد تشيلسي تنفذ بسرعة', 'بداية تخفيضات هارودز الشتوية', 'دليل ألعاب رأس السنة 2026'],
    latestStories: 'أحدث المقالات',
    viewAll: 'عرض الكل',
    readMore: 'اقرأ المزيد',
    upcomingEvents: 'الفعاليات القادمة',
    getTickets: 'احصل على التذاكر',
    pdfGuides: 'أدلة السفر',
    guidesSubtitle: 'أدلة PDF متخصصة مصممة للزوار العرب',
    downloadNow: 'تحميل',
    topExperiences: 'أفضل التجارب',
    bookNow: 'احجز الآن',
    luxuryHotels: 'فنادق فاخرة',
    viewDeals: 'عرض التفاصيل',
    newsletter: 'نشرة يلا',
    newsletterDesc: 'نصائح لندن الأسبوعية والعروض الحصرية وأدلة من الداخل تصلك كل جمعة.',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    subscribeBtn: 'اشترك مجاناً',
    informationHub: 'مركز المعلومات',
    informationHubSubtitle: 'دليلك الشامل لزيارة لندن — من نصائح النقل إلى الجواهر المخفية',
    exploreHub: 'استكشف المركز',
    infoSections: [
      { icon: 'Compass', title: 'خطط لرحلتك', desc: 'التأشيرات والرحلات والميزانيات وقوائم التعبئة' },
      { icon: 'Map', title: 'أدلة الأحياء', desc: 'استكشف لندن منطقة بمنطقة' },
      { icon: 'Train', title: 'التنقل', desc: 'المترو والحافلات وأويستر ونصائح السفر' },
      { icon: 'Utensils', title: 'الطعام والمطاعم', desc: 'مطاعم حلال وأسواق' },
      { icon: 'Users', title: 'العائلة والأطفال', desc: 'أنشطة مناسبة للأطفال ونصائح' },
      { icon: 'Gem', title: 'جواهر مخفية', desc: 'أماكن سرية يحبها السكان المحليون' },
    ],
    quickLinks: ['تجارب', 'فنادق', 'فعاليات', 'متجر'],
    quickLinksHref: ['/experiences', '/hotels', '/events', '/shop'],
  },
}

// ─── Animated Tube Train Section Divider ──────────────────────────────────────

function TubeTrainDivider() {
  return (
    <div className="relative w-full max-w-6xl mx-auto py-6 overflow-hidden">
      {/* Track — tri-color rail */}
      <div className="flex h-[3px] w-full rounded-full overflow-hidden">
        <div className="flex-1 bg-london-600/30" />
        <div className="flex-1 bg-yalla-gold-500/30" />
        <div className="flex-1 bg-thames-500/30" />
      </div>

      {/* Animated Tube Train shuttling back and forth */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          animation: 'tubeShuttle 6s ease-in-out infinite',
        }}
      >
        <svg width="72" height="26" viewBox="0 0 72 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Train body */}
          <rect x="2" y="3" width="68" height="16" rx="8" fill="#C8322B" />
          {/* Roof stripe */}
          <rect x="8" y="3" width="56" height="2.5" rx="1.25" fill="#A02820" />
          {/* Windows */}
          <rect x="9" y="7" width="9" height="7" rx="1.5" fill="#E8F4FD" />
          <rect x="21" y="7" width="9" height="7" rx="1.5" fill="#E8F4FD" />
          <rect x="33" y="7" width="9" height="7" rx="1.5" fill="#E8F4FD" />
          <rect x="45" y="7" width="9" height="7" rx="1.5" fill="#E8F4FD" />
          {/* Door */}
          <rect x="58" y="6" width="8" height="9" rx="1.5" fill="#3B7EA1" />
          <circle cx="64" cy="10.5" r="0.7" fill="#C49A2A" />
          {/* Front light */}
          <circle cx="4.5" cy="11" r="1.8" fill="#C49A2A" />
          {/* Wheels */}
          <circle cx="14" cy="22" r="2.8" fill="#1C1917" />
          <circle cx="14" cy="22" r="1.3" fill="#78716C" />
          <circle cx="36" cy="22" r="2.8" fill="#1C1917" />
          <circle cx="36" cy="22" r="1.3" fill="#78716C" />
          <circle cx="58" cy="22" r="2.8" fill="#1C1917" />
          <circle cx="58" cy="22" r="1.3" fill="#78716C" />
          {/* Tri-color stripe along bottom */}
          <rect x="5" y="17" width="20" height="1.5" rx="0.75" fill="#C8322B" opacity="0.5" />
          <rect x="27" y="17" width="20" height="1.5" rx="0.75" fill="#C49A2A" opacity="0.5" />
          <rect x="49" y="17" width="20" height="1.5" rx="0.75" fill="#3B7EA1" opacity="0.5" />
        </svg>
      </div>

      {/* Keyframes injected via style tag (scoped to this component) */}
      <style jsx>{`
        @keyframes tubeShuttle {
          0% { left: -80px; }
          45% { left: calc(100% + 8px); }
          50% { left: calc(100% + 8px); transform: translateY(-50%) scaleX(-1); }
          95% { left: -80px; transform: translateY(-50%) scaleX(-1); }
          100% { left: -80px; transform: translateY(-50%) scaleX(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, href, linkText, icon: Icon }: { title: string; href: string; linkText: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-london-600" />}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-charcoal">{title}</h2>
      </div>
      <Link href={href} className="group flex items-center gap-1.5 text-sm font-semibold text-london-600 hover:text-london-700 transition-colors">
        {linkText}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function YallaHomepage({ locale = 'en' }: YallaHomepageProps) {
  const [email, setEmail] = useState('')
  const isRTL = locale === 'ar'
  const t = text[locale]
  const hero = heroSlides[locale][0]
  const featured = featuredArticle[locale]

  return (
    <div className={`bg-cream ${isRTL ? 'font-arabic' : 'font-editorial'}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        {/* Background Image */}
        <Image
          src={hero.image}
          alt="London"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl"
          >
            {/* Tricolor Accent */}
            <div className="flex gap-1 mb-6">
              <div className="w-8 h-1 bg-london-600 rounded-full" />
              <div className="w-8 h-1 bg-yalla-gold-500 rounded-full" />
              <div className="w-8 h-1 bg-thames-500 rounded-full" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white leading-tight mb-2">
              {hero.title}
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-yalla-gold-400 leading-tight mb-6">
              {hero.subtitle}
            </h2>
            <p className="text-lg text-cream-300 mb-8 max-w-xl leading-relaxed">
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={hero.ctaLink}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-london-600 text-white font-semibold rounded-lg hover:bg-london-700 transition-colors shadow-elegant"
              >
                {hero.cta} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Download className="w-4 h-4" /> {locale === 'ar' ? 'تحميل الدليل' : 'Get the Guide'}
              </Link>
            </div>
          </motion.div>

          {/* Quick Navigation Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap gap-3 mt-10"
          >
            {t.quickLinks.map((label, i) => (
              <Link
                key={i}
                href={t.quickLinksHref[i]}
                className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/15 hover:bg-white/20 hover:border-white/30 transition-all"
              >
                {label}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tube Train Divider */}
      <TubeTrainDivider />

      {/* ═══ TRENDING BAR ═══ */}
      <div className="bg-cream-50 border-b border-sand py-3 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-london-600 uppercase tracking-wider whitespace-nowrap">
            <TrendingUp className="w-4 h-4" />
            {t.trending}
          </div>
          <div className="w-px h-4 bg-sand" />
          {t.trendingItems.map((item, i) => (
            <span key={i} className="text-sm text-stone whitespace-nowrap hover:text-charcoal transition-colors cursor-pointer">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ LONDON TODAY NEWS CAROUSEL ═══ */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-4">
        <NewsCarousel />
      </section>

      <TubeTrainDivider />

      {/* ═══ FEATURED + ARTICLES ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <SectionHeader title={t.latestStories} href="/blog" linkText={t.viewAll} icon={BookOpen} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Featured Article — Large */}
          <Link href={`/blog/${featured.slug}`} className="lg:col-span-3 group">
            <article className="relative h-full min-h-[400px] rounded-2xl overflow-hidden shadow-luxury">
              <Image src={featured.image} alt={featured.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <span className="inline-block px-3 py-1 bg-london-600 text-white text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                  {featured.category}
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-3 group-hover:text-yalla-gold-300 transition-colors">
                  {featured.title}
                </h3>
                <p className="text-cream-300 text-sm mb-4 max-w-lg line-clamp-2">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-cream-400">
                  <span>{featured.author}</span>
                  <span className="w-1 h-1 bg-cream-400 rounded-full" />
                  <span>{featured.date}</span>
                  <span className="w-1 h-1 bg-cream-400 rounded-full" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featured.readTime}</span>
                </div>
              </div>
            </article>
          </Link>

          {/* Article List */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {articles[locale].map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="group">
                <article className="flex gap-4 bg-white rounded-xl p-4 shadow-card hover:shadow-luxury transition-shadow border border-sand/50">
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image src={article.image} alt={article.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs font-semibold text-london-600 uppercase tracking-wide mb-1">{article.category}</span>
                    <h4 className="text-sm font-bold text-charcoal group-hover:text-london-600 transition-colors line-clamp-2 mb-1.5">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-stone">
                      <span>{article.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}

            {/* Newsletter Compact */}
            <div className="bg-gradient-to-br from-charcoal to-charcoal-light rounded-xl p-6 flex-1 min-h-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yalla-gold-400" />
                <h3 className="text-sm font-bold text-white">{t.newsletter}</h3>
              </div>
              <p className="text-xs text-cream-400 mb-3 line-clamp-2">{t.newsletterDesc}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-cream-500 focus:outline-none focus:ring-1 focus:ring-london-600"
                />
                <button className="px-4 py-2 bg-london-600 text-white text-xs font-bold rounded-lg hover:bg-london-700 transition-colors whitespace-nowrap">
                  {t.subscribeBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TubeTrainDivider />

      {/* ═══ EVENTS ═══ */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={t.upcomingEvents} href="/events" linkText={t.viewAll} icon={Ticket} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events[locale].map((event) => (
              <div key={event.id} className="group bg-cream rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all border border-sand/50">
                <div className="relative h-44">
                  <Image src={event.image} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 to-transparent" />
                  <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} bg-white rounded-xl px-3 py-2 text-center shadow-elegant`}>
                    <div className="text-2xl font-display font-bold text-charcoal leading-none">{event.day}</div>
                    <div className="text-[10px] font-bold text-london-600 uppercase tracking-wider">{event.month}</div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-charcoal mb-1.5 group-hover:text-london-600 transition-colors">{event.title}</h3>
                  <p className="text-sm text-stone flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5" /> {event.venue}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-charcoal">{event.price}</span>
                    <Link href="/events" className="px-4 py-2 bg-london-600 text-white text-sm font-semibold rounded-lg hover:bg-london-700 transition-colors">
                      {t.getTickets}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TubeTrainDivider />

      {/* ═══ INFORMATION HUB ═══ */}
      <section className="bg-cream py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={t.informationHub} href="/information" linkText={t.viewAll} icon={BookOpen} />
          <p className="text-stone text-sm -mt-4 mb-8">{t.informationHubSubtitle}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {t.infoSections.map((section, i) => {
              const iconMap: Record<string, React.ElementType> = {
                Compass, Map, Train, Utensils, Users, Gem,
              }
              const IconComp = iconMap[section.icon] || BookOpen
              return (
                <Link key={i} href="/information" className="group">
                  <div className="bg-white rounded-2xl p-5 text-center shadow-card hover:shadow-luxury transition-all border border-sand/50 h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-london-600/10 flex items-center justify-center group-hover:bg-london-600 transition-colors">
                      <IconComp className="w-6 h-6 text-london-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-charcoal group-hover:text-london-600 transition-colors">{section.title}</h3>
                    <p className="text-xs text-stone leading-relaxed">{section.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/information"
              className="inline-flex items-center gap-2 px-6 py-3 bg-london-600 text-white font-semibold rounded-lg hover:bg-london-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {t.exploreHub}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>

      <TubeTrainDivider />

      {/* ═══ GUIDES ═══ */}
      <section className="bg-white py-16 bg-pattern-arabesque">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={t.pdfGuides} href="/shop" linkText={t.viewAll} icon={Download} />
          <p className="text-stone text-sm -mt-4 mb-8">{t.guidesSubtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guides[locale].map((guide) => (
              <div key={guide.id} className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all border border-sand/50">
                <div className="relative h-52">
                  <Image src={guide.image} alt={guide.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent" />
                  {guide.badge && (
                    <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} px-3 py-1 bg-yalla-gold-500 text-white text-xs font-bold rounded-full`}>
                      {guide.badge}
                    </span>
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-bold text-white">{guide.title}</h3>
                    <p className="text-xs text-cream-300 mt-1">{guide.pages}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-charcoal">{guide.price}</span>
                    <Link href="/shop" className="flex items-center gap-2 px-4 py-2.5 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal-light transition-colors">
                      <Download className="w-4 h-4" /> {t.downloadNow}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TubeTrainDivider />

      {/* ═══ EXPERIENCES ═══ */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={t.topExperiences} href="/experiences" linkText={t.viewAll} icon={Star} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {experiences[locale].map((exp) => (
              <Link key={exp.id} href="/experiences" className="group">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 shadow-card group-hover:shadow-luxury transition-all">
                  <Image src={exp.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
                  <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold flex items-center gap-1 shadow-sm`}>
                    <Star className="w-3 h-3 text-yalla-gold-500 fill-yalla-gold-500" /> {exp.rating}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-white text-sm mb-1 group-hover:text-yalla-gold-300 transition-colors">{exp.title}</h3>
                    <p className="text-xs text-cream-400">{exp.reviews.toLocaleString()} {locale === 'ar' ? 'تقييم' : 'reviews'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-charcoal">{exp.price}</span>
                  <span className="text-xs font-semibold text-london-600 group-hover:underline">{t.bookNow}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TubeTrainDivider />

      {/* ═══ HOTELS ═══ */}
      <section className="bg-cream py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader title={t.luxuryHotels} href="/hotels" linkText={t.viewAll} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hotels[locale].map((hotel) => (
              <Link key={hotel.id} href="/hotels" className="group">
                <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all border border-sand/50">
                  <div className="relative h-52">
                    <Image src={hotel.image} alt={hotel.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} px-3 py-1 bg-yalla-gold-500 text-white text-xs font-bold rounded-full`}>
                      {hotel.badge}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-0.5 mb-2">
                      {Array.from({ length: hotel.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-yalla-gold-500 fill-yalla-gold-500" />
                      ))}
                    </div>
                    <h3 className="text-lg font-bold text-charcoal mb-1 group-hover:text-london-600 transition-colors">{hotel.name}</h3>
                    <p className="text-sm text-stone flex items-center gap-1.5 mb-4">
                      <MapPin className="w-3.5 h-3.5" /> {hotel.location}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-sand">
                      <span className="text-sm font-bold text-charcoal">{hotel.price}</span>
                      <span className="px-4 py-2 border-2 border-charcoal text-charcoal text-sm font-semibold rounded-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                        {t.viewDeals}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM TUBE DIVIDER ═══ */}
      <TubeTrainDivider />

      {/* ═══ FOLLOW US ═══ */}
      <section className="bg-charcoal py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  )
}

export default YallaHomepage
