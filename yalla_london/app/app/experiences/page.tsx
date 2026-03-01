'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MapPin, Clock, Search } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const experiences = {
  en: [
    {
      id: '1',
      title: 'Warner Bros. Studio Tour: The Making of Harry Potter',
      category: 'Family Fun',
      location: 'Watford Junction',
      rating: 4.9,
      reviews: 12453,
      duration: '3-4 hours',
      price: 53,
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&q=80',
      featured: true,
      description: 'Walk through the actual sets, see authentic costumes and props, and discover the filmmaking secrets behind the Harry Potter films.',
      website: 'https://www.wbstudiotour.co.uk'
    },
    {
      id: '2',
      title: 'London Eye Standard Ticket',
      category: 'Sightseeing',
      location: 'South Bank, Waterloo',
      rating: 4.5,
      reviews: 48210,
      duration: '30 minutes',
      price: 32,
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=600&q=80',
      featured: true,
      description: 'Soar 135 metres above the city in a glass capsule for 360-degree views of Big Ben, Buckingham Palace, and St Paul\'s Cathedral.',
      website: 'https://www.londoneye.com'
    },
    {
      id: '3',
      title: 'Tower of London Entry with Crown Jewels',
      category: 'History',
      location: 'Tower Hill, EC3',
      rating: 4.7,
      reviews: 36891,
      duration: '2-3 hours',
      price: 33,
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      featured: true,
      description: 'Explore 1,000 years of history at this UNESCO World Heritage Site. See the Crown Jewels, meet the Yeoman Warders, and discover the Tower\'s dark past.',
      website: 'https://www.hrp.org.uk/tower-of-london'
    },
    {
      id: '4',
      title: 'Thames River Cruise: Westminster to Greenwich',
      category: 'Cruise',
      location: 'Westminster Pier',
      rating: 4.6,
      reviews: 8567,
      duration: '1 hour',
      price: 15,
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      featured: false,
      description: 'Glide past the Houses of Parliament, the Shard, Tower Bridge, and Canary Wharf with live commentary on London\'s landmarks.',
      website: 'https://www.thamesclippers.com'
    },
    {
      id: '5',
      title: 'Buckingham Palace State Rooms (Summer Opening)',
      category: 'Royal Heritage',
      location: 'Westminster, SW1A',
      rating: 4.6,
      reviews: 5234,
      duration: '2-2.5 hours',
      price: 30,
      image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600&q=80',
      featured: false,
      description: 'Visit the working rooms of The King\'s official London residence during the annual summer opening. See the Throne Room, Picture Gallery, and Grand Staircase.',
      website: 'https://www.rct.uk/visit/buckingham-palace'
    },
    {
      id: '6',
      title: 'West End Theatre: The Phantom of the Opera',
      category: 'Entertainment',
      location: "His Majesty's Theatre, West End",
      rating: 4.8,
      reviews: 14521,
      duration: '2.5 hours',
      price: 35,
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      featured: true,
      description: 'Experience the world\'s longest-running musical in London\'s legendary West End. A spectacular tale of obsession, love, and music beneath the Paris Opera House.',
      website: 'https://www.thephantomoftheopera.com/london'
    },
    {
      id: '7',
      title: 'British Museum Guided Tour',
      category: 'Culture',
      location: 'Bloomsbury, WC1B',
      rating: 4.8,
      reviews: 4987,
      duration: '2 hours',
      price: 0,
      image: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=600&q=80',
      featured: false,
      description: 'Discover 2 million years of human history for free. Highlights include the Rosetta Stone, the Elgin Marbles, and the Egyptian mummies collection.',
      website: 'https://www.britishmuseum.org'
    },
    {
      id: '8',
      title: 'Afternoon Tea at The Shard',
      category: 'Food & Drink',
      location: 'London Bridge, SE1',
      rating: 4.7,
      reviews: 3678,
      duration: '1.5 hours',
      price: 65,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      featured: false,
      description: 'Enjoy a luxury afternoon tea on the 31st floor of The Shard with panoramic views across London. Features artisan sandwiches, pastries, and premium teas.',
      website: 'https://www.the-shard.com/restaurants/aqua-shard'
    },
    {
      id: '9',
      title: 'Kew Gardens Entry Ticket',
      category: 'Nature',
      location: 'Richmond, TW9',
      rating: 4.7,
      reviews: 15432,
      duration: '3-5 hours',
      price: 20,
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80',
      featured: false,
      description: 'Explore 300 acres of stunning gardens, glasshouses, and a treetop walkway at this UNESCO World Heritage Site. Home to the world\'s largest collection of living plants.',
      website: 'https://www.kew.org'
    },
    {
      id: '10',
      title: 'Harrods Food Hall & Knightsbridge Walking Tour',
      category: 'Shopping',
      location: 'Knightsbridge, SW1X',
      rating: 4.5,
      reviews: 2345,
      duration: '2 hours',
      price: 40,
      image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&q=80',
      featured: false,
      description: 'Discover the legendary Harrods Food Hall, explore luxury boutiques along Sloane Street, and learn the fascinating history of Knightsbridge with a local guide.',
      website: 'https://www.harrods.com'
    },
  ],
  ar: [
    {
      id: '1',
      title: 'جولة استوديو وارنر براذرز: صناعة هاري بوتر',
      category: 'ترفيه عائلي',
      location: 'واتفورد جانكشن',
      rating: 4.9,
      reviews: 12453,
      duration: '3-4 ساعات',
      price: 53,
      image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600&q=80',
      featured: true,
      description: 'امشِ عبر المواقع الحقيقية، وشاهد الأزياء والدعائم الأصلية، واكتشف أسرار صناعة أفلام هاري بوتر.',
      website: 'https://www.wbstudiotour.co.uk'
    },
    {
      id: '2',
      title: 'تذكرة عين لندن القياسية',
      category: 'سياحة',
      location: 'الضفة الجنوبية، واترلو',
      rating: 4.5,
      reviews: 48210,
      duration: '30 دقيقة',
      price: 32,
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=600&q=80',
      featured: true,
      description: 'ارتفع 135 مترًا فوق المدينة في كبسولة زجاجية لمشاهدة بيغ بن وقصر باكنغهام وكاتدرائية القديس بولس بزاوية 360 درجة.',
      website: 'https://www.londoneye.com'
    },
    {
      id: '3',
      title: 'دخول برج لندن مع جواهر التاج',
      category: 'تاريخ',
      location: 'تاور هيل، EC3',
      rating: 4.7,
      reviews: 36891,
      duration: '2-3 ساعات',
      price: 33,
      image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80',
      featured: true,
      description: 'استكشف 1000 عام من التاريخ في موقع التراث العالمي لليونسكو. شاهد جواهر التاج والتقِ بحراس يومان.',
      website: 'https://www.hrp.org.uk/tower-of-london'
    },
    {
      id: '4',
      title: 'رحلة نهر التايمز: من ويستمنستر إلى غرينتش',
      category: 'رحلة بحرية',
      location: 'رصيف ويستمنستر',
      rating: 4.6,
      reviews: 8567,
      duration: 'ساعة واحدة',
      price: 15,
      image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
      featured: false,
      description: 'انزلق أمام مباني البرلمان وذا شارد وجسر البرج وكناري وارف مع تعليق مباشر على معالم لندن.',
      website: 'https://www.thamesclippers.com'
    },
    {
      id: '5',
      title: 'قاعات قصر باكنغهام الرسمية (الافتتاح الصيفي)',
      category: 'تراث ملكي',
      location: 'ويستمنستر، SW1A',
      rating: 4.6,
      reviews: 5234,
      duration: '2-2.5 ساعة',
      price: 30,
      image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600&q=80',
      featured: false,
      description: 'زر الغرف الرسمية لمقر إقامة الملك في لندن خلال الافتتاح الصيفي السنوي. شاهد قاعة العرش ومعرض الصور.',
      website: 'https://www.rct.uk/visit/buckingham-palace'
    },
    {
      id: '6',
      title: 'مسرح ويست إند: شبح الأوبرا',
      category: 'ترفيه',
      location: 'مسرح صاحب الجلالة، ويست إند',
      rating: 4.8,
      reviews: 14521,
      duration: '2.5 ساعة',
      price: 35,
      image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      featured: true,
      description: 'استمتع بأطول عرض موسيقي في العالم في ويست إند الأسطوري في لندن. قصة مذهلة عن الهوس والحب والموسيقى.',
      website: 'https://www.thephantomoftheopera.com/london'
    },
    {
      id: '7',
      title: 'جولة المتحف البريطاني مع مرشد',
      category: 'ثقافة',
      location: 'بلومزبري، WC1B',
      rating: 4.8,
      reviews: 4987,
      duration: 'ساعتان',
      price: 0,
      image: 'https://images.unsplash.com/photo-1569587112025-0d460e81a126?w=600&q=80',
      featured: false,
      description: 'اكتشف مليوني عام من تاريخ البشرية مجانًا. أبرز المعروضات: حجر رشيد ورخام إلجن ومجموعة المومياوات المصرية.',
      website: 'https://www.britishmuseum.org'
    },
    {
      id: '8',
      title: 'شاي بعد الظهر في ذا شارد',
      category: 'طعام ومشروبات',
      location: 'لندن بريدج، SE1',
      rating: 4.7,
      reviews: 3678,
      duration: '1.5 ساعة',
      price: 65,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      featured: false,
      description: 'استمتع بشاي بعد الظهر الفاخر في الطابق 31 من ذا شارد مع إطلالات بانورامية على لندن.',
      website: 'https://www.the-shard.com/restaurants/aqua-shard'
    },
    {
      id: '9',
      title: 'تذكرة دخول حدائق كيو',
      category: 'طبيعة',
      location: 'ريتشموند، TW9',
      rating: 4.7,
      reviews: 15432,
      duration: '3-5 ساعات',
      price: 20,
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80',
      featured: false,
      description: 'استكشف 300 فدان من الحدائق المذهلة والبيوت الزجاجية وممشى قمم الأشجار في موقع التراث العالمي لليونسكو.',
      website: 'https://www.kew.org'
    },
    {
      id: '10',
      title: 'قاعة هارودز للطعام وجولة نايتسبريدج سيرًا',
      category: 'تسوق',
      location: 'نايتسبريدج، SW1X',
      rating: 4.5,
      reviews: 2345,
      duration: 'ساعتان',
      price: 40,
      image: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&q=80',
      featured: false,
      description: 'اكتشف قاعة هارودز الأسطورية للطعام واستكشف البوتيكات الفاخرة على طول شارع سلون مع مرشد محلي.',
      website: 'https://www.harrods.com'
    },
  ]
}

