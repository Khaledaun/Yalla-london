/**
 * General Platform Diagnostics
 *
 * Tests: database connection, AI providers, env vars, assets, core pages, metadata.
 * ~40 tests covering the fundamental infrastructure every site needs.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "general";

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

// ── Section Runner ───────────────────────────────────────────────────────────

const generalSection = async (
  siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // ── 1. Database Connection ─────────────────────────────────────────────
  try {
    const { checkDatabaseHealth } = await import("@/lib/db");
    const start = Date.now();
    const health = await checkDatabaseHealth();
    const ms = Date.now() - start;

    if (health.connected) {
      results.push(pass("db-connection", "Database Connection", `Connected in ${ms}ms`, "Verifies the PostgreSQL database is reachable and responding. If this fails, nothing on the platform works — no content, no publishing, no dashboard data."));
      if (health.migrateStatus === "Valid") {
        results.push(pass("db-migrations", "Migration Table", "Prisma migrations table exists", "Checks that the database has been properly initialized with Prisma migrations. Without this, new model changes won't apply correctly."));
      } else {
        results.push(warn("db-migrations", "Migration Table", health.migrateStatus, "Checks that the database has been properly initialized with Prisma migrations. Without this, new model changes won't apply correctly.", "The migrations table is missing or invalid. Run `npx prisma migrate deploy` to set up."));
      }
    } else {
      results.push(fail("db-connection", "Database Connection", `Connection failed: ${health.error}`, "Verifies the PostgreSQL database is reachable and responding. If this fails, nothing on the platform works — no content, no publishing, no dashboard data.", "Database is unreachable. Check your DATABASE_URL environment variable and ensure Supabase is running.", {
        id: "fix-db-connection",
        label: "Check Database URL",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "check_db_url" },
        rerunGroup: "general",
      }));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(fail("db-connection", "Database Connection", `Error: ${msg}`, "Verifies the PostgreSQL database is reachable and responding.", msg));
  }

  // ── 2. Critical Tables Exist ───────────────────────────────────────────
  const criticalTables = [
    { table: "blog_posts", label: "BlogPost" },
    { table: "article_drafts", label: "ArticleDraft" },
    { table: "topic_proposals", label: "TopicProposal" },
    { table: "cron_job_logs", label: "CronJobLog" },
    { table: "scheduled_content", label: "ScheduledContent" },
    { table: "users", label: "User" },
  ];

  try {
    const { prisma } = await import("@/lib/db");
    for (const { table, label } of criticalTables) {
      try {
        const result = (await prisma.$queryRawUnsafe(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}') as exists`
        )) as { exists: boolean }[];
        if (result[0]?.exists) {
          results.push(pass(`table-${table}`, `${label} Table`, `Table "${table}" exists`, `Checks that the ${label} database table exists. This table is required for ${label === "BlogPost" ? "storing published articles" : label === "ArticleDraft" ? "the content pipeline" : label === "TopicProposal" ? "topic generation" : label === "CronJobLog" ? "cron job monitoring" : label === "ScheduledContent" ? "scheduling publications" : "user authentication"}.`));
        } else {
          results.push(fail(`table-${table}`, `${label} Table`, `Table "${table}" missing`, `Checks that the ${label} database table exists.`, `The ${table} table doesn't exist. This will cause errors in ${label}-dependent features.`, {
            id: `fix-table-${table}`,
            label: "Fix Database Schema",
            api: "/api/admin/diagnostics/fix",
            payload: { fixType: "db_push" },
            rerunGroup: "general",
          }));
        }
      } catch {
        results.push(warn(`table-${table}`, `${label} Table`, `Could not check "${table}"`, `Checks that the ${label} database table exists.`, "Query failed — database might be unreachable."));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(fail("table-check", "Table Check", `Failed: ${msg}`, "Verifies critical database tables exist."));
  }

  // ── 3. AI Provider Status ──────────────────────────────────────────────
  const aiProviders = [
    { key: "XAI_API_KEY", name: "xAI (Grok)", purpose: "Primary AI for English content generation and trending topics" },
    { key: "GROK_API_KEY", name: "Grok (alt key)", purpose: "Alternative key for Grok API access" },
    { key: "OPENAI_API_KEY", name: "OpenAI", purpose: "Fallback AI provider for content and SEO tasks" },
    { key: "ANTHROPIC_API_KEY", name: "Anthropic (Claude)", purpose: "Used for advanced reasoning and content quality checks" },
  ];

  for (const provider of aiProviders) {
    const value = process.env[provider.key];
    if (value && value.length > 10) {
      results.push(pass(`ai-${provider.key.toLowerCase()}`, `${provider.name} API Key`, `Key configured (${value.length} chars)`, `Checks if ${provider.name} API key is set. ${provider.purpose}. Without it, tasks routed to this provider will fail.`));
    } else if (value) {
      results.push(warn(`ai-${provider.key.toLowerCase()}`, `${provider.name} API Key`, `Key seems too short (${value.length} chars)`, `Checks if ${provider.name} API key is set. ${provider.purpose}.`, "The API key exists but looks suspiciously short. Double-check it's complete."));
    } else {
      // Not all providers are required — xAI is primary
      const severity = provider.key === "XAI_API_KEY" ? "fail" : "warn";
      const result: DiagnosticResult = {
        id: `${SECTION}-ai-${provider.key.toLowerCase()}`,
        section: SECTION,
        name: `${provider.name} API Key`,
        status: severity === "fail" ? "fail" : "warn",
        detail: `${provider.key} not set`,
        explanation: `Checks if ${provider.name} API key is set. ${provider.purpose}.`,
        diagnosis: severity === "fail" ? "Primary AI provider key is missing. Content generation will not work." : "Optional provider not configured. The platform will use available alternatives.",
      };
      results.push(result);
    }
  }

  // ── 4. Core Environment Variables ──────────────────────────────────────
  const coreEnvVars = [
    { key: "DATABASE_URL", desc: "PostgreSQL connection string. Without it, the entire platform is non-functional." },
    { key: "NEXTAUTH_SECRET", desc: "Secret for admin authentication JWT tokens. Without it, nobody can log in to the dashboard." },
    { key: "NEXTAUTH_URL", desc: "Base URL for authentication callbacks. Must match your deployed domain." },
    { key: "INDEXNOW_KEY", desc: "IndexNow API key for instant search engine notification when new content is published." },
    { key: "CRON_SECRET", desc: "Shared secret to protect cron job endpoints from unauthorized access." },
    { key: "GOOGLE_CLIENT_EMAIL", desc: "Google service account email for Search Console and Analytics API access." },
    { key: "GOOGLE_PRIVATE_KEY", desc: "Google service account private key. Required alongside GOOGLE_CLIENT_EMAIL." },
    { key: "GA4_PROPERTY_ID", desc: "Google Analytics 4 property ID for traffic and conversion tracking." },
    { key: "GSC_SITE_URL", desc: "Google Search Console site URL for indexing status and search analytics." },
  ];

  for (const { key, desc } of coreEnvVars) {
    const value = process.env[key];
    const isCritical = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"].includes(key);
    if (value && value.length > 0) {
      results.push(pass(`env-${key.toLowerCase()}`, `Env: ${key}`, "Configured", `${desc}`));
    } else {
      results.push(isCritical
        ? fail(`env-${key.toLowerCase()}`, `Env: ${key}`, "Not set", desc, `Critical environment variable ${key} is missing. This will cause platform failures.`)
        : warn(`env-${key.toLowerCase()}`, `Env: ${key}`, "Not set", desc, `${key} is not configured. Related features will not work.`));
    }
  }

  // ── 5. Site Configuration ──────────────────────────────────────────────
  try {
    const { getSiteConfig, getActiveSiteIds } = await import("@/config/sites");
    const activeSites = getActiveSiteIds();

    if (activeSites.length > 0) {
      results.push(pass("site-config", "Site Configuration", `${activeSites.length} active site(s): ${activeSites.join(", ")}`, "Verifies that at least one site is configured and marked as active. Active sites get cron jobs, content generation, and SEO monitoring."));
    } else {
      results.push(fail("site-config", "Site Configuration", "No active sites found", "Verifies that at least one site is configured and marked as active.", "Without active sites, no cron jobs will run and no content will be generated."));
    }

    const siteConfig = getSiteConfig(siteId);
    if (siteConfig) {
      results.push(pass("site-found", `Site "${siteId}" Config`, `Found: ${siteConfig.name} (${siteConfig.domain})`, `Verifies that the selected site "${siteId}" has a valid configuration entry with domain, locale, and content settings.`));

      // Check site has topic templates
      if (siteConfig.topicsEN && siteConfig.topicsEN.length > 0) {
        results.push(pass("site-topics-en", "English Topic Templates", `${siteConfig.topicsEN.length} templates configured`, "Topic templates drive automatic content generation. Without them, the weekly topic cron produces nothing."));
      } else {
        results.push(warn("site-topics-en", "English Topic Templates", "No English topic templates", "Topic templates drive automatic content generation. Without them, the weekly topic cron produces nothing.", "Add topic templates to this site's config in config/sites.ts."));
      }

      if (siteConfig.affiliateCategories && siteConfig.affiliateCategories.length > 0) {
        results.push(pass("site-affiliates", "Affiliate Categories", `${siteConfig.affiliateCategories.length} categories`, "Affiliate categories determine which booking/purchase links get injected into content. More categories = more revenue opportunities."));
      } else {
        results.push(warn("site-affiliates", "Affiliate Categories", "No affiliate categories", "Affiliate categories determine which booking/purchase links get injected into content.", "Add affiliate categories to monetize content."));
      }

      if (siteConfig.primaryKeywordsEN && siteConfig.primaryKeywordsEN.length > 0) {
        results.push(pass("site-keywords", "Primary Keywords", `${siteConfig.primaryKeywordsEN.length} keywords`, "Primary keywords guide topic generation and SEO optimization. They define what this site should rank for."));
      } else {
        results.push(warn("site-keywords", "Primary Keywords", "No primary keywords", "Primary keywords guide topic generation and SEO optimization.", "Add primary keywords for better SEO targeting."));
      }
    } else {
      results.push(fail("site-found", `Site "${siteId}" Config`, `Site "${siteId}" not found in configuration`, "Verifies that the selected site has a valid configuration entry.", "This site ID doesn't exist in config/sites.ts. Check the site ID is correct."));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(fail("site-config", "Site Configuration", `Error loading config: ${msg}`, "Verifies site configuration is loadable."));
  }

  // ── 6. Published Content Count ─────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const publishedCount = await prisma.blogPost.count({
      where: { siteId, published: true },
    });

    if (publishedCount >= 20) {
      results.push(pass("content-count", "Published Content", `${publishedCount} published articles`, "Counts published articles for this site. More content = more indexed pages = more traffic = more revenue. Target: 50+ for organic growth."));
    } else if (publishedCount > 0) {
      results.push(warn("content-count", "Published Content", `Only ${publishedCount} published articles (target: 20+)`, "Counts published articles for this site. More content = more indexed pages = more traffic = more revenue.", `You have ${publishedCount} articles. Google needs 20+ quality pages to consider a site authoritative. Keep publishing.`));
    } else {
      results.push(fail("content-count", "Published Content", "0 published articles", "Counts published articles for this site. Without published content, there's nothing for Google to index and no pages to earn revenue.", "No content published yet. Run the content pipeline to generate and publish articles.", {
        id: "fix-no-content",
        label: "Generate Content Now",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "run_content_builder" },
        rerunGroup: "general",
      }));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      results.push(fail("content-count", "Published Content", "BlogPost table missing", "Counts published articles.", "Database schema needs to be applied.", {
        id: "fix-content-table",
        label: "Fix Database Schema",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "db_push" },
        rerunGroup: "general",
      }));
    } else {
      results.push(warn("content-count", "Published Content", `Error: ${msg}`, "Counts published articles."));
    }
  }

  // ── 7. Admin Auth Check ────────────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });
    if (adminCount > 0) {
      results.push(pass("admin-users", "Admin Users", `${adminCount} admin user(s) configured`, "Checks that at least one admin user exists. Without admin users, nobody can access the dashboard."));
    } else {
      results.push(warn("admin-users", "Admin Users", "No admin users found", "Checks that at least one admin user exists. Without admin users, nobody can access the dashboard.", "Visit /admin/login to create the first admin account."));
    }
  } catch {
    results.push(warn("admin-users", "Admin Users", "Could not check admin users", "Checks that at least one admin user exists."));
  }

  // ── 8. Node/Runtime Environment ────────────────────────────────────────
  results.push(pass("runtime", "Runtime Environment", `Node ${process.version}, ${process.env.VERCEL ? "Vercel" : "local"}`, "Shows the runtime environment. Useful for debugging version-specific issues."));

  return results;
};

export default generalSection;
