'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MapPin, Search } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getPageAffiliateLink } from '@/lib/affiliate/page-affiliate-links'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

const hotels = {
  en: [
    {
      id: '1',
      name: 'The Dorchester',
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 3412,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'Palace Hotel',
      description: 'Overlooking Hyde Park since 1931, The Dorchester is one of London\'s most iconic luxury hotels. Home to three-Michelin-starred Alain Ducasse, a world-class spa, and legendary afternoon tea.',
      amenities: ['Spa', 'Michelin Dining', 'Hyde Park Views', 'Butler Service'],
      website: 'https://www.dorchestercollection.com/london/the-dorchester'
    },
    {
      id: '2',
      name: 'The Ritz London',
      location: 'Piccadilly',
      area: 'Piccadilly',
      rating: 4.8,
      reviews: 4256,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 Star',
      description: 'The epitome of English grandeur on Piccadilly. Famous for its opulent Louis XVI interiors, legendary afternoon tea in the Palm Court, and the Ritz Restaurant with its gilded ceiling.',
      amenities: ['Palm Court Tea', 'Fine Dining', 'Casino', 'Concierge'],
      website: 'https://www.theritzlondon.com'
    },
    {
      id: '3',
      name: "Claridge's",
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 2187,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'Art Deco Icon',
      description: 'The quintessential Mayfair hotel. Claridge\'s Art Deco masterpiece has hosted royalty and heads of state since the 1850s. Home to Gordon Ramsay\'s restaurant and the iconic foyer.',
      amenities: ['Art Deco Design', 'Gordon Ramsay', 'Fumoir Bar', 'Butler Service'],
      website: 'https://www.claridges.co.uk'
    },
    {
      id: '4',
      name: 'The Savoy',
      location: 'Strand',
      area: 'Westminster',
      rating: 4.8,
      reviews: 3876,
      price: 520,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'Historic Landmark',
      description: 'London\'s first luxury hotel, opened in 1889 on the banks of the Thames. The Savoy blends Edwardian and Art Deco styles with Thames-view suites, the American Bar, and Kaspar\'s seafood bar.',
      amenities: ['Thames Views', 'American Bar', 'Pool & Spa', 'River Restaurant'],
      website: 'https://www.thesavoylondon.com'
    },
    {
      id: '5',
      name: 'The Langham, London',
      location: 'Marylebone',
      area: 'Marylebone',
      rating: 4.7,
      reviews: 2432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'Heritage',
      description: 'Europe\'s first grand hotel, established in 1865 near Regent Street. Features the award-winning Chuan Body + Soul spa, Roux at The Landau restaurant, and the atmospheric Artesian cocktail bar.',
      amenities: ['Chuan Spa', 'Roux Restaurant', 'Artesian Bar', 'Gym'],
      website: 'https://www.langhamhotels.com/london'
    },
    {
      id: '6',
      name: 'Four Seasons Hotel London at Park Lane',
      location: 'Park Lane',
      area: 'Mayfair',
      rating: 4.8,
      reviews: 2845,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'Premium',
      description: 'Commanding Park Lane with views over Hyde Park. Features a rooftop spa with panoramic London views, Amaranto Italian restaurant, and spacious rooms with floor-to-ceiling windows.',
      amenities: ['Rooftop Spa', 'Park Views', 'Italian Dining', 'Lounge Bar'],
      website: 'https://www.fourseasons.com/london'
    },
    {
      id: '7',
      name: 'Corinthia London',
      location: 'Whitehall Place',
      area: 'Westminster',
      rating: 4.8,
      reviews: 2567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'Modern Grand',
      description: 'A Victorian grande dame reimagined for modern luxury near Embankment. Houses the ESPA Life spa (one of London\'s largest), Kerridge\'s Bar & Grill by Tom Kerridge, and penthouse suites with Big Ben views.',
      amenities: ['ESPA Life Spa', 'Tom Kerridge', 'Penthouse Suites', 'Fitness'],
      website: 'https://www.corinthia.com/london'
    },
    {
      id: '8',
      name: 'The Connaught',
      location: 'Mayfair',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 1876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'Exclusive',
      description: 'Understated elegance in the heart of Mayfair. The Connaught features Hélène Darroze\'s two-Michelin-starred restaurant, the legendary Connaught Bar (World\'s Best Bar), and an Aman Spa.',
      amenities: ['Aman Spa', 'Connaught Bar', 'Michelin Dining', 'Butler Service'],
      website: 'https://www.the-connaught.co.uk'
    },
    {
      id: '9',
      name: 'Shangri-La The Shard, London',
      location: 'London Bridge',
      area: 'Southwark',
      rating: 4.7,
      reviews: 3124,
      price: 450,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
      badge: 'Sky High',
      description: 'Occupying floors 34-52 of The Shard, Western Europe\'s tallest building. Every room offers floor-to-ceiling views across London. Features an infinity pool on the 52nd floor and TING restaurant.',
      amenities: ['Infinity Pool', 'Shard Views', 'TING Restaurant', 'Sky Bar'],
      website: 'https://www.shangri-la.com/london/shangrila'
    },
    {
      id: '10',
      name: 'Bulgari Hotel London',
      location: 'Knightsbridge',
      area: 'Knightsbridge',
      rating: 4.8,
      reviews: 1654,
      price: 780,
      image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80',
      badge: 'Ultra Luxury',
      description: 'Italian craftsmanship meets British heritage steps from Harrods. Features a 25-metre pool, Bulgari Spa, Il Ristorante by Niko Romito, and a private cinema and ballroom.',
      amenities: ['Bulgari Spa', '25m Pool', 'Italian Dining', 'Private Cinema'],
      website: 'https://www.bulgarihotels.com/london'
    },
  ],
  ar: [
    {
      id: '1',
      name: 'دورتشستر',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 3412,
      price: 650,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      badge: 'فندق قصر',
      description: 'يطل على هايد بارك منذ عام 1931، دورتشستر هو أحد أشهر الفنادق الفاخرة في لندن. يضم مطعم آلان دوكاس الحائز على ثلاث نجوم ميشلان، وسبا عالمي المستوى، وشاي بعد الظهر الأسطوري.',
      amenities: ['سبا', 'مطعم ميشلان', 'إطلالة هايد بارك', 'خدمة الخادم الشخصي'],
      website: 'https://www.dorchestercollection.com/london/the-dorchester'
    },
    {
      id: '2',
      name: 'ريتز لندن',
      location: 'بيكاديلي',
      area: 'Piccadilly',
      rating: 4.8,
      reviews: 4256,
      price: 750,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: '5 نجوم',
      description: 'قمة الفخامة الإنجليزية على شارع بيكاديلي. يشتهر بديكوراته الفخمة على طراز لويس السادس عشر، وشاي بعد الظهر الأسطوري في بالم كورت.',
      amenities: ['شاي بالم كورت', 'مطعم فاخر', 'كازينو', 'كونسيرج'],
      website: 'https://www.theritzlondon.com'
    },
    {
      id: '3',
      name: 'كلاريدجز',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 2187,
      price: 580,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'أيقونة آرت ديكو',
      description: 'فندق مايفير المثالي. تحفة آرت ديكو استضافت الملوك ورؤساء الدول منذ خمسينيات القرن التاسع عشر. يضم مطعم غوردون رامزي والبهو الأيقوني.',
      amenities: ['تصميم آرت ديكو', 'غوردون رامزي', 'بار فومور', 'خادم شخصي'],
      website: 'https://www.claridges.co.uk'
    },
    {
      id: '4',
      name: 'سافوي',
      location: 'ستراند',
      area: 'Westminster',
      rating: 4.8,
      reviews: 3876,
      price: 520,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
      badge: 'معلم تاريخي',
      description: 'أول فندق فاخر في لندن، افتتح عام 1889 على ضفاف نهر التايمز. يمزج بين الطراز الإدواردي وآرت ديكو مع أجنحة تطل على النهر والبار الأمريكي.',
      amenities: ['إطلالة التايمز', 'البار الأمريكي', 'مسبح وسبا', 'مطعم النهر'],
      website: 'https://www.thesavoylondon.com'
    },
    {
      id: '5',
      name: 'لانغهام لندن',
      location: 'ماريليبون',
      area: 'Marylebone',
      rating: 4.7,
      reviews: 2432,
      price: 480,
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
      badge: 'تراثي',
      description: 'أول فندق كبير في أوروبا، تأسس عام 1865 بالقرب من شارع ريجنت. يضم سبا شوان الحائز على جوائز ومطعم رو وبار أرتيزان.',
      amenities: ['سبا شوان', 'مطعم رو', 'بار أرتيزان', 'صالة رياضية'],
      website: 'https://www.langhamhotels.com/london'
    },
    {
      id: '6',
      name: 'فور سيزونز بارك لين',
      location: 'بارك لين',
      area: 'Mayfair',
      rating: 4.8,
      reviews: 2845,
      price: 720,
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'مميز',
      description: 'يسيطر على بارك لين مع إطلالات على هايد بارك. يضم سبا على السطح مع إطلالات بانورامية ومطعم أمارانتو الإيطالي وغرف واسعة.',
      amenities: ['سبا على السطح', 'إطلالة البارك', 'مطعم إيطالي', 'بار'],
      website: 'https://www.fourseasons.com/london'
    },
    {
      id: '7',
      name: 'كورينثيا لندن',
      location: 'وايتهول',
      area: 'Westminster',
      rating: 4.8,
      reviews: 2567,
      price: 550,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
      badge: 'فخامة عصرية',
      description: 'فندق فيكتوري أعيد تصميمه للفخامة الحديثة بالقرب من إمبانكمنت. يضم سبا ESPA Life وبار ومشوى كيريدج من توم كيريدج وأجنحة بنتهاوس.',
      amenities: ['سبا ESPA', 'توم كيريدج', 'أجنحة بنتهاوس', 'صالة رياضية'],
      website: 'https://www.corinthia.com/london'
    },
    {
      id: '8',
      name: 'كونوت',
      location: 'مايفير',
      area: 'Mayfair',
      rating: 4.9,
      reviews: 1876,
      price: 690,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
      badge: 'حصري',
      description: 'أناقة هادئة في قلب مايفير. يضم مطعم هيلين داروز الحائز على نجمتي ميشلان وبار كونوت الأسطوري (أفضل بار في العالم) وسبا آمان.',
      amenities: ['سبا آمان', 'بار كونوت', 'مطعم ميشلان', 'خادم شخصي'],
      website: 'https://www.the-connaught.co.uk'
    },
    {
      id: '9',
      name: 'شانغريلا ذا شارد',
      location: 'لندن بريدج',
      area: 'Southwark',
      rating: 4.7,
      reviews: 3124,
      price: 450,
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
      badge: 'في السماء',
      description: 'يحتل الطوابق 34-52 من ذا شارد، أطول مبنى في أوروبا الغربية. كل غرفة توفر إطلالات بانورامية على لندن مع مسبح إنفينيتي في الطابق 52.',
      amenities: ['مسبح إنفينيتي', 'إطلالة الشارد', 'مطعم TING', 'بار السماء'],
      website: 'https://www.shangri-la.com/london/shangrila'
    },
    {
      id: '10',
      name: 'بولغاري لندن',
      location: 'نايتسبريدج',
      area: 'Knightsbridge',
      rating: 4.8,
      reviews: 1654,
      price: 780,
      image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=80',
      badge: 'فخامة مطلقة',
      description: 'الحرفية الإيطالية تلتقي بالتراث البريطاني على بعد خطوات من هارودز. يضم مسبح 25 متر وسبا بولغاري ومطعم إيطالي وسينما خاصة.',
      amenities: ['سبا بولغاري', 'مسبح 25م', 'مطعم إيطالي', 'سينما خاصة'],
      website: 'https://www.bulgarihotels.com/london'
    },
  ]
}

