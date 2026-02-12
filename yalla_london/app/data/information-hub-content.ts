/**
 * Information Hub Content for Yalla London
 *
 * Structured data for the Information Hub landing page.
 * Sections represent the main navigation categories,
 * articles are featured travel guides, and categories
 * group articles for filtering.
 */

export interface InformationSection {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  sort_order: number;
  published: boolean;
}

export interface InformationArticle {
  id: string;
  slug: string;
  section_id: string;
  category_id: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  featured_image: string;
  reading_time: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InformationCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
}

// Main information hub sections
export const informationSections: InformationSection[] = [
  {
    id: 'sec-plan-your-trip',
    slug: 'plan-your-trip',
    name_en: 'Plan Your Trip',
    name_ar: 'خطط لرحلتك',
    description_en: 'Everything you need to plan the perfect London trip — visas, best times to visit, packing tips, and itineraries.',
    description_ar: 'كل ما تحتاجه للتخطيط لرحلة لندن المثالية — التأشيرات، أفضل أوقات الزيارة، نصائح التعبئة، والبرامج السياحية.',
    icon: 'map',
    sort_order: 1,
    published: true,
  },
  {
    id: 'sec-attractions-landmarks',
    slug: 'attractions-landmarks',
    name_en: 'Attractions & Landmarks',
    name_ar: 'المعالم والأماكن السياحية',
    description_en: 'Iconic landmarks, world-class museums, royal palaces, and must-see sights across London.',
    description_ar: 'المعالم الشهيرة، المتاحف العالمية، القصور الملكية، والأماكن التي يجب زيارتها في لندن.',
    icon: 'landmark',
    sort_order: 2,
    published: true,
  },
  {
    id: 'sec-neighbourhood-guides',
    slug: 'neighbourhood-guides',
    name_en: 'Neighbourhood Guides',
    name_ar: 'أدلة الأحياء',
    description_en: 'Explore London neighbourhood by neighbourhood — from Mayfair and Knightsbridge to Camden and Shoreditch.',
    description_ar: 'استكشف لندن حياً بحي — من مايفير ونايتسبريدج إلى كامدن وشورديتش.',
    icon: 'map-pin',
    sort_order: 3,
    published: true,
  },
  {
    id: 'sec-transportation',
    slug: 'transportation',
    name_en: 'Transportation',
    name_ar: 'المواصلات',
    description_en: 'Navigate London like a local — Oyster cards, the Tube, buses, taxis, and airport transfers.',
    description_ar: 'تنقل في لندن كالمحليين — بطاقة أويستر، المترو، الحافلات، سيارات الأجرة، والتنقل من المطار.',
    icon: 'train',
    sort_order: 4,
    published: true,
  },
  {
    id: 'sec-food-restaurants',
    slug: 'food-restaurants',
    name_en: 'Food & Restaurants',
    name_ar: 'الطعام والمطاعم',
    description_en: 'Halal dining, fine restaurants, street food markets, and the best culinary experiences in London.',
    description_ar: 'المطاعم الحلال، المطاعم الفاخرة، أسواق الطعام، وأفضل التجارب الغذائية في لندن.',
    icon: 'utensils-crossed',
    sort_order: 5,
    published: true,
  },
  {
    id: 'sec-family-kids',
    slug: 'family-kids',
    name_en: 'Family & Kids',
    name_ar: 'العائلة والأطفال',
    description_en: 'Family-friendly attractions, kids\' activities, theme parks, and tips for travelling with children.',
    description_ar: 'الأماكن المناسبة للعائلات، أنشطة الأطفال، المتنزهات الترفيهية، ونصائح السفر مع الأطفال.',
    icon: 'baby',
    sort_order: 6,
    published: true,
  },
  {
    id: 'sec-hidden-gems',
    slug: 'hidden-gems',
    name_en: 'Hidden Gems & Free Activities',
    name_ar: 'الجواهر الخفية والأنشطة المجانية',
    description_en: 'Secret spots, free museums, beautiful parks, and off-the-beaten-path experiences.',
    description_ar: 'الأماكن السرية، المتاحف المجانية، الحدائق الجميلة، والتجارب البعيدة عن المسارات التقليدية.',
    icon: 'gem',
    sort_order: 7,
    published: true,
  },
  {
    id: 'sec-dos-and-donts',
    slug: 'dos-and-donts',
    name_en: 'Dos & Don\'ts',
    name_ar: 'ما يجب فعله وما يجب تجنبه',
    description_en: 'Cultural etiquette, tipping customs, safety tips, and common mistakes to avoid in London.',
    description_ar: 'آداب السلوك الثقافي، عادات البقشيش، نصائح السلامة، والأخطاء الشائعة التي يجب تجنبها في لندن.',
    icon: 'alert-circle',
    sort_order: 8,
    published: true,
  },
  {
    id: 'sec-practical-info',
    slug: 'practical-info',
    name_en: 'Practical Information',
    name_ar: 'معلومات عملية',
    description_en: 'Currency, weather, SIM cards, Wi-Fi, electricity, and essential practical tips for London.',
    description_ar: 'العملة، الطقس، شرائح الاتصال، الواي فاي، الكهرباء، ونصائح عملية أساسية للندن.',
    icon: 'info',
    sort_order: 9,
    published: true,
  },
  {
    id: 'sec-coupons-deals',
    slug: 'coupons-deals',
    name_en: 'Coupons & Deals',
    name_ar: 'كوبونات وعروض',
    description_en: 'Exclusive discounts, London Pass deals, outlet shopping, and money-saving tips.',
    description_ar: 'خصومات حصرية، عروض بطاقة لندن، التسوق من المنافذ، ونصائح لتوفير المال.',
    icon: 'ticket',
    sort_order: 10,
    published: true,
  },
  {
    id: 'sec-emergency-healthcare',
    slug: 'emergency-healthcare',
    name_en: 'Emergency & Healthcare',
    name_ar: 'الطوارئ والرعاية الصحية',
    description_en: 'NHS access, pharmacies, emergency numbers, travel insurance, and healthcare for visitors.',
    description_ar: 'الوصول إلى الخدمات الصحية، الصيدليات، أرقام الطوارئ، تأمين السفر، والرعاية الصحية للزوار.',
    icon: 'shield',
    sort_order: 11,
    published: true,
  },
  {
    id: 'sec-e-document-shop',
    slug: 'e-document-shop',
    name_en: 'E-Document Shop',
    name_ar: 'متجر المستندات الإلكترونية',
    description_en: 'Downloadable travel planners, checklists, itinerary templates, and London pocket guides.',
    description_ar: 'مخططات سفر قابلة للتحميل، قوائم تحقق، قوالب برامج سياحية، وأدلة لندن الجيبية.',
    icon: 'file-text',
    sort_order: 12,
    published: true,
  },
  {
    id: 'sec-luxury-experiences',
    slug: 'luxury-experiences',
    name_en: 'Luxury Experiences',
    name_ar: 'التجارب الفاخرة',
    description_en: 'Exclusive VIP experiences, private tours, luxury shopping, and high-end London living.',
    description_ar: 'تجارب VIP حصرية، جولات خاصة، تسوق فاخر، والحياة الراقية في لندن.',
    icon: 'crown',
    sort_order: 13,
    published: true,
  },
];

