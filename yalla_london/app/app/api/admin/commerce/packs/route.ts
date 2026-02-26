/**
 * Commerce Packs API — ProductPack CRUD (bundle/collection management)
 *
 * GET: List packs
 * POST: Create/update/delete packs
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

    const packs = await prisma.productPack.findMany({
      where: { siteId: targetSiteId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: packs });
  } catch (err) {
    console.warn("[commerce-packs] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load packs" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const activeSiteIds = getActiveSiteIds();

    // ── Create pack ──
    if (action === "create") {
      const {
        siteId: requestedSiteId,
        name_en,
        name_ar,
        slug,
        description_en,
        description_ar,
        price,
        compare_price,
        productIds,
        cover_image,
      } = body as {
        siteId?: string;
        name_en: string;
        name_ar?: string;
        slug: string;
        description_en?: string;
        description_ar?: string;
        price: number;
        compare_price?: number;
        productIds?: string[];
        cover_image?: string;
      };

      if (!name_en || !slug || !price) {
        return NextResponse.json(
          { error: "name_en, slug, and price are required" },
          { status: 400 },
        );
      }

      const siteId =
        requestedSiteId && activeSiteIds.includes(requestedSiteId)
          ? requestedSiteId
          : getDefaultSiteId();

      const pack = await prisma.productPack.create({
        data: {
          siteId,
          name_en,
          name_ar: name_ar ?? null,
          slug,
          description_en: description_en ?? null,
          description_ar: description_ar ?? null,
          price,
          compare_price: compare_price ?? null,
          currency: "USD",
          productIds: productIds ?? [],
          cover_image: cover_image ?? null,
          is_active: true,
          featured: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pack "${name_en}" created`,
        data: pack,
      });
    }

    // ── Update pack ──
    if (action === "update") {
      const { packId, ...updates } = body as {
        packId: string;
        name_en?: string;
        name_ar?: string;
        description_en?: string;
        description_ar?: string;
        price?: number;
        compare_price?: number;
        productIds?: string[];
        cover_image?: string;
        is_active?: boolean;
        featured?: boolean;
      };

      if (!packId) {
        return NextResponse.json({ error: "packId is required" }, { status: 400 });
      }

      const data: Record<string, unknown> = {};
      if (updates.name_en) data.name_en = updates.name_en;
      if (updates.name_ar !== undefined) data.name_ar = updates.name_ar;
      if (updates.description_en !== undefined) data.description_en = updates.description_en;
      if (updates.description_ar !== undefined) data.description_ar = updates.description_ar;
      if (updates.price) data.price = updates.price;
      if (updates.compare_price !== undefined) data.compare_price = updates.compare_price;
      if (updates.productIds) data.productIds = updates.productIds;
      if (updates.cover_image !== undefined) data.cover_image = updates.cover_image;
      if (updates.is_active !== undefined) data.is_active = updates.is_active;
      if (updates.featured !== undefined) data.featured = updates.featured;

      const pack = await prisma.productPack.update({
        where: { id: packId },
        data,
      });

      return NextResponse.json({
        success: true,
        message: `Pack "${pack.name_en}" updated`,
        data: pack,
      });
    }

    // ── Delete pack ──
    if (action === "delete") {
      const { packId } = body as { packId: string };
      if (!packId) {
        return NextResponse.json({ error: "packId is required" }, { status: 400 });
      }

      await prisma.productPack.delete({ where: { id: packId } });

      return NextResponse.json({
        success: true,
        message: "Pack deleted",
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: create, update, delete` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-packs] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
