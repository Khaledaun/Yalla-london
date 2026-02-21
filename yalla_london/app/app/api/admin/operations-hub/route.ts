export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Operations Hub API
 * GET /api/admin/operations-hub
 *
 * Returns a comprehensive checklist of everything configured vs missing
 * across the entire platform ("the engine") and per-site.
 *
 * Categories:
 *  1. Infrastructure (env vars, DB, auth)
 *  2. Revenue (Stripe, products, email)
 *  3. Content & SEO (GA4, GSC, IndexNow, AI)
 *  4. Distribution (social, email marketing)
 *  5. Per-site health checks
 *  6. MCP integrations (Mercury, Stripe)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const startTime = Date.now();

  // ── 1. Infrastructure ──────────────────────────────────────
  const infrastructure = [
    {
      id: "database",
      label: "Database Connection",
      description: "PostgreSQL via Prisma — stores all content, users, products",
      status: await checkDbConnection(),
      category: "infrastructure",
      action: null,
    },
    {
      id: "nextauth_secret",
      label: "Auth Secret (NEXTAUTH_SECRET)",
      description: "Session encryption key for admin authentication",
      status: envStatus("NEXTAUTH_SECRET"),
      category: "infrastructure",
      action: { type: "env", key: "NEXTAUTH_SECRET", hint: "Generate with: openssl rand -base64 32" },
    },
    {
      id: "nextauth_url",
      label: "Auth URL (NEXTAUTH_URL)",
      description: "Base URL for authentication callbacks",
      status: envStatus("NEXTAUTH_URL"),
      category: "infrastructure",
      action: { type: "env", key: "NEXTAUTH_URL", hint: "Set to your domain (e.g., https://www.yoursite.com)" },
    },
    {
      id: "site_url",
      label: "Site URL (NEXT_PUBLIC_SITE_URL)",
      description: "Public site URL — used in emails, download links, Open Graph",
      status: envStatus("NEXT_PUBLIC_SITE_URL"),
      category: "infrastructure",
      action: { type: "env", key: "NEXT_PUBLIC_SITE_URL", hint: "Your public domain (e.g., https://www.yoursite.com)" },
    },
    {
      id: "cron_secret",
      label: "Cron Secret (CRON_SECRET)",
      description: "Protects automated cron endpoints from unauthorized access",
      status: envStatus("CRON_SECRET"),
      category: "infrastructure",
      action: { type: "env", key: "CRON_SECRET", hint: "Generate with: openssl rand -hex 32" },
    },
    {
      id: "supabase",
      label: "Supabase Connection",
      description: "Real-time subscriptions and file storage",
      status: envStatus("NEXT_PUBLIC_SUPABASE_URL") && envStatus("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "configured" : "missing",
      category: "infrastructure",
      action: { type: "env", key: "NEXT_PUBLIC_SUPABASE_URL", hint: "From Supabase dashboard → Settings → API" },
    },
  ];

  // ── 2. Revenue ─────────────────────────────────────────────
  const revenue = [
    {
      id: "stripe_secret",
      label: "Stripe Secret Key",
      description: "Enables payment processing for digital products",
      status: envStatus("STRIPE_SECRET_KEY"),
      category: "revenue",
      action: { type: "env", key: "STRIPE_SECRET_KEY", hint: "Stripe Dashboard → Developers → API Keys", url: "https://dashboard.stripe.com/apikeys" },
    },
    {
      id: "stripe_publishable",
      label: "Stripe Publishable Key",
      description: "Client-side Stripe.js initialization",
      status: envStatus("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      category: "revenue",
      action: { type: "env", key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", hint: "From same Stripe API Keys page", url: "https://dashboard.stripe.com/apikeys" },
    },
    {
      id: "stripe_webhook",
      label: "Stripe Webhook Secret",
      description: "Verifies webhook signatures for purchase completion",
      status: envStatus("STRIPE_WEBHOOK_SECRET"),
      category: "revenue",
      action: { type: "env", key: "STRIPE_WEBHOOK_SECRET", hint: "Stripe → Developers → Webhooks → Add endpoint: /api/webhooks/stripe", url: "https://dashboard.stripe.com/webhooks" },
    },
    {
      id: "email_provider",
      label: "Email Provider",
      description: "Sends purchase confirmations, newsletters, notifications",
      status: envStatus("EMAIL_PROVIDER"),
      category: "revenue",
      action: { type: "env", key: "EMAIL_PROVIDER", hint: "Set to 'resend' or 'sendgrid'" },
    },
    {
      id: "email_api_key",
      label: "Email API Key",
      description: "Authentication for your email provider",
      status: envStatus("RESEND_API_KEY") || envStatus("SENDGRID_API_KEY") ? "configured" : "missing",
      category: "revenue",
      action: { type: "env", key: "RESEND_API_KEY", hint: "Get from resend.com/api-keys", url: "https://resend.com/api-keys" },
    },
    {
      id: "digital_products",
      label: "Digital Products in Database",
      description: "At least 1 active product needed to start selling",
      status: await checkDigitalProducts(),
      category: "revenue",
      action: { type: "link", href: "/admin/shop", label: "Manage Products" },
    },
  ];

  // ── 3. Content & SEO ───────────────────────────────────────
  const contentSeo = [
    {
      id: "ai_anthropic",
      label: "AI Provider — Claude (Anthropic)",
      description: "Primary AI for content generation",
      status: envStatus("ANTHROPIC_API_KEY"),
      category: "content_seo",
      action: { type: "env", key: "ANTHROPIC_API_KEY", hint: "Get from console.anthropic.com", url: "https://console.anthropic.com/" },
    },
    {
      id: "ai_openai",
      label: "AI Provider — OpenAI (Backup)",
      description: "Backup AI and specialized tasks",
      status: envStatus("OPENAI_API_KEY"),
      category: "content_seo",
      action: { type: "env", key: "OPENAI_API_KEY", hint: "Get from platform.openai.com", url: "https://platform.openai.com/api-keys" },
    },
    {
      id: "ga4",
      label: "Google Analytics (GA4)",
      description: "Traffic tracking and conversion analytics",
      status: envStatus("NEXT_PUBLIC_GA_ID") || envStatus("GA4_MEASUREMENT_ID") || envStatus("NEXT_PUBLIC_GOOGLE_ANALYTICS_ID") ? "configured" : "missing",
      category: "content_seo",
      action: { type: "env", key: "NEXT_PUBLIC_GA_ID", hint: "GA4 Measurement ID (G-XXXXXXXXXX)", url: "https://analytics.google.com/" },
    },
    {
      id: "gsc",
      label: "Google Search Console",
      description: "Search performance, indexing status, keyword data",
      status: envStatus("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL") && envStatus("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY") ? "configured" : "missing",
      category: "content_seo",
      action: { type: "env", key: "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL", hint: "Service account email from GCP" },
    },
    {
      id: "indexnow",
      label: "IndexNow Key",
      description: "Instant indexing notifications to Bing, Yandex, etc.",
      status: envStatus("INDEXNOW_KEY"),
      category: "content_seo",
      action: { type: "env", key: "INDEXNOW_KEY", hint: "Generate a random string and host the key file at /{key}.txt" },
    },
    {
      id: "serpapi",
      label: "SerpAPI / Trends",
      description: "Keyword research and trend monitoring",
      status: envStatus("SERPAPI_API_KEY"),
      category: "content_seo",
      action: { type: "env", key: "SERPAPI_API_KEY", hint: "Get from serpapi.com", url: "https://serpapi.com/" },
    },
    {
      id: "sentry",
      label: "Sentry Error Tracking",
      description: "Captures runtime errors in production",
      status: envStatus("SENTRY_DSN") || envStatus("NEXT_PUBLIC_SENTRY_DSN") ? "configured" : "missing",
      category: "content_seo",
      action: { type: "env", key: "SENTRY_DSN", hint: "Get from sentry.io project settings", url: "https://sentry.io/" },
    },
  ];

  // ── 4. Distribution ────────────────────────────────────────
  const distribution = [
    {
      id: "mailchimp",
      label: "Mailchimp",
      description: "Email marketing automation and subscriber management",
      status: envStatus("MAILCHIMP_API_KEY"),
      category: "distribution",
      action: { type: "env", key: "MAILCHIMP_API_KEY", hint: "Mailchimp → Account → Extras → API Keys" },
    },
    {
      id: "convertkit",
      label: "ConvertKit",
      description: "Creator-focused email sequences and automations",
      status: envStatus("CONVERTKIT_API_KEY"),
      category: "distribution",
      action: { type: "env", key: "CONVERTKIT_API_KEY", hint: "ConvertKit → Account Settings → Advanced" },
    },
    {
      id: "slack_webhook",
      label: "Slack Notifications",
      description: "Receive alerts for sales, errors, and automation events",
      status: envStatus("SLACK_WEBHOOK_URL"),
      category: "distribution",
      action: { type: "env", key: "SLACK_WEBHOOK_URL", hint: "Slack → Apps → Incoming Webhooks → Add" },
    },
    {
      id: "aws_s3",
      label: "AWS S3 / R2 Storage",
      description: "File storage for PDF products and media",
      status: envStatus("AWS_ACCESS_KEY_ID") && envStatus("AWS_SECRET_ACCESS_KEY") ? "configured" : "missing",
      category: "distribution",
      action: { type: "env", key: "AWS_ACCESS_KEY_ID", hint: "AWS IAM → Users → Security Credentials" },
    },
  ];

  // ── 5. MCP Integrations ────────────────────────────────────
  const mcpIntegrations = [
    {
      id: "mcp_stripe",
      label: "Stripe MCP",
      description: "Query Stripe data, manage customers, refunds, and disputes directly from the dashboard",
      status: envStatus("STRIPE_SECRET_KEY") ? "configured" : "missing",
      category: "mcp",
      capabilities: [
        "View recent payments and charges",
        "Look up customer details",
        "Process refunds",
        "Check subscription status",
        "View payout schedule",
      ],
      action: { type: "link", href: "/admin/operations/mcp/stripe", label: "Open Stripe MCP" },
    },
    {
      id: "mcp_mercury",
      label: "Mercury Bank MCP",
      description: "View bank balances, transactions, and financial health from the dashboard",
      status: envStatus("MERCURY_API_KEY") || envStatus("MERCURY_API_TOKEN") ? "configured" : "missing",
      category: "mcp",
      capabilities: [
        "View account balances",
        "List recent transactions",
        "Check pending payments",
        "Export financial data",
        "Monitor cash flow",
      ],
      action: { type: "env", key: "MERCURY_API_KEY", hint: "Mercury → Settings → API → Generate token", url: "https://app.mercury.com/" },
    },
  ];

  // ── 6. Per-site health ─────────────────────────────────────
  const siteHealth = await checkSiteHealth();

  // ── 7. Engine tasks (actionable to-do list) ────────────────
  const allChecks = [
    ...infrastructure,
    ...revenue,
    ...contentSeo,
    ...distribution,
    ...mcpIntegrations,
  ];

  const configured = allChecks.filter((c) => c.status === "configured").length;
  const total = allChecks.length;
  const percentage = Math.round((configured / total) * 100);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    summary: {
      configured,
      total,
      percentage,
      grade:
        percentage >= 90
          ? "A"
          : percentage >= 75
            ? "B"
            : percentage >= 60
              ? "C"
              : percentage >= 40
                ? "D"
                : "F",
    },
    sections: {
      infrastructure,
      revenue,
      content_seo: contentSeo,
      distribution,
      mcp: mcpIntegrations,
    },
    site_health: siteHealth,
  });
}

