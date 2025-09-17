#!/usr/bin/env tsx
/**
 * Article Ingestion Script
 * Fetches existing articles from https://yalla-london.com/articles/ and imports them into Supabase
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ArticleData {
  title: string
  url: string
  published_date?: string
  locale: string
  category?: string
  excerpt?: string
  author?: string
  featured_image?: string
  content?: string
}

// Extract article metadata from HTML
function extractArticleMetadata(html: string, url: string): ArticleData | null {
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Extract title
    const title = document.querySelector('h1')?.textContent?.trim() ||
                  document.querySelector('title')?.textContent?.trim() ||
                  document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                  'Untitled Article'

    // Extract published date
    const publishedDate = document.querySelector('time[datetime]')?.getAttribute('datetime') ||
                         document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                         document.querySelector('.published-date')?.textContent?.trim()

    // Extract excerpt/description
    const excerpt = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                   document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                   document.querySelector('.excerpt')?.textContent?.trim()

    // Extract category from URL or content
    let category = 'general'
    if (url.includes('/travel/')) category = 'london-travel'
    else if (url.includes('/food/')) category = 'london-food'
    else if (url.includes('/events/')) category = 'london-events'
    else if (url.includes('/shopping/')) category = 'london-shopping'
    else if (url.includes('/culture/')) category = 'london-culture'

    // Extract content
    const contentElement = document.querySelector('article') ||
                          document.querySelector('.content') ||
                          document.querySelector('main')
    const content = contentElement?.textContent?.trim() || ''

    // Extract featured image
    const featuredImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                         document.querySelector('.featured-image img')?.getAttribute('src')

    // Determine locale from URL or content
    const locale = url.includes('/ar/') || url.includes('/arabic/') ? 'ar' : 'en'

    return {
      title: title.substring(0, 500), // Limit title length
      url,
      published_date: publishedDate,
      locale,
      category,
      excerpt: excerpt?.substring(0, 1000), // Limit excerpt length
      featured_image: featuredImage,
      content: content.substring(0, 10000) // Limit content length for now
    }
  } catch (error) {
    console.error(`Error extracting metadata from ${url}:`, error)
    return null
  }
}

// Fetch article URLs from the main articles page
async function fetchArticleUrls(): Promise<string[]> {
  try {
    console.log('🔍 Fetching article URLs from https://yalla-london.com/articles/')
    
    const response = await axios.get('https://yalla-london.com/articles/', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YallaLondonBot/1.0; +https://yalla-london.com)'
      }
    })

    const dom = new JSDOM(response.data)
    const document = dom.window.document

    // Extract article links
    const articleLinks: string[] = []
    
    // Common selectors for article links
    const linkSelectors = [
      'a[href*="/article/"]',
      'a[href*="/articles/"]',
      '.article-link',
      '.post-link',
      'article a',
      '.content a[href*="yalla-london.com"]'
    ]

    for (const selector of linkSelectors) {
      const links = document.querySelectorAll(selector)
      links.forEach(link => {
        const href = link.getAttribute('href')
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `https://yalla-london.com${href}`
          if (fullUrl.includes('yalla-london.com') && !articleLinks.includes(fullUrl)) {
            articleLinks.push(fullUrl)
          }
        }
      })
    }

    // Also try to find pagination links for more articles
    const paginationLinks = document.querySelectorAll('a[href*="page="], a[href*="/page/"]')
    const additionalPages: string[] = []
    
    paginationLinks.forEach(link => {
      const href = link.getAttribute('href')
      if (href && !additionalPages.includes(href)) {
        const fullUrl = href.startsWith('http') ? href : `https://yalla-london.com${href}`
        additionalPages.push(fullUrl)
      }
    })

    // Fetch additional pages (limit to first 3 pages to avoid overwhelming)
    for (const pageUrl of additionalPages.slice(0, 3)) {
      try {
        console.log(`🔍 Fetching additional page: ${pageUrl}`)
        const pageResponse = await axios.get(pageUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; YallaLondonBot/1.0; +https://yalla-london.com)'
          }
        })

        const pageDom = new JSDOM(pageResponse.data)
        const pageDocument = pageDom.window.document

        for (const selector of linkSelectors) {
          const links = pageDocument.querySelectorAll(selector)
          links.forEach(link => {
            const href = link.getAttribute('href')
            if (href) {
              const fullUrl = href.startsWith('http') ? href : `https://yalla-london.com${href}`
              if (fullUrl.includes('yalla-london.com') && !articleLinks.includes(fullUrl)) {
                articleLinks.push(fullUrl)
              }
            }
          })
        }
      } catch (error) {
        console.warn(`⚠️  Failed to fetch page ${pageUrl}:`, error.message)
      }
    }

    console.log(`✅ Found ${articleLinks.length} article URLs`)
    return articleLinks.slice(0, 50) // Limit to first 50 articles for initial import

  } catch (error) {
    console.error('❌ Error fetching article URLs:', error)
    return []
  }
}

// Fetch and process individual articles
async function ingestArticles(): Promise<void> {
  console.log('🚀 Starting article ingestion process...')

  const articleUrls = await fetchArticleUrls()
  if (articleUrls.length === 0) {
    console.log('❌ No article URLs found. Exiting.')
    return
  }

  const successfulIngestions: ArticleData[] = []
  const failedUrls: string[] = []

  for (const [index, url] of articleUrls.entries()) {
    try {
      console.log(`📄 Processing article ${index + 1}/${articleUrls.length}: ${url}`)

      // Check if article already exists
      const { data: existingArticle } = await supabase
        .from('scheduled_content')
        .select('id')
        .eq('metadata->source_url', url)
        .single()

      if (existingArticle) {
        console.log(`⏭️  Article already exists, skipping: ${url}`)
        continue
      }

      // Fetch article content
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YallaLondonBot/1.0; +https://yalla-london.com)'
        }
      })

      // Extract metadata
      const articleData = extractArticleMetadata(response.data, url)
      if (!articleData) {
        console.warn(`⚠️  Failed to extract metadata from: ${url}`)
        failedUrls.push(url)
        continue
      }

      // Prepare data for Supabase
      const scheduledContentData = {
        title: articleData.title,
        content: articleData.content || articleData.excerpt || 'Content extraction failed',
        content_type: 'blog_post',
        language: articleData.locale,
        category: articleData.category,
        tags: [articleData.category, 'imported', 'yalla-london'],
        metadata: {
          source_url: url,
          published_date: articleData.published_date,
          excerpt: articleData.excerpt,
          featured_image: articleData.featured_image,
          import_date: new Date().toISOString(),
          import_source: 'website_scraper'
        },
        scheduled_time: articleData.published_date || new Date().toISOString(),
        published_time: articleData.published_date || null,
        status: 'published',
        published: true,
        generation_source: 'imported'
      }

      // Insert into Supabase
      const { data, error } = await supabase
        .from('scheduled_content')
        .insert([scheduledContentData])
        .select()
        .single()

      if (error) {
        console.error(`❌ Failed to insert article ${url}:`, error)
        failedUrls.push(url)
      } else {
        console.log(`✅ Successfully ingested: ${articleData.title}`)
        successfulIngestions.push(articleData)
      }

      // Add delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message)
      failedUrls.push(url)
    }
  }

  console.log('\n🎉 Article ingestion completed!')
  console.log(`✅ Successfully ingested: ${successfulIngestions.length} articles`)
  console.log(`❌ Failed: ${failedUrls.length} articles`)

  if (failedUrls.length > 0) {
    console.log('\n❌ Failed URLs:')
    failedUrls.forEach(url => console.log(`   - ${url}`))
  }
}

// CLI interface
async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'ingest':
      await ingestArticles()
      break

    case 'urls':
      const urls = await fetchArticleUrls()
      console.log('Found URLs:')
      urls.forEach((url, index) => console.log(`${index + 1}. ${url}`))
      break

    default:
      console.log('Usage: tsx scripts/ingest-articles.ts [ingest|urls]')
      console.log('  ingest - Fetch and import articles from yalla-london.com')
      console.log('  urls   - Just list the article URLs found')
      process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
}

export { ingestArticles, fetchArticleUrls }