/**
 * Monday Action Items — carryover items from the prior week that need
 * Khaled's attention or are worth tracking on a weekly cadence.
 *
 * Surfaces 4 categories born from the May 17 2026 "Close the Loop" sprint:
 *
 *   1. Cannibalization clusters needing canonicalization
 *      → /admin/cockpit/canonicalize tap-to-resolve. Not auto-applied
 *        because it unpublishes losers (destructive — needs human confirm).
 *
 *   2. Top-of-page CTA hero conversions (7-day SID-tagged click counts)
 *      → tells Khaled if the new /hotels /experiences /recommendations
 *        hero CTAs are actually being clicked.
 *
 *   3. Dirty title backlog (count of articles still matching the CTR-killer
 *        sanitizer patterns)
 *      → drains automatically via content-auto-fix-lite Section 6 over
 *        5-6 runs. This metric reports remaining backlog so Khaled can
 *        see the line trending to zero.
 *
 *   4. Sitemap completeness check
 *      → flags missing high-value static pages (/destinations, /itineraries,
 *        /hotels, /experiences, /recommendations). These belong in the
 *        sitemap so Google crawls them.
 *
 * Called from /api/cron/weekly-rescue-campaign (Mondays 09:00 UTC) and
 * surfaces in the result summary + email body.
 *
 * Pure read-only — does NOT mutate anything. The cron itself decides
 * whether to act on the report (e.g., trigger content-auto-fix-lite to
 * speed up the title backlog drain).
 */

import { hasTitleArtifacts } from "@/lib/content-pipeline/title-sanitizer";

export interface MondayActionItem {
  id: string;
  category: "manual_action" | "metric_watch" | "auto_draining" | "code_change_needed";
  severity: "info" | "warning" | "critical";
  title: string;
  /** Plain-English explanation for Khaled */
  description: string;
  /** Optional path Khaled should visit (rendered as link in email) */
  actionUrl?: string;
  /** Key metric for this item (e.g., cluster count, click count, backlog size) */
  metric?: { label: string; value: number | string };
}

export interface MondayActionReport {
  siteId: string;
  generatedAt: string;
  totalItems: number;
  itemsByCategory: Record<string, number>;
  items: MondayActionItem[];
}

const TITLE_BACKLOG_SCAN_LIMIT = 500;
const HERO_CTA_LOOKBACK_DAYS = 7;

/**
 * Per-site high-value paths that MUST be in the sitemap. Yacht-charter
 * paths (/destinations, /itineraries) are intentionally excluded from
 * blog sites — they would render a "Coming Soon" empty state (soft 404)
 * if listed (see app/sitemap.ts:112-114 comment).
 */
const SITEMAP_REQUIRED_PATHS_BY_SITE: Record<string, string[]> = {
  "yalla-london": ["/hotels", "/experiences", "/recommendations", "/halal-restaurants-london", "/london-with-kids"],
  "zenitha-yachts-med": ["/destinations", "/itineraries", "/yachts", "/inquiry", "/charter-planner"],
  arabaldives: ["/hotels", "/experiences"],
  "french-riviera": ["/hotels", "/experiences"],
  istanbul: ["/hotels", "/experiences"],
  thailand: ["/hotels", "/experiences"],
};

/**
 * Gather all 4 carryover action items for a given site.
 *
 * Each helper is wrapped in try/catch so one DB hiccup doesn't blank out
 * the whole report. Failures degrade gracefully to an "info" item that
 * tells Khaled the metric couldn't be measured (better than silence).
 */
