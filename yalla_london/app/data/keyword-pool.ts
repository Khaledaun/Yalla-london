/**
 * Keyword Pool for Yalla London Content Generation
 *
 * Top 50 Keywords and Long-Tail Search Terms for London Trip Planning
 * Includes both English and Arabic for bilingual content strategy
 *
 * Last Updated: 2026-01-06
 * Source: Travel search trends, London tourism keywords, Premier League ticket searches
 */

export interface KeywordEntry {
  id: string;
  keyword_en: string;
  keyword_ar: string;
  category: KeywordCategory;
  intent: SearchIntent;
  priority: 'high' | 'medium' | 'low';
  monthly_volume?: string;
  competition?: 'high' | 'medium' | 'low';
  content_suggestions?: string[];
  used_count: number;
  last_used?: Date;
}

export type KeywordCategory =
  | 'general_travel'
  | 'accommodation'
  | 'attractions'
  | 'premier_league'
  | 'shopping'
  | 'combined_experience';

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational';

// ============================================
// GENERAL LONDON TRAVEL KEYWORDS
// ============================================
export const generalTravelKeywords: KeywordEntry[] = [
  {
    id: 'kw-001',
    keyword_en: 'London trip',
    keyword_ar: 'رحلة لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '100,000+',
    competition: 'high',
    content_suggestions: ['Complete London trip planning guide', 'First-time visitor tips'],
    used_count: 0,
  },
  {
    id: 'kw-002',
    keyword_en: 'London vacation',
    keyword_ar: 'إجازة في لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-003',
    keyword_en: 'Visit London',
    keyword_ar: 'زيارة لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '100,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-004',
    keyword_en: 'London travel guide',
    keyword_ar: 'دليل السفر إلى لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '30,000+',
    competition: 'medium',
    content_suggestions: ['Comprehensive A-Z guide', 'Insider tips from locals'],
    used_count: 0,
  },
  {
    id: 'kw-005',
    keyword_en: 'London tourism',
    keyword_ar: 'السياحة في لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-006',
    keyword_en: 'Things to do in London',
    keyword_ar: 'أشياء تفعلها في لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '200,000+',
    competition: 'high',
    content_suggestions: ['Top 50 activities', 'Hidden gems', 'Free things to do'],
    used_count: 0,
  },
  {
    id: 'kw-007',
    keyword_en: 'Best time to visit London',
    keyword_ar: 'أفضل وقت لزيارة لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '20,000+',
    competition: 'medium',
    content_suggestions: ['Seasonal guide', 'Weather considerations', 'Event calendar'],
    used_count: 0,
  },
  {
    id: 'kw-008',
    keyword_en: 'London itinerary',
    keyword_ar: 'برنامج سياحي لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '30,000+',
    competition: 'medium',
    content_suggestions: ['3-day itinerary', '5-day itinerary', '7-day itinerary', 'Family itinerary'],
    used_count: 0,
  },
  {
    id: 'kw-009',
    keyword_en: 'London attractions',
    keyword_ar: 'معالم لندن السياحية',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '80,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-010',
    keyword_en: 'London sightseeing',
    keyword_ar: 'جولة سياحية في لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '40,000+',
    competition: 'medium',
    used_count: 0,
  },
];

