import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'

// GET - Fetch SEO data and issues
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    
    switch (type) {
      case 'overview':
        return NextResponse.json({
          healthScore: 87,
          totalPages: 45,
          indexedPages: 38,
          issuesFound: 12,
          lastCrawl: new Date().toISOString(),
          avgLoadTime: 2.3,
          mobileFriendly: 95,
          recentActivity: [
            {
              id: '1',
              action: 'Fixed 3 missing meta descriptions',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              type: 'fix'
            },
            {
              id: '2',
              action: 'Found 2 new thin content pages',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              type: 'issue'
            },
            {
              id: '3',
              action: 'Optimized 5 image alt texts',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              type: 'fix'
            }
          ]
        })
        
      case 'issues':
        return NextResponse.json({
          issues: [
            {
              id: '1',
              type: 'missing_meta',
              severity: 'high',
              title: 'Missing Meta Description',
              description: 'Page lacks a meta description which is crucial for search engine snippets',
              pageUrl: '/blog/london-attractions',
              suggestions: [
                'Add a compelling meta description between 150-160 characters',
                'Include primary keyword naturally'
              ],
              quickFix: { action: 'Generate meta description', automated: true },
              status: 'pending',
              detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '2',
              type: 'thin_content',
              severity: 'medium',
              title: 'Thin Content Detected',
              description: 'Page content is below recommended word count for comprehensive coverage',
              pageUrl: '/events/summer-festival',
              suggestions: [
                'Expand content to at least 800 words',
                'Add more detailed information about the event'
              ],
              status: 'pending',
              detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '3',
              type: 'image_alt',
              severity: 'low',
              title: 'Missing Alt Text',
              description: 'Images without alt text affect accessibility and SEO',
              pageUrl: '/recommendations/restaurants',
              suggestions: [
                'Add descriptive alt text to all images',
                'Include relevant keywords in alt text'
              ],
              quickFix: { action: 'Generate alt text', automated: true },
              status: 'pending',
              detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '4',
              type: 'weak_structure',
              severity: 'medium',
              title: 'Weak Heading Structure',
              description: 'Page lacks proper H1-H6 hierarchy for better content organization',
              pageUrl: '/guide/london-transport',
              suggestions: [
                'Add a clear H1 tag with primary keyword',
                'Use H2 tags for main sections',
                'Maintain logical heading hierarchy'
              ],
              status: 'pending',
              detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
            },
            {
              id: '5',
              type: 'internal_links',
              severity: 'low',
              title: 'Missing Internal Links',
              description: 'Page has few internal links, missing opportunities for SEO and user navigation',
              pageUrl: '/attractions/tower-bridge',
              suggestions: [
                'Add links to related attractions',
                'Link to relevant blog posts',
                'Include contextual internal links'
              ],
              status: 'pending',
              detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
            }
          ]
        })
        
      case 'crawler':
        return NextResponse.json({
          config: {
            frequency: 'daily',
            includePatterns: ['/blog/*', '/events/*', '/recommendations/*', '/guide/*'],
            excludePatterns: ['/admin/*', '/api/*', '/_next/*'],
            maxPages: 100,
            timeout: 30
          },
          history: [
            {
              id: '1',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              pagesCrawled: 45,
              issuesFound: 12,
              status: 'completed',
              duration: 180
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
              pagesCrawled: 45,
              issuesFound: 8,
              status: 'completed',
              duration: 165
            },
            {
              id: '3',
              timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
              pagesCrawled: 42,
              issuesFound: 15,
              status: 'completed',
              duration: 195
            }
          ]
        })
        
      case 'quick-fixes':
        return NextResponse.json({
          availableFixes: [
            {
              id: 'meta-descriptions',
              title: 'Generate Meta Descriptions',
              description: 'Auto-generate meta descriptions for pages missing them',
              count: 5,
              automated: true,
              estimatedTime: '2 minutes'
            },
            {
              id: 'alt-text',
              title: 'Add Alt Text to Images',
              description: 'Generate descriptive alt text for images',
              count: 12,
              automated: true,
              estimatedTime: '5 minutes'
            },
            {
              id: 'internal-links',
              title: 'Optimize Internal Links',
              description: 'Suggest internal linking opportunities',
              count: 3,
              automated: false,
              estimatedTime: '15 minutes'
            },
            {
              id: 'broken-links',
              title: 'Fix Broken Links',
              description: 'Identify and fix broken internal/external links',
              count: 2,
              automated: true,
              estimatedTime: '1 minute'
            },
            {
              id: 'compress-images',
              title: 'Compress Images',
              description: 'Optimize image file sizes for faster loading',
              count: 8,
              automated: true,
              estimatedTime: '10 minutes'
            },
            {
              id: 'schema-markup',
              title: 'Add Schema Markup',
              description: 'Add structured data markup to pages',
              count: 7,
              automated: true,
              estimatedTime: '3 minutes'
            }
          ]
        })
        
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('SEO Command Center API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SEO data' },
      { status: 500 }
    )
  }
})

// POST - Apply quick fixes or run crawler
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, data } = body
    
    switch (action) {
      case 'run-crawler':
        // Simulate crawler execution
        return NextResponse.json({
          success: true,
          message: 'Crawler started successfully',
          jobId: `crawl_${Date.now()}`
        })
        
      case 'apply-quick-fix':
        const { fixId, issueIds } = data
        
        // Simulate quick fix application
        return NextResponse.json({
          success: true,
          message: `Applied ${fixId} to ${issueIds.length} items`,
          fixedItems: issueIds,
          timestamp: new Date().toISOString()
        })
        
      case 'update-crawler-config':
        const { config } = data
        
        // Simulate config update
        return NextResponse.json({
          success: true,
          message: 'Crawler configuration updated',
          config
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('SEO Command Center POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})
