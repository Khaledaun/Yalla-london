/**
 * Cron: /api/cron/quality-recovery-runner
 *
 * Weekly auto-trigger for Chrome Bridge's quality-recovery loop. Checks each
 * active site for ≥5 not-indexed pages (Google's "Crawled - currently not
 * indexed" signal) and auto-creates a Campaign targeting them.
 *
 * Schedule: weekly Sunday 07:30 UTC (after gsc-sync has fresh coverage data).
 *
 * Replaces the manual POST /api/admin/chrome-bridge/enhance-not-indexed
 * curl — Khaled never has to trigger this by hand.
 *
 * Skip conditions:
 *   - Site already has an active/queued quality-recovery Campaign
 *   - <5 eligible not-indexed pages (not worth the overhead)
 *   - <7 days since last quality-recovery campaign (let prior one finish)
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 280_000;
const MIN_ELIGIBLE_PAGES = 5;
const SKIP_IF_RECENT_DAYS = 7;
const MIN_AGE_DAYS = 7;

interface TriageOperations {
  operations: string[];
  skipCampaign?: boolean;
}

const TRIAGE_TO_OPS: Record<string, TriageOperations> = {
  thin_content: { operations: ["expand_content", "add_authenticity"] },
  ai_generic_heavy: { operations: ["add_authenticity"] },
  low_authenticity: { operations: ["add_authenticity"] },
  generic_author: { operations: [], skipCampaign: true },
  low_seo_score: {
    operations: ["fix_meta_description", "fix_meta_title", "add_internal_links"],
  },
  shallow_depth: { operations: ["expand_content", "add_internal_links"] },
  quality_depth_unclear: { operations: ["expand_content", "add_authenticity"] },
  no_blogpost: { operations: [], skipCampaign: true },
};

const AUTH_PATTERNS = [
  /\bwe visited\b/gi, /\bwe tested\b/gi, /\bwe stayed\b/gi, /\bwe tried\b/gi,
  /\binsider tip\b/gi, /\bpro tip\b/gi, /\bwhen I\b/gi, /\bI recommend\b/gi,
  /\bin my experience\b/gi, /\bhonestly\b/gi,
];

const AI_PATTERNS = [
  /\bnestled in\b/gi, /\blook no further\b/gi, /\bwhether you'?re a\b/gi,
  /\bin this comprehensive guide\b/gi, /\bin conclusion\b/gi,
  /\bit'?s worth noting\b/gi, /\bwithout further ado\b/gi,
  /\bembark on a journey\b/gi, /\bdiscover the pinnacle\b/gi, /\bhidden gem\b/gi,
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const cronStart = Date.now();

  // Standard cron auth: allow if CRON_SECRET unset, else require Bearer match
  const authHeader = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (secret && !authHeader.includes(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/db");
  const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");

  const results = {
    sitesScanned: 0,
    campaignsCreated: 0,
    campaignIds: [] as string[],
    skipped: [] as Array<{ siteId: string; reason: string }>,
    errors: [] as string[],
  };

  const siteIds = getActiveSiteIds();
  const recentCutoff = new Date(Date.now() - SKIP_IF_RECENT_DAYS * 24 * 60 * 60 * 1000);
  const ageCutoff = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);

  for (const siteId of siteIds) {
    if (Date.now() - cronStart > BUDGET_MS) {
      results.skipped.push({ siteId, reason: "budget_exhausted" });
      continue;
    }
    results.sitesScanned++;

    try {
      // Skip if recent campaign exists
      const recent = await prisma.campaign.findFirst({
        where: {
          siteId,
          type: "enhance_content",
          createdAt: { gte: recentCutoff },
          config: { path: ["source"], equals: "chrome-bridge/enhance-not-indexed" },
        },
        select: { id: true, status: true, createdAt: true },
      });
      if (recent) {
        results.skipped.push({
          siteId,
          reason: `recent_campaign: ${recent.id} (status=${recent.status}, age=${Math.floor((Date.now() - new Date(recent.createdAt).getTime()) / 86_400_000)}d)`,
        });
        continue;
      }

      // Get not-indexed URLs
      const domain = getSiteDomain(siteId).replace(/\/$/, "");
      const indexingRows = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          OR: [
            { status: "not_indexed" },
            { coverage_state: { contains: "Crawled", mode: "insensitive" } },
            { coverage_state: { contains: "Discovered", mode: "insensitive" } },
          ],
        },
        orderBy: { last_inspected_at: "desc" },
        take: 60,
        select: { url: true, slug: true },
      });

      if (indexingRows.length < MIN_ELIGIBLE_PAGES) {
        results.skipped.push({
          siteId,
          reason: `below_threshold: ${indexingRows.length}<${MIN_ELIGIBLE_PAGES}`,
        });
        continue;
      }

      const slugs = indexingRows
        .map((r) => r.slug ?? extractSlug(r.url, domain))
        .filter((s): s is string => !!s);

      const posts = await prisma.blogPost.findMany({
        where: {
          siteId,
          slug: { in: slugs },
          published: true,
          deletedAt: null,
          created_at: { lt: ageCutoff },
        },
        select: {
          id: true,
          slug: true,
          title_en: true,
          content_en: true,
          seo_score: true,
        },
        take: 30,
      });

      // Build plan
      const plan: Array<{
        postId: string;
        slug: string;
        title: string;
        triage: string;
        operations: string[];
        targetUrl: string;
      }> = [];

      for (const post of posts) {
        const content = post.content_en ?? "";
        const text = content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const authSignals = AUTH_PATTERNS.reduce(
          (s, p) => s + (text.match(p) || []).length,
          0,
        );
        const aiGeneric = AI_PATTERNS.reduce(
          (s, p) => s + (text.match(p) || []).length,
          0,
        );
        const triage = quickTriage(wordCount, authSignals, aiGeneric, post.seo_score);
        const spec = TRIAGE_TO_OPS[triage];
        if (!spec || spec.skipCampaign || spec.operations.length === 0) continue;

        plan.push({
          postId: post.id,
          slug: post.slug,
          title: post.title_en,
          triage,
          operations: spec.operations,
          targetUrl: `${domain}/blog/${post.slug}`,
        });
      }

      if (plan.length < MIN_ELIGIBLE_PAGES) {
        results.skipped.push({
          siteId,
          reason: `plan_below_threshold: ${plan.length}<${MIN_ELIGIBLE_PAGES} after triage`,
        });
        continue;
      }

      const allOps = [...new Set(plan.flatMap((p) => p.operations))];

      const campaign = await prisma.campaign.create({
        data: {
          siteId,
          name: `Quality Recovery (auto): ${new Date().toISOString().slice(0, 10)}`,
          type: "enhance_content",
          status: "queued",
          priority: 3,
          config: {
            operations: allOps,
            aiModel: "grok-4-1-fast",
            minWordCountTarget: 1500,
            dryRun: false,
            source: "chrome-bridge/enhance-not-indexed",
            autoTriggered: true,
            triageDistribution: summarize(plan.map((p) => p.triage)),
          } as unknown as object,
          maxItemsPerRun: 3,
          totalItems: plan.length,
          createdBy: "quality-recovery-runner",
        },
      });

      await prisma.campaignItem.createMany({
        data: plan.map((item) => ({
          campaignId: campaign.id,
          blogPostId: item.postId,
          targetUrl: item.targetUrl,
          targetTitle: item.title,
          status: "pending",
          maxAttempts: 3,
        })),
      });

      results.campaignsCreated++;
      results.campaignIds.push(campaign.id);
      console.log(
        `[quality-recovery-runner] Created campaign ${campaign.id} for ${siteId} (${plan.length} items)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${siteId}: ${msg}`);
      console.error(`[quality-recovery-runner] ${siteId}:`, msg);
    }
  }

  // Log to CronJobLog
  try {
    await prisma.cronJobLog.create({
      data: {
        job_name: "quality-recovery-runner",
        job_type: "scheduled",
        status: results.errors.length === 0 ? "completed" : "partial",
        started_at: new Date(cronStart),
        completed_at: new Date(),
        duration_ms: Date.now() - cronStart,
        items_processed: results.sitesScanned,
        items_succeeded: results.campaignsCreated,
        items_failed: results.errors.length,
        result_summary: results as unknown as object,
      },
    });
  } catch (err) {
    console.warn(
      "[quality-recovery-runner] cron log failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - cronStart,
    ...results,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractSlug(url: string, domain: string): string | null {
  const prefix = `${domain}/blog/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length).split("/")[0].split("?")[0].split("#")[0] || null;
}

function quickTriage(
  wordCount: number,
  authSignals: number,
  aiGeneric: number,
  seoScore: number | null,
): string {
  if (wordCount < 500) return "thin_content";
  if (aiGeneric >= 5 && authSignals < 2) return "ai_generic_heavy";
  if (authSignals < 2) return "low_authenticity";
  if (seoScore !== null && seoScore < 60) return "low_seo_score";
  if (wordCount < 1000) return "shallow_depth";
  return "quality_depth_unclear";
}

function summarize(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i] = (out[i] ?? 0) + 1;
  return out;
}
