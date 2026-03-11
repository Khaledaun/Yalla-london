/**
 * Development Plan Registry
 *
 * Structured TypeScript plan definitions for the Development Monitor.
 * Plans are code — no markdown parsing needed.
 * Each task maps to a testType in live-tests.ts for real, visible test outcomes.
 */

export interface DevPlanTask {
  id: string;           // "A.1.1"
  phase: string;        // "A.1 Revenue Visibility"
  phaseOrder: number;   // 1
  taskOrder: number;    // 1
  taskTotal: number;    // tasks in this phase
  title: string;
  description: string;
  testType: string;     // maps to live test function in live-tests.ts
  testable: boolean;    // false = test button grayed out
  status: "done" | "todo" | "in-progress";
  readiness: number;    // 0-100
  dueDate: string;      // ISO date
  startDate: string;
  category: string;     // DevTask category field
  dependsOn?: string[]; // task IDs that must complete first
}

export interface DevPlan {
  id: string;           // "stage-a"
  project: string;      // "general / march26"
  title: string;        // "Stage A: Infrastructure Completion"
  tasks: DevPlanTask[];
}

// ── Stage A: Infrastructure Completion ─────────────────────────────────────────

export const STAGE_A_PLAN: DevPlan = {
  id: "stage-a",
  project: "general / march26",
  title: "Stage A: Infrastructure Completion",
  tasks: [
    // ── Phase A.1: Revenue Visibility (4 tasks) ──────────────────────────────
    {
      id: "A.1.1",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 1,
      taskTotal: 4,
      title: "GA4 Dashboard Wiring",
      description: "Connect GA4 Data API to cockpit so traffic numbers are real (not 0s). MCP server works, cockpit needs wiring.",
      testType: "ga4-live-pull",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-11",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.1.2",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 2,
      taskTotal: 4,
      title: "Affiliate Click Tracking",
      description: "Server-side redirect tracking via CjClickEvent + SID tracking in CTA blocks.",
      testType: "affiliate-click-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "pipeline",
    },
    {
      id: "A.1.3",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 3,
      taskTotal: 4,
      title: "Per-Site OG Images",
      description: "Dynamic OG image generator at /api/og using Next.js ImageResponse with per-site brand colors.",
      testType: "og-image-render",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "content",
    },
    {
      id: "A.1.4",
      phase: "A.1 Revenue Visibility",
      phaseOrder: 1,
      taskOrder: 4,
      taskTotal: 4,
      title: "Login Rate Limiting",
      description: "5 attempts/15min with progressive delays. Middleware adds 5 req/15min on auth routes. 429 with Retry-After.",
      testType: "login-rate-limit-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },

    // ── Phase A.2: Multi-Site Hardening (4 tasks) ────────────────────────────
    {
      id: "A.2.1",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 1,
      taskTotal: 4,
      title: "CJ Schema Migration",
      description: "Add siteId to CJ models (CjCommission, CjClickEvent, CjOffer) so revenue data doesn't leak between sites.",
      testType: "cj-schema-check",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-18",
      startDate: "2026-03-11",
      category: "pipeline",
    },
    {
      id: "A.2.2",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 2,
      taskTotal: 4,
      title: "Arabic SSR",
      description: "Server-render Arabic HTML at /ar/ routes so Google indexes Arabic content properly. Currently returns English HTML.",
      testType: "arabic-ssr-check",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-20",
      startDate: "2026-03-11",
      category: "seo",
    },
    {
      id: "A.2.3",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 3,
      taskTotal: 4,
      title: "Feature Flags Runtime Wiring",
      description: "lib/feature-flags.ts with isFeatureFlagEnabled() + 60s cache. lib/cron-feature-guard.ts maps 32+ crons.",
      testType: "feature-flags-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },
    {
      id: "A.2.4",
      phase: "A.2 Multi-Site Hardening",
      phaseOrder: 2,
      taskOrder: 4,
      taskTotal: 4,
      title: "Brand Templates for Non-London Sites",
      description: "getBrandProfile() returns correct colors, fonts, and names for all 6 sites. Brand kit generator produces per-site output.",
      testType: "brand-kit-test",
      testable: true,
      status: "done",
      readiness: 95,
      dueDate: "2026-03-11",
      startDate: "2026-03-04",
      category: "content",
    },

    // ── Phase A.3: Compliance & Social (4 tasks) ─────────────────────────────
    {
      id: "A.3.1",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 1,
      taskTotal: 4,
      title: "Cookie Consent Banner",
      description: "Bilingual EN/AR cookie consent banner with 4 categories, localStorage-persisted, auto-applied on load.",
      testType: "cookie-consent-verify",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },
    {
      id: "A.3.2",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 2,
      taskTotal: 4,
      title: "GDPR Data Deletion",
      description: "Public endpoint to delete user data (EmailSubscriber, CharterInquiry, CjClickEvent by email). Logs to AuditLog.",
      testType: "gdpr-endpoint-test",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-25",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.3.3",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 3,
      taskTotal: 4,
      title: "Twitter/X Auto-Publish",
      description: "Wire Twitter API v2 so social cron publishes posts automatically. Needs API keys in Vercel.",
      testType: "twitter-api-verify",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-25",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.3.4",
      phase: "A.3 Compliance & Social",
      phaseOrder: 3,
      taskOrder: 4,
      taskTotal: 4,
      title: "SendGrid Integration",
      description: "Multi-provider email sender (SMTP/Resend/SendGrid) fully wired. Just needs provider API keys in Vercel.",
      testType: "email-send-test",
      testable: true,
      status: "done",
      readiness: 100,
      dueDate: "2026-03-04",
      startDate: "2026-03-04",
      category: "config",
    },

    // ── Phase A.4: Cleanup (3 tasks) ─────────────────────────────────────────
    {
      id: "A.4.1",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 1,
      taskTotal: 3,
      title: "Orphan Prisma Models Audit",
      description: "Remove unused Prisma models with 0 references outside schema.prisma. Preserve models used by DB, APIs, admin, crons.",
      testType: "prisma-orphan-scan",
      testable: true,
      status: "todo",
      readiness: 0,
      dueDate: "2026-03-28",
      startDate: "2026-03-11",
      category: "config",
    },
    {
      id: "A.4.2",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 2,
      taskTotal: 3,
      title: "Dead Admin Buttons",
      description: "Find and wire all non-functional buttons in admin pages. Down from 50+ to ~10 remaining.",
      testType: "dead-buttons-scan",
      testable: true,
      status: "done",
      readiness: 95,
      dueDate: "2026-03-11",
      startDate: "2026-03-04",
      category: "content",
    },
    {
      id: "A.4.3",
      phase: "A.4 Cleanup",
      phaseOrder: 4,
      taskOrder: 3,
      taskTotal: 3,
      title: "Test Suite Expansion",
      description: "Smoke tests at 104+ tests across 20 categories. Target: 120+.",
      testType: "smoke-test-run",
      testable: true,
      status: "in-progress",
      readiness: 87,
      dueDate: "2026-03-15",
      startDate: "2026-03-04",
      category: "config",
    },
  ],
};

// ── Content Pipeline Plan ──────────────────────────────────────────────────────

export const CONTENT_PIPELINE_PLAN: DevPlan = {
  id: "content-pipeline",
  project: "general / march26",
  title: "Content Pipeline & Quality",
  tasks: [
    {
      id: "CP.1.1",
      phase: "CP.1 Pipeline Core",
      phaseOrder: 1, taskOrder: 1, taskTotal: 4,
      title: "8-Phase Content Pipeline",
      description: "Topics → Research → Outline → Draft → Assembly → Images → SEO → Scoring → Reservoir. All 8 phases operational.",
      testType: "content-pipeline-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-02-16", category: "pipeline",
    },
    {
      id: "CP.1.2",
      phase: "CP.1 Pipeline Core",
      phaseOrder: 1, taskOrder: 2, taskTotal: 4,
      title: "16-Check Pre-Publication Gate",
      description: "Route, Arabic, SEO, score, headings, word count, internal links, readability, alt text, author, schema, authenticity, affiliates, AIO, link ratio, citability.",
      testType: "prepub-gate-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-10", startDate: "2026-02-18", category: "seo",
    },
    {
      id: "CP.1.3",
      phase: "CP.1 Pipeline Core",
      phaseOrder: 1, taskOrder: 3, taskTotal: 4,
      title: "Content-Type Quality Gates",
      description: "Per-type thresholds: blog 1000w, news 150w, info 300w, guide 400w. Arabic-only content uses content_ar.",
      testType: "content-type-gates-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-02-26", category: "pipeline",
    },
    {
      id: "CP.1.4",
      phase: "CP.1 Pipeline Core",
      phaseOrder: 1, taskOrder: 4, taskTotal: 4,
      title: "Atomic Claiming & Transaction Safety",
      description: "Reservoir promotion uses updateMany atomic claim. BlogPost.create + draft update in $transaction. EN+AR pair in transaction.",
      testType: "pipeline-safety-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-03-09", category: "pipeline",
    },
    {
      id: "CP.2.1",
      phase: "CP.2 AI Reliability",
      phaseOrder: 2, taskOrder: 1, taskTotal: 3,
      title: "Circuit Breaker + Provider Chain",
      description: "3-failure circuit breaker with 5-min cooldown. Grok → OpenAI → Claude → Perplexity fallback chain.",
      testType: "circuit-breaker-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-05", category: "pipeline",
    },
    {
      id: "CP.2.2",
      phase: "CP.2 AI Reliability",
      phaseOrder: 2, taskOrder: 2, taskTotal: 3,
      title: "Last-Defense Fallback",
      description: "lib/ai/last-defense.ts — final safety net probes ALL providers. Phase-specific defense: combined research+outline, condensed drafting, raw HTML assembly.",
      testType: "last-defense-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-05", category: "pipeline",
    },
    {
      id: "CP.2.3",
      phase: "CP.2 AI Reliability",
      phaseOrder: 2, taskOrder: 3, taskTotal: 3,
      title: "AI Cost Tracking",
      description: "ApiUsageLog tracks every AI call with provider, model, tokens, cost, taskType, calledFrom. All ~25 callers wired.",
      testType: "ai-cost-tracking-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-05", startDate: "2026-02-26", category: "pipeline",
    },
    {
      id: "CP.3.1",
      phase: "CP.3 Auto-Remediation",
      phaseOrder: 3, taskOrder: 1, taskTotal: 3,
      title: "Diagnostic Agent",
      description: "3-phase engine: Diagnose (stuck + failed) → Fix (reset, raw assembly, repair) → Verify. Runs every 2h.",
      testType: "diagnostic-agent-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-05", startDate: "2026-03-05", category: "pipeline",
    },
    {
      id: "CP.3.2",
      phase: "CP.3 Auto-Remediation",
      phaseOrder: 3, taskOrder: 2, taskTotal: 3,
      title: "Content Auto-Fix Cron",
      description: "14 sections: meta trim, expansion, orphan links, thin unpublish, duplicate detection, broken links, never-submitted catchup, chronic indexing failures.",
      testType: "content-auto-fix-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-02-26", category: "pipeline",
    },
    {
      id: "CP.3.3",
      phase: "CP.3 Auto-Remediation",
      phaseOrder: 3, taskOrder: 3, taskTotal: 3,
      title: "Campaign Enhancement System",
      description: "Batch article improvement with 5 presets (enhance_all, fix_seo, add_revenue, fix_arabic, authenticity). Kickstart one-tap creation.",
      testType: "campaign-system-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-03-09", category: "pipeline",
    },
  ],
};

// ── SEO & Indexing Plan ────────────────────────────────────────────────────────

export const SEO_INDEXING_PLAN: DevPlan = {
  id: "seo-indexing",
  project: "general / march26",
  title: "SEO, Indexing & GEO Compliance",
  tasks: [
    {
      id: "SEO.1.1",
      phase: "SEO.1 Indexing",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "IndexNow Multi-Engine",
      description: "Submits to 3 engines: Bing, Yandex, api.indexnow.org. Batch POST up to 10K URLs. Exponential backoff on 429/5xx.",
      testType: "indexnow-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-05", category: "seo",
    },
    {
      id: "SEO.1.2",
      phase: "SEO.1 Indexing",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Cache-First Sitemap",
      description: "Pre-built sitemap in SiteSettings, served <200ms. Refreshed every 4h by cron + on publish events.",
      testType: "sitemap-cache-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-08", startDate: "2026-03-07", category: "seo",
    },
    {
      id: "SEO.1.3",
      phase: "SEO.1 Indexing",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "GSC Per-Day Sync",
      description: "gsc-sync stores per-page-per-day data (not 7-day aggregates). Eliminates ~7x overcounting inflation.",
      testType: "gsc-sync-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-03-09", category: "seo",
    },
    {
      id: "SEO.2.1",
      phase: "SEO.2 Compliance",
      phaseOrder: 2, taskOrder: 1, taskTotal: 3,
      title: "GEO Optimization (Citability)",
      description: "Stats + citations in all content prompts. Check 16: citability scoring (5 signals). GEO_OPTIMIZATION standards constant.",
      testType: "geo-compliance-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-10", startDate: "2026-03-10", category: "seo",
    },
    {
      id: "SEO.2.2",
      phase: "SEO.2 Compliance",
      phaseOrder: 2, taskOrder: 2, taskTotal: 3,
      title: "Jan 2026 Authenticity Update",
      description: "First-hand experience signals in all prompts. Anti-generic phrase blacklist. 8 algorithm context flags. Named author rotation.",
      testType: "authenticity-compliance-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-02-19", category: "seo",
    },
    {
      id: "SEO.2.3",
      phase: "SEO.2 Compliance",
      phaseOrder: 2, taskOrder: 3, taskTotal: 3,
      title: "Title Sanitization & Cannibalization",
      description: "cleanTitle() strips slug-style/AI artifacts. >80% Jaccard word overlap blocks duplicate publication.",
      testType: "title-sanitization-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-05", category: "seo",
    },
    {
      id: "SEO.3.1",
      phase: "SEO.3 Audit Engine",
      phaseOrder: 3, taskOrder: 1, taskTotal: 2,
      title: "Master Audit Engine",
      description: "8 validators (http, canonical, hreflang, sitemap, schema, links, metadata, robots) + 3 risk scanners. 82 unit tests.",
      testType: "master-audit-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-20", category: "seo",
    },
    {
      id: "SEO.3.2",
      phase: "SEO.3 Audit Engine",
      phaseOrder: 3, taskOrder: 2, taskTotal: 2,
      title: "Per-Page Audit Dashboard",
      description: "Sortable per-page list: indexing status, GSC clicks/impressions/CTR/position, SEO score, word count, issues.",
      testType: "per-page-audit-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-08", startDate: "2026-03-07", category: "seo",
    },
  ],
};

// ── Security & Hardening Plan ──────────────────────────────────────────────────

export const SECURITY_PLAN: DevPlan = {
  id: "security",
  project: "general / march26",
  title: "Security & Platform Hardening",
  tasks: [
    {
      id: "SEC.1.1",
      phase: "SEC.1 Auth & XSS",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Admin Auth on All Routes",
      description: "withAdminAuth/requireAdmin on all admin API routes. 7+ unauthenticated routes secured across 14 audits.",
      testType: "admin-auth-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-02-18", category: "config",
    },
    {
      id: "SEC.1.2",
      phase: "SEC.1 Auth & XSS",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "XSS Sanitization (13 vectors)",
      description: "isomorphic-dompurify sanitizer. 9 dangerouslySetInnerHTML instances (3 public + 6 admin) + 4 builder components.",
      testType: "xss-sanitization-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-02-18", category: "config",
    },
    {
      id: "SEC.1.3",
      phase: "SEC.1 Auth & XSS",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "SSRF & Info Disclosure",
      description: "Social embed URL allowlist. 13 routes: removed error.message from public responses. Credential exposure in analytics fixed.",
      testType: "security-scan-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-02-18", category: "config",
    },
    {
      id: "SEC.2.1",
      phase: "SEC.2 Pipeline Safety",
      phaseOrder: 2, taskOrder: 1, taskTotal: 2,
      title: "Race Condition Prevention",
      description: "Atomic topic claiming with updateMany + 'generating' status. Content-selector dedup guard. Cron schedule stagger.",
      testType: "race-condition-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-02-18", category: "pipeline",
    },
    {
      id: "SEC.2.2",
      phase: "SEC.2 Pipeline Safety",
      phaseOrder: 2, taskOrder: 2, taskTotal: 2,
      title: "Cron Resilience System",
      description: "Feature flag guards on 32+ crons. Email alerting on failure with 4h dedup. Rate limiting (4 tiers). Budget guards on all routes.",
      testType: "cron-resilience-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-06", category: "config",
    },
  ],
};

// ── Dashboard & Admin Plan ─────────────────────────────────────────────────────

export const DASHBOARD_PLAN: DevPlan = {
  id: "dashboard",
  project: "general / march26",
  title: "Dashboard & Admin Tools",
  tasks: [
    {
      id: "DASH.1.1",
      phase: "DASH.1 Cockpit",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Mission Control Cockpit",
      description: "7-tab layout: Mission Control, Content Matrix, Pipeline, Crons, Sites, AI Config, Settings. Mobile-first, auto-refresh 60s.",
      testType: "cockpit-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-26", startDate: "2026-02-26", category: "content",
    },
    {
      id: "DASH.1.2",
      phase: "DASH.1 Cockpit",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Departures Board",
      description: "Airport-style board showing 24 crons with live countdown timers. Do Now buttons. Filter tabs. Auto-refresh.",
      testType: "departures-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-26", startDate: "2026-02-26", category: "content",
    },
    {
      id: "DASH.1.3",
      phase: "DASH.1 Cockpit",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Cycle Health Analyzer",
      description: "Evidence-based diagnostics: 17 issue patterns, A-F grading, Fix Now buttons. Analyzes last 12-24h of operations.",
      testType: "cycle-health-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-06", category: "content",
    },
    {
      id: "DASH.2.1",
      phase: "DASH.2 Affiliate & Commerce",
      phaseOrder: 2, taskOrder: 1, taskTotal: 2,
      title: "Affiliate HQ (6-Tab Command Center)",
      description: "Revenue, Partners, Coverage, Links, Actions, System tabs. CJ circuit breaker, per-site tracking, SID attribution.",
      testType: "affiliate-hq-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-10", startDate: "2026-03-10", category: "pipeline",
    },
    {
      id: "DASH.2.2",
      phase: "DASH.2 Affiliate & Commerce",
      phaseOrder: 2, taskOrder: 2, taskTotal: 2,
      title: "AI Cost Dashboard",
      description: "Per-site cost bars, provider breakdown, task-type breakdown, 30-day sparkline, live call feed. All real DB data.",
      testType: "ai-cost-dashboard-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-26", startDate: "2026-02-26", category: "content",
    },
    {
      id: "DASH.3.1",
      phase: "DASH.3 Operations",
      phaseOrder: 3, taskOrder: 1, taskTotal: 3,
      title: "Aggregated Report v2",
      description: "8 sections: SEO audit, discovery, indexing, content velocity, operations, public website, affiliate. 6-component scoring.",
      testType: "aggregated-report-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-09", startDate: "2026-03-09", category: "content",
    },
    {
      id: "DASH.3.2",
      phase: "DASH.3 Operations",
      phaseOrder: 3, taskOrder: 2, taskTotal: 3,
      title: "Action Logging System",
      description: "Logs every manual action (Publish, Delete, Re-queue) with user, timestamp, IP. Last 50 entries with filtering.",
      testType: "action-logging-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-07", startDate: "2026-03-07", category: "content",
    },
    {
      id: "DASH.3.3",
      phase: "DASH.3 Operations",
      phaseOrder: 3, taskOrder: 3, taskTotal: 3,
      title: "Per-Site Activation Controller",
      description: "5 setting categories per site: affiliates, email, social, workflow, general. DB-backed with SiteSettings.",
      testType: "site-settings-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-06", startDate: "2026-03-06", category: "config",
    },
  ],
};

// ── Design System Plan ─────────────────────────────────────────────────────────

export const DESIGN_SYSTEM_PLAN: DevPlan = {
  id: "design-system",
  project: "general / march26",
  title: "Design System & Media Tools",
  tasks: [
    {
      id: "DS.1.1",
      phase: "DS.1 Core Tools",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Unified Brand Provider",
      description: "getBrandProfile(siteId) merges config/sites.ts + destination-themes.ts. Works for all 6 sites.",
      testType: "brand-kit-test",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "content",
    },
    {
      id: "DS.1.2",
      phase: "DS.1 Core Tools",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Email Builder & Multi-Provider Sender",
      description: "Block-based email builder. Table-based renderer (Outlook-compatible). SMTP/Resend/SendGrid sender.",
      testType: "email-system-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "content",
    },
    {
      id: "DS.1.3",
      phase: "DS.1 Core Tools",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "PDF Generation & Brand Kit Export",
      description: "Puppeteer HTML→PDF. Brand kit generator: colors, typography, logo SVGs, social templates, ZIP via jszip.",
      testType: "design-tools-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "content",
    },
    {
      id: "DS.2.1",
      phase: "DS.2 Content Engine",
      phaseOrder: 2, taskOrder: 1, taskTotal: 2,
      title: "4-Agent Content Engine",
      description: "Researcher → Ideator → Scripter → Analyst pipeline. Platform-specific scripts, performance grading A-F.",
      testType: "content-engine-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "pipeline",
    },
    {
      id: "DS.2.2",
      phase: "DS.2 Content Engine",
      phaseOrder: 2, taskOrder: 2, taskTotal: 2,
      title: "Social Calendar & Scheduler",
      description: "Week/month view, platform-colored cards, publish assistant. Twitter auto-publish (needs API keys).",
      testType: "social-calendar-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "content",
    },
  ],
};

// ── Zenitha Yachts Plan ────────────────────────────────────────────────────────

export const ZENITHA_YACHTS_PLAN: DevPlan = {
  id: "zenitha-yachts",
  project: "zenitha-yachts",
  title: "Zenitha Yachts Platform",
  tasks: [
    {
      id: "ZY.1.1",
      phase: "ZY.1 Core Platform",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Yacht Database Models",
      description: "8 Prisma models (Yacht, YachtDestination, CharterItinerary, CharterInquiry, BrokerPartner, etc.) + 8 enums.",
      testType: "yacht-models-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-21", category: "pipeline",
    },
    {
      id: "ZY.1.2",
      phase: "ZY.1 Core Platform",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Public Pages (14 pages)",
      description: "Homepage, yacht search/detail, destinations hub/detail, itineraries, charter planner, inquiry form, FAQ, how-it-works, about, contact.",
      testType: "yacht-pages-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-21", category: "content",
    },
    {
      id: "ZY.1.3",
      phase: "ZY.1 Core Platform",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Admin Dashboard (11 pages + 7 API routes)",
      description: "Fleet inventory, inquiries CRM, destinations, itineraries, brokers, analytics, sync & imports.",
      testType: "yacht-admin-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-21", category: "content",
    },
    {
      id: "ZY.2.1",
      phase: "ZY.2 SEO & Isolation",
      phaseOrder: 2, taskOrder: 1, taskTotal: 2,
      title: "Yacht SEO Compliance",
      description: "All [slug] pages have generateMetadata(), BreadcrumbList, Product/Place/Trip/FAQ JSON-LD. Sitemap + llms.txt updated.",
      testType: "yacht-seo-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-21", category: "seo",
    },
    {
      id: "ZY.2.2",
      phase: "ZY.2 SEO & Isolation",
      phaseOrder: 2, taskOrder: 2, taskTotal: 2,
      title: "Hermetic Site Separation",
      description: "SiteShell component detects siteId, renders ZenithaHeader/Footer vs DynamicHeader/Footer. All DB queries scoped by siteId.",
      testType: "yacht-isolation-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-21", startDate: "2026-02-21", category: "config",
    },
  ],
};

// ── Multi-Site Infrastructure Plan ─────────────────────────────────────────────

export const MULTI_SITE_PLAN: DevPlan = {
  id: "multi-site",
  project: "general / march26",
  title: "Multi-Site Infrastructure",
  tasks: [
    {
      id: "MS.1.1",
      phase: "MS.1 Scoping",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "DB Query Site Scoping",
      description: "All DB queries include siteId in WHERE clause. 21+ unscoped queries fixed. No cross-site data leakage.",
      testType: "site-scoping-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-02-16", category: "pipeline",
    },
    {
      id: "MS.1.2",
      phase: "MS.1 Scoping",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Dynamic Config (No Hardcoding)",
      description: "getDefaultSiteId(), getSiteDomain(), getBaseUrl() replace all hardcoded values. 30+ URL fallbacks fixed.",
      testType: "no-hardcoding-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-02-16", category: "config",
    },
    {
      id: "MS.1.3",
      phase: "MS.1 Scoping",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "New Site Wizard",
      description: "8-step wizard creates Site DB record, seeds 30 topics, sets up SiteSettings. Pipeline auto-discovers.",
      testType: "new-site-wizard-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-26", startDate: "2026-02-26", category: "content",
    },
    {
      id: "MS.2.1",
      phase: "MS.2 URL Hygiene",
      phaseOrder: 2, taskOrder: 1, taskTotal: 2,
      title: "?lang=ar → /ar/ Redirect",
      description: "Permanent 301 redirect in middleware. Language switcher uses router.push('/ar/path') instead of client-side state.",
      testType: "url-hygiene-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-10", startDate: "2026-03-10", category: "seo",
    },
    {
      id: "MS.2.2",
      phase: "MS.2 URL Hygiene",
      phaseOrder: 2, taskOrder: 2, taskTotal: 2,
      title: "Structured Data on All Layouts",
      description: "BreadcrumbList on 9 page layouts. Organization schema on about page. Per-site OG images.",
      testType: "structured-data-verify",
      testable: true, status: "done", readiness: 100,
      dueDate: "2026-02-20", startDate: "2026-02-20", category: "seo",
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORWARD-LOOKING PLANS (Khaled's 10 priorities — March 11, 2026)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Plan 9: Design & Media Engine ────────────────────────────────────────────
// Priority 1: Photos, videos, social media content, viral videos

export const DESIGN_MEDIA_ENGINE_PLAN: DevPlan = {
  id: "design-media-engine",
  project: "general / march26",
  title: "Design & Media Engine (Photos, Videos, Viral Content)",
  tasks: [
    // ── Phase DME.1: Photo & Image Engine (4 tasks) ─────────────────────────
    {
      id: "DME.1.1",
      phase: "DME.1 Photo & Image Engine",
      phaseOrder: 1, taskOrder: 1, taskTotal: 4,
      title: "AI Image Generation Pipeline",
      description: "Integrate DALL-E/Midjourney/Stability AI for article hero images, social graphics, product mockups. image-generator.ts has 50 TODOs blocking mockup generation. Wire to Design Hub.",
      testType: "design-tools-verify",
      testable: true, status: "todo", readiness: 30,
      dueDate: "2026-04-01", startDate: "2026-03-15", category: "pipeline",
    },
    {
      id: "DME.1.2",
      phase: "DME.1 Photo & Image Engine",
      phaseOrder: 1, taskOrder: 2, taskTotal: 4,
      title: "Auto-Generated Article Hero Images",
      description: "Each published BlogPost auto-generates a branded hero image using site colors + topic keywords. Replaces generic gradient placeholder. Stored in S3/Vercel Blob.",
      testType: "hero-image-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-10", startDate: "2026-03-25", category: "pipeline",
      dependsOn: ["DME.1.1"],
    },
    {
      id: "DME.1.3",
      phase: "DME.1 Photo & Image Engine",
      phaseOrder: 1, taskOrder: 3, taskTotal: 4,
      title: "Social Media Graphics Generator",
      description: "One-tap branded graphics for Instagram (1080x1080), Twitter (1200x675), Pinterest (1000x1500), Stories (1080x1920). Uses brand-provider.ts colors/fonts. Konva canvas export.",
      testType: "social-graphics-verify",
      testable: true, status: "todo", readiness: 20,
      dueDate: "2026-04-15", startDate: "2026-04-01", category: "content",
    },
    {
      id: "DME.1.4",
      phase: "DME.1 Photo & Image Engine",
      phaseOrder: 1, taskOrder: 4, taskTotal: 4,
      title: "Media Asset Library with AI Tagging",
      description: "Centralized media library (media-picker.tsx exists). Add: AI auto-tagging, search by description, duplicate detection, usage tracking across articles. asset-manager.ts is 40% complete.",
      testType: "media-library-verify",
      testable: true, status: "todo", readiness: 25,
      dueDate: "2026-04-20", startDate: "2026-04-05", category: "content",
    },

    // ── Phase DME.2: Video & Viral Content (4 tasks) ────────────────────────
    {
      id: "DME.2.1",
      phase: "DME.2 Video & Viral Content",
      phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "Remotion Video Templates (5+ templates)",
      description: "Expand from 2 templates (destination-highlight, hotel-showcase) to 5+: restaurant-review, top-10-list, travel-tip-short, before-after, neighborhood-tour. 15-60 second formats for Reels/TikTok/Shorts.",
      testType: "video-templates-verify",
      testable: true, status: "todo", readiness: 30,
      dueDate: "2026-04-20", startDate: "2026-04-01", category: "content",
    },
    {
      id: "DME.2.2",
      phase: "DME.2 Video & Viral Content",
      phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "AI Prompt-to-Video Pipeline",
      description: "prompt-to-video.ts exists but needs: auto-script from BlogPost content, voice-over text, b-roll selection, subtitle generation. Article → video in one tap from cockpit.",
      testType: "prompt-to-video-verify",
      testable: true, status: "todo", readiness: 20,
      dueDate: "2026-05-01", startDate: "2026-04-10", category: "pipeline",
      dependsOn: ["DME.2.1"],
    },
    {
      id: "DME.2.3",
      phase: "DME.2 Video & Viral Content",
      phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Video Render Infrastructure",
      description: "Remotion render-engine.ts can't run in Vercel (60s timeout). Set up: Remotion Lambda for cloud rendering OR external render service. Return download URL to dashboard.",
      testType: "video-render-verify",
      testable: true, status: "todo", readiness: 10,
      dueDate: "2026-05-10", startDate: "2026-04-15", category: "config",
    },
    {
      id: "DME.2.4",
      phase: "DME.2 Video & Viral Content",
      phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Viral Content Engine",
      description: "Trending topic → social-optimized content (memes, comparison graphics, quote cards, carousels). Hooks into trends-monitor for hot topics. Score virality potential before creating.",
      testType: "viral-content-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-15", startDate: "2026-04-25", category: "pipeline",
    },
  ],
};

// ── Plan 10: PDF & Print System ──────────────────────────────────────────────
// Priority 2: PDF generator completion and management

export const PDF_PRINT_PLAN: DevPlan = {
  id: "pdf-print",
  project: "general / march26",
  title: "PDF Generator & Print Management",
  tasks: [
    {
      id: "PDF.1.1",
      phase: "PDF.1 Generator Completion",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Fix PDF Generation Pipeline",
      description: "product-file-generator.ts has 11 TODOs. Puppeteer HTML→PDF works but needs: per-site branded templates, table of contents, cover page, page numbers, proper Arabic RTL layout.",
      testType: "design-tools-verify",
      testable: true, status: "todo", readiness: 50,
      dueDate: "2026-03-28", startDate: "2026-03-15", category: "pipeline",
    },
    {
      id: "PDF.1.2",
      phase: "PDF.1 Generator Completion",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Article-to-PDF Export",
      description: "One-tap: any published BlogPost → downloadable branded PDF guide. Includes hero image, formatted content, affiliate links as QR codes, author bio, related articles.",
      testType: "pdf-export-verify",
      testable: true, status: "todo", readiness: 20,
      dueDate: "2026-04-05", startDate: "2026-03-25", category: "content",
      dependsOn: ["PDF.1.1"],
    },
    {
      id: "PDF.1.3",
      phase: "PDF.1 Generator Completion",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "PDF Guide Library & Gated Content",
      description: "PdfGuide + PdfDownload models exist. Build: public PDF library page, email-gated downloads (collect subscriber before download), download tracking analytics, per-site guides.",
      testType: "pdf-library-verify",
      testable: true, status: "todo", readiness: 15,
      dueDate: "2026-04-15", startDate: "2026-04-01", category: "content",
      dependsOn: ["PDF.1.2"],
    },
  ],
};

// ── Plan 11: Commerce & Payments ─────────────────────────────────────────────
// Priority 3+9+10: Etsy integration, Stripe/Mercury activation, commerce streamline

export const COMMERCE_PAYMENTS_PLAN: DevPlan = {
  id: "commerce-payments",
  project: "general / march26",
  title: "Commerce & Payments (Etsy, Stripe, Mercury)",
  tasks: [
    // ── Phase CP2.1: Stripe & Mercury Activation (3 tasks) ──────────────────
    {
      id: "COM.1.1",
      phase: "COM.1 Stripe & Mercury",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Activate Stripe in Production",
      description: "Set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET in Vercel. Test: balance API, checkout flow, webhook handler. MCP Stripe dashboard already works.",
      testType: "stripe-verify",
      testable: true, status: "todo", readiness: 60,
      dueDate: "2026-03-20", startDate: "2026-03-12", category: "config",
    },
    {
      id: "COM.1.2",
      phase: "COM.1 Stripe & Mercury",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Activate Mercury Banking Integration",
      description: "Set MERCURY_API_KEY in Vercel. Complete transactions/route.ts (currently stub): pagination, date filtering, search, CSV export. Wire to dashboard.",
      testType: "mercury-verify",
      testable: true, status: "todo", readiness: 40,
      dueDate: "2026-03-25", startDate: "2026-03-15", category: "config",
    },
    {
      id: "COM.1.3",
      phase: "COM.1 Stripe & Mercury",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Unified Financial Dashboard",
      description: "Single view: Stripe revenue + Mercury balances + CJ commissions + Etsy payouts. Net profit calculation. Monthly P&L. Export to CSV/PDF.",
      testType: "financial-dashboard-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-05", startDate: "2026-03-25", category: "content",
      dependsOn: ["COM.1.1", "COM.1.2"],
    },

    // ── Phase CP2.2: Etsy Commerce Streamline (4 tasks) ─────────────────────
    {
      id: "COM.2.1",
      phase: "COM.2 Etsy Commerce",
      phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "Etsy OAuth Connection in Production",
      description: "Set ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_REDIRECT_URI in Vercel. OAuth2 PKCE flow already built. Test connection + shop lookup + listing creation end-to-end.",
      testType: "etsy-connection-verify",
      testable: true, status: "todo", readiness: 70,
      dueDate: "2026-03-22", startDate: "2026-03-12", category: "config",
    },
    {
      id: "COM.2.2",
      phase: "COM.2 Etsy Commerce",
      phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "AI Listing Generator with Design System",
      description: "Connect listing-generator.ts to brand-provider.ts + image-generator.ts. One-tap: topic → AI-written listing (title variants, description, tags, SEO) + branded mockup images → publish to Etsy.",
      testType: "etsy-listing-gen-verify",
      testable: true, status: "todo", readiness: 40,
      dueDate: "2026-04-01", startDate: "2026-03-20", category: "pipeline",
      dependsOn: ["COM.2.1"],
    },
    {
      id: "COM.2.3",
      phase: "COM.2 Etsy Commerce",
      phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Etsy Analytics & Performance Tracking",
      description: "Replace mock getListingPerformance() with real Etsy stats API. Views, favorites, sales, revenue per listing. A/B title rotation based on performance. Trend-based pricing suggestions.",
      testType: "etsy-analytics-verify",
      testable: true, status: "todo", readiness: 15,
      dueDate: "2026-04-15", startDate: "2026-04-01", category: "pipeline",
      dependsOn: ["COM.2.1"],
    },
    {
      id: "COM.2.4",
      phase: "COM.2 Etsy Commerce",
      phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Etsy Inventory Sync & Bulk Operations",
      description: "Auto-sync Etsy inventory ↔ DB. Bulk listing create/update/deactivate. CSV import/export (built). Campaign generator for product launches (30-day plans). Seasonal pricing rules.",
      testType: "etsy-bulk-verify",
      testable: true, status: "todo", readiness: 25,
      dueDate: "2026-04-25", startDate: "2026-04-10", category: "pipeline",
      dependsOn: ["COM.2.2"],
    },
  ],
};

// ── Plan 12: Website Builder & Site Launch ───────────────────────────────────
// Priority 4+5: Enhanced builder with learnings + zenitha.luxury LLC website

export const WEBSITE_BUILDER_PLAN: DevPlan = {
  id: "website-builder",
  project: "general / march26",
  title: "Website Builder Enhancement & Zenitha.Luxury Launch",
  tasks: [
    // ── Phase WB.1: Builder Enhancement (3 tasks) ───────────────────────────
    {
      id: "WB.1.1",
      phase: "WB.1 Builder Enhancement",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Encoded Lessons Database",
      description: "Build lib/new-site/lessons-db.ts: structured lessons from 14+ audits, 61 architecture rules, 47 known gaps. Builder checks lessons before each step. Prevents repeating mistakes.",
      testType: "new-site-wizard-verify",
      testable: true, status: "todo", readiness: 20,
      dueDate: "2026-03-28", startDate: "2026-03-15", category: "pipeline",
    },
    {
      id: "WB.1.2",
      phase: "WB.1 Builder Enhancement",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Auto-Config Generation",
      description: "Builder auto-generates: config/sites.ts entry, middleware.ts domain mapping, next.config.js image/CORS entries, vercel.json cron entries. Currently these all require manual code deploy.",
      testType: "auto-config-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-10", startDate: "2026-03-25", category: "pipeline",
    },
    {
      id: "WB.1.3",
      phase: "WB.1 Builder Enhancement",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Post-Build Audit Runner",
      description: "After building a new site: auto-runs 6-dimension audit (imports, APIs, Prisma, SEO, auth, siteId), smoke tests, schema validation. Reports findings in wizard UI before going live.",
      testType: "post-build-audit-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-15", startDate: "2026-04-05", category: "pipeline",
      dependsOn: ["WB.1.1"],
    },

    // ── Phase WB.2: Zenitha.Luxury LLC Website (3 tasks) ────────────────────
    {
      id: "WB.2.1",
      phase: "WB.2 Zenitha.Luxury Website",
      phaseOrder: 2, taskOrder: 1, taskTotal: 3,
      title: "Zenitha.Luxury Portfolio Site Design",
      description: "Parent brand website for authority. CURATED content (NOT auto-generated). Showcases: network of sites, content quality, team, partnerships. Premium design with entity config branding.",
      testType: "zenitha-luxury-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-25", startDate: "2026-04-10", category: "content",
    },
    {
      id: "WB.2.2",
      phase: "WB.2 Zenitha.Luxury Website",
      phaseOrder: 2, taskOrder: 2, taskTotal: 3,
      title: "Partnership & Authority Pages",
      description: "Pages: Our Network (all 6 sites with stats), Case Studies (content performance), Partner With Us (advertiser CTA), About Zenitha.Luxury LLC (Delaware entity, team, mission).",
      testType: "authority-pages-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-05", startDate: "2026-04-20", category: "content",
      dependsOn: ["WB.2.1"],
    },
    {
      id: "WB.2.3",
      phase: "WB.2 Zenitha.Luxury Website",
      phaseOrder: 2, taskOrder: 3, taskTotal: 3,
      title: "Cross-Network SEO & Linking",
      description: "zenitha.luxury links to all 6 sites (authority flow). Each site links back to zenitha.luxury (parent entity). Schema markup: Organization with subsidiary sites. Topical authority signal.",
      testType: "cross-network-seo-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-10", startDate: "2026-05-01", category: "seo",
      dependsOn: ["WB.2.1"],
    },
  ],
};

// ── Plan 13: Social Media & Email Integration ────────────────────────────────
// Priority 6: Integrated social + email marketing engine

export const SOCIAL_EMAIL_PLAN: DevPlan = {
  id: "social-email",
  project: "general / march26",
  title: "Social Media & Email Marketing Integration",
  tasks: [
    // ── Phase SE.1: Social Platform Activation (3 tasks) ────────────────────
    {
      id: "SE.1.1",
      phase: "SE.1 Social Platform Activation",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Twitter/X Auto-Publish + OAuth",
      description: "Wire Twitter API v2 into social cron. OAuth flow UI for account linking (admin page with encrypted token storage per-site via Credential model). Test auto-post lifecycle.",
      testType: "twitter-api-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-25", startDate: "2026-03-12", category: "config",
    },
    {
      id: "SE.1.2",
      phase: "SE.1 Social Platform Activation",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Content-to-Social Auto-Repurposing",
      description: "Published BlogPost → 3 social posts via Content Engine Scripter: Twitter thread, Instagram caption, LinkedIn summary. Auto-queued in Social Calendar. One-tap manual override.",
      testType: "auto-repurpose-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-05", startDate: "2026-03-20", category: "pipeline",
    },
    {
      id: "SE.1.3",
      phase: "SE.1 Social Platform Activation",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Pinterest Auto-Pin for Visual Content",
      description: "pinterest-client.ts is 70% built. Complete: auto-pin article hero images, product mockups, infographics to Pinterest boards. Rich Pins with article metadata. High-value for travel content.",
      testType: "pinterest-verify",
      testable: true, status: "todo", readiness: 35,
      dueDate: "2026-04-15", startDate: "2026-04-01", category: "config",
    },

    // ── Phase SE.2: Email Marketing Engine (4 tasks) ────────────────────────
    {
      id: "SE.2.1",
      phase: "SE.2 Email Marketing",
      phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "Email Provider + Subscriber Collection",
      description: "Activate SendGrid/Resend. Blog footer signup → EmailSubscriber (double opt-in). Per-site branded templates. GDPR: unsubscribe link, consent tracking, data deletion endpoint.",
      testType: "email-send-test",
      testable: true, status: "todo", readiness: 50,
      dueDate: "2026-03-25", startDate: "2026-03-12", category: "config",
    },
    {
      id: "SE.2.2",
      phase: "SE.2 Email Marketing",
      phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "Welcome Sequence + Weekly Digest",
      description: "3-email welcome (top articles → site guide → social CTA). Weekly auto-digest: top 5 new articles + trending topics + affiliate deals. All per-site branded via email builder.",
      testType: "welcome-sequence-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-10", startDate: "2026-03-25", category: "pipeline",
      dependsOn: ["SE.2.1"],
    },
    {
      id: "SE.2.3",
      phase: "SE.2 Email Marketing",
      phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Affiliate Deal Email Alerts",
      description: "CJ discover-deals finds expiring offers → auto-email subscribers with relevant deals. Personalized by subscriber site + interests. Revenue attribution via email click tracking.",
      testType: "deal-alert-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-20", startDate: "2026-04-10", category: "pipeline",
      dependsOn: ["SE.2.2"],
    },
    {
      id: "SE.2.4",
      phase: "SE.2 Email Marketing",
      phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Email + Social Analytics Dashboard",
      description: "Unified cockpit panel: email open/click rates, social engagement, follower growth, content performance across channels. Real data only — zero mocks. A/B subject line testing.",
      testType: "email-social-analytics-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-01", startDate: "2026-04-20", category: "content",
      dependsOn: ["SE.2.1"],
    },
  ],
};

// ── Plan 14: Business Intelligence & Strategy ────────────────────────────────
// Priority 7: Partnerships, competitive intel, operational database that feeds AI prompts

export const BUSINESS_INTELLIGENCE_PLAN: DevPlan = {
  id: "business-intelligence",
  project: "general / march26",
  title: "Business Intelligence & Strategic Operations",
  tasks: [
    // ── Phase BI.1: Operational Intelligence Database (4 tasks) ──────────────
    {
      id: "BI.1.1",
      phase: "BI.1 Operational Intelligence DB",
      phaseOrder: 1, taskOrder: 1, taskTotal: 4,
      title: "GA4 + GSC Data Pipeline to Dashboard",
      description: "Wire GA4 Data API into cockpit (sessions, users, pageviews, bounce, engagement). Wire GSC performance (clicks, impressions, CTR, position). Traffic source breakdown by channel. Per-site property IDs.",
      testType: "ga4-live-pull",
      testable: true, status: "todo", readiness: 30,
      dueDate: "2026-03-20", startDate: "2026-03-12", category: "pipeline",
    },
    {
      id: "BI.1.2",
      phase: "BI.1 Operational Intelligence DB",
      phaseOrder: 1, taskOrder: 2, taskTotal: 4,
      title: "Revenue Intelligence Layer",
      description: "Unified: Stripe revenue + CJ commissions + Etsy payouts + Mercury balances. Per-article ROI (revenue / AI generation cost). Revenue projections (30/60/90 day). Content ROI calculator.",
      testType: "revenue-dashboard-verify",
      testable: true, status: "todo", readiness: 40,
      dueDate: "2026-04-01", startDate: "2026-03-20", category: "pipeline",
      dependsOn: ["BI.1.1"],
    },
    {
      id: "BI.1.3",
      phase: "BI.1 Operational Intelligence DB",
      phaseOrder: 1, taskOrder: 3, taskTotal: 4,
      title: "Operational Knowledge Base (Prompt Feeder)",
      description: "Structured DB of: platform rules, revenue streams, content performance, partner terms, site configs, seasonal patterns, market data. Auto-fed into AI prompts for context-aware generation.",
      testType: "knowledge-base-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-15", startDate: "2026-04-01", category: "pipeline",
    },
    {
      id: "BI.1.4",
      phase: "BI.1 Operational Intelligence DB",
      phaseOrder: 1, taskOrder: 4, taskTotal: 4,
      title: "Weekly Performance Briefing (Auto-Email)",
      description: "Every Monday: AI-generated executive brief to Khaled's email. Traffic trends, revenue, top articles, indexing progress, competitive alerts, action items. Rendered via email builder.",
      testType: "weekly-digest-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-20", startDate: "2026-04-10", category: "pipeline",
      dependsOn: ["BI.1.1", "BI.1.2"],
    },

    // ── Phase BI.2: Competitive Intelligence & Partnerships (4 tasks) ───────
    {
      id: "BI.2.1",
      phase: "BI.2 Competitive Intel & Partnerships",
      phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "Keyword Gap & Competitor Tracking",
      description: "Compare our ranked keywords vs competitor sites. Track competitor publishing frequency. Alert when competitors outpace us. Feed gaps into topic research pipeline as high-priority proposals.",
      testType: "keyword-gap-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-25", startDate: "2026-04-10", category: "seo",
    },
    {
      id: "BI.2.2",
      phase: "BI.2 Competitive Intel & Partnerships",
      phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "Partnership & Deal Discovery Engine",
      description: "Auto-discover: hotel partnerships, restaurant collaborations, tour operator deals, affiliate programs. Score by commission rate × search volume × brand fit. Present as actionable opportunities in cockpit.",
      testType: "partnership-discovery-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-05", startDate: "2026-04-20", category: "pipeline",
    },
    {
      id: "BI.2.3",
      phase: "BI.2 Competitive Intel & Partnerships",
      phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Market Opportunity Scoring",
      description: "Score untapped topic clusters by: search volume × (1 - competition) × affiliate potential. Auto-generate high-opportunity TopicProposals. Seasonal trend overlay (Ramadan, summer, etc).",
      testType: "market-opportunity-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-10", startDate: "2026-05-01", category: "pipeline",
      dependsOn: ["BI.2.1"],
    },
    {
      id: "BI.2.4",
      phase: "BI.2 Competitive Intel & Partnerships",
      phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Trend & Opportunity Alerts",
      description: "Real-time alerts for: trending topics in our niche, new affiliate programs, competitor content gaps, seasonal opportunities, Google algorithm changes. Push to cockpit + email.",
      testType: "trend-alerts-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-15", startDate: "2026-05-05", category: "pipeline",
    },
  ],
};

// ── Plan 15: Dashboard UX Redesign ───────────────────────────────────────────
// Priority 8: Better visibility (not urgent now)

export const DASHBOARD_REDESIGN_PLAN: DevPlan = {
  id: "dashboard-redesign",
  project: "general / march26",
  title: "Dashboard UX Redesign & Visibility",
  tasks: [
    {
      id: "DUX.1.1",
      phase: "DUX.1 Information Architecture",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Single-Screen Executive View",
      description: "Replace 7-tab cockpit with single scrollable executive dashboard. At-a-glance: revenue today/week/month, traffic sparkline, pipeline status, alerts, next actions. No tabs — everything visible.",
      testType: "cockpit-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-15", startDate: "2026-05-01", category: "content",
    },
    {
      id: "DUX.1.2",
      phase: "DUX.1 Information Architecture",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Real-Time Status Indicators",
      description: "Every system has a live status dot (green/amber/red): content pipeline, SEO agent, cron health, indexing, affiliates, email, social. Tap any dot for details. No silent failures.",
      testType: "status-indicators-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-20", startDate: "2026-05-10", category: "content",
    },
    {
      id: "DUX.1.3",
      phase: "DUX.1 Information Architecture",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Contextual Action Buttons",
      description: "Every data card has a contextual action: low traffic article → 'Boost SEO', stuck draft → 'Force Publish', failed cron → 'Run Now'. No navigating to find the fix. Fix is next to the problem.",
      testType: "contextual-actions-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-25", startDate: "2026-05-15", category: "content",
    },
  ],
};

// ── Plan 16: Self-Healing & Continuous Improvement ───────────────────────────
// Cross-cutting: Automation health, self-learning, self-healing

export const SELF_HEALING_PLAN: DevPlan = {
  id: "self-healing",
  project: "general / march26",
  title: "Self-Healing Automation & Continuous Improvement",
  tasks: [
    // ── Phase SH.1: Self-Healing (3 tasks) ──────────────────────────────────
    {
      id: "SH.1.1",
      phase: "SH.1 Self-Healing Systems",
      phaseOrder: 1, taskOrder: 1, taskTotal: 3,
      title: "Enhanced Diagnostic Agent (Self-Repair)",
      description: "Expand diagnostic-agent beyond draft recovery: auto-restart failed crons (check FeatureFlag → toggle off/on), auto-fix broken IndexNow submissions, auto-clear stuck dedup markers, auto-prune stale DB records.",
      testType: "diagnostic-agent-verify",
      testable: true, status: "todo", readiness: 60,
      dueDate: "2026-03-25", startDate: "2026-03-12", category: "pipeline",
    },
    {
      id: "SH.1.2",
      phase: "SH.1 Self-Healing Systems",
      phaseOrder: 1, taskOrder: 2, taskTotal: 3,
      title: "Cron Health Auto-Recovery",
      description: "When cycle-health detects grade D/F: auto-execute Fix Now actions. Escalation ladder: auto-fix → email alert → dashboard banner → pause pipeline. Auto-resume after cooldown.",
      testType: "cron-resilience-verify",
      testable: true, status: "todo", readiness: 30,
      dueDate: "2026-04-05", startDate: "2026-03-20", category: "pipeline",
    },
    {
      id: "SH.1.3",
      phase: "SH.1 Self-Healing Systems",
      phaseOrder: 1, taskOrder: 3, taskTotal: 3,
      title: "Provider Health Auto-Rotation",
      description: "When AI circuit breaker opens on all providers: probe backup providers, auto-switch routing, log degradation, continue with reduced quality rather than stopping. Monthly provider cost optimization.",
      testType: "circuit-breaker-verify",
      testable: true, status: "todo", readiness: 40,
      dueDate: "2026-04-10", startDate: "2026-03-25", category: "pipeline",
    },

    // ── Phase SH.2: Self-Learning (4 tasks) ─────────────────────────────────
    {
      id: "SH.2.1",
      phase: "SH.2 Self-Learning Systems",
      phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "Content Performance Feedback Loop",
      description: "Track which articles get most traffic/clicks/revenue → feed winning patterns back into content prompts. AI learns: what topics work, what headlines convert, what length performs best.",
      testType: "content-feedback-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-04-20", startDate: "2026-04-05", category: "pipeline",
    },
    {
      id: "SH.2.2",
      phase: "SH.2 Self-Learning Systems",
      phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "SEO Strategy Auto-Adaptation",
      description: "Weekly policy monitor detects algorithm changes → auto-adjust content prompts, quality thresholds, SEO standards. If CTR drops below baseline → auto-trigger meta optimization sweep.",
      testType: "seo-adaptation-verify",
      testable: true, status: "todo", readiness: 20,
      dueDate: "2026-04-25", startDate: "2026-04-10", category: "seo",
    },
    {
      id: "SH.2.3",
      phase: "SH.2 Self-Learning Systems",
      phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Error Pattern Recognition",
      description: "Analyze CronJobLog + AutoFixLog: identify recurring failure patterns, predict failures before they happen, suggest preventive fixes. Dashboard shows 'Predicted Issues' section.",
      testType: "error-pattern-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-05", startDate: "2026-04-20", category: "pipeline",
    },
    {
      id: "SH.2.4",
      phase: "SH.2 Self-Learning Systems",
      phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Multi-Site Knowledge Transfer",
      description: "What works on Yalla London (topics, affiliates, SEO wins) auto-suggested for other sites. Cross-site performance benchmarking. Best practices propagated to new site builds.",
      testType: "knowledge-transfer-verify",
      testable: true, status: "todo", readiness: 0,
      dueDate: "2026-05-15", startDate: "2026-05-01", category: "pipeline",
    },
  ],
};

// ── Registry Functions ─────────────────────────────────────────────────────────

const ALL_PLANS: DevPlan[] = [
  // Retrospective (what's built)
  STAGE_A_PLAN,
  CONTENT_PIPELINE_PLAN,
  SEO_INDEXING_PLAN,
  SECURITY_PLAN,
  DASHBOARD_PLAN,
  DESIGN_SYSTEM_PLAN,
  ZENITHA_YACHTS_PLAN,
  MULTI_SITE_PLAN,
  // Forward-looking (Khaled's 10 priorities)
  DESIGN_MEDIA_ENGINE_PLAN,
  PDF_PRINT_PLAN,
  COMMERCE_PAYMENTS_PLAN,
  WEBSITE_BUILDER_PLAN,
  SOCIAL_EMAIL_PLAN,
  BUSINESS_INTELLIGENCE_PLAN,
  DASHBOARD_REDESIGN_PLAN,
  SELF_HEALING_PLAN,
];

export function getAllPlans(): DevPlan[] {
  return ALL_PLANS;
}

export function getPlan(planId: string): DevPlan | undefined {
  return ALL_PLANS.find((p) => p.id === planId);
}

export function getPlanTasks(planId: string): DevPlanTask[] {
  return getPlan(planId)?.tasks || [];
}

export function getPhases(planId: string): { name: string; order: number; tasks: DevPlanTask[] }[] {
  const plan = getPlan(planId);
  if (!plan) return [];

  const phaseMap = new Map<string, { name: string; order: number; tasks: DevPlanTask[] }>();
  for (const task of plan.tasks) {
    if (!phaseMap.has(task.phase)) {
      phaseMap.set(task.phase, { name: task.phase, order: task.phaseOrder, tasks: [] });
    }
    phaseMap.get(task.phase)!.tasks.push(task);
  }

  return Array.from(phaseMap.values()).sort((a, b) => a.order - b.order);
}

export function computePhaseReadiness(tasks: DevPlanTask[]): number {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((sum, t) => sum + t.readiness, 0) / tasks.length);
}

export function computeProjectReadiness(plan: DevPlan): number {
  if (plan.tasks.length === 0) return 0;
  return Math.round(plan.tasks.reduce((sum, t) => sum + t.readiness, 0) / plan.tasks.length);
}
