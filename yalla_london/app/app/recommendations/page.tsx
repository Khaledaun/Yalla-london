'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, MapPin, Phone, Globe, Search } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const recommendations = [
  {
    id: '1',
    name_en: 'The Dorchester',
    name_ar: 'دورتشستر',
    type: 'hotel',
    description_en: 'Overlooking Hyde Park since 1931, The Dorchester is London\'s crown jewel. Home to Alain Ducasse\'s three-Michelin-starred restaurant, a world-class spa, and the legendary Promenade afternoon tea.',
    description_ar: 'يطل على هايد بارك منذ 1931، دورتشستر هو جوهرة تاج لندن. يضم مطعم آلان دوكاس الحائز على ثلاث نجوم ميشلان وسبا عالمي وشاي بعد الظهر الأسطوري.',
    address_en: 'Park Lane, Mayfair, London W1K 1QA',
    address_ar: 'بارك لين، مايفير، لندن W1K 1QA',
    rating: 4.9,
    price_range: '£650-3,500',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    features_en: ['Michelin-Starred Dining', 'Hyde Park Views', 'World-Class Spa', 'Butler Service'],
    features_ar: ['مطعم بنجمة ميشلان', 'إطلالة هايد بارك', 'سبا عالمي', 'خدمة الخادم الشخصي'],
    phone: '+44 20 7629 8888',
    website: 'https://www.dorchestercollection.com/london/the-dorchester'
  },
  {
    id: '2',
    name_en: 'Sketch — The Lecture Room & Library',
    name_ar: 'سكيتش — قاعة المحاضرات والمكتبة',
    type: 'restaurant',
    description_en: 'A Michelin-starred culinary journey inside a surreal Mayfair townhouse. The Lecture Room serves dazzling French cuisine, while the Gallery (with its famous pink pods) offers an Instagram-famous afternoon tea.',
    description_ar: 'رحلة طهوية حائزة على نجمة ميشلان داخل منزل مايفير السريالي. تقدم قاعة المحاضرات المأكولات الفرنسية المبهرة بينما يقدم المعرض شاي بعد الظهر الشهير.',
    address_en: '9 Conduit Street, Mayfair, London W1S 2XG',
    address_ar: '9 شارع كوندويت، مايفير، لندن W1S 2XG',
    rating: 4.7,
    price_range: '£120-300',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    features_en: ['Michelin Star', 'Art Installation', 'Afternoon Tea', 'Cocktail Bar'],
    features_ar: ['نجمة ميشلان', 'معرض فني', 'شاي بعد الظهر', 'بار كوكتيل'],
    phone: '+44 20 7659 4500',
    website: 'https://sketch.london'
  },
  {
    id: '3',
    name_en: 'Harrods',
    name_ar: 'هارودز',
    type: 'attraction',
    description_en: 'The world\'s most famous luxury department store in Knightsbridge. Spanning 1 million sq ft across 330 departments, Harrods offers everything from couture fashion to its legendary Food Halls.',
    description_ar: 'أشهر متجر فاخر في العالم في نايتسبريدج. يمتد على مليون قدم مربع عبر 330 قسمًا، يقدم هارودز كل شيء من الأزياء الراقية إلى قاعات الطعام الأسطورية.',
    address_en: '87-135 Brompton Road, Knightsbridge, London SW1X 7XL',
    address_ar: '87-135 طريق برومبتون، نايتسبريدج، لندن SW1X 7XL',
    rating: 4.6,
    price_range: '£50-50,000+',
    image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&q=80',
    features_en: ['Personal Shopping', 'Food Halls', 'Luxury Brands', 'Beauty Concierge'],
    features_ar: ['تسوق شخصي', 'قاعات الطعام', 'علامات فاخرة', 'كونسيرج الجمال'],
    phone: '+44 20 7730 1234',
    website: 'https://www.harrods.com'
  },
  {
    id: '4',
    name_en: "Claridge's",
    name_ar: 'كلاريدجز',
    type: 'hotel',
    description_en: 'Art Deco elegance meets modern luxury in this Mayfair institution. Favoured by royalty since the 1850s, Claridge\'s features Gordon Ramsay\'s restaurant, the iconic foyer, and immaculate butler service.',
    description_ar: 'أناقة آرت ديكو تلتقي بالفخامة الحديثة في هذه المؤسسة العريقة في مايفير. مفضلة لدى الملوك منذ 1850، تضم مطعم غوردون رامزي والبهو الأيقوني.',
    address_en: 'Brook Street, Mayfair, London W1K 4HR',
    address_ar: 'شارع بروك، مايفير، لندن W1K 4HR',
    rating: 4.9,
    price_range: '£580-4,000',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
    features_en: ['Art Deco Design', 'Gordon Ramsay', 'Afternoon Tea', 'Butler Service'],
    features_ar: ['تصميم آرت ديكو', 'غوردون رامزي', 'شاي بعد الظهر', 'خادم شخصي'],
    phone: '+44 20 7629 8860',
    website: 'https://www.claridges.co.uk'
  },
  {
    id: '5',
    name_en: 'Dinner by Heston Blumenthal',
    name_ar: 'دينر باي هيستون بلومنثال',
    type: 'restaurant',
    description_en: 'Two-Michelin-starred restaurant at the Mandarin Oriental, Hyde Park. Chef Heston Blumenthal reimagines historic British recipes with modern techniques — the Meat Fruit starter is legendary.',
    description_ar: 'مطعم حائز على نجمتي ميشلان في ماندارين أورينتال، هايد بارك. الشيف هيستون بلومنثال يعيد تخيل الوصفات البريطانية التاريخية بتقنيات حديثة.',
    address_en: 'Mandarin Oriental, 66 Knightsbridge, London SW1X 7LA',
    address_ar: 'ماندارين أورينتال، 66 نايتسبريدج، لندن SW1X 7LA',
    rating: 4.8,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&q=80',
    features_en: ['Two Michelin Stars', 'Historic Recipes', 'Park Views', 'Tasting Menu'],
    features_ar: ['نجمتا ميشلان', 'وصفات تاريخية', 'إطلالة الحديقة', 'قائمة تذوق'],
    phone: '+44 20 7201 3833',
    website: 'https://www.dinnerbyheston.co.uk'
  },
  {
    id: '6',
    name_en: 'The View from The Shard',
    name_ar: 'المنظر من ذا شارد',
    type: 'attraction',
    description_en: 'Western Europe\'s highest viewing platform at 244 metres. On a clear day, see up to 40 miles across London from the open-air Sky Deck on level 72 of The Shard.',
    description_ar: 'أعلى منصة مشاهدة في أوروبا الغربية على ارتفاع 244 مترًا. في يوم صافٍ، شاهد حتى 64 كم عبر لندن من سطح السماء المفتوح في الطابق 72.',
    address_en: '32 London Bridge Street, London SE1 9SG',
    address_ar: '32 شارع جسر لندن، لندن SE1 9SG',
    rating: 4.5,
    price_range: '£28-40',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    features_en: ['360° Views', 'Open-Air Sky Deck', 'Champagne Bar', 'Interactive Telescopes'],
    features_ar: ['إطلالات 360°', 'سطح سماء مفتوح', 'بار شامبانيا', 'تلسكوبات تفاعلية'],
    phone: '+44 844 499 7111',
    website: 'https://www.the-shard.com/viewing-gallery'
  },
  {
    id: '7',
    name_en: 'The Connaught',
    name_ar: 'كونوت',
    type: 'hotel',
    description_en: 'Understated perfection in Mayfair\'s quietest corner. Features the Connaught Bar (consistently ranked World\'s Best), Hélène Darroze\'s two-Michelin-starred restaurant, and an exclusive Aman Spa.',
    description_ar: 'كمال هادئ في أهدأ زاوية من مايفير. يضم بار كونوت (المصنف باستمرار كأفضل بار في العالم) ومطعم هيلين داروز بنجمتي ميشلان وسبا آمان الحصري.',
    address_en: 'Carlos Place, Mayfair, London W1K 2AL',
    address_ar: 'كارلوس بلايس، مايفير، لندن W1K 2AL',
    rating: 4.9,
    price_range: '£690-5,000',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80',
    features_en: ['World\'s Best Bar', 'Aman Spa', 'Michelin Dining', 'Butler Service'],
    features_ar: ['أفضل بار في العالم', 'سبا آمان', 'مطعم ميشلان', 'خادم شخصي'],
    phone: '+44 20 7499 7070',
    website: 'https://www.the-connaught.co.uk'
  },
  {
    id: '8',
    name_en: 'NOBU London',
    name_ar: 'نوبو لندن',
    type: 'restaurant',
    description_en: 'The original London outpost of Nobu Matsuhisa\'s iconic Japanese-Peruvian restaurant in the Metropolitan Hotel. Famous for Black Cod Miso, yellowtail sashimi, and a buzzy Mayfair atmosphere.',
    description_ar: 'الفرع الأصلي في لندن لمطعم نوبو ماتسوهيسا الأيقوني الياباني-البيروفي في فندق متروبوليتان. مشهور بسمك القد الأسود بالميسو وساشيمي الهمور.',
    address_en: 'Metropolitan Hotel, 19 Old Park Lane, London W1K 1LB',
    address_ar: 'فندق متروبوليتان، 19 أولد بارك لين، لندن W1K 1LB',
    rating: 4.6,
    price_range: '£80-200',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=600&q=80',
    features_en: ['Japanese-Peruvian Cuisine', 'Celebrity Scene', 'Omakase Menu', 'Cocktail Bar'],
    features_ar: ['مطبخ ياباني-بيروفي', 'أجواء المشاهير', 'قائمة أوماكاسي', 'بار كوكتيل'],
    phone: '+44 20 7447 4747',
    website: 'https://www.noburestaurants.com/london'
  },
  {
    id: '9',
    name_en: 'Kensington Palace',
    name_ar: 'قصر كنسينغتون',
    type: 'attraction',
    description_en: 'The official London residence of the Prince and Princess of Wales, set within the beautiful Kensington Gardens. Explore the King\'s and Queen\'s State Apartments and the stunning Sunken Garden.',
    description_ar: 'المقر الرسمي في لندن لأمير وأميرة ويلز، داخل حدائق كنسينغتون الجميلة. استكشف شقق الملك والملكة الرسمية والحديقة الغارقة المذهلة.',
    address_en: 'Kensington Gardens, London W8 4PX',
    address_ar: 'حدائق كنسينغتون، لندن W8 4PX',
    rating: 4.5,
    price_range: '£21-25',
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80',
    features_en: ['Royal Residence', 'State Apartments', 'Fashion Exhibitions', 'Sunken Garden'],
    features_ar: ['مقر ملكي', 'شقق رسمية', 'معارض أزياء', 'الحديقة الغارقة'],
    phone: '+44 33 3320 6000',
    website: 'https://www.hrp.org.uk/kensington-palace'
  },
  {
    id: '10',
    name_en: 'Shangri-La The Shard',
    name_ar: 'شانغريلا ذا شارد',
    type: 'hotel',
    description_en: 'London\'s highest hotel occupying floors 34-52 of The Shard. Every room offers floor-to-ceiling views across the entire city. The 52nd-floor infinity pool is the highest in Western Europe.',
    description_ar: 'أعلى فندق في لندن يحتل الطوابق 34-52 من ذا شارد. كل غرفة توفر إطلالات بانورامية على المدينة بأكملها. مسبح الإنفينيتي في الطابق 52 هو الأعلى في أوروبا الغربية.',
    address_en: '31 St Thomas Street, London SE1 9QU',
    address_ar: '31 شارع سانت توماس، لندن SE1 9QU',
    rating: 4.7,
    price_range: '£450-2,500',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80',
    features_en: ['Infinity Pool', 'Panoramic Views', 'TING Restaurant', 'Sky Bar'],
    features_ar: ['مسبح إنفينيتي', 'إطلالات بانورامية', 'مطعم TING', 'بار السماء'],
    phone: '+44 20 7234 8000',
    website: 'https://www.shangri-la.com/london/shangrila'
  },
]

