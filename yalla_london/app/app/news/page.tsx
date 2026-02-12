import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import NewsListClient from "./NewsListClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "London Today — News & Updates | Yalla London",
  description:
    "Stay up to date with the latest London news, transport updates, events, and travel tips curated for Arab visitors. Your daily briefing on what's happening in London.",
  keywords:
    "london news, london today, london transport updates, london events, arab visitors london, tfl updates, london travel tips",
  alternates: {
    canonical: "https://www.yalla-london.com/news",
    languages: {
      "en-GB": "https://www.yalla-london.com/news",
      "ar-SA": "https://www.yalla-london.com/ar/news",
    },
  },
  openGraph: {
    title: "London Today — News & Updates | Yalla London",
    description:
      "Stay up to date with the latest London news, transport updates, and events curated for Arab visitors.",
    url: "https://www.yalla-london.com/news",
    siteName: "Yalla London",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@yallalondon",
    title: "London Today | Yalla London",
    description:
      "Daily London news, transport updates, and events for Arab visitors",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// ---------------------------------------------------------------------------
// Seed data — same as the API route so the listing works without a database
// ---------------------------------------------------------------------------

const SEED_NEWS = [
  {
    id: "seed-elizabeth-line",
    slug: "elizabeth-line-weekend-service-update",
    headline_en: "Elizabeth Line: Weekend Service Changes This Month",
    headline_ar: "خط إليزابيث: تغييرات في خدمة نهاية الأسبوع هذا الشهر",
    summary_en:
      "Transport for London has announced planned engineering works on the Elizabeth Line affecting weekend services. Travelers should check TfL Journey Planner before heading out, as replacement bus services will operate between select stations on Saturday and Sunday.",
    summary_ar:
      "أعلنت هيئة النقل في لندن عن أعمال هندسية مخططة على خط إليزابيث تؤثر على خدمات نهاية الأسبوع. يُنصح المسافرون بمراجعة مخطط رحلات TfL قبل الانطلاق، حيث ستعمل خدمات الحافلات البديلة بين محطات مختارة يومي السبت والأحد.",
    source_name: "Transport for London",
    featured_image: null as string | null,
    news_category: "transport",
    is_major: true,
    urgency: "normal",
    tags: ["transport", "elizabeth-line", "tfl", "weekend"],
    published_at: new Date().toISOString(),
  },
  {
    id: "seed-seasonal-events",
    slug: "london-seasonal-events-roundup",
    headline_en: "Top Seasonal Events Happening Across London This Month",
    headline_ar: "أبرز الفعاليات الموسمية في لندن هذا الشهر",
    summary_en:
      "From food festivals in Borough Market to open-air cinema nights in Hyde Park, London is packed with seasonal events. Whether you are visiting for the first time or a seasoned Londoner, there is something for everyone this month.",
    summary_ar:
      "من مهرجانات الطعام في سوق بورو إلى ليالي السينما في الهواء الطلق في هايد بارك، لندن مليئة بالفعاليات الموسمية. سواء كنت تزور لأول مرة أو من سكان لندن المخضرمين، هناك شيء للجميع هذا الشهر.",
    source_name: "Visit London",
    featured_image: null as string | null,
    news_category: "events",
    is_major: false,
    urgency: "normal",
    tags: ["events", "seasonal", "festivals", "things-to-do"],
    published_at: new Date().toISOString(),
  },
  {
    id: "seed-travel-tip",
    slug: "london-oyster-vs-contactless-travel-tip",
    headline_en:
      "Oyster Card vs Contactless: Which Is Best for London Visitors?",
    headline_ar:
      "بطاقة أويستر مقابل الدفع اللاتلامسي: أيهما أفضل لزوار لندن؟",
    summary_en:
      "Navigating London's public transport can be confusing for first-time visitors. We break down the differences between Oyster cards and contactless bank cards, including daily fare caps, Visitor Oyster discounts, and which option saves you the most money.",
    summary_ar:
      "قد يكون التنقل في وسائل النقل العام في لندن مربكًا للزوار لأول مرة. نستعرض الفروقات بين بطاقات أويستر وبطاقات الدفع اللاتلامسية، بما في ذلك الحدود القصوى للأسعار اليومية وخصومات أويستر للزوار والخيار الذي يوفر لك أكبر قدر من المال.",
    source_name: "Yalla London",
    featured_image: null as string | null,
    news_category: "general",
    is_major: false,
    urgency: "low",
    tags: ["transport", "travel-tips", "oyster", "contactless"],
    published_at: new Date().toISOString(),
  },
];

type NewsItem = (typeof SEED_NEWS)[number];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getAllNews(): Promise<NewsItem[]> {
  try {
    const dbItems = await prisma.newsItem.findMany({
      where: {
        status: "published",
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: [{ is_major: "desc" }, { published_at: "desc" }],
      select: {
        id: true,
        slug: true,
        headline_en: true,
        headline_ar: true,
        summary_en: true,
        summary_ar: true,
        source_name: true,
        featured_image: true,
        news_category: true,
        is_major: true,
        urgency: true,
        tags: true,
        published_at: true,
      },
      take: 50,
    });

    if (dbItems.length > 0) {
      return dbItems.map((item) => ({
        id: item.id,
        slug: item.slug,
        headline_en: item.headline_en,
        headline_ar: item.headline_ar,
        summary_en: item.summary_en,
        summary_ar: item.summary_ar,
        source_name: item.source_name,
        featured_image: item.featured_image,
        news_category: item.news_category,
        is_major: item.is_major,
        urgency: item.urgency,
        tags: item.tags,
        published_at:
          item.published_at?.toISOString() ?? new Date().toISOString(),
      }));
    }
  } catch {
    // Database unavailable — fall through to seed data
  }

  return SEED_NEWS;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

function generateStructuredData(items: NewsItem[]) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "London Today — News & Updates",
    description:
      "Latest London news, transport updates, and events for Arab visitors",
    url: `${baseUrl}/news`,
    publisher: {
      "@type": "Organization",
      name: "Yalla London",
      url: baseUrl,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 10).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${baseUrl}/news/${item.slug}`,
        name: item.headline_en,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function NewsPage() {
  const items = await getAllNews();
  const structuredData = generateStructuredData(items);

  const serialized = items.map((item) => ({
    ...item,
    published_at:
      typeof item.published_at === "string"
        ? item.published_at
        : new Date().toISOString(),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <NewsListClient items={serialized} />
    </>
  );
}
