/**
 * Product File Generation API
 *
 * GET  — List ProductBriefs that need product files generated
 *        (digitalProductId is null OR linked DigitalProduct.file_url is null)
 *
 * POST — Generate a product file from a brief or blog post
 *        Actions: generate_itinerary, generate_guide, generate_from_post, preview_template
 *
 * Protected with requireAdmin.
 * DB access: `const { prisma } = await import("@/lib/db")`
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

// ─── GET: List briefs needing files ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;

  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    // Briefs that either:
    // 1. Have no linked DigitalProduct (digitalProductId is null)
    // 2. Have a linked DigitalProduct but its file_url is null
    const briefsWithoutFiles = await prisma.productBrief.findMany({
      where: {
        siteId,
        OR: [
          { digitalProductId: null },
          {
            digitalProductId: { not: null },
          },
        ],
      },
      orderBy: [{ tier: "asc" }, { createdAt: "desc" }],
      take: 50,
    });

    // For briefs that DO have a digitalProductId, check if that product has a file_url
    const briefsNeedingFiles: typeof briefsWithoutFiles = [];

    for (const brief of briefsWithoutFiles) {
      if (!brief.digitalProductId) {
        // No linked product at all — definitely needs a file
        briefsNeedingFiles.push(brief);
        continue;
      }
      // Has a linked product — check if the file_url is set
      const product = await prisma.digitalProduct.findUnique({
        where: { id: brief.digitalProductId },
        select: { file_url: true },
      });
      if (!product || !product.file_url) {
        briefsNeedingFiles.push(brief);
      }
    }

    // Also fetch recent blog posts that could be repurposed
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        siteId,
        published: true,
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        excerpt_en: true,
        page_type: true,
        created_at: true,
        seo_score: true,
      },
      orderBy: { created_at: "desc" },
      take: 30,
    });

    return NextResponse.json({
      briefs: briefsNeedingFiles.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        productType: b.productType,
        ontologyCategory: b.ontologyCategory,
        tier: b.tier,
        status: b.status,
        digitalProductId: b.digitalProductId,
        targetPrice: b.targetPrice,
        designNotes: b.designNotesJson,
        createdAt: b.createdAt,
      })),
      blogPosts: blogPosts.map((p) => ({
        id: p.id,
        title: p.title_en,
        slug: p.slug,
        excerpt: p.excerpt_en,
        pageType: p.page_type,
        seoScore: p.seo_score,
        createdAt: p.created_at,
      })),
      summary: {
        briefsNeedingFiles: briefsNeedingFiles.length,
        availableBlogPosts: blogPosts.length,
        siteId,
      },
    });
  } catch (error) {
    console.error(
      "[generate-product/GET] Failed to fetch briefs:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to load product briefs" },
      { status: 500 },
    );
  }
}

// ─── POST: Generate product file ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;

  try {
    const body = await request.json();
    const { action, briefId, postId, productType, siteId: bodySiteId } = body as {
      action: string;
      briefId?: string;
      postId?: string;
      productType?: string;
      siteId?: string;
    };

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 },
      );
    }

    const siteId =
      bodySiteId ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    // Lazy import the generator to keep cold-start fast
    const {
      generateItineraryPdf,
      generateTravelGuidePdf,
      generateFromBlogPost,
      getProductTemplate,
      linkFileToListing,
    } = await import("@/lib/commerce/product-file-generator");

    switch (action) {
      // ── Generate Itinerary PDF ──────────────────────────────────────
      case "generate_itinerary": {
        if (!briefId) {
          return NextResponse.json(
            { error: "briefId is required for generate_itinerary" },
            { status: 400 },
          );
        }

        const result = await generateItineraryPdf(briefId);
        const base64 = result.buffer.toString("base64");

        return NextResponse.json({
          success: true,
          action: "generate_itinerary",
          fileName: result.fileName,
          fileSize: result.buffer.length,
          pageCount: result.pageCount,
          base64,
          mimeType: "application/pdf",
        });
      }

      // ── Generate Travel Guide PDF ───────────────────────────────────
      case "generate_guide": {
        if (!briefId) {
          return NextResponse.json(
            { error: "briefId is required for generate_guide" },
            { status: 400 },
          );
        }

        const result = await generateTravelGuidePdf(briefId);
        const base64 = result.buffer.toString("base64");

        return NextResponse.json({
          success: true,
          action: "generate_guide",
          fileName: result.fileName,
          fileSize: result.buffer.length,
          pageCount: result.pageCount,
          base64,
          mimeType: "application/pdf",
        });
      }

      // ── Generate from Blog Post ─────────────────────────────────────
      case "generate_from_post": {
        if (!postId) {
          return NextResponse.json(
            { error: "postId is required for generate_from_post" },
            { status: 400 },
          );
        }

        const type = productType || "PDF_GUIDE";
        const result = await generateFromBlogPost(postId, type);
        const base64 = result.buffer.toString("base64");

        return NextResponse.json({
          success: true,
          action: "generate_from_post",
          fileName: result.fileName,
          fileSize: result.buffer.length,
          pageCount: result.pageCount,
          base64,
          mimeType: "application/pdf",
        });
      }

      // ── Preview Template ────────────────────────────────────────────
      case "preview_template": {
        const type = productType || "TEMPLATE";
        const html = getProductTemplate(type, siteId);

        return NextResponse.json({
          success: true,
          action: "preview_template",
          productType: type,
          html,
        });
      }

      // ── Link File to Listing ────────────────────────────────────────
      case "link_file": {
        if (!briefId) {
          return NextResponse.json(
            { error: "briefId is required for link_file" },
            { status: 400 },
          );
        }
        const { fileUrl } = body as { fileUrl?: string };
        if (!fileUrl) {
          return NextResponse.json(
            { error: "fileUrl is required for link_file" },
            { status: 400 },
          );
        }

        const linkResult = await linkFileToListing(briefId, fileUrl);

        return NextResponse.json({
          success: true,
          action: "link_file",
          ...linkResult,
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: generate_itinerary, generate_guide, generate_from_post, preview_template, link_file`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error(
      "[generate-product/POST] Generation failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Product generation failed. Check server logs for details." },
      { status: 500 },
    );
  }
}
