import { Metadata } from "next";
import { headers } from "next/headers";
import {
  informationSections,
  informationArticles as baseArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import InformationHubClient from "./InformationHubClient";

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// ISR: Revalidate information hub listing every hour for multi-site scale
export const revalidate = 3600;

// Dynamic metadata for SEO — resolves base URL and site identity from request context
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const destination = siteConfig?.destination || "London";
  const canonicalUrl = `${baseUrl}/information`;

  return {
    title: `${destination} Travel Guide | ${siteName} Info Hub`,
    description:
      `Plan your ${destination} trip with expert tips: halal dining, transport guides, neighbourhood walks, family activities, and practical advice for Arab visitors.`,
    keywords:
      `${destination.toLowerCase()} travel guide, arab visitors ${destination.toLowerCase()}, ${destination.toLowerCase()} information, halal ${destination.toLowerCase()} guide, ${destination.toLowerCase()} trip planner`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/information`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Information Hub | ${siteName} \u2013 Your Complete ${destination} Travel Guide`,
      description:
        `Plan your perfect ${destination} trip with our comprehensive travel guide for Arab visitors. Halal dining, family activities, transportation, and more.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
      images: [
        {
          url: `${baseUrl}/images/information-hub-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} Information Hub - Complete ${destination} Travel Guide`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Information Hub | ${siteName}`,
      description:
        `Your complete ${destination} travel guide for Arab visitors \u2013 everything you need to plan the perfect trip`,
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
}

// Generate structured data for the information hub
function generateStructuredData(siteInfo: { siteName: string; siteSlug: string; baseUrl: string; destination: string }) {
  const { siteName, siteSlug, baseUrl, destination } = siteInfo;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Information Hub - ${siteName}`,
    description:
      `Your complete ${destination} travel guide for Arab visitors. Plan your trip with halal dining guides, transportation tips, neighbourhood guides, and insider advice.`,
    url: `${baseUrl}/information`,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
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
    mainEntity: {
      "@type": "CollectionPage",
      name: `${destination} Travel Information Hub`,
      description:
        `A comprehensive collection of travel guides, tips, and resources for Arab visitors planning a trip to ${destination}.`,
      url: `${baseUrl}/information`,
      hasPart: informationSections
        .filter((section) => section.published)
        .map((section) => ({
          "@type": "WebPage",
          name: section.name_en,
          description: section.description_en,
          url: `${baseUrl}/information/${section.slug}`,
        })),
    },
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
        name: "Information",
        item: `${baseUrl}/information`,
      },
    ],
  };

  // FAQPage schema deprecated by Google (Aug 2023) — omitted
  return { webPageSchema, breadcrumbSchema };
}

// Transform sections for client component
function transformSectionsForClient() {
  return informationSections
    .filter((section) => section.published)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => ({
      id: section.id,
      slug: section.slug,
      name_en: section.name_en,
      name_ar: section.name_ar,
      description_en: section.description_en,
      description_ar: section.description_ar,
      icon: section.icon,
    }));
}

// Transform articles for client component (serialize dates)
function transformArticlesForClient() {
  return informationArticles
    .filter((article) => article.published)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((article) => {
      const category = informationCategories.find(
        (c) => c.id === article.category_id,
      );
      return {
        id: article.id,
        slug: article.slug,
        section_id: article.section_id,
        title_en: article.title_en,
        title_ar: article.title_ar,
        excerpt_en: article.excerpt_en,
        excerpt_ar: article.excerpt_ar,
        featured_image: article.featured_image,
        reading_time: article.reading_time,
        created_at: article.created_at.toISOString(),
        category: category
          ? {
              id: category.id,
              name_en: category.name_en,
              name_ar: category.name_ar,
              slug: category.slug,
            }
          : null,
      };
    });
}

export default async function InformationPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const destination = siteConfig?.destination || "London";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  const structuredData = generateStructuredData({ siteName, siteSlug, baseUrl, destination });
  const sections = transformSectionsForClient();
  const articles = transformArticlesForClient();

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.webPageSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.breadcrumbSchema),
        }}
      />

      {/* Server-rendered information hub passed to client component for interactivity */}
      <InformationHubClient sections={sections} articles={articles} />
    </>
  );
}
