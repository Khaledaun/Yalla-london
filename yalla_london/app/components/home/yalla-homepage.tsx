'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronRight, MapPin, Star, Clock,
  Download, ArrowRight, Sparkles, Calendar,
  TrendingUp, BookOpen, Ticket, Compass, Map, Train, Utensils, Users, Gem
} from 'lucide-react'
import { NewsCarousel } from '@/components/news-carousel'
import { NewsSideBanner } from '@/components/news-side-banner'
import { WeatherStrip } from '@/components/weather-strip'
import { FollowUs } from '@/components/follow-us'
import { TriBar, BrandButton, BrandTag, BrandCard, BrandCardLight, SectionLabel, WatermarkStamp } from '@/components/brand-kit'
import { getPageAffiliateLink } from '@/lib/affiliate/page-affiliate-links'

interface YallaHomepageProps {
  locale?: 'en' | 'ar'
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Ahmed Al-Rashid',
    initials: 'AR',
    location: 'Dubai, UAE',
    locationAr: 'دبي، الإمارات',
    stars: 5,
    textEn: 'Yalla London helped me find the best halal restaurants and family-friendly attractions. Their insider tips on the Harrods food hall saved us hours of searching.',
    textAr: 'ساعدني يالا لندن في العثور على أفضل المطاعم الحلال والأماكن المناسبة للعائلات. نصائحهم عن قسم الطعام في هارودز وفرت علينا ساعات من البحث.',
  },
  {
    name: 'Fatima Al-Kuwari',
    initials: 'FK',
    location: 'Doha, Qatar',
    locationAr: 'الدوحة، قطر',
    stars: 5,
    textEn: 'I planned my entire 10-day London trip using their guides. The neighborhood breakdowns and hotel reviews were spot-on — exactly what I needed as a first-time visitor.',
    textAr: 'خططت رحلتي إلى لندن لمدة 10 أيام باستخدام أدلتهم. تحليل الأحياء ومراجعات الفنادق كانت دقيقة — بالضبط ما احتجته كزائرة لأول مرة.',
  },
  {
    name: 'Omar Bassam',
    initials: 'OB',
    location: 'Riyadh, KSA',
    locationAr: 'الرياض، السعودية',
    stars: 5,
    textEn: 'The best Arabic resource for London travel. Their guide to Knightsbridge shopping and the seasonal events calendar made our family holiday unforgettable.',
    textAr: 'أفضل مصدر عربي للسفر إلى لندن. دليلهم للتسوق في نايتسبريدج وتقويم الفعاليات الموسمية جعل إجازة عائلتنا لا تُنسى.',
  },
]

const HERO_IMAGES = [
  { src: '/images/hero/tower-bridge.jpg', alt: 'Tower Bridge with London red bus' },
  { src: '/images/hero/london-city-night.jpg', alt: 'London city view at night' },
  { src: '/images/hero/london-tube.jpg', alt: 'London Underground station' },
]

const HERO_INTERVAL_MS = 3000

const heroContent = {
  en: {
    titleLine1: 'Experience London',
    titleLine2: 'Your Way',
    description: 'Your definitive Arabic guide to the best of London — curated luxury experiences, halal dining, and insider secrets.',
    cta: 'Start Exploring',
    ctaLink: '/blog',
  },
  ar: {
    titleLine1: 'اكتشف لندن',
    titleLine2: 'على طريقتك',
    description: 'دليلك العربي الشامل لأفضل ما في لندن — تجارب فاخرة مختارة، مطاعم حلال، وأسرار من الداخل.',
    cta: 'ابدأ الاستكشاف',
    ctaLink: '/blog',
  },
}

const featuredArticle = {
  en: {
    slug: 'best-halal-restaurants-central-london-2026',
    category: 'Editor\'s Pick',
    title: 'Best Halal Restaurants in Central London 2026',
    excerpt: '25+ vetted halal restaurants across Mayfair, Soho and Knightsbridge with honest pricing, certification notes and booking tips.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    author: 'Yalla London Team',
    date: 'Mar 2026',
    readTime: '5 min read',
  },
  ar: {
    slug: 'best-halal-restaurants-central-london-2026',
    category: 'اختيار المحرر',
    title: 'أفضل المطاعم الحلال في وسط لندن 2026',
    excerpt: 'أكثر من 25 مطعماً حلالاً في مايفير وسوهو ونايتسبريدج مع أسعار دقيقة وملاحظات الاعتماد ونصائح الحجز.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    author: 'فريق يلا لندن',
    date: 'مارس 2026',
    readTime: '5 دقائق للقراءة',
  },
}

