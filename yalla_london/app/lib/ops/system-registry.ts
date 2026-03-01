/**
 * System Registry — The single source of truth for all cron jobs, pipelines, and agents.
 *
 * This is a STATIC registry. It describes what the system SHOULD be doing.
 * Combined with live CronJobLog data, it tells you what IS happening.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface CronJobDef {
  id: string;
  name: string;
  route: string;
  schedule: string; // cron expression
  scheduleHuman: string; // "Every 15 min", "Daily 7am UTC"
  description: string;
  produces: string; // what DB table/data it creates
  consumes: string; // what it reads from
  group: "content" | "seo" | "analytics" | "publishing" | "monitoring";
  critical: boolean; // does the revenue pipeline depend on it?
  order: number; // execution order within the daily cycle (1 = earliest)
}

export interface PipelineDef {
  id: string;
  name: string;
  description: string;
  stages: PipelineStageDef[];
  triggerCron: string; // which cron drives it
  outputTable: string;
}

export interface PipelineStageDef {
  id: string;
  name: string;
  order: number;
  description: string;
  dbField?: string; // the current_phase value or status value
}

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  skills: string[];
  cronJobs: string[]; // which crons it coordinates
  domain: string;
}

export interface DataFlowDef {
  from: string; // cron id or pipeline id
  to: string;
  dataType: string; // "TopicProposal", "ArticleDraft", etc.
  description: string;
}

// ─── Cron Jobs ──────────────────────────────────────────────────────────

export const CRON_JOBS: CronJobDef[] = [
  {
    id: "weekly-topics",
    name: "Weekly Topics",
    route: "/api/cron/weekly-topics",
    schedule: "0 4 * * 1",
    scheduleHuman: "Monday 4:00 AM UTC",
    description: "Generates 30 topic proposals per site using AI. Seeds the entire content pipeline.",
    produces: "TopicProposal",
    consumes: "Site config, trending data",
    group: "content",
    critical: true,
    order: 1,
  },
  {
    id: "trends-monitor",
    name: "Trends Monitor",
    route: "/api/cron/trends-monitor",
    schedule: "0 6 * * *",
    scheduleHuman: "Daily 6:00 AM UTC",
    description: "Scans Google Trends and social buzz for timely topics. Feeds high-relevance trends into the topic queue.",
    produces: "TopicProposal, SeoReport",
    consumes: "Google Trends API, Grok social analysis",
    group: "content",
    critical: false,
    order: 3,
  },
  {
    id: "daily-content-generate",
    name: "Daily Content Generate",
    route: "/api/cron/daily-content-generate",
    schedule: "0 5 * * *",
    scheduleHuman: "Daily 5:00 AM UTC",
    description: "Creates 2 articles per site (1 EN + 1 AR) from the topic queue. Direct-to-BlogPost path.",
    produces: "BlogPost",
    consumes: "TopicProposal",
    group: "content",
    critical: true,
    order: 2,
  },
  {
    id: "content-builder",
    name: "Content Builder",
    route: "/api/cron/content-builder",
    schedule: "*/15 * * * *",
    scheduleHuman: "Every 15 minutes",
    description: "The 8-phase article factory. Each run advances one draft through: research → outline → drafting → assembly → images → SEO → scoring → reservoir.",
    produces: "ArticleDraft (phase progression)",
    consumes: "TopicProposal, ArticleDraft",
    group: "content",
    critical: true,
    order: 5,
  },
  {
    id: "content-selector",
    name: "Content Selector",
    route: "/api/cron/content-selector",
    schedule: "30 8 * * *",
    scheduleHuman: "Daily 8:30 AM UTC",
    description: "Picks the best articles from the reservoir (quality score ≥ 50) and promotes them to published BlogPosts with bilingual merging.",
    produces: "BlogPost (published), SeoMeta, URLIndexingStatus",
    consumes: "ArticleDraft (reservoir phase)",
    group: "publishing",
    critical: true,
    order: 6,
  },
  {
    id: "scheduled-publish-morning",
    name: "Scheduled Publish (AM)",
    route: "/api/cron/scheduled-publish",
    schedule: "0 9 * * *",
    scheduleHuman: "Daily 9:00 AM UTC",
    description: "Publishes any BlogPosts queued for morning release.",
    produces: "BlogPost (published=true)",
    consumes: "ScheduledContent",
    group: "publishing",
    critical: false,
    order: 7,
  },
  {
    id: "scheduled-publish-afternoon",
    name: "Scheduled Publish (PM)",
    route: "/api/cron/scheduled-publish",
    schedule: "0 16 * * *",
    scheduleHuman: "Daily 4:00 PM UTC",
    description: "Publishes any BlogPosts queued for afternoon release.",
    produces: "BlogPost (published=true)",
    consumes: "ScheduledContent",
    group: "publishing",
    critical: false,
    order: 12,
  },
  {
    id: "affiliate-injection",
    name: "Affiliate Injection",
    route: "/api/cron/affiliate-injection",
    schedule: "0 9 * * *",
    scheduleHuman: "Daily 9:00 AM UTC",
    description: "Scans published articles and injects relevant affiliate partner CTAs (Booking.com, GetYourGuide, etc.).",
    produces: "BlogPost (with affiliate links)",
    consumes: "BlogPost (published)",
    group: "publishing",
    critical: true,
    order: 8,
  },
  {
    id: "seo-orchestrator-daily",
    name: "SEO Orchestrator (Daily)",
    route: "/api/cron/seo-orchestrator?mode=daily",
    schedule: "0 6 * * *",
    scheduleHuman: "Daily 6:00 AM UTC",
    description: "Master SEO coordinator. Runs live site audit, evaluates business goals, checks agent performance, generates action plan.",
    produces: "SeoReport (orchestrator type)",
    consumes: "BlogPost, SiteHealthCheck, CronJobLog",
    group: "seo",
    critical: false,
    order: 3,
  },
  {
    id: "seo-orchestrator-weekly",
    name: "SEO Orchestrator (Weekly)",
    route: "/api/cron/seo-orchestrator?mode=weekly",
    schedule: "0 5 * * 0",
    scheduleHuman: "Sunday 5:00 AM UTC",
    description: "Weekly deep SEO analysis. Includes competitor research, AIO publication scan, and agent config updates.",
    produces: "SeoReport (orchestrator type)",
    consumes: "BlogPost, SiteHealthCheck, CronJobLog, competitor data",
    group: "seo",
    critical: false,
    order: 2,
  },
  {
    id: "seo-agent-morning",
    name: "SEO Agent (Morning)",
    route: "/api/cron/seo-agent",
    schedule: "0 7 * * *",
    scheduleHuman: "Daily 7:00 AM UTC",
    description: "13-step autonomous SEO audit: indexing checks, content gaps, auto-fixes, analytics, low-CTR rewrites, URL submissions.",
    produces: "SeoReport, URLIndexingStatus, TopicProposal (rewrites)",
    consumes: "BlogPost, GSC data, GA4 data",
    group: "seo",
    critical: true,
    order: 4,
  },
  {
    id: "seo-agent-midday",
    name: "SEO Agent (Midday)",
    route: "/api/cron/seo-agent",
    schedule: "0 13 * * *",
    scheduleHuman: "Daily 1:00 PM UTC",
    description: "Second daily SEO agent run. Same 13-step audit.",
    produces: "SeoReport, URLIndexingStatus",
    consumes: "BlogPost, GSC data, GA4 data",
    group: "seo",
    critical: false,
    order: 10,
  },
  {
    id: "seo-agent-evening",
    name: "SEO Agent (Evening)",
    route: "/api/cron/seo-agent",
    schedule: "0 20 * * *",
    scheduleHuman: "Daily 8:00 PM UTC",
    description: "Third daily SEO agent run. Catches late-day content.",
    produces: "SeoReport, URLIndexingStatus",
    consumes: "BlogPost, GSC data, GA4 data",
    group: "seo",
    critical: false,
    order: 13,
  },
  {
    id: "seo-cron-daily",
    name: "SEO Metrics (Daily)",
    route: "/api/seo/cron?task=daily",
    schedule: "30 7 * * *",
    scheduleHuman: "Daily 7:30 AM UTC",
    description: "Collects daily SEO metrics: page scores, indexing rates, schema validation counts.",
    produces: "SEO metrics data",
    consumes: "BlogPost, SeoMeta, URLIndexingStatus",
    group: "seo",
    critical: false,
    order: 4,
  },
  {
    id: "seo-cron-weekly",
    name: "SEO Metrics (Weekly)",
    route: "/api/seo/cron?task=weekly",
    schedule: "0 8 * * 0",
    scheduleHuman: "Sunday 8:00 AM UTC",
    description: "Generates weekly SEO report with trend analysis.",
    produces: "SEO weekly report",
    consumes: "SEO daily metrics",
    group: "seo",
    critical: false,
    order: 5,
  },
  {
    id: "analytics",
    name: "Analytics Sync",
    route: "/api/cron/analytics",
    schedule: "0 3 * * *",
    scheduleHuman: "Daily 3:00 AM UTC",
    description: "Syncs Google Analytics 4 and Google Search Console data. Creates daily analytics snapshot.",
    produces: "AnalyticsSnapshot",
    consumes: "GA4 API, GSC API",
    group: "analytics",
    critical: false,
    order: 0,
  },
  {
    id: "site-health-check",
    name: "Site Health Check",
    route: "/api/cron/site-health-check",
    schedule: "0 22 * * *",
    scheduleHuman: "Daily 10:00 PM UTC",
    description: "End-of-day health snapshot per site: posts count, avg SEO score, indexing rate, GA4 metrics, recent errors.",
    produces: "SiteHealthCheck",
    consumes: "BlogPost, SeoMeta, URLIndexingStatus, CronJobLog, AnalyticsSnapshot",
    group: "monitoring",
    critical: false,
    order: 14,
  },
  {
    id: "sweeper",
    name: "Sweeper Agent",
    route: "/api/cron/sweeper",
    schedule: "45 8 * * *",
    scheduleHuman: "Daily 8:45 AM UTC",
    description: "Automatic failure recovery. Scans for rejected/stuck/failing drafts, diagnoses the error, applies the fix, and restarts the pipeline.",
    produces: "ArticleDraft (recovered)",
    consumes: "ArticleDraft (rejected/stuck/failing)",
    group: "content",
    critical: true,
    order: 7,
  },
  {
    id: "google-indexing",
    name: "Google Indexing",
    route: "/api/cron/google-indexing",
    schedule: "15 9 * * *",
    scheduleHuman: "Daily 9:15 AM UTC",
    description: "Discovers new/updated published posts and submits them to IndexNow + Google Search Console. Tracks submission status in URLIndexingStatus table.",
    produces: "URLIndexingStatus (submitted)",
    consumes: "BlogPost (published)",
    group: "seo",
    critical: true,
    order: 8,
  },
  {
    id: "verify-indexing",
    name: "Verify Indexing",
    route: "/api/cron/verify-indexing",
    schedule: "0 11 * * *",
    scheduleHuman: "Daily 11:00 AM UTC",
    description: "Uses Google Search Console URL Inspection API to verify if submitted URLs are actually indexed by Google. Updates indexing state and coverage status.",
    produces: "URLIndexingStatus (indexed/not_indexed)",
    consumes: "URLIndexingStatus (submitted)",
    group: "seo",
    critical: true,
    order: 9,
  },
];

