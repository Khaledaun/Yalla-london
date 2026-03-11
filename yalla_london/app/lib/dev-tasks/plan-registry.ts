/**
 * Development Plan Registry
 *
 * Structured TypeScript plan definitions for the Development Monitor.
 * Plans are code — no markdown parsing needed.
 * Each task maps to a testType in live-tests.ts for real, visible test outcomes.
 *
 * STRUCTURE:
 * - Stage A: Infrastructure Completion (original 15 tasks)
 * - Stage A+: Built Feature Validation (verifies everything that IS built works)
 *   Organized by domain: Pipeline, SEO, Dashboard, AI, Affiliates, Design, Yacht, Crons
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
      id: "A.1.1", phase: "A.1 Revenue Visibility", phaseOrder: 1, taskOrder: 1, taskTotal: 4,
      title: "GA4 Dashboard Wiring",
      description: "Connect GA4 Data API to cockpit so traffic numbers are real (not 0s). MCP server works, cockpit needs wiring.",
      testType: "ga4-live-pull", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-11", category: "config",
    },
    {
      id: "A.1.2", phase: "A.1 Revenue Visibility", phaseOrder: 1, taskOrder: 2, taskTotal: 4,
      title: "Affiliate Click Tracking",
      description: "Server-side redirect tracking via CjClickEvent + SID tracking in CTA blocks.",
      testType: "affiliate-click-verify", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-03-04", category: "pipeline",
    },
    {
      id: "A.1.3", phase: "A.1 Revenue Visibility", phaseOrder: 1, taskOrder: 3, taskTotal: 4,
      title: "Per-Site OG Images",
      description: "Dynamic OG image generator at /api/og using Next.js ImageResponse with per-site brand colors.",
      testType: "og-image-render", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-03-04", category: "content",
    },
    {
      id: "A.1.4", phase: "A.1 Revenue Visibility", phaseOrder: 1, taskOrder: 4, taskTotal: 4,
      title: "Login Rate Limiting",
      description: "5 attempts/15min with progressive delays. Middleware adds 5 req/15min on auth routes. 429 with Retry-After.",
      testType: "login-rate-limit-verify", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-03-04", category: "config",
    },

    // ── Phase A.2: Multi-Site Hardening (4 tasks) ────────────────────────────
    {
      id: "A.2.1", phase: "A.2 Multi-Site Hardening", phaseOrder: 2, taskOrder: 1, taskTotal: 4,
      title: "CJ Schema Migration",
      description: "Add siteId to CJ models (CjCommission, CjClickEvent, CjOffer) so revenue data doesn't leak between sites.",
      testType: "cj-schema-check", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-18", startDate: "2026-03-11", category: "pipeline",
    },
    {
      id: "A.2.2", phase: "A.2 Multi-Site Hardening", phaseOrder: 2, taskOrder: 2, taskTotal: 4,
      title: "Arabic SSR",
      description: "Server-render Arabic HTML at /ar/ routes so Google indexes Arabic content properly. Currently returns English HTML.",
      testType: "arabic-ssr-check", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-20", startDate: "2026-03-11", category: "seo",
    },
    {
      id: "A.2.3", phase: "A.2 Multi-Site Hardening", phaseOrder: 2, taskOrder: 3, taskTotal: 4,
      title: "Feature Flags Runtime Wiring",
      description: "lib/feature-flags.ts with isFeatureFlagEnabled() + 60s cache. lib/cron-feature-guard.ts maps 32+ crons.",
      testType: "feature-flags-verify", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-03-04", category: "config",
    },
    {
      id: "A.2.4", phase: "A.2 Multi-Site Hardening", phaseOrder: 2, taskOrder: 4, taskTotal: 4,
      title: "Brand Templates for Non-London Sites",
      description: "Ensure brand-kit-generator produces correct output for all 5 sites. Test getBrandProfile() for each siteId.",
      testType: "brand-kit-test", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-22", startDate: "2026-03-11", category: "content",
    },

    // ── Phase A.3: Compliance & Social (4 tasks) ─────────────────────────────
    {
      id: "A.3.1", phase: "A.3 Compliance & Social", phaseOrder: 3, taskOrder: 1, taskTotal: 4,
      title: "Cookie Consent Banner",
      description: "Bilingual EN/AR cookie consent banner with 4 categories, localStorage-persisted, auto-applied on load.",
      testType: "cookie-consent-verify", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-04", startDate: "2026-03-04", category: "config",
    },
    {
      id: "A.3.2", phase: "A.3 Compliance & Social", phaseOrder: 3, taskOrder: 2, taskTotal: 4,
      title: "GDPR Data Deletion",
      description: "Public endpoint to delete user data (EmailSubscriber, CharterInquiry, CjClickEvent by email). Logs to AuditLog.",
      testType: "gdpr-endpoint-test", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-25", startDate: "2026-03-11", category: "config",
    },
    {
      id: "A.3.3", phase: "A.3 Compliance & Social", phaseOrder: 3, taskOrder: 3, taskTotal: 4,
      title: "Twitter/X Auto-Publish",
      description: "Wire Twitter API v2 so social cron publishes posts automatically. Needs API keys in Vercel.",
      testType: "twitter-api-verify", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-25", startDate: "2026-03-11", category: "config",
    },
    {
      id: "A.3.4", phase: "A.3 Compliance & Social", phaseOrder: 3, taskOrder: 4, taskTotal: 4,
      title: "SendGrid Integration",
      description: "Wire email campaigns to actually send via SendGrid. Sender supports SMTP/Resend/SendGrid, just needs keys.",
      testType: "email-send-test", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-25", startDate: "2026-03-11", category: "config",
    },

    // ── Phase A.4: Cleanup (3 tasks) ─────────────────────────────────────────
    {
      id: "A.4.1", phase: "A.4 Cleanup", phaseOrder: 4, taskOrder: 1, taskTotal: 3,
      title: "Orphan Prisma Models Audit",
      description: "Remove unused Prisma models with 0 references outside schema.prisma.",
      testType: "prisma-orphan-scan", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-28", startDate: "2026-03-11", category: "config",
    },
    {
      id: "A.4.2", phase: "A.4 Cleanup", phaseOrder: 4, taskOrder: 2, taskTotal: 3,
      title: "Dead Admin Buttons",
      description: "Find and wire all non-functional buttons in admin pages.",
      testType: "dead-buttons-scan", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-28", startDate: "2026-03-11", category: "content",
    },
    {
      id: "A.4.3", phase: "A.4 Cleanup", phaseOrder: 4, taskOrder: 3, taskTotal: 3,
      title: "Test Suite Expansion",
      description: "Expand smoke tests to 120+ tests across 20+ categories covering all new features.",
      testType: "smoke-test-run", testable: true, status: "todo", readiness: 0,
      dueDate: "2026-03-28", startDate: "2026-03-11", category: "config",
    },
  ],
};

// ── Stage A+: Built Feature Validation ──────────────────────────────────────
// These validate systems that ARE already built. Tests should pass now.

export const FEATURE_VALIDATION_PLAN: DevPlan = {
  id: "feature-validation",
  project: "general / march26",
  title: "Built Feature Validation",
  tasks: [
    // ── Phase F.1: Content Pipeline (7 tasks) ───────────────────────────────
    {
      id: "F.1.1", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 1, taskTotal: 7,
      title: "Topic Proposals in DB",
      description: "TopicProposal table has records with site_id, intent, source_weights_json. Weekly-topics cron creates them.",
      testType: "pipeline-topics-exist", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-01", category: "pipeline",
    },
    {
      id: "F.1.2", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 2, taskTotal: 7,
      title: "Article Drafts Advancing",
      description: "ArticleDraft records exist across multiple phases (research, outline, drafting, assembly, etc).",
      testType: "pipeline-drafts-advancing", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-01", category: "pipeline",
    },
    {
      id: "F.1.3", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 3, taskTotal: 7,
      title: "Pre-Publication Gate (16 Checks)",
      description: "Pre-pub gate has 16 active checks: route, AR, SEO, score, headings, words, links, readability, alt, author, schema, authenticity, affiliates, AIO, link-ratio, citability.",
      testType: "pipeline-prepub-gate", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-19", category: "seo",
    },
    {
      id: "F.1.4", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 4, taskTotal: 7,
      title: "Published BlogPosts",
      description: "BlogPost table has published articles with content_en, content_ar, seo_score, affiliate links.",
      testType: "pipeline-published-posts", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-01", category: "pipeline",
    },
    {
      id: "F.1.5", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 5, taskTotal: 7,
      title: "Title Sanitization & Dedup",
      description: "cleanTitle() strips slug-style titles, AI artifacts. Cannibalization check blocks >80% Jaccard overlap.",
      testType: "pipeline-title-sanitizer", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "pipeline",
    },
    {
      id: "F.1.6", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 6, taskTotal: 7,
      title: "Author Rotation (E-E-A-T)",
      description: "Named author profiles per site. getNextAuthor() load-balances by fewest recent ContentCredits.",
      testType: "pipeline-author-rotation", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-06", category: "content",
    },
    {
      id: "F.1.7", phase: "F.1 Content Pipeline", phaseOrder: 1, taskOrder: 7, taskTotal: 7,
      title: "Content Auto-Fix Cron",
      description: "content-auto-fix runs daily: thin content unpublish, orphan links, duplicate detection, broken link cleanup, meta trimming.",
      testType: "pipeline-autofix-cron", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "pipeline",
    },

    // ── Phase F.2: SEO & Indexing (6 tasks) ─────────────────────────────────
    {
      id: "F.2.1", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 1, taskTotal: 6,
      title: "IndexNow Multi-Engine",
      description: "IndexNow submits to 3 engines: Bing, Yandex, api.indexnow.org. Batch POST up to 10K URLs.",
      testType: "seo-indexnow-config", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "seo",
    },
    {
      id: "F.2.2", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 2, taskTotal: 6,
      title: "Sitemap Generation",
      description: "Cache-first sitemap at /sitemap.xml. Pre-built in SiteSettings table, served <200ms. Includes blog, yacht, destination URLs.",
      testType: "seo-sitemap-check", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-07", category: "seo",
    },
    {
      id: "F.2.3", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 3, taskTotal: 6,
      title: "GSC Sync (Per-Day Storage)",
      description: "gsc-sync cron stores per-day per-page data. Dimensions: page+date. No more 7x overcounting.",
      testType: "seo-gsc-sync", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-09", category: "seo",
    },
    {
      id: "F.2.4", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 4, taskTotal: 6,
      title: "SEO Standards (lib/seo/standards.ts)",
      description: "Centralized SEO thresholds: quality gate 70, min words 1000, meta desc 120-160, Jan 2026 authenticity flags, GEO optimization.",
      testType: "seo-standards-file", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "seo",
    },
    {
      id: "F.2.5", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 5, taskTotal: 6,
      title: "Schema Markup (JSON-LD)",
      description: "Structured data on all content pages: Article, Product, Place, Trip, FAQPage, BreadcrumbList, Organization.",
      testType: "seo-schema-markup", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-20", category: "seo",
    },
    {
      id: "F.2.6", phase: "F.2 SEO & Indexing", phaseOrder: 2, taskOrder: 6, taskTotal: 6,
      title: "URL Indexing Status Tracking",
      description: "URLIndexingStatus table tracks every page. Unified resolveStatus() in lib/seo/indexing-summary.ts.",
      testType: "seo-indexing-status", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-07", category: "seo",
    },

    // ── Phase F.3: Dashboard & Admin (6 tasks) ──────────────────────────────
    {
      id: "F.3.1", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 1, taskTotal: 6,
      title: "Cockpit Mission Control",
      description: "7-tab cockpit: Mission Control, Content Matrix, Pipeline, Crons, Sites, AI Config, Settings. Mobile-first.",
      testType: "dash-cockpit-api", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-26", category: "content",
    },
    {
      id: "F.3.2", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 2, taskTotal: 6,
      title: "Departures Board",
      description: "Airport-style board showing all cron schedules with live countdown timers and Do Now buttons.",
      testType: "dash-departures-api", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-26", category: "content",
    },
    {
      id: "F.3.3", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 3, taskTotal: 6,
      title: "Aggregated Report (v2)",
      description: "8-section report: SEO audit, discovery, indexing, content velocity, operations, public website, affiliate. Composite score.",
      testType: "dash-aggregated-report", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-09", category: "content",
    },
    {
      id: "F.3.4", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 4, taskTotal: 6,
      title: "Cycle Health Analyzer",
      description: "Evidence-based diagnostics: 17 checks, severity + plain-English descriptions, Fix Now buttons, overall grade A-F.",
      testType: "dash-cycle-health", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-06", category: "content",
    },
    {
      id: "F.3.5", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 5, taskTotal: 6,
      title: "Content Matrix",
      description: "Content Matrix tab: article table with 'Why Not Published?' diagnosis, Publish Now, Expand, Re-queue, Delete, Submit to Google.",
      testType: "dash-content-matrix", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-26", category: "content",
    },
    {
      id: "F.3.6", phase: "F.3 Dashboard & Admin", phaseOrder: 3, taskOrder: 6, taskTotal: 6,
      title: "Per-Page Audit",
      description: "Sortable per-page list with indexing status, GSC clicks/impressions/CTR/position, SEO score, word count, issues.",
      testType: "dash-per-page-audit", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-08", category: "seo",
    },

    // ── Phase F.4: AI System (5 tasks) ──────────────────────────────────────
    {
      id: "F.4.1", phase: "F.4 AI System", phaseOrder: 4, taskOrder: 1, taskTotal: 5,
      title: "AI Provider Chain + Circuit Breaker",
      description: "Grok → OpenAI → Claude → Perplexity. Circuit breaker opens after 3 failures, 5-min cooldown. Half-open probe.",
      testType: "ai-provider-chain", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "config",
    },
    {
      id: "F.4.2", phase: "F.4 AI System", phaseOrder: 4, taskOrder: 2, taskTotal: 5,
      title: "AI Cost Tracking",
      description: "ApiUsageLog tracks every AI call: provider, model, tokens, cost, taskType, calledFrom. Dashboard at /admin/ai-costs.",
      testType: "ai-cost-tracking", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-26", category: "config",
    },
    {
      id: "F.4.3", phase: "F.4 AI System", phaseOrder: 4, taskOrder: 3, taskTotal: 5,
      title: "Last-Defense Fallback",
      description: "Final safety net when normal pipeline fails 2+ times. Probes ALL providers. Raw HTML assembly always succeeds.",
      testType: "ai-last-defense", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "config",
    },
    {
      id: "F.4.4", phase: "F.4 AI System", phaseOrder: 4, taskOrder: 4, taskTotal: 5,
      title: "Diagnostic Agent (Auto-Remediation)",
      description: "3-phase engine: Diagnose stuck drafts → Fix (reset timeouts, force raw, reject stuck loops) → Verify. Runs every 2h.",
      testType: "ai-diagnostic-agent", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "pipeline",
    },
    {
      id: "F.4.5", phase: "F.4 AI System", phaseOrder: 4, taskOrder: 5, taskTotal: 5,
      title: "Topic Research (AI-Powered)",
      description: "AI keyword discovery returning 20 topics with volume estimates, trend, competition, relevance. Focus area input.",
      testType: "ai-topic-research", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-05", category: "content",
    },

    // ── Phase F.5: Affiliate System (5 tasks) ──────────────────────────────
    {
      id: "F.5.1", phase: "F.5 Affiliate System", phaseOrder: 5, taskOrder: 1, taskTotal: 5,
      title: "CJ Client + API Integration",
      description: "CJ REST API client with rate limiter (25 req/min), circuit breaker, getWebsiteId() helper.",
      testType: "affiliate-cj-client", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-10", category: "pipeline",
    },
    {
      id: "F.5.2", phase: "F.5 Affiliate System", phaseOrder: 5, taskOrder: 2, taskTotal: 5,
      title: "Affiliate Link Injection",
      description: "affiliate-injection cron injects tracking links into articles. Per-site advertiser mapping. SID attribution.",
      testType: "affiliate-injection-cron", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-10", category: "pipeline",
    },
    {
      id: "F.5.3", phase: "F.5 Affiliate System", phaseOrder: 5, taskOrder: 3, taskTotal: 5,
      title: "Affiliate HQ Dashboard",
      description: "6-tab command center: Revenue, Partners, Coverage, Links, Actions, System. Per-site data.",
      testType: "affiliate-hq-page", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-10", category: "content",
    },
    {
      id: "F.5.4", phase: "F.5 Affiliate System", phaseOrder: 5, taskOrder: 4, taskTotal: 5,
      title: "Commission Sync",
      description: "cj-sync cron syncs advertisers + commissions. SID parsing attributes revenue to articles.",
      testType: "affiliate-commission-sync", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-10", category: "pipeline",
    },
    {
      id: "F.5.5", phase: "F.5 Affiliate System", phaseOrder: 5, taskOrder: 5, taskTotal: 5,
      title: "Deal Discovery",
      description: "deal-discovery cron finds per-site deals. Advertiser categories mapped per destination.",
      testType: "affiliate-deal-discovery", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-10", category: "pipeline",
    },

    // ── Phase F.6: Cron Infrastructure (5 tasks) ────────────────────────────
    {
      id: "F.6.1", phase: "F.6 Cron Infrastructure", phaseOrder: 6, taskOrder: 1, taskTotal: 5,
      title: "Cron Budget Guards",
      description: "All cron routes use 53s budget with 7s buffer. Budget checked before expensive operations.",
      testType: "cron-budget-guards", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.6.2", phase: "F.6 Cron Infrastructure", phaseOrder: 6, taskOrder: 2, taskTotal: 5,
      title: "Cron Feature Flag Guards",
      description: "All crons check checkCronEnabled() at start. Can disable without code deploy via FeatureFlag DB.",
      testType: "cron-feature-guards", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-06", category: "config",
    },
    {
      id: "F.6.3", phase: "F.6 Cron Infrastructure", phaseOrder: 6, taskOrder: 3, taskTotal: 5,
      title: "Cron Auth (CRON_SECRET Pattern)",
      description: "All crons follow standard: allow if CRON_SECRET unset, reject only if set and doesn't match.",
      testType: "cron-auth-pattern", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.6.4", phase: "F.6 Cron Infrastructure", phaseOrder: 6, taskOrder: 4, taskTotal: 5,
      title: "Cron Logging (CronJobLog)",
      description: "All crons log execution to CronJobLog with job_name, status, items_processed, error, execution_time_ms.",
      testType: "cron-logging", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "pipeline",
    },
    {
      id: "F.6.5", phase: "F.6 Cron Infrastructure", phaseOrder: 6, taskOrder: 5, taskTotal: 5,
      title: "Cron Schedule (vercel.json)",
      description: "33 cron routes, staggered timing. No collisions at same minute. All registered in vercel.json.",
      testType: "cron-schedule-check", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },

    // ── Phase F.7: Design & Media (4 tasks) ─────────────────────────────────
    {
      id: "F.7.1", phase: "F.7 Design & Media", phaseOrder: 7, taskOrder: 1, taskTotal: 4,
      title: "Brand Provider (All Sites)",
      description: "getBrandProfile(siteId) returns colors, fonts, name for all 6 sites from config + destination-themes.",
      testType: "design-brand-provider", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-20", category: "content",
    },
    {
      id: "F.7.2", phase: "F.7 Design & Media", phaseOrder: 7, taskOrder: 2, taskTotal: 4,
      title: "Email Sender (Multi-Provider)",
      description: "lib/email/sender.ts supports SMTP, Resend, SendGrid. getActiveProvider() returns configured one.",
      testType: "design-email-sender", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-20", category: "config",
    },
    {
      id: "F.7.3", phase: "F.7 Design & Media", phaseOrder: 7, taskOrder: 3, taskTotal: 4,
      title: "Content Engine (4 AI Agents)",
      description: "Researcher → Ideator → Scripter → Analyst pipeline. API routes for each stage.",
      testType: "design-content-engine", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-20", category: "content",
    },
    {
      id: "F.7.4", phase: "F.7 Design & Media", phaseOrder: 7, taskOrder: 4, taskTotal: 4,
      title: "PDF Generation",
      description: "lib/pdf/html-to-pdf.ts generates PDFs via Puppeteer. PDF guide CRUD API exists.",
      testType: "design-pdf-generation", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-20", category: "content",
    },

    // ── Phase F.8: Yacht Platform (4 tasks) ─────────────────────────────────
    {
      id: "F.8.1", phase: "F.8 Yacht Platform", phaseOrder: 8, taskOrder: 1, taskTotal: 4,
      title: "Yacht Prisma Models",
      description: "8 models: Yacht, YachtDestination, CharterItinerary, CharterInquiry, BrokerPartner, YachtAvailability, YachtAmenity, YachtImage.",
      testType: "yacht-models-exist", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-21", category: "pipeline",
    },
    {
      id: "F.8.2", phase: "F.8 Yacht Platform", phaseOrder: 8, taskOrder: 2, taskTotal: 4,
      title: "Yacht Admin APIs",
      description: "7 admin API routes: yachts, destinations, inquiries, itineraries, brokers, analytics, sync. All withAdminAuth.",
      testType: "yacht-admin-apis", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-21", category: "config",
    },
    {
      id: "F.8.3", phase: "F.8 Yacht Platform", phaseOrder: 8, taskOrder: 3, taskTotal: 4,
      title: "Yacht Public Pages",
      description: "14 public pages: search, detail, destinations, itineraries, charter-planner, inquiry, FAQ, how-it-works.",
      testType: "yacht-public-pages", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-21", category: "content",
    },
    {
      id: "F.8.4", phase: "F.8 Yacht Platform", phaseOrder: 8, taskOrder: 4, taskTotal: 4,
      title: "Yacht Site Shell (Hermetic Separation)",
      description: "SiteShell detects siteId, renders ZenithaHeader/Footer vs DynamicHeader/Footer. CSS tokens in zenitha-tokens.css.",
      testType: "yacht-site-shell", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-21", category: "content",
    },

    // ── Phase F.9: Security & Resilience (5 tasks) ──────────────────────────
    {
      id: "F.9.1", phase: "F.9 Security & Resilience", phaseOrder: 9, taskOrder: 1, taskTotal: 5,
      title: "Admin Auth on All Routes",
      description: "All /api/admin/* routes protected with requireAdmin or withAdminAuth from @/lib/admin-middleware.",
      testType: "security-admin-auth", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.9.2", phase: "F.9 Security & Resilience", phaseOrder: 9, taskOrder: 2, taskTotal: 5,
      title: "XSS Sanitization",
      description: "All dangerouslySetInnerHTML wrapped with sanitizeHtml() from lib/html-sanitizer.ts. 9+ instances sanitized.",
      testType: "security-xss-sanitization", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.9.3", phase: "F.9 Security & Resilience", phaseOrder: 9, taskOrder: 3, taskTotal: 5,
      title: "No Empty Catch Blocks",
      description: "All catch blocks log with context. No catch {} without action. Verified across all crons and lib files.",
      testType: "security-no-empty-catch", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.9.4", phase: "F.9 Security & Resilience", phaseOrder: 9, taskOrder: 4, taskTotal: 5,
      title: "No Info Disclosure in Public APIs",
      description: "Public API error responses don't leak internal error.message, stack traces, or env var names.",
      testType: "security-no-info-disclosure", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-18", category: "config",
    },
    {
      id: "F.9.5", phase: "F.9 Security & Resilience", phaseOrder: 9, taskOrder: 5, taskTotal: 5,
      title: "Atomic Pipeline Operations",
      description: "Reservoir promotion uses atomic updateMany claiming. BlogPost+draft in $transaction. Lifetime cap at 5 attempts.",
      testType: "security-atomic-ops", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-03-09", category: "pipeline",
    },

    // ── Phase F.10: Multi-Site Engine (4 tasks) ─────────────────────────────
    {
      id: "F.10.1", phase: "F.10 Multi-Site Engine", phaseOrder: 10, taskOrder: 1, taskTotal: 4,
      title: "Site Config (5+1 Sites)",
      description: "config/sites.ts has all 6 sites configured with domains, keywords, system prompts, brand colors.",
      testType: "multisite-config", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-16", category: "config",
    },
    {
      id: "F.10.2", phase: "F.10 Multi-Site Engine", phaseOrder: 10, taskOrder: 2, taskTotal: 4,
      title: "Middleware Domain Routing",
      description: "middleware.ts routes 14 domains (5 sites x www+non-www + zenithayachts). Sets x-site-id header.",
      testType: "multisite-middleware", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-16", category: "config",
    },
    {
      id: "F.10.3", phase: "F.10 Multi-Site Engine", phaseOrder: 10, taskOrder: 3, taskTotal: 4,
      title: "Per-Site DB Scoping",
      description: "All content queries include siteId WHERE clause. No cross-site data leakage in articles, topics, indexing.",
      testType: "multisite-db-scoping", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-16", category: "pipeline",
    },
    {
      id: "F.10.4", phase: "F.10 Multi-Site Engine", phaseOrder: 10, taskOrder: 4, taskTotal: 4,
      title: "New Site Wizard",
      description: "8-step wizard at /admin/cockpit/new-site. Creates Site record, seeds 30 topics, configures 5 setting categories.",
      testType: "multisite-wizard", testable: true, status: "done", readiness: 100,
      dueDate: "2026-03-11", startDate: "2026-02-26", category: "content",
    },
  ],
};

// ── Registry Functions ─────────────────────────────────────────────────────────

const ALL_PLANS: DevPlan[] = [STAGE_A_PLAN, FEATURE_VALIDATION_PLAN];

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
