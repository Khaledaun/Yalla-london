/**
 * Claude Chrome Bridge — Capabilities Manifest
 *
 * Single source of truth for what the bridge exposes. Claude Chrome calls this
 * first to discover endpoints, schemas, and new capabilities without re-reading
 * the playbook. Update on every expansion.
 */

import type { NextResponse as _NR } from "next/server";

export const BRIDGE_VERSION = "2026-04-20.18";
export const PLAYBOOK_VERSION = "2026-04-20";

export type EndpointKind = "read" | "write" | "interpret" | "meta";

export interface EndpointManifest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  kind: EndpointKind;
  summary: string;
  inputs?: Record<string, string>; // param -> description
  outputs?: string; // one-line shape description
  addedIn?: string; // version tag, e.g. "2026-04-20"
  since?: string; // ISO date
  status?: "stable" | "beta";
}

export const ENDPOINTS: EndpointManifest[] = [
  {
    method: "GET",
    path: "/api/admin/chrome-bridge",
    kind: "meta",
    summary: "Self-documenting index with quick endpoint list",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/capabilities",
    kind: "meta",
    summary: "Full capabilities manifest with endpoint schemas, versions, feature flags",
    addedIn: "2026-04-20.2",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/sites",
    kind: "read",
    summary: "All active sites with brand colors, locale, keywords",
    outputs: "{ sites: SiteInfo[], count: number }",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/overview",
    kind: "read",
    summary: "Cross-site snapshot: published posts, cron failures, pipeline phases, recent audits",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/pages",
    kind: "read",
    summary: "Published pages with GSC 7d metrics, ranked by recency",
    inputs: { siteId: "required site ID", limit: "max 200, default 50", offset: "pagination" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/page/[id]",
    kind: "read",
    summary: "Single page deep dive: BlogPost + GSC 30d + indexing + enhancement log + audit history",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/action-logs",
    kind: "read",
    summary: "Unified cron/audit/autofix/AI log view for triage",
    inputs: { hours: "window (max 168)", siteId: "optional filter" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/cycle-health",
    kind: "read",
    summary: "Lightweight pipeline signals (phase distribution, stuck drafts, recent publishes)",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/aggregated-report",
    kind: "read",
    summary: "Latest persisted SeoAuditReport rows for a site",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/gsc",
    kind: "read",
    summary: "Google Search Console: top pages, top keywords, sitemaps",
    inputs: { siteId: "required", days: "max 90", limit: "max 200" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4",
    kind: "read",
    summary: "GA4 metrics: sessions, pageviews, bounce rate, top sources",
    inputs: { siteId: "required", days: "max 90" },
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/revenue",
    kind: "read",
    summary: "Per-page revenue attribution: affiliate clicks, commissions, EPC, classification (earner | dead_weight | unmonetized | fresh | cold)",
    inputs: { siteId: "required", days: "max 90, default 30", limit: "max 200" },
    outputs: "{ totals, classificationCounts, topEarners, deadWeight, unmonetized, pages }",
    addedIn: "2026-04-20.3",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/history",
    kind: "read",
    summary: "Audit memory — chronological ChromeAuditReport history for a URL or site-wide, with delta between the two most recent reports (resolved / recurring / new findings)",
    inputs: { siteId: "required if no pageUrl", pageUrl: "exact URL", auditType: "optional filter", limit: "max 100" },
    outputs: "{ timeline, delta: { resolved[], recurring[], newFindings[] }, statusCounts, severityCounts, fixRate }",
    addedIn: "2026-04-20.4",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/opportunities",
    kind: "read",
    summary: "What to write next: TopicProposal queue + GSC near-miss queries (position 11-30, ≥50 impressions) + content gaps from site primaryKeywords",
    inputs: { siteId: "required", days: "max 90", limit: "max 100" },
    outputs: "{ topicQueue, nearMissQueries, contentGaps: { en, ar }, summary }",
    addedIn: "2026-04-20.5",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/lighthouse",
    kind: "interpret",
    summary: "PageSpeed Insights wrapper — Core Web Vitals (LCP/INP/CLS) + category scores + interpreted findings with Google 2026 thresholds",
    inputs: { url: "required full URL", strategy: "mobile (default) | desktop" },
    outputs: "{ coreWebVitals, scores, diagnostics, findings, interpretedActions }",
    addedIn: "2026-04-20.6",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/schema",
    kind: "interpret",
    summary: "JSON-LD validator. Fetches page, extracts ld+json blocks, validates syntax + required fields + flags deprecated types (FAQPage restricted, HowTo deprecated per Jan 2026 standards)",
    inputs: { url: "required full URL" },
    outputs: "{ blockCount, typeOccurrences, validated[], findings, interpretedActions }",
    addedIn: "2026-04-20.7",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/broken-links",
    kind: "read",
    summary: "Scans published BlogPost content for dead /blog/<slug> internal links + orphan pages (0 inbound) + weakly-linked pages (<2 inbound). DB-only, no HTTP.",
    inputs: { siteId: "required", limit: "max 500, default 200" },
    outputs: "{ brokenLinks, topBrokenTargets, orphanPages, weaklyLinked, summary }",
    addedIn: "2026-04-20.8",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/rejected-drafts",
    kind: "read",
    summary: "Pattern-mine ArticleDraft rejections. Top error patterns (normalized), rejection rate, MAX_RECOVERIES_EXCEEDED count, locale split, repeated topic rejections, 14-day velocity.",
    inputs: { siteId: "required", days: "max 90", limit: "max 500" },
    outputs: "{ summary, topErrorPatterns, localeCounts, repeatedTopicIds, recentVelocity, recent[] }",
    addedIn: "2026-04-20.9",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/errors",
    kind: "read",
    summary: "URL errors inferred from URLIndexingStatus + GSC orphans + CronJobLog HTTP failures. No Vercel Logs API needed.",
    inputs: { siteId: "required", days: "max 90, default 30" },
    outputs: "{ summary, indexingErrors, sitemapOrphans, cronFailuresWithHttpErrors }",
    addedIn: "2026-04-20.10",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/arabic-ssr",
    kind: "interpret",
    summary: "Verifies /ar/ routes render Arabic server-side (closes KG-032). Checks html lang=ar, dir=rtl, body Arabic char ratio ≥20%, title + H1/H2 contain Arabic.",
    inputs: { siteId: "required OR url for single-URL mode", limit: "max 30 pages" },
    outputs: "{ summary { complianceRate }, results[], findings, interpretedActions }",
    addedIn: "2026-04-20.11",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/serp",
    kind: "interpret",
    summary: "Competitor SERP via DataForSEO. Top 10 organic + featured snippet + PAA + AI Overview citations. Detects if we rank and if we're cited.",
    inputs: { keyword: "required", locationCode: "default 2826 UK", languageCode: "default en" },
    outputs: "{ serp, ourRanking, ourAioCitation, competitorDomains, findings, actions }",
    addedIn: "2026-04-20.12",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/keyword-research",
    kind: "read",
    summary: "Keyword search volume + CPC + competition via DataForSEO Keywords Data API. Up to 100 keywords per request.",
    inputs: { keywords: "comma-separated, required", locationCode: "default 2826 UK" },
    outputs: "{ allMetrics, topByVolume, topByCpc, totalMonthlyVolume, avgCpc }",
    addedIn: "2026-04-20.12",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ab-test",
    kind: "read",
    summary: "List A/B tests with per-test stats (z-test confidence, lift, winner).",
    inputs: { siteId: "optional", status: "active|paused|concluded|archived|all", limit: "max 200" },
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/ab-test",
    kind: "write",
    summary: "Register new A/B test. Variant types: title | meta_description | affiliate_cta | hero | content_section. Returns testId and integration hint.",
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ab-test/[id]",
    kind: "read",
    summary: "Single A/B test detail + live stats.",
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/ab-test/[id]",
    kind: "write",
    summary: "Conclude A/B test. Body: { action: 'conclude' }. Computes winner + confidence, sets status=concluded.",
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "PATCH",
    path: "/api/admin/chrome-bridge/ab-test/[id]",
    kind: "write",
    summary: "Update A/B test (pause/resume/notes/winner-override).",
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/ab-test/track",
    kind: "write",
    summary: "Tracking beacon (no auth). Payload: { testId, variant: A|B, event: impression|click|conversion }. Rate-limited to 1 hit/min/IP/event.",
    addedIn: "2026-04-20.13",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/impact",
    kind: "interpret",
    summary: "Measures CTR/position/clicks/commission delta for 7/14/30d before vs after ChromeAuditReport.fixedAt. Verdict: confirmed_improvement | no_change | regression | insufficient_data. Closes the learning loop.",
    inputs: { reportId: "single-audit mode", siteId: "aggregate mode", days: "aggregate window max 180" },
    outputs: "{ mode, impact|impacts[], summary.verdictCounts, summary.improvementRate }",
    addedIn: "2026-04-20.14",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/gsc/inspect",
    kind: "interpret",
    summary: "Single-URL GSC inspection. Verdict, coverage state, canonical mismatch detection, mobile usability. Auto-generates findings for 'not indexed', 'crawled but not indexed' (quality signal), canonical mismatch.",
    inputs: { url: "required full URL", siteId: "optional, inferred from URL if not given" },
    outputs: "{ inspection, findings, interpretedActions }",
    addedIn: "2026-04-20.15",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/gsc/breakdown",
    kind: "read",
    summary: "Multi-dimensional GSC Search Analytics. Slice by device/country/date/searchAppearance/page/query.",
    inputs: { siteId: "required", days: "max 90", by: "device|country|date|searchAppearance|page|query", limit: "max 500" },
    outputs: "{ summary { totalClicks, totalImpressions, overallCtr, avgPosition }, rows[] }",
    addedIn: "2026-04-20.15",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/gsc/coverage-summary",
    kind: "interpret",
    summary: "Indexing coverage report derived from URLIndexingStatus DB (GSC Coverage UI is not API-accessible). Flags chronic failures (15+ attempts), deindexed pages, 'crawled but not indexed' quality signals.",
    inputs: { siteId: "required" },
    outputs: "{ summary { indexingRate }, statusGroups, coverageStateBuckets, chronicFailures, deindexed, findings, interpretedActions }",
    addedIn: "2026-04-20.15",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4/channels",
    kind: "read",
    summary: "Traffic by channel group + source/medium. Sessions, engagement rate, bounce rate per channel.",
    inputs: { siteId: "required", days: "max 90" },
    addedIn: "2026-04-20.16",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4/conversions",
    kind: "read",
    summary: "Event counts + key business metrics (affiliate_click rate, page_view rate). Filter by eventName.",
    inputs: { siteId: "required", days: "max 90", eventName: "optional exact filter" },
    addedIn: "2026-04-20.16",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4/realtime",
    kind: "read",
    summary: "Active users in last 30 min. Total + by country + top pages + top sources right now.",
    inputs: { siteId: "required" },
    addedIn: "2026-04-20.16",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/ga4/funnel",
    kind: "read",
    summary: "Per-page engagement funnel (page_view → scroll → affiliate_click) with pagePath param. Aggregate mode lists worst-performers (high traffic + high bounce).",
    inputs: { siteId: "required", days: "max 90", pagePath: "optional, exact path" },
    addedIn: "2026-04-20.16",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/affiliate/gaps",
    kind: "interpret",
    summary: "Scans published articles for brand mentions (Booking, Agoda, HalalBooking, etc.) that aren't wrapped in affiliate tracking. Ranked by unlinked mention count.",
    inputs: { siteId: "required", limit: "max 500" },
    outputs: "{ summary, topGapBrands, topArticlesByGap }",
    addedIn: "2026-04-20.17",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/affiliate/recommendations",
    kind: "interpret",
    summary: "Affiliate program recommendations synthesized from GSC intent volume + existing coverage + typical EPC. Priority-ranked.",
    inputs: { siteId: "required", days: "max 90" },
    outputs: "{ intentVolume, categoryCoverage, recommendations[] }",
    addedIn: "2026-04-20.17",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/affiliate/commission-trends",
    kind: "interpret",
    summary: "Weekly commission velocity per advertiser. Classifies each as declining / rising / stable / new / inactive based on last 3 weeks vs prior 3 weeks.",
    inputs: { siteId: "required", days: "max 180" },
    outputs: "{ summary, trends, declining, rising, inactive }",
    addedIn: "2026-04-20.17",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/affiliate/approval-queue",
    kind: "read",
    summary: "CjAdvertiser state overview. Flags stuck-pending applications (>30d). Recommends high-EPC advertisers to apply to.",
    outputs: "{ summary, joined, pending, stuckPending, recommendedApplications }",
    addedIn: "2026-04-20.17",
    status: "stable",
  },
  {
    method: "GET",
    path: "/api/admin/chrome-bridge/not-indexed-details",
    kind: "interpret",
    summary: "Diagnostic details for every URL Google declined to index. Per-page triage bucketing (thin_content / ai_generic_heavy / low_authenticity / generic_author / low_seo_score / shallow_depth) with word count, authenticity signals, AI-generic phrase count, author attribution, enhancement log.",
    inputs: { siteId: "required", limit: "max 100" },
    outputs: "{ summary, pages[] with content/quality/diagnoseTriage }",
    addedIn: "2026-04-20.18",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/enhance-not-indexed",
    kind: "write",
    summary: "Creates Campaign + CampaignItems targeting not-indexed pages. Triage → per-item operations (expand_content, add_authenticity, fix_meta_*, add_internal_links). Runs via campaign-executor cron.",
    inputs: { siteId: "required", dryRun: "preview", limit: "max 100", minAge: "skip pages <N days old" },
    outputs: "{ campaignId, itemCount, triageDistribution, plan[] }",
    addedIn: "2026-04-20.18",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/report",
    kind: "write",
    summary: "Upload per-page, sitewide, or offsite audit report",
    outputs: "{ reportId, agentTaskId, reportPath, severity, findingsCount, viewerUrl }",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
  {
    method: "POST",
    path: "/api/admin/chrome-bridge/triage",
    kind: "write",
    summary: "Upload action-log triage report (cross-cron failure clustering)",
    addedIn: "2026-04-20.1",
    status: "stable",
  },
];

/**
 * Suggests next endpoints a Claude Chrome session should explore based on
 * what they just called. Included in responses as `_hints.suggested`.
 */
export function suggestNextEndpoints(justCalled: string): string[] {
  const suggestions: Record<string, string[]> = {
    "overview": [
      "GET /sites to get brand colors + keywords for each site",
      "GET /pages?siteId=X to pick per-page audit targets",
      "GET /action-logs if cron failures look concerning",
    ],
    "sites": [
      "GET /pages?siteId=<chosen> to see published content",
      "GET /aggregated-report?siteId=<chosen> for latest SEO audit",
    ],
    "pages": [
      "GET /page/[id] for deep dive on a specific page",
      "Then visit the live URL in browser for visual/UX evaluation",
      "POST /report with findings when audit complete",
    ],
    "page": [
      "Visit the live URL in your Chrome browser now",
      "Check mobile (375px) + desktop (1440px) renders",
      "GET /revenue?siteId=X to see if this page earns",
      "POST /report when ready with all 5 pillars",
    ],
    "revenue": [
      "Dead-weight pages (high traffic, $0): GET /page/[id] + propose affiliate injection",
      "Unmonetized pages: trigger affiliate-injection cron via /admin",
      "Top earners: protect them — audit for title/meta optimization only, no invasive rewrites",
    ],
    "history": [
      "Check `delta.recurring` — findings that keep returning. Escalate severity.",
      "Check `delta.resolved` — celebrate wins AND verify they stayed fixed (fetch GSC 30d).",
      "High fix rate + recurring findings = the applied fix didn't actually work. Audit deeper.",
    ],
    "opportunities": [
      "Near-miss queries ranked 11-20 with ≥200 impressions: high-impact content expansion targets",
      "Content gaps (en/ar): primary keywords with zero published coverage — prioritize new article creation",
      "TopicQueue with high confidence: next-up for the pipeline — no action needed unless blocked",
    ],
    "lighthouse": [
      "Poor LCP (>4s) typically = unoptimized hero image. Check next/image + priority flag.",
      "Poor INP (>500ms) = heavy JS on main thread. Check bundle size, defer non-critical scripts.",
      "Poor CLS (>0.25) = images/iframes without width/height, or font swap flash. Easy wins.",
      "Run desktop strategy too — mobile ≠ desktop results, audit both.",
    ],
    "action-logs": [
      "POST /triage with clustered findings + proposed fixes",
      "GET /cycle-health for a second diagnostic angle",
    ],
    "cycle-health": [
      "GET /action-logs for raw failure data",
      "POST /triage if pipeline is degraded",
    ],
    "gsc": [
      "GET /pages?siteId=X to cross-reference top pages",
      "For CTR outliers: GET /page/[id] and audit",
    ],
    "ga4": [
      "GET /gsc?siteId=X to cross-reference search data",
      "High-bounce pages: GET /page/[id] + audit first-screen UX",
    ],
  };
  const key = justCalled.split("/").filter(Boolean).pop() ?? "";
  return suggestions[key] ?? [];
}

/**
 * Build the standard `_hints` block included on every bridge response.
 * Claude Chrome reads this to stay aware of new capabilities between sessions.
 */
export function buildHints(params: {
  justCalled: string;
  viaBridgeToken?: boolean;
}): {
  version: string;
  playbookVersion: string;
  suggested: string[];
  playbook: string;
  capabilities: string;
  viewer: string;
} {
  return {
    version: BRIDGE_VERSION,
    playbookVersion: PLAYBOOK_VERSION,
    suggested: suggestNextEndpoints(params.justCalled),
    playbook: "docs/chrome-audits/PLAYBOOK.md",
    capabilities: "/api/admin/chrome-bridge/capabilities",
    viewer: "/admin/chrome-audits",
  };
}
