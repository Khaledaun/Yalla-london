'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, Wifi, Car, Coffee, Waves, Search, Filter, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const hotels = {
  en: [
    {
      id: '1',
      name: 'The Dorchester',
      location: 'Mayfair, London',
      rating: 5,
      reviews: 1234,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'Luxury',
      amenities: ['Spa', 'Pool', 'Gym', 'Restaurant']
    },
    {
      id: '2',
      name: 'The Ritz London',
      location: 'Piccadilly, London',
      rating: 5,
      reviews: 2156,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 Star',
      amenities: ['Spa', 'Restaurant', 'Bar', 'Concierge']
    },
    {
      id: '3',
      name: 'Claridges',
      location: 'Mayfair, London',
      rating: 5,
      reviews: 987,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'Historic',
      amenities: ['Spa', 'Restaurant', 'Bar', 'Butler']
    },
    {
      id: '4',
      name: 'The Savoy',
      location: 'Strand, London',
      rating: 5,
      reviews: 1876,
      price: 620,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'Iconic',
      amenities: ['Pool', 'Spa', 'Restaurant', 'Theater']
    },
    {
      id: '5',
      name: 'The Langham',
      location: 'Marylebone, London',
      rating: 5,
      reviews: 1432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'Boutique',
      amenities: ['Spa', 'Pool', 'Restaurant', 'Gym']
    },
    {
      id: '6',
      name: 'Four Seasons Park Lane',
      location: 'Park Lane, London',
      rating: 5,
      reviews: 2345,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'Premium',
      amenities: ['Spa', 'Pool', 'Restaurant', 'Lounge']
    },
    {
      id: '7',
      name: 'Corinthia London',
      location: 'Westminster, London',
      rating: 5,
      reviews: 1567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'Modern',
      amenities: ['Spa', 'Pool', 'Restaurant', 'Rooftop']
    },
    {
      id: '8',
      name: 'The Connaught',
      location: 'Mayfair, London',
      rating: 5,
      reviews: 876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'Exclusive',
      amenities: ['Spa', 'Restaurant', 'Bar', 'Butler']
    },
  ],
  ar: [
    {
      id: '1',
      name: 'دورتشستر',
      location: 'مايفير، لندن',
      rating: 5,
      reviews: 1234,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'فاخر',
      amenities: ['سبا', 'مسبح', 'صالة رياضية', 'مطعم']
    },
    {
      id: '2',
      name: 'ريتز لندن',
      location: 'بيكاديلي، لندن',
      rating: 5,
      reviews: 2156,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 نجوم',
      amenities: ['سبا', 'مطعم', 'بار', 'خدمة كونسيرج']
    },
    {
      id: '3',
      name: 'كلاريدجز',
      location: 'مايفير، لندن',
      rating: 5,
      reviews: 987,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'تاريخي',
      amenities: ['سبا', 'مطعم', 'بار', 'خادم شخصي']
    },
    {
      id: '4',
      name: 'سافوي',
      location: 'ستراند، لندن',
      rating: 5,
      reviews: 1876,
      price: 620,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'أيقوني',
      amenities: ['مسبح', 'سبا', 'مطعم', 'مسرح']
    },
    {
      id: '5',
      name: 'لانغهام',
      location: 'ماريليبون، لندن',
      rating: 5,
      reviews: 1432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'بوتيك',
      amenities: ['سبا', 'مسبح', 'مطعم', 'صالة رياضية']
    },
    {
      id: '6',
      name: 'فور سيزونز بارك لين',
      location: 'بارك لين، لندن',
      rating: 5,
      reviews: 2345,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'مميز',
      amenities: ['سبا', 'مسبح', 'مطعم', 'صالة']
    },
    {
      id: '7',
      name: 'كورينثيا لندن',
      location: 'ويستمنستر، لندن',
      rating: 5,
      reviews: 1567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'عصري',
      amenities: ['سبا', 'مسبح', 'مطعم', 'سطح']
    },
    {
      id: '8',
      name: 'كونوت',
      location: 'مايفير، لندن',
      rating: 5,
      reviews: 876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'حصري',
      amenities: ['سبا', 'مطعم', 'بار', 'خادم شخصي']
    },
  ]
}

