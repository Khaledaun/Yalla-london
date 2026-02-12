import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  informationSections,
  informationArticles,
} from "@/data/information-hub-content";
import { markdownToHtml } from "@/lib/markdown";
import SectionClient from "./SectionClient";

// ISR: Revalidate section pages every 10 minutes for Cloudflare edge caching
export const revalidate = 600;

type Props = {
  params: Promise<{ section: string }>;
};

// All valid section slugs for static generation
// Note: 'articles' is handled by the /information/articles route
const sectionSlugs = [
  "plan-your-trip",
  "attractions-landmarks",
  "neighbourhood-guides",
  "transportation",
  "food-restaurants",
  "family-kids",
  "hidden-gems",
  "dos-and-donts",
  "practical-info",
  "coupons-deals",
  "emergency-healthcare",
  "e-document-shop",
  "luxury-experiences",
];

export async function generateStaticParams() {
  return sectionSlugs.map((section) => ({
    section,
  }));
}

// Generate metadata for SEO - dynamic per section
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.section;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  const section = informationSections.find((s) => s.slug === slug);

  if (!section) {
    return {
      title: "Section Not Found | Yalla London Information Hub",
      description:
        "The information section you are looking for could not be found.",
    };
  }

  const canonicalUrl = `${baseUrl}/information/${slug}`;

  return {
    title: `${section.name_en} | Yalla London Information Hub`,
    description: section.description_en,
    keywords: `${section.name_en.toLowerCase()}, london travel, arab visitors london, ${slug.replace(/-/g, " ")}, yalla london information`,
    authors: [{ name: "Yalla London Editorial" }],
    creator: "Yalla London",
    publisher: "Yalla London",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/information/${slug}`,
      },
    },
    openGraph: {
      title: `${section.name_en} | Yalla London Information Hub`,
      description: section.description_en,
      url: canonicalUrl,
      siteName: "Yalla London",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "article",
      images: [
        {
          url: section.featured_image,
          width: 1200,
          height: 630,
          alt: `${section.name_en} - Yalla London Information Hub`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@yallalondon",
      title: `${section.name_en} | Yalla London Information Hub`,
      description: section.description_en,
      images: [section.featured_image],
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

// Generate JSON-LD structured data for the section page
function generateStructuredData(
  section: (typeof informationSections)[0],
  sectionIndex: number,
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: section.name_en,
    description: section.description_en,
    url: `${baseUrl}/information/${section.slug}`,
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
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: section.featured_image,
    },
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
        name: "Information",
        item: `${baseUrl}/information`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: section.name_en,
        item: `${baseUrl}/information/${section.slug}`,
      },
    ],
  };

  // For sections with FAQ-like content (dos-and-donts, practical-info, emergency-healthcare),
  // add FAQPage schema using the subsections as Q&A pairs
  const faqSlugs = ["dos-and-donts", "practical-info", "emergency-healthcare"];
  let faqSchema = null;

  if (faqSlugs.includes(section.slug) && section.subsections.length > 0) {
    faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: section.subsections.map((sub) => ({
        "@type": "Question",
        name: sub.title_en,
        acceptedAnswer: {
          "@type": "Answer",
          text: sub.content_en.replace(/[#*_`\[\]]/g, "").substring(0, 500),
        },
      })),
    };
  }

  return { webPageSchema, breadcrumbSchema, faqSchema };
}

// Transform section data for the client component (convert markdown to HTML)
function transformSectionForClient(section: (typeof informationSections)[0]) {
  return {
    id: section.id,
    slug: section.slug,
    name_en: section.name_en,
    name_ar: section.name_ar,
    description_en: section.description_en,
    description_ar: section.description_ar,
    icon: section.icon,
    featured_image: section.featured_image,
    subsections: section.subsections.map((sub) => ({
      id: sub.id,
      title_en: sub.title_en,
      title_ar: sub.title_ar,
      content_en: markdownToHtml(sub.content_en),
      content_ar: markdownToHtml(sub.content_ar),
    })),
  };
}

// Transform related articles for the client component (serialize dates)
function transformArticlesForClient(sectionId: string) {
  return informationArticles
    .filter((article) => article.section_id === sectionId && article.published)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((article) => ({
      id: article.id,
      slug: article.slug,
      title_en: article.title_en,
      title_ar: article.title_ar,
      excerpt_en: article.excerpt_en,
      excerpt_ar: article.excerpt_ar,
      featured_image: article.featured_image,
      created_at: article.created_at.toISOString(),
      reading_time: article.reading_time,
    }));
}

// Determine previous and next section for navigation
function getSectionNavigation(currentSlug: string) {
  const currentIndex = sectionSlugs.indexOf(currentSlug);

  const prevSlug = currentIndex > 0 ? sectionSlugs[currentIndex - 1] : null;
  const nextSlug =
    currentIndex < sectionSlugs.length - 1
      ? sectionSlugs[currentIndex + 1]
      : null;

  const prevSection = prevSlug
    ? informationSections.find((s) => s.slug === prevSlug)
    : null;
  const nextSection = nextSlug
    ? informationSections.find((s) => s.slug === nextSlug)
    : null;

  return {
    prev: prevSection
      ? { slug: prevSection.slug, name_en: prevSection.name_en, name_ar: prevSection.name_ar }
      : null,
    next: nextSection
      ? { slug: nextSection.slug, name_en: nextSection.name_en, name_ar: nextSection.name_ar }
      : null,
  };
}

export default async function SectionPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.section;
  const section = informationSections.find((s) => s.slug === slug);

  if (!section) {
    notFound();
  }

  const sectionIndex = sectionSlugs.indexOf(slug);
  const structuredData = generateStructuredData(section, sectionIndex);
  const clientSection = transformSectionForClient(section);
  const relatedArticles = transformArticlesForClient(section.id);
  const navigation = getSectionNavigation(slug);

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
      {structuredData.faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.faqSchema),
          }}
        />
      )}

      <SectionClient
        section={clientSection}
        relatedArticles={relatedArticles}
        navigation={navigation}
      />
    </>
  );
}
