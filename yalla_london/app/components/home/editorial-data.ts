/**
 * Editorial Homepage — Content Data
 * All text, articles, hotels, experiences in one place.
 * Bilingual EN/AR with proper translations.
 */

export const HERO = {
  en: {
    kicker: "The Definitive London Guide",
    title1: "Experience London",
    title2: "Your Way",
    description: "Curated luxury experiences, halal dining, and insider secrets for the discerning traveller.",
    cta: "Start Exploring",
  },
  ar: {
    kicker: "الدليل الشامل للندن",
    title1: "اكتشف لندن",
    title2: "على طريقتك",
    description: "تجارب فاخرة مختارة، مطاعم حلال، وأسرار من الداخل للمسافر المميز.",
    cta: "ابدأ الاستكشاف",
  },
};

export const INTENTS = [
  {
    href: "/luxury-hotels-london",
    icon: "Gem",
    en: { title: "Luxury Hotels", subtitle: "Handpicked 5-star stays" },
    ar: { title: "فنادق فاخرة", subtitle: "إقامات خمس نجوم مختارة" },
  },
  {
    href: "/halal-restaurants-london",
    icon: "Utensils",
    en: { title: "Halal Dining", subtitle: "Top halal restaurants" },
    ar: { title: "مطاعم حلال", subtitle: "أفضل المطاعم الحلال" },
  },
  {
    href: "/experiences",
    icon: "Compass",
    en: { title: "Experiences & Tours", subtitle: "Curated London activities" },
    ar: { title: "تجارب وجولات", subtitle: "أنشطة لندن المختارة" },
  },
];

export const FEATURED_ARTICLE = {
  slug: "best-halal-restaurants-central-london-2026",
  image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  en: {
    category: "Editor's Pick",
    title: "Best Halal Restaurants in Central London 2026",
    excerpt: "25+ vetted halal restaurants across Mayfair, Soho and Knightsbridge with honest pricing, certification notes and booking tips.",
    author: "Yalla London Team",
    date: "Mar 2026",
    readTime: "5 min read",
  },
  ar: {
    category: "اختيار المحرر",
    title: "أفضل المطاعم الحلال في وسط لندن 2026",
    excerpt: "أكثر من 25 مطعماً حلالاً في مايفير وسوهو ونايتسبريدج مع أسعار دقيقة وملاحظات الاعتماد ونصائح الحجز.",
    author: "فريق يلا لندن",
    date: "مارس 2026",
    readTime: "5 دقائق للقراءة",
  },
};

