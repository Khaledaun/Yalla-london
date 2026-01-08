
// Dynamic Sitemap Generator for SEO/AEO
export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  alternateUrls?: { lang: string; href: string }[];
  images?: { url: string; title?: string; caption?: string }[];
}

export interface SitemapIndex {
  url: string;
  lastModified: string;
}

export class SitemapGenerator {
  private baseUrl: string;
  private entries: SitemapEntry[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
    this.initializeStaticPages();
  }

  private initializeStaticPages() {
    const staticPages = [
      {
        path: '/',
        priority: 1.0,
        changeFreq: 'daily' as const
      },
      {
        path: '/about',
        priority: 0.8,
        changeFreq: 'monthly' as const
      },
      {
        path: '/contact',
        priority: 0.7,
        changeFreq: 'monthly' as const
      },
      {
        path: '/recommendations',
        priority: 0.9,
        changeFreq: 'weekly' as const
      },
      {
        path: '/events',
        priority: 0.9,
        changeFreq: 'daily' as const
      },
      {
        path: '/blog',
        priority: 0.8,
        changeFreq: 'daily' as const
      }
    ];

    staticPages.forEach(page => {
      // English version
      this.addEntry({
        url: `${this.baseUrl}${page.path}`,
        lastModified: new Date().toISOString(),
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternateUrls: [
          { lang: 'en', href: `${this.baseUrl}${page.path}` },
          { lang: 'ar', href: `${this.baseUrl}/ar${page.path}` }
        ]
      });

      // Arabic version
      this.addEntry({
        url: `${this.baseUrl}/ar${page.path}`,
        lastModified: new Date().toISOString(),
        changeFrequency: page.changeFreq,
        priority: page.priority,
        alternateUrls: [
          { lang: 'en', href: `${this.baseUrl}${page.path}` },
          { lang: 'ar', href: `${this.baseUrl}/ar${page.path}` }
        ]
      });
    });
  }

  addEntry(entry: SitemapEntry) {
    this.entries.push(entry);
  }

  addBlogPost(post: {
    slug: string;
    lastModified: string;
    language: 'en' | 'ar';
    images?: string[];
    title?: string;
  }) {
    const enUrl = `${this.baseUrl}/blog/${post.slug}`;
    const arUrl = `${this.baseUrl}/ar/blog/${post.slug}`;

    const imageEntries = post.images?.map(img => ({
      url: img,
      title: post.title,
      caption: post.title
    }));

    this.addEntry({
      url: post.language === 'en' ? enUrl : arUrl,
      lastModified: post.lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternateUrls: [
        { lang: 'en', href: enUrl },
        { lang: 'ar', href: arUrl }
      ],
      images: imageEntries
    });
  }

  addEvent(event: {
    slug: string;
    lastModified: string;
    startDate: string;
    language: 'en' | 'ar';
    images?: string[];
    title?: string;
  }) {
    const enUrl = `${this.baseUrl}/events/${event.slug}`;
    const arUrl = `${this.baseUrl}/ar/events/${event.slug}`;

    // Higher priority for upcoming events
    const eventDate = new Date(event.startDate);
    const isUpcoming = eventDate > new Date();
    const priority = isUpcoming ? 0.9 : 0.6;

    const imageEntries = event.images?.map(img => ({
      url: img,
      title: event.title,
      caption: event.title
    }));

    this.addEntry({
      url: event.language === 'en' ? enUrl : arUrl,
      lastModified: event.lastModified,
      changeFrequency: 'daily',
      priority: priority,
      alternateUrls: [
        { lang: 'en', href: enUrl },
        { lang: 'ar', href: arUrl }
      ],
      images: imageEntries
    });
  }

  addRecommendation(recommendation: {
    slug: string;
    category: string;
    lastModified: string;
    language: 'en' | 'ar';
    images?: string[];
    title?: string;
  }) {
    const enUrl = `${this.baseUrl}/recommendations/${recommendation.category}/${recommendation.slug}`;
    const arUrl = `${this.baseUrl}/ar/recommendations/${recommendation.category}/${recommendation.slug}`;

    const imageEntries = recommendation.images?.map(img => ({
      url: img,
      title: recommendation.title,
      caption: recommendation.title
    }));

    this.addEntry({
      url: recommendation.language === 'en' ? enUrl : arUrl,
      lastModified: recommendation.lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternateUrls: [
        { lang: 'en', href: enUrl },
        { lang: 'ar', href: arUrl }
      ],
      images: imageEntries
    });
  }

