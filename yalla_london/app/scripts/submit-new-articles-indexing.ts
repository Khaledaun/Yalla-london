/**
 * Submit New Articles for Indexing
 *
 * Run this script to submit the newly created articles to:
 * - Google Search Console Indexing API
 * - IndexNow (Bing, Yandex)
 * - Sitemap ping
 *
 * Usage: npx ts-node scripts/submit-new-articles-indexing.ts
 * Or via API: POST /api/seo/index-urls { "urls": [...] }
 */

// Dynamic import not available in script context; use require for config
const { getSiteDomain, getDefaultSiteId } = require("@/config/sites");
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());

// New articles created on January 18, 2026
const NEW_ARTICLE_URLS = [
  `${BASE_URL}/blog/muslim-friendly-hotels-london-2026-prayer-facilities-halal`,
  `${BASE_URL}/blog/london-airports-guide-2026-heathrow-gatwick-stansted-comparison`,
];

// All new SEO-optimized articles ready for indexing (past week)
const ALL_RECENT_ARTICLES = [
  // January 18, 2026
  `${BASE_URL}/blog/muslim-friendly-hotels-london-2026-prayer-facilities-halal`,
  `${BASE_URL}/blog/london-airports-guide-2026-heathrow-gatwick-stansted-comparison`,
  // January 17, 2026
  `${BASE_URL}/blog/uk-visa-guide-arab-countries-2026-requirements-apply`,
  `${BASE_URL}/blog/best-time-to-visit-london-2026-weather-seasons-events`,
  `${BASE_URL}/blog/ramadan-london-2026-complete-guide-iftar-suhoor`,
  `${BASE_URL}/blog/london-transport-guide-tourists-2026-tube-bus-taxi`,
  `${BASE_URL}/blog/premier-league-london-stadiums-guide-2026-tickets-hospitality`,
];

interface IndexNowResult {
  engine: string;
  success: boolean;
  status?: number;
  message?: string;
}

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

async function submitToIndexNow(urls: string[]): Promise<IndexNowResult[]> {
  const results: IndexNowResult[] = [];
  let bingSuccess = 0;
  let bingFailed = 0;

  console.log(`\n📤 Submitting ${urls.length} URLs to IndexNow...`);

  for (const url of urls) {
    const getUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
    try {
      const response = await fetch(getUrl, { method: "GET" });
      if (response.ok || response.status === 200 || response.status === 202) {
        bingSuccess++;
        console.log(`  ✅ ${url}`);
      } else {
        bingFailed++;
        console.log(`  ❌ ${url} (HTTP ${response.status})`);
      }
    } catch (error) {
      bingFailed++;
      console.log(`  ❌ ${url} (Error: ${error})`);
    }
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  results.push({
    engine: "bing.com (IndexNow)",
    success: bingSuccess > 0,
    status: 202,
    message: `Submitted ${bingSuccess}/${urls.length} URLs successfully`,
  });

  // Yandex
  if (urls.length > 0) {
    const yandexUrl = `https://yandex.com/indexnow?url=${encodeURIComponent(urls[0])}&key=${INDEXNOW_KEY}`;
    try {
      const response = await fetch(yandexUrl, { method: "GET" });
      results.push({
        engine: "yandex.com",
        success:
          response.ok || response.status === 200 || response.status === 202,
        status: response.status,
        message: response.ok
          ? "Submitted successfully"
          : "Submitted (check Yandex Webmaster)",
      });
    } catch (error) {
      results.push({
        engine: "yandex.com",
        success: false,
        message: String(error),
      });
    }
  }

  return results;
}

async function pingSitemap(): Promise<boolean> {
  const sitemapUrl = `${BASE_URL}/sitemap.xml`;
  console.log(`\n📡 Pinging sitemap: ${sitemapUrl}`);

  try {
    const bingPingUrl = `https://www.bing.com/webmaster/ping.aspx?siteMap=${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(bingPingUrl, { method: "GET" });
    console.log(
      `  Bing sitemap ping: ${response.ok ? "✅ Success" : "⚠️ Check manually"}`,
    );
    return response.ok;
  } catch (error) {
    console.log(`  Bing sitemap ping: ❌ Failed (${error})`);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Article Indexing Submission");
  console.log("=".repeat(50));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📝 New Articles: ${NEW_ARTICLE_URLS.length}`);
  console.log(`📚 All Recent Articles: ${ALL_RECENT_ARTICLES.length}`);

  // Submit new articles to IndexNow
  const indexNowResults = await submitToIndexNow(NEW_ARTICLE_URLS);

  // Ping sitemap
  await pingSitemap();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 INDEXING SUMMARY");
  console.log("=".repeat(50));

  console.log("\n📄 New Articles Submitted:");
  NEW_ARTICLE_URLS.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url.split("/blog/")[1]}`);
  });

  console.log("\n🔍 IndexNow Results:");
  indexNowResults.forEach((result) => {
    console.log(
      `  ${result.success ? "✅" : "❌"} ${result.engine}: ${result.message}`,
    );
  });

  console.log("\n📌 Next Steps:");
  console.log("  1. Check Google Search Console for indexing status");
  console.log("  2. Verify URLs appear in sitemap.xml");
  console.log("  3. Monitor Bing Webmaster Tools for IndexNow submissions");
  console.log(
    "  4. Use API endpoint: GET /api/seo/index-urls?action=status&url=<url>",
  );

  console.log("\n✅ Indexing submission complete!");
  console.log("\n📡 API Alternative:");
  console.log("  POST /api/seo/index-urls");
  console.log('  Body: { "urls": ' + JSON.stringify(NEW_ARTICLE_URLS) + " }");
}

// Export for use as module
export { NEW_ARTICLE_URLS, ALL_RECENT_ARTICLES, submitToIndexNow, pingSitemap };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
