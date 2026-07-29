export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Article Cleanup API — Full database audit + cleanup
 *
 * GET: Returns complete audit report (duplicates, SEO problems, deadwood, stuck drafts)
 * POST: Executes cleanup actions (delete duplicates, reject deadwood, flag SEO problems)
 *
 * Actions (POST body):
 *   { action: "audit" }         — Full read-only audit (same as GET)
 *   { action: "cleanup" }       — Execute all safe cleanups (delete dupes, reject deadwood)
 *   { action: "delete_dupes" }  — Only delete duplicate published articles (keeps best copy)
 *   { action: "reject_deadwood" } — Only reject stuck/hopeless drafts
 *   { action: "unpublish_seo_problems" } — Unpublish articles hurting SEO
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

async function runAudit(prisma: typeof import("@/lib/db").prisma) {
  const { getActiveSiteIds } = await import("@/config/sites");
  const activeSites = getActiveSiteIds();

  // ── 1. Fetch all BlogPosts ──
  const allPosts = await prisma.blogPost.findMany({
    where: activeSites.length > 0 ? { siteId: { in: activeSites } } : {},
    select: {
      id: true,
      title_en: true,
      title_ar: true,
      slug: true,
      published: true,
      siteId: true,
      seo_score: true,
      content_en: true,
      content_ar: true,
      meta_title_en: true,
      meta_description_en: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  const published = allPosts.filter((p) => p.published);
  const unpublished = allPosts.filter((p) => !p.published);

  // ── 2. Find duplicate published titles ──
  const normalizeTitle = (t: string | null) => {
    if (!t) return "";
    return t
      .toLowerCase()
      .replace(/\b20\d{2}\b/g, "")
      .replace(
        /\b(comparison|guide|review|complete|ultimate|best|top|the|a|an|for|in|of|and|to)\b/gi,
        ""
      )
      .replace(/\bv\d+\b/gi, "") // Strip version suffixes (v2, v3, etc.)
      .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "") // Full Arabic Unicode
      .replace(/\s+/g, " ")
      .trim();
  };

  const titleGroups: Record<string, typeof published> = {};
  for (const p of published) {
    const norm = normalizeTitle(p.title_en || p.title_ar);
    if (!norm || norm.length < 5) continue;
    if (!titleGroups[norm]) titleGroups[norm] = [];
    titleGroups[norm].push(p);
  }

  const duplicateGroups = Object.entries(titleGroups)
    .filter(([, posts]) => posts.length > 1)
    .map(([normTitle, posts]) => {
      // Sort: highest word count first, then highest SEO score
      const sorted = [...posts].sort((a, b) => {
        const aWords = (a.content_en || "").split(/\s+/).filter(Boolean).length;
        const bWords = (b.content_en || "").split(/\s+/).filter(Boolean).length;
        if (bWords !== aWords) return bWords - aWords;
        return (b.seo_score || 0) - (a.seo_score || 0);
      });
      return {
        normalizedTitle: normTitle,
        keep: {
          id: sorted[0].id,
          title: sorted[0].title_en,
          slug: sorted[0].slug,
          wordCount: (sorted[0].content_en || "").split(/\s+/).filter(Boolean).length,
          seoScore: sorted[0].seo_score,
        },
        delete: sorted.slice(1).map((p) => ({
          id: p.id,
          title: p.title_en,
          slug: p.slug,
          wordCount: (p.content_en || "").split(/\s+/).filter(Boolean).length,
          seoScore: p.seo_score,
        })),
      };
    });

  // ── 3. SEO problem articles ──
  const seoProblems: Array<{
    id: string;
    title: string;
    slug: string;
    wordCount: number;
    seoScore: number | null;
    issues: string[];
    action: "unpublish" | "fix" | "monitor";
  }> = [];

  for (const p of published) {
    const issues: string[] = [];
    const wordCount = (p.content_en || "").split(/\s+/).filter(Boolean).length;
    const arWordCount = (p.content_ar || "").split(/\s+/).filter(Boolean).length;

    if (wordCount < 200 && arWordCount < 200) issues.push(`thin-content(${wordCount}w EN, ${arWordCount}w AR)`);
    if (!p.meta_title_en) issues.push("no-meta-title");
    if (!p.meta_description_en) issues.push("no-meta-desc");
    if (p.meta_description_en?.includes("[AUTO-UNPUBLISHED:")) issues.push("auto-unpublished-tag");
    if (p.meta_description_en?.includes("[DUPLICATE-FLAGGED:")) issues.push("duplicate-flagged");
    if (p.seo_score !== null && p.seo_score < 20) issues.push(`very-low-seo-score(${p.seo_score})`);
    if (p.slug === "-" || p.slug === "" || !p.slug) issues.push("bad-slug");
    if (!p.content_en && !p.content_ar) issues.push("no-content");

    if (issues.length > 0) {
      // Determine action severity
      const isCritical = issues.some((i) =>
        ["no-content", "bad-slug"].includes(i) ||
        i.startsWith("thin-content") ||
        i.startsWith("very-low-seo-score")
      );
      seoProblems.push({
        id: p.id,
        title: (p.title_en || p.title_ar || "NO TITLE").slice(0, 80),
        slug: p.slug,
        wordCount,
        seoScore: p.seo_score,
        issues,
        action: isCritical ? "unpublish" : issues.includes("no-meta-title") || issues.includes("no-meta-desc") ? "fix" : "monitor",
      });
    }
  }

  // ── 4. Unpublished BlogPosts (orphans) ──
  const orphans = unpublished.map((p) => {
    const wordCount = (p.content_en || "").split(/\s+/).filter(Boolean).length;
    const hasDuplicateFlag = (p.meta_description_en || "").includes("[DUPLICATE-FLAGGED:");
    const hasAutoUnpublish = (p.meta_description_en || "").includes("[AUTO-UNPUBLISHED:");
    let status = "orphan";
    if (hasDuplicateFlag) status = "DUPLICATE-FLAGGED";
    if (hasAutoUnpublish) status = "AUTO-UNPUBLISHED";
    if (wordCount < 100) status = "empty/stub";
    return {
      id: p.id,
      title: (p.title_en || p.title_ar || "NO TITLE").slice(0, 80),
      slug: p.slug,
      wordCount,
      seoScore: p.seo_score,
      status,
      action: status === "empty/stub" || status === "DUPLICATE-FLAGGED" ? "delete" : "review",
    };
  });

  // ── 5. ArticleDraft pipeline state ──
  const allDrafts = await prisma.articleDraft.findMany({
    where: activeSites.length > 0 ? { site_id: { in: activeSites } } : {},
    select: {
      id: true,
      keyword: true,
      locale: true,
      current_phase: true,
      quality_score: true,
      phase_attempts: true,
      last_error: true,
      site_id: true,
      created_at: true,
      updated_at: true,
      blog_post_id: true,
    },
    orderBy: { updated_at: "desc" },
  });

  // Phase distribution
  const phaseDistribution: Record<string, number> = {};
  for (const d of allDrafts) {
    const phase = d.current_phase || "unknown";
    phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;
  }

  // Rejected drafts (deadwood)
  const rejected = allDrafts
    .filter((d) => d.current_phase === "rejected")
    .map((d) => ({
      id: d.id,
      keyword: (d.keyword || "").slice(0, 60),
      attempts: d.phase_attempts,
      error: (d.last_error || "").slice(0, 100),
      locale: d.locale,
      action: "delete" as const,
    }));

  // Stuck drafts (>24h, not terminal)
  const stuckCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stuck = allDrafts
    .filter(
      (d) =>
        !["rejected", "published", "reservoir"].includes(d.current_phase || "") &&
        d.updated_at < stuckCutoff
    )
    .map((d) => ({
      id: d.id,
      keyword: (d.keyword || "").slice(0, 60),
      phase: d.current_phase,
      attempts: d.phase_attempts,
      error: (d.last_error || "").slice(0, 100),
      locale: d.locale,
      updatedAt: d.updated_at.toISOString(),
      action: (d.phase_attempts || 0) >= 5 ? ("reject" as const) : ("retry" as const),
    }));

  // Reservoir analysis — keyword overlap check
  const reservoir = allDrafts
    .filter((d) => d.current_phase === "reservoir")
    .map((d) => ({
      id: d.id,
      keyword: (d.keyword || "").slice(0, 80),
      score: d.quality_score,
      locale: d.locale,
      attempts: d.phase_attempts,
    }));

  return {
    summary: {
      totalBlogPosts: allPosts.length,
      published: published.length,
      unpublished: unpublished.length,
      totalDrafts: allDrafts.length,
      phaseDistribution,
      duplicateGroups: duplicateGroups.length,
      totalDuplicatesToDelete: duplicateGroups.reduce((sum, g) => sum + g.delete.length, 0),
      seoProblems: seoProblems.length,
      seoToUnpublish: seoProblems.filter((p) => p.action === "unpublish").length,
      seoToFix: seoProblems.filter((p) => p.action === "fix").length,
      rejectedDrafts: rejected.length,
      stuckDrafts: stuck.length,
      reservoirDrafts: reservoir.length,
      orphansToDelete: orphans.filter((o) => o.action === "delete").length,
    },
    duplicateGroups,
    seoProblems,
    orphans,
    rejected: rejected.slice(0, 30),
    stuck,
    reservoir: reservoir.slice(0, 30),
  };
}

async function executeCleanup(
  prisma: typeof import("@/lib/db").prisma,
  actions: {
    deleteDupes?: boolean;
    rejectDeadwood?: boolean;
    unpublishSeoProblems?: boolean;
    deleteOrphans?: boolean;
  }
) {
  const audit = await runAudit(prisma);
  const results = {
    duplicatesDeleted: 0,
    deadwoodRejected: 0,
    seoUnpublished: 0,
    orphansDeleted: 0,
    stuckRetried: 0,
    stuckRejected: 0,
    errors: [] as string[],
  };

  // ── Delete duplicate published articles (keep best copy) ──
  if (actions.deleteDupes && audit.duplicateGroups.length > 0) {
    for (const group of audit.duplicateGroups) {
      for (const dupe of group.delete) {
        try {
          // Unpublish + flag rather than hard delete (preserves audit trail)
          await prisma.blogPost.update({
            where: { id: dupe.id },
            data: {
              published: false,
              meta_description_en: `[DUPLICATE-FLAGGED:${new Date().toISOString()}] Duplicate of "${group.keep.slug}". Original kept (${group.keep.wordCount}w, SEO:${group.keep.seoScore}).`,
            },
          });
          results.duplicatesDeleted++;
        } catch (e) {
          results.errors.push(`Failed to unpublish duplicate ${dupe.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  // ── Reject deadwood drafts ──
  if (actions.rejectDeadwood) {
    // Reject all stuck drafts with 5+ attempts
    for (const s of audit.stuck.filter((s) => s.action === "reject")) {
      try {
        await prisma.articleDraft.update({
          where: { id: s.id },
          data: {
            current_phase: "rejected",
            last_error: `[article-cleanup] Rejected: stuck >24h with ${s.attempts} attempts. Previous error: ${s.error}`,
            updated_at: new Date(),
          },
        });
        results.stuckRejected++;
      } catch (e) {
        results.errors.push(`Failed to reject stuck draft ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Reset stuck drafts with <5 attempts (give them another chance)
    for (const s of audit.stuck.filter((s) => s.action === "retry")) {
      try {
        await prisma.articleDraft.update({
          where: { id: s.id },
          data: {
            phase_attempts: 0,
            last_error: `[article-cleanup] Reset for retry at ${new Date().toISOString()}. Was stuck in ${s.phase}.`,
            updated_at: new Date(),
          },
        });
        results.stuckRetried++;
      } catch (e) {
        results.errors.push(`Failed to reset stuck draft ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Unpublish SEO-hurting articles ──
  if (actions.unpublishSeoProblems) {
    const toUnpublish = audit.seoProblems.filter((p) => p.action === "unpublish");
    for (const problem of toUnpublish) {
      try {
        await prisma.blogPost.update({
          where: { id: problem.id },
          data: {
            published: false,
            meta_description_en: `[AUTO-UNPUBLISHED:${new Date().toISOString()}] SEO issues: ${problem.issues.join(", ")}`,
          },
        });
        results.seoUnpublished++;
      } catch (e) {
        results.errors.push(`Failed to unpublish ${problem.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Delete empty/flagged orphan BlogPosts ──
  if (actions.deleteOrphans) {
    const toDelete = audit.orphans.filter((o) => o.action === "delete");
    for (const orphan of toDelete) {
      try {
        await prisma.blogPost.delete({ where: { id: orphan.id } });
        results.orphansDeleted++;
      } catch (e) {
        results.errors.push(`Failed to delete orphan ${orphan.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { audit: audit.summary, results };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const audit = await runAudit(prisma);
    return NextResponse.json({ success: true, ...audit });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json().catch(() => ({}));
    const action = body.action || "audit";

    if (action === "audit") {
      const audit = await runAudit(prisma);
      return NextResponse.json({ success: true, ...audit });
    }

    if (action === "cleanup") {
      const result = await executeCleanup(prisma, {
        deleteDupes: true,
        rejectDeadwood: true,
        unpublishSeoProblems: true,
        deleteOrphans: true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "delete_dupes") {
      const result = await executeCleanup(prisma, { deleteDupes: true });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "reject_deadwood") {
      const result = await executeCleanup(prisma, { rejectDeadwood: true });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "unpublish_seo_problems") {
      const result = await executeCleanup(prisma, { unpublishSeoProblems: true });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "delete_orphans") {
      const result = await executeCleanup(prisma, { deleteOrphans: true });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
