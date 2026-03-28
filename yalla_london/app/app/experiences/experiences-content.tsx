'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, MapPin, Clock, Search, ChevronDown, ChevronUp, Users, BookOpen, Utensils, MapPinned, Ticket, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/language-provider'
import { getPageAffiliateLink } from '@/lib/affiliate/page-affiliate-links'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

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
      description: 'Walk through the actual sets used in all eight Harry Potter films, see authentic costumes and hand-crafted props, and discover the filmmaking secrets behind the magic. Step onto Platform 9¾, stroll down Diagon Alley, and try a mug of Butterbeer in the backlot cafe. The Digital Art department showcase reveals how creatures like Dobby were brought to life through motion capture and CGI.',
      insiderTip: 'Book the first morning slot (9:00 AM) for the emptiest sets and best photo opportunities. The last entry is often discounted — check the website a week in advance.',
      gccFeatures: ['Halal snacks available at the backlot cafe', 'Prayer room on request at the visitor centre', 'Arabic audio guide included with entry', 'Family-friendly with pushchair access throughout', 'Private VIP group tours available for families'],
      bestFor: ['Families', 'Harry Potter fans', 'Children aged 5-15'],
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
      description: 'Soar 135 metres above the city in a climate-controlled glass capsule for breathtaking 360-degree views of Big Ben, Buckingham Palace, St Paul\'s Cathedral, and the winding Thames below. Each rotation takes roughly 30 minutes, giving you ample time to spot landmarks and take photos. On clear days the visibility stretches 40 kilometres — all the way to Windsor Castle.',
      insiderTip: 'Upgrade to the fast-track ticket to skip the queue, which can exceed an hour during summer weekends. Sunset slots offer the most dramatic golden-hour photography.',
      gccFeatures: ['Private capsule bookings for families up to 15 guests', 'Nearby halal restaurants on the South Bank', 'Climate-controlled capsules comfortable in all weather', 'Pushchair and wheelchair accessible', 'Arabic information leaflets at the ticket desk'],
      bestFor: ['First-time visitors', 'Couples', 'Families with young children'],
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
      description: 'Explore over 1,000 years of royal history at this imposing UNESCO World Heritage fortress on the Thames. View the dazzling Crown Jewels collection — including the 530-carat Great Star of Africa diamond — meet the iconic Yeoman Warders (Beefeaters) who share gripping tales of royal intrigue, and walk the very grounds where Anne Boleyn and Sir Walter Raleigh were imprisoned. The White Tower houses a remarkable collection of royal armour dating back to Henry VIII.',
      insiderTip: 'Arrive at opening time (9:00 AM) and head straight for the Crown Jewels — the queue builds to 90 minutes by midday. The free Yeoman Warder tours depart every 30 minutes from the main entrance.',
      gccFeatures: ['Arabic audio guide available at no extra charge', 'Halal food options at the New Armouries Cafe', 'Prayer facilities at nearby Tower Hill mosque (5-min walk)', 'Family ticket discounts for 2 adults + 3 children', 'Step-free access to most areas including Crown Jewels'],
      bestFor: ['History enthusiasts', 'Families', 'Culture lovers'],
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
      description: 'Glide along the Thames past the Houses of Parliament, the Shard, Tower Bridge, the Globe Theatre, and Canary Wharf while an entertaining live commentary brings each landmark to life. The open-air upper deck is perfect for photography, while the heated lower saloon keeps you comfortable year-round. This is one of the best-value ways to see London from an entirely different perspective — and a welcome break for tired feet after a day of walking.',
      insiderTip: 'Sit on the right side (starboard) heading to Greenwich for the best views of Tower Bridge and the Tower of London. The hop-on hop-off river pass offers better value than a single journey if you plan to explore Greenwich.',
      gccFeatures: ['Covered heated saloon suitable for all weather and modest dress', 'Halal-certified snacks sold onboard', 'Private boat charter available for groups up to 12', 'Family-friendly with no age restrictions', 'Accessible boarding at Westminster Pier'],
      bestFor: ['Families', 'Photographers', 'First-time visitors'],
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
      description: 'Step inside The King\'s official London residence during the exclusive annual summer opening (late July to September). Walk through nineteen lavishly decorated State Rooms, including the Throne Room with its pair of thrones used for the 2023 Coronation, the Picture Gallery housing masterpieces by Rembrandt and Vermeer, and the Grand Staircase with its gilded bronze balustrade. The multimedia guide adds fascinating behind-the-scenes stories about state banquets and royal receptions.',
      insiderTip: 'Book the combined ticket that includes the Royal Mews and Queen\'s Gallery for the full royal experience. Tuesday and Wednesday mornings are the quietest visiting days.',
      gccFeatures: ['Multimedia guide available in Arabic', 'Modest dress code naturally suits the formal palace environment', 'Halal restaurants within a 10-minute walk in Victoria', 'Private group tours can be arranged for families', 'Air-conditioned State Rooms'],
      bestFor: ['Culture lovers', 'Luxury travellers', 'Royal history enthusiasts'],
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
      description: 'Experience the world\'s longest-running musical in London\'s legendary West End theatre district. Andrew Lloyd Webber\'s spectacular tale of obsession, love, and music unfolds beneath the Paris Opera House with a jaw-dropping chandelier crash, stunning pyrotechnics, and a 230-piece costume collection. The intimate His Majesty\'s Theatre — a Grade II listed Edwardian gem — makes every seat feel close to the action. Over 145 million people worldwide have seen this show, and the London production remains the definitive version.',
      insiderTip: 'Premium stalls (rows D-G centre) offer the best sightlines for the chandelier scene. Book midweek matinees for cheaper tickets and a less crowded theatre. The show has no interval drinks queue if you pre-order at the bar.',
      gccFeatures: ['No food or alcohol required — suitable for all guests', 'Shows available six evenings plus matinees', 'Private box seating for families seeking seclusion', 'Theatre is a short walk from halal restaurants on Haymarket', 'Subtitled performances available on select dates'],
      bestFor: ['Couples', 'Theatre lovers', 'Teenagers and adults'],
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
      description: 'Discover over two million years of human history and culture entirely free of charge at one of the world\'s greatest museums. The collection spans eight million objects across 94 galleries. Highlights include the Rosetta Stone that unlocked Egyptian hieroglyphics, the Elgin Marbles from the Parthenon, and a world-class Egyptian mummies collection with over 100 mummies and coffins. The Islamic world gallery (Room 42) showcases exquisite calligraphy, ceramics, and scientific instruments from the golden age of Islamic civilisation.',
      insiderTip: 'The free 45-minute Eye-opener tours are the best way to navigate the vast collection — ask at the information desk for the next departure. The Islamic gallery and Egyptian rooms are closest to the main entrance on the ground floor.',
      gccFeatures: ['Free admission — no booking required', 'Exceptional Islamic art and civilisation gallery (Room 42)', 'Arabic audio guide available for hire', 'Prayer room available on request at the information desk', 'Family trails and activity backpacks for children'],
      bestFor: ['Culture lovers', 'Families', 'History enthusiasts'],
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
      description: 'Indulge in a luxury afternoon tea on the 31st floor of The Shard — Western Europe\'s tallest building — with floor-to-ceiling windows revealing panoramic views stretching to the Surrey Hills. The menu features freshly baked scones with clotted cream, artisan finger sandwiches, and a rotating selection of hand-crafted pastries from the head patissier. Choose from over 20 premium loose-leaf teas including rare single-estate Darjeeling and delicate jasmine silver tips. The elegant setting and impeccable service make this a quintessential London luxury experience.',
      insiderTip: 'Request a window table when booking — the south-facing seats have the most dramatic views toward Tower Bridge and the City. Afternoon tea sells out weeks in advance during summer, so book early.',
      gccFeatures: ['Non-alcoholic afternoon tea option available by default', 'Halal dietary requirements accommodated with advance notice', 'Private dining rooms for families and groups', 'Elegant dress code naturally aligns with modest fashion', 'Adjacent prayer facilities at London Bridge Mosque (3-min walk)'],
      bestFor: ['Couples', 'Luxury travellers', 'Foodies'],
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
      description: 'Explore 300 acres of stunning botanical gardens, Victorian glasshouses, and an 18-metre-high treetop walkway at this UNESCO World Heritage Site in leafy Richmond. Kew is home to the world\'s largest collection of living plants — over 50,000 species — displayed across themed gardens from Japanese landscapes to Mediterranean terraces. The iconic Palm House, a masterpiece of Victorian engineering, transports you into a tropical rainforest. Children love the interactive play areas and the 200-metre-long Great Pagoda with panoramic views.',
      insiderTip: 'Visit in spring (April-May) for the bluebell woods and cherry blossom walkway, or December for the magical after-dark Christmas light trail. The Orangery restaurant offers the best lunch on-site.',
      gccFeatures: ['Expansive outdoor spaces ideal for families with children', 'Halal-friendly food options at the on-site cafes', 'Peaceful and serene environment suitable for all visitors', 'Flat terrain and wide paths for pushchairs and wheelchairs', 'Modest dress comfortable in the garden setting'],
      bestFor: ['Families', 'Nature lovers', 'Photographers'],
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