export const FALLBACK_ARTICLES = {
  en: [
    { id: "2", slug: "spring-london-2026-best-things-to-do-arab-visitors", category: "Travel", title: "Spring in London 2026: Best Things to Do", excerpt: "Cherry blossoms, outdoor markets, and longer days.", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80", date: "Mar 2026", readTime: "8 min read" },
    { id: "3", slug: "harrods-vs-selfridges-which-better-2026", category: "Shopping", title: "Harrods vs Selfridges: Which is Better?", excerpt: "A detailed comparison of London's two iconic department stores.", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80", date: "Mar 2026", readTime: "6 min read" },
    { id: "4", slug: "luxury-afternoon-tea-london-guide", category: "Dining", title: "Best Afternoon Tea in London", excerpt: "From The Ritz to Sketch, the ultimate guide to London's tea culture.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80", date: "Apr 2026", readTime: "7 min read" },
  ],
  ar: [
    { id: "2", slug: "spring-london-2026-best-things-to-do-arab-visitors", category: "سفر", title: "الربيع في لندن 2026: أفضل الأنشطة", excerpt: "أزهار الكرز والأسواق المفتوحة وأيام أطول.", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80", date: "مارس 2026", readTime: "8 دقائق" },
    { id: "3", slug: "harrods-vs-selfridges-which-better-2026", category: "تسوق", title: "هارودز أم سيلفريدجز: أيهما أفضل؟", excerpt: "مقارنة تفصيلية بين أشهر متجرين في لندن.", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80", date: "مارس 2026", readTime: "6 دقائق" },
    { id: "4", slug: "luxury-afternoon-tea-london-guide", category: "مطاعم", title: "أفضل شاي العصر في لندن", excerpt: "من الريتز إلى سكتش، الدليل الشامل لثقافة الشاي في لندن.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80", date: "أبريل 2026", readTime: "7 دقائق" },
  ],
};

export const EXPERIENCES = {
  en: [
    { id: "1", title: "Harry Potter Studio Tour", price: "From \u00A355", image: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80" },
    { id: "2", title: "London Eye Experience", price: "From \u00A332", image: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80" },
    { id: "3", title: "Thames River Cruise", price: "From \u00A325", image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80" },
    { id: "4", title: "Tower of London Tour", price: "From \u00A330", image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80" },
  ],
  ar: [
    { id: "1", title: "جولة استوديو هاري بوتر", price: "من \u00A355", image: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&q=80" },
    { id: "2", title: "عين لندن", price: "من \u00A332", image: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80" },
    { id: "3", title: "رحلة نهر التايمز", price: "من \u00A325", image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80" },
    { id: "4", title: "جولة برج لندن", price: "من \u00A330", image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80" },
  ],
};

export const HOTELS = {
  en: [
    { id: "1", name: "The Dorchester", location: "Mayfair", category: "Ultra-Luxury", stars: 5, price: "From \u00A3650/night", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80", badge: "Luxury" },
    { id: "2", name: "The Ritz London", location: "Piccadilly", category: "Heritage", stars: 5, price: "From \u00A3750/night", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&q=80", badge: "5 Star" },
    { id: "3", name: "Claridge\u2019s", location: "Mayfair", category: "Art Deco", stars: 5, price: "From \u00A3580/night", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500&q=80", badge: "Historic" },
  ],
  ar: [
    { id: "1", name: "دورتشستر", location: "مايفير", category: "فاخر للغاية", stars: 5, price: "من \u00A3650/ليلة", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80", badge: "فاخر" },
    { id: "2", name: "ريتز لندن", location: "بيكاديلي", category: "تراث", stars: 5, price: "من \u00A3750/ليلة", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&q=80", badge: "5 نجوم" },
    { id: "3", name: "كلاريدجز", location: "مايفير", category: "آرت ديكو", stars: 5, price: "من \u00A3580/ليلة", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500&q=80", badge: "تاريخي" },
  ],
};

export const GUIDES = {
  en: [
    { id: "1", title: "The Complete London Guide", price: "Free", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&q=80", badge: "Popular" },
    { id: "2", title: "Halal Food Guide London", price: "Free", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80", badge: "New" },
    { id: "3", title: "Family London: Kids Guide", price: "Free", image: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=500&q=80", badge: null },
  ],
  ar: [
    { id: "1", title: "دليل لندن الشامل", price: "مجاني", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&q=80", badge: "شائع" },
    { id: "2", title: "دليل الطعام الحلال في لندن", price: "مجاني", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80", badge: "جديد" },
    { id: "3", title: "لندن العائلية: دليل الأطفال", price: "مجاني", image: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=500&q=80", badge: null },
  ],
};

export const INFO_SECTIONS = {
  en: [
    { icon: "Compass", title: "Plan Your Trip", desc: "Visa, flights, budgets & packing lists" },
    { icon: "Map", title: "Neighbourhood Guides", desc: "Explore London area by area" },
    { icon: "Train", title: "Getting Around", desc: "Tube, bus, Oyster & travel hacks" },
    { icon: "Utensils", title: "Food & Dining", desc: "Halal restaurants & markets" },
    { icon: "Users", title: "Family & Kids", desc: "Kid-friendly activities & tips" },
    { icon: "Gem", title: "Hidden Gems", desc: "Secret spots locals love" },
  ],
  ar: [
    { icon: "Compass", title: "خطط لرحلتك", desc: "التأشيرات والرحلات والميزانيات" },
    { icon: "Map", title: "أدلة الأحياء", desc: "استكشف لندن منطقة بمنطقة" },
    { icon: "Train", title: "التنقل", desc: "المترو والحافلات ونصائح السفر" },
    { icon: "Utensils", title: "الطعام والمطاعم", desc: "مطاعم حلال وأسواق" },
    { icon: "Users", title: "العائلة والأطفال", desc: "أنشطة مناسبة للأطفال" },
    { icon: "Gem", title: "جواهر مخفية", desc: "أماكن سرية يحبها السكان" },
  ],
};

export const TESTIMONIALS = [
  {
    name: "Ahmed Al-Rashid", initials: "AR",
    en: { location: "Dubai, UAE", text: "Yalla London helped me find the best halal restaurants and family-friendly attractions. Their insider tips on the Harrods food hall saved us hours of searching." },
    ar: { location: "دبي، الإمارات", text: "ساعدني يالا لندن في العثور على أفضل المطاعم الحلال والأماكن المناسبة للعائلات. نصائحهم عن قسم الطعام في هارودز وفرت علينا ساعات من البحث." },
  },
  {
    name: "Fatima Al-Kuwari", initials: "FK",
    en: { location: "Doha, Qatar", text: "I planned my entire 10-day London trip using their guides. The neighborhood breakdowns and hotel reviews were spot-on." },
    ar: { location: "الدوحة، قطر", text: "خططت رحلتي إلى لندن لمدة 10 أيام باستخدام أدلتهم. تحليل الأحياء ومراجعات الفنادق كانت دقيقة." },
  },
  {
    name: "Omar Bassam", initials: "OB",
    en: { location: "Riyadh, KSA", text: "The best Arabic resource for London travel. Their guide to Knightsbridge shopping made our family holiday unforgettable." },
    ar: { location: "الرياض، السعودية", text: "أفضل مصدر عربي للسفر إلى لندن. دليلهم للتسوق في نايتسبريدج جعل إجازة عائلتنا لا تُنسى." },
  },
];

export const TEXT = {
  en: {
    trending: "Trending",
    trendingItems: ["London Marathon 2026", "Ramadan in London \u2014 iftar spots", "Spring in London \u2014 best parks"],
    latestStories: "Latest Stories",
    viewAll: "View All",
    readMore: "Read More",
    upcomingEvents: "Upcoming Events",
    getTickets: "Get Tickets",
    topExperiences: "Top Experiences",
    bookNow: "Book Now",
    luxuryHotels: "Luxury Hotels",
    viewDeals: "View Details",
    newsletter: "The Yalla Letter",
    newsletterDesc: "Weekly London tips, exclusive deals, and insider guides delivered to your inbox every Friday.",
    emailPlaceholder: "Enter your email",
    subscribeBtn: "Subscribe Free",
    informationHub: "Information Hub",
    informationHubSub: "Your complete guide to visiting London",
    exploreHub: "Explore the Hub",
    pdfGuides: "Travel Guides",
    guidesSub: "Expert PDF guides crafted for Arab visitors",
    downloadNow: "Coming Soon",
    testimonials: "Testimonials",
    testimonialsTitle: "What Our Travelers Say",
    testimonialsSub: "Thousands of Arab travelers trust us to plan their London trips",
  },
  ar: {
    trending: "الأكثر رواجاً",
    trendingItems: ["ماراثون لندن 2026", "رمضان في لندن \u2014 أماكن الإفطار", "الربيع في لندن \u2014 أفضل الحدائق"],
    latestStories: "أحدث المقالات",
    viewAll: "عرض الكل",
    readMore: "اقرأ المزيد",
    upcomingEvents: "الفعاليات القادمة",
    getTickets: "احصل على التذاكر",
    topExperiences: "أفضل التجارب",
    bookNow: "احجز الآن",
    luxuryHotels: "فنادق فاخرة",
    viewDeals: "عرض التفاصيل",
    newsletter: "نشرة يلا",
    newsletterDesc: "نصائح لندن الأسبوعية والعروض الحصرية تصلك كل جمعة.",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    subscribeBtn: "اشترك مجاناً",
    informationHub: "مركز المعلومات",
    informationHubSub: "دليلك الشامل لزيارة لندن",
    exploreHub: "استكشف المركز",
    pdfGuides: "أدلة السفر",
    guidesSub: "أدلة PDF متخصصة للزوار العرب",
    downloadNow: "قريباً",
    testimonials: "شهادات",
    testimonialsTitle: "ماذا يقول مسافرونا",
    testimonialsSub: "آلاف المسافرين العرب يثقون بنا لتخطيط رحلاتهم إلى لندن",
  },
};
