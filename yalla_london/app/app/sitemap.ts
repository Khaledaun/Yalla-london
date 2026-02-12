import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import {
  informationSections,
  informationArticles as baseInfoArticles,
  informationCategories,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import { prisma } from "@/lib/prisma";

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// Combine all information hub articles
const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resolve base URL from tenant context (set by middleware)
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || "www.yalla-london.com";
  const siteId = headersList.get("x-site-id") || "yalla-london";
  const baseUrl =
    hostname === "localhost:3000"
      ? "http://localhost:3000"
      : `https://${hostname}`;
  const currentDate = new Date().toISOString();

  // Static pages (common to all sites)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: {
          en: baseUrl,
          ar: `${baseUrl}/ar`,
        },
      },
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}/blog`,
          ar: `${baseUrl}/ar/blog`,
        },
      },
    },
    {
      url: `${baseUrl}/recommendations`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}/recommendations`,
          ar: `${baseUrl}/ar/recommendations`,
        },
      },
    },
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/events`,
          ar: `${baseUrl}/ar/events`,
        },
      },
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: `${baseUrl}/about`,
          ar: `${baseUrl}/ar/about`,
        },
      },
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: {
          en: `${baseUrl}/contact`,
          ar: `${baseUrl}/ar/contact`,
        },
      },
    },
  ];

  // Blog posts from static content files (only for yalla-london)
  let staticBlogPages: MetadataRoute.Sitemap = [];
  if (siteId === "yalla-london") {
    staticBlogPages = allStaticPosts
      .filter((post) => post.published)
      .map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at.toISOString(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/blog/${post.slug}`,
            ar: `${baseUrl}/ar/blog/${post.slug}`,
          },
        },
      }));
  }

  // Blog posts from database (scoped by site_id)
  const staticSlugs = new Set(allStaticPosts.map((p) => p.slug));
  let dbBlogPages: MetadataRoute.Sitemap = [];
  try {
    const dbPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        site_id: siteId,
      },
      select: { slug: true, updated_at: true },
    });
    dbBlogPages = dbPosts
      .filter((post) => !staticSlugs.has(post.slug))
      .map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at?.toISOString() || currentDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/blog/${post.slug}`,
            ar: `${baseUrl}/ar/blog/${post.slug}`,
          },
        },
      }));
  } catch {
    // Database not available - use static content only
  }

  // Events from database (scoped by site)
  let eventPages: MetadataRoute.Sitemap = [];
  try {
    const events = await prisma.event.findMany({
      where: {
        published: true,
        OR: [{ siteId }, { siteId: null }],
      },
      select: { id: true, updated_at: true },
    });
    eventPages = events.map((event) => ({
      url: `${baseUrl}/events/${event.id}`,
      lastModified: event.updated_at?.toISOString() || currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Database not available
  }

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: {
      languages: {
        en: `${baseUrl}/blog/category/${category.slug}`,
        ar: `${baseUrl}/ar/blog/category/${category.slug}`,
      },
    },
  }));

  // Information Hub pages
  const infoHubPages: MetadataRoute.Sitemap = [
    // Main information hub page
    {
      url: `${baseUrl}/information`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: {
        languages: {
          en: `${baseUrl}/information`,
          ar: `${baseUrl}/ar/information`,
        },
      },
    },
    // Information articles listing page
    {
      url: `${baseUrl}/information/articles`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/information/articles`,
          ar: `${baseUrl}/ar/information/articles`,
        },
      },
    },
  ];

  // Information Hub section pages
  const infoSectionPages: MetadataRoute.Sitemap = informationSections
    .filter((section) => section.published)
    .map((section) => ({
      url: `${baseUrl}/information/${section.slug}`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/information/${section.slug}`,
          ar: `${baseUrl}/ar/information/${section.slug}`,
        },
      },
    }));

  // Information Hub article pages
  const infoArticlePages: MetadataRoute.Sitemap = allInfoArticles
    .filter((article) => article.published)
    .map((article) => ({
      url: `${baseUrl}/information/articles/${article.slug}`,
      lastModified: article.updated_at.toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/information/articles/${article.slug}`,
          ar: `${baseUrl}/ar/information/articles/${article.slug}`,
        },
      },
    }));

  // News pages
  let newsPages: MetadataRoute.Sitemap = [];
  try {
    const publishedNews = await prisma.newsItem.findMany({
      where: { status: "published" },
      select: { slug: true, updated_at: true },
      orderBy: { published_at: "desc" },
      take: 100,
    });
    newsPages = publishedNews.map((item) => ({
      url: `${baseUrl}/news/${item.slug}`,
      lastModified: item.updated_at.toISOString(),
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${baseUrl}/news/${item.slug}`,
          ar: `${baseUrl}/ar/news/${item.slug}`,
        },
      },
    }));
  } catch {
    // Database not available - skip news pages
  }

  // News landing page
  const newsLandingPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/news`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/news`,
          ar: `${baseUrl}/ar/news`,
        },
      },
    },
  ];

  return [
    ...staticPages,
    ...staticBlogPages,
    ...dbBlogPages,
    ...eventPages,
    ...categoryPages,
    ...infoHubPages,
    ...infoSectionPages,
    ...infoArticlePages,
    ...newsLandingPages,
    ...newsPages,
  ];
}