const typeLabels = {
  en: { all: 'All', hotel: 'Hotels', restaurant: 'Restaurants', attraction: 'Attractions' },
  ar: { all: 'الكل', hotel: 'فنادق', restaurant: 'مطاعم', attraction: 'معالم' },
}

export default function RecommendationsPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const labels = typeLabels[locale]

  const filtered = recommendations.filter(item => {
    const name = locale === 'en' ? item.name_en : item.name_ar
    const desc = locale === 'en' ? item.description_en : item.description_ar
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || desc.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className={`bg-cream min-h-screen ${isRTL ? 'font-arabic' : 'font-editorial'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <section className="bg-gradient-to-b from-charcoal to-charcoal-light pb-12">
        <div className="max-w-6xl mx-auto px-6 pt-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            {locale === 'en' ? 'Our Recommendations' : 'توصياتنا'}
          </h1>
          <p className="text-xl text-cream-300 mb-8 max-w-2xl mx-auto">
            {locale === 'en'
              ? 'Handpicked luxury hotels, restaurants, and experiences across London — curated for Arab travellers'
              : 'فنادق ومطاعم وتجارب فاخرة مختارة بعناية في جميع أنحاء لندن — مختارة للمسافرين العرب'}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-stone`} />
            <input
              type="text"
              placeholder={locale === 'en' ? 'Search recommendations...' : 'ابحث في التوصيات...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-london-600`}
            />
          </div>
        </div>
      </section>

      {/* Type Filter */}
      <div className="bg-white border-b border-sand py-4 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {(['all', 'hotel', 'restaurant', 'attraction'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-charcoal text-white'
                    : 'bg-cream-100 text-stone hover:bg-cream-200'
                }`}
              >
                {labels[type]}
              </button>
            ))}
            <span className="text-sm text-stone ml-auto">
              {filtered.length} {locale === 'en' ? 'results' : 'نتيجة'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all group border border-sand/50">
              <div className="relative aspect-video">
                <Image
                  src={item.image}
                  alt={locale === 'en' ? item.name_en : item.name_ar}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} flex gap-2`}>
                  <span className="px-3 py-1 bg-white/90 backdrop-blur text-charcoal text-xs font-semibold rounded-full">
                    {labels[item.type as keyof typeof labels]}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-charcoal mb-2">
                      {locale === 'en' ? item.name_en : item.name_ar}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.floor(item.rating) ? 'fill-amber-500 text-amber-500' : 'text-sand'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-stone">{item.rating}</span>
                    </div>
                  </div>
                  <div className={`${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className="text-lg font-semibold text-london-600">{item.price_range}</div>
                  </div>
                </div>

                <p className="text-sm text-stone leading-relaxed mb-4">
                  {locale === 'en' ? item.description_en : item.description_ar}
                </p>

                <div className="flex items-center gap-2 text-sm text-stone mb-4">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{locale === 'en' ? item.address_en : item.address_ar}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(locale === 'en' ? item.features_en : item.features_ar).map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-cream-100 text-xs text-stone rounded-full border border-sand/50">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-sand">
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-sand rounded-lg text-sm text-stone hover:bg-cream-100 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {locale === 'en' ? 'Call' : 'اتصل'}
                    </a>
                  )}
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-london-600 text-white text-sm font-medium rounded-lg hover:bg-london-700 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    {locale === 'en' ? 'Visit Website' : 'زيارة الموقع'}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-stone">
              {locale === 'en' ? 'No recommendations found matching your search.' : 'لم يتم العثور على توصيات تطابق بحثك.'}
            </p>
          </div>
        )}

        {/* Cross-linking */}
        <div className="mt-16 text-center">
          <p className="text-stone mb-4">
            {locale === 'en' ? 'Looking for more?' : 'تبحث عن المزيد؟'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/hotels" className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium hover:bg-charcoal-light transition-colors">
              {locale === 'en' ? 'All Luxury Hotels' : 'جميع الفنادق الفاخرة'}
            </Link>
            <Link href="/experiences" className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium hover:bg-charcoal-light transition-colors">
              {locale === 'en' ? 'All Experiences' : 'جميع التجارب'}
            </Link>
            <Link href="/london-by-foot" className="px-6 py-3 bg-london-600 text-white rounded-full text-sm font-medium hover:bg-london-700 transition-colors">
              {locale === 'en' ? 'London Walking Guides' : 'أدلة المشي في لندن'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