// ─── Pipelines ──────────────────────────────────────────────────────────

export const PIPELINES: PipelineDef[] = [
  {
    id: "content-to-revenue",
    name: "Content → Revenue Pipeline",
    description: "The critical path: topics become articles become traffic become affiliate revenue.",
    triggerCron: "weekly-topics",
    outputTable: "BlogPost",
    stages: [
      { id: "topic-generation", name: "Topic Generation", order: 1, description: "AI generates 30 topics per site weekly", dbField: "proposed" },
      { id: "research", name: "Research", order: 2, description: "AI researches the topic: keywords, competitors, questions", dbField: "research" },
      { id: "outline", name: "Outline", order: 3, description: "Structured article outline with H2s, sections, schema type", dbField: "outline" },
      { id: "drafting", name: "Drafting", order: 4, description: "AI writes each section (batches 3 per run)", dbField: "drafting" },
      { id: "assembly", name: "Assembly", order: 5, description: "Sections merged into full HTML article", dbField: "assembly" },
      { id: "images", name: "Images", order: 6, description: "Featured image and in-article images sourced", dbField: "images" },
      { id: "seo-optimization", name: "SEO Optimization", order: 7, description: "Meta tags, schema markup, internal links injected", dbField: "seo" },
      { id: "scoring", name: "Quality Scoring", order: 8, description: "Quality + SEO + readability scores calculated", dbField: "scoring" },
      { id: "reservoir", name: "Reservoir", order: 9, description: "Article waits for promotion (quality gate)", dbField: "reservoir" },
      { id: "promotion", name: "Publish", order: 10, description: "Best articles promoted to BlogPost with bilingual merge + affiliates", dbField: "published" },
      { id: "indexing", name: "Indexing", order: 11, description: "URL submitted to Google via IndexNow", dbField: "submitted" },
      { id: "monitoring", name: "Performance Monitoring", order: 12, description: "CTR, rankings, engagement tracked. Low performers queued for rewrite.", dbField: "indexed" },
    ],
  },
  {
    id: "seo-audit-fix",
    name: "SEO Audit & Fix Pipeline",
    description: "Automated SEO health monitoring and self-healing.",
    triggerCron: "seo-orchestrator-daily",
    outputTable: "SeoReport",
    stages: [
      { id: "site-audit", name: "Site Audit", order: 1, description: "Sitemap, schema, robots.txt, CDN, rendering checks" },
      { id: "goals-evaluation", name: "Goals Check", order: 2, description: "Compare metrics against 30d/90d KPI targets" },
      { id: "agent-health", name: "Agent Health", order: 3, description: "Verify all cron jobs are running and healthy" },
      { id: "issue-detection", name: "Issue Detection", order: 4, description: "Generate prioritized list of critical issues" },
      { id: "auto-fix", name: "Auto-Fix", order: 5, description: "Apply automatic fixes (missing meta, low-CTR rewrites)" },
      { id: "report", name: "Report", order: 6, description: "Store findings in SeoReport for dashboard" },
    ],
  },
  {
    id: "indexing-pipeline",
    name: "Google Indexing Pipeline",
    description: "Getting content discovered and indexed by Google.",
    triggerCron: "seo-agent-morning",
    outputTable: "URLIndexingStatus",
    stages: [
      { id: "discovered", name: "Discovered", order: 1, description: "URL created when BlogPost is published", dbField: "discovered" },
      { id: "submitted", name: "Submitted", order: 2, description: "URL submitted to Google via IndexNow", dbField: "submitted" },
      { id: "indexed", name: "Indexed", order: 3, description: "Google confirms the page is in its index", dbField: "indexed" },
      { id: "ranking", name: "Ranking", order: 4, description: "Page appears in search results for target keywords", dbField: "ranking" },
    ],
  },
];

