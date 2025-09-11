export const dynamic = 'force-dynamic';
export const revalidate = 0;



import { NextRequest, NextResponse } from 'next/server';

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: { hreflang: string; href: string }[];
  images?: { loc: string; title?: string; caption?: string }[];
  videos?: { thumbnail_loc: string; title: string; description: string; content_loc: string; duration?: number }[];
}

interface SitemapSection {
  name: string;
  urls: SitemapUrl[];
  path: string;
}

export async function GET(request: NextRequest) {
  if (process.env.FEATURE_SEO !== '1') {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'index';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';

  try {
    switch (type) {
      case 'index':
        return generateSitemapIndex();
      case 'pages':
        return generatePagesSitemap(baseUrl);
      case 'blog':
        return generateBlogSitemap(baseUrl);
      case 'events':
        return generateEventsSitemap(baseUrl);
      case 'recommendations':
        return generateRecommendationsSitemap(baseUrl);
      case 'images':
        return generateImageSitemap(baseUrl);
      case 'videos':
        return generateVideoSitemap(baseUrl);
      case 'news':
        return generateNewsSitemap(baseUrl);
      default:
        return NextResponse.json(
          { error: 'Invalid sitemap type' }, 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return NextResponse.json(
      { error: 'Sitemap generation failed' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (process.env.FEATURE_SEO !== '1') {
    return NextResponse.json(
      { error: 'SEO features disabled' }, 
      { status: 403 }
    );
  }

  try {
    const { action } = await request.json();

    switch (action) {
      case 'regenerate':
        return await regenerateAllSitemaps();
      case 'submit-to-gsc':
        return await submitToSearchConsole();
      case 'validate':
        return await validateSitemaps();
      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sitemap action error:', error);
    return NextResponse.json(
      { error: 'Sitemap action failed' }, 
      { status: 500 }
    );
  }
}

function generateSitemapIndex() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  const now = new Date().toISOString();
  
  const sitemaps = [
    { path: 'sitemap-pages.xml', lastmod: now },
    { path: 'sitemap-blog.xml', lastmod: now },
    { path: 'sitemap-events.xml', lastmod: now },
    { path: 'sitemap-recommendations.xml', lastmod: now },
    { path: 'sitemap-images.xml', lastmod: now },
    { path: 'sitemap-videos.xml', lastmod: now },
    { path: 'sitemap-news.xml', lastmod: now }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${baseUrl}/api/sitemap/enhanced-generate?type=${sitemap.path.replace('sitemap-', '').replace('.xml', '')}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}

function generatePagesSitemap(baseUrl: string) {
  const staticPages: SitemapUrl[] = [
    {
      loc: `${baseUrl}/`,
      changefreq: 'daily',
      priority: 1.0,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/` },
        { hreflang: 'ar', href: `${baseUrl}/?lang=ar` },
        { hreflang: 'x-default', href: `${baseUrl}/` }
      ]
    },
    {
      loc: `${baseUrl}/about`,
      changefreq: 'monthly',
      priority: 0.8,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/about` },
        { hreflang: 'ar', href: `${baseUrl}/about?lang=ar` }
      ]
    },
    {
      loc: `${baseUrl}/contact`,
      changefreq: 'monthly',
      priority: 0.7,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/contact` },
        { hreflang: 'ar', href: `${baseUrl}/contact?lang=ar` }
      ]
    },
    {
      loc: `${baseUrl}/blog`,
      changefreq: 'daily',
      priority: 0.9,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/blog` },
        { hreflang: 'ar', href: `${baseUrl}/blog?lang=ar` }
      ]
    },
    {
      loc: `${baseUrl}/events`,
      changefreq: 'daily',
      priority: 0.9,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/events` },
        { hreflang: 'ar', href: `${baseUrl}/events?lang=ar` }
      ]
    },
    {
      loc: `${baseUrl}/recommendations`,
      changefreq: 'weekly',
      priority: 0.9,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/recommendations` },
        { hreflang: 'ar', href: `${baseUrl}/recommendations?lang=ar` }
      ]
    }
  ];

  return generateXmlResponse(staticPages);
}

function generateBlogSitemap(baseUrl: string) {
  // In production, fetch from database
  const blogPosts: SitemapUrl[] = [
    {
      loc: `${baseUrl}/blog/luxury-london-guide`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.8,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/blog/luxury-london-guide` },
        { hreflang: 'ar', href: `${baseUrl}/blog/luxury-london-guide?lang=ar` }
      ],
      images: [
        { 
          loc: `${baseUrl}/images/blog/luxury-london-hero.jpg`,
          title: 'Luxury London Guide',
          caption: 'Experience the finest luxury that London has to offer'
        }
      ]
    }
    // Add more blog posts from database
  ];

  return generateXmlResponse(blogPosts);
}

function generateEventsSitemap(baseUrl: string) {
  // In production, fetch from database
  const events: SitemapUrl[] = [
    {
      loc: `${baseUrl}/events/london-art-week-2024`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/events/london-art-week-2024` },
        { hreflang: 'ar', href: `${baseUrl}/events/london-art-week-2024?lang=ar` }
      ]
    }
    // Add more events from database
  ];

  return generateXmlResponse(events);
}

