/**
 * POST /api/admin/fix-redirected-meta
 *
 * Strips the `[REDIRECTED to /target-slug]` bookkeeping prefix from
 * BlogPost meta fields. This prefix was added by a bulk consolidation
 * script that never completed — the follow-up 301/canonical/unpublish
 * step was skipped, so "bookkeeping" is now serving traffic in Google SERP.
 *
 * Scope: matches any field starting with `[REDIRECTED to ...]`. Strips the
 * bracketed prefix + any immediately following whitespace, preserving the
 * rest of the field. Dry-run mode available via query param.
 *
 * Usage:
 *   POST /api/admin/fix-redirected-meta            — apply fix
 *   POST /api/admin/fix-redirected-meta?dryRun=1   — preview without writing
 *
 * Fields scanned: meta_description_en, meta_description_ar,
 *                 meta_title_en, meta_title_ar
 *
 * Auth: requireAdmin (session) OR CRON_SECRET bearer.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REDIRECTED_PREFIX_RE = /^\s*\[REDIRECTED\s+to\s+[^\]]+\]\s*/i;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { requireAdminOrCron } = await import("@/lib/admin-middleware");
  const authError = await requireAdminOrCron(request);
  if (authError) return authError;

  try {
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
    const { prisma } = await import("@/lib/db");

    const posts = await prisma.blogPost.findMany({
      where: {
        OR: [
          { meta_description_en: { startsWith: "[REDIRECTED" } },
          { meta_description_ar: { startsWith: "[REDIRECTED" } },
          { meta_title_en: { startsWith: "[REDIRECTED" } },
          { meta_title_ar: { startsWith: "[REDIRECTED" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        siteId: true,
        meta_description_en: true,
        meta_description_ar: true,
        meta_title_en: true,
        meta_title_ar: true,
      },
      take: 500,
    });

    const changes: Array<{
      id: string;
      slug: string;
      siteId: string | null;
      fieldsFixed: string[];
      before: Record<string, string | null>;
      after: Record<string, string | null>;
    }> = [];

    for (const p of posts) {
      const fixed: Record<string, string | null> = {};
      const before: Record<string, string | null> = {};
      const fieldsFixed: string[] = [];

      for (const field of [
        "meta_description_en",
        "meta_description_ar",
        "meta_title_en",
        "meta_title_ar",
      ] as const) {
        const current = p[field];
        if (typeof current === "string" && REDIRECTED_PREFIX_RE.test(current)) {
          const stripped = current.replace(REDIRECTED_PREFIX_RE, "").trim();
          before[field] = current;
          fixed[field] = stripped.length > 0 ? stripped : null;
          fieldsFixed.push(field);
        }
      }

      if (fieldsFixed.length === 0) continue;

      changes.push({
        id: p.id,
        slug: p.slug,
        siteId: p.siteId,
        fieldsFixed,
        before,
        after: fixed,
      });

      if (!dryRun) {
        await prisma.blogPost.update({
          where: { id: p.id },
          data: fixed,
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      scannedMatches: posts.length,
      fixedCount: changes.length,
      changes: changes.map((c) => ({
        id: c.id,
        slug: c.slug,
        siteId: c.siteId,
        fieldsFixed: c.fieldsFixed,
      })),
      diff: dryRun ? changes : undefined,
      note: dryRun
        ? "DRY RUN — no DB writes. Re-POST without ?dryRun=1 to apply."
        : "Applied. Remember to trigger seo-agent to re-submit affected URLs to IndexNow.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fix-redirected-meta]", message);
    return NextResponse.json(
      { error: "Failed to fix redirected meta", details: message },
      { status: 500 },
    );
  }
}
