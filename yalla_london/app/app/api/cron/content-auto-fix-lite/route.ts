export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const BUDGET_MS = 53_000;
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
    errors: [] as string[],
  };

  // ── 1. STUCK DRAFT RECOVERY ────────────────────────────────────────────
  try {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const stuckDrafts = await withPoolRetry(async () => prisma.articleDraft.findMany({
      where: {
        site_id: { in: activeSiteIds },
        current_phase: {
          in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
        },
        updated_at: { lt: oneHourAgo },
      },
      select: { id: true, current_phase: true, keyword: true, phase_attempts: true },
      take: 20,
    }), "stuck-recovery") as Array<{ id: string; current_phase: string; keyword: string; phase_attempts: number }>;

    for (const draft of stuckDrafts) {
      if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
      const attempts = draft.phase_attempts || 0;
      const maxAttempts = draft.current_phase === "drafting" ? 5 : 3;

      if (attempts >= maxAttempts) {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            rejection_reason: `Stuck in "${draft.current_phase}" for 1+ hours after ${attempts} attempts — auto-rejected by content-auto-fix-lite`,
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
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const recentPosts = await withPoolRetry(async () => prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
        },
        select: { id: true, slug: true, content_en: true, content_ar: true },
        take: 50,
        orderBy: { created_at: "desc" },
      }), "heading-fix") as Array<{ id: string; slug: string; content_en: string; content_ar: string }>;

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
          const updateData: Record<string, string> = {};
          if (h1InEn) updateData.content_en = htmlEn;
          if (h1InAr) updateData.content_ar = htmlAr;
          await prisma.blogPost.update({
            where: { id: post.id },
            data: updateData,
          });
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
      const markdownPosts = await withPoolRetry(async () => prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          OR: [
            { content_en: { startsWith: "# " } },
            { content_en: { startsWith: "## " } },
          ],
        },
        select: { id: true, slug: true, content_en: true, content_ar: true },
        take: 20,
        orderBy: { created_at: "desc" },
      }), "markdown-fix") as Array<{ id: string; slug: string; content_en: string; content_ar: string }>;

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
          await prisma.blogPost.update({ where: { id: post.id }, data: updateData });
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

        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_en: trimmed },
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

        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_ar: trimmed },
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
      const draftsWithMeta = await withPoolRetry(async () => prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: { in: ["reservoir", "published"] },
          seo_meta: { not: null },
        },
        select: { id: true, seo_meta: true },
        take: 20,
      }), "meta-trim-drafts") as Array<{ id: string; seo_meta: Record<string, unknown> | null }>;

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
      const { sanitizeTitle, sanitizeMetaDescription, hasTitleArtifacts } = await import("@/lib/content-pipeline/title-sanitizer");

      // Scan recent posts for title artifacts
      const postsToCheck = await withPoolRetry(async () => prisma.blogPost.findMany({
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
      }), "title-artifact-cleanup") as Array<{ id: string; title_en: string; meta_title_en: string | null; meta_description_en: string | null }>;

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
          await prisma.blogPost.update({
            where: { id: post.id },
            data: updates,
          });
          results.titleArtifactsCleaned++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`title-artifact-cleanup: ${msg}`);
      console.warn("[auto-fix-lite] Title artifact cleanup failed:", msg);
    }
  }

  // ── 7. NEVER-SUBMITTED CATCH-UP ──────────────────────────────────────
  // Find published articles that have no URLIndexingStatus record and track them.
  // Prevents "never submitted" gap where ensureUrlTracked() failed silently on publish.
  let neverSubmittedFixed = 0;
  if (Date.now() - cronStart < BUDGET_MS - 12_000) {
    try {
      const { getSiteDomain } = await import("@/config/sites");
      // Find ALL published posts — increased from 50 to 200 to ensure we catch every article.
      // With 37 never-submitted pages, the old limit of 50 only checked the most recent posts.
      const untrackedPosts = await withPoolRetry(async () => prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
        },
        select: { slug: true, siteId: true },
        take: 200,
        orderBy: { created_at: "desc" },
      }), "never-submitted-catchup") as Array<{ slug: string; siteId: string }>;

      // Build all URLs, then batch-check which ones are already tracked (1 query instead of N)
      const postUrls = untrackedPosts.map((post) => {
        const domain = getSiteDomain(post.siteId);
        return { url: `${domain}/blog/${post.slug}`, siteId: post.siteId, slug: post.slug };
      });

      const existingUrls = await withPoolRetry(async () => prisma.uRLIndexingStatus.findMany({
        where: { url: { in: postUrls.map((p) => p.url) } },
        select: { url: true },
      }), "never-submitted-existing-check") as Array<{ url: string }>;

      const trackedSet = new Set(existingUrls.map((e) => e.url));
      const untracked = postUrls.filter((p) => !trackedSet.has(p.url));

      // Track missing URLs — increased from 10 to 30 per run to clear 37-page backlog faster
      const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
      for (const post of untracked.slice(0, 30)) {
        if (Date.now() - cronStart > BUDGET_MS - 10_000) break;
        await ensureUrlTracked(post.url, post.siteId, `blog/${post.slug}`);
        neverSubmittedFixed++;
      }
      if (neverSubmittedFixed > 0) {
        console.log(`[auto-fix-lite] Tracked ${neverSubmittedFixed} previously untracked URLs`);
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

  // ── Log + respond ──────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed = results.stuckUnstuck + results.stuckRejected + results.headingsFixed + results.metaTrimmedPosts + results.metaTrimmedDrafts + results.titleArtifactsCleaned + neverSubmittedFixed;
  const hasErrors = results.errors.length > 0;

  if (hasErrors && totalFixed === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "content-auto-fix-lite", error: results.errors.join("; ") }).catch(err => console.warn("[auto-fix-lite] onCronFailure hook failed:", err instanceof Error ? err.message : err));
  }

  await logCronExecution("content-auto-fix-lite", hasErrors && totalFixed === 0 ? "failed" : "completed", {
    durationMs,
    itemsProcessed: totalFixed,
    itemsSucceeded: totalFixed,
    resultSummary: results,
  }).catch(err => console.warn("[auto-fix-lite] logCronExecution failed:", err instanceof Error ? err.message : err));

  return NextResponse.json({ success: true, durationMs, sitemapUrlCount, neverSubmittedFixed, ...results });
}

export async function GET(request: NextRequest) {
  return handleAutoFixLite(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFixLite(request);
}
