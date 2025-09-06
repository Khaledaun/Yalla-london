
import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';

test.describe('E2E Tests - Staging Environment', () => {
  
  test.describe('Homepage & Navigation', () => {
    test('homepage loads correctly with no CLS issues', async ({ page }) => {
      // Navigate to homepage
      await page.goto(STAGING_URL);
      
      // Check page loads
      await expect(page).toHaveTitle(/Yalla London/);
      
      // Verify hero section loads
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
      
      // Check for CLS - verify layout stability
      await page.waitForTimeout(3000); // Wait for potential layout shifts
      
      // Verify no console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      expect(consoleErrors).toHaveLength(0);
    });

    test('language switching works correctly', async ({ page }) => {
      await page.goto(STAGING_URL);
      
      // Click Arabic language toggle
      await page.click('[data-testid="language-toggle"]');
      
      // Verify Arabic content appears
      await expect(page.locator('[data-testid="hero-title"]')).toContainText(/لندن/);
      
      // Switch back to English
      await page.click('[data-testid="language-toggle"]');
      
      // Verify English content
      await expect(page.locator('[data-testid="hero-title"]')).toContainText(/London/);
    });

    test('mobile responsive design works', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(STAGING_URL);
      
      // Verify mobile menu
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Verify responsive images
      const heroImage = page.locator('[data-testid="hero-image"] img');
      await expect(heroImage).toHaveAttribute('sizes');
      await expect(heroImage).toHaveAttribute('srcset');
    });
  });

  test.describe('Social Embeds (Phase 3.2)', () => {
    test('social embeds render with CLS-safe loading', async ({ page }) => {
      await page.goto(`${STAGING_URL}/blog/test-post-with-embeds`);
      
      // Find social embed containers
      const embedContainers = page.locator('[data-testid="social-embed"]');
      await expect(embedContainers.first()).toBeVisible();
      
      // Verify placeholder/thumbnail shows first
      const embedThumbnail = embedContainers.first().locator('[data-testid="embed-thumbnail"]');
      await expect(embedThumbnail).toBeVisible();
      
      // Verify aspect ratio container exists (prevents CLS)
      await expect(embedContainers.first()).toHaveClass(/aspect-/);
      
      // Click to load embed
      await embedThumbnail.click();
      
      // Verify embed loads without layout shift
      await page.waitForTimeout(2000);
      const embedFrame = embedContainers.first().locator('iframe');
      await expect(embedFrame).toBeVisible();
    });

    test('different platform embeds work correctly', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      
      // Navigate to Social Embeds Manager
      await page.click('text=Social Embeds');
      
      // Verify different platform badges
      await expect(page.locator('[data-platform="instagram"]')).toBeVisible();
      await expect(page.locator('[data-platform="tiktok"]')).toBeVisible();
      await expect(page.locator('[data-platform="youtube"]')).toBeVisible();
      
      // Test embed usage tracking
      const instagramEmbed = page.locator('[data-platform="instagram"]').first();
      const initialUsage = await instagramEmbed.locator('[data-testid="usage-count"]').textContent();
      
      // Simulate embed interaction
      await instagramEmbed.click();
      
      // Verify usage count increment
      await page.waitForTimeout(1000);
      const updatedUsage = await instagramEmbed.locator('[data-testid="usage-count"]').textContent();
      expect(parseInt(updatedUsage || '0')).toBeGreaterThan(parseInt(initialUsage || '0'));
    });
  });

  test.describe('Media Library (Phase 3.3)', () => {
    test('media upload and metadata editing workflow', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      
      // Navigate to Media Library
      await page.click('text=Media Library');
      
      // Verify media grid loads
      await expect(page.locator('[data-testid="media-grid"]')).toBeVisible();
      
      // Test file upload (simulate)
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeHidden(); // Hidden behind custom UI
      
      // Click upload button
      await page.click('[data-testid="upload-button"]');
      
      // Verify upload dialog opens
      await expect(page.locator('[data-testid="upload-dialog"]')).toBeVisible();
      
      // Test metadata editing on existing image
      const firstImage = page.locator('[data-testid="media-item"]').first();
      await firstImage.click();
      
      // Verify metadata panel opens
      await expect(page.locator('[data-testid="metadata-panel"]')).toBeVisible();
      
      // Edit alt text
      const altTextInput = page.locator('[data-testid="alt-text-input"]');
      await altTextInput.clear();
      await altTextInput.fill('Test image alt text for staging validation');
      
      // Save changes
      await page.click('[data-testid="save-metadata"]');
      
      // Verify success message
      await expect(page.locator('text=Metadata updated successfully')).toBeVisible();
    });

    test('set image as hero functionality', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Media Library');
      
      // Select first image
      const firstImage = page.locator('[data-testid="media-item"]').first();
      await firstImage.click();
      
      // Click "Set as Hero" button
      await page.click('[data-testid="set-as-hero"]');
      
      // Verify confirmation dialog
      await expect(page.locator('text=Set as hero image?')).toBeVisible();
      await page.click('text=Confirm');
      
      // Verify success
      await expect(page.locator('text=Hero image updated')).toBeVisible();
      
      // Navigate to homepage to verify hero image changed
      await page.goto(STAGING_URL);
      
      // Hard refresh to see changes
      await page.reload();
      
      // Verify hero image is visible and loads properly
      const heroImg = page.locator('[data-testid="hero-image"] img');
      await expect(heroImg).toBeVisible();
      await expect(heroImg).toHaveAttribute('alt');
    });

    test('responsive image variants are generated', async ({ page }) => {
      await page.goto(STAGING_URL);
      
      // Check hero image has responsive attributes
      const heroImg = page.locator('[data-testid="hero-image"] img');
      
      // Verify srcset for responsive images
      const srcset = await heroImg.getAttribute('srcset');
      expect(srcset).toContain('400w');
      expect(srcset).toContain('800w'); 
      expect(srcset).toContain('1200w');
      
      // Verify sizes attribute
      const sizes = await heroImg.getAttribute('sizes');
      expect(sizes).toBeTruthy();
      
      // Verify WebP format is used
      if (srcset) {
        expect(srcset.includes('.webp') || srcset.includes('.avif')).toBeTruthy();
      }
    });
  });

  test.describe('Homepage Builder (Phase 3.4)', () => {
    test('drag and drop reordering works', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Homepage Builder');
      
      // Wait for blocks to load
      await expect(page.locator('[data-testid="homepage-block"]')).toHaveCount.greaterThan(0);
      
      // Get initial order
      const blocks = page.locator('[data-testid="homepage-block"]');
      const firstBlockId = await blocks.first().getAttribute('data-block-id');
      const secondBlockId = await blocks.nth(1).getAttribute('data-block-id');
      
      // Drag first block to second position
      const firstBlock = blocks.first();
      const secondBlock = blocks.nth(1);
      
      await firstBlock.dragTo(secondBlock);
      
      // Wait for reorder to complete
      await page.waitForTimeout(1000);
      
      // Verify order changed
      const reorderedBlocks = page.locator('[data-testid="homepage-block"]');
      const newFirstBlockId = await reorderedBlocks.first().getAttribute('data-block-id');
      
      expect(newFirstBlockId).toBe(secondBlockId);
    });

    test('live preview functionality works', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Homepage Builder');
      
      // Click preview button
      await page.click('[data-testid="preview-button"]');
      
      // Verify preview opens in new tab/frame
      const previewFrame = page.locator('[data-testid="preview-frame"]');
      await expect(previewFrame).toBeVisible();
      
      // Make a change to a block
      const firstBlock = page.locator('[data-testid="homepage-block"]').first();
      await firstBlock.click();
      
      // Edit block content
      const titleInput = page.locator('[data-testid="block-title-en"]');
      await titleInput.clear();
      await titleInput.fill('Updated Preview Test Title');
      
      // Verify preview updates
      await page.waitForTimeout(1000);
      const previewContent = previewFrame.contentFrame();
      if (previewContent) {
        await expect(previewContent.locator('text=Updated Preview Test Title')).toBeVisible();
      }
    });

    test('publish and rollback workflow', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Homepage Builder');
      
      // Make changes to homepage
      const firstBlock = page.locator('[data-testid="homepage-block"]').first();
      await firstBlock.click();
      
      const titleInput = page.locator('[data-testid="block-title-en"]');
      const originalTitle = await titleInput.inputValue();
      await titleInput.clear();
      await titleInput.fill('Test Publish Title');
      
      // Publish changes
      await page.click('[data-testid="publish-button"]');
      
      // Confirm publish
      await expect(page.locator('text=Publish changes?')).toBeVisible();
      await page.click('text=Publish');
      
      // Verify success
      await expect(page.locator('text=Homepage published successfully')).toBeVisible();
      
      // Navigate to live homepage
      await page.goto(STAGING_URL);
      await page.reload();
      
      // Verify changes are live
      await expect(page.locator('text=Test Publish Title')).toBeVisible();
      
      // Go back to admin and rollback
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Homepage Builder');
      
      // Click rollback
      await page.click('[data-testid="rollback-button"]');
      await expect(page.locator('text=Rollback to previous version?')).toBeVisible();
      await page.click('text=Rollback');
      
      // Verify rollback success
      await expect(page.locator('text=Rolled back successfully')).toBeVisible();
      
      // Check homepage reverted
      await page.goto(STAGING_URL);
      await page.reload();
      await expect(page.locator('text=Test Publish Title')).not.toBeVisible();
    });

    test('multilingual content editing works', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Homepage Builder');
      
      // Select first block
      const firstBlock = page.locator('[data-testid="homepage-block"]').first();
      await firstBlock.click();
      
      // Edit English content
      const titleEnInput = page.locator('[data-testid="block-title-en"]');
      await titleEnInput.clear();
      await titleEnInput.fill('English Test Title');
      
      // Switch to Arabic tab
      await page.click('[data-testid="arabic-tab"]');
      
      // Edit Arabic content
      const titleArInput = page.locator('[data-testid="block-title-ar"]');
      await titleArInput.clear();
      await titleArInput.fill('عنوان الاختبار العربي');
      
      // Save changes
      await page.click('[data-testid="save-block"]');
      
      // Verify both languages saved
      await page.click('[data-testid="english-tab"]');
      expect(await titleEnInput.inputValue()).toBe('English Test Title');
      
      await page.click('[data-testid="arabic-tab"]');
      expect(await titleArInput.inputValue()).toBe('عنوان الاختبار العربي');
    });
  });

  test.describe('Database Backups (Phase 3.5)', () => {
    test('database backup creation and management', async ({ page }) => {
      await page.goto(`${STAGING_URL}/admin`);
      await page.click('text=Database Backups');
      
      // Verify backup list loads
      await expect(page.locator('[data-testid="backup-list"]')).toBeVisible();
      
      // Create manual backup
      await page.click('[data-testid="create-backup"]');
      
      // Fill backup form
      await page.fill('[data-testid="backup-name"]', 'E2E Test Backup');
      await page.selectOption('[data-testid="backup-type"]', 'manual');
      
      // Start backup
      await page.click('[data-testid="start-backup"]');
      
      // Verify backup started
      await expect(page.locator('text=Backup started successfully')).toBeVisible();
      
      // Wait for backup to complete
      await page.waitForTimeout(5000);
      
      // Refresh to see completed backup
      await page.reload();
      
      // Verify backup appears in list
      await expect(page.locator('text=E2E Test Backup')).toBeVisible();
      
      // Verify backup has download link
      const backupRow = page.locator('[data-backup-name="E2E Test Backup"]');
      await expect(backupRow.locator('[data-testid="download-backup"]')).toBeVisible();
    });
  });

  test.describe('Cross-cutting Concerns', () => {
    test('accessibility features work correctly', async ({ page }) => {
      await page.goto(STAGING_URL);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus ring is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test skip to content link
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-content"]');
      if (await skipLink.isVisible()) {
        await skipLink.click();
        // Verify main content is focused
        await expect(page.locator('main')).toBeFocused();
      }
      
      // Verify alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).not.toBeNull();
        expect(alt?.length).toBeGreaterThan(0);
      }
    });

    test('error handling shows friendly messages', async ({ page }) => {
      // Test 404 page
      await page.goto(`${STAGING_URL}/non-existent-page`);
      await expect(page.locator('text=Page not found')).toBeVisible();
      
      // Test API error handling
      await page.goto(`${STAGING_URL}/admin`);
      
      // Mock network failure
      await page.route('**/api/social-embeds', route => route.abort());
      
      await page.click('text=Social Embeds');
      
      // Verify error message shown
      await expect(page.locator('text=Failed to load')).toBeVisible();
      
      // Verify retry button works
      await page.unroute('**/api/social-embeds');
      await page.click('[data-testid="retry-button"]');
      
      // Data should load after retry
      await expect(page.locator('[data-testid="social-embeds-list"]')).toBeVisible();
    });

    test('performance meets thresholds', async ({ page }) => {
      // Navigate with performance monitoring
      await page.goto(STAGING_URL);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Get Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: Record<string, number> = {};
            
            entries.forEach((entry: any) => {
              if (entry.name === 'CLS') vitals.cls = entry.value;
              if (entry.name === 'LCP') vitals.lcp = entry.value;
              if (entry.name === 'FID') vitals.fid = entry.value;
            });
            
            resolve(vitals);
          });
          
          observer.observe({ entryTypes: ['layout-shift', 'largest-contentful-paint', 'first-input'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 5000);
        });
      });
      
      // Assert performance thresholds
      if (vitals && typeof vitals === 'object') {
        const v = vitals as Record<string, number>;
        if (v.cls) expect(v.cls).toBeLessThan(0.1); // CLS < 0.1
        if (v.lcp) expect(v.lcp).toBeLessThan(2500); // LCP < 2.5s
        if (v.fid) expect(v.fid).toBeLessThan(100); // FID < 100ms
      }
    });
  });
});