// ============================================
// ACCOMMODATION & PLANNING KEYWORDS
// ============================================
export const accommodationKeywords: KeywordEntry[] = [
  {
    id: 'kw-011',
    keyword_en: 'London hotels',
    keyword_ar: 'فنادق لندن',
    category: 'accommodation',
    intent: 'commercial',
    priority: 'high',
    monthly_volume: '200,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-012',
    keyword_en: 'Cheap hotels in London',
    keyword_ar: 'فنادق رخيصة في لندن',
    category: 'accommodation',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-013',
    keyword_en: 'Best hotels near London Eye',
    keyword_ar: 'أفضل فنادق بالقرب من عين لندن',
    category: 'accommodation',
    intent: 'commercial',
    priority: 'medium',
    monthly_volume: '10,000+',
    competition: 'medium',
    content_suggestions: ['Hotel comparison by proximity', 'View room options'],
    used_count: 0,
  },
  {
    id: 'kw-014',
    keyword_en: 'London accommodation',
    keyword_ar: 'الإقامة في لندن',
    category: 'accommodation',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '30,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-015',
    keyword_en: 'London trip cost',
    keyword_ar: 'تكلفة رحلة لندن',
    category: 'accommodation',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '20,000+',
    competition: 'low',
    content_suggestions: ['Budget breakdown', 'Cost comparison by season'],
    used_count: 0,
  },
  {
    id: 'kw-016',
    keyword_en: 'Budget London trip',
    keyword_ar: 'رحلة لندن اقتصادية',
    category: 'accommodation',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '15,000+',
    competition: 'low',
    content_suggestions: ['Money-saving tips', 'Free attractions guide'],
    used_count: 0,
  },
  {
    id: 'kw-017',
    keyword_en: 'London vacation packages',
    keyword_ar: 'عروض سفر لندن',
    category: 'accommodation',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '25,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-018',
    keyword_en: 'London travel packages',
    keyword_ar: 'باقات السفر إلى لندن',
    category: 'accommodation',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '20,000+',
    competition: 'high',
    used_count: 0,
  },
];

// ============================================
// MAJOR ATTRACTIONS KEYWORDS
// ============================================
export const attractionsKeywords: KeywordEntry[] = [
  {
    id: 'kw-019',
    keyword_en: 'Tower of London tickets',
    keyword_ar: 'تذاكر برج لندن',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-020',
    keyword_en: 'London Eye tickets',
    keyword_ar: 'تذاكر عين لندن',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '80,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-021',
    keyword_en: 'Buckingham Palace tour',
    keyword_ar: 'جولة قصر باكنغهام',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '40,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-022',
    keyword_en: 'Westminster Abbey tickets',
    keyword_ar: 'تذاكر دير وستمنستر',
    category: 'attractions',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '30,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-023',
    keyword_en: 'Big Ben London',
    keyword_ar: 'ساعة بيج بن',
    category: 'attractions',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '100,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-024',
    keyword_en: 'Tower Bridge London',
    keyword_ar: 'برج الجسر لندن',
    category: 'attractions',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '60,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-025',
    keyword_en: 'British Museum London',
    keyword_ar: 'المتحف البريطاني',
    category: 'attractions',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '80,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-026',
    keyword_en: 'Madame Tussauds London',
    keyword_ar: 'متحف الشمع مدام توسو',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '60,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-027',
    keyword_en: 'Warner Bros Studio Tour London',
    keyword_ar: 'جولة استوديو وارنر براذرز',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '40,000+',
    competition: 'medium',
    content_suggestions: ['Booking tips', 'What to expect', 'Best time to visit'],
    used_count: 0,
  },
  {
    id: 'kw-028',
    keyword_en: 'Harry Potter tour London',
    keyword_ar: 'جولة هاري بوتر لندن',
    category: 'attractions',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'medium',
    content_suggestions: ['Complete Harry Potter guide', 'Film locations'],
    used_count: 0,
  },
];

