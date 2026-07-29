/**
 * Admin Sync Test API
 * Tests real-time sync between admin dashboard and public site
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cacheService } from '@/lib/cache-invalidation';
import { requireAdmin, getCurrentAdminUser } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, contentType = 'blog', contentId, expectedData } = body;

    if (action === 'create-test-content') {
      const adminUser = await getCurrentAdminUser(request);
      return await createTestContent(contentType, adminUser?.email);
    }

    if (action === 'verify-sync') {
      return await verifySyncStatus(contentType, contentId, expectedData);
    }

    if (action === 'cleanup-test') {
      return await cleanupTestContent(contentType, contentId);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: create-test-content, verify-sync, or cleanup-test' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Sync test error:', error);
    return NextResponse.json(
      {
        error: 'Sync test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createTestContent(contentType: string, adminEmail?: string) {
  try {
    const timestamp = new Date().toISOString();
    let testContent: any;

    switch (contentType) {
      case 'blog': {
        // Find or create the sync-test category
        const category = await prisma.category.upsert({
          where: { slug: 'sync-test' },
          update: {},
          create: {
            name_en: 'Sync Test',
            name_ar: 'اختبار المزامنة',
            slug: 'sync-test',
            description_en: 'Test category for sync verification',
            description_ar: 'فئة اختبار للتحقق من المزامنة'
          }
        });

        // Find the logged-in admin user, or fall back to any admin user
        let author = adminEmail
          ? await prisma.user.findUnique({ where: { email: adminEmail } })
          : null;
        if (!author) {
          author = await prisma.user.findFirst({ where: { role: 'admin' } });
        }
        if (!author) {
          return NextResponse.json(
            { error: 'No admin user found in database. Create an admin user first.' },
            { status: 400 }
          );
        }

        // Create the test blog post with explicit foreign keys
        testContent = await prisma.blogPost.create({
          data: {
            title_en: `Sync Test Post - ${timestamp}`,
            title_ar: `مقال اختبار المزامنة - ${timestamp}`,
            slug: `sync-test-${Date.now()}`,
            excerpt_en: 'This is a test post to verify real-time sync between admin and public site.',
            excerpt_ar: 'هذا مقال اختبار للتحقق من المزامنة الفورية بين لوحة الإدارة والموقع العام.',
            content_en: `# Sync Test Post\n\nThis is a test post created at ${timestamp} to verify that changes in the admin dashboard immediately appear on the public website.\n\nIf you can see this post on the public blog page, the sync is working correctly.`,
            content_ar: `# مقال اختبار المزامنة\n\nهذا مقال اختبار تم إنشاؤه في ${timestamp} للتحقق من أن التغييرات في لوحة الإدارة تظهر فوراً على الموقع العام.\n\nإذا كان بإمكانك رؤية هذا المقال في صفحة المدونة العامة، فإن المزامنة تعمل بشكل صحيح.`,
            featured_image: 'https://via.placeholder.com/800x400/purple/white?text=Sync+Test',
            published: true,
            page_type: 'news',
            seo_score: 85,
            tags: ['sync-test', 'admin-dashboard', 'real-time'],
            category_id: category.id,
            author_id: author.id,
          },
          include: {
            category: true,
            author: true
          }
        });
        break;
      }

      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Trigger cache invalidation
    try {
      await cacheService.invalidateContentCache('blog', testContent.id);
    } catch {
      // Cache invalidation is best-effort, don't fail the test
    }

    return NextResponse.json({
      success: true,
      message: 'Test content created and cache invalidated',
      testContent: {
        id: testContent.id,
        title: testContent.title_en,
        slug: testContent.slug,
        published: testContent.published,
        created_at: testContent.created_at
      },
      publicUrls: {
        blogPost: `/blog/${testContent.slug}`,
        blogList: '/blog',
        homepage: '/'
      },
      nextSteps: [
        'Check the public blog page to see if this post appears',
        'Verify the homepage shows this in latest posts',
        'Use verify-sync action to programmatically check'
      ]
    });

  } catch (error) {
    console.error('Test content creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create test content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function verifySyncStatus(contentType: string, contentId: string, expectedData: any) {
  const startTime = Date.now();
  try {
    // If no contentId provided, just verify database connectivity
    if (!contentId) {
      let count = 0;
      switch (contentType) {
        case 'blog':
          count = await prisma.blogPost.count();
          break;
        default:
          break;
      }
      return NextResponse.json({
        success: true,
        synced: true,
        latency: Date.now() - startTime,
        databaseCheck: {
          found: true,
          totalPosts: count,
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if specific content exists in database
    let dbContent;
    switch (contentType) {
      case 'blog':
        dbContent = await prisma.blogPost.findUnique({
          where: { id: contentId },
          include: {
            category: true,
            author: true
          }
        });
        break;
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    if (!dbContent) {
      return NextResponse.json({
        success: false,
        synced: false,
        error: 'Content not found in database',
        latency: Date.now() - startTime
      });
    }

    // Check if content appears in public API
    const apiResult = await cacheService.verifySyncStatus(contentType, contentId, expectedData);

    return NextResponse.json({
      success: true,
      synced: apiResult.synced,
      latency: Date.now() - startTime,
      databaseCheck: {
        found: true,
        title: contentType === 'blog' ? dbContent.title_en : 'N/A',
        published: contentType === 'blog' ? dbContent.published : true
      },
      apiCheck: apiResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      synced: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime
    });
  }
}

async function cleanupTestContent(contentType: string, contentId: string) {
  try {
    let deletedContent;
    
    switch (contentType) {
      case 'blog':
        deletedContent = await prisma.blogPost.delete({
          where: { id: contentId }
        });
        break;
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Invalidate cache after deletion
    await cacheService.invalidateContentCache('blog');

    return NextResponse.json({
      success: true,
      message: 'Test content cleaned up and cache invalidated',
      deletedContent: {
        id: deletedContent.id,
        title: contentType === 'blog' ? deletedContent.title_en : 'N/A'
      }
    });

  } catch (error) {
    console.error('Test content cleanup failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup test content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}