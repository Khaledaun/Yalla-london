import { NextRequest, NextResponse } from 'next/server';
import {
  submitToIndexNow,
  pingSitemaps,
  getAllIndexableUrls,
  getNewUrls,
  gscApi,
} from '@/lib/seo/indexing-service';

export const dynamic = 'force-dynamic';

/**
 * Simple test endpoint that runs indexing and returns HTML results
 * Visit: /api/seo/test
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'info';

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>SEO Indexing Test</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .success { color: #22c55e; }
    .fail { color: #ef4444; }
    .warn { color: #f59e0b; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; overflow-x: auto; }
    a { color: #3b82f6; }
    button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 5px; }
    button:hover { background: #2563eb; }
    ul { line-height: 1.8; }
  </style>
</head>
<body>
  <h1>SEO Indexing Test</h1>
`;

  if (action === 'info') {
    // Show URLs and options
    const allUrls = getAllIndexableUrls();
    const newUrls = getNewUrls();

    html += `
  <div class="card">
    <h2>Indexable URLs</h2>
    <p><strong>Total:</strong> ${allUrls.length} URLs</p>
    <p><strong>New (last 7 days):</strong> ${newUrls.length} URLs</p>
    <details>
      <summary>View all URLs</summary>
      <ul>${allUrls.map(u => `<li><a href="${u}" target="_blank">${u}</a></li>`).join('')}</ul>
    </details>
  </div>

  <div class="card">
    <h2>Test Actions</h2>
    <p>Click a button to run the test:</p>
    <a href="/api/seo/test?action=indexnow"><button>Test IndexNow (Bing/Yandex)</button></a>
    <a href="/api/seo/test?action=ping"><button>Test Sitemap Ping</button></a>
    <a href="/api/seo/test?action=gsc"><button>Test GSC API</button></a>
    <a href="/api/seo/test?action=full"><button>Run Full Indexing</button></a>
  </div>
`;
  } else if (action === 'indexnow') {
    // Test IndexNow
    const urls = getAllIndexableUrls().slice(0, 5);
    const results = await submitToIndexNow(urls);

    html += `
  <div class="card">
    <h2>IndexNow Test Results</h2>
    <p>Submitted ${urls.length} URLs to IndexNow:</p>
    <ul>
      ${results.map(r => `
        <li>
          <strong>${r.engine}:</strong>
          <span class="${r.success ? 'success' : 'fail'}">${r.success ? 'SUCCESS' : 'FAILED'}</span>
          (Status: ${r.status || 'N/A'})
          ${r.message ? `<br><small>${r.message.substring(0, 200)}</small>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  <a href="/api/seo/test"><button>Back</button></a>
`;
  } else if (action === 'ping') {
    // Test sitemap ping
    const results = await pingSitemaps();

    html += `
  <div class="card">
    <h2>Sitemap Ping Results</h2>
    <ul>
      ${Object.entries(results).map(([engine, success]) => `
        <li>
          <strong>${engine}:</strong>
          <span class="${success ? 'success' : 'fail'}">${success ? 'SUCCESS' : 'FAILED'}</span>
        </li>
      `).join('')}
    </ul>
  </div>
  <a href="/api/seo/test"><button>Back</button></a>
`;
  } else if (action === 'gsc') {
    // Test GSC API with debugging
    const testUrl = getAllIndexableUrls()[0];

    // Check environment variables
    const hasClientEmail = !!process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || !!process.env.GSC_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || !!process.env.GSC_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL || 'Not set';

    const status = await gscApi.checkIndexingStatus(testUrl);

    html += `
  <div class="card">
    <h2>Google Search Console API Test</h2>
    <p><strong>Test URL:</strong> ${testUrl}</p>

    <h3>Environment Check</h3>
    <ul>
      <li>CLIENT_EMAIL: <span class="${hasClientEmail ? 'success' : 'fail'}">${hasClientEmail ? 'SET' : 'NOT SET'}</span> ${hasClientEmail ? `(${clientEmail.substring(0, 20)}...)` : ''}</li>
      <li>PRIVATE_KEY: <span class="${hasPrivateKey ? 'success' : 'fail'}">${hasPrivateKey ? 'SET' : 'NOT SET'}</span></li>
    </ul>

    ${status ? `
      <p class="success">GSC API is working!</p>
      <pre>${JSON.stringify(status, null, 2)}</pre>
    ` : `
      <p class="warn">GSC API returned no data.</p>
      <p>Possible reasons:</p>
      <ul>
        <li>Credentials not configured (GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY)</li>
        <li>Service account not added to Search Console property</li>
        <li>URL not yet indexed by Google</li>
      </ul>
    `}
  </div>
  <a href="/api/seo/test"><button>Back</button></a>
`;
  } else if (action === 'full') {
    // Full indexing test
    const allUrls = getAllIndexableUrls();
    const indexNowResults = await submitToIndexNow(allUrls);
    const pingResults = await pingSitemaps();

    const indexNowSuccess = indexNowResults.filter(r => r.success).length;
    const indexNowFail = indexNowResults.filter(r => !r.success).length;

    html += `
  <div class="card">
    <h2>Full Indexing Results</h2>
    <p><strong>URLs Submitted:</strong> ${allUrls.length}</p>

    <h3>IndexNow Results</h3>
    <ul>
      ${indexNowResults.map(r => `
        <li>
          <strong>${r.engine}:</strong>
          <span class="${r.success ? 'success' : 'fail'}">${r.success ? 'SUCCESS' : 'FAILED'}</span>
          ${r.status ? `(${r.status})` : ''}
        </li>
      `).join('')}
    </ul>

    <h3>Sitemap Ping Results</h3>
    <ul>
      ${Object.entries(pingResults).map(([engine, success]) => `
        <li>
          <strong>${engine}:</strong>
          <span class="${success ? 'success' : 'fail'}">${success ? 'SUCCESS' : 'FAILED'}</span>
        </li>
      `).join('')}
    </ul>

    <h3>Summary</h3>
    <p>IndexNow: <span class="success">${indexNowSuccess} success</span>, <span class="${indexNowFail > 0 ? 'fail' : ''}">${indexNowFail} failed</span></p>
  </div>
  <a href="/api/seo/test"><button>Back</button></a>
`;
  }

  html += `
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