// ============================================
// PREMIER LEAGUE & FOOTBALL KEYWORDS
// ============================================
export const premierLeagueKeywords: KeywordEntry[] = [
  {
    id: 'kw-029',
    keyword_en: 'Premier League tickets',
    keyword_ar: 'تذاكر الدوري الإنجليزي',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '100,000+',
    competition: 'high',
    content_suggestions: ['How to buy tickets guide', 'Price comparison'],
    used_count: 0,
  },
  {
    id: 'kw-030',
    keyword_en: 'Premier League tickets London',
    keyword_ar: 'تذاكر الدوري الإنجليزي في لندن',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '30,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-031',
    keyword_en: 'Arsenal tickets',
    keyword_ar: 'تذاكر أرسنال',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-032',
    keyword_en: 'Chelsea tickets',
    keyword_ar: 'تذاكر تشيلسي',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '50,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-033',
    keyword_en: 'Tottenham tickets',
    keyword_ar: 'تذاكر توتنهام',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '40,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-034',
    keyword_en: 'Arsenal vs Chelsea tickets',
    keyword_ar: 'تذاكر مباراة أرسنال وتشيلسي',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '20,000+',
    competition: 'medium',
    content_suggestions: ['Derby day guide', 'Best seats comparison'],
    used_count: 0,
  },
  {
    id: 'kw-035',
    keyword_en: 'Emirates Stadium tour',
    keyword_ar: 'جولة ملعب الإمارات',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '15,000+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-036',
    keyword_en: 'Stamford Bridge tour',
    keyword_ar: 'جولة ملعب ستامفورد بريدج',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '10,000+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-037',
    keyword_en: 'Buy Premier League tickets',
    keyword_ar: 'شراء تذاكر الدوري الإنجليزي',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '25,000+',
    competition: 'high',
    content_suggestions: ['Step-by-step buying guide', 'Best platforms'],
    used_count: 0,
  },
  {
    id: 'kw-038',
    keyword_en: 'Premier League match tickets',
    keyword_ar: 'تذاكر مباريات الدوري الإنجليزي',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '20,000+',
    competition: 'medium',
    used_count: 0,
  },
];

// ============================================
// SHOPPING & ENTERTAINMENT KEYWORDS
// ============================================
export const shoppingKeywords: KeywordEntry[] = [
  {
    id: 'kw-039',
    keyword_en: 'Oxford Street London',
    keyword_ar: 'شارع أكسفورد لندن',
    category: 'shopping',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '100,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-040',
    keyword_en: 'London shopping',
    keyword_ar: 'التسوق في لندن',
    category: 'shopping',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '80,000+',
    competition: 'high',
    content_suggestions: ['Complete shopping guide', 'Best areas by style'],
    used_count: 0,
  },
  {
    id: 'kw-041',
    keyword_en: 'Harrods London',
    keyword_ar: 'هارودز لندن',
    category: 'shopping',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '150,000+',
    competition: 'high',
    used_count: 0,
  },
  {
    id: 'kw-042',
    keyword_en: 'West End shows London',
    keyword_ar: 'عروض الويست إند',
    category: 'shopping',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '60,000+',
    competition: 'high',
    content_suggestions: ['Current shows guide', 'How to get cheap tickets'],
    used_count: 0,
  },
  {
    id: 'kw-043',
    keyword_en: 'Covent Garden',
    keyword_ar: 'كوفنت غاردن',
    category: 'shopping',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '80,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-044',
    keyword_en: 'Camden Market',
    keyword_ar: 'سوق كامدن',
    category: 'shopping',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '50,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-045',
    keyword_en: 'Borough Market London',
    keyword_ar: 'سوق بورو',
    category: 'shopping',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '40,000+',
    competition: 'medium',
    content_suggestions: ['Food guide', 'Best stalls'],
    used_count: 0,
  },
];

// ============================================
// COMBINED EXPERIENCE KEYWORDS (Long-tail)
// ============================================
export const combinedExperienceKeywords: KeywordEntry[] = [
  {
    id: 'kw-046',
    keyword_en: 'London trip with Premier League tickets',
    keyword_ar: 'رحلة لندن مع تذاكر الدوري الإنجليزي',
    category: 'combined_experience',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '5,000+',
    competition: 'low',
    content_suggestions: ['Complete package guide', 'Sample itineraries'],
    used_count: 0,
  },
  {
    id: 'kw-047',
    keyword_en: 'London football match packages',
    keyword_ar: 'باقات مباريات كرة القدم في لندن',
    category: 'combined_experience',
    intent: 'transactional',
    priority: 'high',
    monthly_volume: '3,000+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-048',
    keyword_en: 'London attractions and football tickets',
    keyword_ar: 'معالم لندن وتذاكر كرة القدم',
    category: 'combined_experience',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '2,000+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-049',
    keyword_en: 'London vacation with stadium tour',
    keyword_ar: 'إجازة لندن مع جولة الملعب',
    category: 'combined_experience',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '1,500+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-050',
    keyword_en: 'Best London trip itinerary with football',
    keyword_ar: 'أفضل برنامج رحلة لندن مع كرة القدم',
    category: 'combined_experience',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '2,500+',
    competition: 'low',
    content_suggestions: ['7-day football-focused itinerary', 'Match day planning'],
    used_count: 0,
  },
];

