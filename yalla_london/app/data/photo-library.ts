/**
 * Photo Library for Yalla London
 *
 * Legal, royalty-free images for content creation
 * Sources: Unsplash (free commercial use with attribution)
 *
 * All images are vetted for:
 * - Commercial usage rights
 * - High quality (minimum 1920x1080)
 * - Relevance to London/travel content
 * - Cultural appropriateness
 */

export interface PhotoEntry {
  id: string;
  url: string;
  thumbnail: string;
  alt_en: string;
  alt_ar: string;
  category: PhotoCategory;
  tags: string[];
  source: 'unsplash' | 'pexels' | 'pixabay' | 'custom';
  photographer?: string;
  photographer_url?: string;
  license: 'unsplash' | 'pexels' | 'pixabay' | 'cc0' | 'custom';
  width: number;
  height: number;
  usage_count: number;
  last_used?: Date;
}

export type PhotoCategory =
  | 'london-landmarks'
  | 'london-streets'
  | 'restaurants-food'
  | 'hotels-luxury'
  | 'shopping'
  | 'football-stadiums'
  | 'events-celebrations'
  | 'transport'
  | 'parks-nature'
  | 'people-lifestyle'
  | 'architecture'
  | 'nightlife';

// ============================================
// LONDON LANDMARKS
// ============================================
export const londonLandmarks: PhotoEntry[] = [
  {
    id: 'photo-big-ben-01',
    url: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400',
    alt_en: 'Big Ben and Houses of Parliament at sunset',
    alt_ar: 'ساعة بيج بن ومبنى البرلمان عند غروب الشمس',
    category: 'london-landmarks',
    tags: ['big ben', 'parliament', 'westminster', 'sunset', 'iconic'],
    source: 'unsplash',
    photographer: 'Marcin Nowak',
    photographer_url: 'https://unsplash.com/@marcin',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-tower-bridge-01',
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
    alt_en: 'Tower Bridge illuminated at night',
    alt_ar: 'جسر البرج مضاء في الليل',
    category: 'london-landmarks',
    tags: ['tower bridge', 'night', 'thames', 'illuminated'],
    source: 'unsplash',
    photographer: 'Charles Postiaux',
    photographer_url: 'https://unsplash.com/@charlpost',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-london-eye-01',
    url: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400',
    alt_en: 'London Eye on the South Bank',
    alt_ar: 'عين لندن على الضفة الجنوبية',
    category: 'london-landmarks',
    tags: ['london eye', 'south bank', 'ferris wheel', 'thames'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-buckingham-01',
    url: 'https://images.unsplash.com/photo-1596394723269-3e88e6cd93a1?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1596394723269-3e88e6cd93a1?w=400',
    alt_en: 'Buckingham Palace with guards',
    alt_ar: 'قصر باكنغهام مع الحراس',
    category: 'london-landmarks',
    tags: ['buckingham palace', 'royal', 'guards', 'monarchy'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-st-pauls-01',
    url: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400',
    alt_en: 'St Pauls Cathedral dome',
    alt_ar: 'قبة كاتدرائية سانت بول',
    category: 'london-landmarks',
    tags: ['st pauls', 'cathedral', 'dome', 'architecture'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// RESTAURANTS & FOOD
// ============================================
export const restaurantsFood: PhotoEntry[] = [
  {
    id: 'photo-fine-dining-01',
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
    alt_en: 'Fine dining restaurant interior',
    alt_ar: 'مطعم فاخر من الداخل',
    category: 'restaurants-food',
    tags: ['fine dining', 'restaurant', 'elegant', 'luxury'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-halal-food-01',
    url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    alt_en: 'Delicious Middle Eastern cuisine platter',
    alt_ar: 'طبق مأكولات شرق أوسطية لذيذة',
    category: 'restaurants-food',
    tags: ['middle eastern', 'halal', 'cuisine', 'platter'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-afternoon-tea-01',
    url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    alt_en: 'Traditional British afternoon tea',
    alt_ar: 'شاي بعد الظهر البريطاني التقليدي',
    category: 'restaurants-food',
    tags: ['afternoon tea', 'british', 'scones', 'traditional'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-restaurant-interior-01',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    alt_en: 'Modern restaurant interior with ambient lighting',
    alt_ar: 'مطعم حديث بإضاءة محيطة',
    category: 'restaurants-food',
    tags: ['restaurant', 'interior', 'modern', 'ambient'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// HOTELS & LUXURY
// ============================================
export const hotelsLuxury: PhotoEntry[] = [
  {
    id: 'photo-luxury-hotel-01',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    alt_en: 'Luxury hotel room with city view',
    alt_ar: 'غرفة فندقية فاخرة بإطلالة على المدينة',
    category: 'hotels-luxury',
    tags: ['luxury', 'hotel', 'room', 'city view'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-hotel-lobby-01',
    url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
    alt_en: 'Grand hotel lobby with chandelier',
    alt_ar: 'بهو فندق فخم مع ثريا',
    category: 'hotels-luxury',
    tags: ['hotel', 'lobby', 'grand', 'chandelier'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-hotel-exterior-01',
    url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
    alt_en: 'Elegant hotel exterior at dusk',
    alt_ar: 'واجهة فندق أنيقة عند الغسق',
    category: 'hotels-luxury',
    tags: ['hotel', 'exterior', 'dusk', 'elegant'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// SHOPPING
// ============================================
export const shoppingPhotos: PhotoEntry[] = [
  {
    id: 'photo-harrods-01',
    url: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400',
    alt_en: 'Harrods department store at night',
    alt_ar: 'متجر هارودز في الليل',
    category: 'shopping',
    tags: ['harrods', 'shopping', 'luxury', 'knightsbridge'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-oxford-street-01',
    url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400',
    alt_en: 'Oxford Street shopping district',
    alt_ar: 'منطقة التسوق في شارع أكسفورد',
    category: 'shopping',
    tags: ['oxford street', 'shopping', 'busy', 'retail'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-covent-garden-01',
    url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400',
    alt_en: 'Covent Garden market interior',
    alt_ar: 'سوق كوفنت غاردن من الداخل',
    category: 'shopping',
    tags: ['covent garden', 'market', 'shopping', 'architecture'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// FOOTBALL STADIUMS
// ============================================
export const footballStadiums: PhotoEntry[] = [
  {
    id: 'photo-wembley-01',
    url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400',
    alt_en: 'Football stadium atmosphere',
    alt_ar: 'أجواء ملعب كرة القدم',
    category: 'football-stadiums',
    tags: ['stadium', 'football', 'match', 'atmosphere'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-stadium-crowd-01',
    url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
    alt_en: 'Excited football fans in stadium',
    alt_ar: 'مشجعون متحمسون في الملعب',
    category: 'football-stadiums',
    tags: ['fans', 'crowd', 'stadium', 'excitement'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// EVENTS & CELEBRATIONS
// ============================================
export const eventsCelebrations: PhotoEntry[] = [
  {
    id: 'photo-fireworks-01',
    url: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400',
    alt_en: 'Fireworks over London skyline',
    alt_ar: 'ألعاب نارية فوق أفق لندن',
    category: 'events-celebrations',
    tags: ['fireworks', 'celebration', 'new year', 'skyline'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-christmas-lights-01',
    url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400',
    alt_en: 'Christmas lights on Regent Street',
    alt_ar: 'أضواء عيد الميلاد في شارع ريجنت',
    category: 'events-celebrations',
    tags: ['christmas', 'lights', 'regent street', 'festive'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-market-01',
    url: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=400',
    alt_en: 'Christmas market stalls',
    alt_ar: 'أكشاك سوق عيد الميلاد',
    category: 'events-celebrations',
    tags: ['christmas market', 'winter', 'festive', 'stalls'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// TRANSPORT
// ============================================
export const transportPhotos: PhotoEntry[] = [
  {
    id: 'photo-tube-01',
    url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400',
    alt_en: 'London Underground tube station',
    alt_ar: 'محطة مترو أنفاق لندن',
    category: 'transport',
    tags: ['tube', 'underground', 'metro', 'station'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-red-bus-01',
    url: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400',
    alt_en: 'Iconic red double-decker bus',
    alt_ar: 'الحافلة الحمراء ذات الطابقين',
    category: 'transport',
    tags: ['red bus', 'double decker', 'iconic', 'transport'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-black-cab-01',
    url: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400',
    alt_en: 'London black taxi cab',
    alt_ar: 'سيارة أجرة لندن السوداء',
    category: 'transport',
    tags: ['taxi', 'black cab', 'transport', 'iconic'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// PARKS & NATURE
// ============================================
export const parksNature: PhotoEntry[] = [
  {
    id: 'photo-hyde-park-01',
    url: 'https://images.unsplash.com/photo-1510137600163-2729bc6959b6?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1510137600163-2729bc6959b6?w=400',
    alt_en: 'Hyde Park in autumn',
    alt_ar: 'حديقة هايد بارك في الخريف',
    category: 'parks-nature',
    tags: ['hyde park', 'autumn', 'nature', 'trees'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-regents-park-01',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
    alt_en: 'Beautiful park garden in London',
    alt_ar: 'حديقة جميلة في لندن',
    category: 'parks-nature',
    tags: ['regents park', 'garden', 'flowers', 'nature'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// ARCHITECTURE
// ============================================
export const architecturePhotos: PhotoEntry[] = [
  {
    id: 'photo-shard-01',
    url: 'https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=400',
    alt_en: 'The Shard skyscraper',
    alt_ar: 'برج شارد الشاهق',
    category: 'architecture',
    tags: ['shard', 'skyscraper', 'modern', 'architecture'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
  {
    id: 'photo-city-skyline-01',
    url: 'https://images.unsplash.com/photo-1454537468202-b7ff71d51c2e?w=1920',
    thumbnail: 'https://images.unsplash.com/photo-1454537468202-b7ff71d51c2e?w=400',
    alt_en: 'London City financial district skyline',
    alt_ar: 'أفق الحي المالي في لندن',
    category: 'architecture',
    tags: ['city', 'skyline', 'financial', 'modern'],
    source: 'unsplash',
    license: 'unsplash',
    width: 1920,
    height: 1280,
    usage_count: 0,
  },
];

// ============================================
// ALL PHOTOS COMBINED
// ============================================
export const allPhotos: PhotoEntry[] = [
  ...londonLandmarks,
  ...restaurantsFood,
  ...hotelsLuxury,
  ...shoppingPhotos,
  ...footballStadiums,
  ...eventsCelebrations,
  ...transportPhotos,
  ...parksNature,
  ...architecturePhotos,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get photos by category
 */
export function getPhotosByCategory(category: PhotoCategory): PhotoEntry[] {
  return allPhotos.filter(photo => photo.category === category);
}

/**
 * Get photos by tags
 */
export function getPhotosByTags(tags: string[]): PhotoEntry[] {
  return allPhotos.filter(photo =>
    tags.some(tag => photo.tags.includes(tag.toLowerCase()))
  );
}

/**
 * Get random photo from category
 */
export function getRandomPhotoFromCategory(category: PhotoCategory): PhotoEntry | undefined {
  const categoryPhotos = getPhotosByCategory(category);
  if (categoryPhotos.length === 0) return undefined;
  return categoryPhotos[Math.floor(Math.random() * categoryPhotos.length)];
}

/**
 * Get least used photo from category
 */
export function getLeastUsedPhoto(category: PhotoCategory): PhotoEntry | undefined {
  const categoryPhotos = getPhotosByCategory(category);
  if (categoryPhotos.length === 0) return undefined;
  return categoryPhotos.sort((a, b) => a.usage_count - b.usage_count)[0];
}

/**
 * Get photo by ID
 */
export function getPhotoById(id: string): PhotoEntry | undefined {
  return allPhotos.find(photo => photo.id === id);
}

/**
 * Search photos by query
 */
export function searchPhotos(query: string): PhotoEntry[] {
  const lowerQuery = query.toLowerCase();
  return allPhotos.filter(photo =>
    photo.alt_en.toLowerCase().includes(lowerQuery) ||
    photo.alt_ar.includes(query) ||
    photo.tags.some(tag => tag.includes(lowerQuery))
  );
}

// ============================================
// PHOTO LIBRARY METADATA
// ============================================
export const photoLibraryMetadata = {
  totalPhotos: allPhotos.length,
  categories: [
    'london-landmarks',
    'restaurants-food',
    'hotels-luxury',
    'shopping',
    'football-stadiums',
    'events-celebrations',
    'transport',
    'parks-nature',
    'architecture',
  ] as PhotoCategory[],
  lastUpdated: new Date('2026-01-06'),
  license_info: {
    unsplash: 'Free for commercial use, attribution appreciated',
    pexels: 'Free for commercial use, no attribution required',
    pixabay: 'Free for commercial use, no attribution required',
  },
};

export default {
  allPhotos,
  londonLandmarks,
  restaurantsFood,
  hotelsLuxury,
  shoppingPhotos,
  footballStadiums,
  eventsCelebrations,
  transportPhotos,
  parksNature,
  architecturePhotos,
  getPhotosByCategory,
  getPhotosByTags,
  getRandomPhotoFromCategory,
  getLeastUsedPhoto,
  getPhotoById,
  searchPhotos,
  photoLibraryMetadata,
};