const text = {
  en: {
    title: 'Luxury Hotels in London',
    subtitle: 'Handpicked 5-star hotels perfect for Arab travellers visiting London',
    search: 'Search hotels...',
    reviews: 'reviews',
    perNight: '/night',
    viewDetails: 'View Details',
    bookNow: 'Book Now',
    areas: ['All Areas', 'Mayfair', 'Westminster', 'Piccadilly', 'Knightsbridge', 'Southwark', 'Marylebone'],
    metaNote: 'Prices shown are approximate starting rates and may vary by season.'
  },
  ar: {
    title: 'فنادق فاخرة في لندن',
    subtitle: 'فنادق 5 نجوم مختارة بعناية مثالية للمسافرين العرب الذين يزورون لندن',
    search: 'ابحث في الفنادق...',
    reviews: 'تقييم',
    perNight: '/ليلة',
    viewDetails: 'عرض التفاصيل',
    bookNow: 'احجز الآن',
    areas: ['جميع المناطق', 'مايفير', 'ويستمنستر', 'بيكاديلي', 'نايتسبريدج', 'ساوثوارك', 'ماريليبون'],
    metaNote: 'الأسعار المعروضة هي أسعار تقريبية وقد تختلف حسب الموسم.'
  }
}

const areaMap: Record<string, string> = {
  'Mayfair': 'Mayfair',
  'Westminster': 'Westminster',
  'Piccadilly': 'Piccadilly',
  'Knightsbridge': 'Knightsbridge',
  'Southwark': 'Southwark',
  'Marylebone': 'Marylebone',
}

