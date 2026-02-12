import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Seed data -- returned when the database has no published news items so the
// carousel has content from day one.
// ---------------------------------------------------------------------------

const SEED_NEWS = [
  {
    id: 'seed-elizabeth-line',
    slug: 'elizabeth-line-weekend-service-update',
    headline_en: 'Elizabeth Line: Weekend Service Changes This Month',
    headline_ar: 'خط إليزابيث: تغييرات في خدمة نهاية الأسبوع هذا الشهر',
    summary_en:
      'Transport for London has announced planned engineering works on the Elizabeth Line affecting weekend services. Travelers should check TfL Journey Planner before heading out, as replacement bus services will operate between select stations on Saturday and Sunday.',
    summary_ar:
      'أعلنت هيئة النقل في لندن عن أعمال هندسية مخططة على خط إليزابيث تؤثر على خدمات نهاية الأسبوع. يُنصح المسافرون بمراجعة مخطط رحلات TfL قبل الانطلاق، حيث ستعمل خدمات الحافلات البديلة بين محطات مختارة يومي السبت والأحد.',
    announcement_en: 'Elizabeth Line weekend works',
    announcement_ar: 'أعمال نهاية الأسبوع لخط إليزابيث',
    source_name: 'Transport for London',
    source_url: 'https://tfl.gov.uk/modes/elizabeth-line/',
    source_logo: null,
    featured_image: null,
    image_alt_en: 'Elizabeth Line train at Paddington station',
    image_alt_ar: 'قطار خط إليزابيث في محطة بادينغتون',
    image_credit: null,
    news_category: 'transport',
    relevance_score: 85,
    is_major: true,
    urgency: 'normal',
    event_start_date: null,
    event_end_date: null,
    meta_title_en: 'Elizabeth Line Weekend Service Changes | Yalla London',
    meta_title_ar: 'تغييرات خدمة خط إليزابيث في نهاية الأسبوع | يلا لندن',
    meta_description_en:
      'Plan ahead for Elizabeth Line weekend engineering works with replacement bus services between select stations.',
    meta_description_ar:
      'خطط مسبقًا لأعمال الهندسة في عطلة نهاية الأسبوع على خط إليزابيث مع خدمات الحافلات البديلة بين محطات مختارة.',
    tags: ['transport', 'elizabeth-line', 'tfl', 'weekend'],
    keywords: ['elizabeth line', 'tfl', 'london transport', 'weekend service'],
    related_article_slugs: [],
    related_shop_slugs: [],
    published_at: new Date().toISOString(),
  },
  {
    id: 'seed-seasonal-events',
    slug: 'london-seasonal-events-roundup',
    headline_en: 'Top Seasonal Events Happening Across London This Month',
    headline_ar: 'أبرز الفعاليات الموسمية في لندن هذا الشهر',
    summary_en:
      'From food festivals in Borough Market to open-air cinema nights in Hyde Park, London is packed with seasonal events. Whether you are visiting for the first time or a seasoned Londoner, there is something for everyone this month.',
    summary_ar:
      'من مهرجانات الطعام في سوق بورو إلى ليالي السينما في الهواء الطلق في هايد بارك، لندن مليئة بالفعاليات الموسمية. سواء كنت تزور لأول مرة أو من سكان لندن المخضرمين، هناك شيء للجميع هذا الشهر.',
    announcement_en: 'Seasonal events roundup',
    announcement_ar: 'ملخص الفعاليات الموسمية',
    source_name: 'Visit London',
    source_url: 'https://www.visitlondon.com/things-to-do/whats-on',
    source_logo: null,
    featured_image: null,
    image_alt_en: 'Outdoor festival in a London park',
    image_alt_ar: 'مهرجان في الهواء الطلق في حديقة لندنية',
    image_credit: null,
    news_category: 'events',
    relevance_score: 75,
    is_major: false,
    urgency: 'normal',
    event_start_date: null,
    event_end_date: null,
    meta_title_en: 'London Seasonal Events This Month | Yalla London',
    meta_title_ar: 'فعاليات لندن الموسمية هذا الشهر | يلا لندن',
    meta_description_en:
      'Discover the best seasonal events across London including food festivals, open-air cinema, and more.',
    meta_description_ar:
      'اكتشف أفضل الفعاليات الموسمية في لندن بما في ذلك مهرجانات الطعام والسينما في الهواء الطلق والمزيد.',
    tags: ['events', 'seasonal', 'festivals', 'things-to-do'],
    keywords: ['london events', 'seasonal events', 'london festivals', 'things to do in london'],
    related_article_slugs: [],
    related_shop_slugs: [],
    published_at: new Date().toISOString(),
  },
  {
    id: 'seed-travel-tip',
    slug: 'london-oyster-vs-contactless-travel-tip',
    headline_en: 'Oyster Card vs Contactless: Which Is Best for London Visitors?',
    headline_ar: 'بطاقة أويستر مقابل الدفع اللاتلامسي: أيهما أفضل لزوار لندن؟',
    summary_en:
      'Navigating London\'s public transport can be confusing for first-time visitors. We break down the differences between Oyster cards and contactless bank cards, including daily fare caps, Visitor Oyster discounts, and which option saves you the most money.',
    summary_ar:
      'قد يكون التنقل في وسائل النقل العام في لندن مربكًا للزوار لأول مرة. نستعرض الفروقات بين بطاقات أويستر وبطاقات الدفع اللاتلامسية، بما في ذلك الحدود القصوى للأسعار اليومية وخصومات أويستر للزوار والخيار الذي يوفر لك أكبر قدر من المال.',
    announcement_en: 'Oyster vs Contactless guide',
    announcement_ar: 'دليل أويستر مقابل اللاتلامسي',
    source_name: 'Yalla London',
    source_url: 'https://yalla.london',
    source_logo: null,
    featured_image: null,
    image_alt_en: 'Oyster card being tapped on a London bus reader',
    image_alt_ar: 'بطاقة أويستر يتم تمريرها على قارئ حافلات لندن',
    image_credit: null,
    news_category: 'general',
    relevance_score: 90,
    is_major: false,
    urgency: 'low',
    event_start_date: null,
    event_end_date: null,
    meta_title_en: 'Oyster Card vs Contactless Payment in London | Yalla London',
    meta_title_ar: 'بطاقة أويستر مقابل الدفع اللاتلامسي في لندن | يلا لندن',
    meta_description_en:
      'Compare Oyster cards and contactless payments for London transport. Find out which option gives you the best value.',
    meta_description_ar:
      'قارن بين بطاقات أويستر والدفع اللاتلامسي لوسائل النقل في لندن. اكتشف الخيار الذي يمنحك أفضل قيمة.',
    tags: ['transport', 'travel-tips', 'oyster', 'contactless'],
    keywords: ['oyster card', 'contactless london', 'london travel tips', 'tfl fares'],
    related_article_slugs: [],
    related_shop_slugs: [],
    published_at: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Public GET handler
// ---------------------------------------------------------------------------

// Helper: filter seed data by query params
function filterSeedData(
  category: string | undefined,
  majorOnly: boolean,
  limit: number,
) {
  return SEED_NEWS
    .filter((item) => {
      if (category && item.news_category !== category) return false;
      if (majorOnly && !item.is_major) return false;
      return true;
    })
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const rawLimit = parseInt(searchParams.get('limit') || '3', 10);
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 3 : rawLimit), 10);
  const category = searchParams.get('category') || undefined;
  const majorOnly = searchParams.get('major_only') === 'true';

  // Try database first, gracefully fall back to seed data
  try {
    const now = new Date();
    const where: Record<string, unknown> = {
      status: 'published',
      OR: [
        { expires_at: null },
        { expires_at: { gt: now } },
      ],
    };

    if (category) {
      where.news_category = category;
    }

    if (majorOnly) {
      where.is_major = true;
    }

    const select = {
      id: true,
      slug: true,
      headline_en: true,
      headline_ar: true,
      summary_en: true,
      summary_ar: true,
      announcement_en: true,
      announcement_ar: true,
      source_name: true,
      source_url: true,
      source_logo: true,
      featured_image: true,
      image_alt_en: true,
      image_alt_ar: true,
      image_credit: true,
      news_category: true,
      relevance_score: true,
      is_major: true,
      urgency: true,
      event_start_date: true,
      event_end_date: true,
      meta_title_en: true,
      meta_title_ar: true,
      meta_description_en: true,
      meta_description_ar: true,
      tags: true,
      keywords: true,
      related_article_slugs: true,
      related_shop_slugs: true,
      published_at: true,
    };

    const items = await prisma.newsItem.findMany({
      where,
      orderBy: [
        { is_major: 'desc' },
        { published_at: 'desc' },
      ],
      select,
      take: limit,
    });

    if (items.length > 0) {
      const total = await prisma.newsItem.count({ where }).catch(() => items.length);

      return NextResponse.json({
        success: true,
        data: items,
        meta: { total, limit, category: category ?? null, major_only: majorOnly, source: 'database' },
      });
    }
  } catch {
    // Database unavailable — fall through to seed data
  }

  // Seed data fallback (database empty or unavailable)
  const seedFiltered = filterSeedData(category, majorOnly, limit);
  return NextResponse.json({
    success: true,
    data: seedFiltered,
    meta: {
      total: seedFiltered.length,
      limit,
      category: category ?? null,
      major_only: majorOnly,
      source: 'seed',
    },
  });
}
