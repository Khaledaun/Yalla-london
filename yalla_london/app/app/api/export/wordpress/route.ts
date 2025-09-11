export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

/**
 * GET /api/export/wordpress
 * Admin-only endpoint for exporting content to WordPress format
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check if WordPress export feature is enabled
    if (!isFeatureEnabled('EXPORT_WORDPRESS')) {
      return NextResponse.json(
        { error: 'WordPress export feature is disabled' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'xml';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get published content for export
    const content = await prisma.scheduledContent.findMany({
      where: {
        published: true,
        status: 'published'
      },
      orderBy: {
        published_time: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        content: true,
        published_time: true,
        category: true,
        tags: true,
        seo_score: true,
        page_type: true,
        metadata: true
      }
    });

    if (format === 'xml') {
      // Generate WordPress WXR (WordPress eXtended RSS) format
      const wxrContent = generateWordPressWXR(content);
      
      return new NextResponse(wxrContent, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="wordpress-export-${new Date().toISOString().split('T')[0]}.xml"`
        }
      });
    } else if (format === 'json') {
      // Return JSON format for API consumption
      return NextResponse.json({
        status: 'success',
        export_info: {
          total_exported: content.length,
          format: 'json',
          timestamp: new Date().toISOString(),
          limit,
          offset
        },
        content: content.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          published_date: item.published_time,
          category: item.category,
          tags: item.tags,
          post_type: item.page_type || 'post',
          seo_score: item.seo_score,
          metadata: item.metadata
        }))
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use xml or json.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('WordPress export error:', error);
    return NextResponse.json(
      {
        error: 'WordPress export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/export/wordpress
 * Admin-only endpoint for bulk export operations
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    if (!isFeatureEnabled('EXPORT_WORDPRESS')) {
      return NextResponse.json(
        { error: 'WordPress export feature is disabled' },
        { status: 403 }
      );
    }

    const { content_ids, export_options } = await request.json();

    if (!content_ids || !Array.isArray(content_ids)) {
      return NextResponse.json(
        { error: 'content_ids array is required' },
        { status: 400 }
      );
    }

    // Get specific content by IDs
    const content = await prisma.scheduledContent.findMany({
      where: {
        id: { in: content_ids },
        published: true
      },
      select: {
        id: true,
        title: true,
        content: true,
        published_time: true,
        category: true,
        tags: true,
        seo_score: true,
        page_type: true,
        metadata: true
      }
    });

    const format = export_options?.format || 'json';

    if (format === 'xml') {
      const wxrContent = generateWordPressWXR(content);
      
      return new NextResponse(wxrContent, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="wordpress-bulk-export-${new Date().toISOString().split('T')[0]}.xml"`
        }
      });
    } else {
      return NextResponse.json({
        status: 'success',
        export_info: {
          requested_ids: content_ids.length,
          exported_count: content.length,
          format,
          timestamp: new Date().toISOString()
        },
        content: content
      });
    }

  } catch (error) {
    console.error('WordPress bulk export error:', error);
    return NextResponse.json(
      {
        error: 'WordPress bulk export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

function generateWordPressWXR(content: any[]): string {
  const siteName = process.env.SITE_NAME || 'Yalla London';
  const siteUrl = process.env.NEXTAUTH_URL || 'https://yalla-london.com';
  
  let wxr = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <title>${siteName}</title>
  <link>${siteUrl}</link>
  <description>WordPress Export from ${siteName}</description>
  <pubDate>${new Date().toUTCString()}</pubDate>
  <language>en-US</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${siteUrl}</wp:base_site_url>
  <wp:base_blog_url>${siteUrl}</wp:base_blog_url>
  <generator>Yalla London Export System</generator>
`;

  content.forEach((item, index) => {
    const postId = index + 1;
    const postDate = new Date(item.published_time).toISOString().replace('T', ' ').split('.')[0];
    
    wxr += `
  <item>
    <title><![CDATA[${item.title}]]></title>
    <link>${siteUrl}/posts/${item.id}</link>
    <pubDate>${new Date(item.published_time).toUTCString()}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <guid isPermaLink="false">${siteUrl}/?p=${postId}</guid>
    <description></description>
    <content:encoded><![CDATA[${item.content}]]></content:encoded>
    <excerpt:encoded><![CDATA[]]></excerpt:encoded>
    <wp:post_id>${postId}</wp:post_id>
    <wp:post_date>${postDate}</wp:post_date>
    <wp:post_date_gmt>${postDate}</wp:post_date_gmt>
    <wp:comment_status>open</wp:comment_status>
    <wp:ping_status>open</wp:ping_status>
    <wp:post_name>${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_parent>0</wp:post_parent>
    <wp:menu_order>0</wp:menu_order>
    <wp:post_type>${item.page_type || 'post'}</wp:post_type>
    <wp:post_password></wp:post_password>
    <wp:is_sticky>0</wp:is_sticky>
    <category domain="category" nicename="${item.category || 'uncategorized'}"><![CDATA[${item.category || 'Uncategorized'}]]></category>`;

    // Add tags
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach((tag: string) => {
        wxr += `
    <category domain="post_tag" nicename="${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"><![CDATA[${tag}]]></category>`;
      });
    }

    wxr += `
  </item>`;
  });

  wxr += `
</channel>
</rss>`;

  return wxr;
}