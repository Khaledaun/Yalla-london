/**
 * Commerce — Mockup Images API Route
 *
 * Protected admin endpoint for generating and managing product mockup images.
 *
 * GET:  Fetch existing mockup data for a draft or brief
 * POST: Generate new mockup prompt, SVG cover, or save image URL
 *
 * Auth: requireAdmin from @/lib/admin-middleware
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  generateMockupPrompt,
  generateMockupVariants,
  generateProductCoverSvg,
  getStockMockupUrl,
  saveMockupToListing,
} from "@/lib/commerce/image-generator";

const LOG_PREFIX = "[api/mockup-images]";

// ─── GET: Fetch existing mockup data ────────────────────────────

export async function GET(request: NextRequest) {
  // Auth check
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");
    const briefId = searchParams.get("briefId");

    if (!draftId && !briefId) {
      return NextResponse.json(
        { error: "Either draftId or briefId query parameter is required" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");

    // If draftId is provided, fetch the listing draft's preview images
    if (draftId) {
      const draft = await prisma.etsyListingDraft.findUnique({
        where: { id: draftId },
        select: {
          id: true,
          title: true,
          previewImages: true,
          status: true,
          siteId: true,
          brief: {
            select: {
              id: true,
              title: true,
              productType: true,
              tier: true,
              ontologyCategory: true,
            },
          },
        },
      });

      if (!draft) {
        return NextResponse.json(
          { error: "EtsyListingDraft not found" },
          { status: 404 },
        );
      }

      // Parse preview images
      let previewImages: string[] = [];
      if (draft.previewImages) {
        const parsed = draft.previewImages as unknown;
        if (Array.isArray(parsed)) {
          previewImages = parsed.filter(
            (item): item is string => typeof item === "string",
          );
        }
      }

      // Get stock fallback for this product type
      const stockMockup = getStockMockupUrl(
        draft.brief.productType,
        (draft.brief.tier as 1 | 2 | 3) || 1,
      );

      return NextResponse.json({
        draftId: draft.id,
        briefId: draft.brief.id,
        title: draft.title,
        productType: draft.brief.productType,
        tier: draft.brief.tier,
        siteId: draft.siteId,
        previewImages,
        imageCount: previewImages.length,
        maxImages: 10,
        stockFallback: stockMockup,
      });
    }

    // If briefId is provided, fetch the brief and any associated draft images
    if (briefId) {
      const brief = await prisma.productBrief.findUnique({
        where: { id: briefId },
        select: {
          id: true,
          title: true,
          productType: true,
          tier: true,
          siteId: true,
          ontologyCategory: true,
          description: true,
        },
      });

      if (!brief) {
        return NextResponse.json(
          { error: "ProductBrief not found" },
          { status: 404 },
        );
      }

      // Check if a draft exists for this brief
      const draft = await prisma.etsyListingDraft.findUnique({
        where: { briefId: briefId },
        select: {
          id: true,
          previewImages: true,
        },
      });

      let previewImages: string[] = [];
      if (draft?.previewImages) {
        const parsed = draft.previewImages as unknown;
        if (Array.isArray(parsed)) {
          previewImages = parsed.filter(
            (item): item is string => typeof item === "string",
          );
        }
      }

      const stockMockup = getStockMockupUrl(
        brief.productType,
        (brief.tier as 1 | 2 | 3) || 1,
      );

      return NextResponse.json({
        briefId: brief.id,
        draftId: draft?.id || null,
        title: brief.title,
        productType: brief.productType,
        tier: brief.tier,
        siteId: brief.siteId,
        previewImages,
        imageCount: previewImages.length,
        maxImages: 10,
        stockFallback: stockMockup,
      });
    }

    // Should not reach here, but handle defensively
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} GET error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to fetch mockup data" },
      { status: 500 },
    );
  }
}

// ─── POST: Generate mockup or save URL ──────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;

  try {
    const body = await request.json();
    const { action, briefId, draftId } = body as {
      action?: string;
      briefId?: string;
      draftId?: string;
      imageUrl?: string;
      productTitle?: string;
      productType?: string;
      siteId?: string;
      count?: number;
    };

    if (!action) {
      return NextResponse.json(
        { error: 'Missing "action" field. Valid actions: generate_prompt, generate_variants, generate_svg, save_url, stock_fallback' },
        { status: 400 },
      );
    }

    // ─── Action: generate_prompt ───────────────────────────
    if (action === "generate_prompt") {
      let productTitle = body.productTitle;
      let productType = body.productType;
      let siteId = body.siteId;

      // If briefId is provided, fetch from DB
      if (briefId && (!productTitle || !productType || !siteId)) {
        const { prisma } = await import("@/lib/db");
        const brief = await prisma.productBrief.findUnique({
          where: { id: briefId },
          select: { title: true, productType: true, siteId: true },
        });

        if (!brief) {
          return NextResponse.json(
            { error: "ProductBrief not found" },
            { status: 404 },
          );
        }

        productTitle = productTitle || brief.title;
        productType = productType || brief.productType;
        siteId = siteId || brief.siteId;
      }

      if (!productTitle || !productType || !siteId) {
        return NextResponse.json(
          {
            error:
              "generate_prompt requires productTitle, productType, and siteId (or a valid briefId)",
          },
          { status: 400 },
        );
      }

      const result = await generateMockupPrompt(productTitle, productType, siteId);

      return NextResponse.json({
        action: "generate_prompt",
        briefId: briefId || null,
        result,
      });
    }

    // ─── Action: generate_variants ─────────────────────────
    if (action === "generate_variants") {
      if (!briefId) {
        return NextResponse.json(
          { error: "generate_variants requires briefId" },
          { status: 400 },
        );
      }

      const count = body.count || 3;
      const variants = await generateMockupVariants(briefId, count);

      return NextResponse.json({
        action: "generate_variants",
        briefId,
        variants,
        count: variants.length,
      });
    }

    // ─── Action: generate_svg ──────────────────────────────
    if (action === "generate_svg") {
      let productTitle = body.productTitle;
      let productType = body.productType;
      let siteId = body.siteId;

      // If briefId or draftId is provided, fetch from DB
      if ((briefId || draftId) && (!productTitle || !productType || !siteId)) {
        const { prisma } = await import("@/lib/db");

        if (draftId) {
          const draft = await prisma.etsyListingDraft.findUnique({
            where: { id: draftId },
            select: {
              title: true,
              siteId: true,
              brief: { select: { productType: true } },
            },
          });
          if (draft) {
            productTitle = productTitle || draft.title;
            productType = productType || draft.brief.productType;
            siteId = siteId || draft.siteId;
          }
        } else if (briefId) {
          const brief = await prisma.productBrief.findUnique({
            where: { id: briefId },
            select: { title: true, productType: true, siteId: true },
          });
          if (brief) {
            productTitle = productTitle || brief.title;
            productType = productType || brief.productType;
            siteId = siteId || brief.siteId;
          }
        }
      }

      if (!productTitle || !productType || !siteId) {
        return NextResponse.json(
          {
            error:
              "generate_svg requires productTitle, productType, and siteId (or a valid briefId/draftId)",
          },
          { status: 400 },
        );
      }

      const svg = generateProductCoverSvg(productTitle, productType, siteId);

      return NextResponse.json({
        action: "generate_svg",
        briefId: briefId || null,
        draftId: draftId || null,
        svg,
        contentType: "image/svg+xml",
        width: 1200,
        height: 800,
      });
    }

    // ─── Action: save_url ──────────────────────────────────
    if (action === "save_url") {
      if (!draftId) {
        return NextResponse.json(
          { error: "save_url requires draftId" },
          { status: 400 },
        );
      }

      const imageUrl = body.imageUrl;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json(
          { error: "save_url requires imageUrl (string)" },
          { status: 400 },
        );
      }

      // Basic URL validation
      try {
        new URL(imageUrl);
      } catch {
        // Allow relative paths (e.g., /images/mockups/...)
        if (!imageUrl.startsWith("/")) {
          return NextResponse.json(
            { error: "imageUrl must be a valid URL or a relative path starting with /" },
            { status: 400 },
          );
        }
      }

      const updatedImages = await saveMockupToListing(draftId, imageUrl);

      if (updatedImages === null) {
        return NextResponse.json(
          { error: "Failed to save image to listing draft" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        action: "save_url",
        draftId,
        imageUrl,
        previewImages: updatedImages,
        imageCount: updatedImages.length,
        maxImages: 10,
      });
    }

    // ─── Action: stock_fallback ────────────────────────────
    if (action === "stock_fallback") {
      const productType = body.productType;
      const tier = body.tier || 1;

      if (!productType) {
        return NextResponse.json(
          { error: "stock_fallback requires productType" },
          { status: 400 },
        );
      }

      const stockMockup = getStockMockupUrl(productType, tier);

      return NextResponse.json({
        action: "stock_fallback",
        productType,
        tier,
        ...stockMockup,
      });
    }

    return NextResponse.json(
      {
        error: `Unknown action: "${action}". Valid actions: generate_prompt, generate_variants, generate_svg, save_url, stock_fallback`,
      },
      { status: 400 },
    );
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} POST error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to process mockup request" },
      { status: 500 },
    );
  }
}
