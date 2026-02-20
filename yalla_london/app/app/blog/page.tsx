import { Metadata } from "next";
import { headers } from "next/headers";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { getBaseUrl } from "@/lib/url-utils";
import { getSiteDomain, getSiteConfig, getDefaultSiteId } from "@/config/sites";
import BlogListClient from "./BlogListClient";

// Combine all static blog posts (legacy content)
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// ISR: Revalidate blog listing every hour for multi-site scale
export const revalidate = 3600;

// Dynamic metadata for SEO — resolves site identity + base URL from request context
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const destination = siteConfig?.destination || "London";
  const siteSlug = siteConfig?.slug || "yallalondon";

  return {
    title: `Blog | ${siteName} — Travel Guides & Tips`,
    description:
      `Travel guides, restaurant reviews, and insider tips for Arab visitors to ${destination}. Halal dining, luxury hotels, and more.`,
    keywords:
      `${destination.toLowerCase()} blog, halal travel ${destination.toLowerCase()}, arab visitors ${destination.toLowerCase()}, ${destination.toLowerCase()} guides`,
    alternates: {
      canonical: `${baseUrl}/blog`,
      languages: {
        "en-GB": `${baseUrl}/blog`,
        "ar-SA": `${baseUrl}/ar/blog`,
        "x-default": `${baseUrl}/blog`,
      },
    },
    openGraph: {
      title: `Blog | ${siteName} - Travel Guides for Arab Visitors`,
      description:
        `Discover ${destination} through the eyes of Arab travelers. Halal dining, luxury hotels, shopping guides, and cultural experiences.`,
      url: `${baseUrl}/blog`,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
      images: [
        {
          url: `${baseUrl}/images/blog-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} Blog - Travel Guides for Arab Visitors`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Blog | ${siteName}`,
      description: `Travel guides and stories for Arab visitors to ${destination}`,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function getDbPosts() {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const siteId = headersList.get("x-site-id") || getDefaultSiteId();

    const { prisma } = await import("@/lib/db");
    return await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, siteId },
      include: { category: true },
      orderBy: { created_at: "desc" },
    });
  } catch {
    return [];
  }
}

// ─── Structured Data ────────────────────────────────────────────────────────

function generateStructuredData(
  allPosts: Array<{
    title_en: string;
    excerpt_en: string;
    slug: string;
    featured_image: string;
    created_at: string;
  }>,
  siteInfo: { siteName: string; siteSlug: string; baseUrl: string },
) {
  const { siteName, siteSlug, baseUrl } = siteInfo;

  // Use ItemList schema (Google-supported) instead of Blog (non-standard)
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteName} Blog`,
    description: `Travel guides, restaurant reviews, and insider tips for Arab travelers`,
    url: `${baseUrl}/blog`,
    numberOfItems: allPosts.length,
    itemListElement: allPosts.slice(0, 10).map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/blog/${post.slug}`,
      name: post.title_en,
    })),
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
    ],
  };

  return { blogSchema, breadcrumbSchema };
}

// ─── Page component ────────────────────────────────────────────────────────

export default async function BlogPage() {
  // Resolve site identity
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  // 1. Transform static posts
  const staticPosts = allStaticPosts
    .filter((post) => post.published)
    .map((post) => {
      const category = categories.find((c) => c.id === post.category_id);
      return {
        id: post.id,
        slug: post.slug,
        title_en: post.title_en,
        title_ar: post.title_ar,
        excerpt_en: post.excerpt_en,
        excerpt_ar: post.excerpt_ar,
        featured_image: post.featured_image,
        created_at: post.created_at.toISOString(),
        reading_time: post.reading_time,
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

  // 2. Fetch database posts (pipeline-generated articles)
  const dbPosts = await getDbPosts();
  const staticSlugs = new Set(staticPosts.map((p) => p.slug));

  const dbPostsTransformed = dbPosts
    .filter((post) => !staticSlugs.has(post.slug))
    .map((post) => ({
      id: post.id,
      slug: post.slug,
      title_en: post.title_en,
      title_ar: post.title_ar,
      excerpt_en: post.excerpt_en || "",
      excerpt_ar: post.excerpt_ar || "",
      featured_image: post.featured_image || "",
      created_at:
        post.created_at instanceof Date
          ? post.created_at.toISOString()
          : String(post.created_at),
      reading_time: computeReadingTime(post.content_en),
      category: post.category
        ? {
            id: post.category.id,
            name_en: post.category.name_en,
            name_ar: post.category.name_ar,
            slug: post.category.slug,
          }
        : null,
    }));

  // 3. Merge and sort by date (newest first)
  const allPosts = [...staticPosts, ...dbPostsTransformed].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const structuredData = generateStructuredData(allPosts, { siteName, siteSlug, baseUrl });

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

      {/* Server-rendered blog list passed to client component for interactivity */}
      <BlogListClient posts={allPosts} />
    </>
  );
}
