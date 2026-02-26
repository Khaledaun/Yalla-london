/**
 * Commerce Listings API — EtsyListingDraft management
 *
 * GET: List drafts with filtering
 * POST: Generate from brief, edit, approve, status change
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId) ? siteId : getDefaultSiteId();
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 200);

    const where: Record<string, unknown> = { siteId: targetSiteId };
    if (status) where.status = status;

    const [drafts, total] = await Promise.all([
      prisma.etsyListingDraft.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.etsyListingDraft.count({ where }),
    ]);

    return NextResponse.json({ data: drafts, total });
  } catch (err) {
    console.warn("[commerce-listings] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load listings" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Generate listing from brief ──
    if (action === "generate") {
      const { briefId } = body as { briefId: string };
      if (!briefId) {
        return NextResponse.json({ error: "briefId is required" }, { status: 400 });
      }

      const { generateListingFromBrief } = await import("@/lib/commerce/listing-generator");
      const result = await generateListingFromBrief(briefId, {
        calledFrom: "/api/admin/commerce/listings",
      });

      return NextResponse.json({
        success: true,
        message: `Listing generated: "${result.title}"`,
        data: result,
      });
    }

    // ── Update draft fields ──
    if (action === "update") {
      const { prisma } = await import("@/lib/db");
      const { draftId, ...updates } = body as {
        draftId: string;
        title?: string;
        description?: string;
        tags?: string[];
        price?: number;
        section?: string;
        materials?: string[];
      };

      if (!draftId) {
        return NextResponse.json({ error: "draftId is required" }, { status: 400 });
      }

      const data: Record<string, unknown> = {};
      if (updates.title) data.title = updates.title.slice(0, 140);
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.tags) data.tags = updates.tags.slice(0, 13);
      if (updates.price) data.price = updates.price;
      if (updates.section !== undefined) data.section = updates.section;
      if (updates.materials) data.materials = updates.materials;

      const draft = await prisma.etsyListingDraft.update({
        where: { id: draftId },
        data,
      });

      return NextResponse.json({
        success: true,
        message: "Draft updated",
        data: draft,
      });
    }

    // ── Approve draft for publishing ──
    if (action === "approve") {
      const { prisma } = await import("@/lib/db");
      const { draftId } = body as { draftId: string };
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required" }, { status: 400 });
      }

      const draft = await prisma.etsyListingDraft.update({
        where: { id: draftId },
        data: {
          status: "approved",
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Draft "${draft.title}" approved`,
        data: draft,
      });
    }

    // ── Check compliance ──
    if (action === "check_compliance") {
      const { draftId } = body as { draftId: string };
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required" }, { status: 400 });
      }

      const { checkDraftCompliance } = await import("@/lib/commerce/listing-generator");
      const result = await checkDraftCompliance(draftId);

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: generate, update, approve, check_compliance` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-listings] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
