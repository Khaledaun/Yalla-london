import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRelatedArticles } from "@/lib/related-content";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import BlogPostClient from "./BlogPostClient";

// Lazy-load static content only when DB lookup fails (saves ~224KB per request)
let _staticPostsCache: any[] | null = null;
let _categoriesCache: any[] | null = null;

async function getStaticPosts() {
  if (!_staticPostsCache) {
    const { blogPosts, categories } = await import("@/data/blog-content");
    const { extendedBlogPosts } = await import("@/data/blog-content-extended");
    _staticPostsCache = [...blogPosts, ...extendedBlogPosts];
    _categoriesCache = categories;
  }
  return { allStaticPosts: _staticPostsCache!, categories: _categoriesCache! };
}

// ISR: Revalidate blog posts every hour for multi-site scale
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

// ─── Database helpers ──────────────────────────────────────────────────────

async function getDbPost(slug: string, siteId?: string) {
  try {
    const { prisma } = await import("@/lib/db");
    return await prisma.blogPost.findFirst({
      where: { slug, published: true, deletedAt: null, ...(siteId ? { siteId } : {}) },
      include: { category: true },
    });
  } catch {
    return null;
  }
}

async function getDbSlugs(siteId?: string): Promise<string[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, ...(siteId ? { siteId } : {}) },
      select: { slug: true },
    });
    return posts.map((p) => p.slug);
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

type PostResult =
  | { source: "db"; post: NonNullable<Awaited<ReturnType<typeof getDbPost>>> }
  | { source: "static"; post: Record<string, any> };

async function findPost(slug: string, siteId?: string): Promise<PostResult | null> {
  // Database first — this is where pipeline-generated articles live
  const dbPost = await getDbPost(slug, siteId);
  if (dbPost) return { source: "db", post: dbPost };

  // Fall back to static content (legacy hardcoded articles) — lazy-loaded
  const { allStaticPosts } = await getStaticPosts();
  const staticPost = allStaticPosts.find((p) => p.slug === slug && p.published);
  if (staticPost) return { source: "static", post: staticPost };

  return null;
}

// ─── Static params (build + ISR) ───────────────────────────────────────────

export async function generateStaticParams() {
  const { allStaticPosts } = await getStaticPosts();
  const staticSlugs = allStaticPosts
    .filter((post) => post.published)
    .map((post) => ({ slug: post.slug }));

  // At build time, generate params for all sites (no site filter)
  const dbSlugs = await getDbSlugs();
  const staticSet = new Set(staticSlugs.map((s) => s.slug));
  const dbOnly = dbSlugs
    .filter((slug) => !staticSet.has(slug))
    .map((slug) => ({ slug }));

  return [...staticSlugs, ...dbOnly];
}

// ─── Metadata (SEO) ────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Resolve site identity from request headers (set by middleware)
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteDomain = getSiteDomain(siteId);
  const siteSlug = siteConfig?.slug || "yallalondon";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || siteDomain;
  const canonicalUrl = `${baseUrl}/blog/${slug}`;

  const result = await findPost(slug, siteId);
  if (!result) {
    return {
      title: `Post Not Found | ${siteName}`,
      description: "The blog post you are looking for could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const { source, post } = result;
  // Arabic SSR: serve locale-appropriate metadata so crawlers on /ar/ routes
  // see Arabic title/description in the HTML head (not just after hydration).
  const locale = headersList.get("x-locale") || "en";
  const title = locale === "ar"
    ? ((post as any).meta_title_ar || post.title_ar || post.title_en)
    : (post.meta_title_en || post.title_en);
  const description = locale === "ar"
    ? ((post as any).meta_description_ar || post.excerpt_ar || post.excerpt_en || "")
    : (post.meta_description_en || post.excerpt_en || "");
  const image = post.featured_image || "";
  const createdAt =
    post.created_at instanceof Date
      ? post.created_at.toISOString()
      : String(post.created_at);
  const updatedAt =
    post.updated_at instanceof Date
      ? post.updated_at.toISOString()
      : String(post.updated_at);

  let categoryName = "Travel";
  let tags: string[] = post.tags || [];
  let keywordStr = "";

  if (source === "static") {
    const { categories: cats } = await getStaticPosts();
    const cat = cats.find((c: any) => c.id === post.category_id);
    categoryName = cat?.name_en || "Travel";
    keywordStr = (post as any).keywords?.join(", ") || tags.join(", ");
  } else {
    categoryName = (post as any).category?.name_en || "Travel";
    const kw = (post as any).keywords_json;
    keywordStr = Array.isArray(kw) ? kw.join(", ") : tags.join(", ");
  }

  return {
    title,
    description,
    keywords: keywordStr,
    authors: [{ name: `${siteName} Editorial` }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/blog/${slug}`,
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
      publishedTime: createdAt,
      modifiedTime: updatedAt,
      authors: [`${siteName} Editorial`],
      section: categoryName,
      tags,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: post.title_en }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title,
      description,
      images: image ? [image] : [],
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
      "article:published_time": createdAt,
      "article:modified_time": updatedAt,
      "article:author": `${siteName} Editorial`,
      "article:section": categoryName,
      "article:tag": tags.join(","),
    },
  };
}

// ─── Structured Data (JSON-LD) ─────────────────────────────────────────────

async function generateStructuredData(
  post: any,
  source: "db" | "static",
  siteInfo: { siteName: string; siteDomain: string; siteSlug: string; locale: string },
) {
  const { siteName, siteDomain, siteSlug, locale } = siteInfo;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || siteDomain;

  let categoryName = "Travel";
  let keywords: string[] = [];

  if (source === "db") {
    categoryName = post.category?.name_en || "Travel";
    keywords = Array.isArray(post.keywords_json) ? post.keywords_json : [];
  } else {
    const { categories: cats } = await getStaticPosts();
    const cat = cats.find((c: any) => c.id === post.category_id);
    categoryName = cat?.name_en || "Travel";
    keywords = post.keywords || [];
  }

  const contentText =
    source === "static"
      ? post.content_en
      : post.content_en.replace(/<[^>]*>/g, "");
  const createdAt =
    post.created_at instanceof Date
      ? post.created_at.toISOString()
      : String(post.created_at);
  const updatedAt =
    post.updated_at instanceof Date
      ? post.updated_at.toISOString()
      : String(post.updated_at);

  const logoPath = `${baseUrl}/images/${siteSlug}-logo.svg`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title_en,
    description: post.excerpt_en || "",
    image: post.featured_image || "",
    datePublished: createdAt,
    dateModified: updatedAt,
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
        url: logoPath,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`,
    },
    articleSection: categoryName,
    keywords: keywords.join(", "),
    wordCount: contentText.split(" ").length,
    inLanguage: locale === "ar" ? "ar" : "en-GB",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title_en,
        item: `${baseUrl}/blog/${post.slug}`,
      },
    ],
  };

  return { articleSchema, breadcrumbSchema };
}

