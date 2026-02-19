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
import { prisma } from "@/lib/db";

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

  // Helper: generate hreflang alternates with correct language-region codes
  function hreflang(path: string) {
    const enUrl = path ? `${baseUrl}${path}` : baseUrl;
    const arUrl = path ? `${baseUrl}/ar${path}` : `${baseUrl}/ar`;
    return {
      languages: {
        "en-GB": enUrl,
        "ar-SA": arUrl,
        "x-default": enUrl,
      },
    };
  }

  // Static pages (common to all sites)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1,
      alternates: hreflang(""),
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: hreflang("/blog"),
    },
    {
      url: `${baseUrl}/recommendations`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: hreflang("/recommendations"),
    },
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: hreflang("/events"),
    },
    {
      url: `${baseUrl}/experiences`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: hreflang("/experiences"),
    },
    {
      url: `${baseUrl}/hotels`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: hreflang("/hotels"),
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang("/about"),
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: hreflang("/contact"),
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: hreflang("/privacy"),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: hreflang("/terms"),
    },
    {
      url: `${baseUrl}/affiliate-disclosure`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: hreflang("/affiliate-disclosure"),
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
      alternates: hreflang("/shop"),
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
        alternates: hreflang(`/blog/${post.slug}`),
      }));
  }

  // Blog posts from database (scoped by siteId)
  const staticSlugs = new Set(allStaticPosts.map((p) => p.slug));
  let dbBlogPages: MetadataRoute.Sitemap = [];
  try {
    const dbPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        siteId: siteId,
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
        alternates: hreflang(`/blog/${post.slug}`),
      }));
  } catch (error) {
    console.warn(`[sitemap] Blog post DB query failed for ${siteId}:`, error instanceof Error ? error.message : String(error));
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
      alternates: hreflang(`/events/${event.id}`),
    }));
  } catch (error) {
    console.warn(`[sitemap] Events DB query failed for ${siteId}:`, error instanceof Error ? error.message : String(error));
  }

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: hreflang(`/blog/category/${category.slug}`),
  }));

  // Information Hub pages
  const infoHubPages: MetadataRoute.Sitemap = [
    // Main information hub page
    {
      url: `${baseUrl}/information`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: hreflang("/information"),
    },
    // Information articles listing page
    {
      url: `${baseUrl}/information/articles`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: hreflang("/information/articles"),
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
      alternates: hreflang(`/information/${section.slug}`),
    }));

  // Information Hub article pages
  const infoArticlePages: MetadataRoute.Sitemap = allInfoArticles
    .filter((article) => article.published)
    .map((article) => ({
      url: `${baseUrl}/information/articles/${article.slug}`,
      lastModified: article.updated_at.toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: hreflang(`/information/articles/${article.slug}`),
    }));

  // News pages
  let newsPages: MetadataRoute.Sitemap = [];
  try {
    const publishedNews = await prisma.newsItem.findMany({
      where: { status: "published", siteId },
      select: { slug: true, updated_at: true },
      orderBy: { published_at: "desc" },
      take: 100,
    });
    newsPages = publishedNews.map((item) => ({
      url: `${baseUrl}/news/${item.slug}`,
      lastModified: item.updated_at?.toISOString() || currentDate,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: hreflang(`/news/${item.slug}`),
    }));
  } catch (error) {
    console.warn(`[sitemap] News DB query failed for ${siteId}:`, error instanceof Error ? error.message : String(error));
  }

  // News landing page
  const newsLandingPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/news`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: hreflang("/news"),
    },
  ];

  // London by Foot pages (only for yalla-london)
  let londonByFootPages: MetadataRoute.Sitemap = [];
  if (siteId === "yalla-london") {
    londonByFootPages = [
      {
        url: `${baseUrl}/london-by-foot`,
        lastModified: currentDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: hreflang("/london-by-foot"),
      },
    ];
  }

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
    ...londonByFootPages,
  ];
}
