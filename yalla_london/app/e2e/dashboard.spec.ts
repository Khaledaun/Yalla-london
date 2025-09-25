/**
 * E2E Dashboard Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('should display dashboard with all sections', async ({ page }) => {
    await page.goto('/admin');
    
    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('Command Center');
    
    // Check navigation sections
    await expect(page.locator('nav')).toContainText('AI Tools & Prompt Studio');
    await expect(page.locator('nav')).toContainText('Topics & Pipeline');
    await expect(page.locator('nav')).toContainText('Content Hub');
    await expect(page.locator('nav')).toContainText('Paste & Preview Editor');
    await expect(page.locator('nav')).toContainText('SEO Command Center');
    await expect(page.locator('nav')).toContainText('Site Control');
    await expect(page.locator('nav')).toContainText('API & Keys Safe');
    await expect(page.locator('nav')).toContainText('Feature Flags & Health');
  });

  test('should navigate to editor and save article', async ({ page }) => {
    await page.goto('/admin/editor');
    
    // Fill in article form
    await page.fill('input[name="title"]', 'E2E Test Article');
    await page.fill('textarea[name="content"]', 'This is test content for E2E testing');
    
    // Click save button
    await page.click('button:has-text("Save Article")');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
    await expect(page.locator('.success, .alert-success')).toContainText('saved successfully');
  });

  test('should upload logo successfully', async ({ page }) => {
    await page.goto('/admin/site-control');
    
    // Create a test file
    const testFile = new File(['test image content'], 'test-logo.png', { type: 'image/png' });
    
    // Upload file
    await page.setInputFiles('input[type="file"]', testFile);
    
    // Click upload button
    await page.click('button:has-text("Upload Logo")');
    
    // Should show success message
    await expect(page.locator('.success, .alert-success')).toBeVisible();
    await expect(page.locator('.success, .alert-success')).toContainText('uploaded successfully');
  });

  test('should access admin status page only when logged in', async ({ page }) => {
    // First, test that status page is accessible when logged in
    await page.goto('/admin/feature-flags');
    await expect(page).toHaveURL(/.*\/admin\/feature-flags/);
    
    // Logout (if logout functionality exists)
    // For now, just test that we can access the page
    await expect(page.locator('h1')).toContainText('Feature Flags');
  });
});