// ─── Agents ─────────────────────────────────────────────────────────────

export const AGENTS: AgentDef[] = [
  {
    id: "content-pipeline-agent",
    name: "Content Pipeline Agent",
    description: "Orchestrates the full content lifecycle from topic research to published article.",
    skills: ["content-creator", "content-research-writer", "copywriting", "copy-editing", "tavily-web", "exa-search", "firecrawl-scraper"],
    cronJobs: ["weekly-topics", "daily-content-generate", "content-builder", "content-selector", "trends-monitor"],
    domain: "Content",
  },
  {
    id: "seo-growth-agent",
    name: "SEO Growth Agent",
    description: "Autonomous SEO audit, indexing, and performance optimization.",
    skills: ["seo-audit", "seo-optimizer", "schema-markup", "programmatic-seo", "core-web-vitals", "seo-fundamentals", "roier-seo", "seo"],
    cronJobs: ["seo-orchestrator-daily", "seo-orchestrator-weekly", "seo-agent-morning", "seo-agent-midday", "seo-agent-evening", "seo-cron-daily", "seo-cron-weekly"],
    domain: "SEO",
  },
  {
    id: "analytics-intelligence-agent",
    name: "Analytics Intelligence Agent",
    description: "Collects and analyzes traffic, engagement, and revenue data.",
    skills: ["google-analytics", "analytics-tracking", "ab-test-setup"],
    cronJobs: ["analytics"],
    domain: "Analytics",
  },
  {
    id: "publishing-monetization-agent",
    name: "Publishing & Monetization Agent",
    description: "Handles scheduled publishing, affiliate injection, and revenue optimization.",
    skills: ["content-creator", "page-cro"],
    cronJobs: ["scheduled-publish-morning", "scheduled-publish-afternoon", "affiliate-injection"],
    domain: "Publishing",
  },
  {
    id: "site-health-agent",
    name: "Site Health Agent",
    description: "Monitors overall system health, cron job failures, and per-site KPIs.",
    skills: ["web-performance-optimization", "core-web-vitals"],
    cronJobs: ["site-health-check"],
    domain: "Monitoring",
  },
  {
    id: "sweeper-agent",
    name: "Sweeper & Auto-Recovery Agent",
    description: "Automatic failure recovery. Detects failed/stuck/rejected ArticleDrafts, diagnoses the cause, applies fixes, and restarts. Triggered BOTH on schedule (8:45 AM UTC) AND immediately when any pipeline step fails via failure hooks.",
    skills: ["content-creator"],
    cronJobs: ["sweeper"],
    domain: "Recovery",
  },
];

