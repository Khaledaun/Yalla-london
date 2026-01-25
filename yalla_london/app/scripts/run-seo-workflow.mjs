#!/usr/bin/env node
/**
 * Direct SEO Workflow Runner
 * Runs SEO workflows directly without requiring the Next.js server
 */

import { readFileSync } from 'fs';
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
          // Remove surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          // Handle escaped newlines
          value = value.replace(/\\n/g, '\n');
          process.env[key] = value;
        }
      }
    });
    console.log('[OK] Environment loaded from .env.local');
  } catch (e) {
    console.log('[WARN] Could not load .env.local:', e.message);
  }
}

loadEnv();

// Configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
// GSC_SITE_URL is the property URL in Search Console (can be sc-domain: format)
const GSC_SITE_URL = process.env.GSC_SITE_URL || SITE_URL;
const GSC_EMAIL = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
const GSC_KEY = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'yallalondon2026key';

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

// JWT Creation for Google Auth
async function createJWT(payload, privateKey) {
  const crypto = await import('crypto');
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');
  return `${signatureInput}.${signature}`;
}

// Get GSC Access Token
async function getGSCToken() {
  if (!GSC_EMAIL || !GSC_KEY) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: GSC_EMAIL,
    scope: 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  try {
    const jwt = await createJWT(payload, GSC_KEY);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await response.json();
    if (data.access_token) {
      return data.access_token;
    }
    console.log('[ERROR] Token response:', JSON.stringify(data));
    return null;
  } catch (error) {
    console.log('[ERROR] Failed to get token:', error.message);
    return null;
  }
}

// Verify GSC Connection
async function verifyGSC() {
  printSection('Verifying Google Search Console Connection');

  // Check configuration
  log(`Site URL: ${SITE_URL}`, 'info');
  log(`GSC Property: ${GSC_SITE_URL}`, 'info');
  log(`GSC Email: ${GSC_EMAIL ? GSC_EMAIL : 'NOT SET'}`, GSC_EMAIL ? 'success' : 'error');
  log(`GSC Key: ${GSC_KEY ? 'CONFIGURED' : 'NOT SET'}`, GSC_KEY ? 'success' : 'error');

  if (!GSC_EMAIL || !GSC_KEY) {
    log('GSC credentials not configured', 'error');
    return;
  }

  // Test authentication
  log('Testing authentication...', 'info');
  const token = await getGSCToken();

  if (token) {
    log('Authentication successful!', 'success');

    // Test URL inspection capability
    log('Testing URL Inspection API...', 'info');
    try {
      const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: SITE_URL,
          siteUrl: GSC_SITE_URL,
        }),
      });

      if (response.ok) {
        log('URL Inspection API: Available', 'success');
        const data = await response.json();
        if (data.inspectionResult) {
          const state = data.inspectionResult.indexStatusResult?.indexingState || 'Unknown';
          log(`Homepage indexing state: ${state}`, 'info');
        }
      } else {
        const errorText = await response.text();
        log(`URL Inspection API: ${response.status} - Check if service account has access`, 'warning');
      }
    } catch (e) {
      log(`URL Inspection test failed: ${e.message}`, 'warning');
    }

    // Test Search Analytics
    log('Testing Search Analytics API...', 'info');
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['query'],
            rowLimit: 5,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        log('Search Analytics API: Available', 'success');
        if (data.rows && data.rows.length > 0) {
          log(`Top keywords (last 7 days):`, 'info');
          data.rows.slice(0, 5).forEach((row, i) => {
            console.log(`  ${i + 1}. "${row.keys[0]}" - ${row.clicks} clicks, pos ${row.position.toFixed(1)}`);
          });
        } else {
          log('No search data available yet', 'info');
        }
      } else {
        log(`Search Analytics API: ${response.status} - Check property access`, 'warning');
      }
    } catch (e) {
      log(`Search Analytics test failed: ${e.message}`, 'warning');
    }

  } else {
    log('Authentication failed - check credentials', 'error');
  }
}

