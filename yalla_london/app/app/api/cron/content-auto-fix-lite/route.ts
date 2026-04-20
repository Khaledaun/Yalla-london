export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Content Auto-Fix LITE — Lightweight DB-Only Fixes
 *
 * Split from content-auto-fix to avoid connection pool exhaustion.
 * This route handles ONLY fast, DB-only operations:
 *
 * 1. Stuck draft recovery (reset/reject stuck pipeline drafts)
 * 2. Heading hierarchy fix (demote duplicate H1s to H2)
 * 3. Meta description trim — BlogPost EN
 * 4. Meta description trim — BlogPost AR
 * 5. Meta description trim — ArticleDraft seo_meta
 * 6. Title & meta artifact cleanup (strip AI-generated artifacts from DB)
 *
 * Runs every 4 hours. Completes in 5-15 seconds.
 * The HEAVY version (content-auto-fix) handles AI enhancement,
 * link injection, and Arabic meta generation — runs 2x/day.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";
import { isEnhancementOwner, buildEnhancementLogEntry } from "@/lib/db/enhancement-log";

const BUDGET_MS = 280_000;
const META_MAX_CHARS = 155;

/** Retry a DB operation once after 2s if it fails on pool timeout */
async function withPoolRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("connection pool") || msg.includes("connect_timeout")) {
      console.warn(`[auto-fix-lite] ${label} pool timeout, retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
      return await fn();
    }
    throw err;
  }
}

async function handleAutoFixLite(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_AUTO_FIX_LITE=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-auto-fix-lite");
  if (flagResponse) return flagResponse;

  const { prisma } = await import("@/lib/db");
  // Eagerly connect — prevents cold-start "Engine is not yet connected" crashes
  try {
    await prisma.$connect();
  } catch {
    /* already connected */
  }
  const { getActiveSiteIds } = await import("@/config/sites");
  const activeSiteIds = getActiveSiteIds();

  const results = {
    stuckUnstuck: 0,
    stuckRejected: 0,
    headingsFixed: 0,
    markdownConverted: 0,
    metaTrimmedPosts: 0,
    metaTrimmedDrafts: 0,
    titleArtifactsCleaned: 0,
    duplicatesUnpublished: 0,
    errors: [] as string[],
  };

  // ── 1. STUCK DRAFT RECOVERY ────────────────────────────────────────────
  try {
    // Content-builder processes 1 draft per 15-min cron run. With N drafts in the
    // pipeline, each draft waits ~N*15min between updates. Using 1h threshold caused
    // false "stuck" detection on queued drafts (20 recoveries/hour on healthy drafts).
    // Use 2h for non-drafting phases (matches sweeper's STUCK_THRESHOLD_MS) and 4h for
    // drafting (6-10 sections × 15min per section = 1.5-2.5h per article).
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const stuckDrafts = (await withPoolRetry(
      async () =>
        prisma.articleDraft.findMany({
          where: {
            site_id: { in: activeSiteIds },
            current_phase: {
              in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
            },
            OR: [
              // Drafting phase: only stuck if no update for 4+ hours
              // (6-10 sections × 15min per section = 1.5-2.5h per article, plus queue time)
              { current_phase: "drafting", updated_at: { lt: fourHoursAgo } },
              // All other phases: stuck after 2 hours (matches sweeper threshold)
              { current_phase: { not: "drafting" }, updated_at: { lt: twoHoursAgo } },
            ],
          },
          select: { id: true, current_phase: true, keyword: true, phase_attempts: true },
          take: 20,
        }),
      "stuck-recovery",
    )) as Array<{ id: string; current_phase: string; keyword: string; phase_attempts: number }>;

    for (const draft of stuckDrafts) {
      if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
      const attempts = draft.phase_attempts || 0;
      const maxAttempts = draft.current_phase === "drafting" ? 5 : 3;

      if (attempts >= maxAttempts) {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            rejection_reason: `Stuck in "${draft.current_phase}" for 2+ hours after ${attempts} attempts — auto-rejected by content-auto-fix-lite`,
            completed_at: new Date(),
            updated_at: new Date(),
          },
        });
        results.stuckRejected++;
      } else {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_started_at: null,
            updated_at: new Date(),
          },
        });
        results.stuckUnstuck++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`stuck-recovery: ${msg}`);
    console.warn("[auto-fix-lite] Stuck draft recovery failed:", msg);
  }

  // ── 2. HEADING HIERARCHY FIX ───────────────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 3_000 && isEnhancementOwner("content-auto-fix-lite", "heading_hierarchy")) {
    try {
      const recentPosts = (await withPoolRetry(
        async () =>
          prisma.blogPost.findMany({
            where: {
              siteId: { in: activeSiteIds },
              published: true,
              deletedAt: null,
            },
            select: { id: true, slug: true, content_en: true, content_ar: true },
            take: 50,
            orderBy: { created_at: "desc" },
          }),
        "heading-fix",
      )) as Array<{ id: string; slug: string; content_en: string; content_ar: string }>;

      for (const post of recentPosts) {
        if (!post.content_en || post.content_en.trim().length === 0) continue;
        let htmlEn = post.content_en;
        let htmlAr = post.content_ar || "";
        let modified = false;

        // Demote ALL <h1> to <h2> in content body — the blog page template already
        // provides the H1 via the article title. Even a single <h1> in body content
        // causes "Multiple H1 headings" in SEO audits.
        const h1InEn = /<h1[\s>]/i.test(htmlEn);
        const h1InAr = /<h1[\s>]/i.test(htmlAr);

        if (h1InEn) {
          htmlEn = htmlEn.replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
          modified = true;
        }
        if (h1InAr) {
          htmlAr = htmlAr.replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
          modified = true;
        }

        if (modified) {
          const updateData: Record<string, unknown> = {};
          if (h1InEn) updateData.content_en = htmlEn;
          if (h1InAr) updateData.content_ar = htmlAr;
          await optimisticBlogPostUpdate(
            post.id,
            (current) => ({
              ...updateData,
              enhancement_log: buildEnhancementLogEntry(
                current.enhancement_log,
                "heading_hierarchy",
                "content-auto-fix-lite",
                `Demoted ${(h1InEn ? 1 : 0) + (h1InAr ? 1 : 0)} H1(s) to H2 in ${[h1InEn && "EN", h1InAr && "AR"].filter(Boolean).join("+")}`,
              ),
            }),
            { tag: "[content-auto-fix-lite]" },
          );
          results.headingsFixed++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`heading-fix: ${msg}`);
      console.warn("[auto-fix-lite] Heading fix failed:", msg);
    }
  }

  // ── 2b. MARKDOWN → HTML CONVERSION ──────────────────────────────────
  // Some pipeline runs produce markdown instead of HTML. This converts them
  // in the DB so the blog renderer doesn't show raw `# Heading` text.
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      // Find posts whose content starts with markdown heading (# ) or has
      // no HTML tags at all — these are markdown, not HTML
      const markdownPosts = (await withPoolRetry(
        async () =>
          prisma.blogPost.findMany({
            where: {
              siteId: { in: activeSiteIds },
              published: true,
              deletedAt: null,
              OR: [{ content_en: { startsWith: "# " } }, { content_en: { startsWith: "## " } }],
            },
            select: { id: true, slug: true, content_en: true, content_ar: true },
            take: 20,
            orderBy: { created_at: "desc" },
          }),
        "markdown-fix",
      )) as Array<{ id: string; slug: string; content_en: string; content_ar: string }>;

      const convertMarkdown = (text: string): string => {
        if (!text) return text;
        // Only convert if content looks like markdown
        if (/<[a-z][\s\S]*?>/i.test(text) && !text.startsWith("# ")) return text;
        let html = text;
        html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
        html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
        html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
        html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
        html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
        html = html.replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        html = html.replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>");
        html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, "<ul>$1</ul>");
        html = html.replace(/^(?!<[a-z/])((?!$).+)$/gm, "<p>$1</p>");
        html = html.replace(/<p>\s*<\/p>/g, "");
        return html;
      };

      for (const post of markdownPosts) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const updateData: Record<string, string> = {};
        const enConverted = convertMarkdown(post.content_en);
        if (enConverted !== post.content_en) updateData.content_en = enConverted;
        if (post.content_ar && /^#{1,6}\s/m.test(post.content_ar)) {
          const arConverted = convertMarkdown(post.content_ar);
          if (arConverted !== post.content_ar) updateData.content_ar = arConverted;
        }
        if (Object.keys(updateData).length > 0) {
          await optimisticBlogPostUpdate(post.id, () => updateData, { tag: "[content-auto-fix-lite]" });
          results.markdownConverted++;
          console.log(`[auto-fix-lite] Converted markdown → HTML for: ${post.slug}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`markdown-fix: ${msg}`);
      console.warn("[auto-fix-lite] Markdown conversion failed:", msg);
    }
  }

  // ── 3. META DESCRIPTION TRIM — BlogPosts EN ───────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPosts = (await prisma.$queryRawUnsafe(
        `SELECT id, meta_description_en FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_en" IS NOT NULL AND LENGTH("meta_description_en") > 160 LIMIT 20`,
        activeSiteIds,
      )) as Array<{ id: string; meta_description_en: string }>;

      for (const post of longMetaPosts) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const desc = post.meta_description_en || "";
        let trimmed = desc.substring(0, META_MAX_CHARS);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?]$/, "") + "…";

        await optimisticBlogPostUpdate(post.id, () => ({ meta_description_en: trimmed }), {
          tag: "[content-auto-fix-lite]",
        });
        results.metaTrimmedPosts++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-en: ${msg}`);
      console.warn("[auto-fix-lite] Meta trim EN failed:", msg);
    }
  }

  // ── 4. META DESCRIPTION TRIM — BlogPosts AR ───────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPostsAr = (await prisma.$queryRawUnsafe(
        `SELECT id, meta_description_ar FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_ar" IS NOT NULL AND LENGTH("meta_description_ar") > 160 LIMIT 20`,
        activeSiteIds,
      )) as Array<{ id: string; meta_description_ar: string }>;

      for (const post of longMetaPostsAr) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const desc = post.meta_description_ar || "";
        let trimmed = desc.substring(0, META_MAX_CHARS);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?،؛]$/, "") + "…";

        await optimisticBlogPostUpdate(post.id, () => ({ meta_description_ar: trimmed }), {
          tag: "[content-auto-fix-lite]",
        });
        results.metaTrimmedPosts++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-ar: ${msg}`);
      console.warn("[auto-fix-lite] Meta trim AR failed:", msg);
    }
  }

  // ── 5. META DESCRIPTION TRIM — ArticleDrafts ──────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const draftsWithMeta = (await withPoolRetry(
        async () =>
          prisma.articleDraft.findMany({
            where: {
              site_id: { in: activeSiteIds },
              current_phase: { in: ["reservoir", "published"] },
              seo_meta: { not: null },
            },
            select: { id: true, seo_meta: true },
            take: 20,
          }),
        "meta-trim-drafts",
      )) as Array<{ id: string; seo_meta: Record<string, unknown> | null }>;

      for (const draft of draftsWithMeta) {
        if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
        const meta = draft.seo_meta as Record<string, unknown> | null;
        if (!meta) continue;
        const desc = (meta.metaDescription as string) || "";
        if (desc.length > 160) {
          let trimmed = desc.substring(0, META_MAX_CHARS);
          const lastSpace = trimmed.lastIndexOf(" ");
          if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
          trimmed = trimmed.replace(/[.,;:!?]$/, "") + "…";

          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              seo_meta: { ...meta, metaDescription: trimmed },
              updated_at: new Date(),
            },
          });
          results.metaTrimmedDrafts++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-drafts: ${msg}`);
      console.warn("[auto-fix-lite] Meta trim drafts failed:", msg);
    }
  }

  // ── 6. TITLE & META ARTIFACT CLEANUP ──────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const { sanitizeTitle, sanitizeMetaDescription, hasTitleArtifacts } =
        await import("@/lib/content-pipeline/title-sanitizer");

      // Scan recent posts for title artifacts
      const postsToCheck = (await withPoolRetry(
        async () =>
          prisma.blogPost.findMany({
            where: {
              siteId: { in: activeSiteIds },
              deletedAt: null,
            },
            select: {
              id: true,
              title_en: true,
              meta_title_en: true,
              meta_description_en: true,
            },
            take: 50,
            orderBy: { updated_at: "desc" },
          }),
        "title-artifact-cleanup",
      )) as Array<{ id: string; title_en: string; meta_title_en: string | null; meta_description_en: string | null }>;

      for (const post of postsToCheck) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;

        const updates: Record<string, string> = {};

        // Check title_en for artifacts
        if (hasTitleArtifacts(post.title_en)) {
          const cleaned = sanitizeTitle(post.title_en);
          if (cleaned && cleaned !== post.title_en) {
            updates.title_en = cleaned;
          }
        }

        // Check meta_title_en for artifacts
        if (post.meta_title_en && hasTitleArtifacts(post.meta_title_en)) {
          const cleaned = sanitizeTitle(post.meta_title_en);
          if (cleaned && cleaned !== post.meta_title_en) {
            updates.meta_title_en = cleaned;
          }
        }

        // Check meta_description_en for artifacts (not just overlength — also AI echoes)
        if (post.meta_description_en && hasTitleArtifacts(post.meta_description_en)) {
          const cleaned = sanitizeMetaDescription(post.meta_description_en);
          if (cleaned && cleaned !== post.meta_description_en) {
            updates.meta_description_en = cleaned;
          }
        }

        if (Object.keys(updates).length > 0) {
          await optimisticBlogPostUpdate(post.id, () => updates, { tag: "[content-auto-fix-lite]" });
          results.titleArtifactsCleaned++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`title-artifact-cleanup: ${msg}`);
      console.warn("[auto-fix-lite] Title artifact cleanup failed:", msg);
    }
  }

  // ── 6b. REJECT GARBAGE-TITLED RESERVOIR DRAFTS ──────────────────────
  // Drafts with "Top Alternatives:" prefix are SEO-strategy artifacts that produce
  // garbage articles. Reject them to drain the reservoir and allow fresh content.
  let garbageTitlesRejected = 0;
  if (Date.now() - cronStart < BUDGET_MS - 8_000) {
    try {
      const garbageDrafts = (await withPoolRetry(
        async () =>
          prisma.articleDraft.findMany({
            where: {
              current_phase: "reservoir",
              keyword: { startsWith: "Top Alternatives:" },
              site_id: { in: activeSiteIds },
            },
            select: { id: true, keyword: true },
            take: 50,
          }),
        "garbage-title-find",
      )) as Array<{ id: string; keyword: string }>;

      for (const draft of garbageDrafts) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            last_error: "Rejected: garbage title template 'Top Alternatives:' from content-strategy.ts",
            updated_at: new Date(),
          },
        });
        garbageTitlesRejected++;
      }
      if (garbageTitlesRejected > 0) {
        console.log(`[auto-fix-lite] Rejected ${garbageTitlesRejected} garbage-titled reservoir drafts`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`garbage-title-reject: ${msg}`);
      console.warn("[auto-fix-lite] Garbage title rejection failed:", msg);
    }
  }

  // ── 7. NEVER-SUBMITTED CATCH-UP ──────────────────────────────────────
  // Find published articles AND news items that have no URLIndexingStatus record.
  // Prevents "never submitted" gap where ensureUrlTracked() failed silently on publish.
  // Also catches news items (previously only blog posts were scanned).
  let neverSubmittedFixed = 0;
  if (Date.now() - cronStart < BUDGET_MS - 12_000) {
    try {
      const { getSiteDomain } = await import("@/config/sites");
      // Find ALL published blog posts
      const untrackedPosts = (await withPoolRetry(
        async () =>
          prisma.blogPost.findMany({
            where: {
              siteId: { in: activeSiteIds },
              published: true,
              deletedAt: null,
            },
            select: { slug: true, siteId: true },
            take: 2000, // Raised from 500 to cover ALL published posts (was missing oldest 64+)
            orderBy: { created_at: "desc" },
          }),
        "never-submitted-catchup",
      )) as Array<{ slug: string; siteId: string }>;

      // Build all URLs for blog posts
      const postUrls: Array<{ url: string; siteId: string; slug: string }> = untrackedPosts.map((post) => {
        const domain = getSiteDomain(post.siteId);
        return { url: `${domain}/blog/${post.slug}`, siteId: post.siteId, slug: post.slug };
      });

      // Also check news items (were previously missing from never-submitted scan)
      try {
        const newsItems = (await withPoolRetry(
          async () =>
            prisma.newsItem.findMany({
              where: {
                siteId: { in: activeSiteIds },
                published: true,
              },
              select: { slug: true, siteId: true },
              take: 100,
              orderBy: { created_at: "desc" },
            }),
          "never-submitted-news",
        )) as Array<{ slug: string; siteId: string }>;

        for (const news of newsItems) {
          const domain = getSiteDomain(news.siteId);
          postUrls.push({ url: `${domain}/news/${news.slug}`, siteId: news.siteId, slug: news.slug });
        }
      } catch {
        // NewsItem table may not exist — proceed with blog posts only
      }

      // Also check static pages (faq, glossary, editorial-policy, etc.)
      // These are hardcoded page.tsx files that never appear in DB queries above.
      try {
        const { getStaticPageUrls } = await import("@/lib/seo/indexing-service");
        for (const sid of activeSiteIds) {
          const domain = getSiteDomain(sid);
          const staticUrls = getStaticPageUrls(domain, sid);
          for (const url of staticUrls) {
            const slug = url.replace(/^https?:\/\/[^/]+\/?/, "") || "/";
            postUrls.push({ url, siteId: sid, slug });
          }
        }
      } catch {
        // Non-critical — static page tracking is best-effort
      }

      // Batch-check which URLs are already tracked (1 query instead of N)
      const existingUrls = (await withPoolRetry(
        async () =>
          prisma.uRLIndexingStatus.findMany({
            where: { url: { in: postUrls.map((p) => p.url) } },
            select: { url: true },
          }),
        "never-submitted-existing-check",
      )) as Array<{ url: string }>;

      const trackedSet = new Set<string>(existingUrls.map((e) => e.url));
      const untracked = postUrls.filter((p) => !trackedSet.has(p.url));

      // Track missing URLs — process up to 200 per run to clear backlogs faster.
      // Each ensureUrlTracked is ~50ms (DB write), so 200 × 50ms = 10s within budget.
      const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
      for (const post of untracked.slice(0, 500)) {
        if (Date.now() - cronStart > BUDGET_MS - 10_000) break;
        await ensureUrlTracked(post.url, post.siteId, post.slug);
        neverSubmittedFixed++;
      }
      if (neverSubmittedFixed > 0) {
        console.log(
          `[auto-fix-lite] Tracked ${neverSubmittedFixed} previously untracked URLs (${untracked.length} total untracked found)`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`never-submitted-catchup: ${msg}`);
      console.warn("[auto-fix-lite] Never-submitted catch-up failed:", msg);
    }
  }

  // ── 8. SITEMAP CACHE REGENERATION ─────────────────────────────────────
  // Pre-build sitemap data so /sitemap.xml serves instantly from cache.
  // This replaces the old design of 10+ live DB queries per request,
  // which caused timeouts and broke Google's ability to crawl the site.
  let sitemapUrlCount = 0;
  if (Date.now() - cronStart < BUDGET_MS - 10_000) {
    try {
      const { regenerateAllSitemapCaches } = await import("@/lib/sitemap-cache");
      const sitemapResult = await regenerateAllSitemapCaches();
      sitemapUrlCount = sitemapResult.sites.reduce((sum, s) => sum + s.urlCount, 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`sitemap-cache: ${msg}`);
      console.warn("[auto-fix-lite] Sitemap cache regeneration failed:", msg);
    }
  }

  // ── 9. CRON LOG CLEANUP ──────────────────────────────────────────────
  // CronJobLog grows unbounded (~200 entries/day = 6000/month). Delete entries
  // older than 14 days to keep table small and prevent full-table-scan slowdown.
  let cronLogsDeleted = 0;
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const deleted = await prisma.cronJobLog.deleteMany({
        where: { started_at: { lt: fourteenDaysAgo } },
      });
      cronLogsDeleted = deleted.count;
      if (cronLogsDeleted > 0) {
        console.log(`[auto-fix-lite] Cleaned up ${cronLogsDeleted} CronJobLog entries older than 14d`);
      }
    } catch (err) {
      console.warn("[auto-fix-lite] CronJobLog cleanup failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Section 10: ApiUsageLog cleanup (7-day retention) ──
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const apiLogsDeleted = await prisma.apiUsageLog.deleteMany({
      where: { createdAt: { lt: sevenDaysAgo } },
    });
    if (apiLogsDeleted.count > 0) {
      console.log(`[content-auto-fix-lite] Cleaned ${apiLogsDeleted.count} ApiUsageLog entries older than 7 days`);
    }
  } catch (e) {
    console.warn("[content-auto-fix-lite] ApiUsageLog cleanup failed:", e instanceof Error ? e.message : e);
  }

  // ── Section 11: AutoFixLog cleanup (14-day retention) ──
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const autoFixDeleted = await prisma.autoFixLog.deleteMany({
      where: { createdAt: { lt: fourteenDaysAgo } },
    });
    if (autoFixDeleted.count > 0) {
      console.log(`[content-auto-fix-lite] Cleaned ${autoFixDeleted.count} AutoFixLog entries older than 14 days`);
    }
  } catch (e) {
    console.warn("[content-auto-fix-lite] AutoFixLog cleanup failed:", e instanceof Error ? e.message : e);
  }

  // ── Section 12: Rejected ArticleDraft cleanup (14-day retention) ──
  try {
    const fourteenDaysAgo2 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const rejectedDeleted = await prisma.articleDraft.deleteMany({
      where: {
        current_phase: "rejected",
        updated_at: { lt: fourteenDaysAgo2 },
      },
    });
    if (rejectedDeleted.count > 0) {
      console.log(`[content-auto-fix-lite] Cleaned ${rejectedDeleted.count} rejected ArticleDrafts older than 14 days`);
    }
  } catch (e) {
    console.warn("[content-auto-fix-lite] Rejected draft cleanup failed:", e instanceof Error ? e.message : e);
  }

  // ── Section 13: Photo Order Fulfillment — DISABLED ─────────────────
  // Policy: No auto-assigned stock photos. Owner manually curates real HQ photos.
  // Articles with photo_order_status="needs_review" appear in cockpit for manual upload.
  let photoOrdersFulfilled = 0;
  // Skipped — auto-Unsplash assignment disabled per brand policy.
  // Articles with photo_order_status="needs_review" wait for manual photo upload.

  // ── Section 14: DISABLED — No auto image replacement ───────────────
  // Policy: Only real, curated, high-quality photos. No AI stock photos.
  // Articles without photos show a branded gradient placeholder on the blog page.
  let badImagesFixed = 0;
  /* DISABLED per brand policy — entire section commented out
    const postsToCheck = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId: { in: activeSiteIds },
          OR: [
            { featured_image: null },
            { featured_image: "" },
            // AI often generates plausible but fake image URLs
            { featured_image: { contains: "placeholder" } },
            { featured_image: { contains: "example.com" } },
            { featured_image: { contains: "via.placeholder" } },
          ],
        },
        select: { id: true, title_en: true, slug: true, featured_image: true },
        take: 5,
      });

      if (postsToCheck.length > 0 && process.env.UNSPLASH_ACCESS_KEY) {
        const { getRandomPhoto, trackDownload, buildImageUrl } = await import("@/lib/apis/unsplash");
        for (const post of postsToCheck) {
          if (Date.now() - cronStart > BUDGET_MS - 10_000) break;
          try {
            // Extract search terms from title
            const titleWords = (post.title_en || post.slug || "london travel")
              .replace(/[-_]/g, " ")
              .replace(/\b(best|top|guide|ultimate|complete|2026|2025)\b/gi, "")
              .trim();
            const searchQuery = `${titleWords} london`.substring(0, 60);
            const photo = await getRandomPhoto(searchQuery, "landscape");
            if (!photo) continue;
            const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, height: 675, quality: 80, format: "webp" });
            await prisma.blogPost.update({
              where: { id: post.id },
              data: { featured_image: imageUrl },
            });
            await trackDownload(photo.downloadUrl).catch(() => {});
            badImagesFixed++;
          } catch (e) {
            console.warn("[auto-fix-lite] bad image fix failed:", post.id, e instanceof Error ? e.message : String(e));
          }
        }
      }
  DISABLED per brand policy — end of commented section */

  // ── Section 15: Strip unapproved affiliate partner sections ────────
  // Removes "Recommended Partners" blocks that list partners we're not approved by
  let affiliateBlocksCleaned = 0;
  if (Date.now() - cronStart < BUDGET_MS - 8_000) {
    try {
      // Find posts with Booking.com/GetYourGuide/StubHub affiliate blocks where env vars are empty
      const unapprovedPartners = [
        "Booking.com",
        "GetYourGuide",
        "StubHub",
        "Agoda",
        "OpenTable",
        "TheFork",
        "Blacklane",
      ];
      const envVarMap: Record<string, string> = {
        "Booking.com": process.env.BOOKING_AFFILIATE_ID || "",
        GetYourGuide: process.env.GETYOURGUIDE_AFFILIATE_ID || "",
        StubHub: process.env.STUBHUB_AFFILIATE_ID || "",
        Agoda: process.env.AGODA_AFFILIATE_ID || "",
        OpenTable: process.env.OPENTABLE_AFFILIATE_ID || "",
        TheFork: process.env.THEFORK_AFFILIATE_ID || "",
        Blacklane: process.env.BLACKLANE_AFFILIATE_ID || "",
      };
      const unapproved = unapprovedPartners.filter((p) => !envVarMap[p]);

      if (unapproved.length > 0) {
        const postsWithBadPartners = await prisma.blogPost.findMany({
          where: {
            published: true,
            siteId: { in: activeSiteIds },
            OR: unapproved.map((p) => ({ content_en: { contains: `data-affiliate-partner="${p}"` } })),
          },
          select: { id: true, content_en: true },
          take: 10,
        });

        for (const post of postsWithBadPartners) {
          if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
          let content = post.content_en || "";
          let changed = false;
          for (const partner of unapproved) {
            // Remove individual CTA blocks for unapproved partners
            const ctaRegex = new RegExp(
              `<div class="affiliate-recommendation"[^>]*data-affiliate="${partner}"[^>]*>[\\s\\S]*?</div>`,
              "gi",
            );
            if (ctaRegex.test(content)) {
              content = content.replace(ctaRegex, "");
              changed = true;
            }
            // Remove from Recommended Partners section
            const linkRegex = new RegExp(`<a[^>]*data-affiliate-partner="${partner}"[^>]*>[\\s\\S]*?</a>`, "gi");
            if (linkRegex.test(content)) {
              content = content.replace(linkRegex, "");
              changed = true;
            }
          }
          // If Recommended Partners section is now empty, remove it entirely
          const emptySection =
            /<div class="affiliate-partners-section"[^>]*>[\s\S]*?<div[^>]*>[\s]*<\/div>[\s]*<\/div>/gi;
          if (emptySection.test(content)) {
            content = content.replace(emptySection, "");
            changed = true;
          }
          if (changed) {
            await prisma.blogPost.update({ where: { id: post.id }, data: { content_en: content } });
            affiliateBlocksCleaned++;
          }
        }
      }
    } catch (e) {
      results.errors.push(`affiliate-cleanup: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Section 16: Duplicate slug consolidation ─────────────────────────
  // Auto-merges -v2/-v3/-vXXXX/-[hex] slug variants into the canonical winner.
  // Sets BlogPost.canonical_slug on losers so the blog page can issue 301
  // redirects (preserves accumulated SEO equity instead of returning 404).
  // Runs every 4h via this cron — Khaled doesn't have to touch anything.
  if (Date.now() - cronStart < BUDGET_MS - 8_000) {
    try {
      const SLUG_ARTIFACT_PATTERN = /-v\d{1,3}$|-v[a-z0-9]{4}$|-[0-9a-f]{4,}$|-\d+-chars$/i;
      const normalizeSlug = (slug: string) =>
        slug
          .replace(SLUG_ARTIFACT_PATTERN, "")
          .replace(/-20\d{2}(-\d{2}(-\d{2})?)?/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      for (const sid of activeSiteIds) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
        const posts = await prisma.blogPost.findMany({
          where: { siteId: sid, deletedAt: null, published: true },
          select: { id: true, slug: true, seo_score: true, content_en: true, created_at: true },
          orderBy: { created_at: "asc" },
          take: 500,
        });
        const groups = new Map<string, typeof posts>();
        for (const p of posts) {
          const norm = normalizeSlug(p.slug);
          if (!groups.has(norm)) groups.set(norm, []);
          groups.get(norm)!.push(p);
        }
        for (const [, group] of groups) {
          if (group.length < 2) continue;
          const sorted = [...group].sort((a, b) => {
            if ((a.seo_score || 0) !== (b.seo_score || 0)) return (b.seo_score || 0) - (a.seo_score || 0);
            const aw = a.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
            const bw = b.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
            if (aw !== bw) return bw - aw;
            return a.created_at.getTime() - b.created_at.getTime();
          });
          const winner = sorted[0];
          for (let i = 1; i < sorted.length; i++) {
            if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
            await prisma.blogPost.update({
              where: { id: sorted[i].id },
              data: { published: false, canonical_slug: winner.slug },
            });
            results.duplicatesUnpublished++;
          }
        }
      }
    } catch (e) {
      results.errors.push(`duplicate-consolidation: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Log + respond ──────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed =
    results.stuckUnstuck +
    results.stuckRejected +
    results.headingsFixed +
    results.metaTrimmedPosts +
    results.metaTrimmedDrafts +
    results.titleArtifactsCleaned +
    garbageTitlesRejected +
    neverSubmittedFixed +
    photoOrdersFulfilled +
    badImagesFixed +
    affiliateBlocksCleaned +
    results.duplicatesUnpublished;
  const hasErrors = results.errors.length > 0;

  if (hasErrors && totalFixed === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "content-auto-fix-lite", error: results.errors.join("; ") }).catch((err) =>
      console.warn("[auto-fix-lite] onCronFailure hook failed:", err instanceof Error ? err.message : err),
    );
  }

  await logCronExecution("content-auto-fix-lite", hasErrors && totalFixed === 0 ? "failed" : "completed", {
    durationMs,
    itemsProcessed: totalFixed,
    itemsSucceeded: totalFixed,
    resultSummary: results,
  }).catch((err) => console.warn("[auto-fix-lite] logCronExecution failed:", err instanceof Error ? err.message : err));

  return NextResponse.json({
    success: true,
    durationMs,
    sitemapUrlCount,
    neverSubmittedFixed,
    cronLogsDeleted,
    photoOrdersFulfilled,
    badImagesFixed,
    affiliateBlocksCleaned,
    ...results,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFixLite(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFixLite(request);
}
