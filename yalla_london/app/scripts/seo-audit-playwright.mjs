#!/usr/bin/env node
/**
 * SEO Audit Tool using Playwright
 *
 * Automated SEO verification and audit tool that:
 * 1. Verifies pages render actual content (not empty/Soft 404)
 * 2. Checks meta tags, structured data, and SEO elements
 * 3. Runs Lighthouse audits for SEO scores
 * 4. Takes screenshots for debugging
 * 5. Crawls internal links for broken pages
 *
 * Usage:
 *   node scripts/seo-audit-playwright.mjs [command] [options]
 *
 * Commands:
 *   verify-ssr [url]     - Verify SSR content rendering (checks for Soft 404)
 *   audit [url]          - Full SEO audit of a single page
 *   audit-all            - Audit all blog posts
 *   lighthouse [url]     - Run Lighthouse SEO audit
 *   screenshot [url]     - Take screenshot of a page
 *   crawl                - Crawl site and check all pages
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
const OUTPUT_DIR = resolve(__dirname, '..', 'seo-audit-reports');

// Blog posts to audit (same as auto-index-all.mjs)
const BLOG_POSTS = [
  '/blog/london-new-years-eve-fireworks-2025-complete-guide',
  '/blog/best-halal-fine-dining-restaurants-london-2025-comparison',
  '/blog/luxury-hotels-london-arab-families-2025-comparison',
  '/blog/best-halal-afternoon-tea-london-2025',
  '/blog/first-time-london-guide-arab-tourists-2025',
  '/blog/harrods-vs-selfridges-which-better-2025',
  '/blog/best-london-attractions-arab-families-2025',
  '/blog/london-winter-guide-arab-visitors-2025',
  '/blog/edgware-road-london-complete-guide-arab-area',
  '/blog/best-shisha-lounges-london',
  '/blog/oxford-street-shopping-guide-2025',
  '/blog/best-halal-restaurants-central-london-2025',
  '/blog/ramadan-london-2026-complete-guide-iftar-suhoor',
  '/blog/london-transport-guide-tourists-2026-tube-bus-taxi',
  '/blog/premier-league-london-stadiums-guide-2026-tickets-hospitality',
  '/blog/uk-visa-guide-arab-countries-2026-requirements-apply',
  '/blog/best-time-to-visit-london-2026-weather-seasons-events',
  '/blog/muslim-friendly-hotels-london-2026-prayer-facilities-halal',
  '/blog/london-airports-guide-2026-heathrow-gatwick-stansted-comparison',
];

const STATIC_PAGES = ['', '/blog', '/recommendations', '/events', '/about', '/contact'];

// Utility functions
function log(msg, type = 'info') {
  const prefixes = {
    info: '[INFO]',
    success: '[OK]',
    error: '[ERROR]',
    warning: '[WARN]'
  };
  console.log(`${prefixes[type] || '[INFO]'} ${msg}`);
}

function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

// Ensure output directory exists
function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// ============================================
// SSR VERIFICATION (Check for Soft 404)
// ============================================

/**
 * Verify that a page renders actual content (not empty/loading state)
 * This is critical for detecting Soft 404 issues
 */
