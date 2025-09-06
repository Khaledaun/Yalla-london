
import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';

test.describe('API Integration Tests - Staging', () => {
  
  test.describe('Health & Infrastructure', () => {
    test('health check endpoint returns success', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/health`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('timestamp');
    });

    test('database connection is working', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/database/stats`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('tables');
      expect(Array.isArray(data.tables)).toBeTruthy();
    });
  });

  test.describe('Social Embeds API (Phase 3.2)', () => {
    let embedId: string;

    test('create Instagram embed', async ({ request }) => {
      const embedData = {
        platform: 'instagram',
        url: 'https://www.instagram.com/p/TEST123456/',
        title: 'Test Instagram Post',
        author: '@testuser'
      };

      const response = await request.post(`${STAGING_URL}/api/social-embeds`, {
        data: embedData
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data).toHaveProperty('id');
      expect(data.platform).toBe('instagram');
      expect(data.url).toBe(embedData.url);
      
      embedId = data.id;
    });

    test('get all social embeds', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/social-embeds`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
    });

    test('get social embed by ID', async ({ request }) => {
      if (!embedId) {
        test.skip();
      }

      const response = await request.get(`${STAGING_URL}/api/social-embeds/${embedId}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBe(embedId);
      expect(data.platform).toBe('instagram');
    });

    test('track embed usage', async ({ request }) => {
      if (!embedId) {
        test.skip();
      }

      const response = await request.post(`${STAGING_URL}/api/social-embeds/${embedId}/track-usage`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.usageCount).toBeGreaterThanOrEqual(1);
    });

    test('update social embed', async ({ request }) => {
      if (!embedId) {
        test.skip();
      }

      const updateData = {
        title: 'Updated Test Instagram Post',
        status: 'active'
      };

      const response = await request.patch(`${STAGING_URL}/api/social-embeds/${embedId}`, {
        data: updateData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.title).toBe(updateData.title);
    });

    test('create TikTok embed', async ({ request }) => {
      const embedData = {
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@testuser/video/1234567890123456789',
        title: 'Test TikTok Video',
        author: '@tiktoktester'
      };

      const response = await request.post(`${STAGING_URL}/api/social-embeds`, {
        data: embedData
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.platform).toBe('tiktok');
      expect(data.aspect_ratio).toBe('9:16');
    });

    test('create YouTube embed', async ({ request }) => {
      const embedData = {
        platform: 'youtube',
        url: 'https://www.youtube.com/watch?v=TEST123456',
        title: 'Test YouTube Video',
        author: 'Test Channel'
      };

      const response = await request.post(`${STAGING_URL}/api/social-embeds`, {
        data: embedData
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.platform).toBe('youtube');
      expect(data.aspect_ratio).toBe('16:9');
    });
  });

  test.describe('Media Library API (Phase 3.3)', () => {
    let assetId: string;

    test('get all media assets', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/media`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('filter media assets by type', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/media?fileType=image`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      
      if (data.length > 0) {
        expect(data[0].file_type).toBe('image');
      }
    });

    test('get media asset by ID', async ({ request }) => {
      // First get all assets to get an ID
      const allAssetsResponse = await request.get(`${STAGING_URL}/api/media`);
      const allAssets = await allAssetsResponse.json();
      
      if (allAssets.length === 0) {
        test.skip();
      }

      assetId = allAssets[0].id;
      
      const response = await request.get(`${STAGING_URL}/api/media/${assetId}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBe(assetId);
      expect(data).toHaveProperty('filename');
      expect(data).toHaveProperty('url');
    });

    test('update media asset metadata', async ({ request }) => {
      if (!assetId) {
        test.skip();
      }

      const updateData = {
        title: 'Updated Test Image',
        altText: 'Test image for staging validation',
        description: 'This is a test image used for validating the media library',
        tags: ['test', 'staging', 'validation'],
        licenseInfo: 'Creative Commons Attribution 4.0'
      };

      const response = await request.patch(`${STAGING_URL}/api/media/${assetId}`, {
        data: updateData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.title).toBe(updateData.title);
      expect(data.alt_text).toBe(updateData.altText);
      expect(data.tags).toEqual(updateData.tags);
    });

    test('set media asset role', async ({ request }) => {
      if (!assetId) {
        test.skip();
      }

      const roleData = {
        role: 'hero-image'
      };

      const response = await request.post(`${STAGING_URL}/api/media/${assetId}/set-role`, {
        data: roleData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.role).toBe('hero-image');
    });
  });

  test.describe('Homepage Builder API (Phase 3.4)', () => {
    let blockId: string;

    test('get all homepage blocks', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/homepage-blocks`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('create homepage block', async ({ request }) => {
      const blockData = {
        type: 'hero',
        title_en: 'Test Hero Block',
        title_ar: 'كتلة البطل الاختبار',
        content_en: 'This is a test hero block for staging',
        content_ar: 'هذه كتلة بطل اختبار للتنظيم',
        config: {
          backgroundColor: '#1a1a1a',
          textColor: '#ffffff'
        },
        position: 99,
        enabled: true,
        language: 'both'
      };

      const response = await request.post(`${STAGING_URL}/api/homepage-blocks`, {
        data: blockData
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data).toHaveProperty('id');
      expect(data.type).toBe('hero');
      expect(data.title_en).toBe(blockData.title_en);
      
      blockId = data.id;
    });

    test('get homepage block by ID', async ({ request }) => {
      if (!blockId) {
        test.skip();
      }

      const response = await request.get(`${STAGING_URL}/api/homepage-blocks/${blockId}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBe(blockId);
      expect(data.type).toBe('hero');
    });

    test('update homepage block', async ({ request }) => {
      if (!blockId) {
        test.skip();
      }

      const updateData = {
        title_en: 'Updated Test Hero Block',
        config: {
          backgroundColor: '#2a2a2a',
          textColor: '#ffffff'
        }
      };

      const response = await request.patch(`${STAGING_URL}/api/homepage-blocks/${blockId}`, {
        data: updateData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.title_en).toBe(updateData.title_en);
    });

    test('reorder homepage blocks', async ({ request }) => {
      if (!blockId) {
        test.skip();
      }

      const reorderData = {
        blocks: [
          { id: blockId, position: 50 }
        ]
      };

      const response = await request.post(`${STAGING_URL}/api/homepage-blocks/reorder`, {
        data: reorderData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('Database Backups API (Phase 3.5)', () => {
    let backupId: string;

    test('get database stats', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/database/stats`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('tables');
      expect(data).toHaveProperty('totalRecords');
    });

    test('get all database backups', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/database/backups`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('create manual backup', async ({ request }) => {
      const backupData = {
        backupName: 'staging-test-backup',
        backupType: 'manual'
      };

      const response = await request.post(`${STAGING_URL}/api/database/backups`, {
        data: backupData
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      
      expect(data).toHaveProperty('id');
      expect(data.backup_name).toBe(backupData.backupName);
      expect(data.backup_type).toBe(backupData.backupType);
      
      backupId = data.id;
    });

    test('get backup by ID', async ({ request }) => {
      if (!backupId) {
        test.skip();
      }

      const response = await request.get(`${STAGING_URL}/api/database/backups/${backupId}`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.id).toBe(backupId);
    });
  });

  test.describe('SEO & Content APIs', () => {
    test('generate SEO meta', async ({ request }) => {
      const metaData = {
        content: 'This is a test article about luxury hotels in London',
        language: 'en',
        contentType: 'blog_post'
      };

      const response = await request.post(`${STAGING_URL}/api/seo/generate-meta`, {
        data: metaData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('keywords');
    });

    test('generate sitemap', async ({ request }) => {
      const response = await request.get(`${STAGING_URL}/api/sitemap/generate`);
      expect(response.ok()).toBeTruthy();
      
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/xml');
    });

    test('analyze content for SEO', async ({ request }) => {
      const contentData = {
        title: 'Best Luxury Hotels in London 2024',
        content: 'London offers some of the world\'s most prestigious hotels with exceptional service and amenities.',
        targetKeywords: ['luxury hotels London', 'best hotels London']
      };

      const response = await request.post(`${STAGING_URL}/api/seo/analyze-content`, {
        data: contentData
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('suggestions');
      expect(Array.isArray(data.suggestions)).toBeTruthy();
    });
  });
});
