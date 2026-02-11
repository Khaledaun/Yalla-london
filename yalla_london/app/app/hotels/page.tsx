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
    <div className={`bg-cream ${isRTL ? 'font-arabic' : 'font-editorial'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <div className="pb-12 bg-gradient-to-b from-charcoal to-charcoal-light">
        <div className="max-w-6xl mx-auto px-6 pt-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-cream-300 mb-8">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-stone`} />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-london-600`}
            />
          </div>
        </div>
      </div>

      {/* Area Filter */}
      <div className="bg-white border-b border-sand py-4 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedArea === area
                    ? 'bg-charcoal text-white'
                    : 'bg-cream-100 text-stone hover:bg-cream-200'
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
            <div key={hotel.id} className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all group border border-sand/50">
              <div className="relative h-56">
                <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} px-3 py-1 bg-charcoal text-white text-xs font-semibold rounded-full`}>
                  {hotel.badge}
                </span>
              </div>
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: hotel.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                  <span className="text-sm text-stone ml-2">({hotel.reviews} {t.reviews})</span>
                </div>

                {/* Name & Location */}
                <h3 className="text-xl font-semibold text-charcoal mb-1 line-clamp-2">{hotel.name}</h3>
                <p className="text-sm text-stone flex items-center gap-1 mb-4">
                  <MapPin className="w-4 h-4" /> {hotel.location}
                </p>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.slice(0, 3).map((amenity) => (
                    <span key={amenity} className="px-2 py-1 bg-cream-100 text-xs text-stone rounded">
                      {amenity}
                    </span>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-sand">
                  <div>
                    <span className="text-2xl font-bold text-charcoal">£{hotel.price}</span>
                    <span className="text-sm text-stone">{t.perNight}</span>
                  </div>
                  <button className="px-4 py-2 bg-london-600 text-white text-sm font-medium rounded-lg hover:bg-london-700 transition-colors">
                    {t.viewDetails}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
