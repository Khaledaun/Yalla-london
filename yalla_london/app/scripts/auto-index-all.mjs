#!/usr/bin/env node
/**
 * Auto-Indexing Maximizer
 *
 * Maximizes indexing speed across all search engines by:
 * 1. Submitting ALL blog posts to IndexNow (Bing/Yandex/Naver)
 * 2. Pinging sitemaps
 * 3. Checking indexing status in GSC
 * 4. Generating a report of what needs attention
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex);
          let value = trimmed.substring(eqIndex + 1);
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          value = value.replace(/\\n/g, '\n');
          process.env[key] = value;
        }
      }
    });
    console.log('[OK] Environment loaded');
  } catch (e) {
    console.log('[WARN] Could not load .env.local:', e.message);
  }
}

loadEnv();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
const GSC_SITE_URL = process.env.GSC_SITE_URL || SITE_URL;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'yallalondon2026key';
const GSC_EMAIL = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
const GSC_KEY = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;

// All blog post URLs to index
const BLOG_POSTS = [
  '/blog/muslim-friendly-hotels-london',
  '/blog/london-airports-guide',
  '/blog/uk-visa-guide-gcc',
  '/blog/best-time-visit-london',
  '/blog/ramadan-london-guide',
  '/blog/london-transport-guide',
  '/blog/premier-league-stadiums-guide',
  '/blog/best-halal-restaurants-london',
  '/blog/luxury-shopping-london',
  '/blog/family-attractions-london',
  '/blog/arab-community-events-london',
  '/blog/private-healthcare-london',
  '/blog/halal-afternoon-tea-london',
  '/blog/islamic-heritage-london',
];

// Static pages
const STATIC_PAGES = [
  '',
  '/blog',
  '/recommendations',
  '/events',
  '/about',
  '/contact',
  '/hotels',
  '/experiences',
  '/shop',
];

function log(msg, type = 'info') {
  const prefixes = { info: '[INFO]', success: '[OK]', error: '[ERROR]', warning: '[WARN]' };
  console.log(`${prefixes[type] || '[INFO]'} ${msg}`);
}

// Submit to IndexNow (Bing, Yandex, Naver, Seznam)
async function submitToIndexNow(urls) {
  const engines = [
    { name: 'Bing', host: 'www.bing.com' },
    { name: 'Yandex', host: 'yandex.com' },
    { name: 'Naver', host: 'searchadvisor.naver.com' },
    { name: 'Seznam', host: 'search.seznam.cz' },
  ];

  const results = {};

  for (const engine of engines) {
    let success = 0;
    let failed = 0;

    // Use batch submission for efficiency
    try {
      const response = await fetch(`https://${engine.host}/indexnow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: new URL(SITE_URL).host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: urls,
        }),
      });

      if (response.ok || response.status === 200 || response.status === 202) {
        success = urls.length;
        log(`${engine.name}: ${success} URLs submitted (batch)`, 'success');
      } else {
        // Fallback to individual submissions
        for (const url of urls.slice(0, 50)) {
          try {
            const getUrl = `https://${engine.host}/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
            const res = await fetch(getUrl);
            if (res.ok || res.status === 200 || res.status === 202) {
              success++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }
        log(`${engine.name}: ${success}/${urls.length} submitted`, success > 0 ? 'success' : 'warning');
      }
    } catch (e) {
      log(`${engine.name}: Failed - ${e.message}`, 'error');
    }

    results[engine.name] = { success, failed };
  }

  return results;
}

// Ping sitemap to various services
async function pingSitemaps() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const services = [
    { name: 'Bing Webmaster', url: `https://www.bing.com/webmaster/ping.aspx?siteMap=${encodeURIComponent(sitemapUrl)}` },
    { name: 'IndexNow Sitemap', url: `https://www.bing.com/indexnow?url=${encodeURIComponent(sitemapUrl)}&key=${INDEXNOW_KEY}` },
  ];

  for (const service of services) {
    try {
      const response = await fetch(service.url);
      log(`${service.name}: ${response.ok ? 'Pinged' : 'Failed'}`, response.ok ? 'success' : 'warning');
    } catch (e) {
      log(`${service.name}: Error`, 'error');
    }
  }
}

// Get GSC token
async function getGSCToken() {
  if (!GSC_EMAIL || !GSC_KEY) return null;

  const crypto = await import('crypto');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: GSC_EMAIL,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(GSC_KEY, 'base64url');
  const jwt = `${signatureInput}.${signature}`;

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

// Check indexing status for multiple URLs
async function checkIndexingStatus(urls) {
  const token = await getGSCToken();
  if (!token) {
    log('GSC token not available - skipping status check', 'warning');
    return [];
  }

  const results = [];

  for (const url of urls) {
    try {
      const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: GSC_SITE_URL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const state = data.inspectionResult?.indexStatusResult?.indexingState || 'UNKNOWN';
        const verdict = data.inspectionResult?.indexStatusResult?.verdict || '';
        results.push({ url, state, verdict, indexed: state === 'INDEXED' });
      } else {
        results.push({ url, state: 'ERROR', verdict: '', indexed: false });
      }
    } catch {
      results.push({ url, state: 'ERROR', verdict: '', indexed: false });
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  return results;
}

// Main auto-index function
async function autoIndex() {
  console.log('\n========================================');
  console.log(' AUTO-INDEXING MAXIMIZER');
  console.log(' Submitting to all search engines');
  console.log('========================================\n');

  // Combine all URLs
  const allUrls = [
    ...STATIC_PAGES.map(p => `${SITE_URL}${p}`),
    ...BLOG_POSTS.map(p => `${SITE_URL}${p}`),
  ];

  log(`Total URLs to index: ${allUrls.length}`, 'info');

  // Step 1: Submit to IndexNow (Bing, Yandex, Naver, Seznam)
  console.log('\n--- IndexNow Submission ---');
  const indexNowResults = await submitToIndexNow(allUrls);

  // Step 2: Ping sitemaps
  console.log('\n--- Sitemap Pinging ---');
  await pingSitemaps();

  // Step 3: Check GSC status (sample of URLs)
  console.log('\n--- Google Search Console Status ---');
  const sampleUrls = allUrls.slice(0, 10);
  const gscResults = await checkIndexingStatus(sampleUrls);

  const indexed = gscResults.filter(r => r.indexed).length;
  const notIndexed = gscResults.filter(r => !r.indexed && r.state !== 'ERROR').length;
  const errors = gscResults.filter(r => r.state === 'ERROR').length;

  console.log('\n--- Results Summary ---');
  log(`IndexNow (Bing): ${indexNowResults.Bing?.success || 0} URLs`, 'success');
  log(`IndexNow (Yandex): ${indexNowResults.Yandex?.success || 0} URLs`, 'success');
  log(`Google Indexed: ${indexed}/${sampleUrls.length} (sample)`, indexed > 0 ? 'success' : 'warning');
  log(`Google Not Indexed: ${notIndexed}/${sampleUrls.length}`, notIndexed > 0 ? 'warning' : 'success');

  // Show not indexed URLs
  if (notIndexed > 0) {
    console.log('\nURLs pending Google indexing:');
    gscResults
      .filter(r => !r.indexed && r.state !== 'ERROR')
      .forEach(r => console.log(`  - ${r.url} (${r.state})`));
  }

  console.log('\n--- Next Steps for Google ---');
  console.log('1. Google will discover pages via sitemap (automatic)');
  console.log('2. For faster indexing, manually request in GSC:');
  console.log('   - Go to URL Inspection tool');
  console.log('   - Enter URL and click "Request Indexing"');
  console.log('3. Build backlinks to important pages');
  console.log('4. Share content on social media');

  console.log('\n========================================');
  console.log(' AUTO-INDEXING COMPLETE');
  console.log('========================================\n');
}

// Run
autoIndex().catch(console.error);
