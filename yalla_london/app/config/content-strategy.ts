/**
 * Content Strategy Configuration
 *
 * Defines content generation rules, SEO settings, and automation parameters
 * for the Yalla London platform.
 */

export interface ContentCategory {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string;
  description_ar: string;
  targetKeywords: string[];
  contentFrequency: 'daily' | 'weekly' | 'biweekly';
  priority: number;
}

export interface ContentTemplate {
  id: string;
  name: string;
  category: string;
  structure: {
    sections: string[];
    minWordCount: number;
    maxWordCount: number;
  };
  seoRequirements: {
    titleMaxLength: number;
    descriptionMaxLength: number;
    minImages: number;
    requiredSchemaTypes: string[];
  };
}

// Content Categories with SEO focus
export const contentCategories: ContentCategory[] = [
  {
    id: 'restaurants',
    name_en: 'Restaurants & Dining',
    name_ar: 'المطاعم والمأكولات',
    slug: 'restaurants',
    description_en: 'Discover the best restaurants in London for Arab visitors',
    description_ar: 'اكتشف أفضل المطاعم في لندن للزوار العرب',
    targetKeywords: [
      'halal restaurants london',
      'best arab food london',
      'middle eastern restaurants london',
      'مطاعم حلال لندن',
      'مطاعم عربية في لندن'
    ],
    contentFrequency: 'weekly',
    priority: 1,
  },
  {
    id: 'attractions',
    name_en: 'Attractions & Sightseeing',
    name_ar: 'المعالم السياحية',
    slug: 'attractions',
    description_en: 'Top London attractions for Arab tourists',
    description_ar: 'أفضل معالم لندن للسياح العرب',
    targetKeywords: [
      'london attractions for arab tourists',
      'things to do in london',
      'london sightseeing guide',
      'أماكن سياحية في لندن',
      'السياحة في لندن للعرب'
    ],
    contentFrequency: 'weekly',
    priority: 2,
  },
  {
    id: 'shopping',
    name_en: 'Shopping & Fashion',
    name_ar: 'التسوق والأزياء',
    slug: 'shopping',
    description_en: 'Best shopping destinations in London',
    description_ar: 'أفضل وجهات التسوق في لندن',
    targetKeywords: [
      'luxury shopping london',
      'harrods london',
      'selfridges london',
      'التسوق في لندن',
      'أفضل مراكز التسوق لندن'
    ],
    contentFrequency: 'biweekly',
    priority: 3,
  },
  {
    id: 'hotels',
    name_en: 'Hotels & Accommodation',
    name_ar: 'الفنادق والإقامة',
    slug: 'hotels',
    description_en: 'Best hotels in London for Arab families',
    description_ar: 'أفضل فنادق لندن للعائلات العربية',
    targetKeywords: [
      'family hotels london',
      'luxury hotels london',
      'hotels near arab areas london',
      'فنادق لندن للعائلات',
      'أفضل فنادق لندن'
    ],
    contentFrequency: 'biweekly',
    priority: 4,
  },
  {
    id: 'events',
    name_en: 'Events & Entertainment',
    name_ar: 'الفعاليات والترفيه',
    slug: 'events',
    description_en: 'Upcoming events and entertainment in London',
    description_ar: 'الفعاليات والترفيه القادمة في لندن',
    targetKeywords: [
      'events in london this week',
      'london entertainment',
      'arab events london',
      'فعاليات لندن',
      'حفلات عربية في لندن'
    ],
    contentFrequency: 'daily',
    priority: 5,
  },
  {
    id: 'guides',
    name_en: 'Travel Guides',
    name_ar: 'دليل السفر',
    slug: 'guides',
    description_en: 'Complete travel guides for London',
    description_ar: 'دليل السفر الشامل للندن',
    targetKeywords: [
      'london travel guide',
      'first time in london',
      'london tips for tourists',
      'دليل السياحة في لندن',
      'نصائح السفر الى لندن'
    ],
    contentFrequency: 'weekly',
    priority: 6,
  },
];

