/**
 * Indexing & SEO Diagnostics — COMPREHENSIVE
 *
 * 20+ tests covering the full indexing pipeline:
 *   Config → Submission → Verification → Google Coverage → Blockers → Velocity
 *
 * Designed for Khaled: every test explains WHY something matters and
 * WHAT TO DO about it. No jargon without context.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "indexing";

// ── Helpers ──────────────────────────────────────────────────────────────────

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis, fixAction };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis, fixAction };
}

function ageLabel(ms: number): string {
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// ── Section Runner ───────────────────────────────────────────────────────────

const indexingSection = async (
  siteId: string,
  budgetMs: number,
  startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];
  const elapsed = () => Date.now() - startTime;
  const budgetOk = () => elapsed() < budgetMs - 5000; // 5s safety margin

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION A: CONFIGURATION — Can we even submit to search engines?
  // ═══════════════════════════════════════════════════════════════════════════

  // ── A1. IndexNow Key ────────────────────────────────────────────────────
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey && indexNowKey.length > 10) {
    results.push(pass("indexnow-key", "IndexNow Key", `Configured (${indexNowKey.length} chars)`, "IndexNow instantly notifies Bing, Yandex, and other engines when you publish content. Without it, search engines must discover pages by crawling — which can take days or weeks."));
  } else if (indexNowKey) {
    results.push(fail("indexnow-key", "IndexNow Key", `Key too short (${indexNowKey.length} chars)`, "IndexNow key is configured but looks invalid.", "The key should be a 32+ character hex string. Get a proper key from indexnow.org and update your Vercel environment variables."));
  } else {
    results.push(fail("indexnow-key", "IndexNow Key", "INDEXNOW_KEY not set", "IndexNow instantly notifies search engines when you publish. Without it, new articles may wait days before Google discovers them.", "Go to indexnow.org, generate a key, then add it as INDEXNOW_KEY in Vercel Dashboard → Settings → Environment Variables."));
  }

  // ── A2. IndexNow Key File Accessibility ─────────────────────────────────
  // The key file must be reachable at /{key}.txt for IndexNow to validate submissions
  if (indexNowKey && indexNowKey.length > 10 && budgetOk()) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
      if (baseUrl) {
        const res = await fetch(`${baseUrl}/${indexNowKey}.txt`, { signal: AbortSignal.timeout(5000) });
        const body = await res.text();
        if (res.ok && body.trim() === indexNowKey) {
          results.push(pass("indexnow-keyfile", "IndexNow Key File", `/${indexNowKey.substring(0, 8)}….txt is accessible and valid`, "IndexNow requires a verification file at /{key}.txt on your domain. Without it, IndexNow silently rejects all submissions — your articles never reach search engines."));
        } else if (res.ok) {
          results.push(fail("indexnow-keyfile", "IndexNow Key File", `Key file content doesn't match INDEXNOW_KEY`, "The file exists but its content doesn't match your INDEXNOW_KEY.", "This means IndexNow silently rejects ALL submissions. The key file must contain exactly the INDEXNOW_KEY value, nothing else."));
        } else {
          results.push(fail("indexnow-keyfile", "IndexNow Key File", `Key file returns HTTP ${res.status}`, "IndexNow requires /{key}.txt to return 200 OK. Without it, all submissions are silently rejected.", "Make sure the route exists. Check vercel.json rewrites or create the file route."));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(warn("indexnow-keyfile", "IndexNow Key File", `Could not verify: ${msg.substring(0, 80)}`, "IndexNow requires /{key}.txt to validate submissions."));
    }
  }

  // ── A3. Google Search Console Credentials ───────────────────────────────
  const gscEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
  const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;
  const gscUrl = process.env.GSC_SITE_URL;

  if (gscEmail && gscKey && gscUrl) {
    results.push(pass("gsc-config", "Google Search Console", "Fully configured", "Google Search Console lets us check which pages are indexed, what queries bring traffic, and submit sitemaps directly to Google. Essential for monitoring indexing progress."));
  } else {
    const missing: string[] = [];
    if (!gscEmail) missing.push("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL");
    if (!gscKey) missing.push("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY");
    if (!gscUrl) missing.push("GSC_SITE_URL");
    results.push(warn("gsc-config", "Google Search Console", `Missing: ${missing.join(", ")}`, "Without GSC credentials, we cannot verify if Google has actually indexed your pages. We're flying blind.", `Set the missing env var(s) in Vercel. You need a Google service account with Search Console API access.`));
  }

  // ── A4. GA4 Configuration ───────────────────────────────────────────────
  const ga4Id = process.env.GA4_PROPERTY_ID;
  if (ga4Id) {
    results.push(pass("ga4-config", "Google Analytics 4", `Property ID configured`, "Google Analytics 4 tracks how much traffic your indexed pages actually receive. Without it, you can't measure the revenue impact of indexing."));
  } else {
    results.push(warn("ga4-config", "Google Analytics 4", "GA4_PROPERTY_ID not set", "Without GA4, you can't measure if indexed pages are getting traffic.", "Set GA4_PROPERTY_ID in Vercel environment variables."));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION B: INDEXING STATUS — What's the actual state of our articles?
  // ═══════════════════════════════════════════════════════════════════════════

  try {
    const { prisma } = await import("@/lib/db");

    const totalPosts = await prisma.blogPost.count({ where: { siteId, published: true } });

    // ── B1. Published Content Count ─────────────────────────────────────
    if (totalPosts === 0) {
      results.push(fail("index-total", "Published Pages", "0 published articles", "No content exists for Google to index. You need published articles before indexing can progress.", "Run the content pipeline: Generate Topics → Build Content → Publish.", {
        id: "fix-no-content",
        label: "Build Content Now",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "run_content_builder" },
        rerunGroup: "indexing",
      }));
      return results; // No point running more checks
    }

    results.push(pass("index-total", "Published Pages", `${totalPosts} published articles`, "Total published pages eligible for indexing. Each is a potential traffic source. Target: 20+ for organic authority."));

    if (!budgetOk()) return results;

    // ── B2. Get comprehensive indexing status counts ─────────────────────
    const [indexedCount, submittedCount, discoveredCount, errorCount, deindexedCount] = await Promise.all([
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "submitted" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "discovered" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "error" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "deindexed" } }),
    ]);

    const tracked = indexedCount + submittedCount + discoveredCount + errorCount + deindexedCount;
    const orphaned = Math.max(0, totalPosts - tracked);

    // ── B3. Indexing Rate ─────────────────────────────────────────────────
    const indexRate = totalPosts > 0 ? Math.round((indexedCount / totalPosts) * 100) : 0;

    if (indexRate >= 80) {
      results.push(pass("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Percentage of published articles confirmed in Google. Above 80% is healthy — most content is discoverable via search."));
    } else if (indexRate >= 50) {
      results.push(warn("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Percentage of published articles confirmed indexed by Google.", `${totalPosts - indexedCount} articles are not yet in Google search results. These pages earn no organic traffic.`, {
        id: "fix-low-indexing",
        label: "Submit All to IndexNow",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "submit_indexnow" },
        rerunGroup: "indexing",
      }));
    } else {
      results.push(fail("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Most of your content isn't in Google. These pages exist but earn zero organic traffic.", `Only ${indexedCount} of ${totalPosts} articles appear in Google. Possible causes: content quality issues, missing submissions, robots.txt blocking, or new site with low authority.`, {
        id: "fix-poor-indexing",
        label: "Submit All to IndexNow",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "submit_indexnow" },
        rerunGroup: "indexing",
      }));
    }

    // ── B4. Orphaned Articles (no URLIndexingStatus record) ─────────────
    if (orphaned > 0) {
      results.push(fail("orphaned-articles", "Untracked Articles", `${orphaned} published articles have no indexing record`, "These articles were published BEFORE the indexing tracker was set up, or the SEO agent never discovered them. They are invisible to the indexing pipeline.", `The SEO agent needs to discover these URLs so they can be submitted to Google. Run the SEO agent now.`, {
        id: "fix-orphaned",
        label: "Run SEO Agent (Discover URLs)",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "run_seo_agent" },
        rerunGroup: "indexing",
      }));
    } else {
      results.push(pass("orphaned-articles", "Article Tracking", "All published articles are tracked", "Every published article has an indexing status record, meaning the pipeline is monitoring all content."));
    }

    // ── B5. Discovered but Never Submitted ──────────────────────────────
    if (discoveredCount > 0) {
      results.push(warn("discovered-waiting", "Discovered but Not Submitted", `${discoveredCount} articles found by SEO agent but never submitted`, "The SEO agent found these URLs but the SEO cron hasn't submitted them to IndexNow/Google yet.", `These URLs are stuck in "discovered" state. The SEO cron (runs at 7:30am UTC) should pick them up. If this persists, the cron may be failing.`, {
        id: "fix-discovered",
        label: "Submit to IndexNow Now",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "submit_indexnow" },
        rerunGroup: "indexing",
      }));
    }

    // ── B6. Error URLs ──────────────────────────────────────────────────
    if (errorCount > 0) {
      // Get actual error details
      const errorRecords = await prisma.uRLIndexingStatus.findMany({
        where: { site_id: siteId, status: "error" },
        select: { url: true, last_error: true, submission_attempts: true },
        take: 10,
      });
      const errorBreakdown = errorRecords
        .map(r => `${r.url.split("/").pop()}: ${(r.last_error || "Unknown").substring(0, 80)} (${r.submission_attempts} attempts)`)
        .join("\n");

      results.push(fail("error-urls", "Indexing Errors", `${errorCount} articles have indexing errors`, "These articles had errors during submission or verification — they are NOT in Google.", `ERROR DETAILS:\n${errorBreakdown}`, {
        id: "fix-error-urls",
        label: "Retry All Failed",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "submit_indexnow" },
        rerunGroup: "indexing",
      }));
    } else {
      results.push(pass("error-urls", "Submission Errors", "No indexing errors", "No articles are stuck in an error state. All submissions either succeeded or are pending."));
    }

    // ── B7. Deindexed Detection ─────────────────────────────────────────
    if (deindexedCount > 0) {
      results.push(fail("deindexed", "Deindexed Pages", `${deindexedCount} articles were removed from Google's index`, "These articles were indexed before but Google removed them. This is a serious signal — Google decided the content wasn't worth keeping.", "Possible causes: thin content (<500 words), duplicate content, manual action by Google, or the page returns errors. Check each article's quality and resubmit."));
    }

    if (!budgetOk()) return results;

    // ═════════════════════════════════════════════════════════════════════
    // SECTION C: SUBMISSION INTEGRITY — Are submissions actually working?
    // ═════════════════════════════════════════════════════════════════════

    // ── C1. Submission Channel Coverage ────────────────────────────────
    const channelCounts = await Promise.all([
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_indexnow: true } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_sitemap: true } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_google_api: true } }),
    ]);
    const [viaIndexNow, viaSitemap, viaGoogleApi] = channelCounts;

    if (tracked > 0) {
      const channels: string[] = [];
      if (viaIndexNow > 0) channels.push(`IndexNow: ${viaIndexNow}`);
      if (viaSitemap > 0) channels.push(`Sitemap: ${viaSitemap}`);
      if (viaGoogleApi > 0) channels.push(`Google API: ${viaGoogleApi}`);

      if (channels.length === 0) {
        results.push(fail("submission-channels", "Submission Channels", "No articles submitted via any channel", "Articles exist in the tracking table but none were actually submitted to search engines.", "The submission pipeline is broken. Check that INDEXNOW_KEY is set and the SEO cron is running.", {
          id: "fix-channels",
          label: "Submit All Now",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "submit_indexnow" },
          rerunGroup: "indexing",
        }));
      } else if (viaIndexNow === 0 && indexNowKey) {
        results.push(warn("submission-channels", "Submission Channels", `${channels.join(" · ")} — IndexNow not used`, "IndexNow key is configured but no articles were submitted through it.", "The SEO cron may not be calling IndexNow correctly. Check cron logs for errors."));
      } else {
        results.push(pass("submission-channels", "Submission Channels", channels.join(" · "), "Shows which submission methods have been used. Multiple channels improve discovery speed."));
      }
    }

    // ── C2. "Submitted" but IndexNow=false (Fake Submissions) ──────────
    const fakeSubmitted = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        status: "submitted",
        submitted_indexnow: false,
        submitted_google_api: false,
        submitted_sitemap: false,
      },
    });

    if (fakeSubmitted > 0) {
      results.push(warn("fake-submitted", "Ghost Submissions", `${fakeSubmitted} marked "submitted" but no channel recorded`, "These articles show as 'submitted' in the database, but no actual submission channel is recorded. The status was set without IndexNow/GSC actually being called.", "This usually means the submission code set status='submitted' before confirming the API call succeeded. These need to be re-submitted."));
    }

    if (!budgetOk()) return results;

    // ═════════════════════════════════════════════════════════════════════
    // SECTION D: STALE & STUCK — Things not progressing
    // ═════════════════════════════════════════════════════════════════════

    // ── D1. Stale Submissions (submitted >14 days ago, not indexed) ────
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleSubmissions = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        status: "submitted",
        last_submitted_at: { lt: fourteenDaysAgo },
      },
      select: { url: true, last_submitted_at: true, submission_attempts: true, coverage_state: true },
      take: 20,
    });

    if (staleSubmissions.length > 0) {
      const oldest = staleSubmissions[0];
      const oldestAge = oldest.last_submitted_at ? ageLabel(Date.now() - oldest.last_submitted_at.getTime()) : "unknown";

      // Group by coverage state for diagnosis
      const coverageGroups: Record<string, number> = {};
      for (const s of staleSubmissions) {
        const state = s.coverage_state || "Unknown (never inspected)";
        coverageGroups[state] = (coverageGroups[state] || 0) + 1;
      }
      const coverageBreakdown = Object.entries(coverageGroups)
        .map(([state, count]) => `  ${state}: ${count}`)
        .join("\n");

      results.push(fail("stale-submitted", "Stale Submissions", `${staleSubmissions.length} articles submitted 14+ days ago but NOT indexed`, "These articles were submitted to Google but never made it into the index. After 14 days, something is likely blocking them.", `OLDEST: ${oldestAge}\n\nGOOGLE COVERAGE STATES:\n${coverageBreakdown}\n\nPossible causes:\n• "Discovered - currently not indexed" = Google found it but chose not to index (quality/authority issue)\n• "Crawled - currently not indexed" = Google read it but rejected it (thin content, duplicate, low value)\n• "Unknown" = GSC verification not running — we don't know what Google thinks\n\nFix: Improve content quality, ensure 1000+ words, add internal links, then resubmit.`, {
        id: "fix-stale",
        label: "Resubmit Stale Articles",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "submit_indexnow" },
        rerunGroup: "indexing",
      }));
    } else if (submittedCount > 0) {
      results.push(pass("stale-submitted", "Submission Freshness", "No stale submissions (all < 14 days)", "All submitted articles are within Google's normal processing window (1-14 days)."));
    }

    // ── D2. Google Coverage State Analysis ────────────────────────────────
    if (budgetOk()) {
      const coverageRecords = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          coverage_state: { not: null },
        },
        select: { coverage_state: true },
      });

      if (coverageRecords.length > 0) {
        const states: Record<string, number> = {};
        for (const r of coverageRecords) {
          const s = r.coverage_state || "null";
          states[s] = (states[s] || 0) + 1;
        }

        // Check for problematic states
        const crawledNotIndexed = Object.entries(states)
          .filter(([s]) => s.toLowerCase().includes("crawled") && s.toLowerCase().includes("not indexed"))
          .reduce((sum, [, c]) => sum + c, 0);

        const discoveredNotIndexed = Object.entries(states)
          .filter(([s]) => s.toLowerCase().includes("discovered") && s.toLowerCase().includes("not indexed"))
          .reduce((sum, [, c]) => sum + c, 0);

        const blockedByRobots = Object.entries(states)
          .filter(([s]) => s.toLowerCase().includes("robots"))
          .reduce((sum, [, c]) => sum + c, 0);

        const serverError = Object.entries(states)
          .filter(([s]) => s.toLowerCase().includes("error") || s.toLowerCase().includes("5xx"))
          .reduce((sum, [, c]) => sum + c, 0);

        const stateBreakdown = Object.entries(states)
          .sort(([, a], [, b]) => b - a)
          .map(([state, count]) => `  ${state}: ${count}`)
          .join("\n");

        if (crawledNotIndexed > 0 || discoveredNotIndexed > 0 || blockedByRobots > 0 || serverError > 0) {
          const issues: string[] = [];
          if (crawledNotIndexed > 0) issues.push(`${crawledNotIndexed} pages CRAWLED by Google but REJECTED — Google read your content and decided not to index it (quality/thin/duplicate issue)`);
          if (discoveredNotIndexed > 0) issues.push(`${discoveredNotIndexed} pages DISCOVERED but Google hasn't crawled them yet — Google knows they exist but doesn't think they're important enough to crawl right away`);
          if (blockedByRobots > 0) issues.push(`${blockedByRobots} pages BLOCKED BY ROBOTS.TXT — your robots.txt is preventing Google from crawling these pages`);
          if (serverError > 0) issues.push(`${serverError} pages returned SERVER ERRORS when Google tried to crawl them`);

          results.push(fail("coverage-states", "Google Coverage Analysis", `${coverageRecords.length} pages with Google coverage data — issues found`, "This is what Google actually thinks about your pages. Coverage states come from Google Search Console's URL Inspection API.", `COVERAGE STATE BREAKDOWN:\n${stateBreakdown}\n\nISSUES:\n${issues.map(i => `• ${i}`).join("\n")}`));
        } else {
          results.push(pass("coverage-states", "Google Coverage Analysis", `${coverageRecords.length} pages tracked — no blocking issues`, "Google Search Console coverage states show how Google views your pages."));
        }
      } else {
        if (gscEmail && gscKey && gscUrl) {
          results.push(warn("coverage-states", "Google Coverage Analysis", "No coverage data available", "GSC is configured but no pages have been inspected yet.", "Run the verify-indexing cron to check each page's status with Google."));
        } else {
          results.push(warn("coverage-states", "Google Coverage Analysis", "No GSC credentials — cannot check", "Without Google Search Console, we cannot see what Google thinks about your pages. You're flying blind."));
        }
      }
    }

    if (!budgetOk()) return results;

    // ═════════════════════════════════════════════════════════════════════
    // SECTION E: VELOCITY & TRENDS — Is indexing progressing?
    // ═════════════════════════════════════════════════════════════════════

    // ── E1. Indexing Velocity (last 7 days vs prior 7 days) ─────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgoDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [recentlyIndexed, priorIndexed] = await Promise.all([
      prisma.uRLIndexingStatus.count({
        where: { site_id: siteId, status: "indexed", updated_at: { gte: sevenDaysAgo } },
      }),
      prisma.uRLIndexingStatus.count({
        where: { site_id: siteId, status: "indexed", updated_at: { gte: fourteenDaysAgoDate, lt: sevenDaysAgo } },
      }),
    ]);

    if (recentlyIndexed > 0 || priorIndexed > 0) {
      const trend = recentlyIndexed > priorIndexed ? "accelerating" : recentlyIndexed < priorIndexed ? "slowing down" : "steady";
      const trendEmoji = recentlyIndexed > priorIndexed ? "📈" : recentlyIndexed < priorIndexed ? "📉" : "➡️";

      if (recentlyIndexed === 0 && priorIndexed > 0) {
        results.push(warn("index-velocity", "Indexing Velocity", `0 pages indexed this week (was ${priorIndexed} last week)`, "Tracks how fast Google is accepting your content.", `Indexing has STOPPED. Last week ${priorIndexed} pages were indexed, this week 0. Check: Is the SEO cron running? Are submissions going through? Is there a Google manual action?`));
      } else {
        results.push(recentlyIndexed > 0
          ? pass("index-velocity", "Indexing Velocity", `${trendEmoji} This week: ${recentlyIndexed} indexed — last week: ${priorIndexed} (${trend})`, "Tracks the rate at which Google accepts your pages. Accelerating is great, slowing down needs investigation.")
          : warn("index-velocity", "Indexing Velocity", `${trendEmoji} This week: 0 — last week: 0`, "No pages have been indexed in the last 14 days.", "Either no new content was submitted, or Google is not accepting submissions."));
      }
    } else if (indexedCount > 0) {
      results.push(pass("index-velocity", "Indexing Velocity", `${indexedCount} total indexed — no recent changes`, "All indexed pages were indexed more than 14 days ago. This is fine if no new content was published."));
    } else {
      results.push(warn("index-velocity", "Indexing Velocity", "No pages indexed yet", "No articles have been confirmed indexed by Google.", "This is normal for new sites. Submit articles and wait 1-14 days for Google to process."));
    }

    // ── E2. Time-to-Index SLA ─────────────────────────────────────────────
    if (budgetOk()) {
      const indexedWithDates = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          status: "indexed",
          last_submitted_at: { not: null },
        },
        select: { last_submitted_at: true, updated_at: true },
        take: 50,
      });

      if (indexedWithDates.length >= 3) {
        const deltas = indexedWithDates
          .filter(r => r.last_submitted_at)
          .map(r => r.updated_at.getTime() - r.last_submitted_at!.getTime())
          .filter(d => d > 0);

        if (deltas.length > 0) {
          const avgDays = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / (1000 * 60 * 60 * 24));
          const minDays = Math.round(Math.min(...deltas) / (1000 * 60 * 60 * 24));
          const maxDays = Math.round(Math.max(...deltas) / (1000 * 60 * 60 * 24));

          if (avgDays <= 7) {
            results.push(pass("time-to-index", "Time to Index", `Average: ${avgDays} days (range: ${minDays}-${maxDays}d)`, "How long it takes from submission to confirmed indexing. Under 7 days is healthy."));
          } else {
            results.push(warn("time-to-index", "Time to Index", `Average: ${avgDays} days (range: ${minDays}-${maxDays}d)`, "How long it takes from submission to indexing.", `Google is taking ${avgDays} days on average. For new/low-authority sites this is normal. Build more high-quality content and internal links to speed it up.`));
          }
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // SECTION F: CRON HEALTH — Are the indexing crons actually running?
    // ═════════════════════════════════════════════════════════════════════

    if (budgetOk()) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // ── F1. SEO Agent (discovers URLs) ──────────────────────────────────
      const seoAgentRuns = await prisma.cronJobLog.findMany({
        where: { job_name: "seo-agent", started_at: { gte: threeDaysAgo } },
        orderBy: { started_at: "desc" },
        take: 5,
        select: { status: true, started_at: true, error_message: true },
      });

      if (seoAgentRuns.length === 0) {
        results.push(warn("cron-seo-agent", "SEO Agent Cron", "No runs in 3 days", "The SEO agent discovers new URLs and marks them for submission. Without it running, new articles won't be found.", "Check vercel.json cron schedule and deployment status.", {
          id: "fix-seo-agent-cron",
          label: "Run SEO Agent Now",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "run_seo_agent" },
          rerunGroup: "indexing",
        }));
      } else {
        const lastRun = seoAgentRuns[0];
        const lastRunAge = ageLabel(Date.now() - lastRun.started_at.getTime());
        const failCount = seoAgentRuns.filter(r => r.status === "failed" || r.status === "timeout").length;
        if (lastRun.status === "completed" && failCount === 0) {
          results.push(pass("cron-seo-agent", "SEO Agent Cron", `Last run: ${lastRunAge} — all recent runs OK`, "The SEO agent discovers URLs and prepares them for submission. Running healthy."));
        } else {
          const lastError = seoAgentRuns.find(r => r.error_message)?.error_message?.substring(0, 100) || "Unknown";
          results.push(warn("cron-seo-agent", "SEO Agent Cron", `${failCount}/${seoAgentRuns.length} recent runs failed — last: ${lastRunAge}`, "The SEO agent must run to discover new URLs.", `Last error: ${lastError}`, {
            id: "fix-seo-agent-cron",
            label: "Run SEO Agent Now",
            api: "/api/admin/diagnostics/fix",
            payload: { fixType: "run_seo_agent" },
            rerunGroup: "indexing",
          }));
        }
      }

      // ── F2. SEO Cron (submits to IndexNow) ────────────────────────────
      const seoCronRuns = await prisma.cronJobLog.findMany({
        where: { job_name: { startsWith: "seo-cron" }, started_at: { gte: threeDaysAgo } },
        orderBy: { started_at: "desc" },
        take: 5,
        select: { status: true, started_at: true, error_message: true, items_processed: true },
      });

      if (seoCronRuns.length === 0) {
        results.push(warn("cron-seo-cron", "SEO Submission Cron", "No runs in 3 days", "The SEO cron submits discovered URLs to IndexNow and Google. Without it, URLs pile up in 'discovered' state.", "This cron runs at /api/seo/cron — check vercel.json schedule.", {
          id: "fix-seo-cron",
          label: "Run SEO Cron Now",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "run_seo_orchestrator" },
          rerunGroup: "indexing",
        }));
      } else {
        const lastRun = seoCronRuns[0];
        const lastRunAge = ageLabel(Date.now() - lastRun.started_at.getTime());
        const failCount = seoCronRuns.filter(r => r.status === "failed" || r.status === "timeout").length;
        const totalItems = seoCronRuns.reduce((sum, r) => sum + (r.items_processed || 0), 0);
        if (lastRun.status === "completed" && failCount === 0) {
          results.push(pass("cron-seo-cron", "SEO Submission Cron", `Last run: ${lastRunAge} — ${totalItems} URLs processed in 3d`, "The SEO cron submits URLs to IndexNow and Google. Running healthy."));
        } else {
          const lastError = seoCronRuns.find(r => r.error_message)?.error_message?.substring(0, 100) || "Unknown";
          results.push(warn("cron-seo-cron", "SEO Submission Cron", `${failCount}/${seoCronRuns.length} recent runs failed`, "The SEO cron must run to submit URLs to search engines.", `Last error: ${lastError}`));
        }
      }

      // ── F3. Verify-Indexing Cron (checks Google) ────────────────────────
      const verifyRuns = await prisma.cronJobLog.findMany({
        where: { job_name: { in: ["verify-indexing", "seo-orchestrator"] }, started_at: { gte: threeDaysAgo } },
        orderBy: { started_at: "desc" },
        take: 3,
        select: { job_name: true, status: true, started_at: true },
      });

      if (verifyRuns.length === 0 && gscEmail && gscKey) {
        results.push(warn("cron-verify", "Indexing Verification Cron", "No verification runs in 3 days", "The verify-indexing cron checks Google's URL Inspection API to confirm if pages are actually indexed. Without it, we only know what we submitted — not what Google accepted."));
      } else if (verifyRuns.length > 0) {
        const lastAge = ageLabel(Date.now() - verifyRuns[0].started_at.getTime());
        results.push(pass("cron-verify", "Indexing Verification", `Last verification: ${lastAge}`, "Confirms indexing status with Google's URL Inspection API."));
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // SECTION G: CONTENT QUALITY BLOCKERS — Content issues blocking indexing
    // ═════════════════════════════════════════════════════════════════════

    if (budgetOk()) {
      // ── G1. SEO Score Distribution ────────────────────────────────────
      const posts = await prisma.blogPost.findMany({
        where: { siteId, published: true },
        select: { seo_score: true },
      });

      if (posts.length > 0) {
        const scores = posts.map(p => p.seo_score || 0);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const below50 = scores.filter(s => s < 50).length;
        const above70 = scores.filter(s => s >= 70).length;

        if (avg >= 70) {
          results.push(pass("seo-scores", "SEO Score Average", `${avg}/100 — ${above70}/${posts.length} above 70`, "Average SEO score. Higher scores mean better optimized content that Google is more likely to index and rank."));
        } else {
          results.push(warn("seo-scores", "SEO Score Average", `${avg}/100 — ${below50} articles below 50`, "Low SEO scores can contribute to indexing failures. Google deprioritizes poorly-optimized content.", `${below50} article(s) have very low scores. Run the SEO agent to auto-fix meta tags, headings, and other issues.`, {
            id: "fix-seo-scores",
            label: "Run SEO Agent",
            api: "/api/admin/diagnostics/fix",
            payload: { fixType: "run_seo_agent" },
            rerunGroup: "indexing",
          }));
        }
      }

      // ── G2. Thin Content ──────────────────────────────────────────────
      // word_count_en doesn't exist on BlogPost schema — compute from content_en
      const postsWithContent = await prisma.blogPost.findMany({
        where: { siteId, published: true },
        select: { content_en: true },
      });
      const thinPosts = postsWithContent.filter(
        (p) => (p.content_en || "").split(/\s+/).filter(Boolean).length < 800
      ).length;

      if (thinPosts > 0) {
        results.push(warn("thin-content", "Thin Content", `${thinPosts} articles under 800 words`, "Google's Jan 2026 update actively demotes thin content. Articles under 800 words are unlikely to be indexed or ranked.", "Use the content auto-fix cron to expand thin articles, or manually improve them.", {
          id: "fix-thin-content",
          label: "Run Content Auto-Fix",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "run_content_autofix" },
          rerunGroup: "indexing",
        }));
      } else if (postsWithContent.length > 0) {
        results.push(pass("thin-content", "Content Length", "All articles are 800+ words", "Google prefers substantial, in-depth content. All your articles meet the minimum threshold."));
      }

      // ── G3. Meta Description Coverage ─────────────────────────────────
      const missingMeta = await prisma.blogPost.count({
        where: {
          siteId,
          published: true,
          OR: [{ meta_description_en: null }, { meta_description_en: "" }],
        },
      });

      if (missingMeta === 0) {
        results.push(pass("meta-coverage", "Meta Descriptions", "All articles have meta descriptions", "Meta descriptions control what appears in Google search results. Missing ones get auto-generated by Google — often poorly."));
      } else {
        results.push(warn("meta-coverage", "Meta Descriptions", `${missingMeta} articles missing meta descriptions`, "Articles without meta descriptions get Google's auto-generated snippets, which hurt click-through rates.", "Run the SEO agent — it auto-generates meta descriptions for articles that lack them.", {
          id: "fix-meta-descriptions",
          label: "Auto-Fix Meta Descriptions",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "run_seo_agent" },
          rerunGroup: "indexing",
        }));
      }

      // ── G4. Internal Links ────────────────────────────────────────────
      if (budgetOk()) {
        // Quick sample check: look at recent articles for internal link density
        const recentArticles = await prisma.blogPost.findMany({
          where: { siteId, published: true },
          select: { content_en: true, slug: true },
          orderBy: { created_at: "desc" },
          take: 10,
        });

        let lowLinkCount = 0;
        for (const article of recentArticles) {
          const content = article.content_en || "";
          // Count internal links (href pointing to same domain or relative paths)
          const linkMatches = content.match(/<a\s[^>]*href="[^"]*"/gi) || [];
          const internalLinks = linkMatches.filter(l => l.includes("/blog/") || l.includes("/information/") || l.includes("/news/")).length;
          if (internalLinks < 2) lowLinkCount++;
        }

        if (lowLinkCount > 0) {
          results.push(warn("internal-links", "Internal Links", `${lowLinkCount} of ${recentArticles.length} recent articles have < 2 internal links`, "Internal links help Google discover and crawl your content. Pages with few internal links are harder for Google to find and may be skipped during crawling.", "The SEO agent can auto-inject internal links. Run it to improve link coverage.", {
            id: "fix-internal-links",
            label: "Run SEO Agent (Link Injection)",
            api: "/api/admin/diagnostics/fix",
            payload: { fixType: "run_seo_agent" },
            rerunGroup: "indexing",
          }));
        } else if (recentArticles.length > 0) {
          results.push(pass("internal-links", "Internal Links", "Recent articles have good internal linking", "Internal links help Google discover and index more of your content."));
        }
      }
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      results.push(fail("index-db", "Indexing Database", "Required tables missing", "The indexing system needs BlogPost and URLIndexingStatus tables.", "Run the database schema fix to create missing tables.", {
        id: "fix-index-table",
        label: "Fix Database Schema",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "db_push" },
        rerunGroup: "indexing",
      }));
    } else {
      results.push(fail("index-db", "Indexing Database", `Error: ${msg.substring(0, 120)}`, "Indexing diagnostics require database access."));
    }
  }

  return results;
};

export default indexingSection;