// ============================================
// ARABIC-SPECIFIC SEARCH TERMS
// ============================================
export const arabicSearchTerms = {
  // Essential Arabic Terms
  essential: [
    { en: 'tourism', ar: 'السياحة' },
    { en: 'travel', ar: 'السفر' },
    { en: 'trip/journey', ar: 'رحلة' },
    { en: 'booking', ar: 'حجز' },
    { en: 'ticket', ar: 'تذكرة' },
    { en: 'hotel', ar: 'فندق' },
    { en: 'tourist attractions', ar: 'معالم سياحية' },
    { en: 'Premier League', ar: 'الدوري الإنجليزي' },
  ],

  // Cultural Modifiers (critical for Arab market)
  culturalModifiers: [
    { en: 'family trip', ar: 'رحلة عائلية' },
    { en: 'halal', ar: 'حلال' },
    { en: 'prayer facilities', ar: 'مرافق صلاة' },
    { en: 'Arabic speaking', ar: 'يتحدث العربية' },
    { en: 'modest dress', ar: 'لباس محتشم' },
  ],

  // Popular Arabic Phrases
  popularPhrases: [
    { en: 'Complete tourist program', ar: 'برنامج سياحي شامل' },
    { en: 'London family trip', ar: 'رحلة لندن العائلية' },
    { en: 'Luxury hotels', ar: 'فنادق فاخرة' },
    { en: 'Tourist guide', ar: 'دليل سياحي' },
  ],
};

// ============================================
// SEASONAL KEYWORDS
// ============================================
export const seasonalKeywords = {
  spring: [
    { en: 'London in spring', ar: 'لندن في الربيع', peak_months: ['April', 'May'] },
    { en: 'Cherry blossoms London', ar: 'أزهار الكرز لندن', peak_months: ['April'] },
  ],
  summer: [
    { en: 'London summer activities', ar: 'أنشطة لندن الصيفية', peak_months: ['June', 'July', 'August'] },
    { en: 'London parks summer', ar: 'حدائق لندن صيفاً', peak_months: ['June', 'July'] },
  ],
  autumn: [
    { en: 'London autumn colors', ar: 'ألوان خريف لندن', peak_months: ['September', 'October'] },
    { en: 'Premier League season', ar: 'موسم الدوري الإنجليزي', peak_months: ['August', 'September', 'October'] },
  ],
  winter: [
    { en: 'London Christmas markets', ar: 'أسواق عيد الميلاد لندن', peak_months: ['November', 'December'] },
    { en: 'New Year Eve London', ar: 'ليلة رأس السنة لندن', peak_months: ['December'] },
    { en: 'Winter Wonderland London', ar: 'وينتر وندرلاند لندن', peak_months: ['November', 'December', 'January'] },
  ],
};

// ============================================
// EMERGING/TRENDING KEYWORDS (2025-2026)
// ============================================
export const emergingKeywords: KeywordEntry[] = [
  {
    id: 'kw-emerging-001',
    keyword_en: 'Sustainable travel London',
    keyword_ar: 'السياحة المستدامة لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '5,000+',
    competition: 'low',
    used_count: 0,
  },
  {
    id: 'kw-emerging-002',
    keyword_en: 'London off the beaten path',
    keyword_ar: 'لندن خارج المسار السياحي',
    category: 'general_travel',
    intent: 'informational',
    priority: 'medium',
    monthly_volume: '8,000+',
    competition: 'low',
    content_suggestions: ['Hidden gems guide', 'Local secrets'],
    used_count: 0,
  },
  {
    id: 'kw-emerging-003',
    keyword_en: 'Best photo spots London',
    keyword_ar: 'أفضل أماكن التصوير لندن',
    category: 'general_travel',
    intent: 'informational',
    priority: 'high',
    monthly_volume: '15,000+',
    competition: 'medium',
    content_suggestions: ['Instagram spots', 'Sunrise/sunset locations'],
    used_count: 0,
  },
  {
    id: 'kw-emerging-004',
    keyword_en: 'London food tour',
    keyword_ar: 'جولة طعام لندن',
    category: 'general_travel',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '10,000+',
    competition: 'medium',
    used_count: 0,
  },
  {
    id: 'kw-emerging-005',
    keyword_en: "Women's Premier League tickets",
    keyword_ar: 'تذاكر دوري السيدات',
    category: 'premier_league',
    intent: 'transactional',
    priority: 'medium',
    monthly_volume: '5,000+',
    competition: 'low',
    used_count: 0,
  },
];