async function verifySSR(url) {
  printSection(`Verifying SSR: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  });

  const page = await context.newPage();

  const result = {
    url,
    timestamp: new Date().toISOString(),
    ssrValid: false,
    issues: [],
    metrics: {}
  };

  try {
    // Disable JavaScript to simulate Googlebot's initial render
    await page.setJavaScriptEnabled(false);

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check response status
    result.metrics.statusCode = response?.status() || 0;
    if (result.metrics.statusCode !== 200) {
      result.issues.push(`HTTP status: ${result.metrics.statusCode}`);
    }

    // Get the raw HTML content (without JS execution)
    const html = await page.content();
    result.metrics.htmlLength = html.length;

    // Check for actual content (not just loading states)
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    result.metrics.textLength = bodyText.length;

    // Soft 404 indicators
    const softErrorIndicators = [
      'loading...',
      'please wait',
      'fetching data',
      'no content',
      'page not found',
      '404',
      'error loading'
    ];

    const lowerText = bodyText.toLowerCase();
    for (const indicator of softErrorIndicators) {
      if (lowerText.includes(indicator) && bodyText.length < 500) {
        result.issues.push(`Possible Soft 404: contains "${indicator}"`);
      }
    }

    // Check for minimum content
    if (bodyText.length < 200) {
      result.issues.push(`Very little content: ${bodyText.length} characters`);
    }

    // Check for H1 tag
    const h1 = await page.$eval('h1', el => el?.textContent || '').catch(() => '');
    result.metrics.hasH1 = h1.length > 0;
    if (!h1) {
      result.issues.push('Missing H1 tag');
    }

    // Check for meta description
    const metaDesc = await page.$eval('meta[name="description"]', el => el?.getAttribute('content') || '').catch(() => '');
    result.metrics.hasMetaDescription = metaDesc.length > 0;
    if (!metaDesc) {
      result.issues.push('Missing meta description');
    }

    // Check for title
    const title = await page.$eval('title', el => el?.textContent || '').catch(() => '');
    result.metrics.hasTitle = title.length > 0;
    result.metrics.title = title;
    if (!title) {
      result.issues.push('Missing title tag');
    }

    // Check for structured data
    const structuredData = await page.$$eval('script[type="application/ld+json"]', scripts =>
      scripts.map(s => s.textContent)
    ).catch(() => []);
    result.metrics.structuredDataCount = structuredData.length;
    if (structuredData.length === 0) {
      result.issues.push('No structured data (JSON-LD) found');
    }

    // Check for canonical URL
    const canonical = await page.$eval('link[rel="canonical"]', el => el?.getAttribute('href') || '').catch(() => '');
    result.metrics.hasCanonical = canonical.length > 0;
    if (!canonical) {
      result.issues.push('Missing canonical URL');
    }

    // Determine if SSR is valid
    result.ssrValid = result.issues.length === 0 &&
                      result.metrics.textLength > 200 &&
                      result.metrics.statusCode === 200;

    // Summary
    if (result.ssrValid) {
      log('SSR verification PASSED', 'success');
      log(`  Title: ${title}`, 'info');
      log(`  Content length: ${bodyText.length} chars`, 'info');
      log(`  Structured data: ${structuredData.length} scripts`, 'info');
    } else {
      log('SSR verification FAILED', 'error');
      result.issues.forEach(issue => log(`  - ${issue}`, 'warning'));
    }

  } catch (error) {
    result.issues.push(`Error: ${error.message}`);
    log(`Error: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }

  return result;
}

// ============================================
// FULL SEO AUDIT
// ============================================

/**
 * Comprehensive SEO audit of a single page
 */