// Content Templates for AI generation
export const contentTemplates: ContentTemplate[] = [
  {
    id: 'restaurant-review',
    name: 'Restaurant Review',
    category: 'restaurants',
    structure: {
      sections: [
        'introduction',
        'location_and_ambiance',
        'menu_highlights',
        'halal_status',
        'price_range',
        'family_friendliness',
        'verdict',
      ],
      minWordCount: 800,
      maxWordCount: 1500,
    },
    seoRequirements: {
      titleMaxLength: 60,
      descriptionMaxLength: 160,
      minImages: 3,
      requiredSchemaTypes: ['Restaurant', 'Review'],
    },
  },
  {
    id: 'attraction-guide',
    name: 'Attraction Guide',
    category: 'attractions',
    structure: {
      sections: [
        'introduction',
        'history_and_significance',
        'what_to_see',
        'visiting_tips',
        'nearby_attractions',
        'practical_info',
      ],
      minWordCount: 1000,
      maxWordCount: 2000,
    },
    seoRequirements: {
      titleMaxLength: 60,
      descriptionMaxLength: 160,
      minImages: 5,
      requiredSchemaTypes: ['TouristAttraction', 'Article'],
    },
  },
  {
    id: 'shopping-guide',
    name: 'Shopping Guide',
    category: 'shopping',
    structure: {
      sections: [
        'introduction',
        'best_stores',
        'shopping_tips',
        'tax_refund_info',
        'nearby_dining',
      ],
      minWordCount: 800,
      maxWordCount: 1500,
    },
    seoRequirements: {
      titleMaxLength: 60,
      descriptionMaxLength: 160,
      minImages: 4,
      requiredSchemaTypes: ['ShoppingCenter', 'Article'],
    },
  },
  {
    id: 'event-listing',
    name: 'Event Listing',
    category: 'events',
    structure: {
      sections: [
        'event_overview',
        'date_time_location',
        'what_to_expect',
        'tickets_and_pricing',
        'how_to_get_there',
      ],
      minWordCount: 400,
      maxWordCount: 800,
    },
    seoRequirements: {
      titleMaxLength: 60,
      descriptionMaxLength: 160,
      minImages: 2,
      requiredSchemaTypes: ['Event'],
    },
  },
];

// SEO Configuration
export const seoConfig = {
  // Default meta settings
  defaults: {
    titleSuffix: ' | Yalla London',
    titleSuffixAr: ' | يلا لندن',
    defaultImage: '/og-image.jpg',
    twitterHandle: '@yallalondon',
  },

  // Target keywords by language
  primaryKeywords: {
    en: [
      'london guide for arabs',
      'arab tourists london',
      'halal london',
      'london for arab families',
      'luxury london travel',
    ],
    ar: [
      'دليل لندن للعرب',
      'السياحة في لندن',
      'لندن للعائلات العربية',
      'حلال لندن',
      'السفر الى لندن',
    ],
  },

  // Schema.org types to use
  schemaTypes: {
    homepage: ['WebSite', 'Organization'],
    article: ['Article', 'BlogPosting'],
    restaurant: ['Restaurant', 'LocalBusiness'],
    attraction: ['TouristAttraction', 'Place'],
    event: ['Event'],
    product: ['Product', 'Offer'],
  },

  // Internal linking strategy
  internalLinking: {
    minLinksPerArticle: 3,
    maxLinksPerArticle: 8,
    priorityPages: [
      '/restaurants',
      '/attractions',
      '/shopping',
      '/guides/first-time-london',
    ],
  },
};

// Automation Settings
export const automationConfig = {
  // Content generation schedule
  schedule: {
    contentGeneration: '0 8 * * *', // 8 AM daily
    socialPosting: '0 10,14,18 * * *', // 10 AM, 2 PM, 6 PM
    seoAudit: '0 2 * * 0', // 2 AM every Sunday
    analyticsSync: '0 3 * * *', // 3 AM daily
  },

  // AI generation settings
  aiGeneration: {
    provider: 'anthropic', // or 'openai'
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 4000,
    contentTypes: ['blog', 'social', 'newsletter'],
  },

  // Quality thresholds
  qualityThresholds: {
    minSeoScore: 70,
    minReadabilityScore: 60,
    maxKeywordDensity: 3,
    requiredImageAlt: true,
  },

  // Publishing rules
  publishing: {
    requireApproval: true,
    autoPublishAfterHours: 24,
    notifyOnPublish: true,
  },
};

// Social Media Configuration
export const socialConfig = {
  platforms: {
    instagram: {
      enabled: true,
      postTypes: ['image', 'carousel', 'reel'],
      hashtagStrategy: 'mixed', // branded + trending
      brandedHashtags: ['#YallaLondon', '#LondonForArabs', '#يلا_لندن'],
    },
    twitter: {
      enabled: true,
      postTypes: ['text', 'image', 'thread'],
      maxLength: 280,
    },
    facebook: {
      enabled: true,
      postTypes: ['text', 'image', 'link'],
    },
    tiktok: {
      enabled: false, // Future
      postTypes: ['video'],
    },
  },

  // Content adaptation for each platform
  contentAdaptation: {
    instagram: {
      imageSize: { width: 1080, height: 1080 },
      captionMaxLength: 2200,
      maxHashtags: 30,
    },
    twitter: {
      imageSize: { width: 1200, height: 675 },
      threadMaxParts: 10,
    },
    facebook: {
      imageSize: { width: 1200, height: 630 },
      captionMaxLength: 63206,
    },
  },
};

// Export all configs
export const contentStrategy = {
  categories: contentCategories,
  templates: contentTemplates,
  seo: seoConfig,
  automation: automationConfig,
  social: socialConfig,
};

export default contentStrategy;