// ============================================
// EXPORT ALL KEYWORDS
// ============================================
export const allKeywords: KeywordEntry[] = [
  ...generalTravelKeywords,
  ...accommodationKeywords,
  ...attractionsKeywords,
  ...premierLeagueKeywords,
  ...shoppingKeywords,
  ...combinedExperienceKeywords,
  ...emergingKeywords,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get keywords by category
 */
export function getKeywordsByCategory(category: KeywordCategory): KeywordEntry[] {
  return allKeywords.filter(kw => kw.category === category);
}

/**
 * Get keywords by priority
 */
export function getKeywordsByPriority(priority: 'high' | 'medium' | 'low'): KeywordEntry[] {
  return allKeywords.filter(kw => kw.priority === priority);
}

/**
 * Get keywords by search intent
 */
export function getKeywordsByIntent(intent: SearchIntent): KeywordEntry[] {
  return allKeywords.filter(kw => kw.intent === intent);
}

/**
 * Get unused keywords (for content generation)
 */
export function getUnusedKeywords(): KeywordEntry[] {
  return allKeywords.filter(kw => kw.used_count === 0);
}

/**
 * Get high-priority transactional keywords (best for conversion)
 */
export function getHighConversionKeywords(): KeywordEntry[] {
  return allKeywords.filter(
    kw => kw.priority === 'high' &&
    (kw.intent === 'transactional' || kw.intent === 'commercial')
  );
}

/**
 * Get low-competition keywords (easier to rank)
 */
export function getLowCompetitionKeywords(): KeywordEntry[] {
  return allKeywords.filter(kw => kw.competition === 'low');
}

/**
 * Search keywords by term
 */
export function searchKeywords(term: string): KeywordEntry[] {
  const lowerTerm = term.toLowerCase();
  return allKeywords.filter(
    kw =>
      kw.keyword_en.toLowerCase().includes(lowerTerm) ||
      kw.keyword_ar.includes(term)
  );
}

// ============================================
// METADATA
// ============================================
export const keywordPoolMetadata = {
  totalKeywords: allKeywords.length,
  lastUpdated: new Date('2026-01-06'),
  categories: ['general_travel', 'accommodation', 'attractions', 'premier_league', 'shopping', 'combined_experience'],
  primaryMarkets: ['UAE', 'Saudi Arabia', 'Kuwait', 'Egypt', 'Qatar', 'Bahrain'],
  languages: ['en', 'ar'],
  sourcesCount: 152,
  notes: [
    'London ranks as most searched travel destination globally',
    'Arabic market prefers pre-packaged itineraries',
    'Premier League searches surge August-May',
    'Halal and family-friendly are critical modifiers for Arab audience',
    'Combined experience keywords have lowest competition',
  ],
};

export default {
  allKeywords,
  generalTravelKeywords,
  accommodationKeywords,
  attractionsKeywords,
  premierLeagueKeywords,
  shoppingKeywords,
  combinedExperienceKeywords,
  emergingKeywords,
  arabicSearchTerms,
  seasonalKeywords,
  keywordPoolMetadata,
  // Utility functions
  getKeywordsByCategory,
  getKeywordsByPriority,
  getKeywordsByIntent,
  getUnusedKeywords,
  getHighConversionKeywords,
  getLowCompetitionKeywords,
  searchKeywords,
};