// ─── Transform for client component ────────────────────────────────────────

async function transformForClient(post: any, source: "db" | "static") {
  let category = null;

  if (source === "db" && post.category) {
    category = {
      id: post.category.id,
      name_en: post.category.name_en,
      name_ar: post.category.name_ar,
      slug: post.category.slug,
    };
  } else if (source === "static") {
    const { categories: cats } = await getStaticPosts();
    const cat = cats.find((c: any) => c.id === post.category_id);
    category = cat
      ? {
          id: cat.id,
          name_en: cat.name_en,
          name_ar: cat.name_ar,
          slug: cat.slug,
        }
      : null;
  }

  // Static content is markdown → convert to HTML (lazy-loaded)
  // Database content is already HTML from the content pipeline
  const markdownToHtml = source === "static"
    ? (await import("@/lib/markdown")).markdownToHtml
    : null;
  const contentEn =
    source === "static" && markdownToHtml ? markdownToHtml(post.content_en) : post.content_en;
  const contentAr =
    source === "static" && markdownToHtml ? markdownToHtml(post.content_ar) : post.content_ar;
  const readingTime =
    source === "static"
      ? post.reading_time
      : computeReadingTime(post.content_en);

  return {
    id: post.id,
    title_en: post.title_en,
    title_ar: post.title_ar,
    content_en: contentEn,
    content_ar: contentAr,
    excerpt_en: post.excerpt_en || "",
    excerpt_ar: post.excerpt_ar || "",
    slug: post.slug,
    featured_image: post.featured_image || "",
    created_at:
      post.created_at instanceof Date
        ? post.created_at.toISOString()
        : String(post.created_at),
    updated_at:
      post.updated_at instanceof Date
        ? post.updated_at.toISOString()
        : String(post.updated_at),
    reading_time: readingTime,
    tags: post.tags || [],
    category,
  };
}

// ─── Page component ────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Resolve site identity from request headers (set by middleware)
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteDomain = getSiteDomain(siteId);
  const siteSlug = siteConfig?.slug || "yallalondon";

  const result = await findPost(slug, siteId);

  if (!result) {
    notFound();
  }

  const locale = headersList.get("x-locale") || "en";

  // For DB posts, use dbOnly mode to skip importing 385KB of static content
  const isDb = result.source === "db";
  const categoryHint = isDb ? (result.post as any).category?.name_en : undefined;

  const [structuredData, clientPost, relatedArticles] = await Promise.all([
    generateStructuredData(result.post, result.source, { siteName, siteDomain, siteSlug, locale }),
    transformForClient(result.post, result.source),
    getRelatedArticles(slug, "blog", 3, {
      dbOnly: isDb,
      categoryHint,
    }),
  ]);

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
      <BlogPostClient post={clientPost} relatedArticles={relatedArticles} />
    </>
  );
}