// ─── Data Flow ──────────────────────────────────────────────────────────

export const DATA_FLOWS: DataFlowDef[] = [
  { from: "weekly-topics", to: "content-builder", dataType: "TopicProposal", description: "Topics feed article creation" },
  { from: "weekly-topics", to: "daily-content-generate", dataType: "TopicProposal", description: "Topics feed daily generation" },
  { from: "trends-monitor", to: "content-builder", dataType: "TopicProposal", description: "Trending topics enter the queue" },
  { from: "content-builder", to: "content-selector", dataType: "ArticleDraft", description: "Reservoir drafts ready for promotion" },
  { from: "content-selector", to: "seo-agent-morning", dataType: "BlogPost", description: "Published articles need indexing" },
  { from: "content-selector", to: "affiliate-injection", dataType: "BlogPost", description: "Published articles get affiliate links" },
  { from: "daily-content-generate", to: "seo-agent-morning", dataType: "BlogPost", description: "Direct articles need indexing" },
  { from: "seo-agent-morning", to: "content-builder", dataType: "TopicProposal", description: "Low-CTR articles queued for rewrite" },
  { from: "seo-orchestrator-daily", to: "seo-agent-morning", dataType: "SeoReport", description: "Orchestrator directives guide agent" },
  { from: "analytics", to: "seo-orchestrator-daily", dataType: "AnalyticsSnapshot", description: "Analytics data feeds SEO decisions" },
  { from: "analytics", to: "site-health-check", dataType: "AnalyticsSnapshot", description: "GA4 data feeds health score" },
  { from: "content-builder", to: "sweeper", dataType: "ArticleDraft", description: "Failed drafts trigger immediate auto-recovery via failure hooks" },
  { from: "content-selector", to: "sweeper", dataType: "ArticleDraft", description: "Failed promotions trigger immediate recovery via failure hooks" },
  { from: "sweeper", to: "content-builder", dataType: "ArticleDraft", description: "Recovered drafts re-enter the content pipeline" },
  { from: "content-selector", to: "google-indexing", dataType: "URLIndexingStatus", description: "New BlogPost URLs discovered → submitted to search engines" },
  { from: "seo-agent-morning", to: "google-indexing", dataType: "URLIndexingStatus", description: "SEO agent also submits URLs and tracks in URLIndexingStatus" },
  { from: "google-indexing", to: "verify-indexing", dataType: "URLIndexingStatus", description: "Submitted URLs verified against Google Search Console" },
];

