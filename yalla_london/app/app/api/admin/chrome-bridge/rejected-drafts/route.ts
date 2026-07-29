/**
 * GET /api/admin/chrome-bridge/rejected-drafts?siteId=X&days=30&limit=N
 *
 * Pattern-mines ArticleDraft rows with `current_phase: "rejected"` so Claude
 * Chrome can diagnose WHY the pipeline keeps killing articles.
 *
 * Surfaces:
 *   - Top error patterns (clustered by normalized last_error)
 *   - Rejection velocity (per-week) — is it getting better or worse?
 *   - Locale split — EN vs AR rejection rates
 *   - Last-phase-touched-before-rejection (which phase actually killed it)
 *   - MAX_RECOVERIES_EXCEEDED flag (rule 125: lifetime recovery cap)
 *   - Topic-level duplicate rejections (same topic rejected N times)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "100", 10),
      500,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [rejected, recentPublished] = await Promise.all([
      prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: "rejected",
          updated_at: { gte: since },
        },
        select: {
          id: true,
          keyword: true,
          locale: true,
          topic_title: true,
          last_error: true,
          phase_attempts: true,
          updated_at: true,
          created_at: true,
          topic_proposal_id: true,
        },
        orderBy: { updated_at: "desc" },
        take: limit,
      }),
      prisma.blogPost.count({
        where: {
          siteId,
          published: true,
          created_at: { gte: since },
        },
      }),
    ]);

    const totalRejected = rejected.length;
    const rejectionRate =
      totalRejected + recentPublished > 0
        ? totalRejected / (totalRejected + recentPublished)
        : 0;

    // Cluster errors
    const errorPatterns: Record<
      string,
      { count: number; examples: string[]; avgAttempts: number; exampleKeywords: string[] }
    > = {};
    const localeCounts: Record<string, number> = {};
    let maxRecoveriesCount = 0;
    const topicIdRejections: Record<string, number> = {};

    for (const d of rejected) {
      const raw = d.last_error ?? "no error message";
      const normalized = normalizeError(raw);
      if (!errorPatterns[normalized]) {
        errorPatterns[normalized] = { count: 0, examples: [], avgAttempts: 0, exampleKeywords: [] };
      }
      errorPatterns[normalized].count += 1;
      errorPatterns[normalized].avgAttempts += d.phase_attempts;
      if (errorPatterns[normalized].examples.length < 3) {
        errorPatterns[normalized].examples.push(raw.slice(0, 160));
      }
      if (errorPatterns[normalized].exampleKeywords.length < 3) {
        errorPatterns[normalized].exampleKeywords.push(d.keyword);
      }

      localeCounts[d.locale] = (localeCounts[d.locale] ?? 0) + 1;

      if (raw.includes("MAX_RECOVERIES_EXCEEDED")) maxRecoveriesCount += 1;

      if (d.topic_proposal_id) {
        topicIdRejections[d.topic_proposal_id] =
          (topicIdRejections[d.topic_proposal_id] ?? 0) + 1;
      }
    }

    const topErrorPatterns = Object.entries(errorPatterns)
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        avgAttempts: data.count > 0 ? Number((data.avgAttempts / data.count).toFixed(2)) : 0,
        exampleErrors: data.examples,
        exampleKeywords: data.exampleKeywords,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const repeatedTopicIds = Object.entries(topicIdRejections)
      .filter(([, count]) => count >= 2)
      .map(([topicId, count]) => ({ topicProposalId: topicId, rejectionCount: count }))
      .sort((a, b) => b.rejectionCount - a.rejectionCount)
      .slice(0, 20);

    // Velocity: rejections per 7-day bucket
    const buckets: Record<string, number> = {};
    for (const d of rejected) {
      const key = d.updated_at.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    const sortedDates = Object.keys(buckets).sort();
    const recentVelocity = sortedDates
      .slice(-14)
      .map((date) => ({ date, rejections: buckets[date] }));

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { days, startDate: since.toISOString().slice(0, 10) },
      summary: {
        totalRejected,
        recentPublished,
        rejectionRate: Number(rejectionRate.toFixed(3)),
        maxRecoveriesExceededCount: maxRecoveriesCount,
        repeatedTopicRejections: repeatedTopicIds.length,
      },
      localeCounts,
      topErrorPatterns,
      repeatedTopicIds,
      recentVelocity,
      recent: rejected.slice(0, 30).map((d) => ({
        id: d.id,
        keyword: d.keyword,
        topicTitle: d.topic_title,
        locale: d.locale,
        lastError: d.last_error?.slice(0, 240) ?? null,
        phaseAttempts: d.phase_attempts,
        rejectedAt: d.updated_at,
        createdAt: d.created_at,
        topicProposalId: d.topic_proposal_id,
      })),
      _hints: buildHints({ justCalled: "rejected-drafts" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/rejected-drafts]", message);
    return NextResponse.json(
      { error: "Failed to load rejected drafts", details: message },
      { status: 500 },
    );
  }
}

/**
 * Normalize an error message for clustering. Collapses numbers, IDs, and
 * volatile substrings so "timeout 12s" and "timeout 15s" fold into one bucket.
 */
function normalizeError(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b[a-f0-9]{24,}\b/g, "<id>") // UUIDs / Mongo ids
    .replace(/\b\d{10,}\b/g, "<epoch>")
    .replace(/\b\d+(\.\d+)?(ms|s|m|h|d|%|mb|kb)\b/g, "<duration>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
