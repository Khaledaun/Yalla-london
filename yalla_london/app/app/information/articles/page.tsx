import { Metadata } from "next";
import { headers } from "next/headers";
import {
  informationArticles as baseArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import ArticleListClient from "./ArticleListClient";

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// ISR: Revalidate article listing every hour for multi-site scale
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
  const canonicalUrl = `${baseUrl}/information/articles`;

  return {
    title: `Travel Articles | ${siteName} Information Hub`,
    description:
      `Travel articles for Arab visitors to ${destination}: planning guides, transport, halal dining, attractions, and practical tips.`,
    keywords:
      `${destination.toLowerCase()} travel articles, arab visitors ${destination.toLowerCase()}, ${destination.toLowerCase()} guide, halal travel ${destination.toLowerCase()}, information hub`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/information/articles`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Travel Articles | ${siteName} Information Hub`,
      description:
        `Comprehensive travel articles and guides for Arab visitors to ${destination}. Planning tips, transport guides, dining recommendations, and insider knowledge.`,
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
          alt: `${siteName} Information Hub - Travel Articles for Arab Visitors`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Travel Articles | ${siteName} Information Hub`,
      description:
        `Comprehensive travel articles and guides for Arab visitors to ${destination}`,
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

// Generate structured data for the article listing
function generateStructuredData(siteInfo: { siteName: string; siteSlug: string; baseUrl: string; destination: string }) {
  const { siteName, siteSlug, baseUrl, destination } = siteInfo;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${siteName} Information Hub - Travel Articles`,
    description:
      `Comprehensive travel articles and guides for Arab visitors to ${destination}`,
    url: `${baseUrl}/information/articles`,
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/images/${siteSlug}-logo.svg`,
      },
    },
    blogPost: informationArticles
      .filter((article) => article.published)
      .slice(0, 10)
      .map((article) => ({
        "@type": "BlogPosting",
        headline: article.title_en,
        description: article.excerpt_en,
        url: `${baseUrl}/information/articles/${article.slug}`,
        image: article.featured_image,
        datePublished: article.created_at.toISOString(),
        dateModified: article.updated_at.toISOString(),
        author: {
          "@type": "Person",
          name: `${siteName} Editorial`,
        },
      })),
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
      {
        "@type": "ListItem",
        position: 3,
        name: "Articles",
        item: `${baseUrl}/information/articles`,
      },
    ],
  };

  return { blogSchema, breadcrumbSchema };
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
        title_en: article.title_en,
        title_ar: article.title_ar,
        excerpt_en: article.excerpt_en,
        excerpt_ar: article.excerpt_ar,
        featured_image: article.featured_image,
        created_at: article.created_at.toISOString(),
        reading_time: article.reading_time,
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

export default async function ArticlesPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const destination = siteConfig?.destination || "London";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  const structuredData = generateStructuredData({ siteName, siteSlug, baseUrl, destination });
  const articles = transformArticlesForClient();

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.blogSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.breadcrumbSchema),
        }}
      />

      {/* Server-rendered article list passed to client component for interactivity */}
      <ArticleListClient articles={articles} />
    </>
  );
}
