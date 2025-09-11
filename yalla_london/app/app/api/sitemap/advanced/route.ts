export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server'
import { sitemapGenerator } from '@/lib/seo/sitemap-generator'

export async function GET(request: NextRequest) {
  try {
    // This provides the advanced sitemap functionality
    // with support for images, videos, news, etc.
    
    // Add any dynamic content to sitemap
    // This would typically fetch from your database
    
    // Example: Add blog posts
    // const blogPosts = await getBlogPosts()
    // blogPosts.forEach(post => {
    //   sitemapGenerator.addBlogPost({
    //     slug: post.slug,
    //     lastModified: post.updatedAt,
    //     language: post.language,
    //     images: post.images,
    //     title: post.title
    //   })
    // })

    // Generate the advanced sitemap XML
    const sitemapXML = sitemapGenerator.generateSitemapXML()

    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Advanced sitemap generation error:', error)
    return new NextResponse('Error generating advanced sitemap', { status: 500 })
  }
}
