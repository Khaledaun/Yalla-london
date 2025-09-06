
import { test, expect } from '@playwright/test';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000';

test.describe('JSON-LD Structured Data Tests', () => {
  
  test('homepage has valid organization JSON-LD', async ({ page }) => {
    await page.goto(STAGING_URL);
    
    // Extract JSON-LD scripts
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    expect(jsonLdScripts.length).toBeGreaterThan(0);
    
    // Check Organization schema
    let organizationSchema: any = null;
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'Organization') {
          organizationSchema = data;
          break;
        }
      }
    }
    
    expect(organizationSchema).toBeTruthy();
    expect(organizationSchema['@context']).toBe('https://schema.org');
    expect(organizationSchema['@type']).toBe('Organization');
    expect(organizationSchema.name).toBe('Yalla London');
    expect(organizationSchema.url).toContain('yalla-london');
    expect(organizationSchema.logo).toBeTruthy();
    expect(organizationSchema.address).toBeTruthy();
    expect(organizationSchema.address['@type']).toBe('PostalAddress');
    expect(organizationSchema.address.addressCountry).toBe('GB');
  });

  test('homepage has valid website JSON-LD', async ({ page }) => {
    await page.goto(STAGING_URL);
    
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    let websiteSchema: any = null;
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'WebSite') {
          websiteSchema = data;
          break;
        }
      }
    }
    
    expect(websiteSchema).toBeTruthy();
    expect(websiteSchema['@context']).toBe('https://schema.org');
    expect(websiteSchema['@type']).toBe('WebSite');
    expect(websiteSchema.name).toBe('Yalla London');
    expect(websiteSchema.url).toContain('yalla-london');
    expect(websiteSchema.potentialAction).toBeTruthy();
    expect(websiteSchema.potentialAction['@type']).toBe('SearchAction');
  });

  test('blog post page has valid article JSON-LD', async ({ page }) => {
    // Navigate to blog listing first
    await page.goto(`${STAGING_URL}/blog`);
    
    // Click on first blog post
    const firstPost = page.locator('[data-testid="blog-post-link"]').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();
    
    // Wait for post page to load
    await page.waitForSelector('article');
    
    // Extract JSON-LD scripts
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    let articleSchema: any = null;
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
          articleSchema = data;
          break;
        }
      }
    }
    
    expect(articleSchema).toBeTruthy();
    expect(articleSchema['@context']).toBe('https://schema.org');
    expect(['Article', 'BlogPosting']).toContain(articleSchema['@type']);
    expect(articleSchema.headline).toBeTruthy();
    expect(articleSchema.author).toBeTruthy();
    expect(articleSchema.author['@type']).toBe('Person');
    expect(articleSchema.datePublished).toBeTruthy();
    expect(articleSchema.publisher).toBeTruthy();
    expect(articleSchema.publisher['@type']).toBe('Organization');
    expect(articleSchema.mainEntityOfPage).toBeTruthy();
    
    // Check image if present
    if (articleSchema.image) {
      expect(Array.isArray(articleSchema.image) ? articleSchema.image[0] : articleSchema.image).toContain('http');
    }
  });

  test('events page has valid event JSON-LD', async ({ page }) => {
    await page.goto(`${STAGING_URL}/events`);
    
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-item"]');
    
    // Click on first event
    const firstEvent = page.locator('[data-testid="event-item"]').first();
    await firstEvent.click();
    
    // Extract JSON-LD scripts
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    let eventSchema: any = null;
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'Event') {
          eventSchema = data;
          break;
        }
      }
    }
    
    expect(eventSchema).toBeTruthy();
    expect(eventSchema['@context']).toBe('https://schema.org');
    expect(eventSchema['@type']).toBe('Event');
    expect(eventSchema.name).toBeTruthy();
    expect(eventSchema.startDate).toBeTruthy();
    expect(eventSchema.location).toBeTruthy();
    expect(eventSchema.location['@type']).toBe('Place');
    expect(eventSchema.location.name).toBeTruthy();
    expect(eventSchema.location.address).toBeTruthy();
  });

  test('recommendation page has valid local business JSON-LD', async ({ page }) => {
    await page.goto(`${STAGING_URL}/recommendations`);
    
    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="recommendation-item"]');
    
    // Click on first recommendation
    const firstRec = page.locator('[data-testid="recommendation-item"]').first();
    await firstRec.click();
    
    // Extract JSON-LD scripts
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    let businessSchema: any = null;
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        const data = JSON.parse(content);
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Restaurant') {
          businessSchema = data;
          break;
        }
      }
    }
    
    expect(businessSchema).toBeTruthy();
    expect(businessSchema['@context']).toBe('https://schema.org');
    expect(['LocalBusiness', 'Restaurant']).toContain(businessSchema['@type']);
    expect(businessSchema.name).toBeTruthy();
    expect(businessSchema.address).toBeTruthy();
    expect(businessSchema.address['@type']).toBe('PostalAddress');
    
    // Check aggregateRating if present
    if (businessSchema.aggregateRating) {
      expect(businessSchema.aggregateRating['@type']).toBe('AggregateRating');
      expect(businessSchema.aggregateRating.ratingValue).toBeTruthy();
      expect(businessSchema.aggregateRating.reviewCount).toBeTruthy();
    }
  });

  test('video content has valid video object JSON-LD', async ({ page }) => {
    // Navigate to a page with video content (social embeds)
    await page.goto(`${STAGING_URL}/blog`);
    
    // Look for a post with video embeds
    const postWithVideo = page.locator('[data-testid="blog-post-link"]').first();
    await postWithVideo.click();
    
    // Check if there are video embeds
    const videoEmbeds = page.locator('[data-testid="social-embed"][data-platform="youtube"], [data-testid="social-embed"][data-platform="tiktok"]');
    
    if (await videoEmbeds.count() > 0) {
      // Extract JSON-LD scripts
      const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
      
      let videoSchema: any = null;
      
      for (const script of jsonLdScripts) {
        const content = await script.textContent();
        if (content) {
          const data = JSON.parse(content);
          if (data['@type'] === 'VideoObject') {
            videoSchema = data;
            break;
          }
        }
      }
      
      if (videoSchema) {
        expect(videoSchema['@context']).toBe('https://schema.org');
        expect(videoSchema['@type']).toBe('VideoObject');
        expect(videoSchema.name).toBeTruthy();
        expect(videoSchema.description).toBeTruthy();
        expect(videoSchema.thumbnailUrl).toBeTruthy();
        expect(videoSchema.contentUrl || videoSchema.embedUrl).toBeTruthy();
        expect(videoSchema.uploadDate).toBeTruthy();
      }
    } else {
      console.log('No video embeds found on this page, skipping VideoObject test');
    }
  });

  test('validates JSON-LD with Google Rich Results Test', async ({ page }) => {
    // This is a simulation - in real testing you'd use Google's Rich Results Test API
    await page.goto(STAGING_URL);
    
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    for (const script of jsonLdScripts) {
      const content = await script.textContent();
      if (content) {
        // Validate JSON syntax
        expect(() => JSON.parse(content)).not.toThrow();
        
        const data = JSON.parse(content);
        
        // Basic validation
        expect(data['@context']).toBe('https://schema.org');
        expect(data['@type']).toBeTruthy();
        
        // Log the schema for manual validation
        console.log(`Found ${data['@type']} schema:`, JSON.stringify(data, null, 2));
      }
    }
  });

  test('hreflang attributes are present for multilingual content', async ({ page }) => {
    await page.goto(STAGING_URL);
    
    // Check for hreflang links
    const hreflangLinks = page.locator('link[hreflang]');
    const hreflangCount = await hreflangLinks.count();
    
    expect(hreflangCount).toBeGreaterThan(0);
    
    // Check for English and Arabic alternates
    const enLink = page.locator('link[hreflang="en-GB"]');
    const arLink = page.locator('link[hreflang="ar-SA"]');
    
    await expect(enLink).toHaveCount(1);
    await expect(arLink).toHaveCount(1);
    
    // Verify URLs are valid
    const enHref = await enLink.getAttribute('href');
    const arHref = await arLink.getAttribute('href');
    
    expect(enHref).toContain('yalla-london');
    expect(arHref).toContain('lang=ar');
  });
});
