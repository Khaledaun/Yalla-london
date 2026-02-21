
/**
 * Brand Templates — Zenitha.Luxury LLC Content Network
 *
 * Each template defines the visual identity, navigation, categories,
 * and content structure for a site in the Zenitha content arm.
 *
 * Currently: luxury-guide (Yalla London and future destination sites).
 * Add new templates here when launching a site with a different content model
 * (e.g., a reseller portal, a booking-focused site, etc.)
 */

import { SITES, getDefaultSiteId } from '@/config/sites';

const DEFAULT_DOMAIN = SITES[getDefaultSiteId()]?.domain || Object.values(SITES)[0]?.domain || 'zenitha.luxury';

export type BusinessType = 'luxury-guide';

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

// Template: Luxury Travel Guide (used by Yalla London + all destination sites)
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
    email: `hello@${DEFAULT_DOMAIN}`,
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

// Export all templates
export const brandTemplates = {
  'luxury-guide': luxuryGuideTemplate,
} as const;
