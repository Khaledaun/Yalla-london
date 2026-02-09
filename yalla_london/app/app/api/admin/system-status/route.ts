export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * System Connectivity Status Endpoint
 *
 * GET /api/admin/system-status
 *
 * Returns real-time status of all external services, database,
 * cron jobs, and environment configuration. Use this to verify
 * everything is properly connected before going live.
 */
export const GET = withAdminAuth(async (_request: NextRequest) => {
  const startTime = Date.now();
  const status: Record<string, any> = {};

  // 1. Database connectivity
  status.database = await checkDatabase();

  // 2. Environment variables
  status.environment = checkEnvironment();

  // 3. External services
  const [ai, supabase, indexnow, ga4, gsc, sentry, serpapi] =
    await Promise.allSettled([
      checkAIProviders(),
      checkSupabase(),
      checkIndexNow(),
      checkGA4(),
      checkGSC(),
      checkSentry(),
      checkSerpApi(),
    ]);

  status.services = {
    ai_providers:
      ai.status === "fulfilled"
        ? ai.value
        : { status: "error", error: String(ai) },
    supabase:
      supabase.status === "fulfilled" ? supabase.value : { status: "error" },
    indexnow:
      indexnow.status === "fulfilled" ? indexnow.value : { status: "error" },
    google_analytics:
      ga4.status === "fulfilled" ? ga4.value : { status: "error" },
    google_search_console:
      gsc.status === "fulfilled" ? gsc.value : { status: "error" },
    sentry: sentry.status === "fulfilled" ? sentry.value : { status: "error" },
    serpapi:
      serpapi.status === "fulfilled" ? serpapi.value : { status: "error" },
  };

  // 4. Cron jobs configuration
  status.cron_jobs = checkCronJobs();

  // 5. Cache/CDN configuration
  status.cdn = checkCDNConfig();

  // 6. Overall health score
  const scores = calculateHealthScore(status);
  status.health_score = scores;

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      ...status,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
});

// --- Database Check ---
async function checkDatabase() {
  try {
    const { prisma } = await import("@/lib/db");
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    // Check key table counts
    const [postCount, userCount, seoReportCount, eventCount] =
      await Promise.all([
        prisma.blogPost.count().catch(() => -1),
        prisma.user.count().catch(() => -1),
        prisma.seoReport.count().catch(() => -1),
        prisma.event.count().catch(() => -1),
      ]);

    return {
      status: "connected",
      latency_ms: latency,
      tables: {
        blog_posts: postCount,
        users: userCount,
        seo_reports: seoReportCount,
        events: eventCount,
      },
    };
  } catch (error) {
    return {
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// --- Environment Variables Check ---
function checkEnvironment() {
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "ADMIN_EMAILS",
  ];

  const recommended = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "INDEXNOW_KEY",
    "CRON_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const optional = [
    "SENTRY_DSN",
    "GA4_MEASUREMENT_ID",
    "GA4_PROPERTY_ID",
    "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
    "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
    "SERPAPI_API_KEY",
    "STRIPE_SECRET_KEY",
    "SLACK_WEBHOOK_URL",
    "AWS_ACCESS_KEY_ID",
  ];

  const check = (vars: string[]) =>
    vars.map((v) => ({
      name: v,
      set: !!process.env[v],
      // Show partial value for debugging (first 4 chars)
      preview: process.env[v] ? `${process.env[v]!.substring(0, 4)}...` : null,
    }));

  const requiredResults = check(required);
  const recommendedResults = check(recommended);
  const optionalResults = check(optional);

  return {
    required: {
      all_set: requiredResults.every((r) => r.set),
      vars: requiredResults,
    },
    recommended: {
      set_count: `${recommendedResults.filter((r) => r.set).length}/${recommendedResults.length}`,
      vars: recommendedResults,
    },
    optional: {
      set_count: `${optionalResults.filter((r) => r.set).length}/${optionalResults.length}`,
      vars: optionalResults,
    },
    node_env: process.env.NODE_ENV,
  };
}

// --- AI Provider Check ---
async function checkAIProviders() {
  const providers: Record<string, any> = {};

  // Check Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    providers.anthropic = {
      status: "configured",
      key_prefix: process.env.ANTHROPIC_API_KEY.substring(0, 6),
    };
  } else {
    providers.anthropic = { status: "not_configured" };
  }

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.openai = {
      status: "configured",
      key_prefix: process.env.OPENAI_API_KEY.substring(0, 6),
    };
  } else {
    providers.openai = { status: "not_configured" };
  }

  // Check Google AI
  if (process.env.GOOGLE_API_KEY) {
    providers.google = { status: "configured" };
  } else {
    providers.google = { status: "not_configured" };
  }

  const configuredCount = Object.values(providers).filter(
    (p: any) => p.status === "configured",
  ).length;

  return {
    status: configuredCount > 0 ? "available" : "no_providers",
    configured_count: configuredCount,
    providers,
  };
}

