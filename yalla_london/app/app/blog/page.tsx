import { Metadata } from 'next'
import { blogPosts, categories } from '@/data/blog-content'
import { extendedBlogPosts } from '@/data/blog-content-extended'
import BlogListClient from './BlogListClient'

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts]

// Static metadata for SEO
export const metadata: Metadata = {
  title: 'Blog | Yalla London - Travel Guides & Stories for Arab Visitors',
  description: 'Explore our collection of travel guides, restaurant reviews, hotel comparisons, and insider tips for Arab visitors to London. Find halal dining, luxury hotels, and cultural experiences.',
  keywords: 'london blog, halal travel london, arab visitors london, london guides, halal restaurants, luxury hotels london, arab friendly london',
  alternates: {
    canonical: 'https://www.yalla-london.com/blog',
    languages: {
      'en-GB': 'https://www.yalla-london.com/blog',
      'ar-SA': 'https://www.yalla-london.com/ar/blog',
    },
  },
  openGraph: {
    title: 'Blog | Yalla London - Travel Guides for Arab Visitors',
    description: 'Discover London through the eyes of Arab travelers. Halal dining, luxury hotels, shopping guides, and cultural experiences.',
    url: 'https://www.yalla-london.com/blog',
    siteName: 'Yalla London',
    locale: 'en_GB',
    alternateLocale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: 'https://www.yalla-london.com/images/blog-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Yalla London Blog - Travel Guides for Arab Visitors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@yallalondon',
    title: 'Blog | Yalla London',
    description: 'Travel guides and stories for Arab visitors to London',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Generate structured data for the blog listing
function generateStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com'

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Yalla London Blog',
    description: 'Travel guides, restaurant reviews, and insider tips for Arab visitors to London',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Yalla London',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    blogPost: allStaticPosts
      .filter(post => post.published)
      .slice(0, 10) // Include first 10 posts in structured data
      .map(post => ({
        '@type': 'BlogPosting',
        headline: post.title_en,
        description: post.excerpt_en,
        url: `${baseUrl}/blog/${post.slug}`,
        image: post.featured_image,
        datePublished: post.created_at.toISOString(),
        dateModified: post.updated_at.toISOString(),
        author: {
          '@type': 'Organization',
          name: 'Yalla London',
        },
      })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${baseUrl}/blog`,
      },
    ],
  }

  return { blogSchema, breadcrumbSchema }
}

// Transform posts for client component (serialize dates)
function transformPostsForClient() {
  return allStaticPosts
    .filter(post => post.published)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(post => {
      const category = categories.find(c => c.id === post.category_id)
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
        category: category ? {
          id: category.id,
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        } : null,
      }
    })
}

export default function BlogPage() {
  const structuredData = generateStructuredData()
  const posts = transformPostsForClient()

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
      <BlogListClient posts={posts} />
    </>
  )
}