async function auditPage(url) {
  printSection(`SEO Audit: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const audit = {
    url,
    timestamp: new Date().toISOString(),
    score: 0,
    maxScore: 100,
    checks: [],
    warnings: [],
    errors: []
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 1. Title Tag (10 points)
    const title = await page.$eval('title', el => el?.textContent || '').catch(() => '');
    if (title) {
      if (title.length >= 30 && title.length <= 60) {
        audit.score += 10;
        audit.checks.push({ name: 'Title Tag', status: 'pass', value: title });
      } else {
        audit.score += 5;
        audit.warnings.push(`Title length (${title.length}) should be 30-60 characters`);
        audit.checks.push({ name: 'Title Tag', status: 'warning', value: title });
      }
    } else {
      audit.errors.push('Missing title tag');
      audit.checks.push({ name: 'Title Tag', status: 'fail' });
    }

    // 2. Meta Description (10 points)
    const metaDesc = await page.$eval('meta[name="description"]', el => el?.getAttribute('content') || '').catch(() => '');
    if (metaDesc) {
      if (metaDesc.length >= 120 && metaDesc.length <= 160) {
        audit.score += 10;
        audit.checks.push({ name: 'Meta Description', status: 'pass', value: metaDesc.substring(0, 50) + '...' });
      } else {
        audit.score += 5;
        audit.warnings.push(`Meta description length (${metaDesc.length}) should be 120-160 characters`);
        audit.checks.push({ name: 'Meta Description', status: 'warning' });
      }
    } else {
      audit.errors.push('Missing meta description');
      audit.checks.push({ name: 'Meta Description', status: 'fail' });
    }

    // 3. H1 Tag (10 points)
    const h1s = await page.$$eval('h1', els => els.map(el => el.textContent));
    if (h1s.length === 1) {
      audit.score += 10;
      audit.checks.push({ name: 'H1 Tag', status: 'pass', value: h1s[0] });
    } else if (h1s.length > 1) {
      audit.score += 5;
      audit.warnings.push(`Multiple H1 tags found (${h1s.length})`);
      audit.checks.push({ name: 'H1 Tag', status: 'warning', value: `${h1s.length} tags` });
    } else {
      audit.errors.push('Missing H1 tag');
      audit.checks.push({ name: 'H1 Tag', status: 'fail' });
    }

    // 4. Canonical URL (10 points)
    const canonical = await page.$eval('link[rel="canonical"]', el => el?.getAttribute('href') || '').catch(() => '');
    if (canonical) {
      audit.score += 10;
      audit.checks.push({ name: 'Canonical URL', status: 'pass', value: canonical });
    } else {
      audit.errors.push('Missing canonical URL');
      audit.checks.push({ name: 'Canonical URL', status: 'fail' });
    }

    // 5. Open Graph Tags (10 points)
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el?.getAttribute('content') || '').catch(() => '');
    const ogDesc = await page.$eval('meta[property="og:description"]', el => el?.getAttribute('content') || '').catch(() => '');
    const ogImage = await page.$eval('meta[property="og:image"]', el => el?.getAttribute('content') || '').catch(() => '');

    if (ogTitle && ogDesc && ogImage) {
      audit.score += 10;
      audit.checks.push({ name: 'Open Graph', status: 'pass' });
    } else {
      const missing = [];
      if (!ogTitle) missing.push('og:title');
      if (!ogDesc) missing.push('og:description');
      if (!ogImage) missing.push('og:image');
      audit.warnings.push(`Missing OG tags: ${missing.join(', ')}`);
      audit.score += 5;
      audit.checks.push({ name: 'Open Graph', status: 'warning' });
    }

    // 6. Structured Data (15 points)
    const structuredData = await page.$$eval('script[type="application/ld+json"]', scripts =>
      scripts.map(s => {
        try {
          return JSON.parse(s.textContent || '');
        } catch {
          return null;
        }
      }).filter(Boolean)
    ).catch(() => []);

    if (structuredData.length > 0) {
      audit.score += 15;
      const types = structuredData.map(sd => sd['@type']).join(', ');
      audit.checks.push({ name: 'Structured Data', status: 'pass', value: types });
    } else {
      audit.warnings.push('No structured data found');
      audit.checks.push({ name: 'Structured Data', status: 'warning' });
    }

    // 7. Image Alt Tags (10 points)
    const images = await page.$$eval('img', imgs => imgs.map(img => ({
      src: img.src,
      alt: img.alt
    })));
    const imagesWithAlt = images.filter(img => img.alt && img.alt.length > 0);

    if (images.length === 0 || imagesWithAlt.length === images.length) {
      audit.score += 10;
      audit.checks.push({ name: 'Image Alt Tags', status: 'pass', value: `${imagesWithAlt.length}/${images.length}` });
    } else {
      const ratio = imagesWithAlt.length / images.length;
      audit.score += Math.round(10 * ratio);
      audit.warnings.push(`${images.length - imagesWithAlt.length} images missing alt tags`);
      audit.checks.push({ name: 'Image Alt Tags', status: 'warning', value: `${imagesWithAlt.length}/${images.length}` });
    }

    // 8. Internal Links (10 points)
    const links = await page.$$eval('a[href]', els => els.map(el => el.href));
    const internalLinks = links.filter(link => link.includes(new URL(url).hostname));

    if (internalLinks.length >= 3) {
      audit.score += 10;
      audit.checks.push({ name: 'Internal Links', status: 'pass', value: `${internalLinks.length} links` });
    } else {
      audit.warnings.push(`Only ${internalLinks.length} internal links (recommend 3+)`);
      audit.score += 5;
      audit.checks.push({ name: 'Internal Links', status: 'warning', value: `${internalLinks.length} links` });
    }

    // 9. Mobile Viewport (5 points)
    const viewport = await page.$eval('meta[name="viewport"]', el => el?.getAttribute('content') || '').catch(() => '');
    if (viewport && viewport.includes('width=device-width')) {
      audit.score += 5;
      audit.checks.push({ name: 'Mobile Viewport', status: 'pass' });
    } else {
      audit.errors.push('Missing or invalid viewport meta tag');
      audit.checks.push({ name: 'Mobile Viewport', status: 'fail' });
    }

    // 10. HTTPS (10 points)
    if (url.startsWith('https://')) {
      audit.score += 10;
      audit.checks.push({ name: 'HTTPS', status: 'pass' });
    } else {
      audit.errors.push('Site not using HTTPS');
      audit.checks.push({ name: 'HTTPS', status: 'fail' });
    }

    // Print results
    console.log('\nResults:');
    console.log(`  Score: ${audit.score}/${audit.maxScore}`);
    console.log('\nChecks:');
    audit.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '✗';
      const status = check.status === 'pass' ? 'PASS' : check.status === 'warning' ? 'WARN' : 'FAIL';
      console.log(`  [${icon}] ${check.name}: ${status}${check.value ? ` (${check.value})` : ''}`);
    });

    if (audit.warnings.length > 0) {
      console.log('\nWarnings:');
      audit.warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (audit.errors.length > 0) {
      console.log('\nErrors:');
      audit.errors.forEach(e => console.log(`  - ${e}`));
    }

  } catch (error) {
    audit.errors.push(`Error: ${error.message}`);
    log(`Error: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }

  return audit;
}