// --- Supabase Check ---
async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    return { status: "not_configured" };
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: response.ok ? "connected" : "error",
      http_status: response.status,
    };
  } catch {
    return { status: "unreachable" };
  }
}

// --- IndexNow Check ---
async function checkIndexNow() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return { status: "not_configured" };
  }
  return { status: "configured", key_length: key.length };
}

// --- GA4 Check ---
async function checkGA4() {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const propertyId = process.env.GA4_PROPERTY_ID;

  return {
    status: measurementId ? "configured" : "not_configured",
    client_tracking: !!measurementId,
    server_analytics: !!propertyId,
    measurement_id: measurementId
      ? `${measurementId.substring(0, 4)}...`
      : null,
  };
}

// --- GSC Check ---
async function checkGSC() {
  const email =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    process.env.GSC_CLIENT_EMAIL;
  const key =
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
    process.env.GSC_PRIVATE_KEY;

  if (!email || !key) {
    return { status: "not_configured", has_email: !!email, has_key: !!key };
  }

  return {
    status: "configured",
    service_account: email,
  };
}

// --- Sentry Check ---
async function checkSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return { status: "not_configured" };
  }
  return {
    status: "configured",
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  };
}

// --- SerpAPI Check ---
async function checkSerpApi() {
  const key = process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_API_KEY;
  if (!key) {
    return { status: "not_configured" };
  }
  return { status: "configured" };
}

// --- Cron Jobs Check ---
function checkCronJobs() {
  const cronSecret = process.env.CRON_SECRET;

  return {
    cron_secret_set: !!cronSecret,
    jobs: [
      {
        name: "daily-content-generate",
        schedule: "0 5 * * *",
        auth: "cron_secret",
      },
      { name: "seo-agent", schedule: "0 7,13,20 * * *", auth: "cron_secret" },
      {
        name: "scheduled-publish",
        schedule: "0 9,16 * * *",
        auth: "cron_secret",
      },
      {
        name: "weekly-topics",
        schedule: "0 4 * * 1",
        auth: "cron_secret + feature_flag",
      },
      { name: "trends-monitor", schedule: "0 6 * * *", auth: "cron_secret" },
      { name: "analytics", schedule: "0 3 * * *", auth: "cron_secret" },
      { name: "seo/cron (daily)", schedule: "30 7 * * *", auth: "cron_secret" },
      { name: "seo/cron (weekly)", schedule: "0 8 * * 0", auth: "cron_secret" },
    ],
  };
}

// --- CDN Config Check ---
function checkCDNConfig() {
  return {
    cloudflare: {
      note: "Check Cloudflare dashboard for cache hit rate",
      cache_headers: "s-maxage configured on public routes",
      vary_header: "x-site-id for multi-tenant",
    },
    isr_pages: [
      { route: "/blog/*", revalidate: 600 },
      { route: "/blog/[slug]", revalidate: 600 },
    ],
  };
}

// --- Health Score ---
function calculateHealthScore(status: Record<string, any>) {
  let score = 0;
  let maxScore = 0;
  const issues: string[] = [];

  // Database (25 points)
  maxScore += 25;
  if (status.database?.status === "connected") {
    score += 25;
    if (status.database.latency_ms > 500) {
      score -= 5;
      issues.push("Database latency > 500ms");
    }
  } else {
    issues.push("Database not connected");
  }

  // Required env vars (20 points)
  maxScore += 20;
  if (status.environment?.required?.all_set) {
    score += 20;
  } else {
    issues.push("Missing required environment variables");
  }

  // AI providers (15 points)
  maxScore += 15;
  if (status.services?.ai_providers?.configured_count > 0) {
    score += 15;
  } else {
    issues.push("No AI provider configured (content generation will fail)");
  }

  // CRON_SECRET (10 points)
  maxScore += 10;
  if (status.cron_jobs?.cron_secret_set) {
    score += 10;
  } else {
    issues.push("CRON_SECRET not set (cron jobs unprotected)");
  }

  // IndexNow (10 points)
  maxScore += 10;
  if (status.services?.indexnow?.status === "configured") {
    score += 10;
  } else {
    issues.push("INDEXNOW_KEY not set (SEO indexing disabled)");
  }

  // Analytics (10 points)
  maxScore += 10;
  if (status.services?.google_analytics?.client_tracking) {
    score += 5;
  } else {
    issues.push("Google Analytics not configured");
  }
  if (status.services?.google_search_console?.status === "configured") {
    score += 5;
  } else {
    issues.push("Google Search Console not configured");
  }

  // Error tracking (10 points)
  maxScore += 10;
  if (status.services?.sentry?.status === "configured") {
    score += 10;
  } else {
    issues.push("Sentry error tracking not configured");
  }

  const percentage = Math.round((score / maxScore) * 100);
  let grade: string;
  if (percentage >= 90) grade = "A";
  else if (percentage >= 75) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 40) grade = "D";
  else grade = "F";

  return {
    score: percentage,
    grade,
    max_possible: maxScore,
    earned: score,
    issues,
    production_ready:
      percentage >= 60 && status.database?.status === "connected",
  };
}