  // Generate main sitemap XML
  generateSitemapXML(): string {
    const urlEntries = this.entries.map(entry => {
      let urlXml = `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>`;

      // Add alternate language links
      if (entry.alternateUrls) {
        entry.alternateUrls.forEach(alt => {
          urlXml += `
    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`;
        });
      }

      // Add image entries
      if (entry.images) {
        entry.images.forEach(image => {
          urlXml += `
    <image:image>
      <image:loc>${image.url}</image:loc>
      ${image.title ? `<image:title>${this.escapeXml(image.title)}</image:title>` : ''}
      ${image.caption ? `<image:caption>${this.escapeXml(image.caption)}</image:caption>` : ''}
    </image:image>`;
        });
      }

      urlXml += `
  </url>`;
      return urlXml;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
  }

  // Generate sitemap index for large sites
  generateSitemapIndex(sitemaps: string[]): string {
    const sitemapEntries = sitemaps.map(sitemap => `  <sitemap>
    <loc>${this.baseUrl}/${sitemap}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  }

  // Generate robots.txt with sitemap reference
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Block admin and API routes from crawling
Disallow: /admin
Disallow: /api/
Disallow: /_next/
Disallow: /auth/

# Allow important bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot  
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

# Sitemap locations
Sitemap: ${this.baseUrl}/sitemap.xml
Sitemap: ${this.baseUrl}/sitemap-blog.xml
Sitemap: ${this.baseUrl}/sitemap-events.xml
Sitemap: ${this.baseUrl}/sitemap-recommendations.xml

# Host declaration
Host: ${this.baseUrl}`;
  }

  // Generate news sitemap for fresh content
  generateNewsSitemap(articles: Array<{
    url: string;
    title: string;
    publishDate: string;
    language: 'en' | 'ar';
    keywords?: string[];
  }>): string {
    const newsEntries = articles
      .filter(article => {
        // Only include articles from last 2 days for news sitemap
        const articleDate = new Date(article.publishDate);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        return articleDate >= twoDaysAgo;
      })
      .map(article => `  <url>
    <loc>${article.url}</loc>
    <news:news>
      <news:publication>
        <news:name>Yalla London</news:name>
        <news:language>${article.language === 'ar' ? 'ar' : 'en'}</news:language>
      </news:publication>
      <news:publication_date>${article.publishDate}</news:publication_date>
      <news:title>${this.escapeXml(article.title)}</news:title>
      ${article.keywords ? `<news:keywords>${this.escapeXml(article.keywords.join(', '))}</news:keywords>` : ''}
    </news:news>
  </url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsEntries}
</urlset>`;
  }

  // Generate video sitemap for video content
  generateVideoSitemap(videos: Array<{
    pageUrl: string;
    videoUrl: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    duration?: number;
    publishDate?: string;
    tags?: string[];
  }>): string {
    const videoEntries = videos.map(video => `  <url>
    <loc>${video.pageUrl}</loc>
    <video:video>
      <video:thumbnail_loc>${video.thumbnailUrl}</video:thumbnail_loc>
      <video:title>${this.escapeXml(video.title)}</video:title>
      <video:description>${this.escapeXml(video.description)}</video:description>
      <video:content_loc>${video.videoUrl}</video:content_loc>
      ${video.duration ? `<video:duration>${video.duration}</video:duration>` : ''}
      ${video.publishDate ? `<video:publication_date>${video.publishDate}</video:publication_date>` : ''}
      ${video.tags ? `<video:tag>${video.tags.join('</video:tag><video:tag>')}</video:tag>` : ''}
    </video:video>
  </url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${videoEntries}
</urlset>`;
  }

  // Get all entries for processing
  getEntries(): SitemapEntry[] {
    return this.entries;
  }

  // Clear all entries (useful for regeneration)
  clearEntries() {
    this.entries = [];
    this.initializeStaticPages();
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const sitemapGenerator = new SitemapGenerator();