// ─── Helpers ────────────────────────────────────────────────────────────

export function getCronJobById(id: string): CronJobDef | undefined {
  return CRON_JOBS.find((c) => c.id === id);
}

export function getCronJobsByGroup(group: CronJobDef["group"]): CronJobDef[] {
  return CRON_JOBS.filter((c) => c.group === group);
}

export function getDailySchedule(): CronJobDef[] {
  return [...CRON_JOBS].sort((a, b) => a.order - b.order);
}

/** Parse cron expression to get the next run time (simplified) */
export function getNextRunTime(schedule: string): Date {
  const now = new Date();
  const parts = schedule.split(" ");
  if (parts.length !== 5) return now;

  const [min, hour, , , dayOfWeek] = parts;

  const next = new Date(now);
  next.setUTCSeconds(0, 0);

  if (min.includes("/")) {
    // Every N minutes
    const interval = parseInt(min.split("/")[1], 10) || 15;
    const currentMin = now.getUTCMinutes();
    const nextMin = Math.ceil((currentMin + 1) / interval) * interval;
    if (nextMin >= 60) {
      next.setUTCHours(now.getUTCHours() + 1, 0);
    } else {
      next.setUTCMinutes(nextMin);
    }
    return next;
  }

  const targetHour = parseInt(hour, 10);
  const targetMin = parseInt(min, 10);

  next.setUTCHours(targetHour, targetMin);

  if (dayOfWeek !== "*") {
    const targetDay = parseInt(dayOfWeek, 10);
    const currentDay = now.getUTCDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && now > next)) daysUntil += 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
  } else if (now > next) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}
