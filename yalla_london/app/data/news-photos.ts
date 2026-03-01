/**
 * News Category Photo Map
 *
 * Maps each news category to curated, high-quality Unsplash photos.
 * All images are legally free for commercial use under the Unsplash License.
 *
 * Usage: Import getCategoryPhoto() to get a deterministic photo for a news item
 * based on its category. Uses the item slug as a seed so the same article
 * always shows the same photo (no random flicker on re-renders).
 */

export interface NewsCategoryPhoto {
  url: string
  thumbnail: string
  alt_en: string
  alt_ar: string
  photographer?: string
  photographer_url?: string
}

/**
 * Curated Unsplash photos per news category.
 * Each category has 3-5 photos to add visual variety.
 * All photos are London-relevant and high-quality (landscape orientation).
 */
const NEWS_CATEGORY_PHOTOS: Record<string, NewsCategoryPhoto[]> = {
  transport: [
    {
      url: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=400&q=80',
      alt_en: 'Iconic red double-decker London bus',
      alt_ar: 'الحافلة الحمراء ذات الطابقين في لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=400&q=80',
      alt_en: 'London black taxi cab on the street',
      alt_ar: 'سيارة أجرة لندن السوداء في الشارع',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80',
      alt_en: 'London Underground station platform',
      alt_ar: 'رصيف محطة مترو أنفاق لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=400&q=80',
      alt_en: 'Train arriving at a London platform',
      alt_ar: 'قطار يصل إلى رصيف في لندن',
      photographer: 'Unsplash',
    },
  ],

  events: [
    {
      url: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&q=80',
      alt_en: 'Fireworks over the London skyline',
      alt_ar: 'ألعاب نارية فوق أفق لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80',
      alt_en: 'Crowd enjoying a live outdoor event',
      alt_ar: 'جمهور يستمتع بفعالية في الهواء الطلق',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80',
      alt_en: 'Concert stage with dramatic lighting',
      alt_ar: 'مسرح حفل موسيقي بإضاءة مذهلة',
      photographer: 'Unsplash',
    },
  ],

  weather: [
    {
      url: 'https://images.unsplash.com/photo-1500740516770-92bd004b996e?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1500740516770-92bd004b996e?w=400&q=80',
      alt_en: 'Dramatic cloudy sky over London',
      alt_ar: 'سماء غائمة مثيرة فوق لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80',
      alt_en: 'Rain on a city street with reflections',
      alt_ar: 'مطر على شارع مدينة مع انعكاسات',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1428592953211-077101b2021b?w=400&q=80',
      alt_en: 'Misty morning over the Thames',
      alt_ar: 'صباح ضبابي فوق نهر التايمز',
      photographer: 'Unsplash',
    },
  ],

  health: [
    {
      url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&q=80',
      alt_en: 'Medical stethoscope on blue background',
      alt_ar: 'سماعة طبية على خلفية زرقاء',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80',
      alt_en: 'Healthcare professional in modern setting',
      alt_ar: 'متخصص في الرعاية الصحية في بيئة حديثة',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&q=80',
      alt_en: 'Clean medical facility interior',
      alt_ar: 'منشأة طبية نظيفة من الداخل',
      photographer: 'Unsplash',
    },
  ],

  festivals: [
    {
      url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&q=80',
      alt_en: 'Christmas lights on Regent Street London',
      alt_ar: 'أضواء عيد الميلاد في شارع ريجنت لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=400&q=80',
      alt_en: 'Festive Christmas market stalls',
      alt_ar: 'أكشاك سوق عيد الميلاد الاحتفالية',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
      alt_en: 'Colorful festival crowd with lights',
      alt_ar: 'جمهور مهرجان ملون مع أضواء',
      photographer: 'Unsplash',
    },
  ],

  sales: [
    {
      url: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400&q=80',
      alt_en: 'Harrods department store at night',
      alt_ar: 'متجر هارودز في الليل',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80',
      alt_en: 'Oxford Street shopping district',
      alt_ar: 'منطقة التسوق في شارع أكسفورد',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=80',
      alt_en: 'Covent Garden market interior',
      alt_ar: 'سوق كوفنت غاردن من الداخل',
      photographer: 'Unsplash',
    },
  ],

  holidays: [
    {
      url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=400&q=80',
      alt_en: 'Airplane wing view above the clouds',
      alt_ar: 'منظر جناح الطائرة فوق السحب',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      alt_en: 'Luxury hotel room with city view',
      alt_ar: 'غرفة فندقية فاخرة بإطلالة على المدينة',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80',
      alt_en: 'Travel planning with map and passport',
      alt_ar: 'التخطيط للسفر مع خريطة وجواز سفر',
      photographer: 'Unsplash',
    },
  ],

  strikes: [
    {
      url: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&q=80',
      alt_en: 'Big Ben and Houses of Parliament',
      alt_ar: 'ساعة بيج بن ومبنى البرلمان',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80',
      alt_en: 'Tower Bridge illuminated at night',
      alt_ar: 'جسر البرج مضاء في الليل',
      photographer: 'Unsplash',
    },
  ],

  popup: [
    {
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
      alt_en: 'Fine dining restaurant interior',
      alt_ar: 'مطعم فاخر من الداخل',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
      alt_en: 'Modern restaurant with ambient lighting',
      alt_ar: 'مطعم حديث بإضاءة محيطة',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
      alt_en: 'Traditional British afternoon tea setting',
      alt_ar: 'إعداد شاي بعد الظهر البريطاني التقليدي',
      photographer: 'Unsplash',
    },
  ],

  general: [
    {
      url: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400&q=80',
      alt_en: 'St Pauls Cathedral dome in London',
      alt_ar: 'قبة كاتدرائية سانت بول في لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&q=80',
      alt_en: 'London Eye on the South Bank',
      alt_ar: 'عين لندن على الضفة الجنوبية',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1454537468202-b7ff71d51c2e?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1454537468202-b7ff71d51c2e?w=400&q=80',
      alt_en: 'London City financial district skyline',
      alt_ar: 'أفق الحي المالي في لندن',
      photographer: 'Unsplash',
    },
    {
      url: 'https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=800&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=400&q=80',
      alt_en: 'The Shard skyscraper in London',
      alt_ar: 'برج شارد الشاهق في لندن',
      photographer: 'Unsplash',
    },
  ],
}

/**
 * Get a deterministic photo for a news item based on its category and slug.
 * Uses a simple hash of the slug to pick consistently — same article always
 * shows the same photo, no random flicker between renders.
 *
 * If the news item already has a featured_image (e.g., from Envato or manual upload),
 * that takes priority and this function is not needed.
 */
export function getCategoryPhoto(
  category: string,
  slug: string
): NewsCategoryPhoto {
  const photos = NEWS_CATEGORY_PHOTOS[category] ?? NEWS_CATEGORY_PHOTOS.general
  // Simple hash: sum of char codes mod length
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash + slug.charCodeAt(i)) % photos.length
  }
  return photos[hash]
}

/**
 * Get all photos for a specific news category
 */
export function getAllCategoryPhotos(category: string): NewsCategoryPhoto[] {
  return NEWS_CATEGORY_PHOTOS[category] ?? NEWS_CATEGORY_PHOTOS.general
}

export default NEWS_CATEGORY_PHOTOS