const fallbackArticles = {
  en: [
    {
      id: '2',
      slug: 'spring-london-2026-best-things-to-do-arab-visitors',
      category: 'Travel',
      title: 'Spring in London 2026: Best Things to Do',
      excerpt: 'Cherry blossoms, outdoor markets, and longer days — your complete guide to London this spring.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: 'Mar 2026',
      readTime: '8 min read',
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-which-better-2026',
      category: 'Shopping',
      title: 'Harrods vs Selfridges: Which is Better?',
      excerpt: 'A detailed comparison of London\'s two iconic department stores for luxury shoppers.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: 'Mar 2026',
      readTime: '6 min read',
    },
    {
      id: '4',
      slug: 'best-halal-restaurants-central-london-2026',
      category: 'Dining',
      title: 'Best Halal Restaurants in Central London',
      excerpt: '25+ vetted halal restaurants across Mayfair, Soho and Knightsbridge with honest reviews.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      date: 'Mar 2026',
      readTime: '7 min read',
    },
  ],
  ar: [
    {
      id: '2',
      slug: 'spring-london-2026-best-things-to-do-arab-visitors',
      category: 'سفر',
      title: 'الربيع في لندن 2026: أفضل الأنشطة',
      excerpt: 'أزهار الكرز والأسواق المفتوحة وأيام أطول — دليلك الشامل للندن في الربيع.',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      date: 'مارس 2026',
      readTime: '8 دقائق',
    },
    {
      id: '3',
      slug: 'harrods-vs-selfridges-which-better-2026',
      category: 'تسوق',
      title: 'هارودز أم سيلفريدجز: أيهما أفضل؟',
      excerpt: 'مقارنة تفصيلية بين أشهر متجرين في لندن للمتسوقين الفاخرين.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      date: 'مارس 2026',
      readTime: '6 دقائق',
    },
    {
      id: '4',
      slug: 'best-halal-restaurants-central-london-2026',
      category: 'مطاعم',
      title: 'أفضل المطاعم الحلال في وسط لندن',
      excerpt: 'أكثر من 25 مطعماً حلالاً في مايفير وسوهو ونايتسبريدج مع تقييمات صادقة.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
      date: 'مارس 2026',
      readTime: '7 دقائق',
    },
  ],
}

