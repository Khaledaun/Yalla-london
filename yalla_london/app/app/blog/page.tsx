import { Metadata } from "next";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { getBaseUrl } from "@/lib/url-utils";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";
import BlogListClient from "./BlogListClient";

// Combine all static blog posts (legacy content)
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// ISR: Revalidate blog listing every 10 minutes for Cloudflare edge caching
export const revalidate = 600;

// Dynamic metadata for SEO — resolves base URL from request context
export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  return {
    title: "Blog | Yalla London - Travel Guides & Stories for Arab Visitors",
    description:
      "Explore our collection of travel guides, restaurant reviews, hotel comparisons, and insider tips for Arab visitors to London. Find halal dining, luxury hotels, and cultural experiences.",
    keywords:
      "london blog, halal travel london, arab visitors london, london guides, halal restaurants, luxury hotels london, arab friendly london",
    alternates: {
      canonical: `${baseUrl}/blog`,
      languages: {
        "en-GB": `${baseUrl}/blog`,
        "ar-SA": `${baseUrl}/ar/blog`,
      },
    },
    openGraph: {
      title: "Blog | Yalla London - Travel Guides for Arab Visitors",
      description:
        "Discover London through the eyes of Arab travelers. Halal dining, luxury hotels, shopping guides, and cultural experiences.",
      url: `${baseUrl}/blog`,
      siteName: "Yalla London",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
      images: [
        {
          url: `${baseUrl}/images/blog-og.jpg`,
          width: 1200,
          height: 630,
          alt: "Yalla London Blog - Travel Guides for Arab Visitors",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@yallalondon",
      title: "Blog | Yalla London",
      description: "Travel guides and stories for Arab visitors to London",
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
    const { prisma } = await import("@/lib/db");
    return await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
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
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Yalla London Blog",
    description:
      "Travel guides, restaurant reviews, and insider tips for Arab visitors to London",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Yalla London",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/images/yalla-london-logo.svg`,
      },
    },
    blogPost: allPosts.slice(0, 10).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title_en,
      description: post.excerpt_en || "",
      url: `${baseUrl}/blog/${post.slug}`,
      image: post.featured_image || "",
      datePublished: post.created_at,
      author: { "@type": "Organization", name: "Yalla London" },
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

  const structuredData = generateStructuredData(allPosts);

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