export default function ExperiencesPage({ serverLocale }: { serverLocale?: 'en' | 'ar' }) {
  const { language: clientLanguage } = useLanguage()
  const locale = (serverLocale ?? clientLanguage ?? 'en') as 'en' | 'ar'
  const isRTL = locale === 'ar'
  const t = text[locale]

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(t.categories[0])
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const filteredExperiences = experiences[locale].filter(exp => {
    const matchesSearch = !searchQuery || exp.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === t.categories[0] || exp.category === selectedCategory
    return matchesSearch && matchesCategory
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
              { label: isRTL ? 'تجارب' : 'Experiences' },
            ]}
            className="justify-center mb-6 text-yl-gray-400"
          />
          <SectionLabel>{isRTL ? 'أنشطة مميزة' : 'Curated Activities'}</SectionLabel>
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

      {/* Editorial Intro Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-6 ${isRTL ? 'font-arabic text-right' : ''}`}>
            {locale === 'ar' ? 'تجارب لا تُنسى في لندن' : 'Unforgettable London Experiences'}
          </h2>
          <div className={`space-y-4 font-body text-yl-gray-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
            <p>
              {locale === 'ar'
                ? 'تُعد لندن واحدة من أغنى مدن العالم بالتجارب المتنوعة، حيث تمتزج المعالم التاريخية العريقة التي يعود عمرها لألف عام مع مناطق الجذب الحديثة ذات المستوى العالمي. من أبراج لندن الشامخة التي تحتضن جواهر التاج الملكية، إلى عين لندن التي توفر إطلالات بانورامية خلابة على أفق المدينة، تقدم العاصمة البريطانية تجارب تناسب جميع الأذواق والأعمار. سواء كنت من عشاق التاريخ أو محبي الفنون أو تبحث عن مغامرات عائلية ممتعة، ستجد في لندن ما يفوق توقعاتك.'
                : 'London ranks among the world\'s richest cities for diverse experiences, where thousand-year-old historic landmarks blend seamlessly with world-class modern attractions. From the imposing Tower of London housing the Crown Jewels to the London Eye offering sweeping panoramic views across the city skyline, the British capital delivers experiences for every taste and age group. Whether you are passionate about history, arts and culture, or searching for fun family adventures, London consistently exceeds expectations.'}
            </p>
            <p>
              {locale === 'ar'
                ? 'ما يميز لندن بشكل خاص للزوار العرب والخليجيين هو الاهتمام المتزايد بتوفير تجارب مراعية للثقافة العربية والإسلامية. توفر العديد من المعالم السياحية الكبرى أدلة صوتية باللغة العربية، بما في ذلك برج لندن والمتحف البريطاني وقصر باكنغهام. كما تنتشر المطاعم الحلال بالقرب من معظم مناطق الجذب السياحي الرئيسية، وتتوفر غرف صلاة في العديد من المتاحف والمراكز التجارية الكبرى. تجعل هذه المرافق من لندن وجهة مثالية للعائلات العربية التي تبحث عن تجربة سياحية مريحة وممتعة دون أي تنازلات.'
                : 'What makes London particularly appealing for Arab and Gulf visitors is the growing attention to culturally sensitive and inclusive experiences. Many major attractions now provide Arabic audio guides, including the Tower of London, the British Museum, and Buckingham Palace. Halal dining options are widely available near most major tourist areas, and prayer rooms can be found in numerous museums and large shopping centres. These amenities make London an ideal destination for Arab families seeking a comfortable and enjoyable travel experience without compromise.'}
            </p>
            <p>
              {locale === 'ar'
                ? 'تضم قائمتنا المختارة بعناية أفضل عشر تجارب في لندن، تتراوح بين المعالم التاريخية المجانية مثل المتحف البريطاني والتجارب الفاخرة مثل شاي بعد الظهر في ذا شارد. لقد اختبرنا كل تجربة شخصيًا وقيّمناها بناءً على جودة الخدمة ومدى ملاءمتها للعائلات وسهولة الوصول إليها. ستجد خيارات تناسب جميع الميزانيات، من الأنشطة المجانية إلى التجارب الحصرية التي تستحق كل بنس.'
                : 'Our carefully curated selection highlights ten of London\'s finest experiences, ranging from free historic landmarks such as the British Museum to luxury outings like afternoon tea at The Shard. We have personally visited and evaluated each experience based on service quality, family-friendliness, and accessibility. You will find options for every budget, from complimentary activities to exclusive experiences that are worth every penny.'}
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="bg-white border-b border-yl-gray-200 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-7">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {t.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-mono text-[10px] tracking-wider uppercase whitespace-nowrap transition-all duration-300 ease-yl ${
                  selectedCategory === cat
                    ? 'bg-yl-dark-navy text-yl-parchment'
                    : 'bg-yl-gray-100 text-yl-gray-500 hover:bg-yl-gray-200 hover:text-yl-charcoal'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiences Grid */}
      <div className="max-w-7xl mx-auto px-7 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredExperiences.map((exp) => (
            <BrandCardLight key={exp.id} className="overflow-hidden group">
              <div className="relative aspect-[4/3]">
                <Image src={exp.image} alt={exp.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500 ease-yl" />
                {exp.featured && (
                  <span className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`}>
                    <BrandTag color="red">{t.featured}</BrandTag>
                  </span>
                )}
                <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} bg-white/90 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1`}>
                  <Star className="w-3 h-3 text-yl-gold fill-yl-gold" />
                  <span className="font-mono text-[10px] font-bold text-yl-charcoal tracking-wider">{exp.rating}</span>
                </div>
              </div>
              <div className="p-5">
                <span className="font-mono text-[9px] font-semibold text-yl-red uppercase tracking-wider">{exp.category}</span>
                <h3 className={`font-heading font-bold text-yl-charcoal mt-1 mb-2 line-clamp-2 group-hover:text-yl-red transition-colors duration-300 ease-yl ${isRTL ? 'font-arabic' : ''}`}>{exp.title}</h3>
                <p className="font-body text-sm text-yl-gray-500 mb-3 line-clamp-2 leading-relaxed">{exp.description}</p>
                <div className="flex items-center gap-4 font-mono text-[10px] text-yl-gray-500 tracking-wider mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-yl-gold" /> {exp.location}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-yl-gold" /> {exp.duration}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-yl-gray-200">
                  <div>
                    {exp.price === 0 ? (
                      <span className="text-lg font-heading font-bold text-green-600">{t.free}</span>
                    ) : (
                      <>
                        <span className="font-mono text-[10px] text-yl-gray-500 tracking-wider uppercase">{t.from} </span>
                        <span className="text-lg font-heading font-bold text-yl-charcoal">£{exp.price}</span>
                      </>
                    )}
                  </div>
                  {(() => {
                    const affLink = getPageAffiliateLink(exp.title, 'experience', 'yalla-london', 'experiences-page');
                    const href = affLink?.url || exp.website;
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
      </div>

      {/* Tips for Arab Travellers Section */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'ar' ? 'نصائح التخطيط للزوار العرب' : 'Planning Tips for Arab Visitors'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'أفضل الأوقات لتجنب الازدحام' : 'Best Times to Avoid Crowds'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'تكون المعالم السياحية أقل ازدحامًا خلال أيام الأسبوع وفي الصباح الباكر. إذا كنت تزور لندن خلال شهر رمضان المبارك، فإن فترة ما بعد الظهر تكون مثالية حيث تقل أعداد الزوار بشكل ملحوظ. تجنب فترات العطل المدرسية البريطانية في أكتوبر وفبراير وأبريل للحصول على تجربة أكثر هدوءًا.'
                      : 'Attractions are least crowded on weekdays and during early mornings. If visiting London during Ramadan, afternoons are ideal as visitor numbers drop noticeably. Avoid British school half-terms in October, February, and April for a quieter experience. Summer months (July-August) are peak season, so booking tickets in advance is strongly recommended.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'تجارب مناسبة للعائلات والأطفال' : 'Family-Friendly Experiences with Children'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'معظم المعالم الرئيسية في لندن ترحب بالأطفال وتوفر أسعارًا مخفضة لهم. استوديو وارنر براذرز وحدائق كيو والمتحف البريطاني من أفضل الخيارات للعائلات. يدخل الأطفال دون سن 5 سنوات مجانًا في معظم الأماكن. تأكد من حجز عربة أطفال مجانية في المتاحف الكبرى لراحة أطفالك الصغار.'
                      : 'Most major London attractions welcome children and offer discounted rates. Warner Bros. Studio Tour, Kew Gardens, and the British Museum are among the best choices for families. Children under 5 typically enter free at most venues. Be sure to request a free buggy at larger museums for your little ones\' comfort, and look for family ticket bundles that save up to 20%.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'توفر الأدلة الصوتية العربية' : 'Arabic Audio Guide Availability'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'تتوفر الأدلة الصوتية باللغة العربية في عدد متزايد من المعالم السياحية في لندن. برج لندن والمتحف البريطاني وقصر باكنغهام وكاتدرائية القديس بولس جميعها توفر هذه الخدمة. اسأل عن الدليل الصوتي عند شراء التذكرة. بعض الأماكن تقدمه مجانًا والبعض الآخر يتقاضى رسومًا رمزية تتراوح بين 4 و6 جنيهات استرلينية.'
                      : 'Arabic audio guides are available at a growing number of London attractions. The Tower of London, British Museum, Buckingham Palace, and St Paul\'s Cathedral all offer this service. Ask about the audio guide when purchasing your ticket. Some venues include it free of charge while others charge a nominal fee of 4-6 pounds. Many museums also offer Arabic-language printed guides at their information desks.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <MapPinned className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'مواقع غرف الصلاة بالقرب من المعالم' : 'Prayer Room Locations at Major Attractions'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'توفر العديد من المعالم السياحية والمراكز التجارية الكبرى غرف صلاة مخصصة. المتحف البريطاني يحتوي على غرفة صلاة هادئة في الطابق السفلي. مركز ويستفيلد للتسوق في شيبردز بوش وستراتفورد يوفران مصليات مجهزة بالكامل. مسجد لندن المركزي في ريجنتس بارك يقع على بعد دقائق من حديقة الحيوان ومتحف مدام توسو.'
                      : 'Many major attractions and shopping centres provide dedicated prayer rooms. The British Museum has a quiet prayer room in the lower level. Westfield shopping centres in Shepherd\'s Bush and Stratford offer fully equipped prayer facilities. The London Central Mosque in Regent\'s Park is just minutes from London Zoo and Madame Tussauds. Apps like SalatTime and Muslim Pro can help locate nearby prayer spaces throughout central London.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'طعام حلال بالقرب من المعالم السياحية' : 'Halal Food Near Attractions'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'تنتشر المطاعم الحلال في جميع أنحاء وسط لندن، وخاصة بالقرب من المعالم السياحية الشهيرة. منطقة إيدجوير رود (على بعد دقائق من هايد بارك وقصر باكنغهام) تضم عشرات المطاعم العربية واللبنانية. منطقة وايت تشابل بالقرب من برج لندن مليئة بالمطاعم الآسيوية والشرق أوسطية الحلال. نوصي باستخدام تطبيق Zabihah أو HalalTrip للعثور على أقرب مطعم حلال.'
                      : 'Halal restaurants are plentiful across central London, especially near popular attractions. Edgware Road (minutes from Hyde Park and Buckingham Palace) is home to dozens of Arabic and Lebanese restaurants. Whitechapel near the Tower of London is packed with halal Asian and Middle Eastern eateries. We recommend using the Zabihah or HalalTrip apps to find the nearest halal restaurant. Many mainstream chains like Nando\'s, Wagamama, and Pizza Express also serve halal chicken at London locations.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>

            <BrandCardLight className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yl-gold/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-yl-gold" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className={`font-heading font-bold text-yl-charcoal mb-2 ${isRTL ? 'font-arabic' : ''}`}>
                    {locale === 'ar' ? 'بطاقة لندن وتوفير التذاكر المجمعة' : 'London Pass and Combo Ticket Savings'}
                  </h3>
                  <p className="font-body text-sm text-yl-gray-500 leading-relaxed">
                    {locale === 'ar'
                      ? 'إذا كنت تخطط لزيارة ثلاث تجارب أو أكثر، فإن بطاقة لندن (London Pass) يمكن أن توفر لك حتى 50% من تكلفة الدخول. تشمل البطاقة الدخول المجاني إلى أكثر من 80 معلمًا سياحيًا بما فيها برج لندن وكاتدرائية القديس بولس وجولة نهر التايمز. تتوفر بطاقات لمدة 1 و2 و3 و6 و10 أيام. كما تتوفر تذاكر مجمعة لعين لندن مع رحلة نهرية أو متحف مدام توسو بتوفير يصل إلى 25%.'
                      : 'If you plan to visit three or more experiences, the London Pass can save you up to 50% on admission costs. The pass includes free entry to over 80 attractions including the Tower of London, St Paul\'s Cathedral, and Thames River Cruises. Passes are available for 1, 2, 3, 6, and 10 days. Combo tickets for the London Eye with a river cruise or Madame Tussauds offer savings of up to 25%. Book online at least 24 hours in advance for the best prices, as walk-up tickets are typically 10-15% more expensive.'}
                  </p>
                </div>
              </div>
            </BrandCardLight>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
          <div className="space-y-3">
            {[
              {
                q: locale === 'ar' ? 'هل المعالم السياحية في لندن مناسبة للعائلات؟' : 'Are London attractions family-friendly?',
                a: locale === 'ar'
                  ? 'نعم، الغالبية العظمى من المعالم السياحية في لندن مناسبة تمامًا للعائلات والأطفال. معظم المتاحف والمعارض مجانية الدخول وتوفر أنشطة تفاعلية خاصة بالأطفال. استوديو وارنر براذرز لهاري بوتر وحدائق كيو وعين لندن من أفضل الخيارات العائلية. يدخل الأطفال دون سن 5 سنوات مجانًا في معظم الأماكن، وتتوفر عربات أطفال مجانية في المتاحف الكبرى. كما توفر العديد من الأماكن غرف تغيير حفاضات ومناطق استراحة للعائلات.'
                  : 'Yes, the vast majority of London attractions are perfectly suited for families and children. Most museums and galleries offer free admission and provide interactive activities specifically for children. Warner Bros. Studio Tour, Kew Gardens, and the London Eye are among the best family choices. Children under 5 typically enter free at most venues, and complimentary buggies are available at larger museums. Many venues also provide baby-changing facilities and family rest areas. During school holidays, special family workshops and events are often available at major museums.',
              },
              {
                q: locale === 'ar' ? 'هل يمكنني العثور على طعام حلال بالقرب من المعالم السياحية؟' : 'Can I find halal food near attractions?',
                a: locale === 'ar'
                  ? 'بالتأكيد. لندن هي واحدة من أفضل المدن في أوروبا للطعام الحلال. تتوفر مطاعم حلال بالقرب من جميع المعالم السياحية الرئيسية تقريبًا. شارع إيدجوير رود يضم عشرات المطاعم العربية واللبنانية على بعد دقائق من هايد بارك وقصر باكنغهام. منطقة وايت تشابل قريبة من برج لندن وتحتوي على مطاعم حلال متنوعة. سلاسل مطاعم مثل ناندوز وواغاماما وبيتزا إكسبرس تقدم دجاجًا حلالًا في فروعها بلندن. نوصي بتطبيق Zabihah أو HalalTrip للبحث.'
                  : 'Absolutely. London is one of the best cities in Europe for halal food. Halal restaurants are available near virtually all major tourist attractions. Edgware Road features dozens of Arabic and Lebanese restaurants just minutes from Hyde Park and Buckingham Palace. Whitechapel, close to the Tower of London, is packed with diverse halal eateries. Major chains such as Nando\'s, Wagamama, and Pizza Express serve halal chicken at their London locations. We recommend the Zabihah or HalalTrip apps for searching nearby options. Even in areas with fewer halal restaurants, fish and vegetarian options are always widely available.',
              },
              {
                q: locale === 'ar' ? 'ما هي التجارب التي تقدم أدلة صوتية باللغة العربية؟' : 'Which experiences offer Arabic audio guides?',
                a: locale === 'ar'
                  ? 'تتزايد المعالم التي توفر أدلة صوتية عربية باستمرار. حاليًا، تشمل القائمة: برج لندن (مجاني مع التذكرة)، المتحف البريطاني (مجاني)، قصر باكنغهام (متضمن في سعر التذكرة)، كاتدرائية القديس بولس (4 جنيهات إضافية)، متحف التاريخ الطبيعي (مجاني)، ومتحف فيكتوريا وألبرت (مجاني). كما يقدم العديد من منظمي الجولات السياحية مرشدين يتحدثون العربية بالحجز المسبق. نصيحتنا: اسأل دائمًا عند شراء التذكرة فقد تتوفر خدمات إضافية لم تُعلن عنها.'
                  : 'The number of attractions offering Arabic audio guides is steadily growing. Currently the list includes: Tower of London (free with ticket), British Museum (free), Buckingham Palace (included in ticket price), St Paul\'s Cathedral (additional 4 pounds), Natural History Museum (free), and the Victoria and Albert Museum (free). Many tour operators also provide Arabic-speaking guides available on advance booking. Our insider tip: always ask at the ticket desk, as some venues have Arabic language materials that are not prominently advertised. Several attractions are also developing Arabic-language mobile apps for self-guided tours.',
              },
              {
                q: locale === 'ar' ? 'ما هو أفضل موسم لزيارة لندن؟' : 'What is the best season to visit London?',
                a: locale === 'ar'
                  ? 'تتمتع كل فصول السنة في لندن بسحر خاص. الربيع (أبريل - مايو) يقدم طقسًا معتدلاً وحدائق مزهرة مع أعداد أقل من السياح. الصيف (يونيو - أغسطس) هو الأكثر دفئًا ومثالي للأنشطة الخارجية مثل رحلات التايمز وحدائق كيو، لكنه الأكثر ازدحامًا. الخريف (سبتمبر - أكتوبر) يوفر ألوانًا خريفية جميلة وأجواء هادئة مع أسعار فنادق أقل. الشتاء (نوفمبر - فبراير) يتميز بأسواق عيد الميلاد وحلبات التزلج وعروض مسرحية استثنائية. للزوار الخليجيين الذين يفضلون الدفء، نوصي بالفترة من مايو إلى سبتمبر.'
                  : 'Each season in London has its own charm. Spring (April-May) brings mild weather and blooming gardens with fewer tourists. Summer (June-August) is warmest and ideal for outdoor activities like Thames cruises and Kew Gardens, though it is the busiest period. Autumn (September-October) offers beautiful fall colours and a relaxed atmosphere with lower hotel rates. Winter (November-February) features Christmas markets, ice-skating rinks, and exceptional theatre productions. For Gulf visitors who prefer warmer weather, we recommend visiting between May and September when daytime temperatures typically range from 18-28 degrees Celsius.',
              },
              {
                q: locale === 'ar' ? 'هل توجد خصومات جماعية للعائلات؟' : 'Are there group discounts for families?',
                a: locale === 'ar'
                  ? 'نعم، تقدم معظم المعالم السياحية في لندن تذاكر عائلية بخصومات تصل إلى 25%. عادةً ما تشمل التذكرة العائلية شخصين بالغين وطفلين أو ثلاثة. بطاقة لندن (London Pass) خيار ممتاز للعائلات الكبيرة لأنها تشمل أكثر من 80 معلمًا. كما توفر بعض الفنادق الفاخرة باقات تشمل تذاكر المعالم السياحية. للمجموعات المكونة من 10 أشخاص أو أكثر، تقدم العديد من الأماكن خصومات إضافية تصل إلى 30% عند الحجز المسبق. نصيحة: احجز عبر الإنترنت مسبقًا بيوم على الأقل للحصول على أفضل الأسعار، فالتذاكر عند الباب أغلى بنسبة 10-15%.'
                  : 'Yes, most London attractions offer family tickets with discounts of up to 25%. A standard family ticket typically covers two adults and two or three children. The London Pass is an excellent choice for larger families as it includes over 80 attractions. Some luxury hotels also offer packages that include attraction tickets. For groups of 10 or more, many venues provide additional discounts of up to 30% when booked in advance. Top tip: always book online at least one day ahead for the best prices, as walk-up tickets are typically 10-15% more expensive. Some attractions also offer annual membership which pays for itself after just two visits.',
              },
            ].map((faq, index) => (
              <div key={index} className="border border-yl-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className={`w-full flex items-center justify-between p-5 bg-white hover:bg-yl-cream/50 transition-colors duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <span className={`font-heading font-bold text-yl-charcoal ${isRTL ? 'font-arabic' : ''}`}>{faq.q}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-yl-gold flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-yl-gold flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className={`px-5 pb-5 font-body text-sm text-yl-gray-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Links Section */}
      <section className="py-12 bg-yl-cream">
        <div className="max-w-7xl mx-auto px-7">
          <h2 className={`text-3xl font-heading font-bold text-yl-charcoal mb-8 text-center ${isRTL ? 'font-arabic' : ''}`}>
            {locale === 'ar' ? 'اكتشف المزيد' : 'Explore More'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/hotels" className="group">
              <BrandCardLight className="p-6 text-center h-full transition-shadow duration-300 group-hover:shadow-lg">
                <div className="w-12 h-12 rounded-full bg-yl-gold/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-yl-gold" />
                </div>
                <h3 className={`font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'ar' ? 'فنادق لندن الفاخرة' : 'Luxury London Hotels'}
                </h3>
                <p className="font-body text-sm text-yl-gray-500">
                  {locale === 'ar'
                    ? 'اكتشف أفضل الفنادق الفاخرة والمناسبة للعائلات العربية في لندن، مع خيارات طعام حلال وخدمات باللغة العربية.'
                    : 'Discover the finest luxury hotels suited for Arab families in London, featuring halal dining options and Arabic-speaking concierge services.'}
                </p>
              </BrandCardLight>
            </Link>

            <Link href="/recommendations" className="group">
              <BrandCardLight className="p-6 text-center h-full transition-shadow duration-300 group-hover:shadow-lg">
                <div className="w-12 h-12 rounded-full bg-yl-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-yl-gold" />
                </div>
                <h3 className={`font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'ar' ? 'توصياتنا المميزة' : 'Our Top Recommendations'}
                </h3>
                <p className="font-body text-sm text-yl-gray-500">
                  {locale === 'ar'
                    ? 'قائمة مختارة بعناية من أفضل المطاعم والمقاهي والأماكن المميزة التي نوصي بها شخصيًا لكل زائر عربي.'
                    : 'A handpicked selection of the best restaurants, cafes, and standout venues we personally recommend for every Arab visitor to London.'}
                </p>
              </BrandCardLight>
            </Link>

            <Link href="/information" className="group">
              <BrandCardLight className="p-6 text-center h-full transition-shadow duration-300 group-hover:shadow-lg">
                <div className="w-12 h-12 rounded-full bg-yl-gold/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-yl-gold" />
                </div>
                <h3 className={`font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors ${isRTL ? 'font-arabic' : ''}`}>
                  {locale === 'ar' ? 'دليل المعلومات الشامل' : 'Comprehensive Travel Guide'}
                </h3>
                <p className="font-body text-sm text-yl-gray-500">
                  {locale === 'ar'
                    ? 'كل ما تحتاج معرفته عن لندن: المواصلات، الطقس، التأشيرات، صرف العملات، ونصائح عملية للمسافرين العرب.'
                    : 'Everything you need to know about London: transport, weather, visas, currency exchange, and practical tips tailored for Arab travellers.'}
                </p>
              </BrandCardLight>
            </Link>
          </div>
        </div>
      </section>

      <TriBar />
    </div>
  )
}