export default function HotelsPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArea, setSelectedArea] = useState('All Areas')

  const areaKeys = Object.keys(areaMap)
  const selectedAreaKey = t.areas.indexOf(selectedArea) > 0 ? areaKeys[t.areas.indexOf(selectedArea) - 1] : null

  const filteredHotels = hotels[locale].filter(hotel => {
    const matchesSearch = !searchQuery || hotel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesArea = !selectedAreaKey || hotel.area === selectedAreaKey
    return matchesSearch && matchesArea
  })

  return (
    <div className={`bg-yl-cream ${isRTL ? 'font-arabic' : 'font-body'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="relative pb-14 pt-28 bg-gradient-to-b from-yl-dark-navy to-yl-dark-navy-light overflow-hidden">
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs
            items={[
              { label: isRTL ? 'الرئيسية' : 'Home', href: '/' },
              { label: isRTL ? 'فنادق' : 'Hotels' },
            ]}
            className="justify-center mb-6 text-yl-gray-400"
          />
          <SectionLabel>{isRTL ? 'إقامات فاخرة' : 'Luxury Stays'}</SectionLabel>
          <h1 className={`text-4xl md:text-5xl font-heading font-bold text-yl-parchment mb-4 ${isRTL ? 'font-arabic' : ''}`}>{t.title}</h1>
          <p className="font-body text-lg text-yl-gray-400 mb-8 max-w-2xl mx-auto">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-yl-gray-500`} />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-full text-lg font-body focus:outline-none focus:ring-2 focus:ring-yl-gold`}
            />
          </div>
        </div>
      </section>

      <TriBar />

      {/* Area Filter */}
      <div className="bg-white border-b border-yl-gray-200 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.areas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full text-[10px] whitespace-nowrap transition-all duration-300 ease-yl ${
                  isRTL ? 'font-arabic tracking-normal' : 'font-mono tracking-wider uppercase'
                } ${
                  selectedArea === area
                    ? 'bg-yl-dark-navy text-yl-parchment'
                    : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200 hover:text-yl-charcoal'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className="max-w-7xl mx-auto px-7 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHotels.map((hotel) => (
            <BrandCardLight key={hotel.id} className="overflow-hidden group">
              <div className="relative h-56">
                <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500 ease-yl" />
                <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                  <BrandTag color="blue">{hotel.badge}</BrandTag>
                </span>
              </div>
              <div className="p-6">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yl-gold fill-yl-gold" />
                  ))}
                  <span className="font-mono text-[10px] text-yl-gray-500 tracking-wider ml-2">{hotel.rating} ({hotel.reviews.toLocaleString()} {t.reviews})</span>
                </div>

                {/* Name & Location */}
                <h3 className={`text-xl font-heading font-bold text-yl-charcoal mb-1 line-clamp-1 group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{hotel.name}</h3>
                <p className="font-body text-sm text-yl-gray-500 flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-yl-gold" /> {hotel.location}
                </p>

                {/* Description */}
                <p className="font-body text-sm text-yl-gray-500 mb-4 line-clamp-3 leading-relaxed">{hotel.description}</p>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {hotel.amenities.map((amenity) => (
                    <BrandTag key={amenity} color="neutral">{amenity}</BrandTag>
                  ))}
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-yl-gray-200">
                  <div>
                    <span className={`text-[10px] text-yl-gray-500 ${isRTL ? 'font-arabic tracking-normal' : 'font-mono tracking-wider uppercase'}`}>{locale === 'en' ? 'From' : 'من'} </span>
                    <span className="text-2xl font-heading font-bold text-yl-charcoal">£{hotel.price}</span>
                    <span className={`text-[10px] text-yl-gray-500 ${isRTL ? 'font-arabic tracking-normal' : 'font-mono tracking-wider'}`}>{t.perNight}</span>
                  </div>
                  {(() => {
                    const affLink = getPageAffiliateLink(hotel.name, 'hotel', 'yalla-london', 'hotels-page');
                    const href = affLink?.url || hotel.website;
                    const rel = affLink ? 'noopener sponsored' : 'noopener noreferrer';
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel={rel}
                        className={`${affLink ? 'affiliate-page-link' : ''}`}
                        data-affiliate-partner={affLink?.partner || undefined}
                      >
                        <BrandButton variant="primary" size="sm" className="pointer-events-none">
                          {affLink ? affLink.label : t.bookNow}
                        </BrandButton>
                      </a>
                    );
                  })()}
                </div>
              </div>
            </BrandCardLight>
          ))}
        </div>

        {/* Price disclaimer */}
        <p className="font-mono text-[10px] text-yl-gray-500 text-center mt-10 tracking-wider uppercase">{t.metaNote}</p>
      </div>

      <TriBar />
    </div>
  )
}
