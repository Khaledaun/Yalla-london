/**
 * E2E Login Flow Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Login Flow', () => {
  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/admin/login');
    
    // Check that we're on the login page
    await expect(page).toHaveURL(/.*\/admin\/login/);
    await expect(page.locator('h1')).toContainText('Admin Login');
    
    // Fill in login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator('h1')).toContainText('Command Center');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error, .alert-error')).toBeVisible();
  });

  test('should redirect to login when accessing admin without auth', async ({ page }) => {
    // Try to access admin dashboard directly
    await page.goto('/admin');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*\/admin\/login/);
  });
});
