
export type Language = 'en' | 'ar'

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    blog: 'London Stories',
    recommendations: 'Recommendations',
    eventsTickets: 'Events Tickets',
    about: 'The Founder',
    
    // Homepage
    heroTitle: 'Discover Luxury London',
    heroSubtitle: 'Experience London with the insight of a local',
    exploreButton: 'Explore Now',
    
    // New sections
    latestExperiences: 'Latest Experiences in London',
    upcomingEvents: 'Upcoming Events',
    testimonials: 'What Our Travelers Say',
    testimonialsCTA: 'Join thousands who experienced London like never before',
    bookNow: 'Book Now',
    learnMore: 'Learn More',
    
    // Categories
    categories: {
      'food-drink': 'Food & Drink',
      'style-shopping': 'Style & Shopping',
      'culture-art': 'Culture & Art',
      'football': 'Football',
      'uk-travel': 'UK Travel'
    },
    
    // Common
    readMore: 'Read More',
    viewAll: 'View All',
    loading: 'Loading...',
    search: 'Search',
    filter: 'Filter',
    share: 'Share',
    
    // Footer
    footerText: 'Discover the luxury side of London',
    
    // Recommendations
    hotels: 'Hotels',
    restaurants: 'Restaurants',
    attractions: 'Attractions',
    luxury: 'Luxury',
    midRange: 'Mid-range',
    budget: 'Budget',
    
    // About
    founderTitle: 'Meet The Founder',
    
    // Admin
    adminDashboard: 'Admin Dashboard',
    generateContent: 'Generate Content',
    contentGeneration: 'Content Generation',
    blogTopics: 'Blog Topics',
    blogContent: 'Blog Content',
  },
  
  ar: {
    // Navigation
    home: 'الرئيسية',
    blog: 'حكايات لندن',
    recommendations: 'التوصيات',
    eventsTickets: 'تذاكر الفعاليات',
    about: 'المؤسسة',
    
    // Homepage
    heroTitle: 'اكتشف لندن الفاخرة',
    heroSubtitle: 'اختبر لندن بنظرة محلية',
    exploreButton: 'استكشف الآن',
    
    // New sections
    latestExperiences: 'أحدث التجارب في لندن',
    upcomingEvents: 'الفعاليات القادمة',
    testimonials: 'ماذا يقول مسافرونا',
    testimonialsCTA: 'انضم إلى الآلاف الذين اختبروا لندن بطريقة لم يسبق لها مثيل',
    bookNow: 'احجز الآن',
    learnMore: 'اعرف المزيد',
    
    // Categories
    categories: {
      'food-drink': 'الطعام والشراب',
      'style-shopping': 'الأناقة والتسوق',
      'culture-art': 'الثقافة والفن',
      'football': 'كرة القدم',
      'uk-travel': 'السفر في بريطانيا'
    },
    
    // Common
    readMore: 'اقرأ المزيد',
    viewAll: 'عرض الكل',
    loading: 'جاري التحميل...',
    search: 'البحث',
    filter: 'تصفية',
    share: 'مشاركة',
    
    // Footer
    footerText: 'اكتشف الجانب الفاخر من لندن',
    
    // Recommendations
    hotels: 'الفنادق',
    restaurants: 'المطاعم',
    attractions: 'المعالم',
    luxury: 'فاخر',
    midRange: 'متوسط',
    budget: 'اقتصادي',
    
    // About
    founderTitle: 'تعرف على المؤسسة',
    
    // Admin
    adminDashboard: 'لوحة الإدارة',
    generateContent: 'إنشاء محتوى',
    contentGeneration: 'إنشاء المحتوى',
    blogTopics: 'مواضيع المدونة',
    blogContent: 'محتوى المدونة',
  }
}

export function getTranslation(language: Language, key: string): string {
  const keys = key.split('.')
  let value: any = translations[language]
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  return value || key
}

export function isRTL(language: Language): boolean {
  return language === 'ar'
}
