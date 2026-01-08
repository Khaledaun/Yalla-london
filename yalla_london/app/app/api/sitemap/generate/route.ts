export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


// Generate comprehensive sitemaps
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
    
    let sitemap: string;
    
    switch (type) {
      case 'index':
        sitemap = await generateSitemapIndex(baseUrl);
        break;
      case 'pages':
        sitemap = await generatePagesSitemap(baseUrl);
        break;
      case 'articles':
        sitemap = await generateArticlesSitemap(baseUrl);
        break;
      case 'events':
        sitemap = await generateEventsSitemap(baseUrl);
        break;
      case 'places':
        sitemap = await generatePlacesSitemap(baseUrl);
        break;
      case 'news':
        sitemap = await generateNewsSitemap(baseUrl);
        break;
      case 'images':
        sitemap = await generateImageSitemap(baseUrl);
        break;
      case 'videos':
        sitemap = await generateVideoSitemap(baseUrl);
        break;
      default:
        sitemap = await generateMainSitemap(baseUrl);
    }

    // Submit to Search Console if configured
    if (process.env.GOOGLE_SEARCH_CONSOLE_KEY) {
      try {
        await submitToSearchConsole(`${baseUrl}/sitemap-${type}.xml`);
      } catch (error) {
        console.warn('Failed to submit sitemap to Search Console:', error);
      }
    }

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200'
      }
    });

  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate sitemap' },
      { status: 500 }
    );
  }
}

async function generateSitemapIndex(baseUrl: string): Promise<string> {
  const sitemaps = [
    { name: 'pages', lastmod: new Date().toISOString() },
    { name: 'articles', lastmod: new Date().toISOString() },
    { name: 'events', lastmod: new Date().toISOString() },
    { name: 'places', lastmod: new Date().toISOString() },
    { name: 'news', lastmod: new Date().toISOString() },
    { name: 'images', lastmod: new Date().toISOString() },
    { name: 'videos', lastmod: new Date().toISOString() }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${baseUrl}/sitemap-${sitemap.name}.xml</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return xml;
}

async function generatePagesSitemap(baseUrl: string): Promise<string> {
  // Static pages with priorities and change frequencies
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/blog', priority: '0.9', changefreq: 'daily' },
    { url: '/events', priority: '0.9', changefreq: 'weekly' },
    { url: '/recommendations', priority: '0.9', changefreq: 'weekly' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    { url: '/contact', priority: '0.6', changefreq: 'monthly' },
    { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms-of-service', priority: '0.3', changefreq: 'yearly' }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${page.url}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/ar${page.url}" />
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

async function generateArticlesSitemap(baseUrl: string): Promise<string> {
  try {
    const articles = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true,
        updated_at: true,
        created_at: true,
        category: {
          select: { slug: true }
        }
      },
      orderBy: { updated_at: 'desc' },
      take: 50000 // Google limit
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${articles.map((article: any) => `  <url>
    <loc>${baseUrl}/blog/${article.slug}</loc>
    <lastmod>${article.updated_at.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/blog/${article.slug}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/ar/blog/${article.slug}" />
  </url>`).join('\n')}
</urlset>`;

    return xml;
  } catch (error) {
    console.error('Failed to generate articles sitemap:', error);
    return generateEmptySitemap();
  }
}

async function generateEventsSitemap(baseUrl: string): Promise<string> {
  // This would fetch from events table when implemented
  const events: any[] = []; // Placeholder

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${events.map((event: any) => `  <url>
    <loc>${baseUrl}/events/${event.slug}</loc>
    <lastmod>${event.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/events/${event.slug}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/ar/events/${event.slug}" />
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

async function generatePlacesSitemap(baseUrl: string): Promise<string> {
  try {
    const places = await prisma.recommendation.findMany({
      where: { published: true },
      select: {
        id: true,
        updated_at: true
      },
      orderBy: { updated_at: 'desc' },
      take: 50000
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${places.map((place: any) => `  <url>
    <loc>${baseUrl}/recommendations/${place.id}</loc>
    <lastmod>${place.updated_at.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/recommendations/${place.id}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/ar/recommendations/${place.id}" />
  </url>`).join('\n')}
</urlset>`;

    return xml;
  } catch (error) {
    console.error('Failed to generate places sitemap:', error);
    return generateEmptySitemap();
  }
}

async function generateNewsSitemap(baseUrl: string): Promise<string> {
  try {
    // Get articles from last 2 days (Google News requirement)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const newsArticles = await prisma.blogPost.findMany({
      where: { 
        published: true,
        created_at: { gte: twoDaysAgo }
      },
      select: {
        slug: true,
        title_en: true,
        created_at: true,
        category: {
          select: { name_en: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 1000 // Google News limit
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsArticles.map((article: any) => `  <url>
    <loc>${baseUrl}/blog/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Yalla London</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${article.created_at.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title_en)}</news:title>
      <news:keywords>${article.category?.name_en || 'london,travel'}</news:keywords>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

    return xml;
  } catch (error) {
    console.error('Failed to generate news sitemap:', error);
    return generateEmptySitemap();
  }
}

async function generateImageSitemap(baseUrl: string): Promise<string> {
  // This would collect images from all content when media library is implemented
  const images: any[] = []; // Placeholder

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${images.map((image: any) => `  <url>
    <loc>${baseUrl}${image.pageUrl}</loc>
    <image:image>
      <image:loc>${image.imageUrl}</image:loc>
      <image:title>${escapeXml(image.title)}</image:title>
      <image:caption>${escapeXml(image.caption)}</image:caption>
    </image:image>
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

async function generateVideoSitemap(baseUrl: string): Promise<string> {
  // This would collect videos from all content when video system is implemented
  const videos: any[] = []; // Placeholder

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${videos.map((video: any) => `  <url>
    <loc>${baseUrl}${video.pageUrl}</loc>
    <video:video>
      <video:thumbnail_loc>${video.thumbnailUrl}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:content_loc>${video.contentUrl}</video:content_loc>
      <video:duration>${video.duration}</video:duration>
      <video:publication_date>${video.publishDate}</video:publication_date>
    </video:video>
  </url>`).join('\n')}
</urlset>`;

  return xml;
}

async function generateMainSitemap(baseUrl: string): Promise<string> {
  // Fallback main sitemap combining key pages
  return await generatePagesSitemap(baseUrl);
}

function generateEmptySitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

async function submitToSearchConsole(sitemapUrl: string): Promise<void> {
  // This would use Google Search Console API to submit sitemap
  // Implementation depends on service account setup
  console.log(`Submitting sitemap to Search Console: ${sitemapUrl}`);
}
