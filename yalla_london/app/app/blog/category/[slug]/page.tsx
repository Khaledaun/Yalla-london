import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import BlogListClient from "../../BlogListClient";

const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// ISR: Revalidate category pages every hour for multi-site scale
export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  return {
    title: `${category.name_en} | ${siteName} Blog`,
    description: category.description_en,
    keywords: (category as any).keywords?.join(", "),
    alternates: {
      canonical: `${baseUrl}/blog/category/${slug}`,
      languages: {
        "en-GB": `${baseUrl}/blog/category/${slug}`,
        "ar-SA": `${baseUrl}/ar/blog/category/${slug}`,
        "x-default": `${baseUrl}/blog/category/${slug}`,
      },
    },
    openGraph: {
      title: `${category.name_en} | ${siteName} Blog`,
      description: category.description_en,
      url: `${baseUrl}/blog/category/${slug}`,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId);

  // Filter posts by this category and transform for client component
  const posts = allStaticPosts
    .filter((post) => post.published && post.category_id === category.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((post) => {
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
        category: {
          id: category.id,
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        },
      };
    });

  // Also load DB posts for this category
  let dbPosts: typeof posts = [];
  try {
    const { prisma } = await import("@/lib/db");
    const staticSlugs = new Set(allStaticPosts.map((p) => p.slug));
    const catHeaders = await headers();
    const catSiteId = catHeaders.get("x-site-id") || getDefaultSiteId();
    const dbResults = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        siteId: catSiteId,
        tags: { has: category.slug },
      },
      select: {
        id: true,
        slug: true,
        title_en: true,
        title_ar: true,
        excerpt_en: true,
        excerpt_ar: true,
        featured_image: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
    dbPosts = dbResults
      .filter((p) => !staticSlugs.has(p.slug))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title_en: p.title_en || "",
        title_ar: p.title_ar || "",
        excerpt_en: p.excerpt_en || "",
        excerpt_ar: p.excerpt_ar || "",
        featured_image: p.featured_image || "",
        created_at: p.created_at?.toISOString() || new Date().toISOString(),
        reading_time: 5,
        category: {
          id: category.id,
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        },
      }));
  } catch {
    // DB not available — use static content only
  }

  const allPosts = [...posts, ...dbPosts];

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
        name: category.name_en,
        item: `${baseUrl}/blog/category/${slug}`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name_en} - ${siteName} Blog`,
    description: category.description_en,
    url: `${baseUrl}/blog/category/${slug}`,
    isPartOf: { "@type": "WebPage", url: `${baseUrl}/blog`, name: `${siteName} Blog` },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: { "@type": "ImageObject", url: `${baseUrl}/images/${siteSlug}-logo.svg` },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <BlogListClient posts={allPosts} />
    </>
  );
}