// ============================================
// AUDIT ALL PAGES
// ============================================

async function auditAllPages() {
  printSection('Auditing All Pages');
  ensureOutputDir();

  const allUrls = [
    ...STATIC_PAGES.map(p => `${SITE_URL}${p}`),
    ...BLOG_POSTS.map(p => `${SITE_URL}${p}`)
  ];

  log(`Auditing ${allUrls.length} pages...`, 'info');

  const results = {
    timestamp: new Date().toISOString(),
    totalPages: allUrls.length,
    passed: 0,
    warnings: 0,
    failed: 0,
    pages: []
  };

  for (const url of allUrls) {
    const audit = await auditPage(url);
    results.pages.push(audit);

    if (audit.score >= 80) {
      results.passed++;
    } else if (audit.score >= 50) {
      results.warnings++;
    } else {
      results.failed++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save report
  const reportPath = resolve(OUTPUT_DIR, `seo-audit-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));

  printSection('Audit Summary');
  log(`Total Pages: ${results.totalPages}`, 'info');
  log(`Passed (80+): ${results.passed}`, 'success');
  log(`Warnings (50-79): ${results.warnings}`, 'warning');
  log(`Failed (<50): ${results.failed}`, 'error');
  log(`Report saved: ${reportPath}`, 'info');

  return results;
}

// ============================================
// SCREENSHOT
// ============================================

async function takeScreenshot(url, filename = null) {
  printSection(`Screenshot: ${url}`);
  ensureOutputDir();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const screenshotPath = resolve(
      OUTPUT_DIR,
      filename || `screenshot-${new URL(url).pathname.replace(/\//g, '-')}-${Date.now()}.png`
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`Screenshot saved: ${screenshotPath}`, 'success');

    return screenshotPath;
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    return null;
  } finally {
    await browser.close();
  }
}

// ============================================
// CRAWL SITE
// ============================================

async function crawlSite() {
  printSection('Crawling Site');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const visited = new Set();
  const toVisit = [`${SITE_URL}`];
  const results = {
    timestamp: new Date().toISOString(),
    pagesFound: 0,
    brokenLinks: [],
    noIndex: [],
    soft404: []
  };

  while (toVisit.length > 0 && visited.size < 100) {
    const url = toVisit.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    log(`Crawling: ${url}`, 'info');

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response?.status() || 0;

      if (status === 404) {
        results.brokenLinks.push({ url, status });
        continue;
      }

      results.pagesFound++;

      // Check for noindex
      const noindex = await page.$eval('meta[name="robots"]', el =>
        el?.getAttribute('content')?.includes('noindex')
      ).catch(() => false);

      if (noindex) {
        results.noIndex.push(url);
      }

      // Check for Soft 404 (minimal content)
      const bodyText = await page.evaluate(() => document.body?.innerText?.length || 0);
      if (bodyText < 200) {
        results.soft404.push({ url, textLength: bodyText });
      }

      // Find internal links
      const links = await page.$$eval('a[href]', els => els.map(el => el.href));
      for (const link of links) {
        if (link.includes(new URL(SITE_URL).hostname) &&
            !link.includes('#') &&
            !visited.has(link) &&
            !toVisit.includes(link)) {
          toVisit.push(link);
        }
      }

    } catch (error) {
      log(`Error crawling ${url}: ${error.message}`, 'warning');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();

  printSection('Crawl Results');
  log(`Pages Found: ${results.pagesFound}`, 'info');
  log(`Broken Links: ${results.brokenLinks.length}`, results.brokenLinks.length > 0 ? 'error' : 'success');
  log(`NoIndex Pages: ${results.noIndex.length}`, 'info');
  log(`Potential Soft 404s: ${results.soft404.length}`, results.soft404.length > 0 ? 'warning' : 'success');

  if (results.brokenLinks.length > 0) {
    console.log('\nBroken Links:');
    results.brokenLinks.forEach(bl => console.log(`  - ${bl.url} (${bl.status})`));
  }

  if (results.soft404.length > 0) {
    console.log('\nPotential Soft 404s (minimal content):');
    results.soft404.forEach(s => console.log(`  - ${s.url} (${s.textLength} chars)`));
  }

  return results;
}

// ============================================
// HELP
// ============================================

function showHelp() {
  console.log(`
SEO Audit Tool (Playwright)
============================

Automated SEO verification and auditing tool.

Usage:
  node scripts/seo-audit-playwright.mjs [command] [options]

Commands:
  verify-ssr [url]     Verify SSR content rendering (detects Soft 404)
                       Example: verify-ssr https://www.yalla-london.com/blog

  audit [url]          Full SEO audit of a single page
                       Example: audit https://www.yalla-london.com/blog/some-post

  audit-all            Audit all blog posts and static pages
                       Generates JSON report in seo-audit-reports/

  screenshot [url]     Take full-page screenshot
                       Example: screenshot https://www.yalla-london.com

  crawl                Crawl site and find broken links, soft 404s
                       Checks up to 100 pages

  help                 Show this help message

Examples:
  # Verify the /blog page doesn't have Soft 404 issue
  node scripts/seo-audit-playwright.mjs verify-ssr ${SITE_URL}/blog

  # Full SEO audit of a blog post
  node scripts/seo-audit-playwright.mjs audit ${SITE_URL}/blog/london-new-years-eve-fireworks-2025-complete-guide

  # Audit all pages and generate report
  node scripts/seo-audit-playwright.mjs audit-all

  # Crawl site for broken links
  node scripts/seo-audit-playwright.mjs crawl
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const param = args[1];

  console.log('\nSEO Audit Tool (Playwright)');
  console.log('Automated SEO verification and auditing\n');

  try {
    switch (command) {
      case 'verify-ssr':
        if (!param) {
          await verifySSR(`${SITE_URL}/blog`);
        } else {
          await verifySSR(param.startsWith('http') ? param : `${SITE_URL}${param}`);
        }
        break;

      case 'audit':
        if (!param) {
          await auditPage(SITE_URL);
        } else {
          await auditPage(param.startsWith('http') ? param : `${SITE_URL}${param}`);
        }
        break;

      case 'audit-all':
        await auditAllPages();
        break;

      case 'screenshot':
        if (!param) {
          await takeScreenshot(SITE_URL);
        } else {
          await takeScreenshot(param.startsWith('http') ? param : `${SITE_URL}${param}`);
        }
        break;

      case 'crawl':
        await crawlSite();
        break;

      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    if (error.message.includes('chromium')) {
      log('Playwright not installed. Run: npx playwright install chromium', 'error');
    } else {
      log(`Error: ${error.message}`, 'error');
    }
  }

  console.log('\n');
}

main();
