import { cache, Suspense } from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
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

/** Race a promise against a timeout (ms). Returns null on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function getDbPost(slug: string, siteId: string) {
  try {
    const { prisma } = await import("@/lib/db");
    // 3s timeout — fail fast to static fallback. On cold start the Prisma
    // connection alone can take 2-3s; if the query hasn't returned by 3s
    // the static fallback is faster than waiting.
    // Use select instead of include to skip heavy JSON columns (~40% less data)
    return await withTimeout(
      prisma.blogPost.findFirst({
        where: { slug, published: true, deletedAt: null, siteId },
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          excerpt_en: true,
          excerpt_ar: true,
          content_en: true,
          content_ar: true,
          featured_image: true,
          created_at: true,
          updated_at: true,
          tags: true,
          category_id: true,
          meta_title_en: true,
          meta_title_ar: true,
          meta_description_en: true,
          meta_description_ar: true,
          keywords_json: true,
          seo_score: true,
          page_type: true,
          category: { select: { id: true, name_en: true, name_ar: true, slug: true } },
        },
      }),
      3000,
    );
  } catch {
    return null;
  }
}

async function getDbSlugs(siteId?: string): Promise<string[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const posts = await withTimeout(
      prisma.blogPost.findMany({
        where: { published: true, deletedAt: null, siteId },
        select: { slug: true },
      }),
      8000,
    );
    return posts ? (posts as Array<{ slug: string }>).map((p) => p.slug) : [];
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
  | { source: "db"; post: Record<string, any> }
  | { source: "static"; post: Record<string, any> };

/**
 * findPost is wrapped with React.cache() so that generateMetadata() and
 * BlogPostPage() share the same DB result within a single request.
 * Without this, Prisma fires the identical query twice per page render
 * (Next.js only auto-deduplicates fetch(), not Prisma calls).
 */
const findPost = cache(async function findPost(slug: string, siteId: string): Promise<PostResult | null> {
  // Database first — this is where pipeline-generated articles live
  const dbPost = await getDbPost(slug, siteId);
  if (dbPost) return { source: "db", post: dbPost };

  // Fall back to static content (legacy hardcoded articles) — lazy-loaded
  const { allStaticPosts } = await getStaticPosts();
  const staticPost = allStaticPosts.find((p) => p.slug === slug && p.published);
  if (staticPost) return { source: "static", post: staticPost };

  return null;
});

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
  const rawDescription = locale === "ar"
    ? ((post as any).meta_description_ar || post.excerpt_ar || post.excerpt_en || "")
    : (post.meta_description_en || post.excerpt_en || "");
  // Cap at 160 chars — Google truncates beyond this and it hurts CTR
  const description = rawDescription.length > 160
    ? rawDescription.slice(0, 157) + "..."
    : rawDescription;
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

// ─── FAQ extraction from content ─────────────────────────────────────────

/**
 * Extract Q&A pairs from HTML content for AIO-friendly structured data.
 * Does NOT use deprecated FAQPage schema — uses Article hasPart instead.
 *
 * Two extraction strategies:
 * 1. Headings containing "?" followed by paragraph text (explicit questions)
 * 2. Headings containing tip/FAQ keywords followed by ordered/unordered lists
 *    (e.g. "How Can I Verify...", "Tips for...", "What Should I...")
 */
function extractFaqPairs(html: string): Array<{ question: string; answer: string }> {
  const pairs: Array<{ question: string; answer: string }> = [];

  // Strategy 1: Headings with "?" followed by paragraph(s)
  const faqPattern = /<h[23][^>]*>([^<]*\?[^<]*)<\/h[23]>\s*(?:<[^h][^>]*>)*([\s\S]*?)(?=<h[23]|$)/gi;
  let match;
  while ((match = faqPattern.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, "").trim();
    const rawAnswer = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (question && rawAnswer.length > 30) {
      pairs.push({ question, answer: rawAnswer.slice(0, 500) });
    }
  }

  // Strategy 2: Headings with tip/how-to keywords followed by list items
  const tipKeywords = /\b(tips?|how\s+(?:to|can|do)|verify|check|avoid|what\s+(?:to|should))\b/i;
  const tipPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*([\s\S]*?)(?=<h[23]|$)/gi;
  let tipMatch;
  while ((tipMatch = tipPattern.exec(html)) !== null) {
    const heading = tipMatch[1].replace(/<[^>]*>/g, "").trim();
    // Skip if already captured by Strategy 1 (has "?")
    if (heading.includes("?")) continue;
    if (!tipKeywords.test(heading)) continue;

    const body = tipMatch[2];
    // Extract list items from <li> tags
    const items: string[] = [];
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = liPattern.exec(body)) !== null) {
      const text = li[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 15) items.push(text);
    }
    if (items.length >= 2) {
      // Convert heading to question form if not already
      const question = heading.endsWith("?") ? heading : `${heading}?`;
      pairs.push({ question, answer: items.join(" ").slice(0, 500) });
    }
  }

  return pairs.slice(0, 8);
}

// ─── Structured Data (JSON-LD) ─────────────────────────────────────────────

