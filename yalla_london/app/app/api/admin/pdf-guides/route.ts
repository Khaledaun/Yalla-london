/**
 * PDF Guides API — CRUD + Generation + Download
 *
 * GET:  List all PDF guides (filterable by site, status)
 * POST: Generate a new PDF guide (from scratch, from article, or from Canva cover)
 *
 * Generation flow:
 * 1. AI generates content sections (or extracts from BlogPost)
 * 2. HTML template rendered with brand colors
 * 3. Puppeteer converts HTML → PDF binary
 * 4. PDF stored as base64 in PdfGuide.pdfUrl (data URI)
 * 5. Download endpoint streams the binary
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import type { PDFSection } from "@/lib/pdf/generator";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const site = searchParams.get("site");
    const status = searchParams.get("status");

    const guides = await prisma.pdfGuide.findMany({
      where: {
        ...(site ? { site } : {}),
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        site: true,
        style: true,
        language: true,
        status: true,
        price: true,
        isGated: true,
        downloads: true,
        coverDesignId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude htmlContent and pdfUrl (large) from list
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ guides });
  } catch (error) {
    // If PdfGuide table doesn't exist yet, return empty list gracefully
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation") || msg.includes("PdfGuide")) {
      console.warn("[pdf-guides] PdfGuide table not found — returning empty. Run 'Fix Database' on /admin/content?tab=generation");
      return NextResponse.json({ guides: [], tableNotFound: true });
    }
    console.error("[pdf-guides] GET error:", error);
    return NextResponse.json({ error: "Failed to load guides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const BUDGET_MS = 53_000;

  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();
    const { action } = body;

    // Action: generate — create a new PDF guide
    if (action === "generate") {
      return await handleGenerate(prisma, body, startTime, BUDGET_MS);
    }

    // Action: from_article — convert a BlogPost into a PDF guide
    if (action === "from_article") {
      return await handleFromArticle(prisma, body, startTime, BUDGET_MS);
    }

    // Action: download — stream PDF binary
    if (action === "download") {
      return await handleDownload(prisma, body);
    }

    // Action: delete
    if (action === "delete") {
      const { guideId } = body;
      if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });
      await prisma.pdfGuide.delete({ where: { id: guideId } });
      return NextResponse.json({ success: true });
    }

    // Action: update (toggle gating, price, etc.)
    if (action === "update") {
      const { guideId, ...updates } = body;
      if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });
      const allowed = ["title", "description", "isGated", "price", "status", "coverDesignId"];
      const data: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in updates) data[key] = updates[key];
      }
      const guide = await prisma.pdfGuide.update({ where: { id: guideId }, data });
      return NextResponse.json({ success: true, guide: { id: guide.id, title: guide.title, status: guide.status } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation") || msg.includes("PdfGuide")) {
      console.warn("[pdf-guides] PdfGuide table not found. Run 'Fix Database' on /admin/content?tab=generation");
      return NextResponse.json(
        { error: "PDF Guides table not created yet. Go to Content Hub → Generation tab → click 'Fix Database' to create it." },
        { status: 503 }
      );
    }
    console.error("[pdf-guides] POST error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// ─── Generate from scratch ───────────────────────────────────────────────────

async function handleGenerate(
  prisma: any,
  body: any,
  startTime: number,
  budgetMs: number,
) {
  const {
    title,
    destination,
    template = "luxury",
    locale = "en",
    siteId,
    coverDesignUrl,
  } = body;

  if (!destination) {
    return NextResponse.json({ error: "destination is required" }, { status: 400 });
  }

  const { getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
  const effectiveSiteId = siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);

  // 1. Generate AI content
  const { generatePDFContent, generatePDFHTML, PDF_TEMPLATES } = await import("@/lib/pdf/generator");
  const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;
  const sections = await generatePDFContent(destination, template, locale as "en" | "ar");

  if (Date.now() - startTime > budgetMs) {
    return NextResponse.json({ error: "Budget exceeded during content generation" }, { status: 504 });
  }

  // 2. Build HTML
  const guideTitle = title || (locale === "ar" ? `دليل السفر إلى ${destination}` : `${destination} Travel Guide`);
  const html = generatePDFHTML({
    title: guideTitle,
    subtitle: locale === "ar" ? `دليلك الشامل من ${siteConfig?.name || "Yalla London"}` : `Your Complete Guide by ${siteConfig?.name || "Yalla London"}`,
    destination,
    locale: locale as "en" | "ar",
    siteId: effectiveSiteId,
    template: template as any,
    sections,
    branding: {
      primaryColor: siteConfig?.primaryColor || templateConfig.primaryColor,
      secondaryColor: siteConfig?.secondaryColor || templateConfig.secondaryColor,
      siteName: siteConfig?.name || "Yalla London",
      website: siteConfig?.domain ? `https://${siteConfig.domain}` : undefined,
    },
    includeAffiliate: true,
  });

  // 3. Convert HTML to PDF using Puppeteer
  let pdfBase64: string | null = null;
  let pdfSize = 0;
  try {
    const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
    const buffer = await generatePdfFromHtml(html);
    pdfBase64 = buffer.toString("base64");
    pdfSize = buffer.length;
  } catch (pdfErr) {
    console.warn("[pdf-guides] Puppeteer PDF failed, storing HTML only:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
    // Continue — store HTML-only guide with status "generated" (not "ready")
  }

  // 4. Save to DB
  const slug = `${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${template}-${locale}-${Date.now().toString(36)}`;
  const guide = await prisma.pdfGuide.create({
    data: {
      title: guideTitle,
      slug,
      description: `${template.charAt(0).toUpperCase() + template.slice(1)} travel guide for ${destination}`,
      site: effectiveSiteId,
      style: template,
      language: locale,
      contentSections: sections,
      htmlContent: html,
      pdfUrl: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null,
      coverDesignId: coverDesignUrl || null,
      status: pdfBase64 ? "ready" : "generated",
    },
  });

  return NextResponse.json({
    success: true,
    guide: {
      id: guide.id,
      title: guide.title,
      slug: guide.slug,
      status: guide.status,
      sections: sections.length,
      pdfSize,
      hasPdf: !!pdfBase64,
    },
  });
}

// ─── Generate from existing BlogPost ─────────────────────────────────────────

async function handleFromArticle(
  prisma: any,
  body: any,
  startTime: number,
  budgetMs: number,
) {
  const { articleId, template = "luxury", coverDesignUrl } = body;

  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const post = await prisma.blogPost.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title_en: true,
      title_ar: true,
      content_en: true,
      content_ar: true,
      meta_description_en: true,
      slug: true,
      siteId: true,
      category: { select: { name_en: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const { getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
  const effectiveSiteId = post.siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const { PDF_TEMPLATES, generatePDFHTML } = await import("@/lib/pdf/generator");
  const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;

  // Extract content sections from article HTML
  const sections = extractSectionsFromArticle(post.content_en || "", post.title_en);

  // Add Arabic section if available
  if (post.content_ar) {
    sections.push({
      type: "intro" as const,
      title: "النسخة العربية",
      content: stripHtml(post.content_ar).slice(0, 2000),
    });
  }

  const guideTitle = `${post.title_en} — PDF Guide`;

  const html = generatePDFHTML({
    title: guideTitle,
    subtitle: `From ${siteConfig?.name || "Yalla London"}`,
    destination: post.category?.name_en || "London",
    locale: "en",
    siteId: effectiveSiteId,
    template: template as any,
    sections,
    branding: {
      primaryColor: siteConfig?.primaryColor || templateConfig.primaryColor,
      secondaryColor: siteConfig?.secondaryColor || templateConfig.secondaryColor,
      siteName: siteConfig?.name || "Yalla London",
      website: siteConfig?.domain ? `https://${siteConfig.domain}` : undefined,
    },
    includeAffiliate: true,
  });

  if (Date.now() - startTime > budgetMs) {
    return NextResponse.json({ error: "Budget exceeded" }, { status: 504 });
  }

  // Convert to PDF
  let pdfBase64: string | null = null;
  let pdfSize = 0;
  try {
    const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
    const buffer = await generatePdfFromHtml(html);
    pdfBase64 = buffer.toString("base64");
    pdfSize = buffer.length;
  } catch (pdfErr) {
    console.warn("[pdf-guides] Puppeteer PDF failed:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
  }

  const slug = `article-${post.slug}-${Date.now().toString(36)}`;
  const guide = await prisma.pdfGuide.create({
    data: {
      title: guideTitle,
      slug,
      description: post.meta_description_en || `PDF guide based on ${post.title_en}`,
      site: effectiveSiteId,
      style: template,
      language: "en",
      contentSections: sections,
      htmlContent: html,
      pdfUrl: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null,
      coverDesignId: coverDesignUrl || null,
      status: pdfBase64 ? "ready" : "generated",
    },
  });

  return NextResponse.json({
    success: true,
    guide: {
      id: guide.id,
      title: guide.title,
      slug: guide.slug,
      status: guide.status,
      sections: sections.length,
      pdfSize,
      hasPdf: !!pdfBase64,
      sourceArticle: post.title_en,
    },
  });
}

// ─── Download PDF ────────────────────────────────────────────────────────────

async function handleDownload(prisma: any, body: any) {
  const { guideId, email } = body;

  if (!guideId) {
    return NextResponse.json({ error: "guideId required" }, { status: 400 });
  }

  const guide = await prisma.pdfGuide.findUnique({ where: { id: guideId } });
  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  // If gated, require email
  if (guide.isGated && !email) {
    return NextResponse.json({ error: "Email required for this guide", gated: true }, { status: 403 });
  }

  // If no PDF binary, try to generate on-demand from stored HTML
  let pdfBuffer: Buffer;
  if (guide.pdfUrl && guide.pdfUrl.startsWith("data:application/pdf;base64,")) {
    pdfBuffer = Buffer.from(guide.pdfUrl.replace("data:application/pdf;base64,", ""), "base64");
  } else if (guide.htmlContent) {
    try {
      const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
      pdfBuffer = await generatePdfFromHtml(guide.htmlContent);
      // Cache the generated PDF
      await prisma.pdfGuide.update({
        where: { id: guideId },
        data: {
          pdfUrl: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
          status: "ready",
        },
      });
    } catch (pdfErr) {
      console.error("[pdf-guides] On-demand PDF generation failed:", pdfErr);
      return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: "No content available for this guide" }, { status: 404 });
  }

  // Track download
  await prisma.pdfGuide.update({
    where: { id: guideId },
    data: { downloads: { increment: 1 } },
  });

  // Track lead if email provided
  if (email) {
    try {
      await prisma.pdfDownload.create({
        data: {
          pdfGuideId: guideId,
          email,
        },
      });
    } catch (dlErr) {
      console.warn("[pdf-guides] Download tracking failed:", dlErr instanceof Error ? dlErr.message : dlErr);
    }
  }

  const filename = `${guide.slug}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractSectionsFromArticle(html: string, title: string): PDFSection[] {
  const sections: PDFSection[] = [];

  // Extract H2 sections from article HTML
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
  let match;

  while ((match = h2Regex.exec(html)) !== null) {
    const sectionTitle = stripHtml(match[1]);
    const sectionContent = stripHtml(match[2]).slice(0, 1500);
    if (sectionTitle && sectionContent.length > 50) {
      sections.push({
        type: sections.length === 0 ? "intro" : "tips",
        title: sectionTitle,
        content: sectionContent,
      });
    }
  }

  // If no H2s found, use the whole content as intro
  if (sections.length === 0) {
    sections.push({
      type: "intro",
      title: title || "Guide",
      content: stripHtml(html).slice(0, 3000),
    });
  }

  return sections;
}
