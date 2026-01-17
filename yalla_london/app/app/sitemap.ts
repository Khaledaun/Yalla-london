import type { MetadataRoute } from 'next'
import { blogPosts, categories } from '@/data/blog-content'
import { extendedBlogPosts } from '@/data/blog-content-extended'

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com'
  const currentDate = new Date().toISOString()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
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
      changeFrequency: 'daily',
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
      changeFrequency: 'weekly',
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
      changeFrequency: 'daily',
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
      changeFrequency: 'monthly',
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
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: {
        languages: {
          en: `${baseUrl}/contact`,
          ar: `${baseUrl}/ar/contact`,
        },
      },
    },
    {
      url: `${baseUrl}/team`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: {
        languages: {
          en: `${baseUrl}/team`,
          ar: `${baseUrl}/ar/team`,
        },
      },
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${baseUrl}/privacy`,
          ar: `${baseUrl}/ar/privacy`,
        },
      },
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: {
        languages: {
          en: `${baseUrl}/terms`,
          ar: `${baseUrl}/ar/terms`,
        },
      },
    },
  ]

  // Blog posts - dynamically generated from content files
  const blogPages: MetadataRoute.Sitemap = allStaticPosts
    .filter(post => post.published)
    .map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at.toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/blog/${post.slug}`,
          ar: `${baseUrl}/ar/blog/${post.slug}`,
        },
      },
    }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map(category => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
    alternates: {
      languages: {
        en: `${baseUrl}/blog/category/${category.slug}`,
        ar: `${baseUrl}/ar/blog/category/${category.slug}`,
      },
    },
  }))

  return [...staticPages, ...blogPages, ...categoryPages]
}
