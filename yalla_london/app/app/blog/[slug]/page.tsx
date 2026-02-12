import { Metadata } from "next";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { markdownToHtml } from "@/lib/markdown";
import { getRelatedArticles } from "@/lib/related-content";
import BlogPostClient from "./BlogPostClient";

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// ISR: Revalidate blog posts every 10 minutes for Cloudflare edge caching
export const revalidate = 600;

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate static params for all blog posts
export async function generateStaticParams() {
  return allStaticPosts
    .filter((post) => post.published)
    .map((post) => ({
      slug: post.slug,
    }));
}

// Generate metadata for SEO - this runs on the server
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  // Find the post
  const post = allStaticPosts.find((p) => p.slug === slug && p.published);

  if (!post) {
    return {
      title: "Post Not Found | Yalla London",
      description: "The blog post you are looking for could not be found.",
    };
  }

  const category = categories.find((c) => c.id === post.category_id);
  const canonicalUrl = `${baseUrl}/blog/${slug}`;

  return {
    title: post.meta_title_en || post.title_en,
    description: post.meta_description_en || post.excerpt_en,
    keywords: post.keywords.join(", "),
    authors: [{ name: "Yalla London Editorial" }],
    creator: "Yalla London",
    publisher: "Yalla London",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.meta_title_en || post.title_en,
      description: post.meta_description_en || post.excerpt_en,
      url: canonicalUrl,
      siteName: "Yalla London",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "article",
      publishedTime: post.created_at.toISOString(),
      modifiedTime: post.updated_at.toISOString(),
      authors: ["Yalla London Editorial"],
      section: category?.name_en || "Travel",
      tags: post.tags,
      images: [
        {
          url: post.featured_image,
          width: 1200,
          height: 630,
          alt: post.title_en,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@yallalondon",
      title: post.meta_title_en || post.title_en,
      description: post.meta_description_en || post.excerpt_en,
      images: [post.featured_image],
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
      "article:published_time": post.created_at.toISOString(),
      "article:modified_time": post.updated_at.toISOString(),
      "article:author": "Yalla London Editorial",
      "article:section": category?.name_en || "Travel",
      "article:tag": post.tags.join(","),
    },
  };
}

// Generate JSON-LD structured data
function generateStructuredData(post: (typeof allStaticPosts)[0]) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const category = categories.find((c) => c.id === post.category_id);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title_en,
    description: post.excerpt_en,
    image: post.featured_image,
    datePublished: post.created_at.toISOString(),
    dateModified: post.updated_at.toISOString(),
    author: {
      "@type": "Organization",
      name: "Yalla London",
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
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
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`,
    },
    articleSection: category?.name_en || "Travel",
    keywords: post.keywords.join(", "),
    wordCount: post.content_en.split(" ").length,
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

// Transform post for client component (serialize dates and convert markdown to HTML)
function transformPostForClient(post: (typeof allStaticPosts)[0]) {
  const category = categories.find((c) => c.id === post.category_id);

  return {
    id: post.id,
    title_en: post.title_en,
    title_ar: post.title_ar,
    // Convert markdown content to HTML
    content_en: markdownToHtml(post.content_en),
    content_ar: markdownToHtml(post.content_ar),
    excerpt_en: post.excerpt_en,
    excerpt_ar: post.excerpt_ar,
    slug: post.slug,
    featured_image: post.featured_image,
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
    reading_time: post.reading_time,
    tags: post.tags,
    category: category
      ? {
          id: category.id,
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        }
      : null,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const post = allStaticPosts.find((p) => p.slug === slug && p.published);

  // Generate structured data if post exists
  const structuredData = post ? generateStructuredData(post) : null;

  // Transform post for client (serialize Date objects to strings)
  const clientPost = post ? transformPostForClient(post) : null;

  // Compute related articles for internal backlinks
  const relatedArticles = post ? getRelatedArticles(post.slug, 'blog', 3) : [];

  return (
    <>
      {structuredData && (
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
        </>
      )}
      <BlogPostClient post={clientPost} relatedArticles={relatedArticles} />
    </>
  );
}