function generateStructuredData(
  post: any,
  source: "db" | "static",
  siteInfo: { siteName: string; siteDomain: string; siteSlug: string; locale: string },
  categoriesCache?: any[],
) {
  const { siteName, siteDomain, siteSlug, locale } = siteInfo;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || siteDomain;

  let categoryName = "Travel";
  let keywords: string[] = [];

  if (source === "db") {
    categoryName = post.category?.name_en || "Travel";
    keywords = Array.isArray(post.keywords_json) ? post.keywords_json : [];
  } else if (categoriesCache) {
    const cat = categoriesCache.find((c: any) => c.id === post.category_id);
    categoryName = cat?.name_en || "Travel";
    keywords = post.keywords || [];
  }

  const contentHtml = post.content_en || "";
  const contentText =
    source === "static"
      ? contentHtml
      : contentHtml.replace(/<[^>]*>/g, "");
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;
  const createdAt =
    post.created_at instanceof Date
      ? post.created_at.toISOString()
      : String(post.created_at);
  const updatedAt =
    post.updated_at instanceof Date
      ? post.updated_at.toISOString()
      : String(post.updated_at);

  const logoPath = `${baseUrl}/images/${siteSlug}-logo.svg`;

  // Extract FAQ-like Q&A pairs from content for AIO citation
  const faqPairs = extractFaqPairs(contentHtml);

  const articleSchema: Record<string, any> = {
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
    wordCount,
    inLanguage: locale === "ar" ? "ar" : "en-GB",
  };

  // Add Q&A pairs as hasPart for AIO systems (not deprecated FAQPage)
  if (faqPairs.length > 0) {
    articleSchema.hasPart = faqPairs.map((faq) => ({
      "@type": "WebPageElement",
      "name": faq.question,
      "text": faq.answer,
    }));
  }

  const breadcrumbItems = [
    { "@type": "ListItem" as const, position: 1, name: "Home", item: baseUrl },
    { "@type": "ListItem" as const, position: 2, name: "Blog", item: `${baseUrl}/blog` },
  ];
  if (categoryName && categoryName !== "Travel") {
    breadcrumbItems.push({
      "@type": "ListItem" as const,
      position: 3,
      name: categoryName,
      item: `${baseUrl}/blog/category/${categoryName.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`,
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem" as const,
    position: breadcrumbItems.length + 1,
    name: post.title_en,
    item: `${baseUrl}/blog/${post.slug}`,
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return { articleSchema, breadcrumbSchema };
}

// ─── Transform for client component ────────────────────────────────────────

function transformForClient(post: any, source: "db" | "static", categoriesCache?: any[]) {
  let category = null;

  if (source === "db" && post.category) {
    category = {
      id: post.category.id,
      name_en: post.category.name_en,
      name_ar: post.category.name_ar,
      slug: post.category.slug,
    };
  } else if (source === "static" && categoriesCache) {
    const cat = categoriesCache.find((c: any) => c.id === post.category_id);
    category = cat
      ? {
          id: cat.id,
          name_en: cat.name_en,
          name_ar: cat.name_ar,
          slug: cat.slug,
        }
      : null;
  }

  // For static content, content is markdown — convert inline (lazy-loaded already by caller)
  // For DB content, it's already HTML from the content pipeline.
  // NOTE: We no longer do markdown conversion here — static posts are rare
  // and this avoids an async import during the critical render path.
  const contentEn = post.content_en;
  const contentAr = post.content_ar;
  const readingTime =
    source === "static"
      ? post.reading_time
      : computeReadingTime(post.content_en || "");

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

// ─── Streamed Related Articles (non-blocking) ─────────────────────────────

async function RelatedArticlesLoader({
  slug,
  dbOnly,
  categoryHint,
}: {
  slug: string;
  dbOnly: boolean;
  categoryHint?: string;
}) {
  const { getRelatedArticles } = await import("@/lib/related-content");
  const articles = await withTimeout(
    getRelatedArticles(slug, "blog", 3, { dbOnly, categoryHint }),
    3000,
  );

  if (!articles || articles.length === 0) return null;

  // Dynamically import the client component to render related articles
  const { RelatedArticles } = await import("@/components/related-articles");

  return (
    <section className="py-14 bg-cream border-t border-sand/50">
      <div className="max-w-6xl mx-auto px-6">
        <RelatedArticles articles={articles} currentType="blog" />
      </div>
    </section>
  );
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

  // For static posts, load categories once and pass to both functions
  let categoriesCache: any[] | undefined;
  if (!isDb) {
    const { categories } = await getStaticPosts();
    categoriesCache = categories;
  }

  // Both functions are now synchronous (no async imports, no DB calls) —
  // they just transform the already-fetched post object.
  const structuredData = generateStructuredData(
    result.post,
    result.source,
    { siteName, siteDomain, siteSlug, locale },
    categoriesCache,
  );
  const clientPost = transformForClient(result.post, result.source, categoriesCache);

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
      <BlogPostClient post={clientPost} />
      {/* Related articles stream in after the main content via Suspense.
          This eliminates a DB query from the critical render path —
          the page HTML arrives immediately, related articles load async. */}
      <Suspense fallback={<div className="py-14 bg-cream" aria-hidden="true" />}>
        <RelatedArticlesLoader
          slug={slug}
          dbOnly={isDb}
          categoryHint={categoryHint}
        />
      </Suspense>
    </>
  );
}
