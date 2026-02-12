import { Metadata } from "next";
import {
  informationSections,
  informationArticles as baseArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import InformationHubClient from "./InformationHubClient";

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// ISR: Revalidate information hub listing every 10 minutes for Cloudflare edge caching
export const revalidate = 600;

// Static metadata for SEO
export const metadata: Metadata = {
  title:
    "Information Hub | Yalla London \u2013 Your Complete London Travel Guide",
  description:
    "Your complete London travel guide for Arab visitors. Plan your trip with halal dining guides, transportation tips, neighbourhood guides, family activities, and insider advice for exploring London.",
  keywords:
    "london travel guide, arab visitors london, london information, halal london guide, london trip planner, london for arab families, london transportation guide, london neighbourhoods, london attractions, london practical tips",
  alternates: {
    canonical: "https://www.yalla-london.com/information",
    languages: {
      "en-GB": "https://www.yalla-london.com/information",
      "ar-SA": "https://www.yalla-london.com/ar/information",
    },
  },
  openGraph: {
    title:
      "Information Hub | Yalla London \u2013 Your Complete London Travel Guide",
    description:
      "Plan your perfect London trip with our comprehensive travel guide for Arab visitors. Halal dining, family activities, transportation, and more.",
    url: "https://www.yalla-london.com/information",
    siteName: "Yalla London",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    type: "website",
    images: [
      {
        url: "https://www.yalla-london.com/images/information-hub-og.jpg",
        width: 1200,
        height: 630,
        alt: "Yalla London Information Hub - Complete London Travel Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@yallalondon",
    title: "Information Hub | Yalla London",
    description:
      "Your complete London travel guide for Arab visitors \u2013 everything you need to plan the perfect trip",
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

// Generate structured data for the information hub
function generateStructuredData() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Information Hub - Yalla London",
    description:
      "Your complete London travel guide for Arab visitors. Plan your trip with halal dining guides, transportation tips, neighbourhood guides, and insider advice.",
    url: `${baseUrl}/information`,
    isPartOf: {
      "@type": "WebSite",
      name: "Yalla London",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Yalla London",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntity: {
      "@type": "CollectionPage",
      name: "London Travel Information Hub",
      description:
        "A comprehensive collection of travel guides, tips, and resources for Arab visitors planning a trip to London.",
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best time to visit London for Arab families?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The best time to visit London for Arab families is during the summer months (June\u2013August) when the weather is warm and school holidays align. Ramadan and Eid periods also see many Arab-friendly events and special restaurant offers across the city.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I find halal restaurants in London?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "London has hundreds of halal restaurants across all cuisines. Popular areas include Edgware Road, Knightsbridge, Marble Arch, and Whitechapel. Our halal dining guide covers Michelin-starred options, casual eateries, and family-friendly restaurants.",
        },
      },
      {
        "@type": "Question",
        name: "How do I get around London using public transport?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "London has an extensive public transport network including the Underground (Tube), buses, and the Overground. Get an Oyster card or use contactless payment for the best fares. Our transportation guide covers everything from airport transfers to day trips.",
        },
      },
      {
        "@type": "Question",
        name: "What are the best London neighbourhoods for Arab visitors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Popular neighbourhoods for Arab visitors include Edgware Road (known as Little Cairo), Knightsbridge, Mayfair, Kensington, and Bayswater. These areas offer Arabic-speaking services, halal dining, and proximity to luxury shopping.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need a visa to visit London from the Middle East?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most Middle Eastern passport holders need a Standard Visitor Visa to enter the UK. GCC nationals can apply online and the process typically takes 3\u20134 weeks. Our Plan Your Trip section has detailed visa guidance for each country.",
        },
      },
    ],
  };

  return { webPageSchema, breadcrumbSchema, faqSchema };
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

export default function InformationPage() {
  const structuredData = generateStructuredData();
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.faqSchema),
        }}
      />

      {/* Server-rendered information hub passed to client component for interactivity */}
      <InformationHubClient sections={sections} articles={articles} />
    </>
  );
}
