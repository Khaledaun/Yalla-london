'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, Clock, Users, Search, Filter, ChevronRight, Menu, X } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const experiences = {
  en: [
    {
      id: '1',
      title: 'Harry Potter Studio Tour',
      category: 'Family Fun',
      location: 'Watford',
      rating: 4.9,
      reviews: 2453,
      duration: '4 hours',
      price: 55,
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&q=80',
      featured: true
    },
    {
      id: '2',
      title: 'London Eye Experience',
      category: 'Sightseeing',
      location: 'South Bank',
      rating: 4.7,
      reviews: 3821,
      duration: '30 min',
      price: 32,
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=600&q=80',
      featured: true
    },
    {
      id: '3',
      title: 'Thames River Cruise',
      category: 'Cruise',
      location: 'Westminster',
      rating: 4.8,
      reviews: 1567,
      duration: '1 hour',
      price: 25,
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      featured: false
    },
    {
      id: '4',
      title: 'Tower of London Tour',
      category: 'History',
      location: 'Tower Hill',
      rating: 4.8,
      reviews: 2891,
      duration: '3 hours',
      price: 30,
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      featured: true
    },
    {
      id: '5',
      title: 'Buckingham Palace Tour',
      category: 'Royal',
      location: 'Westminster',
      rating: 4.6,
      reviews: 1234,
      duration: '2.5 hours',
      price: 35,
      image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600&q=80',
      featured: false
    },
    {
      id: '6',
      title: 'West End Theatre Show',
      category: 'Entertainment',
      location: 'West End',
      rating: 4.9,
      reviews: 4521,
      duration: '2.5 hours',
      price: 65,
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      featured: true
    },
    {
      id: '7',
      title: 'British Museum Guided Tour',
      category: 'Culture',
      location: 'Bloomsbury',
      rating: 4.7,
      reviews: 987,
      duration: '2 hours',
      price: 20,
      image: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=600&q=80',
      featured: false
    },
    {
      id: '8',
      title: 'Food Tour: East London',
      category: 'Food',
      location: 'Shoreditch',
      rating: 4.8,
      reviews: 678,
      duration: '3 hours',
      price: 45,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      featured: false
    },
  ],
  ar: [
    {
      id: '1',
      title: 'جولة استوديو هاري بوتر',
      category: 'ترفيه عائلي',
      location: 'واتفورد',
      rating: 4.9,
      reviews: 2453,
      duration: '4 ساعات',
      price: 55,
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&q=80',
      featured: true
    },
    {
      id: '2',
      title: 'عين لندن',
      category: 'سياحة',
      location: 'الضفة الجنوبية',
      rating: 4.7,
      reviews: 3821,
      duration: '30 دقيقة',
      price: 32,
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=600&q=80',
      featured: true
    },
    {
      id: '3',
      title: 'رحلة نهر التايمز',
      category: 'رحلة بحرية',
      location: 'ويستمنستر',
      rating: 4.8,
      reviews: 1567,
      duration: 'ساعة واحدة',
      price: 25,
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      featured: false
    },
    {
      id: '4',
      title: 'جولة برج لندن',
      category: 'تاريخ',
      location: 'تاور هيل',
      rating: 4.8,
      reviews: 2891,
      duration: '3 ساعات',
      price: 30,
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      featured: true
    },
    {
      id: '5',
      title: 'جولة قصر باكنغهام',
      category: 'ملكي',
      location: 'ويستمنستر',
      rating: 4.6,
      reviews: 1234,
      duration: '2.5 ساعة',
      price: 35,
      image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600&q=80',
      featured: false
    },
    {
      id: '6',
      title: 'عرض مسرحي في ويست إند',
      category: 'ترفيه',
      location: 'ويست إند',
      rating: 4.9,
      reviews: 4521,
      duration: '2.5 ساعة',
      price: 65,
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      featured: true
    },
    {
      id: '7',
      title: 'جولة المتحف البريطاني',
      category: 'ثقافة',
      location: 'بلومزبري',
      rating: 4.7,
      reviews: 987,
      duration: 'ساعتان',
      price: 20,
      image: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=600&q=80',
      featured: false
    },
    {
      id: '8',
      title: 'جولة طعام: شرق لندن',
      category: 'طعام',
      location: 'شورديتش',
      rating: 4.8,
      reviews: 678,
      duration: '3 ساعات',
      price: 45,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      featured: false
    },
  ]
}

const text = {
  en: {
    title: 'London Experiences',
    subtitle: 'Discover the best tours, attractions, and activities in London',
    search: 'Search experiences...',
    filter: 'Filter',
    featured: 'Featured',
    reviews: 'reviews',
    from: 'From',
    bookNow: 'Book Now',
    viewAll: 'View All',
    categories: ['All', 'Sightseeing', 'Family Fun', 'History', 'Food', 'Entertainment']
  },
  ar: {
    title: 'تجارب لندن',
    subtitle: 'اكتشف أفضل الجولات والمعالم والأنشطة في لندن',
    search: 'ابحث في التجارب...',
    filter: 'تصفية',
    featured: 'مميز',
    reviews: 'تقييم',
    from: 'من',
    bookNow: 'احجز الآن',
    viewAll: 'عرض الكل',
    categories: ['الكل', 'سياحة', 'ترفيه عائلي', 'تاريخ', 'طعام', 'ترفيه']
  }
}

export default function ExperiencesPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredExperiences = experiences[locale].filter(exp => {
    const matchesSearch = !searchQuery || exp.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'الكل' || exp.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'IBM Plex Sans Arabic, sans-serif' : 'Anybody, sans-serif' }}>
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="flex items-center justify-between px-6 py-3 bg-white/95 backdrop-blur-xl rounded-full shadow-lg w-full max-w-4xl pointer-events-auto border border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1C1917] rounded-lg flex items-center justify-center relative">
              <span className="text-white font-bold">Y</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#C8322B] rounded-full"></span>
            </div>
            <span className="text-xl font-bold text-[#1C1917]">Yalla<span className="font-normal text-[#A3A3A3]">London</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Home</Link>
            <Link href="/experiences" className="text-sm font-medium text-[#1C1917]">Experiences</Link>
            <Link href="/hotels" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Hotels</Link>
            <Link href="/shop" className="text-sm font-medium text-gray-600 hover:text-[#1C1917]">Shop</Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-[#1C1917] to-[#3D3835]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-gray-300 mb-8">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-[#C8322B]"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b py-4 sticky top-20 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1C1917] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiences Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredExperiences.map((exp) => (
            <div key={exp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group">
              <div className="relative aspect-[4/3]">
                <Image src={exp.image} alt={exp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                {exp.featured && (
                  <span className="absolute top-3 left-3 px-3 py-1 bg-[#C8322B] text-white text-xs font-semibold rounded-full">
                    {t.featured}
                  </span>
                )}
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {exp.rating}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs text-[#C8322B] font-medium mb-1">{exp.category}</div>
                <h3 className="font-bold text-[#1C1917] mb-2">{exp.title}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {exp.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exp.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400">{t.from}</span>
                    <span className="text-lg font-bold text-[#1C1917] ml-1">£{exp.price}</span>
                  </div>
                  <button className="px-4 py-2 bg-[#C8322B] text-white text-sm font-medium rounded-lg hover:bg-[#a82520] transition-colors">
                    {t.bookNow}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1C1917] text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center relative">
              <span className="text-[#1C1917] font-bold text-lg">Y</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#C8322B] rounded-full"></span>
            </div>
            <span className="text-2xl font-bold">Yalla<span className="font-normal text-gray-400">London</span></span>
          </div>
          <p className="text-gray-400">© 2026 Yalla London. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