// Article categories for filtering
export const informationCategories: InformationCategory[] = [
  { id: 'icat-guides', slug: 'guides', name_en: 'Travel Guides', name_ar: 'أدلة السفر' },
  { id: 'icat-tips', slug: 'tips', name_en: 'Tips & Advice', name_ar: 'نصائح وإرشادات' },
  { id: 'icat-culture', slug: 'culture', name_en: 'Culture & Etiquette', name_ar: 'ثقافة وآداب' },
  { id: 'icat-family', slug: 'family', name_en: 'Family Travel', name_ar: 'سفر عائلي' },
  { id: 'icat-food', slug: 'food', name_en: 'Food & Dining', name_ar: 'الطعام والمطاعم' },
  { id: 'icat-luxury', slug: 'luxury', name_en: 'Luxury', name_ar: 'الفخامة' },
];

// Featured articles displayed on the information hub landing page
export const informationArticles: InformationArticle[] = [
  {
    id: 'iart-001',
    slug: 'complete-london-guide-arab-visitors',
    section_id: 'sec-plan-your-trip',
    category_id: 'icat-guides',
    title_en: 'The Complete London Guide for Arab Visitors (2025)',
    title_ar: 'الدليل الشامل للندن للزوار العرب (2025)',
    excerpt_en: 'Everything you need to know before your London trip — from visas and flights to the best areas to stay, halal dining, and cultural tips.',
    excerpt_ar: 'كل ما تحتاج معرفته قبل رحلتك إلى لندن — من التأشيرات والرحلات الجوية إلى أفضل مناطق الإقامة والمطاعم الحلال والنصائح الثقافية.',
    featured_image: '/images/information/london-guide-arab-visitors.jpg',
    reading_time: 15,
    published: true,
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-20'),
  },
  {
    id: 'iart-002',
    slug: 'best-halal-restaurants-london-2025',
    section_id: 'sec-food-restaurants',
    category_id: 'icat-food',
    title_en: 'Best Halal Restaurants in London: A Complete Guide',
    title_ar: 'أفضل المطاعم الحلال في لندن: دليل شامل',
    excerpt_en: 'Discover the finest halal restaurants in London — from Michelin-starred dining to beloved neighbourhood gems trusted by the Arab community.',
    excerpt_ar: 'اكتشف أرقى المطاعم الحلال في لندن — من المطاعم الحائزة على نجوم ميشلان إلى الجواهر المحلية المحبوبة من المجتمع العربي.',
    featured_image: '/images/information/halal-restaurants-london.jpg',
    reading_time: 12,
    published: true,
    created_at: new Date('2025-01-12'),
    updated_at: new Date('2025-01-18'),
  },
  {
    id: 'iart-003',
    slug: 'london-with-kids-family-guide',
    section_id: 'sec-family-kids',
    category_id: 'icat-family',
    title_en: 'London with Kids: The Ultimate Family Guide',
    title_ar: 'لندن مع الأطفال: الدليل العائلي الشامل',
    excerpt_en: 'Top family-friendly attractions, activities for all ages, pushchair-friendly routes, and tips for making London magical for your little ones.',
    excerpt_ar: 'أفضل الأماكن المناسبة للعائلات، أنشطة لجميع الأعمار، مسارات مناسبة لعربات الأطفال، ونصائح لجعل لندن ساحرة لصغاركم.',
    featured_image: '/images/information/london-family-kids.jpg',
    reading_time: 10,
    published: true,
    created_at: new Date('2025-01-10'),
    updated_at: new Date('2025-01-15'),
  },
  {
    id: 'iart-004',
    slug: 'london-underground-guide-tourists',
    section_id: 'sec-transportation',
    category_id: 'icat-tips',
    title_en: 'Mastering the London Underground: A Tourist\'s Guide',
    title_ar: 'إتقان مترو لندن: دليل السائح',
    excerpt_en: 'Navigate the Tube with confidence — Oyster cards vs contactless, peak hours to avoid, step-free stations, and insider tips for smooth travel.',
    excerpt_ar: 'تنقل في المترو بثقة — بطاقة أويستر مقابل الدفع اللاتلامسي، ساعات الذروة التي يجب تجنبها، المحطات الخالية من الدرج، ونصائح المحليين.',
    featured_image: '/images/information/london-underground-guide.jpg',
    reading_time: 8,
    published: true,
    created_at: new Date('2025-01-08'),
    updated_at: new Date('2025-01-12'),
  },
  {
    id: 'iart-005',
    slug: 'luxury-shopping-london-guide',
    section_id: 'sec-luxury-experiences',
    category_id: 'icat-luxury',
    title_en: 'Luxury Shopping in London: Harrods, Selfridges & Beyond',
    title_ar: 'التسوق الفاخر في لندن: هارودز، سيلفريدجز وأكثر',
    excerpt_en: 'Your guide to London\'s most prestigious shopping destinations — from Bond Street boutiques to Bicester Village outlet, including VAT refund tips.',
    excerpt_ar: 'دليلك لأرقى وجهات التسوق في لندن — من بوتيكات شارع بوند إلى منافذ قرية بيستر، بما في ذلك نصائح استرداد ضريبة القيمة المضافة.',
    featured_image: '/images/information/luxury-shopping-london.jpg',
    reading_time: 11,
    published: true,
    created_at: new Date('2025-01-05'),
    updated_at: new Date('2025-01-10'),
  },
  {
    id: 'iart-006',
    slug: 'british-etiquette-arab-travellers',
    section_id: 'sec-dos-and-donts',
    category_id: 'icat-culture',
    title_en: 'British Etiquette: What Every Arab Traveller Should Know',
    title_ar: 'آداب السلوك البريطانية: ما يجب أن يعرفه كل مسافر عربي',
    excerpt_en: 'Understand British customs, tipping culture, queuing etiquette, and social norms to make the most of your London experience.',
    excerpt_ar: 'افهم العادات البريطانية، ثقافة البقشيش، آداب الطوابير، والأعراف الاجتماعية لتحقيق أقصى استفادة من تجربتك في لندن.',
    featured_image: '/images/information/british-etiquette-guide.jpg',
    reading_time: 7,
    published: true,
    created_at: new Date('2025-01-03'),
    updated_at: new Date('2025-01-08'),
  },
  {
    id: 'iart-007',
    slug: 'free-things-to-do-london',
    section_id: 'sec-hidden-gems',
    category_id: 'icat-tips',
    title_en: '25 Free Things to Do in London That Tourists Often Miss',
    title_ar: '25 شيئاً مجانياً يمكنك فعله في لندن والتي يفوتها السياح عادةً',
    excerpt_en: 'From world-class museums to stunning parks and secret viewpoints — discover the best free experiences London has to offer.',
    excerpt_ar: 'من المتاحف العالمية إلى الحدائق الخلابة ونقاط المشاهدة السرية — اكتشف أفضل التجارب المجانية التي تقدمها لندن.',
    featured_image: '/images/information/free-london-activities.jpg',
    reading_time: 9,
    published: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-05'),
  },
  {
    id: 'iart-008',
    slug: 'london-neighbourhood-guide-arab-families',
    section_id: 'sec-neighbourhood-guides',
    category_id: 'icat-guides',
    title_en: 'Best London Neighbourhoods for Arab Families',
    title_ar: 'أفضل أحياء لندن للعائلات العربية',
    excerpt_en: 'Discover which London neighbourhoods are most welcoming for Arab families — from Edgware Road to Kensington, with halal options and Arabic-speaking services.',
    excerpt_ar: 'اكتشف أكثر أحياء لندن ترحيباً بالعائلات العربية — من إدجوير رود إلى كنسينغتون، مع خيارات حلال وخدمات ناطقة بالعربية.',
    featured_image: '/images/information/london-neighbourhoods-arab.jpg',
    reading_time: 10,
    published: true,
    created_at: new Date('2024-12-28'),
    updated_at: new Date('2025-01-02'),
  },
];