// Events are now fetched LIVE from Ticketmaster API via /api/integrations/events
// Fallback data shown only when API key is not configured or API fails
const FALLBACK_EVENTS = {
  en: [
    { id: '1', title: 'West Ham vs Arsenal', venue: 'London Stadium', day: '05', month: 'Apr', price: 'From £85', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80', url: '' },
    { id: '2', title: 'London Marathon 2026', venue: 'Greenwich to The Mall', day: '26', month: 'Apr', price: 'Free to watch', image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=80', url: '' },
    { id: '3', title: 'Chelsea Flower Show', venue: 'Royal Hospital Chelsea', day: '19', month: 'May', price: 'From £40', image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&q=80', url: '' },
    { id: '4', title: 'Wimbledon Championships', venue: 'All England Club', day: '29', month: 'Jun', price: 'From £90', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&q=80', url: '' },
    { id: '5', title: 'Notting Hill Carnival', venue: 'Notting Hill', day: '30', month: 'Aug', price: 'Free', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80', url: '' },
    { id: '6', title: 'The Lion King — West End', venue: 'Lyceum Theatre', day: '30', month: 'Apr', price: 'From £45', image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80', url: '' },
  ],
  ar: [
    { id: '1', title: 'وست هام ضد آرسنال', venue: 'ملعب لندن', day: '05', month: 'أبريل', price: 'من £85', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80', url: '' },
    { id: '2', title: 'ماراثون لندن 2026', venue: 'غرينيتش إلى ذا مول', day: '26', month: 'أبريل', price: 'مجاني للمشاهدة', image: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=80', url: '' },
    { id: '3', title: 'معرض تشيلسي للزهور', venue: 'مستشفى تشيلسي الملكي', day: '19', month: 'مايو', price: 'من £40', image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&q=80', url: '' },
    { id: '4', title: 'بطولة ويمبلدون', venue: 'نادي إنجلترا', day: '29', month: 'يونيو', price: 'من £90', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&q=80', url: '' },
    { id: '5', title: 'كرنفال نوتينغ هيل', venue: 'نوتينغ هيل', day: '30', month: 'أغسطس', price: 'مجاني', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80', url: '' },
    { id: '6', title: 'الأسد الملك — ويست إند', venue: 'مسرح ليسيوم', day: '30', month: 'أبريل', price: 'من £45', image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80', url: '' },
  ],
}

type EventItem = { id: string; title: string; venue: string; day: string; month: string; price: string; image: string; url: string }

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
    { id: '1', name: 'The Dorchester', location: 'Mayfair', category: 'Ultra-Luxury Stays', rating: 5, price: 'From £650/night', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', badge: 'Luxury' },
    { id: '2', name: 'The Ritz London', location: 'Piccadilly', category: 'Designer Hotels', rating: 5, price: 'From £750/night', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80', badge: '5 Star' },
    { id: '3', name: 'Claridges', location: 'Mayfair', category: 'Heritage Collection', rating: 5, price: 'From £580/night', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80', badge: 'Historic' },
  ],
  ar: [
    { id: '1', name: 'دورتشستر', location: 'مايفير', category: 'إقامة فاخرة للغاية', rating: 5, price: 'من £650/ليلة', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', badge: 'فاخر' },
    { id: '2', name: 'ريتز لندن', location: 'بيكاديلي', category: 'فنادق مصمّمة', rating: 5, price: 'من £750/ليلة', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80', badge: '5 نجوم' },
    { id: '3', name: 'كلاريدجز', location: 'مايفير', category: 'التراث البريطاني', rating: 5, price: 'من £580/ليلة', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80', badge: 'تاريخي' },
  ],
}

const text = {
  en: {
    trending: 'Trending',
    trendingItems: ['London Marathon 2026 entries open', 'Ramadan in London guide — iftar spots', 'Spring in London — best parks and walks'],
    latestStories: 'Latest Stories',
    viewAll: 'View All',
    readMore: 'Read More',
    upcomingEvents: 'Upcoming Events',
    getTickets: 'Get Tickets',
    pdfGuides: 'Travel Guides',
    guidesSubtitle: 'Expert PDF guides crafted for Arab visitors',
    downloadNow: 'Coming Soon',
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
    trendingItems: ['ماراثون لندن 2026 — التسجيل مفتوح', 'رمضان في لندن — أماكن الإفطار', 'الربيع في لندن — أفضل الحدائق والمشي'],
    latestStories: 'أحدث المقالات',
    viewAll: 'عرض الكل',
    readMore: 'اقرأ المزيد',
    upcomingEvents: 'الفعاليات القادمة',
    getTickets: 'احصل على التذاكر',
    pdfGuides: 'أدلة السفر',
    guidesSubtitle: 'أدلة PDF متخصصة مصممة للزوار العرب',
    downloadNow: 'قريباً',
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

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, href, linkText, icon: Icon, isArabic }: { title: string; href: string; linkText: string; icon?: React.ElementType; isArabic?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-yl-gold" />}
        <h2 className={`text-2xl md:text-3xl font-heading font-bold text-yl-charcoal ${isArabic ? 'font-arabic' : ''}`}>{title}</h2>
      </div>
      <Link href={href} className="group flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-yl-red hover:text-yl-gold transition-colors duration-300 ease-yl">
        {linkText}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300 ease-yl" />
      </Link>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── Dynamic Article Type ────────────────────────────────────────────────────

interface DBArticle {
  id: string
  slug: string | null
  title_en: string | null
  title_ar: string | null
  meta_description_en: string | null
  meta_description_ar: string | null
  seo_score: number | null
  created_at: string
  category?: { name: string } | null
}

function formatRelativeDate(dateStr: string, lang: 'en' | 'ar'): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (lang === 'ar') {
    if (diffDays === 0) return 'اليوم'
    if (diffDays === 1) return 'أمس'
    if (diffDays < 7) return `قبل ${diffDays} أيام`
    return d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
  }
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export function YallaHomepage({ locale = 'en' }: YallaHomepageProps) {
  const [email, setEmail] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const [dbArticles, setDbArticles] = useState<DBArticle[]>([])
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([])
  const isRTL = locale === 'ar'
  const t = text[locale]
  const hero = heroContent[locale]
  const featured = featuredArticle[locale]

  // Fetch REAL events from Ticketmaster API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/integrations/events?siteId=yalla-london&limit=6')
        if (res.ok) {
          const json = await res.json()
          const tmEvents = json.events || []
          if (Array.isArray(tmEvents) && tmEvents.length > 0) {
            const months = locale === 'ar'
              ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
              : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            setLiveEvents(tmEvents.map((e: Record<string, unknown>) => {
              const d = new Date(String(e.date) + 'T00:00:00')
              const priceMin = e.priceMin as number | undefined
              const priceMax = e.priceMax as number | undefined
              const currency = (e.currency as string) === 'GBP' ? '£' : '$'
              let price = locale === 'ar' ? 'مشاهدة الأسعار' : 'See prices'
              if (priceMin) {
                price = locale === 'ar'
                  ? `من ${currency}${Math.round(priceMin)}`
                  : priceMax && priceMax !== priceMin
                    ? `${currency}${Math.round(priceMin)} – ${currency}${Math.round(priceMax)}`
                    : `From ${currency}${Math.round(priceMin)}`
              }
              return {
                id: e.id as string,
                title: e.name as string,
                venue: e.venue as string,
                day: String(d.getDate()).padStart(2, '0'),
                month: months[d.getMonth()],
                price,
                image: (e.imageUrl as string) || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80',
                url: (e.url as string) || '',
              }
            }))
          }
        }
      } catch { /* fall back to static events */ }
    })()
  }, [locale])

  // Use live Ticketmaster events if available, otherwise fallback
  const displayEvents = liveEvents.length > 0 ? liveEvents : FALLBACK_EVENTS[locale]

  // Inject Event structured data (JSON-LD) for SEO — only for live Ticketmaster events with real URLs
  useEffect(() => {
    if (liveEvents.length === 0) return undefined;
    const existingScript = document.getElementById('homepage-events-jsonld')
    if (existingScript) existingScript.remove()

    const currentYear = new Date().getFullYear()
    const monthMap: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }
    const events = liveEvents.map(e => {
      const mm = monthMap[e.month] || '01'
      const dateStr = `${currentYear}-${mm}-${e.day.padStart(2,'0')}`
      return {
        '@type': 'Event',
        name: e.title,
        startDate: dateStr,
        location: { '@type': 'Place', name: e.venue, address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' } },
        ...(e.url ? { url: e.url } : {}),
        ...(e.image ? { image: e.image } : {}),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
      }
    })

    const script = document.createElement('script')
    script.id = 'homepage-events-jsonld'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': events })
    document.head.appendChild(script)

    return () => { script.remove() }
  }, [liveEvents])

  // Fetch real published articles from DB for the "Latest Stories" section
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/blog?limit=6&sort=newest')
        if (res.ok) {
          const json = await res.json()
          const posts = json.posts || json.articles || json.data || []
          if (Array.isArray(posts) && posts.length > 0) {
            setDbArticles(posts)
          }
        }
      } catch { /* fallback to hardcoded */ }
    })()
  }, [])

  // Build article list: DB articles first, then fallback
  const articles = dbArticles.length > 0
    ? dbArticles.slice(0, 3).map((a, i) => ({
        id: a.id || String(i),
        slug: a.slug || '#',
        category: a.category?.name || (locale === 'ar' ? 'مقال' : 'Article'),
        title: (locale === 'ar' ? a.title_ar : a.title_en) || a.title_en || '',
        excerpt: (locale === 'ar' ? a.meta_description_ar : a.meta_description_en) || a.meta_description_en || '',
        image: `https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80`,
        date: formatRelativeDate(a.created_at, locale),
        readTime: locale === 'ar' ? '5 دقائق' : '5 min read',
      }))
    : fallbackArticles[locale]

  // Use first DB article as featured if available
  const effectiveFeatured = dbArticles.length > 0
    ? {
        ...featured,
        slug: dbArticles[0].slug || featured.slug,
        title: (locale === 'ar' ? dbArticles[0].title_ar : dbArticles[0].title_en) || featured.title,
        excerpt: (locale === 'ar' ? dbArticles[0].meta_description_ar : dbArticles[0].meta_description_en) || featured.excerpt,
        date: formatRelativeDate(dbArticles[0].created_at, locale),
      }
    : featured

  const nextSlide = useCallback(() => {
    setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length)
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return undefined
    const timer = setInterval(nextSlide, HERO_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <div className={`bg-yl-cream ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══ NEWS SIDE BANNER — floats on right edge ═══ */}
      <NewsSideBanner />

      {/* ═══ HERO — Full-screen immersive ═══ */}
      {/* -mt-24 pulls hero UP behind the fixed header so it starts from the very top */}
      <section className="relative w-full h-screen min-h-[600px] flex items-end overflow-hidden -mt-24 -mx-[calc((100vw-100%)/2)]" style={{ width: '100vw' }}>
        {/* Rotating Background Images — full bleed */}
        {HERO_IMAGES.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            sizes="100vw"
            className={`object-cover transition-opacity duration-1000 ease-yl ${i === heroIndex ? 'opacity-100' : 'opacity-0'}`}
            priority={i === 0}
          />
        ))}
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-yl-dark-navy via-yl-dark-navy/50 to-yl-dark-navy/20" />

        {/* Watermark Stamps — multiple for immersive feel */}
        <WatermarkStamp />
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <img
            src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png"
            alt=""
            className="absolute left-[-60px] top-[15%] w-[200px] h-[200px] opacity-[0.04] object-contain rotate-[-15deg]"
          />
          <img
            src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png"
            alt=""
            className="absolute right-[10%] top-[8%] w-[160px] h-[160px] opacity-[0.03] object-contain rotate-[12deg]"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-7 pb-20 md:pb-28">
          <div className="max-w-2xl">
            {/* Section label */}
            <span style={{ textShadow: '0 1px 6px rgba(15,22,33,0.5)' }}>
              <SectionLabel className="mb-4">
                {isRTL ? 'دليلك الفاخر' : 'Your Luxury Guide'}
              </SectionLabel>
            </span>

            <h1
              className={`text-5xl sm:text-6xl md:text-8xl font-heading font-extrabold leading-[1.05] mb-4 ${isRTL ? 'font-arabic' : ''}`}
              style={{ textShadow: '0 2px 16px rgba(15,22,33,0.8), 0 1px 4px rgba(15,22,33,0.6)' }}
            >
              <span className="text-yl-parchment">{hero.titleLine1}</span>
              <br />
              <span className="text-yl-red">{hero.titleLine2}</span>
            </h1>
            <p
              className="font-body text-lg md:text-xl text-white/80 mb-10 max-w-xl leading-relaxed"
              style={{ textShadow: '0 1px 8px rgba(15,22,33,0.6)' }}
            >
              {hero.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <BrandButton variant="primary" size="lg" href={hero.ctaLink}>
                {hero.cta} <ArrowRight className="w-4 h-4 ml-2" />
              </BrandButton>
              <BrandButton variant="outline" size="lg" href="/shop">
                <Download className="w-4 h-4 mr-2" /> {locale === 'ar' ? 'تحميل الدليل' : 'Get the Guide'}
              </BrandButton>
            </div>
          </div>

          {/* Quick Navigation Pills */}
          <div className="flex flex-wrap gap-3 mt-12">
            {t.quickLinks.map((label, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-white/30 select-none mx-1" aria-hidden="true">|</span>}
                <Link
                  href={t.quickLinksHref[i]}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-yl-parchment font-mono text-[10px] tracking-[1.5px] uppercase rounded-full border border-white/20 hover:bg-white/20 hover:border-yl-gold/50 hover:text-yl-gold transition-all duration-300 ease-yl"
                >
                  {label}
                </Link>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2">
            <div className="w-1 h-2.5 rounded-full bg-white/50 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Tri-bar Divider */}
      <TriBar />

      {/* ═══ TRENDING BAR ═══ */}
      <div className="bg-yl-cream border-b border-yl-gray-200 py-3 px-7">
        <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-yl-red uppercase tracking-widest whitespace-nowrap">
            <TrendingUp className="w-4 h-4" />
            {t.trending}
          </div>
          <div className="w-px h-4 bg-yl-gray-300" />
          {t.trendingItems.map((item, i) => (
            <span key={i} className="font-body text-sm text-yl-gray-500 whitespace-nowrap hover:text-yl-charcoal transition-colors duration-300 ease-yl cursor-pointer">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ═══ FEATURED + ARTICLES (moved above news per redesign) ═══ */}
      <section className="relative max-w-7xl mx-auto px-7 py-16">
        {/* Subtle watermark */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <img src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png" alt="" className="absolute -right-20 top-10 w-[250px] h-[250px] opacity-[0.03] object-contain rotate-[8deg]" />
        </div>
        <SectionHeader title={t.latestStories} href="/blog" linkText={t.viewAll} icon={BookOpen} isArabic={isRTL} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Featured Article — Large */}
          <Link href={`/blog/${effectiveFeatured.slug}`} className="lg:col-span-3 group">
            <article className="relative h-full min-h-[400px] rounded-[14px] overflow-hidden border border-white/5">
              <Image src={effectiveFeatured.image} alt={effectiveFeatured.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500 ease-yl" />
              <div className="absolute inset-0 bg-gradient-to-t from-yl-dark-navy via-yl-dark-navy/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <BrandTag color="red" className="mb-4">
                  {effectiveFeatured.category}
                </BrandTag>
                <h3 className={`text-2xl md:text-3xl font-heading font-bold text-yl-parchment mb-3 group-hover:text-yl-gold transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>
                  {effectiveFeatured.title}
                </h3>
                <p className="font-body text-sm text-yl-gray-400 mb-4 max-w-lg line-clamp-2">{effectiveFeatured.excerpt}</p>
                <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider uppercase text-yl-gray-500">
                  <span>{effectiveFeatured.author}</span>
                  <span className="w-1 h-1 bg-yl-gray-500 rounded-full" />
                  <span>{effectiveFeatured.date}</span>
                  <span className="w-1 h-1 bg-yl-gray-500 rounded-full" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {effectiveFeatured.readTime}</span>
                </div>
              </div>
            </article>
          </Link>

          {/* Article List */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {articles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="group">
                <BrandCardLight hoverable className="p-0">
                  <article className="flex gap-4 p-4">
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image src={article.image} alt={article.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-mono text-[9px] font-semibold text-yl-red uppercase tracking-wider mb-1">{article.category}</span>
                      <h4 className={`text-sm font-heading font-bold text-yl-charcoal group-hover:text-yl-red transition-colors duration-300 ease-yl line-clamp-2 mb-1.5 ${isRTL ? 'font-arabic' : ''}`}>
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-yl-gray-500 tracking-wider">
                        <span>{article.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                      </div>
                    </div>
                  </article>
                </BrandCardLight>
              </Link>
            ))}

            {/* Newsletter Compact */}
            <BrandCard hoverable={false} className="p-6 flex-1 min-h-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yl-gold" />
                <h3 className={`font-heading text-sm font-bold text-yl-parchment ${isRTL ? 'font-arabic' : ''}`}>{t.newsletter}</h3>
              </div>
              <p className="font-body text-xs text-yl-gray-400 mb-3 line-clamp-2">{t.newsletterDesc}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-yl-parchment placeholder-yl-gray-500 focus:outline-none focus:ring-2 focus:ring-yl-gold/20 focus:border-yl-gold transition-all duration-300 ease-yl"
                />
                <button className="px-4 py-2 bg-yl-red text-white font-mono text-[10px] font-bold tracking-wider uppercase rounded-lg hover:bg-[#a82924] transition-all duration-300 ease-yl whitespace-nowrap">
                  {t.subscribeBtn}
                </button>
              </div>
            </BrandCard>
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ EVENTS ═══ */}
      <section className="relative bg-white py-16 overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7">
          <SectionHeader title={t.upcomingEvents} href="/events" linkText={t.viewAll} icon={Ticket} isArabic={isRTL} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map((event) => {
              // Link to real Ticketmaster page if available, otherwise /events
              const ticketHref = event.url || getPageAffiliateLink(event.title, 'experience', 'yalla-london', 'homepage-events')
              return (
              <div key={event.id} className="group bg-yl-cream rounded-[14px] overflow-hidden border border-yl-gray-200 hover:-translate-y-1 hover:border-yl-gold/30 hover:shadow-lg transition-all duration-400 ease-yl">
                <div className="relative h-44">
                  <Image src={event.image} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300 ease-yl" unoptimized={event.image.includes('ticketmaster') || event.image.includes('tmol')} />
                  <div className="absolute inset-0 bg-gradient-to-t from-yl-charcoal/50 to-transparent" />
                  <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} bg-white rounded-xl px-3 py-2 text-center shadow-md`}>
                    <div className="text-2xl font-heading font-bold text-yl-charcoal leading-none">{event.day}</div>
                    <div className="font-mono text-[9px] font-bold text-yl-red uppercase tracking-wider">{event.month}</div>
                  </div>
                  {liveEvents.length > 0 && (
                    <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
                      <span className="bg-green-500 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-1.5 group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{event.title}</h3>
                  <p className="font-body text-sm text-yl-gray-500 flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5" /> {event.venue}
                  </p>
                  <span className="block font-mono text-sm font-bold text-yl-charcoal tracking-wider mb-3">{event.price}</span>
                  {event.url ? (
                    <a href={event.url} target="_blank" rel="noopener sponsored" className="inline-flex items-center justify-center font-mono tracking-wider uppercase rounded-lg transition-all duration-300 ease-yl bg-yl-red text-white hover:bg-[#a82924] hover:-translate-y-0.5 shadow-lg py-2 px-4 text-[9px] w-full justify-center">
                      {t.getTickets}
                    </a>
                  ) : (
                    <BrandButton variant="primary" size="sm" href="/events" className="w-full justify-center">
                      {t.getTickets}
                    </BrandButton>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ INFORMATION HUB ═══ */}
      <section className="bg-yl-cream py-16">
        <div className="max-w-7xl mx-auto px-7">
          <SectionHeader title={t.informationHub} href="/information" linkText={t.viewAll} icon={BookOpen} isArabic={isRTL} />
          <p className="font-body text-yl-gray-500 text-sm -mt-4 mb-8">{t.informationHubSubtitle}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {t.infoSections.map((section, i) => {
              const iconMap: Record<string, React.ElementType> = {
                Compass, Map, Train, Utensils, Users, Gem,
              }
              const IconComp = iconMap[section.icon] || BookOpen
              return (
                <Link key={i} href="/information" className="group">
                  <BrandCardLight className="p-5 text-center h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-yl-red/10 flex items-center justify-center group-hover:bg-yl-red transition-colors duration-300 ease-yl">
                      <IconComp className="w-6 h-6 text-yl-red group-hover:text-white transition-colors duration-300 ease-yl" />
                    </div>
                    <h3 className={`text-sm font-heading font-bold text-yl-charcoal group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{section.title}</h3>
                    <p className="font-body text-xs text-yl-gray-500 leading-relaxed">{section.desc}</p>
                  </BrandCardLight>
                </Link>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <BrandButton variant="primary" size="md" href="/information">
              <BookOpen className="w-4 h-4 mr-2" />
              {t.exploreHub}
              <ArrowRight className={`w-4 h-4 ml-2 ${isRTL ? 'rotate-180' : ''}`} />
            </BrandButton>
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ GUIDES ═══ */}
      <section className="relative bg-white py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png" alt="" className="absolute right-[-40px] top-[20%] w-[180px] h-[180px] opacity-[0.03] object-contain rotate-[20deg]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-7">
          <SectionHeader title={t.pdfGuides} href="/shop" linkText={t.viewAll} icon={Download} isArabic={isRTL} />
          <p className="font-body text-yl-gray-500 text-sm -mt-4 mb-8">{t.guidesSubtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guides[locale].map((guide) => (
              <div key={guide.id} className="group bg-white rounded-[14px] overflow-hidden border border-yl-gray-200 shadow-sm hover:-translate-y-1 hover:border-yl-gold/30 hover:shadow-lg transition-all duration-400 ease-yl">
                <div className="relative h-52">
                  <Image src={guide.image} alt={guide.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300 ease-yl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-yl-charcoal/60 to-transparent" />
                  {guide.badge && (
                    <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                      <BrandTag color="gold">{guide.badge}</BrandTag>
                    </span>
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className={`text-lg font-heading font-bold text-white ${isRTL ? 'font-arabic' : ''}`}>{guide.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xl font-bold text-yl-charcoal">{guide.price}</span>
                    <span className="flex items-center gap-2 px-4 py-2.5 bg-yl-gray-100 text-yl-gray-500 font-mono text-[10px] tracking-wider uppercase rounded-lg cursor-default">
                      <Clock className="w-4 h-4" /> {t.downloadNow}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ EXPERIENCES ═══ */}
      <section className="relative bg-white py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <img src="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-watermark-500px.png" alt="" className="absolute -left-16 bottom-10 w-[220px] h-[220px] opacity-[0.04] object-contain rotate-[-10deg]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-7">
          <SectionHeader title={t.topExperiences} href="/experiences" linkText={t.viewAll} icon={Star} isArabic={isRTL} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {experiences[locale].map((exp) => {
              const expAffLink = getPageAffiliateLink(exp.title, 'experience', 'yalla-london', 'homepage');
              return (
              <div key={exp.id}>
                <Link href="/experiences" className="group">
                  <div className="relative aspect-[3/4] rounded-[14px] overflow-hidden mb-3 border border-white/5 hover:-translate-y-1 hover:shadow-lg transition-all duration-400 ease-yl">
                    <Image src={exp.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300 ease-yl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-yl-dark-navy/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className={`font-heading font-bold text-white text-sm group-hover:text-yl-gold transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{exp.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="font-mono text-sm font-bold text-yl-charcoal tracking-wider">{exp.price}</span>
                    <span className="font-mono text-[10px] font-semibold text-yl-red tracking-wider uppercase group-hover:underline">{t.bookNow}</span>
                  </div>
                </Link>
                {expAffLink && (
                  <a
                    href={expAffLink.url}
                    target="_blank"
                    rel="noopener sponsored"
                    className={`${expAffLink.trackingClass} mt-1.5 block text-center py-1.5 bg-yl-red text-white font-mono text-[10px] font-semibold tracking-wider uppercase rounded-lg hover:bg-[#a82924] transition-all duration-300 ease-yl`}
                    data-affiliate-partner={expAffLink.partner}
                  >
                    {expAffLink.label}
                  </a>
                )}
              </div>
              )
            })}
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ HOTELS ═══ */}
      <section className="relative bg-yl-cream py-16 overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7">
          <SectionHeader title={t.luxuryHotels} href="/hotels" linkText={t.viewAll} isArabic={isRTL} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hotels[locale].map((hotel) => {
              const affLink = getPageAffiliateLink(hotel.name, 'hotel', 'yalla-london', 'homepage');
              return (
              <div key={hotel.id} className="group">
                <Link href="/hotels">
                <BrandCardLight className="overflow-hidden">
                  <div className="relative h-52">
                    <Image src={hotel.image} alt={hotel.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300 ease-yl" />
                    {hotel.badge && (
                      <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                        <BrandTag color="blue">{hotel.badge}</BrandTag>
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className={`text-lg font-heading font-bold text-yl-charcoal mb-1 group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{hotel.name}</h3>
                    <p className="font-body text-sm text-yl-gray-500 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5" /> {hotel.location}
                    </p>
                    <p className="font-mono text-[9px] font-medium text-yl-gold tracking-wider uppercase mb-4">{hotel.category}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-yl-gray-200">
                      <span className="font-mono text-sm font-bold text-yl-charcoal tracking-wider">{hotel.price}</span>
                      <span className="px-4 py-2 border border-yl-charcoal text-yl-charcoal font-mono text-[10px] font-semibold tracking-wider uppercase rounded-lg group-hover:bg-yl-charcoal group-hover:text-white transition-all duration-300 ease-yl">
                        {t.viewDeals}
                      </span>
                    </div>
                  </div>
                </BrandCardLight>
                </Link>
                {affLink && (
                  <a
                    href={affLink.url}
                    target="_blank"
                    rel="noopener sponsored"
                    className={`${affLink.trackingClass} mt-2 block text-center py-2.5 bg-yl-red text-white font-mono text-[11px] font-semibold tracking-wider uppercase rounded-xl hover:bg-[#a82924] transition-all duration-300 ease-yl`}
                    data-affiliate-partner={affLink.partner}
                  >
                    {affLink.label} →
                  </a>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <TriBar />

      {/* ═══ LONDON TODAY NEWS CAROUSEL (moved after monetizable sections) ═══ */}
      <section className="max-w-7xl mx-auto px-7 pt-10 pb-4">
        <NewsCarousel />
      </section>

      {/* ═══ LONDON WEATHER FORECAST STRIP ═══ */}
      <WeatherStrip locale={locale} />

      {/* ═══ TRAVELER TESTIMONIALS ═══ */}
      <section className="bg-yl-cream py-16">
        <div className="max-w-7xl mx-auto px-7">
          <div className="text-center mb-10">
            <SectionLabel className="mb-3 text-center justify-center">
              {locale === 'ar' ? 'شهادات' : 'Testimonials'}
            </SectionLabel>
            <h2 className={`text-2xl md:text-3xl font-heading font-bold text-yl-charcoal mb-3 ${isRTL ? 'font-arabic' : ''}`}>
              {locale === 'ar' ? 'ماذا يقول مسافرونا' : 'What Our Travelers Say'}
            </h2>
            <p className="font-body text-yl-gray-500 max-w-xl mx-auto">
              {locale === 'ar'
                ? 'آلاف المسافرين العرب يثقون بنا لتخطيط رحلاتهم إلى لندن'
                : 'Thousands of Arab travelers trust us to plan their London trips'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, i) => (
              <BrandCardLight key={i} hoverable={false} className="p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className={`w-4 h-4 ${s < item.stars ? 'text-yl-gold fill-yl-gold' : 'text-yl-gray-300'}`} />
                  ))}
                </div>
                <p className="font-body text-yl-charcoal text-sm leading-relaxed mb-4 italic">&ldquo;{locale === 'ar' ? item.textAr : item.textEn}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t border-yl-gray-200">
                  <div className="w-9 h-9 rounded-full bg-yl-red text-white flex items-center justify-center font-mono text-[10px] font-bold tracking-wider">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-heading font-semibold text-yl-charcoal">{item.name}</p>
                    <p className="font-mono text-[10px] text-yl-gray-500 tracking-wider">{locale === 'ar' ? item.locationAr : item.location}</p>
                  </div>
                </div>
              </BrandCardLight>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOTTOM TRI-BAR ═══ */}
      <TriBar />

      {/* ═══ FOLLOW US ═══ */}
      <section className="bg-yl-dark-navy py-12">
        <div className="max-w-7xl mx-auto px-7 text-center">
          <FollowUs variant="dark" showLabel={true} />
        </div>
      </section>
    </div>
  )
}

export default YallaHomepage
