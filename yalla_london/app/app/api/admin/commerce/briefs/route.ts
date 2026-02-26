/**
 * Commerce Briefs API — ProductBrief CRUD + approve/reject
 *
 * GET: List/filter ProductBriefs
 * POST: Create manual brief or approve/reject
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
    const targetSiteId = activeSiteIds.includes(siteId)
      ? siteId
      : getDefaultSiteId();

    const status = searchParams.get("status") ?? undefined;
    const tier = searchParams.get("tier")
      ? parseInt(searchParams.get("tier")!)
      : undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50") || 50,
      200,
    );
    const offset = parseInt(searchParams.get("offset") ?? "0") || 0;

    const where: Record<string, unknown> = { siteId: targetSiteId };
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const [briefs, total] = await Promise.all([
      prisma.productBrief.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          trendRun: {
            select: { id: true, runDate: true },
          },
        },
      }),
      prisma.productBrief.count({ where }),
    ]);

    // Summary counts by status
    const statusCounts = await prisma.productBrief.groupBy({
      by: ["status"],
      where: { siteId: targetSiteId },
      _count: true,
    });

    return NextResponse.json({
      data: briefs,
      summary: {
        total,
        siteId: targetSiteId,
        byStatus: statusCounts.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    console.warn(
      "[commerce-briefs] GET error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to load briefs" },
      { status: 500 },
    );
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json(
        { error: "action is required" },
        { status: 400 },
      );
    }

    const activeSiteIds = getActiveSiteIds();

    // ── Create a manual brief ──
    if (action === "create") {
      const {
        siteId: requestedSiteId,
        title,
        description,
        productType,
        tier,
        ontologyCategory,
        targetPrice,
        keywords,
      } = body as {
        siteId?: string;
        title: string;
        description?: string;
        productType?: string;
        tier?: number;
        ontologyCategory?: string;
        targetPrice?: number;
        keywords?: string[];
      };

      if (!title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 },
        );
      }

      const siteId =
        requestedSiteId && activeSiteIds.includes(requestedSiteId)
          ? requestedSiteId
          : getDefaultSiteId();

      const brief = await prisma.productBrief.create({
        data: {
          siteId,
          title,
          description: description ?? "",
          productType: productType ?? "TEMPLATE",
          tier: tier ?? 2,
          ontologyCategory: ontologyCategory ?? null,
          targetPrice: targetPrice ?? 999,
          currency: "USD",
          keywordsJson: keywords ?? [],
          status: "draft",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Brief "${title}" created`,
        data: brief,
      });
    }

    // ── Approve a brief ──
    if (action === "approve") {
      const { briefId } = body as { briefId: string };
      if (!briefId) {
        return NextResponse.json(
          { error: "briefId is required" },
          { status: 400 },
        );
      }

      const brief = await prisma.productBrief.update({
        where: { id: briefId },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: "admin",
          rejectionNote: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Brief "${brief.title}" approved`,
        data: brief,
      });
    }

    // ── Reject a brief ──
    if (action === "reject") {
      const { briefId, reason } = body as {
        briefId: string;
        reason?: string;
      };
      if (!briefId) {
        return NextResponse.json(
          { error: "briefId is required" },
          { status: 400 },
        );
      }

      const brief = await prisma.productBrief.update({
        where: { id: briefId },
        data: {
          status: "archived",
          rejectionNote: reason ?? "Rejected by admin",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Brief "${brief.title}" rejected`,
        data: brief,
      });
    }

    // ── Update a brief ──
    if (action === "update") {
      const { briefId, ...updates } = body as {
        briefId: string;
        title?: string;
        description?: string;
        productType?: string;
        tier?: number;
        targetPrice?: number;
        ontologyCategory?: string;
        keywords?: string[];
      };

      if (!briefId) {
        return NextResponse.json(
          { error: "briefId is required" },
          { status: 400 },
        );
      }

      const data: Record<string, unknown> = {};
      if (updates.title) data.title = updates.title;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.productType) data.productType = updates.productType;
      if (updates.tier) data.tier = updates.tier;
      if (updates.targetPrice) data.targetPrice = updates.targetPrice;
      if (updates.ontologyCategory !== undefined)
        data.ontologyCategory = updates.ontologyCategory;
      if (updates.keywords) data.keywordsJson = updates.keywords;

      const brief = await prisma.productBrief.update({
        where: { id: briefId },
        data,
      });

      return NextResponse.json({
        success: true,
        message: `Brief "${brief.title}" updated`,
        data: brief,
      });
    }

    return NextResponse.json(
      {
        error: `Unknown action: ${action}. Supported: create, approve, reject, update`,
      },
      { status: 400 },
    );
  } catch (err) {
    console.warn(
      "[commerce-briefs] POST error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