const text = {
  en: {
    title: 'London Experiences',
    subtitle: 'The best tours, attractions, and activities handpicked for Arab travellers',
    search: 'Search experiences...',
    featured: 'Featured',
    reviews: 'reviews',
    from: 'From',
    free: 'Free',
    bookNow: 'Book Now',
    categories: ['All', 'Sightseeing', 'Family Fun', 'History', 'Food & Drink', 'Entertainment', 'Culture', 'Nature', 'Shopping']
  },
  ar: {
    title: 'تجارب لندن',
    subtitle: 'أفضل الجولات والمعالم والأنشطة المختارة بعناية للمسافرين العرب',
    search: 'ابحث في التجارب...',
    featured: 'مميز',
    reviews: 'تقييم',
    from: 'من',
    free: 'مجاني',
    bookNow: 'احجز الآن',
    categories: ['الكل', 'سياحة', 'ترفيه عائلي', 'تاريخ', 'طعام ومشروبات', 'ترفيه', 'ثقافة', 'طبيعة', 'تسوق']
  }
}

export default function ExperiencesPage() {
  const { language } = useLanguage()
  const locale = (language || 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(t.categories[0])

  const filteredExperiences = experiences[locale].filter(exp => {
    const matchesSearch = !searchQuery || exp.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === t.categories[0] || exp.category === selectedCategory
    return matchesSearch && matchesCategory
  })

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

      {/* Category Filter */}
      <div className="bg-white border-b border-sand py-4 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-charcoal text-white'
                    : 'bg-cream-100 text-stone hover:bg-cream-200'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperiences.map((exp) => (
            <div key={exp.id} className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all group border border-sand/50">
              <div className="relative aspect-[4/3]">
                <Image src={exp.image} alt={exp.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                {exp.featured && (
                  <span className="absolute top-3 left-3 px-3 py-1 bg-london-600 text-white text-xs font-semibold rounded-full">
                    {t.featured}
                  </span>
                )}
                <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {exp.rating}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs text-london-600 font-medium mb-1">{exp.category}</div>
                <h3 className="font-bold text-charcoal mb-2 line-clamp-2">{exp.title}</h3>
                <p className="text-sm text-stone mb-3 line-clamp-2">{exp.description}</p>
                <div className="flex items-center gap-3 text-sm text-stone mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {exp.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exp.duration}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-sand">
                  <div>
                    {exp.price === 0 ? (
                      <span className="text-lg font-bold text-green-600">{t.free}</span>
                    ) : (
                      <>
                        <span className="text-xs text-stone">{t.from} </span>
                        <span className="text-lg font-bold text-charcoal">£{exp.price}</span>
                      </>
                    )}
                  </div>
                  <a
                    href={exp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-london-600 text-white text-sm font-medium rounded-lg hover:bg-london-700 transition-colors"
                  >
                    {t.bookNow}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