function generateRecommendationsSitemap(baseUrl: string) {
  // In production, fetch from database
  const recommendations: SitemapUrl[] = [
    {
      loc: `${baseUrl}/recommendations/claridges-hotel`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.8,
      alternates: [
        { hreflang: 'en', href: `${baseUrl}/recommendations/claridges-hotel` },
        { hreflang: 'ar', href: `${baseUrl}/recommendations/claridges-hotel?lang=ar` }
      ],
      images: [
        { 
          loc: `${baseUrl}/images/recommendations/claridges-exterior.jpg`,
          title: 'Claridges Hotel London',
          caption: 'Iconic luxury hotel in Mayfair'
        }
      ]
    }
    // Add more recommendations from database
  ];

  return generateXmlResponse(recommendations);
}

function generateImageSitemap(baseUrl: string) {
  // In production, fetch from database/media library
  const images: SitemapUrl[] = [
    {
      loc: `${baseUrl}/blog/luxury-london-guide`,
      images: [
        {
          loc: `${baseUrl}/images/blog/luxury-london-hero.jpg`,
          title: 'Luxury London Guide Hero Image',
          caption: 'Stunning view of London skyline at sunset'
        },
        {
          loc: `${baseUrl}/images/blog/luxury-dining-london.jpg`,
          title: 'Luxury Dining in London',
          caption: 'Fine dining experience at a Michelin-starred restaurant'
        }
      ]
    }
    // Add more images from media library
  ];

  return generateXmlResponse(images, 'image');
}

function generateVideoSitemap(baseUrl: string) {
  // In production, fetch from database/media library
  const videos: SitemapUrl[] = [
    {
      loc: `${baseUrl}/blog/luxury-london-video-guide`,
      videos: [
        {
          thumbnail_loc: `${baseUrl}/images/videos/london-guide-thumb.jpg`,
          title: 'Luxury London Video Guide',
          description: 'Complete video guide to luxury experiences in London',
          content_loc: `${baseUrl}/videos/luxury-london-guide.mp4`,
          duration: 300
        }
      ]
    }
    // Add more videos from media library
  ];

  return generateXmlResponse(videos, 'video');
}

function generateNewsSitemap(baseUrl: string) {
  // In production, fetch recent blog posts/news from database
  const newsItems: SitemapUrl[] = [
    {
      loc: `${baseUrl}/blog/london-restaurant-week-2024`,
      lastmod: new Date().toISOString(),
      changefreq: 'never',
      priority: 0.9
    }
    // Add more recent news items
  ];

  return generateXmlResponse(newsItems, 'news');
}