// Check Indexing Status
async function checkIndexing() {
  printSection('Checking Indexing Status');

  const token = await getGSCToken();
  if (!token) {
    log('Cannot check indexing - authentication failed', 'error');
    return;
  }

  // Test URLs
  const testUrls = [
    SITE_URL,
    `${SITE_URL}/blog`,
    `${SITE_URL}/recommendations`,
    `${SITE_URL}/events`,
  ];

  let indexed = 0;
  let notIndexed = 0;

  for (const url of testUrls) {
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
        const isIndexed = state === 'INDEXED';

        if (isIndexed) {
          indexed++;
          log(`${url} - INDEXED`, 'success');
        } else {
          notIndexed++;
          log(`${url} - ${state}`, 'warning');
        }
      } else {
        log(`${url} - Could not check`, 'warning');
      }
    } catch (e) {
      log(`${url} - Error: ${e.message}`, 'error');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nSummary:');
  log(`Indexed: ${indexed}/${testUrls.length}`, indexed > 0 ? 'success' : 'warning');
  log(`Not Indexed: ${notIndexed}/${testUrls.length}`, notIndexed > 0 ? 'warning' : 'success');
}

// Submit URLs for Indexing
async function submitForIndexing() {
  printSection('Submitting URLs for Indexing');

  const token = await getGSCToken();

  const urlsToSubmit = [
    SITE_URL,
    `${SITE_URL}/blog`,
    `${SITE_URL}/recommendations`,
    `${SITE_URL}/events`,
  ];

  // Submit to Google Indexing API
  if (token) {
    log('Submitting to Google Indexing API...', 'info');
    let googleSuccess = 0;

    for (const url of urlsToSubmit) {
      try {
        const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            type: 'URL_UPDATED',
          }),
        });

        if (response.ok) {
          googleSuccess++;
          log(`Google: ${url} - Submitted`, 'success');
        } else {
          const error = await response.text();
          log(`Google: ${url} - Failed (${response.status})`, 'warning');
        }
      } catch (e) {
        log(`Google: ${url} - Error`, 'error');
      }
      await new Promise(r => setTimeout(r, 200));
    }
    log(`Google Indexing API: ${googleSuccess}/${urlsToSubmit.length} submitted`, 'info');
  }

  // Submit to IndexNow (Bing/Yandex)
  log('\nSubmitting to IndexNow (Bing/Yandex)...', 'info');
  let indexNowSuccess = 0;

  for (const url of urlsToSubmit) {
    try {
      const indexNowUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
      const response = await fetch(indexNowUrl);

      if (response.ok || response.status === 200 || response.status === 202) {
        indexNowSuccess++;
        log(`IndexNow: ${url} - Submitted`, 'success');
      } else {
        log(`IndexNow: ${url} - Status ${response.status}`, 'warning');
      }
    } catch (e) {
      log(`IndexNow: ${url} - Error`, 'error');
    }
  }
  log(`IndexNow: ${indexNowSuccess}/${urlsToSubmit.length} submitted`, 'info');
}

// Full Audit
async function fullAudit() {
  printSection('Running Full SEO Audit');

  await verifyGSC();
  await checkIndexing();
  await submitForIndexing();

  printSection('Audit Complete');
  log('GSC connection verified', 'success');
  log('Indexing status checked', 'success');
  log('URLs submitted to search engines', 'success');
}

// Help
function showHelp() {
  console.log(`
SEO Workflow Automation Script
==============================

Usage: node scripts/run-seo-workflow.mjs [command]

Commands:
  verify-gsc      Verify Google Search Console connection
  check-indexing  Check indexing status of key URLs
  submit          Submit URLs for indexing (Google + Bing)
  full-audit      Run complete SEO audit
  help            Show this help message

Examples:
  node scripts/run-seo-workflow.mjs verify-gsc
  node scripts/run-seo-workflow.mjs check-indexing
  node scripts/run-seo-workflow.mjs full-audit
`);
}

// Main
async function main() {
  const command = process.argv[2] || 'help';

  console.log('\nSEO Workflow Automation');
  console.log('Powered by zenobi-us/dotfiles skills integration\n');

  switch (command) {
    case 'verify-gsc':
      await verifyGSC();
      break;
    case 'check-indexing':
      await checkIndexing();
      break;
    case 'submit':
      await submitForIndexing();
      break;
    case 'full-audit':
      await fullAudit();
      break;
    case 'help':
    default:
      showHelp();
  }

  console.log('\n');
}

main().catch(console.error);
