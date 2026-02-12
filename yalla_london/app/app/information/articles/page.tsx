import { Metadata } from "next";
import {
  informationArticles as baseArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import ArticleListClient from "./ArticleListClient";

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// ISR: Revalidate article listing every 10 minutes for Cloudflare edge caching
export const revalidate = 600;

// Static metadata for SEO
export const metadata: Metadata = {
  title:
    "Travel Articles | Yalla London Information Hub",
  description:
    "Browse our comprehensive collection of travel articles for Arab visitors to London. Find guides on planning, transport, dining, attractions, family activities, and practical tips for your London trip.",
  keywords:
    "london travel articles, arab visitors london, london guide, halal travel london, london information hub, london planning tips, london attractions, london transport guide",
  alternates: {
    canonical: "https://www.yalla-london.com/information/articles",
    languages: {
      "en-GB": "https://www.yalla-london.com/information/articles",
      "ar-SA": "https://www.yalla-london.com/ar/information/articles",
    },
  },
  openGraph: {
    title: "Travel Articles | Yalla London Information Hub",
    description:
      "Comprehensive travel articles and guides for Arab visitors to London. Planning tips, transport guides, dining recommendations, and insider knowledge.",
    url: "https://www.yalla-london.com/information/articles",
    siteName: "Yalla London",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    type: "website",
    images: [
      {
        url: "https://www.yalla-london.com/images/information-hub-og.jpg",
        width: 1200,
        height: 630,
        alt: "Yalla London Information Hub - Travel Articles for Arab Visitors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@yallalondon",
    title: "Travel Articles | Yalla London Information Hub",
    description:
      "Comprehensive travel articles and guides for Arab visitors to London",
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

// Generate structured data for the article listing
function generateStructuredData() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Yalla London Information Hub - Travel Articles",
    description:
      "Comprehensive travel articles and guides for Arab visitors to London",
    url: `${baseUrl}/information/articles`,
    publisher: {
      "@type": "Organization",
      name: "Yalla London",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    blogPost: informationArticles
      .filter((article) => article.published)
      .slice(0, 10) // Include first 10 articles in structured data
      .map((article) => ({
        "@type": "BlogPosting",
        headline: article.title_en,
        description: article.excerpt_en,
        url: `${baseUrl}/information/articles/${article.slug}`,
        image: article.featured_image,
        datePublished: article.created_at.toISOString(),
        dateModified: article.updated_at.toISOString(),
        author: {
          "@type": "Organization",
          name: "Yalla London",
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

export default function ArticlesPage() {
  const structuredData = generateStructuredData();
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
