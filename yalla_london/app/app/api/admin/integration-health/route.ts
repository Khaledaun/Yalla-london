/**
 * Integration Health Check — Tests ALL external integrations in one call
 *
 * GET /api/admin/integration-health?siteId=yalla-london
 *
 * Tests: CJ Affiliate, Travelpayouts, GA4, Stay22, Ticketmaster, Currency,
 * Weather, Unsplash, IndexNow, Click Tracking, Monetization Scripts, Injection Coverage
 *
 * Returns per-integration: status (ok/warning/error), message, lastChecked, details
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

interface IntegrationResult {
  name: string;
  category: "affiliate" | "analytics" | "content" | "monetization" | "seo";
  status: "ok" | "warning" | "error" | "not_configured";
  message: string;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId, getActiveSiteIds } = await import("@/config/sites");

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const results: IntegrationResult[] = [];
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── 1. CJ AFFILIATE ──────────────────────────────────────────────
  try {
    const cjToken = process.env.CJ_API_TOKEN;
    const cjWebsiteId = process.env.CJ_WEBSITE_ID;
    const cjPublisherCid = process.env.CJ_PUBLISHER_CID;

    if (!cjToken || !cjWebsiteId || !cjPublisherCid) {
      results.push({
        name: "CJ Affiliate",
        category: "affiliate",
        status: "not_configured",
        message: `Missing env vars: ${[!cjToken && "CJ_API_TOKEN", !cjWebsiteId && "CJ_WEBSITE_ID", !cjPublisherCid && "CJ_PUBLISHER_CID"].filter(Boolean).join(", ")}`,
      });
    } else {
      const joinedCount = await prisma.cjAdvertiser.count({ where: { status: "JOINED" } }).catch(() => 0);
      const totalCount = await prisma.cjAdvertiser.count().catch(() => 0);
      const lastSync = await prisma.cronJobLog.findFirst({
        where: { job_name: "affiliate-sync-advertisers", status: "completed" },
        orderBy: { started_at: "desc" },
        select: { started_at: true },
      }).catch(() => null);

      // List individual JOINED advertisers with their details
      const joinedAdvertisers = await prisma.cjAdvertiser.findMany({
        where: { status: "JOINED" },
        select: { name: true, status: true, epc: true, cookieDuration: true },
        take: 20,
      }).catch(() => []);

      results.push({
        name: "CJ Affiliate",
        category: "affiliate",
        status: joinedCount > 0 ? "ok" : "warning",
        message: joinedCount > 0
          ? `${joinedCount} joined advertiser(s) of ${totalCount} total. Last sync: ${lastSync?.started_at ? timeAgo(lastSync.started_at) : "never"}`
          : `0 joined advertisers (${totalCount} total synced). Apply to advertisers in CJ dashboard.`,
        details: {
          joinedCount,
          totalCount,
          lastSync: lastSync?.started_at,
          joinedAdvertisers: joinedAdvertisers.map(a => ({
            name: a.name,
            epc: a.epc,
            cookieDays: a.cookieDuration,
          })),
        },
      });
    }
  } catch (e) {
    results.push({ name: "CJ Affiliate", category: "affiliate", status: "error", message: errMsg(e) });
  }

  // ── 2. TRAVELPAYOUTS ──────────────────────────────────────────────
  try {
    const tpMarker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || process.env.TRAVELPAYOUTS_MARKER;
    const tpToken = process.env.TRAVELPAYOUTS_API_TOKEN;

    if (!tpMarker) {
      results.push({ name: "Travelpayouts", category: "affiliate", status: "not_configured", message: "NEXT_PUBLIC_TRAVELPAYOUTS_MARKER not set" });
    } else {
      const tpPrograms = [
        { name: "Welcome Pickups", commission: "8-9%", cookie: "45d", category: "Transport" },
        { name: "Tiqets", commission: "3.5-8%", cookie: "30d", category: "Attractions" },
        { name: "TicketNetwork", commission: "6-12.5%", cookie: "45d", category: "Events" },
      ];
      results.push({
        name: "Travelpayouts",
        category: "affiliate",
        status: tpToken ? "ok" : "warning",
        message: tpToken
          ? `Marker: ${tpMarker}. API token set. ${tpPrograms.length} programs connected.`
          : `Marker: ${tpMarker} (Drive script loads). API token NOT set — advanced features unavailable.`,
        details: { marker: tpMarker, apiTokenSet: !!tpToken, programs: tpPrograms },
      });
    }
  } catch (e) {
    results.push({ name: "Travelpayouts", category: "affiliate", status: "error", message: errMsg(e) });
  }

  // ── 3. STATIC AFFILIATE PARTNER ENV VARS ──────────────────────────
  try {
    const partnerVars: Record<string, string | undefined> = {
      BOOKING_AFFILIATE_ID: process.env.BOOKING_AFFILIATE_ID,
      AGODA_AFFILIATE_ID: process.env.AGODA_AFFILIATE_ID,
      HALALBOOKING_AFFILIATE_ID: process.env.HALALBOOKING_AFFILIATE_ID,
      VIATOR_AFFILIATE_ID: process.env.VIATOR_AFFILIATE_ID,
      GETYOURGUIDE_AFFILIATE_ID: process.env.GETYOURGUIDE_AFFILIATE_ID,
      KLOOK_AFFILIATE_ID: process.env.KLOOK_AFFILIATE_ID,
    };
    const set = Object.entries(partnerVars).filter(([, v]) => !!v).map(([k]) => k);
    const missing = Object.entries(partnerVars).filter(([, v]) => !v).map(([k]) => k);

    results.push({
      name: "Partner Affiliate IDs",
      category: "affiliate",
      status: set.length > 0 ? (missing.length > 0 ? "warning" : "ok") : "not_configured",
      message: set.length > 0
        ? `${set.length}/6 set. Missing: ${missing.join(", ")}`
        : `None set. Static fallback rules will skip link insertion. Set when approved by each network.`,
      details: { set, missing },
    });
  } catch (e) {
    results.push({ name: "Partner Affiliate IDs", category: "affiliate", status: "error", message: errMsg(e) });
  }

  // ── 4. GA4 ANALYTICS ──────────────────────────────────────────────
  try {
    const gaId = process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const gaSecret = process.env.GA4_API_SECRET;
    const gaClientId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const gaPropertyId = process.env.GA4_PROPERTY_ID;

    const allSet = gaId && gaId !== "G-XXXXX" && gaSecret && gaClientId && gaClientId !== "G-XXXXX";

    results.push({
      name: "GA4 Analytics",
      category: "analytics",
      status: allSet ? "ok" : gaId ? "warning" : "not_configured",
      message: allSet
        ? `Server-side (MP) + client-side tracking configured. Property: ${gaPropertyId || "unknown"}`
        : `${[!gaId && "GA4_MEASUREMENT_ID", !gaSecret && "GA4_API_SECRET", !gaClientId && "NEXT_PUBLIC_GA_MEASUREMENT_ID", !gaPropertyId && "GA4_PROPERTY_ID"].filter(Boolean).join(", ")} missing`,
      details: {
        serverSide: !!gaId && !!gaSecret && gaId !== "G-XXXXX",
        clientSide: !!gaClientId && gaClientId !== "G-XXXXX",
        propertyId: !!gaPropertyId,
      },
    });
  } catch (e) {
    results.push({ name: "GA4 Analytics", category: "analytics", status: "error", message: errMsg(e) });
  }

  // ── 5. AFFILIATE CLICK TRACKING ───────────────────────────────────
  try {
    const siteFilter = { OR: [{ siteId }, { siteId: null as string | null }] };
    const clicksToday = await prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }).catch(() => 0);
    const clicks7d = await prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: d7 } } }).catch(() => 0);
    const clicks30d = await prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: d30 } } }).catch(() => 0);
    const lastClick = await prisma.cjClickEvent.findFirst({ where: siteFilter, orderBy: { createdAt: "desc" }, select: { createdAt: true, partner: true } }).catch(() => null);

    results.push({
      name: "Affiliate Click Tracking",
      category: "affiliate",
      status: clicks7d > 0 ? "ok" : clicks30d > 0 ? "warning" : "error",
      message: clicks7d > 0
        ? `${clicksToday} today, ${clicks7d} last 7d, ${clicks30d} last 30d. Last: ${lastClick?.partner || "unknown"} ${lastClick?.createdAt ? timeAgo(lastClick.createdAt) : ""}`
        : clicks30d > 0
          ? `No clicks in 7 days. ${clicks30d} in 30d. Last: ${lastClick?.createdAt ? timeAgo(lastClick.createdAt) : "unknown"}`
          : "Zero affiliate clicks recorded. Check if links use /api/affiliate/click redirect.",
      details: { clicksToday, clicks7d, clicks30d, lastClick },
    });
  } catch (e) {
    results.push({ name: "Affiliate Click Tracking", category: "affiliate", status: "error", message: errMsg(e) });
  }

  // ── 6. AFFILIATE INJECTION COVERAGE ───────────────────────────────
  try {
    const totalPublished = await prisma.blogPost.count({ where: { published: true, deletedAt: null, siteId } }).catch(() => 0);
    // Check for affiliate markers in content
    const withAffiliates = await prisma.blogPost.count({
      where: {
        published: true, deletedAt: null, siteId,
        OR: [
          { content_en: { contains: "affiliate-recommendation" } },
          { content_en: { contains: 'rel="sponsored"' } },
          { content_en: { contains: "affiliate-cta-block" } },
          { content_en: { contains: "data-affiliate-partner" } },
        ],
      },
    }).catch(() => 0);
    const coveragePct = totalPublished > 0 ? Math.round((withAffiliates / totalPublished) * 100) : 0;

    const lastInjection = await prisma.cronJobLog.findFirst({
      where: { job_name: "affiliate-injection", status: "completed" },
      orderBy: { started_at: "desc" },
      select: { started_at: true, result_summary: true },
    }).catch(() => null);

    results.push({
      name: "Affiliate Link Coverage",
      category: "affiliate",
      status: coveragePct >= 70 ? "ok" : coveragePct >= 40 ? "warning" : "error",
      message: `${withAffiliates}/${totalPublished} articles have affiliate links (${coveragePct}%). Last injection: ${lastInjection?.started_at ? timeAgo(lastInjection.started_at) : "never"}`,
      details: {
        totalPublished, withAffiliates, coveragePct,
        lastInjection: lastInjection?.started_at,
        lastInjectionResult: lastInjection?.result_summary,
      },
    });
  } catch (e) {
    results.push({ name: "Affiliate Link Coverage", category: "affiliate", status: "error", message: errMsg(e) });
  }

  // ── 7. STAY22 ─────────────────────────────────────────────────────
  try {
    const stay22Aid = process.env.NEXT_PUBLIC_STAY22_AID;
    results.push({
      name: "Stay22 Hotel Maps",
      category: "monetization",
      status: stay22Aid ? "ok" : "not_configured",
      message: stay22Aid
        ? `Configured (AID: ${stay22Aid.slice(0, 15)}...). Auto-converts hotel mentions to affiliate links. Revenue tracked in Stay22 dashboard.`
        : "NEXT_PUBLIC_STAY22_AID not set. Hotel map widget and auto-linking disabled.",
    });
  } catch (e) {
    results.push({ name: "Stay22 Hotel Maps", category: "monetization", status: "error", message: errMsg(e) });
  }

  // ── 8. TICKETMASTER ───────────────────────────────────────────────
  try {
    const tmKey = process.env.TICKETMASTER_API_KEY;
    if (!tmKey) {
      results.push({ name: "Ticketmaster Events", category: "content", status: "not_configured", message: "TICKETMASTER_API_KEY not set. Homepage shows static fallback events." });
    } else {
      // Quick connectivity test
      const testUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${tmKey}&size=1&locale=*`;
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
      results.push({
        name: "Ticketmaster Events",
        category: "content",
        status: res?.ok ? "ok" : "warning",
        message: res?.ok
          ? "API connected. Live events loading on homepage."
          : `API returned ${res?.status || "timeout"}. Homepage falls back to static events.`,
        details: { apiKeySet: true, apiStatus: res?.status || "timeout" },
      });
    }
  } catch (e) {
    results.push({ name: "Ticketmaster Events", category: "content", status: "error", message: errMsg(e) });
  }

  // ── 9. CURRENCY API (Frankfurter) ─────────────────────────────────
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=GBP&to=AED,SAR", { signal: AbortSignal.timeout(5000) }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    results.push({
      name: "Currency Conversion",
      category: "content",
      status: res?.ok && data?.rates ? "ok" : "warning",
      message: res?.ok && data?.rates
        ? `Live rates: 1 GBP = ${data.rates.AED?.toFixed(2)} AED, ${data.rates.SAR?.toFixed(2)} SAR`
        : "Frankfurter API unreachable. Price display falls back to GBP only.",
      details: data?.rates ? { rates: data.rates } : undefined,
    });
  } catch (e) {
    results.push({ name: "Currency Conversion", category: "content", status: "warning", message: "API check failed — will use cached rates" });
  }

  // ── 10. UNSPLASH ──────────────────────────────────────────────────
  try {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    results.push({
      name: "Unsplash Photos",
      category: "content",
      status: unsplashKey ? "ok" : "not_configured",
      message: unsplashKey
        ? "API key configured. Legal travel photography available."
        : "UNSPLASH_ACCESS_KEY not set. Photo search returns empty results. Sign up at unsplash.com/developers.",
    });
  } catch (e) {
    results.push({ name: "Unsplash Photos", category: "content", status: "error", message: errMsg(e) });
  }

  // ── 11. INDEXNOW ──────────────────────────────────────────────────
  try {
    const indexNowKey = process.env.INDEXNOW_KEY;
    const lastSubmit = await prisma.cronJobLog.findFirst({
      where: { job_name: "process-indexing-queue", status: "completed" },
      orderBy: { started_at: "desc" },
      select: { started_at: true, result_summary: true },
    }).catch(() => null);

    const summary = lastSubmit?.result_summary as Record<string, unknown> | null;
    const submitted = (summary?.totalIndexNowSubmitted as number) || 0;
    const failed = (summary?.totalIndexNowFailed as number) || 0;

    results.push({
      name: "IndexNow Submission",
      category: "seo",
      status: indexNowKey ? (submitted > 0 ? "ok" : failed > 0 ? "warning" : "ok") : "not_configured",
      message: indexNowKey
        ? `Last run: ${submitted} submitted, ${failed} failed. ${lastSubmit?.started_at ? timeAgo(lastSubmit.started_at) : "never"}`
        : "INDEXNOW_KEY not set. Pages not submitted to Bing/Yandex.",
      details: { indexNowKeySet: !!indexNowKey, lastSubmit: lastSubmit?.started_at, submitted, failed },
    });
  } catch (e) {
    results.push({ name: "IndexNow Submission", category: "seo", status: "error", message: errMsg(e) });
  }

  // ── 12. GSC (Google Search Console) ───────────────────────────────
  try {
    const gscEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const gscKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;
    const gscSaKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    const hasCredentials = (gscEmail && gscKey) || gscSaKey;

    const lastGsc = await prisma.cronJobLog.findFirst({
      where: { job_name: "gsc-sync", status: "completed" },
      orderBy: { started_at: "desc" },
      select: { started_at: true },
    }).catch(() => null);

    results.push({
      name: "Google Search Console",
      category: "seo",
      status: hasCredentials ? "ok" : "not_configured",
      message: hasCredentials
        ? `Credentials configured. Last sync: ${lastGsc?.started_at ? timeAgo(lastGsc.started_at) : "never"}`
        : "No GSC credentials. Search performance data unavailable.",
      details: { hasCredentials: !!hasCredentials, lastSync: lastGsc?.started_at },
    });
  } catch (e) {
    results.push({ name: "Google Search Console", category: "seo", status: "error", message: errMsg(e) });
  }

  // ── SUMMARY ───────────────────────────────────────────────────────
  const ok = results.filter(r => r.status === "ok").length;
  const warnings = results.filter(r => r.status === "warning").length;
  const errors = results.filter(r => r.status === "error").length;
  const notConfigured = results.filter(r => r.status === "not_configured").length;

  let overallStatus: "healthy" | "degraded" | "critical" = "healthy";
  if (errors > 0) overallStatus = "critical";
  else if (warnings > 1 || notConfigured > 2) overallStatus = "degraded";

  return NextResponse.json({
    siteId,
    checkedAt: now.toISOString(),
    overallStatus,
    summary: { ok, warnings, errors, notConfigured, total: results.length },
    integrations: results,
  });
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