const text = {
  en: {
    title: 'Luxury Hotels in London',
    subtitle: 'Discover the finest accommodations for Arab travelers',
    search: 'Search hotels...',
    filter: 'Filter',
    reviews: 'reviews',
    perNight: '/night',
    viewDetails: 'View Details',
    areas: ['All Areas', 'Mayfair', 'Piccadilly', 'Westminster', 'Kensington']
  },
  ar: {
    title: 'فنادق فاخرة في لندن',
    subtitle: 'اكتشف أفضل أماكن الإقامة للمسافرين العرب',
    search: 'ابحث في الفنادق...',
    filter: 'تصفية',
    reviews: 'تقييم',
    perNight: '/ليلة',
    viewDetails: 'عرض التفاصيل',
    areas: ['جميع المناطق', 'مايفير', 'بيكاديلي', 'ويستمنستر', 'كنسينغتون']
  }
}

export default function HotelsPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState('All Areas')

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'font-cairo' : 'font-inter'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="flex items-center justify-between px-6 py-3 bg-white/95 backdrop-blur-xl rounded-full shadow-lg w-full max-w-4xl pointer-events-auto border border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1A1F36] rounded-lg flex items-center justify-center relative">
              <span className="text-white font-bold">Y</span>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E8634B] rounded-full"></span>
            </div>
            <span className="text-xl font-bold text-[#1A1F36]">Yalla<span className="font-normal text-[#A3A3A3]">London</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-[#1A1F36]">Home</Link>
            <Link href="/experiences" className="text-sm font-medium text-gray-600 hover:text-[#1A1F36]">Experiences</Link>
            <Link href="/hotels" className="text-sm font-medium text-[#1A1F36]">Hotels</Link>
            <Link href="/shop" className="text-sm font-medium text-gray-600 hover:text-[#1A1F36]">Shop</Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-[#1A1F36] to-[#2d3452]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-gray-300 mb-8">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-[#E8634B]`}
            />
          </div>
        </div>
      </div>

      {/* Area Filter */}
      <div className="bg-white border-b py-4 sticky top-20 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedArea === area
                    ? 'bg-[#1A1F36] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hotels[locale].map((hotel) => (
            <div key={hotel.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group">
              <div className="relative h-56">
                <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} px-3 py-1 bg-[#1A1F36] text-white text-xs font-semibold rounded-full`}>
                  {hotel.badge}
                </span>
              </div>
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: hotel.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                  <span className="text-sm text-gray-500 ml-2">({hotel.reviews} {t.reviews})</span>
                </div>

                {/* Name & Location */}
                <h3 className="text-xl font-bold text-[#1A1F36] mb-1 line-clamp-2">{hotel.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                  <MapPin className="w-4 h-4" /> {hotel.location}
                </p>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.slice(0, 3).map((amenity) => (
                    <span key={amenity} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                      {amenity}
                    </span>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-2xl font-bold text-[#1A1F36]">£{hotel.price}</span>
                    <span className="text-sm text-gray-500">{t.perNight}</span>
                  </div>
                  <button className="px-4 py-2 bg-[#E8634B] text-white text-sm font-medium rounded-lg hover:bg-[#d4543d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8634B] transition-colors">
                    {t.viewDetails}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1A1F36] text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center relative">
              <span className="text-[#1A1F36] font-bold text-lg">Y</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#E8634B] rounded-full"></span>
            </div>
            <span className="text-2xl font-bold">Yalla<span className="font-normal text-gray-400">London</span></span>
          </div>
          <p className="text-gray-400">© 2026 Yalla London. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
