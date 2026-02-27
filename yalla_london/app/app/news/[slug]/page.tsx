import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/url-utils";
import { getSiteDomain, getSiteConfig, getDefaultSiteId } from "@/config/sites";
import { getRelatedArticles } from "@/lib/related-content";
import NewsDetailClient from "./NewsDetailClient";

// ISR: Revalidate news detail pages every hour for multi-site scale
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

// ---------------------------------------------------------------------------
// Seed data -- identical to the API route so we can resolve a slug during
// build / when the database is empty.
// ---------------------------------------------------------------------------

const SEED_NEWS = [
  {
    id: "seed-elizabeth-line",
    slug: "elizabeth-line-weekend-service-update",
    headline_en: "Elizabeth Line: Weekend Service Changes This Month",
    headline_ar:
      "خط إليزابيث: تغييرات في خدمة نهاية الأسبوع هذا الشهر",
    summary_en:
      "Transport for London has announced planned engineering works on the Elizabeth Line affecting weekend services. Travelers should check TfL Journey Planner before heading out, as replacement bus services will operate between select stations on Saturday and Sunday.",
    summary_ar:
      "أعلنت هيئة النقل في لندن عن أعمال هندسية مخططة على خط إليزابيث تؤثر على خدمات نهاية الأسبوع. يُنصح المسافرون بمراجعة مخطط رحلات TfL قبل الانطلاق، حيث ستعمل خدمات الحافلات البديلة بين محطات مختارة يومي السبت والأحد.",
    announcement_en: "Elizabeth Line weekend works",
    announcement_ar: "أعمال نهاية الأسبوع لخط إليزابيث",
    source_name: "Transport for London",
    source_url: "https://tfl.gov.uk/modes/elizabeth-line/",
    source_logo: null as string | null,
    featured_image: null as string | null,
    image_alt_en: "Elizabeth Line train at Paddington station",
    image_alt_ar: "قطار خط إليزابيث في محطة بادينغتون",
    image_credit: null as string | null,
    news_category: "transport",
    relevance_score: 85,
    is_major: true,
    urgency: "normal",
    event_start_date: null as string | null,
    event_end_date: null as string | null,
    meta_title_en: "Elizabeth Line Weekend Service Changes | Yalla London",
    meta_title_ar:
      "تغييرات خدمة خط إليزابيث في نهاية الأسبوع | يلا لندن",
    meta_description_en:
      "Plan ahead for Elizabeth Line weekend engineering works with replacement bus services between select stations.",
    meta_description_ar:
      "خطط مسبقًا لأعمال الهندسة في عطلة نهاية الأسبوع على خط إليزابيث مع خدمات الحافلات البديلة بين محطات مختارة.",
    tags: ["transport", "elizabeth-line", "tfl", "weekend"],
    keywords: ["elizabeth line", "tfl", "london transport", "weekend service"],
    related_article_slugs: [] as string[],
    related_shop_slugs: [] as string[],
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
    announcement_en: "Seasonal events roundup",
    announcement_ar: "ملخص الفعاليات الموسمية",
    source_name: "Visit London",
    source_url: "https://www.visitlondon.com/things-to-do/whats-on",
    source_logo: null as string | null,
    featured_image: null as string | null,
    image_alt_en: "Outdoor festival in a London park",
    image_alt_ar: "مهرجان في الهواء الطلق في حديقة لندنية",
    image_credit: null as string | null,
    news_category: "events",
    relevance_score: 75,
    is_major: false,
    urgency: "normal",
    event_start_date: null as string | null,
    event_end_date: null as string | null,
    meta_title_en: "London Seasonal Events This Month | Yalla London",
    meta_title_ar: "فعاليات لندن الموسمية هذا الشهر | يلا لندن",
    meta_description_en:
      "Discover the best seasonal events across London including food festivals, open-air cinema, and more.",
    meta_description_ar:
      "اكتشف أفضل الفعاليات الموسمية في لندن بما في ذلك مهرجانات الطعام والسينما في الهواء الطلق والمزيد.",
    tags: ["events", "seasonal", "festivals", "things-to-do"],
    keywords: [
      "london events",
      "seasonal events",
      "london festivals",
      "things to do in london",
    ],
    related_article_slugs: [] as string[],
    related_shop_slugs: [] as string[],
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
    announcement_en: "Oyster vs Contactless guide",
    announcement_ar: "دليل أويستر مقابل اللاتلامسي",
    source_name: "Yalla London",
    source_url: "https://yalla.london",
    source_logo: null as string | null,
    featured_image: null as string | null,
    image_alt_en: "Oyster card being tapped on a London bus reader",
    image_alt_ar: "بطاقة أويستر يتم تمريرها على قارئ حافلات لندن",
    image_credit: null as string | null,
    news_category: "general",
    relevance_score: 90,
    is_major: false,
    urgency: "low",
    event_start_date: null as string | null,
    event_end_date: null as string | null,
    meta_title_en:
      "Oyster Card vs Contactless Payment in London | Yalla London",
    meta_title_ar:
      "بطاقة أويستر مقابل الدفع اللاتلامسي في لندن | يلا لندن",
    meta_description_en:
      "Compare Oyster cards and contactless payments for London transport. Find out which option gives you the best value.",
    meta_description_ar:
      "قارن بين بطاقات أويستر والدفع اللاتلامسي لوسائل النقل في لندن. اكتشف الخيار الذي يمنحك أفضل قيمة.",
    tags: ["transport", "travel-tips", "oyster", "contactless"],
    keywords: [
      "oyster card",
      "contactless london",
      "london travel tips",
      "tfl fares",
    ],
    related_article_slugs: [] as string[],
    related_shop_slugs: [] as string[],
    published_at: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

type SeedItem = (typeof SEED_NEWS)[number];

/** Fetch a news item by slug from the database, falling back to seed data. */
async function getNewsItem(slug: string): Promise<SeedItem | null> {
  try {
    const headersList = await headers();
    const siteId = headersList.get("x-site-id") || getDefaultSiteId();
    const dbItem = await prisma.newsItem.findFirst({
      where: { slug, siteId },
      select: {
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
        status: true,
      },
    });

    if (dbItem && dbItem.status === "published") {
      return {
        id: dbItem.id,
        slug: dbItem.slug,
        headline_en: dbItem.headline_en,
        headline_ar: dbItem.headline_ar,
        summary_en: dbItem.summary_en,
        summary_ar: dbItem.summary_ar,
        announcement_en: dbItem.announcement_en,
        announcement_ar: dbItem.announcement_ar,
        source_name: dbItem.source_name,
        source_url: dbItem.source_url,
        source_logo: dbItem.source_logo,
        featured_image: dbItem.featured_image,
        image_alt_en: dbItem.image_alt_en,
        image_alt_ar: dbItem.image_alt_ar,
        image_credit: dbItem.image_credit,
        news_category: dbItem.news_category,
        relevance_score: dbItem.relevance_score,
        is_major: dbItem.is_major,
        urgency: dbItem.urgency,
        event_start_date: dbItem.event_start_date?.toISOString() ?? null,
        event_end_date: dbItem.event_end_date?.toISOString() ?? null,
        meta_title_en: dbItem.meta_title_en,
        meta_title_ar: dbItem.meta_title_ar,
        meta_description_en: dbItem.meta_description_en,
        meta_description_ar: dbItem.meta_description_ar,
        tags: dbItem.tags,
        keywords: dbItem.keywords,
        related_article_slugs: dbItem.related_article_slugs,
        related_shop_slugs: dbItem.related_shop_slugs,
        published_at: dbItem.published_at?.toISOString() ?? new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn("[news-detail] DB query failed, falling back to seed data:", err instanceof Error ? err.message : err);
  }

  // Fallback: check seed data
  const seedItem = SEED_NEWS.find((item) => item.slug === slug);
  return seedItem ?? null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";

  const item = await getNewsItem(slug);

  if (!item) {
    return {
      title: `News Not Found | ${siteName}`,
      description: "The news article you are looking for could not be found.",
    };
  }

  const canonicalUrl = `${baseUrl}/news/${slug}`;
  // Arabic SSR: serve locale-appropriate metadata for /ar/ routes
  const locale = headersList.get("x-locale") || "en";
  const title = locale === "ar"
    ? (item.meta_title_ar || `${item.headline_ar} | ${siteName}`)
    : (item.meta_title_en || `${item.headline_en} | ${siteName}`);
  const description = locale === "ar"
    ? (item.meta_description_ar || item.summary_ar.slice(0, 160))
    : (item.meta_description_en || item.summary_en.slice(0, 160));

  return {
    title,
    description,
    keywords: item.keywords.join(", "),
    authors: [{ name: `${siteName} Editorial` }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/news/${slug}`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "article",
      publishedTime: item.published_at,
      authors: [item.source_name],
      section: item.news_category,
      tags: item.tags,
      images: item.featured_image
        ? [
            {
              url: item.featured_image,
              width: 1200,
              height: 630,
              alt: item.headline_en,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: item.meta_title_en || item.headline_en,
      description,
      images: item.featured_image ? [item.featured_image] : [],
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
    other: {
      "article:published_time": item.published_at,
      "article:author": item.source_name,
      "article:section": item.news_category,
      "article:tag": item.tags.join(","),
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD Structured Data
// ---------------------------------------------------------------------------

function generateStructuredData(item: SeedItem, siteInfo: { siteName: string; siteSlug: string; baseUrl: string }) {
  const { siteName, siteSlug, baseUrl } = siteInfo;

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.headline_en,
    description: item.summary_en.slice(0, 200),
    image: item.featured_image || undefined,
    datePublished: item.published_at,
    author: {
      "@type": "Person",
      name: `${siteName} Editorial`,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/images/${siteSlug}-logo.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/news/${item.slug}`,
    },
    articleSection: item.news_category,
    keywords: item.keywords.join(", "),
    inLanguage: "en-GB",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "News",
        item: `${baseUrl}/news`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: item.headline_en,
        item: `${baseUrl}/news/${item.slug}`,
      },
    ],
  };

  return { newsArticleSchema, breadcrumbSchema };
}

// ---------------------------------------------------------------------------
// Related articles helper
// ---------------------------------------------------------------------------

async function resolveRelatedArticles(item: SeedItem) {
  const relatedSlugs = item.related_article_slugs ?? [];

  if (relatedSlugs.length > 0) {
    // For each slug in related_article_slugs, try to resolve as blog first,
    // then information. Build RelatedArticleData objects.
    const resolvedPromises = relatedSlugs.map(async (articleSlug) => {
      // Try blog
      const blogRelated = await getRelatedArticles(articleSlug, "blog", 1);
      if (blogRelated.length > 0) {
        return blogRelated[0];
      }
      // Try information
      const infoRelated = await getRelatedArticles(articleSlug, "information", 1);
      if (infoRelated.length > 0) {
        return infoRelated[0];
      }
      return null;
    });

    const resolved = (await Promise.all(resolvedPromises)).filter(Boolean);

    if (resolved.length > 0) {
      return resolved.slice(0, 3);
    }
  }

  // Fallback: use tag-based related articles from the blog/info content pool.
  // We create a synthetic lookup by using the first keyword as a slug hint.
  // Since we don't have a "news" type in the related-content utility, we
  // simply pick general related articles from blog + information.
  return getRelatedArticles(
    item.related_article_slugs[0] || item.slug,
    "blog",
    3,
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function NewsDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const item = await getNewsItem(slug);

  if (!item) {
    notFound();
  }

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const baseUrl = await getBaseUrl();

  const structuredData = generateStructuredData(item, { siteName, siteSlug, baseUrl });
  const relatedArticles = await resolveRelatedArticles(item);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.newsArticleSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.breadcrumbSchema),
        }}
      />

      <NewsDetailClient item={item} relatedArticles={relatedArticles} />
    </>
  );
}
