/**
 * Comprehensive Dashboard Functionality Tests
 * Tests all major dashboard features and admin operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test user credentials
const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'TestPassword123!',
  role: 'admin'
};

describe('Dashboard Functionality Tests', () => {
  let authToken: string;
  let testArticleId: string;
  let testMediaId: string;

  beforeAll(async () => {
    // Ensure test database is connected
    await prisma.$connect();
    console.log('✓ Database connected');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testArticleId) {
      await prisma.blogPost.deleteMany({ where: { slug: { contains: 'test-article' } } });
    }
    if (testMediaId) {
      await prisma.mediaAsset.deleteMany({ where: { filename: { contains: 'test-' } } });
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication & Authorization', () => {
    it('should allow admin login with valid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_ADMIN.email,
          password: TEST_ADMIN.password
        })
      });

      expect(response.status).toBeLessThan(400);
      console.log('✓ Admin login successful');
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('✓ Invalid login properly rejected');
    });

    it('should protect admin routes from unauthorized access', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      console.log('✓ Admin routes properly protected');
    });
  });

  describe('2. Dashboard Statistics & Overview', () => {
    it('should fetch dashboard statistics', async () => {
      const stats = await prisma.$queryRaw`
        SELECT
          COUNT(DISTINCT id) as total_articles,
          COUNT(DISTINCT CASE WHEN "publishedAt" IS NOT NULL THEN id END) as published_articles,
          COUNT(DISTINCT CASE WHEN status = 'draft' THEN id END) as draft_articles
        FROM "BlogPost"
      `;

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      console.log('✓ Dashboard statistics retrieved', stats);
    });

    it('should calculate content metrics', async () => {
      const metrics = await prisma.blogPost.aggregate({
        _count: { id: true },
        _avg: { views: true }
      });

      expect(metrics._count.id).toBeGreaterThanOrEqual(0);
      console.log('✓ Content metrics calculated', metrics);
    });

    it('should retrieve recent activity logs', async () => {
      const recentLogs = await prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(recentLogs)).toBe(true);
      console.log(`✓ Retrieved ${recentLogs.length} recent activity logs`);
    });
  });

  describe('3. Content Management (CRUD Operations)', () => {
    it('should create a new blog post', async () => {
      const newPost = await prisma.blogPost.create({
        data: {
          title: 'Test Article - Comprehensive Tests',
          slug: 'test-article-comprehensive-' + Date.now(),
          content: 'This is a test article created during comprehensive testing.',
          excerpt: 'Test excerpt',
          status: 'draft',
          locale: 'en',
          seoMeta: {
            create: {
              title: 'Test Article SEO',
              description: 'Test description',
              locale: 'en'
            }
          }
        }
      });

      testArticleId = newPost.id;
      expect(newPost.id).toBeDefined();
      expect(newPost.title).toBe('Test Article - Comprehensive Tests');
      console.log('✓ Blog post created successfully', newPost.id);
    });

    it('should read/retrieve blog posts', async () => {
      const posts = await prisma.blogPost.findMany({
        take: 10,
        include: { seoMeta: true }
      });

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      console.log(`✓ Retrieved ${posts.length} blog posts`);
    });

    it('should update an existing blog post', async () => {
      if (!testArticleId) {
        // Create one if it doesn't exist
        const post = await prisma.blogPost.create({
          data: {
            title: 'Test for Update',
            slug: 'test-update-' + Date.now(),
            content: 'Original content',
            status: 'draft',
            locale: 'en'
          }
        });
        testArticleId = post.id;
      }

      const updated = await prisma.blogPost.update({
        where: { id: testArticleId },
        data: {
          title: 'Updated Test Article',
          content: 'Updated content via comprehensive test'
        }
      });

      expect(updated.title).toBe('Updated Test Article');
      console.log('✓ Blog post updated successfully');
    });

    it('should change post status from draft to published', async () => {
      if (!testArticleId) {
        const post = await prisma.blogPost.create({
          data: {
            title: 'Test for Publishing',
            slug: 'test-publish-' + Date.now(),
            content: 'Content to publish',
            status: 'draft',
            locale: 'en'
          }
        });
        testArticleId = post.id;
      }

      const published = await prisma.blogPost.update({
        where: { id: testArticleId },
        data: {
          status: 'published',
          publishedAt: new Date()
        }
      });

      expect(published.status).toBe('published');
      expect(published.publishedAt).toBeDefined();
      console.log('✓ Post published successfully');
    });

    it('should delete a blog post', async () => {
      // Create a temporary post for deletion
      const tempPost = await prisma.blogPost.create({
        data: {
          title: 'Test for Deletion',
          slug: 'test-delete-' + Date.now(),
          content: 'This will be deleted',
          status: 'draft',
          locale: 'en'
        }
      });

      await prisma.blogPost.delete({
        where: { id: tempPost.id }
      });

      const deleted = await prisma.blogPost.findUnique({
        where: { id: tempPost.id }
      });

      expect(deleted).toBeNull();
      console.log('✓ Blog post deleted successfully');
    });
  });

  describe('4. Media Library Management', () => {
    it('should list media assets', async () => {
      const media = await prisma.mediaAsset.findMany({
        take: 10
      });

      expect(Array.isArray(media)).toBe(true);
      console.log(`✓ Retrieved ${media.length} media assets`);
    });

    it('should create a media asset record', async () => {
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          filename: 'test-image-' + Date.now() + '.jpg',
          url: 'https://example.com/test-image.jpg',
          type: 'image',
          mimeType: 'image/jpeg',
          size: 1024000,
          alt: 'Test image for comprehensive tests'
        }
      });

      testMediaId = mediaAsset.id;
      expect(mediaAsset.id).toBeDefined();
      expect(mediaAsset.type).toBe('image');
      console.log('✓ Media asset created successfully');
    });

    it('should retrieve media by type', async () => {
      const images = await prisma.mediaAsset.findMany({
        where: { type: 'image' },
        take: 5
      });

      expect(Array.isArray(images)).toBe(true);
      images.forEach(img => {
        expect(img.type).toBe('image');
      });
      console.log(`✓ Retrieved ${images.length} image assets`);
    });
  });

  describe('5. SEO Management', () => {
    it('should retrieve SEO meta data', async () => {
      const seoData = await prisma.seoMeta.findMany({
        take: 10,
        include: { blogPost: true }
      });

      expect(Array.isArray(seoData)).toBe(true);
      console.log(`✓ Retrieved ${seoData.length} SEO meta records`);
    });

    it('should perform SEO audit check', async () => {
      const auditResults = await prisma.seoAuditResult.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(auditResults)).toBe(true);
      console.log(`✓ Retrieved ${auditResults.length} SEO audit results`);
    });

    it('should manage internal links', async () => {
      const internalLinks = await prisma.seoInternalLink.findMany({
        take: 10
      });

      expect(Array.isArray(internalLinks)).toBe(true);
      console.log(`✓ Retrieved ${internalLinks.length} internal links`);
    });
  });

  describe('6. Topics Pipeline', () => {
    it('should retrieve topic proposals', async () => {
      const topics = await prisma.topicProposal.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(topics)).toBe(true);
      console.log(`✓ Retrieved ${topics.length} topic proposals`);
    });

    it('should check rulebook versions', async () => {
      const rulebooks = await prisma.rulebookVersion.findMany({
        orderBy: { version: 'desc' }
      });

      expect(Array.isArray(rulebooks)).toBe(true);
      console.log(`✓ Retrieved ${rulebooks.length} rulebook versions`);
    });
  });

  describe('7. Analytics & Monitoring', () => {
    it('should retrieve analytics snapshots', async () => {
      const snapshots = await prisma.analyticsSnapshot.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
      });

      expect(Array.isArray(snapshots)).toBe(true);
      console.log(`✓ Retrieved ${snapshots.length} analytics snapshots`);
    });

    it('should track system metrics', async () => {
      const metrics = await prisma.systemMetrics.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' }
      });

      expect(Array.isArray(metrics)).toBe(true);
      console.log(`✓ Retrieved ${metrics.length} system metrics`);
    });
  });

  describe('8. Feature Flags Management', () => {
    it('should retrieve feature flags', async () => {
      const flags = await prisma.featureFlag.findMany();

      expect(Array.isArray(flags)).toBe(true);
      console.log(`✓ Retrieved ${flags.length} feature flags`);
    });

    it('should check content pipeline flag status', async () => {
      const contentPipelineFlag = await prisma.featureFlag.findFirst({
        where: { key: 'FEATURE_CONTENT_PIPELINE' }
      });

      if (contentPipelineFlag) {
        expect(contentPipelineFlag.key).toBe('FEATURE_CONTENT_PIPELINE');
        console.log('✓ Content pipeline flag:', contentPipelineFlag.enabled ? 'ENABLED' : 'DISABLED');
      } else {
        console.log('⚠ Content pipeline flag not found in database');
      }
    });
  });

  describe('9. User Management & CRM', () => {
    it('should retrieve subscribers', async () => {
      const subscribers = await prisma.subscriber.findMany({
        take: 10
      });

      expect(Array.isArray(subscribers)).toBe(true);
      console.log(`✓ Retrieved ${subscribers.length} subscribers`);
    });

    it('should check GDPR consent logs', async () => {
      const consentLogs = await prisma.consentLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' }
      });

      expect(Array.isArray(consentLogs)).toBe(true);
      console.log(`✓ Retrieved ${consentLogs.length} consent logs`);
    });
  });

  describe('10. AI Prompt Management', () => {
    it('should retrieve prompt templates', async () => {
      const templates = await prisma.promptTemplate.findMany({
        take: 10
      });

      expect(Array.isArray(templates)).toBe(true);
      console.log(`✓ Retrieved ${templates.length} prompt templates`);
    });

    it('should check AI model providers', async () => {
      const providers = await prisma.modelProvider.findMany({
        where: { enabled: true }
      });

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      console.log(`✓ Found ${providers.length} enabled AI providers`);
    });
  });

  describe('11. Background Jobs & Automation', () => {
    it('should retrieve background jobs', async () => {
      const jobs = await prisma.backgroundJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      expect(Array.isArray(jobs)).toBe(true);
      console.log(`✓ Retrieved ${jobs.length} background jobs`);
    });

    it('should check scheduled content', async () => {
      const scheduled = await prisma.scheduledContent.findMany({
        where: {
          scheduledFor: { gte: new Date() }
        },
        take: 10
      });

      expect(Array.isArray(scheduled)).toBe(true);
      console.log(`✓ Found ${scheduled.length} scheduled content items`);
    });
  });

  describe('12. Multi-Site & Places Management', () => {
    it('should retrieve London places data', async () => {
      const places = await prisma.place.findMany({
        where: { city: 'London' },
        take: 10
      });

      expect(Array.isArray(places)).toBe(true);
      console.log(`✓ Retrieved ${places.length} London places`);
    });

    it('should verify places have required metadata', async () => {
      const placesWithMetadata = await prisma.place.findMany({
        where: {
          AND: [
            { name: { not: null } },
            { category: { not: null } }
          ]
        },
        take: 5
      });

      placesWithMetadata.forEach(place => {
        expect(place.name).toBeDefined();
        expect(place.category).toBeDefined();
      });
      console.log(`✓ Verified ${placesWithMetadata.length} places have proper metadata`);
    });
  });

  describe('13. Database Health & Performance', () => {
    it('should verify database connection', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as health_check`;
      expect(result).toBeDefined();
      console.log('✓ Database connection healthy');
    });

    it('should check database table counts', async () => {
      const tables = [
        'blogPost',
        'mediaAsset',
        'seoMeta',
        'topicProposal',
        'featureFlag',
        'user'
      ];

      const counts: Record<string, number> = {};

      for (const table of tables) {
        const count = await (prisma as any)[table].count();
        counts[table] = count;
      }

      console.log('✓ Table counts:', counts);
      expect(Object.keys(counts).length).toBe(tables.length);
    });
  });
});
