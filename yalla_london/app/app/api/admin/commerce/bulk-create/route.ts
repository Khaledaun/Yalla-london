/**
 * Bulk Create API — Generate multiple Etsy listings from a single theme
 *
 * GET:  Returns available templates + recent bulk runs from CronJobLog
 * POST: { action: "generate_ideas" | "execute_bulk", ... }
 *   - generate_ideas: AI generates product ideas for user review
 *   - execute_bulk: Creates all listings with budget guard (53s max)
 *
 * Protected with requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

// ─── GET: Templates + Recent Runs ───────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { BULK_TEMPLATES } = await import("@/lib/commerce/bulk-creator");
    const { prisma } = await import("@/lib/db");

    const siteId =
      request.headers.get("x-site-id") ?? getDefaultSiteId();

    // Fetch recent bulk create runs from CronJobLog (tagged "bulk-create")
    let recentRuns: {
      id: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
      itemsProcessed: number | null;
      errorMessage: string | null;
      resultJson: unknown;
    }[] = [];

    try {
      recentRuns = await prisma.cronJobLog.findMany({
        where: {
          jobName: "bulk-create",
          siteId,
        },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          itemsProcessed: true,
          errorMessage: true,
          resultJson: true,
        },
      });
    } catch (err) {
      console.warn("[bulk-create] Failed to query recent runs:", err instanceof Error ? err.message : "unknown");
    }

    // Count existing briefs + drafts for this site
    let briefCount = 0;
    let draftCount = 0;
    try {
      [briefCount, draftCount] = await Promise.all([
        prisma.productBrief.count({ where: { siteId } }),
        prisma.etsyListingDraft.count({ where: { siteId } }),
      ]);
    } catch (err) {
      console.warn("[bulk-create] Failed to count briefs/drafts:", err instanceof Error ? err.message : "unknown");
    }

    return NextResponse.json({
      success: true,
      templates: BULK_TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        count: t.count,
        defaultCategory: t.defaultCategory,
        defaultTier: t.defaultTier,
      })),
      recentRuns: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        itemsProcessed: r.itemsProcessed,
        errorMessage: r.errorMessage,
        result: r.resultJson,
      })),
      stats: {
        totalBriefs: briefCount,
        totalDrafts: draftCount,
      },
      siteId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load bulk create data";
    console.error("[bulk-create] GET error:", message);
    return NextResponse.json(
      { success: false, error: "Failed to load bulk create data" },
      { status: 500 },
    );
  }
}

// ─── POST: Generate Ideas or Execute Bulk ───────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: {
    action: "generate_ideas" | "execute_bulk";
    theme?: string;
    templateId?: string;
    count?: number;
    siteId?: string;
    ideas?: {
      idea: string;
      suggestedCategory: string;
      suggestedPrice: number;
      rationale: string;
    }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !["generate_ideas", "execute_bulk"].includes(body.action)) {
    return NextResponse.json(
      { error: "action must be 'generate_ideas' or 'execute_bulk'" },
      { status: 400 },
    );
  }

  const siteId = body.siteId ?? getDefaultSiteId();

  // ── Action: Generate Ideas ──

  if (body.action === "generate_ideas") {
    const {
      generateBulkIdeas,
      BULK_TEMPLATES,
    } = await import("@/lib/commerce/bulk-creator");

    // Resolve theme: either from templateId or custom theme text
    let theme = body.theme?.trim() ?? "";
    let count = body.count ?? 5;

    if (body.templateId) {
      const template = BULK_TEMPLATES.find((t) => t.id === body.templateId);
      if (!template) {
        return NextResponse.json(
          { error: `Template "${body.templateId}" not found` },
          { status: 400 },
        );
      }
      theme = template.theme;
      count = template.count;
    }

    if (!theme || theme.length < 10) {
      return NextResponse.json(
        { error: "Theme must be at least 10 characters (or provide a templateId)" },
        { status: 400 },
      );
    }

    // Clamp count
    count = Math.min(Math.max(count, 1), 20);

    try {
      const startMs = Date.now();
      const ideas = await generateBulkIdeas(theme, count, siteId);
      const elapsedMs = Date.now() - startMs;

      return NextResponse.json({
        success: true,
        action: "generate_ideas",
        ideas,
        count: ideas.length,
        requestedCount: count,
        theme: theme.slice(0, 200),
        templateId: body.templateId ?? null,
        elapsedMs,
        siteId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Idea generation failed";
      console.error("[bulk-create] generate_ideas error:", message);
      return NextResponse.json(
        { success: false, error: "Failed to generate ideas" },
        { status: 500 },
      );
    }
  }

  // ── Action: Execute Bulk Create ──

  if (body.action === "execute_bulk") {
    if (!Array.isArray(body.ideas) || body.ideas.length === 0) {
      return NextResponse.json(
        { error: "ideas array is required for execute_bulk" },
        { status: 400 },
      );
    }

    // Validate ideas array
    const validIdeas = body.ideas.filter(
      (i) => i && typeof i.idea === "string" && i.idea.length > 0,
    );

    if (validIdeas.length === 0) {
      return NextResponse.json(
        { error: "No valid ideas provided" },
        { status: 400 },
      );
    }

    // Clamp to 20 max
    const clampedIdeas = validIdeas.slice(0, 20);

    try {
      const { executeBulkCreate } = await import("@/lib/commerce/bulk-creator");
      const { prisma } = await import("@/lib/db");

      const result = await executeBulkCreate(clampedIdeas, siteId, {
        budgetSeconds: 53,
      });

      // Log the bulk run to CronJobLog for history tracking
      try {
        await prisma.cronJobLog.create({
          data: {
            jobName: "bulk-create",
            siteId,
            status: result.failed.length === 0 ? "success" : "partial",
            startedAt: new Date(Date.now() - result.totalMs),
            completedAt: new Date(),
            itemsProcessed: result.created.length,
            errorMessage:
              result.failed.length > 0
                ? `${result.failed.length} failed: ${result.failed.map((f) => f.error).join("; ").slice(0, 500)}`
                : null,
            resultJson: {
              createdCount: result.created.length,
              failedCount: result.failed.length,
              totalMs: result.totalMs,
              createdIds: result.created.map((c) => ({
                briefId: c.briefId,
                draftId: c.draftId,
                title: c.title.slice(0, 80),
              })),
              failures: result.failed.map((f) => ({
                idea: f.idea.slice(0, 80),
                error: f.error.slice(0, 200),
              })),
            },
          },
        });
      } catch (logErr) {
        console.warn("[bulk-create] Failed to log run:", logErr instanceof Error ? logErr.message : "unknown");
      }

      return NextResponse.json({
        success: true,
        action: "execute_bulk",
        created: result.created.map((c) => ({
          briefId: c.briefId,
          draftId: c.draftId,
          title: c.title,
          price: c.price,
          suggestedCategory: c.suggestedCategory,
          complianceValid: c.complianceValid,
          complianceIssues: c.complianceIssues,
        })),
        failed: result.failed,
        summary: {
          requested: clampedIdeas.length,
          created: result.created.length,
          failed: result.failed.length,
          totalMs: result.totalMs,
        },
        siteId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk creation failed";
      console.error("[bulk-create] execute_bulk error:", message);
      return NextResponse.json(
        { success: false, error: "Bulk creation failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