// ─── Helpers ──────────────────────────────────────────────────

function envStatus(key: string): "configured" | "missing" {
  return process.env[key] ? "configured" : "missing";
}

async function checkDbConnection(): Promise<"configured" | "missing"> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    return "configured";
  } catch {
    return "missing";
  }
}

async function checkDigitalProducts(): Promise<"configured" | "missing"> {
  try {
    const { prisma } = await import("@/lib/db");
    const count = await prisma.digitalProduct.count({
      where: { is_active: true },
    });
    return count > 0 ? "configured" : "missing";
  } catch {
    return "missing";
  }
}

async function checkSiteHealth() {
  try {
    const { prisma } = await import("@/lib/db");
    const sites = await prisma.site.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        locale: true,
        is_active: true,
        primary_color: true,
        logo_url: true,
      },
    });

    const siteChecks = await Promise.all(
      sites.map(async (site) => {
        const [postCount, productCount, leadCount] = await Promise.all([
          prisma.blogPost.count({ where: { site_id: site.id } }).catch(() => 0),
          prisma.digitalProduct.count({ where: { site_id: site.id, is_active: true } }).catch(() => 0),
          prisma.lead.count({ where: { site_id: site.id } }).catch(() => 0),
        ]);

        const checks = [
          { id: "has_content", label: "Has published content", ok: postCount > 0, value: `${postCount} posts` },
          { id: "has_products", label: "Has active products", ok: productCount > 0, value: `${productCount} products` },
          { id: "has_logo", label: "Logo configured", ok: !!site.logo_url, value: site.logo_url ? "Set" : "Missing" },
          { id: "has_domain", label: "Domain configured", ok: !!site.domain, value: site.domain || "Not set" },
          { id: "has_leads", label: "Capturing leads", ok: leadCount > 0, value: `${leadCount} leads` },
          { id: "has_colors", label: "Brand colors set", ok: !!site.primary_color, value: site.primary_color || "Default" },
        ];

        const passed = checks.filter((c) => c.ok).length;

        return {
          site: {
            id: site.id,
            name: site.name,
            slug: site.slug,
            domain: site.domain,
            locale: site.locale,
          },
          checks,
          score: Math.round((passed / checks.length) * 100),
          passed,
          total: checks.length,
        };
      }),
    );

    return siteChecks;
  } catch {
    return [];
  }
}
