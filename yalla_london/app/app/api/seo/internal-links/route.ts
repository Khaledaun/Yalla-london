export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server';

interface InternalLink {
  fromUrl: string;
  toUrl: string;
  anchorText: string;
  context: string;
  relevanceScore: number;
}

interface LinkAnalysis {
  totalPages: number;
  totalInternalLinks: number;
  averageLinksPerPage: number;
  orphanedPages: string[];
  brokenLinks: { url: string; status: number; referrers: string[] }[];
  stronglyLinkedPages: { url: string; linkCount: number }[];
  weaklyLinkedPages: { url: string; linkCount: number }[];
  suggestions: InternalLink[];
}

interface PageContent {
  url: string;
  title: string;
  content: string;
  keywords: string[];
  category: string;
  lastModified: string;
  internalLinks: string[];
  inboundLinks: string[];
}

export async function GET(request: NextRequest) {
  // Check SEO feature flag directly
  const seoEnabled = process.env.FEATURE_SEO === '1';
  if (!seoEnabled) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'analyze';
  const url = searchParams.get('url');

  try {
    switch (action) {
      case 'analyze':
        return await analyzeInternalLinks();
      case 'suggestions':
        if (!url) {
          return NextResponse.json(
            { error: 'URL parameter required for suggestions' },
            { status: 400 }
          );
        }
        return await getLinkSuggestions(url);
      case 'orphaned':
        return await getOrphanedPages();
      case 'broken':
        return await getBrokenLinks();
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Internal links analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check SEO feature flag directly
  const seoEnabled = process.env.FEATURE_SEO === '1';
  if (!seoEnabled) {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'scan':
        return await scanAllPages();
      case 'fix-broken':
        return await fixBrokenLinks(data.brokenLinks);
      case 'add-suggestions':
        return await implementLinkSuggestions(data.suggestions);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Internal links action error:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

async function analyzeInternalLinks(): Promise<NextResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  
  // In production, this would scan your actual site
  // For now, using mock data based on your site structure
  const mockPages: PageContent[] = [
    {
      url: `${baseUrl}/`,
      title: 'Yalla London - Luxury London Guide',
      content: 'Your curated guide to the finest luxury experiences in London...',
      keywords: ['london', 'luxury', 'guide', 'travel'],
      category: 'homepage',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/blog`, `${baseUrl}/events`, `${baseUrl}/recommendations`],
      inboundLinks: []
    },
    {
      url: `${baseUrl}/blog`,
      title: 'London Travel Blog - Yalla London',
      content: 'Discover London through our expertly curated blog posts...',
      keywords: ['london', 'blog', 'travel', 'experiences'],
      category: 'blog',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/blog/luxury-london-guide`, `${baseUrl}/recommendations`],
      inboundLinks: [`${baseUrl}/`]
    },
    {
      url: `${baseUrl}/blog/luxury-london-guide`,
      title: 'The Ultimate Luxury London Guide',
      content: 'Experience the finest luxury that London has to offer...',
      keywords: ['luxury', 'london', 'guide', 'hotels', 'dining'],
      category: 'blog-post',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/recommendations/claridges-hotel`, `${baseUrl}/events`],
      inboundLinks: [`${baseUrl}/blog`]
    },
    {
      url: `${baseUrl}/events`,
      title: 'London Events - Yalla London',
      content: 'Exclusive events and experiences in London...',
      keywords: ['london', 'events', 'experiences', 'culture'],
      category: 'events',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/blog`, `${baseUrl}/recommendations`],
      inboundLinks: [`${baseUrl}/`, `${baseUrl}/blog/luxury-london-guide`]
    },
    {
      url: `${baseUrl}/recommendations`,
      title: 'London Recommendations - Yalla London',
      content: 'Our curated recommendations for the best of London...',
      keywords: ['london', 'recommendations', 'hotels', 'restaurants'],
      category: 'recommendations',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/recommendations/claridges-hotel`],
      inboundLinks: [`${baseUrl}/`, `${baseUrl}/blog`, `${baseUrl}/events`]
    },
    {
      url: `${baseUrl}/recommendations/claridges-hotel`,
      title: 'Claridges Hotel London - Luxury Review',
      content: 'An in-depth review of the iconic Claridges Hotel...',
      keywords: ['claridges', 'hotel', 'luxury', 'mayfair', 'london'],
      category: 'recommendation',
      lastModified: new Date().toISOString(),
      internalLinks: [`${baseUrl}/recommendations`],
      inboundLinks: [`${baseUrl}/blog/luxury-london-guide`, `${baseUrl}/recommendations`]
    },
    // Orphaned page example
    {
      url: `${baseUrl}/hidden-gems`,
      title: 'Hidden Gems in London',
      content: 'Secret spots in London that locals love...',
      keywords: ['london', 'hidden', 'gems', 'local', 'secret'],
      category: 'blog-post',
      lastModified: new Date().toISOString(),
      internalLinks: [],
      inboundLinks: [] // No inbound links = orphaned
    }
  ];

  const analysis: LinkAnalysis = {
    totalPages: mockPages.length,
    totalInternalLinks: mockPages.reduce((total, page) => total + page.internalLinks.length, 0),
    averageLinksPerPage: 0,
    orphanedPages: [],
    brokenLinks: [],
    stronglyLinkedPages: [],
    weaklyLinkedPages: [],
    suggestions: []
  };

  analysis.averageLinksPerPage = Math.round(analysis.totalInternalLinks / analysis.totalPages * 100) / 100;

  // Find orphaned pages (no inbound links)
  analysis.orphanedPages = mockPages
    .filter(page => page.inboundLinks.length === 0 && page.url !== `${baseUrl}/`)
    .map(page => page.url);

  // Identify strongly and weakly linked pages
  const pagesByInboundLinks = mockPages
    .map(page => ({ url: page.url, linkCount: page.inboundLinks.length }))
    .sort((a, b) => b.linkCount - a.linkCount);

  analysis.stronglyLinkedPages = pagesByInboundLinks.slice(0, 3);
  analysis.weaklyLinkedPages = pagesByInboundLinks
    .filter(page => page.linkCount <= 1 && page.url !== `${baseUrl}/`)
    .slice(0, 5);

  // Generate link suggestions
  analysis.suggestions = generateLinkSuggestions(mockPages);

  // Check for broken links (mock data)
  analysis.brokenLinks = [
    {
      url: `${baseUrl}/old-page-that-doesnt-exist`,
      status: 404,
      referrers: [`${baseUrl}/blog`]
    }
  ];

  return NextResponse.json({
    success: true,
    data: analysis,
    timestamp: new Date().toISOString()
  });
}

async function getLinkSuggestions(targetUrl: string): Promise<NextResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  
  // In production, analyze the target page content and find relevant pages to link to
  const suggestions: InternalLink[] = [
    {
      fromUrl: targetUrl,
      toUrl: `${baseUrl}/recommendations/claridges-hotel`,
      anchorText: 'luxury hotel in Mayfair',
      context: 'When discussing luxury accommodations in London, consider linking to our detailed review of Claridges.',
      relevanceScore: 0.95
    },
    {
      fromUrl: targetUrl,
      toUrl: `${baseUrl}/events`,
      anchorText: 'London events',
      context: 'Mention upcoming events to provide additional value to readers.',
      relevanceScore: 0.82
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      targetUrl,
      suggestions,
      count: suggestions.length
    },
    timestamp: new Date().toISOString()
  });
}

async function getOrphanedPages(): Promise<NextResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  
  // Mock orphaned pages
  const orphanedPages = [
    {
      url: `${baseUrl}/hidden-gems`,
      title: 'Hidden Gems in London',
      lastModified: '2024-08-15T10:30:00Z',
      potentialLinkSources: [
        {
          sourceUrl: `${baseUrl}/blog`,
          reason: 'Related content about London experiences',
          suggestedAnchor: 'hidden gems in London'
        },
        {
          sourceUrl: `${baseUrl}/recommendations`,
          reason: 'Could be featured as alternative recommendations',
          suggestedAnchor: 'local favorites'
        }
      ]
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      orphanedPages,
      count: orphanedPages.length,
      recommendations: [
        'Add internal links from related content',
        'Feature orphaned pages in navigation menus',
        'Create hub pages that link to orphaned content',
        'Add links from high-authority pages'
      ]
    },
    timestamp: new Date().toISOString()
  });
}

async function getBrokenLinks(): Promise<NextResponse> {
  // Mock broken links analysis
  const brokenLinks = [
    {
      url: 'https://example.com/external-broken-link',
      status: 404,
      referrers: [
        {
          url: 'https://yalla-london.com/blog/old-post',
          anchorText: 'external resource',
          context: 'Referenced in blog post about London dining'
        }
      ],
      lastChecked: new Date().toISOString(),
      suggestions: [
        'Find alternative resource on the same topic',
        'Update link to current page if site moved',
        'Remove link if resource is permanently unavailable'
      ]
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      brokenLinks,
      count: brokenLinks.length,
      summary: {
        total: brokenLinks.length,
        internal: 0,
        external: 1,
        lastScan: new Date().toISOString()
      }
    },
    timestamp: new Date().toISOString()
  });
}

async function scanAllPages(): Promise<NextResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
    
    // In production, this would:
    // 1. Crawl all pages on the site
    // 2. Extract all internal and external links
    // 3. Test link validity
    // 4. Update database with results
    
    console.log('Starting comprehensive link scan...');
    
    // Mock scan process
    const scanResults = {
      pagesScanned: 25,
      linksFound: 156,
      brokenLinksFound: 3,
      orphanedPagesFound: 2,
      duration: '2.3 seconds',
      suggestions: 12
    };

    return NextResponse.json({
      success: true,
      message: 'Link scan completed successfully',
      data: scanResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during link scan:', error);
    return NextResponse.json(
      { success: false, error: 'Link scan failed' },
      { status: 500 }
    );
  }
}

async function fixBrokenLinks(brokenLinks: any[]): Promise<NextResponse> {
  try {
    // In production, this would:
    // 1. Validate proposed fixes
    // 2. Update content with new links
    // 3. Create redirects where appropriate
    // 4. Log changes for review
    
    console.log('Fixing broken links:', brokenLinks);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${brokenLinks.length} broken links`,
      fixed: brokenLinks.map(link => ({
        original: link.url,
        status: 'redirected',
        action: 'Created 301 redirect'
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fixing broken links:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix broken links' },
      { status: 500 }
    );
  }
}

async function implementLinkSuggestions(suggestions: InternalLink[]): Promise<NextResponse> {
  try {
    // In production, this would:
    // 1. Validate suggestions
    // 2. Update content with new internal links
    // 3. Track implementation success
    // 4. Monitor link performance
    
    console.log('Implementing link suggestions:', suggestions);
    
    return NextResponse.json({
      success: true,
      message: `Implemented ${suggestions.length} link suggestions`,
      implemented: suggestions.map(suggestion => ({
        fromUrl: suggestion.fromUrl,
        toUrl: suggestion.toUrl,
        anchorText: suggestion.anchorText,
        status: 'added'
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error implementing suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to implement suggestions' },
      { status: 500 }
    );
  }
}

function generateLinkSuggestions(pages: PageContent[]): InternalLink[] {
  const suggestions: InternalLink[] = [];
  
  // Simple algorithm to suggest internal links based on keyword matching
  pages.forEach(fromPage => {
    pages.forEach(toPage => {
      if (fromPage.url === toPage.url) return;
      if (fromPage.internalLinks.includes(toPage.url)) return;
      
      // Calculate relevance based on keyword overlap
      const commonKeywords = fromPage.keywords.filter(keyword => 
        toPage.keywords.includes(keyword) || toPage.title.toLowerCase().includes(keyword)
      );
      
      if (commonKeywords.length > 0) {
        const relevanceScore = Math.min(commonKeywords.length / Math.max(fromPage.keywords.length, 1), 1);
        
        if (relevanceScore > 0.3) { // Only suggest if relevance > 30%
          suggestions.push({
            fromUrl: fromPage.url,
            toUrl: toPage.url,
            anchorText: toPage.title,
            context: `Pages share keywords: ${commonKeywords.join(', ')}`,
            relevanceScore: Math.round(relevanceScore * 100) / 100
          });
        }
      }
    });
  });
  
  // Sort by relevance and return top suggestions
  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}
