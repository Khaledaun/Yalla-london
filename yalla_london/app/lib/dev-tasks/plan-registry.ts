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

// ── Registry Functions ─────────────────────────────────────────────────────────

const ALL_PLANS: DevPlan[] = [
  STAGE_A_PLAN,
  CONTENT_PIPELINE_PLAN,
  SEO_INDEXING_PLAN,
  SECURITY_PLAN,
  DASHBOARD_PLAN,
  DESIGN_SYSTEM_PLAN,
  ZENITHA_YACHTS_PLAN,
  MULTI_SITE_PLAN,
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
