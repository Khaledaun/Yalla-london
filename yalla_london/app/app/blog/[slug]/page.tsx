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

// ─── Author (TeamMember) lookup ────────────────────────────────────────────

interface AuthorInfo {
  name_en: string;
  name_ar: string;
  title_en: string;
  bio_en: string;
  bio_ar: string;
  slug: string;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
}

const getAuthorForSite = cache(async function getAuthorForSite(siteId: string): Promise<AuthorInfo | null> {
  try {
    const { prisma } = await import("@/lib/db");
    // Find the featured TeamMember for this site (or global)
    const member = await withTimeout(
      prisma.teamMember.findFirst({
        where: {
          OR: [{ site_id: siteId }, { site_id: null }],
          is_featured: true,
          is_active: true,
        },
        orderBy: { display_order: "asc" },
        select: {
          name_en: true,
          name_ar: true,
          title_en: true,
          bio_en: true,
          bio_ar: true,
          slug: true,
          avatar_url: true,
          linkedin_url: true,
          twitter_url: true,
          instagram_url: true,
        },
      }),
      2000,
    );
    return member as AuthorInfo | null;
  } catch {
    return null;
  }
});

async function getDbPost(slug: string, siteId: string) {
  try {
    const { prisma } = await import("@/lib/db");
    // 8s timeout — must be generous enough to survive cold starts (Prisma
    // connection alone takes 2-3s). A timeout here returns null → notFound() → 404,
    // and ISR caches that 404 for 1 hour. If Googlebot hits during a cold start
    // with a 3s timeout, it gets 404 and may deprioritize the page for weeks.
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
          author_id: true,
          category: { select: { id: true, name_en: true, name_ar: true, slug: true } },
        },
      }),
      8000,
    );
  } catch (e) {
    console.warn("[blog] getDbPost failed for slug:", slug, e instanceof Error ? e.message : String(e));
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
        take: 2000,
      }),
      8000,
    );
    return posts ? (posts as Array<{ slug: string }>).map((p) => p.slug) : [];
  } catch (e) {
    console.warn("[blog] getDbSlugs failed:", e instanceof Error ? e.message : String(e));
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
/**
 * Check SeoRedirect table for 301 redirects (e.g., cannibalized articles).
 * Returns the target URL if a redirect exists, null otherwise.
 */
async function checkRedirect(slug: string): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const redirect = await withTimeout(
      prisma.seoRedirect.findUnique({
        where: { sourceUrl: `/blog/${slug}` },
        select: { targetUrl: true, enabled: true, statusCode: true },
      }),
      2000,
    ) as { targetUrl: string; enabled: boolean; statusCode: number } | null;
    if (redirect?.enabled && redirect.targetUrl) {
      return redirect.targetUrl;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const siteName = siteConfig?.name || "Zenitha";
  const siteDomain = getSiteDomain(siteId);
  const siteSlug = siteConfig?.slug || getDefaultSiteId();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || siteDomain;

  // Arabic SSR: detect locale from middleware header so crawlers on /ar/ routes
  // see Arabic metadata in the HTML head (not just after client hydration).
  const locale = headersList.get("x-locale") || "en";
  const isArabic = locale === "ar";

  // Locale-aware canonical: /ar/blog/slug for Arabic, /blog/slug for English.
  // Google requires canonical to match the URL being crawled.
  const enUrl = `${baseUrl}/blog/${slug}`;
  const arUrl = `${baseUrl}/ar/blog/${slug}`;
  const canonicalUrl = isArabic ? arUrl : enUrl;

  const result = await findPost(slug, siteId);
  if (!result) {
    return {
      title: isArabic ? `المقال غير موجود | ${siteName}` : `Post Not Found | ${siteName}`,
      description: isArabic
        ? "لم يتم العثور على المقال الذي تبحث عنه."
        : "The blog post you are looking for could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const { source, post } = result;
  const title = isArabic
    ? ((post as any).meta_title_ar || post.title_ar || post.title_en)
    : (post.meta_title_en || post.title_en);
  const rawDescription = isArabic
    ? ((post as any).meta_description_ar || post.excerpt_ar || post.excerpt_en || "")
    : (post.meta_description_en || post.excerpt_en || "");
  // Cap at 160 chars — Google truncates beyond this and it hurts CTR
  const description = rawDescription.length > 160
    ? rawDescription.slice(0, 157) + "..."
    : rawDescription;
  const ogTitle = title.length > 60 ? title.slice(0, 59).trimEnd() + "\u2026" : title;
  const image = post.featured_image || `${baseUrl}/api/og?siteId=${siteSlug}&title=${encodeURIComponent(ogTitle)}`;
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

  // Filter out internal pipeline tags from public-facing metadata
  const INTERNAL_TAGS = new Set(["auto-generated", "reservoir-pipeline", "needs-review", "needs-expansion"]);
  const publicTags = tags.filter((t: string) => !INTERNAL_TAGS.has(t) && !t.startsWith("site-") && !t.startsWith("primary-") && !t.startsWith("missing-"));

  // noindex articles with thin content — prevents indexing stub/placeholder pages that
  // hurt crawl budget and dilute site quality signals.
  // Check BOTH languages — an Arabic-only article with substantial content_ar should still be indexed
  // even when accessed via the English route (/blog/slug). Google uses the hreflang pair to decide
  // which version to serve; noindexing the English route blocks the whole article from Arabic search.
  // Threshold: 200 words minimum. Pages under 200 words (like "Five Star Hotels Near Mosques
  // London" at 70 words) provide no ranking value and waste crawl budget.
  const contentEn = post.content_en || "";
  const contentAr = post.content_ar || "";
  const wordCountEn = contentEn.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length;
  const wordCountAr = contentAr.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length;
  const hasSubstantiveContent = wordCountEn >= 200 || wordCountAr >= 200;

  // Fetch real author name for E-E-A-T (cached — shared with page component)
  const author = await getAuthorForSite(siteId);
  const authorName = isArabic
    ? (author?.name_ar || author?.name_en || `${siteName} Editorial`)
    : (author?.name_en || `${siteName} Editorial`);

  return {
    title,
    description,
    keywords: keywordStr,
    authors: [{ name: authorName }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": enUrl,
        "ar-SA": arUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: isArabic ? "ar_SA" : "en_GB",
      alternateLocale: isArabic ? "en_GB" : "ar_SA",
      type: "article",
      publishedTime: createdAt,
      modifiedTime: updatedAt,
      authors: [authorName],
      section: categoryName,
      tags: publicTags,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: isArabic ? (post.title_ar || post.title_en) : post.title_en }]
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
      index: hasSubstantiveContent,
      follow: true,
      googleBot: {
        index: hasSubstantiveContent,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: {
      "article:published_time": createdAt,
      "article:modified_time": updatedAt,
      "article:author": authorName,
      "article:section": categoryName,
      "article:tag": publicTags.join(","),
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
  author?: AuthorInfo | null,
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

  const isArabic = locale === "ar";
  // Use locale-appropriate content for word count and FAQ extraction
  const contentHtml = isArabic ? (post.content_ar || post.content_en || "") : (post.content_en || "");
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

  // Use locale-appropriate headline and description for structured data.
  // Google expects JSON-LD to match the visible page content language.
  const headline = isArabic
    ? (post.title_ar || post.title_en)
    : post.title_en;
  const schemaDescription = isArabic
    ? (post.excerpt_ar || post.excerpt_en || "")
    : (post.excerpt_en || "");
  const authorName = isArabic
    ? (author?.name_ar || author?.name_en || `${siteName} Editorial`)
    : (author?.name_en || `${siteName} Editorial`);
  const canonicalPageUrl = isArabic
    ? `${baseUrl}/ar/blog/${post.slug}`
    : `${baseUrl}/blog/${post.slug}`;

  const articleSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description: schemaDescription,
    image: post.featured_image || `${baseUrl}/api/og?siteId=${siteSlug}&title=${encodeURIComponent((post.title_en || post.title || "").slice(0, 60))}`,
    datePublished: createdAt,
    dateModified: updatedAt,
    author: author ? {
      "@type": "Person",
      name: authorName,
      url: `${baseUrl}/about#${author.slug}`,
      ...(author.linkedin_url ? { sameAs: [author.linkedin_url, author.twitter_url, author.instagram_url].filter(Boolean) } : {}),
    } : {
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
      "@id": canonicalPageUrl,
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

  // Breadcrumb URLs must match the locale of the page being crawled.
  const arPrefix = isArabic ? "/ar" : "";
  const breadcrumbItems = [
    { "@type": "ListItem" as const, position: 1, name: isArabic ? "الرئيسية" : "Home", item: `${baseUrl}${arPrefix}` || baseUrl },
    { "@type": "ListItem" as const, position: 2, name: isArabic ? "المدونة" : "Blog", item: `${baseUrl}${arPrefix}/blog` },
  ];
  if (categoryName && categoryName !== "Travel") {
    breadcrumbItems.push({
      "@type": "ListItem" as const,
      position: 3,
      name: categoryName,
      item: `${baseUrl}${arPrefix}/blog/category/${categoryName.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`,
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem" as const,
    position: breadcrumbItems.length + 1,
    name: headline,
    item: canonicalPageUrl,
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return { articleSchema, breadcrumbSchema };
}

// ─── Transform for client component ────────────────────────────────────────

function transformForClient(post: any, source: "db" | "static", categoriesCache?: any[], author?: AuthorInfo | null) {
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

  // Replace AI image placeholder tokens: [IMAGE: query] → <figure> with fallback image.
  // The pipeline should replace these before publishing, but some articles slip through.
  // We use the article's featured_image as the inline image source (same topic, already loaded).
  const replacePlaceholderImages = (html: string, fallbackImg: string, title: string): string => {
    if (!html) return html;
    return html.replace(/\[IMAGE:([^\]]*)\]/gi, (_match, query) => {
      const alt = query.trim() || title || 'Travel photo';
      const src = fallbackImg || '/images/placeholder-travel.jpg';
      return `<figure class="article-inline-image my-6"><img src="${src}" alt="${alt}" loading="lazy" style="width:100%;height:auto;border-radius:0.5rem;" /><figcaption class="text-sm text-center text-gray-500 mt-2">${alt}</figcaption></figure>`;
    });
  };

  const contentEn = replacePlaceholderImages(
    post.content_en,
    post.featured_image || '',
    post.title_en || '',
  );
  const contentAr = replacePlaceholderImages(
    post.content_ar,
    post.featured_image || '',
    post.title_ar || post.title_en || '',
  );
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
    author: author ? {
      name_en: author.name_en,
      name_ar: author.name_ar || "",
      title_en: author.title_en,
      bio_en: author.bio_en,
      bio_ar: author.bio_ar || "",
      slug: author.slug,
      avatar_url: author.avatar_url || null,
      linkedin_url: author.linkedin_url || null,
      twitter_url: author.twitter_url || null,
      instagram_url: author.instagram_url || null,
    } : null,
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
    <section className="py-14 bg-yl-cream border-t border-yl-gray-200/50">
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
  const siteName = siteConfig?.name || "Zenitha";
  const siteDomain = getSiteDomain(siteId);
  const siteSlug = siteConfig?.slug || getDefaultSiteId();

  const result = await findPost(slug, siteId);

  if (!result) {
    // Check for 301 redirect (cannibalized/merged articles)
    const redirectTarget = await checkRedirect(slug);
    if (redirectTarget) {
      const { redirect } = await import("next/navigation");
      redirect(redirectTarget);
    }
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

  // Fetch named author for E-E-A-T (cached — shared with generateMetadata)
  const author = await getAuthorForSite(siteId);

  const structuredData = generateStructuredData(
    result.post,
    result.source,
    { siteName, siteDomain, siteSlug, locale },
    categoriesCache,
    author,
  );
  const clientPost = transformForClient(result.post, result.source, categoriesCache, author);

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
      <BlogPostClient post={clientPost} serverLocale={locale as 'en' | 'ar'} />
      {/* Related articles stream in after the main content via Suspense.
          This eliminates a DB query from the critical render path —
          the page HTML arrives immediately, related articles load async. */}
      <Suspense fallback={<div className="py-14 bg-yl-cream" aria-hidden="true" />}>
        <RelatedArticlesLoader
          slug={slug}
          dbOnly={isDb}
          categoryHint={categoryHint}
        />
      </Suspense>
    </>
  );
}