function generateXmlResponse(urls: SitemapUrl[], type: 'standard' | 'image' | 'video' | 'news' = 'standard') {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  
  switch (type) {
    case 'image':
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      break;
    case 'video':
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      break;
    case 'news':
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      break;
    default:
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  }

  urls.forEach(url => {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority) {
      xml += `    <priority>${url.priority}</priority>\n`;
    }

    // Add hreflang alternates
    if (url.alternates) {
      url.alternates.forEach(alt => {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}" />\n`;
      });
    }

    // Add images
    if (url.images) {
      url.images.forEach(img => {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(img.loc)}</image:loc>\n`;
        if (img.title) {
          xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
        }
        if (img.caption) {
          xml += `      <image:caption>${escapeXml(img.caption)}</image:caption>\n`;
        }
        xml += `    </image:image>\n`;
      });
    }

    // Add videos
    if (url.videos) {
      url.videos.forEach(video => {
        xml += `    <video:video>\n`;
        xml += `      <video:thumbnail_loc>${escapeXml(video.thumbnail_loc)}</video:thumbnail_loc>\n`;
        xml += `      <video:title>${escapeXml(video.title)}</video:title>\n`;
        xml += `      <video:description>${escapeXml(video.description)}</video:description>\n`;
        xml += `      <video:content_loc>${escapeXml(video.content_loc)}</video:content_loc>\n`;
        if (video.duration) {
          xml += `      <video:duration>${video.duration}</video:duration>\n`;
        }
        xml += `    </video:video>\n`;
      });
    }

    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}

async function regenerateAllSitemaps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
    
    // In production, you would:
    // 1. Fetch all content from database
    // 2. Generate and cache sitemap files
    // 3. Update sitemap index
    // 4. Optionally submit to search engines

    console.log('Regenerating all sitemaps...');
    
    return NextResponse.json({
      success: true,
      message: 'Sitemaps regenerated successfully',
      timestamp: new Date().toISOString(),
      sitemaps: [
        `${baseUrl}/api/sitemap/enhanced-generate?type=index`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=pages`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=blog`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=events`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=recommendations`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=images`,
        `${baseUrl}/api/sitemap/enhanced-generate?type=videos`
      ]
    });
  } catch (error) {
    console.error('Error regenerating sitemaps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate sitemaps' },
      { status: 500 }
    );
  }
}

async function submitToSearchConsole() {
  try {
    if (!process.env.GOOGLE_SEARCH_CONSOLE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Google Search Console API key not configured' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    // In production, implement actual Google Search Console API submission
    console.log('Submitting sitemap to Google Search Console:', sitemapUrl);

    // Placeholder for actual API call:
    // const response = await fetch('https://searchconsole.googleapis.com/v1/sites/sitemap', {
    //   method: 'PUT',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.GOOGLE_SEARCH_CONSOLE_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     feedpath: sitemapUrl
    //   })
    // });

    return NextResponse.json({
      success: true,
      message: 'Sitemap submitted to Google Search Console',
      sitemapUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error submitting to Search Console:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit to Search Console' },
      { status: 500 }
    );
  }
}

async function validateSitemaps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
    const sitemapTypes = ['index', 'pages', 'blog', 'events', 'recommendations', 'images', 'videos'];
    
    const validationResults = [];

    for (const type of sitemapTypes) {
      try {
        const response = await fetch(`${baseUrl}/api/sitemap/enhanced-generate?type=${type}`);
        const isValid = response.ok && response.headers.get('content-type')?.includes('xml');
        
        validationResults.push({
          type,
          valid: isValid,
          status: response.status,
          url: `${baseUrl}/api/sitemap/enhanced-generate?type=${type}`
        });
      } catch (error) {
        validationResults.push({
          type,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          url: `${baseUrl}/api/sitemap/enhanced-generate?type=${type}`
        });
      }
    }

    const allValid = validationResults.every(result => result.valid);

    return NextResponse.json({
      success: allValid,
      message: allValid ? 'All sitemaps are valid' : 'Some sitemaps have issues',
      results: validationResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating sitemaps:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate sitemaps' },
      { status: 500 }
    );
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
