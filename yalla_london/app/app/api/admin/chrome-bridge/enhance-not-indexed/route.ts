/**
 * POST /api/admin/chrome-bridge/enhance-not-indexed
 *
 * Creates a Campaign + CampaignItems targeting URLs where Google declined
 * indexing ("Crawled - currently not indexed"). Uses the triage data from
 * /not-indexed-details to select the right enhancement operations per
 * triage bucket:
 *
 *   thin_content       → expand_content + add_authenticity
 *   ai_generic_heavy   → add_authenticity (prioritized to rewrite AI lang)
 *   low_authenticity   → add_authenticity
 *   generic_author     → flag for manual author reassignment (no campaign op)
 *   low_seo_score      → fix_meta_description + fix_meta_title + add_internal_links
 *   shallow_depth      → expand_content + add_internal_links
 *   quality_depth_unclear → expand_content + add_authenticity (safe defaults)
 *
 * Auth: requireAdminOrCron.
 *
 * Body params:
 *   - siteId (required)
 *   - dryRun (optional, default false)  — preview without creating campaign
 *   - limit (optional, default 29, max 100) — cap total items
 *   - minAge (optional, default 7)       — skip pages <N days old (give Google time)
 *
 * Returns campaignId (or null if dryRun) + per-item plan.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TriageOperations {
  operations: string[];
  notes: string;
  skipCampaign?: boolean;
}

const TRIAGE_TO_OPS: Record<string, TriageOperations> = {
  thin_content: {
    operations: ["expand_content", "add_authenticity"],
    notes: "Thin content <500 words. Expand to 1500+ with first-hand signals.",
  },
  ai_generic_heavy: {
    operations: ["add_authenticity"],
    notes: "AI-generic language dominates. Rewrite to first-hand voice.",
  },
  low_authenticity: {
    operations: ["add_authenticity"],
    notes: "Under 2 first-hand signals. Add insider tips + personal observations.",
  },
  generic_author: {
    operations: [],
    skipCampaign: true,
    notes: "Author is 'Editorial'/'Team'/etc. Manual author reassignment required (campaign system does not change bylines).",
  },
  low_seo_score: {
    operations: ["fix_meta_description", "fix_meta_title", "add_internal_links"],
    notes: "SEO score <60. Meta optimization + internal link injection.",
  },
  shallow_depth: {
    operations: ["expand_content", "add_internal_links"],
    notes: "500-999 words. Expand for depth + link to cluster pages.",
  },
  quality_depth_unclear: {
    operations: ["expand_content", "add_authenticity"],
    notes: "Ambiguous — apply safe defaults (expand + authenticity).",
  },
  no_blogpost: {
    operations: [],
    skipCampaign: true,
    notes: "URL tracked but no BlogPost row. Likely legacy or deleted. Manual investigation.",
  },
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { requireAdminOrCron } = await import("@/lib/admin-middleware");
  const authError = await requireAdminOrCron(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId: string = body.siteId || getDefaultSiteId();
    const dryRun: boolean = body.dryRun === true;
    const limit: number = Math.min(body.limit ?? 29, 100);
    const minAge: number = body.minAge ?? 7;
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    // Fetch the not-indexed URLs (same query as /not-indexed-details)
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
      take: limit * 2, // oversample in case some have no BlogPost
      select: { url: true, slug: true },
    });

    if (indexingRows.length === 0) {
      return NextResponse.json({
        success: true,
        siteId,
        campaignId: null,
        itemCount: 0,
        note: "No not-indexed URLs found. Site quality signals are healthy.",
      });
    }

    const slugs = indexingRows
      .map((r) => r.slug ?? extractSlug(r.url, domain))
      .filter((s): s is string => !!s);

    const cutoff = new Date(Date.now() - minAge * 24 * 60 * 60 * 1000);
    const posts = await prisma.blogPost.findMany({
      where: {
        siteId,
        slug: { in: slugs },
        created_at: { lt: cutoff }, // give Google time before interfering
      },
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        seo_score: true,
        meta_description_en: true,
      },
      take: limit,
    });

    // Build per-item plan
    const plan: Array<{
      postId: string;
      slug: string;
      title: string;
      triage: string;
      operations: string[];
      notes: string;
      targetUrl: string;
    }> = [];

    for (const post of posts) {
      const content = post.content_en ?? "";
      const strippedText = content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = strippedText.split(/\s+/).filter(Boolean).length;
      const authenticitySignals = countAuthenticitySignals(strippedText);
      const aiGeneric = countAiGenericPhrases(strippedText);

      const triage = quickTriage(wordCount, authenticitySignals, aiGeneric, post.seo_score);
      const spec = TRIAGE_TO_OPS[triage];
      if (!spec || spec.skipCampaign || spec.operations.length === 0) continue;

      plan.push({
        postId: post.id,
        slug: post.slug,
        title: post.title_en,
        triage,
        operations: spec.operations,
        notes: spec.notes,
        targetUrl: `${domain}/blog/${post.slug}`,
      });
    }

    if (plan.length === 0) {
      return NextResponse.json({
        success: true,
        siteId,
        campaignId: null,
        itemCount: 0,
        note: "No campaign-eligible pages found. All not-indexed URLs are either too new (<minAge days), require manual action (generic author), or have no BlogPost row.",
        totalFound: indexingRows.length,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        siteId,
        campaignId: null,
        itemCount: plan.length,
        plan,
        note: "DRY RUN — no Campaign created. Re-POST with dryRun=false to create campaign and queue items.",
      });
    }

    // Create Campaign + CampaignItems
    // Use union of all operations across items (processor applies per-item subset)
    const allOperations = [...new Set(plan.flatMap((p) => p.operations))];

    const campaign = await prisma.campaign.create({
      data: {
        siteId,
        name: `Quality Recovery: not-indexed pages (${new Date().toISOString().slice(0, 10)})`,
        type: "enhance_content",
        status: "queued",
        priority: 2, // high — these pages are losing Google equity
        config: {
          operations: allOperations,
          aiModel: "grok-4-1-fast",
          minWordCountTarget: 1500,
          dryRun: false,
          source: "chrome-bridge/enhance-not-indexed",
          triageDistribution: summarize(plan.map((p) => p.triage)),
        } as unknown as object,
        maxItemsPerRun: 3,
        totalItems: plan.length,
        createdBy: "chrome-bridge",
      },
    });

    // Batch-create CampaignItems
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

    return NextResponse.json({
      success: true,
      siteId,
      campaignId: campaign.id,
      itemCount: plan.length,
      operationsScope: allOperations,
      triageDistribution: summarize(plan.map((p) => p.triage)),
      plan,
      note: "Campaign created and queued. Runs via campaign-executor cron every 30 min. Progress visible at /admin/automation or via GET /api/admin/campaigns.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/enhance-not-indexed]", message);
    return NextResponse.json(
      { error: "Failed to create enhancement campaign", details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from not-indexed-details for self-containment)
// ---------------------------------------------------------------------------

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

function countAuthenticitySignals(text: string): number {
  return AUTH_PATTERNS.reduce((s, p) => s + (text.match(p) || []).length, 0);
}

function countAiGenericPhrases(text: string): number {
  return AI_PATTERNS.reduce((s, p) => s + (text.match(p) || []).length, 0);
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

function extractSlug(url: string, domain: string): string | null {
  const prefix = `${domain}/blog/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length).split("/")[0].split("?")[0].split("#")[0] || null;
}

function summarize(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i] = (out[i] ?? 0) + 1;
  return out;
}
