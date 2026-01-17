import { NextRequest, NextResponse } from 'next/server'
import { blogPosts } from '@/data/blog-content'
import { extendedBlogPosts } from '@/data/blog-content-extended'

// IndexNow API key - you should generate your own at https://www.indexnow.org/
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'yalla-london-indexnow-key-2026'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com'

// Combine all static posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts]

interface IndexNowPayload {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

/**
 * Submit URLs to IndexNow for rapid indexing
 * IndexNow is supported by Bing, Yandex, and soon Google
 */
async function submitToIndexNow(urls: string[]): Promise<{ success: boolean; message: string }> {
  const payload: IndexNowPayload = {
    host: new URL(BASE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  }

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      return { success: true, message: `Successfully submitted ${urls.length} URLs to IndexNow` }
    } else {
      const errorText = await response.text()
      return { success: false, message: `IndexNow error: ${response.status} - ${errorText}` }
    }
  } catch (error) {
    return { success: false, message: `IndexNow request failed: ${error}` }
  }
}

/**
 * Submit URLs to Google Search Console Indexing API
 * Requires Google Search Console API credentials
 */
async function submitToGoogleIndexing(urls: string[]): Promise<{ success: boolean; message: string }> {
  // Note: Google Indexing API requires OAuth2 credentials
  // This is a placeholder - implement with actual Google credentials
  const googleApiKey = process.env.GOOGLE_INDEXING_API_KEY

  if (!googleApiKey) {
    return { success: false, message: 'Google Indexing API key not configured' }
  }

  try {
    const results = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(
          `https://indexing.googleapis.com/v3/urlNotifications:publish?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url,
              type: 'URL_UPDATED',
            }),
          }
        )
        return response.ok
      })
    )

    const successCount = results.filter(Boolean).length
    return {
      success: successCount > 0,
      message: `Submitted ${successCount}/${urls.length} URLs to Google Indexing API`,
    }
  } catch (error) {
    return { success: false, message: `Google Indexing request failed: ${error}` }
  }
}

/**
 * Ping Google and Bing sitemaps
 */
async function pingSitemaps(): Promise<{ google: boolean; bing: boolean }> {
  const sitemapUrl = `${BASE_URL}/sitemap.xml`

  const [googleResult, bingResult] = await Promise.all([
    // Ping Google
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
      .then((r) => r.ok)
      .catch(() => false),
    // Ping Bing
    fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`)
      .then((r) => r.ok)
      .catch(() => false),
  ])

  return { google: googleResult, bing: bingResult }
}

/**
 * GET: Get all indexable URLs
 */
export async function GET() {
  const urls: string[] = []

  // Static pages
  const staticPages = ['', '/blog', '/recommendations', '/events', '/about', '/contact', '/team']
  staticPages.forEach((page) => {
    urls.push(`${BASE_URL}${page}`)
  })

  // Blog posts
  allStaticPosts
    .filter((post) => post.published)
    .forEach((post) => {
      urls.push(`${BASE_URL}/blog/${post.slug}`)
    })

  return NextResponse.json({
    success: true,
    count: urls.length,
    urls,
    sitemapUrl: `${BASE_URL}/sitemap.xml`,
  })
}

/**
 * POST: Submit URLs for indexing
 * Body: { urls?: string[], all?: boolean, newContent?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls: customUrls, all = false, newContent = false } = body

    let urlsToSubmit: string[] = []

    if (customUrls && Array.isArray(customUrls)) {
      // Submit specific URLs
      urlsToSubmit = customUrls
    } else if (all) {
      // Submit all pages
      const staticPages = ['', '/blog', '/recommendations', '/events', '/about', '/contact']
      staticPages.forEach((page) => {
        urlsToSubmit.push(`${BASE_URL}${page}`)
      })
      allStaticPosts
        .filter((post) => post.published)
        .forEach((post) => {
          urlsToSubmit.push(`${BASE_URL}/blog/${post.slug}`)
        })
    } else if (newContent) {
      // Submit only new content (created in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      allStaticPosts
        .filter((post) => post.published && post.created_at >= sevenDaysAgo)
        .forEach((post) => {
          urlsToSubmit.push(`${BASE_URL}/blog/${post.slug}`)
        })
    } else {
      return NextResponse.json(
        { error: 'Please provide urls array, all: true, or newContent: true' },
        { status: 400 }
      )
    }

    if (urlsToSubmit.length === 0) {
      return NextResponse.json({ error: 'No URLs to submit' }, { status: 400 })
    }

    // Submit to multiple indexing services in parallel
    const [indexNowResult, sitemapPings] = await Promise.all([
      submitToIndexNow(urlsToSubmit),
      pingSitemaps(),
    ])

    return NextResponse.json({
      success: true,
      submitted: urlsToSubmit.length,
      urls: urlsToSubmit,
      results: {
        indexNow: indexNowResult,
        sitemapPings,
      },
    })
  } catch (error) {
    console.error('Indexing error:', error)
    return NextResponse.json({ error: 'Failed to submit URLs for indexing' }, { status: 500 })
  }
}
