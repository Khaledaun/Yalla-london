import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDefaultSiteId } from '@/config/sites';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Seed data -- returned when the database has no published news items so the
// carousel has content from day one.
// ---------------------------------------------------------------------------

// Seed data — shown ONLY when the DB has zero published news. These are
// evergreen tips that never go stale (no dates, no "this weekend" phrasing).
// The london-news cron is responsible for creating fresh, timely news items.
const SEED_NEWS = [
  {
    id: 'seed-elizabeth-line',
    slug: 'elizabeth-line-travel-guide',
    headline_en: 'Elizabeth Line: The Fastest Way Across London for Visitors',
    headline_ar: 'خط إليزابيث: أسرع طريقة للتنقل عبر لندن للزوار',
    summary_en:
      'The Elizabeth Line connects Heathrow Airport to central London in under 30 minutes, making it the best option for visitors arriving by air. It stops at Paddington, Bond Street, Tottenham Court Road, Liverpool Street, and Canary Wharf — covering most major tourist and shopping areas.',
    summary_ar:
      'يربط خط إليزابيث مطار هيثرو بوسط لندن في أقل من 30 دقيقة، مما يجعله الخيار الأفضل للزوار القادمين جواً. يتوقف في بادينغتون وبوند ستريت وتوتنهام كورت رود وليفربول ستريت وكناري وارف.',
    announcement_en: 'Elizabeth Line travel guide',
    announcement_ar: 'دليل السفر بخط إليزابيث',
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
    meta_title_en: 'Elizabeth Line Travel Guide for Visitors | Yalla London',
    meta_title_ar: 'دليل السفر بخط إليزابيث للزوار | يلا لندن',
    meta_description_en:
      'The Elizabeth Line connects Heathrow to central London in under 30 minutes. Everything visitors need to know.',
    meta_description_ar:
      'يربط خط إليزابيث مطار هيثرو بوسط لندن في أقل من 30 دقيقة. كل ما يحتاج الزوار معرفته.',
    tags: ['transport', 'elizabeth-line', 'tfl', 'heathrow'],
    keywords: ['elizabeth line', 'tfl', 'london transport', 'heathrow to central london'],
    related_article_slugs: [],
    related_shop_slugs: [],
    published_at: new Date().toISOString(),
  },
  {
    id: 'seed-seasonal-events',
    slug: 'london-events-whats-on',
    headline_en: 'What\'s On in London: Events, Exhibitions & Experiences',
    headline_ar: 'ما الجديد في لندن: فعاليات ومعارض وتجارب',
    summary_en:
      'London hosts thousands of events year-round — from world-class exhibitions at the V&A and Natural History Museum to food markets at Borough and Broadway. Check Visit London and Time Out for the latest listings during your trip.',
    summary_ar:
      'تستضيف لندن آلاف الفعاليات على مدار العام — من المعارض العالمية في متحف فيكتوريا وألبرت ومتحف التاريخ الطبيعي إلى أسواق الطعام في بورو وبرودواي. تحقق من Visit London و Time Out لأحدث القوائم خلال رحلتك.',
    announcement_en: 'London events guide',
    announcement_ar: 'دليل فعاليات لندن',
    source_name: 'Visit London',
    source_url: 'https://www.visitlondon.com/things-to-do/whats-on',
    source_logo: null,
    featured_image: null,
    image_alt_en: 'Crowds at a London cultural event',
    image_alt_ar: 'جمهور في فعالية ثقافية في لندن',
    image_credit: null,
    news_category: 'events',
    relevance_score: 75,
    is_major: false,
    urgency: 'normal',
    event_start_date: null,
    event_end_date: null,
    meta_title_en: 'What\'s On in London | Events & Experiences | Yalla London',
    meta_title_ar: 'ما الجديد في لندن | فعاليات وتجارب | يلا لندن',
    meta_description_en:
      'Discover the best events, exhibitions and experiences in London year-round. Museums, food markets, theatre and more.',
    meta_description_ar:
      'اكتشف أفضل الفعاليات والمعارض والتجارب في لندن على مدار العام. متاحف وأسواق طعام ومسارح والمزيد.',
    tags: ['events', 'exhibitions', 'things-to-do', 'culture'],
    keywords: ['london events', 'whats on london', 'london exhibitions', 'things to do in london'],
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
    source_url: 'https://www.yalla-london.com',
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

  const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

  // Try database first, gracefully fall back to seed data
  try {
    const now = new Date();
    const where: Record<string, unknown> = {
      siteId,
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
  } catch (dbErr) {
    console.warn("[news-api] Database unavailable, falling through to seed data:", dbErr instanceof Error ? dbErr.message : dbErr);
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
