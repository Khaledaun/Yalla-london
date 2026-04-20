/**
 * Cron: /api/cron/ai-voice-rewrite-runner
 *
 * Weekly voice-rewrite auto-trigger. Closes the AIO grade gap flagged by
 * Chrome Bridge audit (Jan 2026 Google Authenticity Update): first-paragraph
 * AI-generic language is the #1 ceiling on AIO score.
 *
 * Scope beyond quality-recovery-runner: targets ALL published articles, not
 * just `not_indexed` ones. Prioritizes by GSC impressions (fastest grade
 * move per dollar of AI budget).
 *
 * Schedule: weekly Sunday 08:00 UTC (30 min after quality-recovery-runner
 * at 07:30 so they don't collide on the same article).
 *
 * Candidate criteria:
 *   - Published ≥14 days ago (Google's had time to crawl)
 *   - First 80 words contain ≥2 AI-generic phrases
 *   - OR site-wide authenticity ratio <2 per 1000 words
 *   - NOT already in active voice-rewrite or quality-recovery campaign
 *   - Has GSC impressions in last 30 days (ranks top by impressions)
 *
 * Output: Campaign(type=enhance_content, operations=[add_authenticity],
 * source=ai-voice-rewrite) with up to 50 items per site. campaign-executor
 * cron processes 3/30min.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 280_000;
const MIN_ELIGIBLE_PAGES = 10;
const SKIP_IF_RECENT_DAYS = 7;
const MIN_AGE_DAYS = 14;
const ITEMS_PER_SITE = 50;
const SCAN_POOL_PER_SITE = 400; // oversample before sorting by impressions

const AI_OPENER_PATTERNS = [
  /\bnestled in\b/gi,
  /\blook no further\b/gi,
  /\bwhether you'?re a\b/gi,
  /\bin this comprehensive guide\b/gi,
  /\bembark on a journey\b/gi,
  /\bdiscover the pinnacle\b/gi,
  /\bhidden gem\b/gi,
  /\bstep into a world\b/gi,
  /\bimagine stepping\b/gi,
  /\binto a world where\b/gi,
  /\bintricate\b/gi,
  /\btailored for\b/gi,
  /\bin the heart of\b/gi,
  /\bpinnacle of luxury\b/gi,
];

const AUTH_PATTERNS = [
  /\bwe visited\b/gi,
  /\bwe tested\b/gi,
  /\bwe stayed\b/gi,
  /\bwe tried\b/gi,
  /\binsider tip\b/gi,
  /\bpro tip\b/gi,
  /\bwhen I\b/gi,
  /\bI recommend\b/gi,
  /\bin my experience\b/gi,
  /\bhonestly\b/gi,
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const cronStart = Date.now();

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
    totalItems: 0,
    skipped: [] as Array<{ siteId: string; reason: string }>,
    errors: [] as string[],
  };

  const siteIds = getActiveSiteIds();
  const recentCutoff = new Date(
    Date.now() - SKIP_IF_RECENT_DAYS * 24 * 60 * 60 * 1000,
  );
  const ageCutoff = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
  const gscSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const siteId of siteIds) {
    if (Date.now() - cronStart > BUDGET_MS - 10_000) {
      results.skipped.push({ siteId, reason: "budget_exhausted" });
      continue;
    }
    results.sitesScanned++;

    try {
      // Skip if a recent voice-rewrite or quality-recovery campaign exists
      const recent = await prisma.campaign.findFirst({
        where: {
          siteId,
          type: "enhance_content",
          status: { in: ["queued", "running", "paused"] },
          createdAt: { gte: recentCutoff },
          OR: [
            { config: { path: ["source"], equals: "ai-voice-rewrite" } },
            {
              config: {
                path: ["source"],
                equals: "chrome-bridge/enhance-not-indexed",
              },
            },
          ],
        },
        select: { id: true, status: true, createdAt: true },
      });
      if (recent) {
        results.skipped.push({
          siteId,
          reason: `recent_campaign: ${recent.id} (status=${recent.status})`,
        });
        continue;
      }

      const domain = getSiteDomain(siteId).replace(/\/$/, "");

      // Collect active-campaign blogPostIds to exclude (don't double-queue)
      const activeCampaignItems = await prisma.campaignItem.findMany({
        where: {
          status: { in: ["pending", "processing"] },
          campaign: { siteId },
        },
        select: { blogPostId: true },
      });
      const excludedIds = new Set(
        activeCampaignItems
          .map((i) => i.blogPostId)
          .filter((id): id is string => !!id),
      );

      // Oversample candidates
      const posts = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          deletedAt: null,
          created_at: { lt: ageCutoff },
          id: { notIn: [...excludedIds] },
        },
        select: {
          id: true,
          slug: true,
          title_en: true,
          content_en: true,
          seo_score: true,
        },
        orderBy: { created_at: "desc" },
        take: SCAN_POOL_PER_SITE,
      });

      // Filter to voice-problem candidates
      type Candidate = {
        post: typeof posts[number];
        openerHits: number;
        authRatio: number;
        wordCount: number;
      };
      const candidates: Candidate[] = [];

      for (const post of posts) {
        const text = (post.content_en ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length < 200) continue;

        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const first80 = words.slice(0, 80).join(" ");

        const openerHits = AI_OPENER_PATTERNS.reduce(
          (s, p) => s + (first80.match(p) || []).length,
          0,
        );
        const totalAuth = AUTH_PATTERNS.reduce(
          (s, p) => s + (text.match(p) || []).length,
          0,
        );
        const authRatio = wordCount > 0 ? totalAuth / (wordCount / 1000) : 0;

        const isVoiceProblem = openerHits >= 2 || authRatio < 2;
        if (!isVoiceProblem) continue;

        candidates.push({ post, openerHits, authRatio, wordCount });
      }

      if (candidates.length < MIN_ELIGIBLE_PAGES) {
        results.skipped.push({
          siteId,
          reason: `below_threshold: ${candidates.length} candidates < ${MIN_ELIGIBLE_PAGES}`,
        });
        continue;
      }

      // Rank by GSC impressions (30d) to prioritize highest-traffic rewrites
      const urls = candidates.map((c) => `${domain}/blog/${c.post.slug}`);
      const impressionRows = await prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, url: { in: urls }, date: { gte: gscSince } },
        _sum: { impressions: true },
      });
      const impressionsByUrl = new Map(
        impressionRows.map((r) => [r.url, r._sum.impressions ?? 0]),
      );

      const ranked = candidates
        .map((c) => ({
          ...c,
          impressions30d:
            impressionsByUrl.get(`${domain}/blog/${c.post.slug}`) ?? 0,
        }))
        .sort((a, b) => {
          // Primary: impressions desc. Tiebreaker: more opener hits first.
          if (b.impressions30d !== a.impressions30d) {
            return b.impressions30d - a.impressions30d;
          }
          return b.openerHits - a.openerHits;
        })
        .slice(0, ITEMS_PER_SITE);

      if (ranked.length < MIN_ELIGIBLE_PAGES) {
        results.skipped.push({
          siteId,
          reason: `ranked_below_threshold: ${ranked.length}`,
        });
        continue;
      }

      const campaign = await prisma.campaign.create({
        data: {
          siteId,
          name: `AI Voice Rewrite (auto): ${new Date().toISOString().slice(0, 10)}`,
          type: "enhance_content",
          status: "queued",
          priority: 4,
          config: {
            operations: ["add_authenticity"],
            aiModel: "grok-4-1-fast",
            minWordCountTarget: 1500,
            dryRun: false,
            source: "ai-voice-rewrite",
            autoTriggered: true,
            rankingSignal: "gsc_impressions_30d",
            candidateCount: candidates.length,
            rankedCount: ranked.length,
          } as unknown as object,
          maxItemsPerRun: 3,
          totalItems: ranked.length,
          createdBy: "ai-voice-rewrite-runner",
        },
      });

      await prisma.campaignItem.createMany({
        data: ranked.map((c) => ({
          campaignId: campaign.id,
          blogPostId: c.post.id,
          targetUrl: `${domain}/blog/${c.post.slug}`,
          targetTitle: c.post.title_en,
          status: "pending",
          maxAttempts: 3,
        })),
      });

      results.campaignsCreated++;
      results.campaignIds.push(campaign.id);
      results.totalItems += ranked.length;
      console.log(
        `[ai-voice-rewrite-runner] ${siteId}: created campaign ${campaign.id} (${ranked.length} items, top impressions ${ranked[0]?.impressions30d ?? 0})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${siteId}: ${msg}`);
      console.error(`[ai-voice-rewrite-runner] ${siteId}:`, msg);
    }
  }

  try {
    await prisma.cronJobLog.create({
      data: {
        job_name: "ai-voice-rewrite-runner",
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
      "[ai-voice-rewrite-runner] cron log failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - cronStart,
    ...results,
  });
}