export async function getMondayActionItems(siteId: string): Promise<MondayActionReport> {
  const items: MondayActionItem[] = [];

  // ── 1. Cannibalization clusters ───────────────────────────────────────
  try {
    const { findCannibalizationGroups } = await import("@/lib/seo/cannibalization-resolver");
    const groups = await findCannibalizationGroups(siteId);
    if (groups.length > 0) {
      const totalDuplicates = groups.reduce((n, g) => n + g.duplicates.length, 0);
      const highOverlap = groups.filter((g) => g.duplicates.some((d) => d.overlapPct >= 70)).length;
      items.push({
        id: "cannibalization-clusters",
        category: "manual_action",
        severity: highOverlap >= 5 ? "critical" : highOverlap >= 1 ? "warning" : "info",
        title: `${groups.length} duplicate-title cluster(s) — ${totalDuplicates} article(s) competing`,
        description:
          `${groups.length} group(s) of articles target the same keywords (${totalDuplicates} losers total). ` +
          `${highOverlap} cluster(s) are ≥70% overlap and safe to bulk-canonicalize. ` +
          `Open the cockpit, tap "Canonicalize all (≥70% overlap)" to consolidate authority on each winner. ` +
          `Manual confirmation required because it unpublishes losers.`,
        actionUrl: `/admin/cockpit/canonicalize?siteId=${encodeURIComponent(siteId)}`,
        metric: { label: "clusters", value: groups.length },
      });
    }
  } catch (err) {
    items.push({
      id: "cannibalization-clusters",
      category: "manual_action",
      severity: "info",
      title: "Cannibalization scan failed",
      description: `Could not scan for duplicate clusters: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── 2. Hero CTA conversions (last 7 days, SID matching *-hero) ────────
  try {
    const { prisma } = await import("@/lib/db");
    const since = new Date(Date.now() - HERO_CTA_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    // SID format: {siteId}_{pageSlug}-hero (see TopCategoryCta.tsx).
    // Both `siteId` field (post-March 11 migration) AND legacy null siteId
    // with sessionId-encoded SID are queried (rule #74 pattern).
    const heroClicks = await prisma.cjClickEvent.count({
      where: {
        OR: [
          { siteId, sessionId: { contains: "-hero" } },
          { siteId: null, sessionId: { startsWith: `${siteId}_`, contains: "-hero" } },
        ],
        createdAt: { gte: since },
      },
    });
    items.push({
      id: "hero-cta-conversions",
      category: "metric_watch",
      severity: heroClicks === 0 ? "warning" : "info",
      title: `Top-of-page CTA hero clicks (7d): ${heroClicks}`,
      description:
        heroClicks === 0
          ? `Zero clicks on the /hotels /experiences /recommendations hero CTAs in 7 days. Check that pages have traffic — if yes, the hero design may need iteration.`
          : `${heroClicks} click(s) tracked through hero SIDs in the last 7 days. Compare to per-card click count in Affiliate HQ to see if hero is competing with or stealing from card clicks.`,
      actionUrl: `/admin/affiliate-hq?siteId=${encodeURIComponent(siteId)}&tab=clicks`,
      metric: { label: "clicks/7d", value: heroClicks },
    });
  } catch (err) {
    items.push({
      id: "hero-cta-conversions",
      category: "metric_watch",
      severity: "info",
      title: "Hero CTA click count failed",
      description: `Could not query CjClickEvent: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── 3. Dirty title backlog (draining via content-auto-fix-lite) ───────
  try {
    const { prisma } = await import("@/lib/db");
    // Pull a bounded sample and count via in-process regex test (no SQL
    // equivalent for the 6 different artifact patterns).
    const sample = await prisma.blogPost.findMany({
      where: { siteId, deletedAt: null, published: true },
      select: { id: true, title_en: true, meta_title_en: true },
      take: TITLE_BACKLOG_SCAN_LIMIT,
      orderBy: { updated_at: "asc" }, // oldest first — those least likely to have been auto-fixed
    });
    let dirtyTitleCount = 0;
    let dirtyMetaTitleCount = 0;
    for (const p of sample) {
      if (hasTitleArtifacts(p.title_en)) dirtyTitleCount++;
      if (p.meta_title_en && hasTitleArtifacts(p.meta_title_en)) dirtyMetaTitleCount++;
    }
    const total = dirtyTitleCount + dirtyMetaTitleCount;
    items.push({
      id: "dirty-title-backlog",
      category: "auto_draining",
      severity: total >= 30 ? "warning" : "info",
      title: `Dirty title backlog: ${total} (scanned ${sample.length} oldest articles)`,
      description:
        total === 0
          ? `Zero CTR-killer title patterns detected in the ${sample.length} oldest articles. Sanitizer caught up.`
          : `${dirtyTitleCount} title_en + ${dirtyMetaTitleCount} meta_title_en still contain CTR-killer patterns ` +
            `(trailing pipe, empty parens, year suffix, "for arabs", duplicated subtitle). ` +
            `Drains automatically via content-auto-fix-lite Section 6 (200/run × 4 runs/day). ` +
            `Expected drain time: ${Math.ceil(total / 200)} run(s) ≈ ${Math.ceil(total / 200 / 4)} day(s).`,
      metric: { label: "dirty/sampled", value: `${total}/${sample.length}` },
    });
  } catch (err) {
    items.push({
      id: "dirty-title-backlog",
      category: "auto_draining",
      severity: "info",
      title: "Title backlog scan failed",
      description: `Could not scan BlogPost titles: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── 4. Sitemap completeness for high-value static pages ───────────────
  // Reads the sitemap cache DIRECTLY instead of HTTP-fetching the live URL.
  // The HTTP approach failed in production because Vercel serverless
  // functions hitting their own domain can timeout (self-fetch through the
  // edge network adds latency + can deadlock the request pool).
  // The cache is updated by content-auto-fix-lite Section 8 every 4h so
  // it's always fresh enough for a weekly audit.
  try {
    const required = SITEMAP_REQUIRED_PATHS_BY_SITE[siteId] || ["/hotels", "/experiences"];
    const { getCachedSitemap } = await import("@/lib/sitemap-cache");
    const cached = await getCachedSitemap(siteId);

    if (!cached || cached.entries.length === 0) {
      items.push({
        id: "sitemap-completeness",
        category: "code_change_needed",
        severity: "warning",
        title: "Sitemap cache empty",
        description:
          "No cached sitemap found for this site. The cache is refreshed every 4h by content-auto-fix-lite. " +
          "If this persists, the cache regeneration cron may be failing.",
        actionUrl: `/admin/cockpit/crons`,
      });
    } else {
      // Build a Set of path-only URLs from the cache (strip domain) for cheap lookup.
      const sitemapPaths = new Set<string>();
      for (const entry of cached.entries) {
        try {
          const u = new URL(entry.url);
          sitemapPaths.add(u.pathname.replace(/\/$/, "") || "/");
        } catch {
          /* malformed URL — skip */
        }
      }
      const missing = required.filter((p) => !sitemapPaths.has(p));
      if (missing.length > 0) {
        items.push({
          id: "sitemap-completeness",
          category: "code_change_needed",
          severity: missing.length >= 3 ? "warning" : "info",
          title: `Sitemap missing ${missing.length} high-value page(s)`,
          description:
            `These high-priority pages are not in the sitemap: ${missing.join(", ")}. ` +
            `Google can't crawl pages it doesn't know about. Fix requires adding entries to ` +
            `app/sitemap.ts (or DB-backed sitemap source). This is a code change — surface to next dev session.`,
          actionUrl: `/admin/cockpit/rescue-plan?siteId=${encodeURIComponent(siteId)}`,
          metric: { label: "missing", value: missing.length },
        });
      }
    }
  } catch (err) {
    items.push({
      id: "sitemap-completeness",
      category: "code_change_needed",
      severity: "info",
      title: "Sitemap check failed",
      description: `Could not check sitemap cache: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── Build summary ─────────────────────────────────────────────────────
  const itemsByCategory: Record<string, number> = {};
  for (const it of items) {
    itemsByCategory[it.category] = (itemsByCategory[it.category] || 0) + 1;
  }

  return {
    siteId,
    generatedAt: new Date().toISOString(),
    totalItems: items.length,
    itemsByCategory,
    items,
  };
}

/**
 * Build HTML body for the Monday morning email. iPhone-readable — single
 * column, no inline images, simple <a> links. Color-codes by severity.
 */
export function buildMondayActionEmailHtml(reports: MondayActionReport[], baseUrl: string): string {
  const totalItems = reports.reduce((n, r) => n + r.items.length, 0);
  const criticalItems = reports.reduce((n, r) => n + r.items.filter((i) => i.severity === "critical").length, 0);
  const warningItems = reports.reduce((n, r) => n + r.items.filter((i) => i.severity === "warning").length, 0);

  const sevColor: Record<string, string> = {
    critical: "#C8322B",
    warning: "#C49A2A",
    info: "#3B7EA1",
  };
  const sevLabel: Record<string, string> = {
    critical: "CRITICAL",
    warning: "ATTENTION",
    info: "INFO",
  };

  const sections = reports
    .map((r) => {
      if (r.items.length === 0) {
        return `<div style="margin-bottom:24px;padding:14px;background:#f5f3ec;border-radius:6px;color:#555;">
          <strong>${r.siteId}</strong>: no action items 🎉
        </div>`;
      }
      const rows = r.items
        .map((it) => {
          const link = it.actionUrl
            ? `<p style="margin:8px 0 0;"><a href="${it.actionUrl.startsWith("http") ? it.actionUrl : baseUrl + it.actionUrl}" style="color:#3B7EA1;text-decoration:underline;font-size:13px;">Open →</a></p>`
            : "";
          const metric = it.metric
            ? `<div style="display:inline-block;background:rgba(0,0,0,0.05);padding:2px 8px;border-radius:4px;font-size:11px;color:#666;margin-top:6px;">${it.metric.label}: ${it.metric.value}</div>`
            : "";
          return `
            <div style="margin-bottom:16px;padding:14px;background:#fff;border-left:4px solid ${sevColor[it.severity]};border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:${sevColor[it.severity]};margin-bottom:4px;">
                ${sevLabel[it.severity]} · ${it.category.replace(/_/g, " ")}
              </div>
              <div style="font-size:15px;font-weight:600;color:#1a1a2e;line-height:1.3;">${it.title}</div>
              <div style="font-size:13px;color:#555;line-height:1.5;margin-top:6px;">${it.description}</div>
              ${metric}
              ${link}
            </div>`;
        })
        .join("");
      return `
        <div style="margin-bottom:28px;">
          <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 12px 0;border-bottom:2px solid #C49A2A;padding-bottom:6px;">
            ${r.siteId} — ${r.items.length} item(s)
          </h2>
          ${rows}
        </div>`;
    })
    .join("");

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#FAF8F4;color:#1a1a2e;">
      <div style="background:#1A2238;color:#fff;padding:20px;border-radius:8px;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:1px;color:#C49A2A;font-weight:700;">MONDAY MORNING AUDIT</div>
        <h1 style="font-size:22px;margin:6px 0 4px 0;">${totalItems} action item(s) across ${reports.length} site(s)</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);">
          ${criticalItems > 0 ? `🚨 ${criticalItems} critical · ` : ""}${warningItems > 0 ? `⚠️ ${warningItems} attention · ` : ""}generated ${new Date().toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC
        </div>
      </div>
      ${sections}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #d6d0c4;font-size:11px;color:#888;">
        Generated by weekly-rescue-campaign cron. Categories: <strong>manual_action</strong> = needs your tap; <strong>metric_watch</strong> = trend to watch; <strong>auto_draining</strong> = system is fixing it; <strong>code_change_needed</strong> = next dev session.
      </div>
    </div>`;
}
