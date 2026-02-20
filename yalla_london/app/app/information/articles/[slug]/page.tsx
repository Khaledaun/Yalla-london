import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  informationArticles as baseArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import { markdownToHtml } from "@/lib/markdown";
import { getRelatedArticles } from "@/lib/related-content";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import ArticleClient from "./ArticleClient";

// Combine all information articles
const informationArticles = [...baseArticles, ...extendedInformationArticles];

// ISR: Revalidate articles every hour for multi-site scale
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate static params for all published articles
export async function generateStaticParams() {
  return informationArticles
    .filter((article) => article.published)
    .map((article) => ({
      slug: article.slug,
    }));
}

// Generate metadata for SEO - this runs on the server
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  // Find the article
  const article = informationArticles.find(
    (a) => a.slug === slug && a.published,
  );

  if (!article) {
    return {
      title: `Article Not Found | ${siteName} Information Hub`,
      description:
        "The article you are looking for could not be found.",
    };
  }

  const category = informationCategories.find(
    (c) => c.id === article.category_id,
  );
  const canonicalUrl = `${baseUrl}/information/articles/${slug}`;
  // Arabic SSR: serve locale-appropriate metadata for /ar/ routes
  const locale = headersList.get("x-locale") || "en";
  const metaTitle = locale === "ar"
    ? (article.meta_title_ar || article.title_ar || article.title_en)
    : (article.meta_title_en || article.title_en);
  const metaDescription = locale === "ar"
    ? (article.meta_description_ar || article.excerpt_ar || article.excerpt_en)
    : (article.meta_description_en || article.excerpt_en);

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: article.keywords.join(", "),
    authors: [{ name: `${siteName} Editorial` }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/information/articles/${slug}`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName,
      locale: locale === "ar" ? "ar_SA" : "en_GB",
      alternateLocale: locale === "ar" ? "en_GB" : "ar_SA",
      type: "article",
      publishedTime: article.created_at.toISOString(),
      modifiedTime: article.updated_at.toISOString(),
      authors: [`${siteName} Editorial`],
      section: category?.name_en || "Travel",
      tags: article.tags,
      images: [
        {
          url: article.featured_image,
          width: 1200,
          height: 630,
          alt: locale === "ar" ? (article.title_ar || article.title_en) : article.title_en,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: metaTitle,
      description: metaDescription,
      images: [article.featured_image],
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
      "article:published_time": article.created_at.toISOString(),
      "article:modified_time": article.updated_at.toISOString(),
      "article:author": `${siteName} Editorial`,
      "article:section": category?.name_en || "Travel",
      "article:tag": article.tags.join(","),
    },
  };
}

// Generate JSON-LD structured data
function generateStructuredData(
  article: (typeof informationArticles)[0],
  siteInfo: { siteName: string; siteSlug: string; baseUrl: string },
) {
  const { siteName, siteSlug, baseUrl } = siteInfo;
  const category = informationCategories.find(
    (c) => c.id === article.category_id,
  );

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title_en,
    description: article.excerpt_en,
    image: article.featured_image,
    datePublished: article.created_at.toISOString(),
    dateModified: article.updated_at.toISOString(),
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
      "@id": `${baseUrl}/information/articles/${article.slug}`,
    },
    articleSection: category?.name_en || "Travel",
    keywords: article.keywords.join(", "),
    wordCount: article.content_en.split(" ").length,
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
        name: "Articles",
        item: `${baseUrl}/information/articles`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.title_en,
        item: `${baseUrl}/information/articles/${article.slug}`,
      },
    ],
  };

  // FAQPage schema deprecated by Google (Aug 2023) — omitted
  return { articleSchema, breadcrumbSchema };
}

// Transform article for client component (serialize dates and convert markdown to HTML)
function transformArticleForClient(
  article: (typeof informationArticles)[0],
) {
  const category = informationCategories.find(
    (c) => c.id === article.category_id,
  );

  return {
    id: article.id,
    title_en: article.title_en,
    title_ar: article.title_ar,
    // Convert markdown content to HTML
    content_en: markdownToHtml(article.content_en),
    content_ar: markdownToHtml(article.content_ar),
    excerpt_en: article.excerpt_en,
    excerpt_ar: article.excerpt_ar,
    slug: article.slug,
    featured_image: article.featured_image,
    created_at: article.created_at.toISOString(),
    updated_at: article.updated_at.toISOString(),
    reading_time: article.reading_time,
    tags: article.tags,
    category: category
      ? {
          id: category.id,
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        }
      : null,
    faq_questions: article.faq_questions
      ? article.faq_questions.map((faq) => ({
          question_en: faq.question_en,
          question_ar: faq.question_ar,
          answer_en: faq.answer_en,
          answer_ar: faq.answer_ar,
        }))
      : [],
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const article = informationArticles.find(
    (a) => a.slug === slug && a.published,
  );

  if (!article) {
    notFound();
  }

  // Resolve site identity for schema generation
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  // Generate structured data
  const structuredData = generateStructuredData(article, { siteName, siteSlug, baseUrl });

  // Transform article for client (serialize Date objects to strings)
  const clientArticle = transformArticleForClient(article);

  // Compute related articles for internal backlinks
  const relatedArticles = await getRelatedArticles(article.slug, 'information', 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.articleSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData.breadcrumbSchema),
        }}
      />
      <ArticleClient article={clientArticle} relatedArticles={relatedArticles} />
    </>
  );
}
