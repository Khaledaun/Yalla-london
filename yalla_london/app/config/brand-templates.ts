
// Brand Templates for Platform Duplication System

export type BusinessType = 'luxury-guide' | 'kids-retail' | 'real-estate';

export interface BrandConfig {
  // Core Brand Identity
  siteName: string;
  siteNameAr: string;
  tagline: string;
  taglineAr: string;
  description: string;
  descriptionAr: string;
  businessType: BusinessType;
  
  // Visual Identity
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  
  // Navigation & Structure
  navigation: Array<{
    key: string;
    labelEn: string;
    labelAr: string;
    href: string;
  }>;
  
  // Content Categories
  categories: Array<{
    slug: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    icon: string;
  }>;
  
  // Contact & Social
  contact: {
    email: string;
    phone?: string;
    address?: {
      en: string;
      ar: string;
    };
    social: {
      instagram?: string;
      tiktok?: string;
      facebook?: string;
      twitter?: string;
    };
  };
  
  // SEO & Meta
  seo: {
    keywords: string;
    author: string;
    twitterHandle?: string;
  };
  
  // Content Structure
  contentTypes: Array<{
    type: string;
    nameEn: string;
    nameAr: string;
    fields: string[];
  }>;
}

// Template: Luxury London Guide (Original)
export const luxuryGuideTemplate: BrandConfig = {
  siteName: "Yalla London",
  siteNameAr: "يالا لندن",
  tagline: "Luxury London Guide",
  taglineAr: "دليل لندن الفاخر",
  description: "Yalla London connects Arab travellers with London's finest luxury hotels, halal restaurants, and exclusive experiences. Bilingual guide in English & Arabic.",
  descriptionAr: "يالا لندن يربط المسافرين العرب بأفخم فنادق لندن والمطاعم الحلال والتجارب الحصرية. دليل ثنائي اللغة بالعربية والإنجليزية.",
  businessType: 'luxury-guide',

  colors: {
    primary: "#C8322B", // London Red
    secondary: "#C49A2A", // Gold
    accent: "#3B7EA1", // Thames Blue
    background: "#FAF8F4", // Cream
    text: "#1C1917", // Charcoal
    muted: "#78716C" // Stone
  },
  
  navigation: [
    { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
    { key: 'information', labelEn: 'Info & Guides', labelAr: 'المعلومات والأدلة', href: '/information' },
    { key: 'stories', labelEn: 'London Stories', labelAr: 'حكايات لندن', href: '/blog' },
    { key: 'recommendations', labelEn: 'Recommendations', labelAr: 'التوصيات', href: '/recommendations' },
    { key: 'events', labelEn: 'Events & Tickets', labelAr: 'الفعاليات والتذاكر', href: '/events' },
    { key: 'founder', labelEn: 'The Founder', labelAr: 'المؤسس', href: '/about' },
  ],
  
  categories: [
    {
      slug: 'food-drink',
      nameEn: 'Food & Drink',
      nameAr: 'الطعام والشراب',
      descriptionEn: 'Discover London\'s finest restaurants and culinary gems',
      descriptionAr: 'اكتشف أفضل مطاعم لندن والكنوز الطهوية',
      icon: 'utensils'
    },
    {
      slug: 'style-shopping', 
      nameEn: 'Style & Shopping',
      nameAr: 'الأناقة والتسوق',
      descriptionEn: 'Explore luxury boutiques and shopping destinations',
      descriptionAr: 'استكشف البوتيكات الفاخرة ووجهات التسوق',
      icon: 'shopping-bag'
    },
    {
      slug: 'culture-art',
      nameEn: 'Culture & Art', 
      nameAr: 'الثقافة والفن',
      descriptionEn: 'Immerse in London\'s cultural and artistic heritage',
      descriptionAr: 'انغمس في التراث الثقافي والفني في لندن',
      icon: 'palette'
    },
    {
      slug: 'uk-travel',
      nameEn: 'UK Travel',
      nameAr: 'السفر في بريطانيا', 
      descriptionEn: 'Discover luxury destinations beyond London',
      descriptionAr: 'اكتشف وجهات فاخرة خارج لندن',
      icon: 'map'
    }
  ],
  
  contact: {
    email: 'hello@yallalondon.com',
    social: {
      instagram: 'https://instagram.com/yallalondon',
      tiktok: 'https://tiktok.com/@yallalondon'
    }
  },
  
  seo: {
    keywords: 'London luxury guide, London travel, luxury hotels London, fine dining London, London events',
    author: 'Yalla London',
    twitterHandle: '@yallalondon'
  },
  
  contentTypes: [
    {
      type: 'recommendation',
      nameEn: 'Recommendation',
      nameAr: 'توصية',
      fields: ['name', 'description', 'address', 'phone', 'website', 'rating', 'features']
    },
    {
      type: 'event',
      nameEn: 'Event',
      nameAr: 'فعالية',
      fields: ['title', 'description', 'date', 'venue', 'price', 'bookingUrl']
    }
  ]
};

// Template: Kids Clothing Store
export const kidsRetailTemplate: BrandConfig = {
  siteName: "Little Stars Fashion",
  siteNameAr: "أزياء النجوم الصغار",
  tagline: "Premium Kids Clothing Guide",
  taglineAr: "دليل ملابس الأطفال المميز",
  description: "Discover the finest children's fashion and clothing brands",
  descriptionAr: "اكتشف أفضل علامات أزياء وملابس الأطفال",
  businessType: 'kids-retail',
  
  colors: {
    primary: "#FF6B9D", // Pink
    secondary: "#4ECDC4", // Teal
    accent: "#FFE066", // Yellow
    background: "#FFFFFF",
    text: "#2D3748",
    muted: "#A0AEC0"
  },
  
  navigation: [
    { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
    { key: 'collections', labelEn: 'Collections', labelAr: 'المجموعات', href: '/blog' },
    { key: 'brands', labelEn: 'Brand Guide', labelAr: 'دليل العلامات', href: '/recommendations' },
    { key: 'sales', labelEn: 'Sales & Deals', labelAr: 'التخفيضات والعروض', href: '/events' },
    { key: 'about', labelEn: 'About Us', labelAr: 'من نحن', href: '/about' },
  ],
  
  categories: [
    {
      slug: 'boys-clothing',
      nameEn: 'Boys Clothing',
      nameAr: 'ملابس الأولاد',
      descriptionEn: 'Stylish and comfortable clothing for boys',
      descriptionAr: 'ملابس أنيقة ومريحة للأولاد',
      icon: 'shirt'
    },
    {
      slug: 'girls-clothing',
      nameEn: 'Girls Clothing', 
      nameAr: 'ملابس البنات',
      descriptionEn: 'Beautiful and trendy clothing for girls',
      descriptionAr: 'ملابس جميلة وعصرية للبنات',
      icon: 'dress'
    },
    {
      slug: 'accessories',
      nameEn: 'Accessories',
      nameAr: 'الإكسسوارات',
      descriptionEn: 'Complete the look with perfect accessories',
      descriptionAr: 'أكملي الإطلالة بالإكسسوارات المثالية',
      icon: 'crown'
    },
    {
      slug: 'shoes',
      nameEn: 'Shoes',
      nameAr: 'الأحذية',
      descriptionEn: 'Comfortable and stylish footwear for kids',
      descriptionAr: 'أحذية مريحة وأنيقة للأطفال',
      icon: 'shoe'
    }
  ],
  
  contact: {
    email: 'hello@littlestarsfashion.com',
    social: {
      instagram: 'https://instagram.com/littlestarsfashion',
      facebook: 'https://facebook.com/littlestarsfashion'
    }
  },
  
  seo: {
    keywords: 'kids clothing, children fashion, boys clothes, girls clothes, kids accessories, children shoes',
    author: 'Little Stars Fashion',
    twitterHandle: '@littlestarsf'
  },
  
  contentTypes: [
    {
      type: 'brand',
      nameEn: 'Brand',
      nameAr: 'علامة تجارية',
      fields: ['name', 'description', 'ageRange', 'priceRange', 'website', 'rating', 'specialties']
    },
    {
      type: 'sale',
      nameEn: 'Sale',
      nameAr: 'تخفيض',
      fields: ['title', 'description', 'discount', 'validUntil', 'brands', 'categories']
    }
  ]
};

// Template: Real Estate Guide  
export const realEstateTemplate: BrandConfig = {
  siteName: "Prime Properties Guide",
  siteNameAr: "دليل العقارات المميزة",
  tagline: "Luxury Real Estate Insights",
  taglineAr: "رؤى العقارات الفاخرة", 
  description: "Your guide to premium properties and real estate insights",
  descriptionAr: "دليلك للعقارات المميزة ورؤى الاستثمار العقاري",
  businessType: 'real-estate',
  
  colors: {
    primary: "#1E40AF", // Blue
    secondary: "#059669", // Green
    accent: "#DC2626", // Red
    background: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280"
  },
  
  navigation: [
    { key: 'home', labelEn: 'Home', labelAr: 'الرئيسية', href: '/' },
    { key: 'insights', labelEn: 'Market Insights', labelAr: 'رؤى السوق', href: '/blog' },
    { key: 'areas', labelEn: 'Prime Areas', labelAr: 'المناطق المميزة', href: '/recommendations' },
    { key: 'listings', labelEn: 'Featured Listings', labelAr: 'العقارات المختارة', href: '/events' },
    { key: 'services', labelEn: 'Services', labelAr: 'الخدمات', href: '/about' },
  ],
  
  categories: [
    {
      slug: 'luxury-homes',
      nameEn: 'Luxury Homes',
      nameAr: 'المنازل الفاخرة',
      descriptionEn: 'Exceptional luxury residential properties',
      descriptionAr: 'عقارات سكنية فاخرة استثنائية',
      icon: 'home'
    },
    {
      slug: 'investment',
      nameEn: 'Investment Properties',
      nameAr: 'العقارات الاستثمارية',
      descriptionEn: 'High-yield investment opportunities',
      descriptionAr: 'فرص استثمارية عالية العائد',
      icon: 'chart-bar'
    },
    {
      slug: 'commercial',
      nameEn: 'Commercial',
      nameAr: 'تجاري',
      descriptionEn: 'Premium commercial real estate',
      descriptionAr: 'عقارات تجارية مميزة',
      icon: 'building'
    },
    {
      slug: 'new-developments',
      nameEn: 'New Developments',
      nameAr: 'المشاريع الجديدة',
      descriptionEn: 'Latest development projects and launches',
      descriptionAr: 'أحدث المشاريع التطويرية والإطلاقات',
      icon: 'crane'
    }
  ],
  
  contact: {
    email: 'info@primepropertiesguide.com',
    phone: '+44 20 7123 4567',
    social: {
      instagram: 'https://instagram.com/primepropertiesguide',
      facebook: 'https://facebook.com/primepropertiesguide'
    }
  },
  
  seo: {
    keywords: 'luxury real estate, property investment, prime properties, London real estate, property guide',
    author: 'Prime Properties Guide',
    twitterHandle: '@primepropguide'
  },
  
  contentTypes: [
    {
      type: 'area',
      nameEn: 'Area',
      nameAr: 'منطقة',
      fields: ['name', 'description', 'averagePrice', 'priceGrowth', 'amenities', 'transport', 'schools']
    },
    {
      type: 'listing',
      nameEn: 'Listing',
      nameAr: 'عقار',
      fields: ['title', 'description', 'price', 'bedrooms', 'bathrooms', 'area', 'features', 'agent']
    }
  ]
};

// Export all templates
export const brandTemplates = {
  'luxury-guide': luxuryGuideTemplate,
  'kids-retail': kidsRetailTemplate, 
  'real-estate': realEstateTemplate,
} as const;
