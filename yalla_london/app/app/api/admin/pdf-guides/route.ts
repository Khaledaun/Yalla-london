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
    const { searchParams } = new URL(request.url);

    // Return template catalog (no DB needed)
    if (searchParams.get("templates") === "true") {
      const { GUIDE_TEMPLATES } = await import("@/lib/pdf/guide-templates");
      return NextResponse.json({ templates: GUIDE_TEMPLATES });
    }

    const { prisma } = await import("@/lib/db");
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

    // Action: template_generate — generate from a guide template with user inputs
    if (action === "template_generate") {
      return await handleTemplateGenerate(prisma, body, startTime, BUDGET_MS);
    }

    // Action: regenerate_content — re-run AI content generation for a guide that has placeholder content
    if (action === "regenerate_content") {
      return await handleRegenerateContent(prisma, body, startTime, BUDGET_MS);
    }

    // Action: edit_prompt — edit an existing guide's content via AI prompt
    if (action === "edit_prompt") {
      return await handleEditPrompt(prisma, body, startTime, BUDGET_MS);
    }

    // Action: publish — mark guide as published and set price
    if (action === "publish") {
      return await handlePublish(prisma, body);
    }

    // Action: preview_html — return the stored HTML for iframe preview
    if (action === "preview_html") {
      const { guideId } = body;
      if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });
      const guide = await prisma.pdfGuide.findUnique({
        where: { id: guideId },
        select: { htmlContent: true, title: true },
      });
      if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      return NextResponse.json({ html: guide.htmlContent, title: guide.title });
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[pdf-guides] POST error:", errMsg);
    return NextResponse.json({ error: errMsg.length > 200 ? errMsg.slice(0, 200) : errMsg }, { status: 500 });
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

  // 1. Generate AI content (per-section with retry + fallback)
  const { generatePDFContent, generatePDFHTML, PDF_TEMPLATES } = await import("@/lib/pdf/generator");
  const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;
  const contentBudgetMs = Math.max(10_000, budgetMs - (Date.now() - startTime) - 15_000);
  const sections = await generatePDFContent(destination, template, locale as "en" | "ar", contentBudgetMs);

  // Content is generated (AI or fallback) — proceed to HTML even if over budget
  // HTML generation + DB save are fast (<2s), no reason to bail after spending all the AI budget

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
      featured_image: true,
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

  // Extract content sections from article HTML — single language only.
  // Previously appended Arabic as a section to English PDFs, creating a
  // confusing mixed-language document. Now: one PDF = one language.
  const sections = extractSectionsFromArticle(post.content_en || "", post.title_en);

  // Extract images from article HTML for use in PDF sections
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  const articleImages: string[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(post.content_en || "")) !== null) {
    if (imgMatch[1] && !imgMatch[1].includes("data:")) {
      articleImages.push(imgMatch[1]);
    }
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
    coverImageUrl: coverDesignUrl || post.featured_image || undefined,
    articleImages,
    branding: {
      primaryColor: siteConfig?.primaryColor || templateConfig.primaryColor,
      secondaryColor: siteConfig?.secondaryColor || templateConfig.secondaryColor,
      siteName: siteConfig?.name || "Yalla London",
      website: siteConfig?.domain ? `https://${siteConfig.domain}` : undefined,
    },
    includeAffiliate: true,
  });

  // Convert to PDF (skip if budget is very tight — HTML is still saved)
  let pdfBase64: string | null = null;
  let pdfSize = 0;
  if (Date.now() - startTime < budgetMs - 5_000) {
    try {
      const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
      const buffer = await generatePdfFromHtml(html);
      pdfBase64 = buffer.toString("base64");
      pdfSize = buffer.length;
    } catch (pdfErr) {
      console.warn("[pdf-guides] Puppeteer PDF failed:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
    }
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
      console.warn("[pdf-guides] Puppeteer unavailable, falling back to HTML download:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
      // Fallback: serve the HTML as a downloadable file (can be opened in browser and printed to PDF)
      await prisma.pdfGuide.update({
        where: { id: guideId },
        data: { downloads: { increment: 1 } },
      });
      const htmlFilename = `${guide.slug}.html`;
      return new NextResponse(guide.htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${htmlFilename}"`,
          "Content-Length": String(Buffer.byteLength(guide.htmlContent, "utf-8")),
        },
      });
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

// ─── Regenerate content for an existing guide ────────────────────────────────

async function handleRegenerateContent(
  prisma: any,
  body: any,
  startTime: number,
  budgetMs: number,
) {
  const { guideId } = body;
  if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

  const guide = await prisma.pdfGuide.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      title: true,
      site: true,
      style: true,
      language: true,
      slug: true,
      description: true,
      contentSections: true,
      coverDesignId: true,
      price: true,
    },
  });
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const { getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
  const effectiveSiteId = guide.site || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const { generatePDFContent, generatePDFHTML, PDF_TEMPLATES } = await import("@/lib/pdf/generator");

  // Extract destination from title (format: "Destination — Template Name" or just destination)
  const destination = guide.title?.split("—")[0]?.trim() || guide.title?.split("-")[0]?.trim() || "Travel";
  const template = guide.style || "luxury";
  const locale = (guide.language || "en") as "en" | "ar";
  const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;

  // Regenerate content with full budget
  const contentBudgetMs = Math.max(15_000, budgetMs - (Date.now() - startTime) - 12_000);
  const sections = await generatePDFContent(destination, template, locale, contentBudgetMs);

  // Rebuild HTML
  const html = generatePDFHTML({
    title: guide.title,
    subtitle: `Your Complete Guide by ${siteConfig?.name || "Yalla London"}`,
    destination,
    locale,
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

  // Convert to PDF
  let pdfBase64: string | null = null;
  let pdfSize = 0;
  try {
    const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
    const buffer = await generatePdfFromHtml(html);
    pdfBase64 = buffer.toString("base64");
    pdfSize = buffer.length;
  } catch (pdfErr) {
    console.warn("[pdf-guides] Regenerate PDF failed:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
  }

  // Update guide in DB
  await prisma.pdfGuide.update({
    where: { id: guideId },
    data: {
      htmlContent: html,
      contentSections: { sections, regeneratedAt: new Date().toISOString() },
      pdfUrl: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null,
      status: pdfBase64 ? "ready" : "generated",
    },
  });

  return NextResponse.json({
    success: true,
    guide: {
      id: guideId,
      title: guide.title,
      status: pdfBase64 ? "ready" : "generated",
      sections: sections.length,
      pdfSize,
      hasPdf: !!pdfBase64,
      regenerated: true,
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

// ─── Template-based generation ────────────────────────────────────────────────

async function handleTemplateGenerate(
  prisma: any,
  body: any,
  startTime: number,
  budgetMs: number,
) {
  const { templateId, userInputs = {}, locale = "en", siteId, coverDesignUrl } = body;

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const { buildGenerationPrompt, getTemplate } = await import("@/lib/pdf/guide-templates");
  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
  }

  // Validate required inputs
  const missing = template.inputs
    .filter((i) => i.required && !userInputs[i.key])
    .map((i) => i.label);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  const { getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
  const effectiveSiteId = siteId || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const siteName = siteConfig?.name || "Yalla London";

  // 1. Build prompt and generate content via AI
  const prompt = buildGenerationPrompt(templateId, userInputs, locale as "en" | "ar", siteName);
  const { generateText, isAIAvailable } = await import("@/lib/ai");

  const destination = userInputs.destination || userInputs.city || userInputs.region || "Travel";
  const guideTitle = `${destination} — ${template.name}`;

  let aiContent = "";
  const aiAvailable = await isAIAvailable();
  const elapsedBeforeAI = Date.now() - startTime;
  const timeLeftMs = budgetMs - elapsedBeforeAI;

  if (aiAvailable && timeLeftMs > 20_000) {
    try {
      // Cap AI call at 25s — leaves budget for per-section fallback OR HTML+DB save
      const aiTimeoutMs = Math.min(25_000, Math.max(8_000, timeLeftMs - 20_000));
      aiContent = await generateText(prompt, {
        maxTokens: 4000,
        taskType: "content_generation",
        calledFrom: "pdf-guide-template",
        timeoutMs: aiTimeoutMs,
      });
    } catch (aiErr) {
      console.warn("[pdf-guides] Template AI failed, falling back:", aiErr instanceof Error ? aiErr.message : aiErr);
      aiContent = "";
    }
  }

  // If the full-prompt AI failed, try per-section generation only if we have 15s+ left
  const timeAfterFirstAI = budgetMs - (Date.now() - startTime);
  if ((!aiContent || aiContent.length < 200) && timeAfterFirstAI > 15_000) {
    try {
      const { generatePDFContent } = await import("@/lib/pdf/generator");
      const perSectionBudget = Math.max(10_000, timeAfterFirstAI - 10_000);
      const perSectionResults = await generatePDFContent(destination, "luxury", locale as "en" | "ar", perSectionBudget);
      // Convert sections back to markdown-ish text for the parser below
      aiContent = perSectionResults
        .filter(s => s.content && s.content.length > 50)
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join("\n\n");
    } catch (fallbackErr) {
      console.warn("[pdf-guides] Per-section fallback also failed:", fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
    }
  }

  // Final fallback: build structured placeholder content from template + user inputs (instant, no AI)
  if (!aiContent || aiContent.length < 100) {
    aiContent = buildFallbackContent(template, userInputs, destination, locale as "en" | "ar", siteName);
  }

  // Content is guaranteed at this point (either AI or fallback). Proceed to HTML + DB save.

  // 2. Build HTML from AI content
  const { generatePDFHTML, PDF_TEMPLATES } = await import("@/lib/pdf/generator");
  const style = templateId.includes("luxury") || templateId.includes("hotel") || templateId.includes("yacht")
    ? "luxury"
    : templateId.includes("budget") ? "budget"
    : templateId.includes("family") ? "family"
    : templateId.includes("adventure") || templateId.includes("outdoor") ? "adventure"
    : templateId.includes("honeymoon") || templateId.includes("romantic") ? "honeymoon"
    : "luxury";
  const templateConfig = PDF_TEMPLATES[style as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;

  // Parse AI content into sections
  const sections = parseMarkdownToSections(aiContent);

  const html = generatePDFHTML({
    title: guideTitle,
    subtitle: `Your Complete Guide by ${siteName}`,
    destination,
    locale: locale as "en" | "ar",
    siteId: effectiveSiteId,
    template: style as any,
    sections,
    branding: {
      primaryColor: siteConfig?.primaryColor || templateConfig.primaryColor,
      secondaryColor: siteConfig?.secondaryColor || templateConfig.secondaryColor,
      siteName,
      website: siteConfig?.domain ? `https://${siteConfig.domain}` : undefined,
    },
    includeAffiliate: true,
  });

  // 3. Convert to PDF
  let pdfBase64: string | null = null;
  let pdfSize = 0;
  try {
    const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
    const buffer = await generatePdfFromHtml(html);
    pdfBase64 = buffer.toString("base64");
    pdfSize = buffer.length;
  } catch (pdfErr) {
    console.warn("[pdf-guides] Puppeteer failed, HTML only:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
  }

  // 4. Save to DB
  const slug = `${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${templateId}-${locale}-${Date.now().toString(36)}`;
  let guide;
  try {
    guide = await prisma.pdfGuide.create({
      data: {
        title: guideTitle,
        slug,
        description: template.description,
        site: effectiveSiteId,
        style,
        language: locale,
        contentSections: { templateId, userInputs, sections },
        htmlContent: html,
        pdfUrl: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null,
        coverDesignId: coverDesignUrl || null,
        status: pdfBase64 ? "ready" : "generated",
        price: template.suggestedPrice,
      },
    });
  } catch (dbErr) {
    const dbMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    if (dbMsg.includes("does not exist") || dbMsg.includes("P2021") || dbMsg.includes("PdfGuide")) {
      return NextResponse.json(
        { error: "PdfGuide table not created yet. Go to Content Hub → Generation → Fix Database." },
        { status: 503 },
      );
    }
    throw dbErr;
  }

  return NextResponse.json({
    success: true,
    guide: {
      id: guide.id,
      title: guide.title,
      slug: guide.slug,
      status: guide.status,
      templateId,
      sections: sections.length,
      pdfSize,
      hasPdf: !!pdfBase64,
      suggestedPrice: template.suggestedPrice,
    },
  });
}

// ─── Edit guide via AI prompt ─────────────────────────────────────────────────

async function handleEditPrompt(
  prisma: any,
  body: any,
  startTime: number,
  budgetMs: number,
) {
  const { guideId, editPrompt } = body;

  if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });
  if (!editPrompt) return NextResponse.json({ error: "editPrompt required" }, { status: 400 });

  const guide = await prisma.pdfGuide.findUnique({
    where: { id: guideId },
    select: { id: true, title: true, htmlContent: true, site: true, style: true, language: true, slug: true },
  });
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  // Extract text content from HTML for AI context — keep short to avoid
  // provider timeouts. 3000 chars is enough context for targeted edits.
  const currentText = stripHtml(guide.htmlContent || "").slice(0, 3000);

  const aiPrompt = `Edit this travel guide content. Current content (truncated):

${currentText}

EDIT REQUEST: ${editPrompt}

Return the FULL updated content in markdown (## for sections). Apply only the requested changes. Keep all other content intact.`;

  const { generateText, isAIAvailable } = await import("@/lib/ai");
  if (!(await isAIAvailable())) {
    return NextResponse.json({ error: "AI is currently unavailable. Try again in a few minutes." }, { status: 503 });
  }

  let updatedContent: string;
  try {
    // Give AI the maximum possible time — edit prompts are user-initiated,
    // not part of a cron budget. Use at least 40s, up to 50s.
    const timeLeftMs = budgetMs - (Date.now() - startTime);
    const aiTimeoutMs = Math.min(50_000, Math.max(40_000, timeLeftMs - 5_000));
    updatedContent = await generateText(aiPrompt, {
      maxTokens: 3000,
      taskType: "content_generation",
      calledFrom: "pdf-guide-edit",
      timeoutMs: aiTimeoutMs,
    });
  } catch (aiErr) {
    const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
    console.warn("[pdf-guides] Edit AI failed:", msg);
    return NextResponse.json({
      error: `AI edit failed: ${msg.length > 150 ? msg.slice(0, 150) + "..." : msg}. Try a simpler edit or try again in a minute.`,
    }, { status: 503 });
  }

  // AI succeeded — rebuild HTML (fast, no need for budget check)

  // Rebuild HTML with updated content
  const { getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
  const effectiveSiteId = guide.site || getDefaultSiteId();
  const siteConfig = getSiteConfig(effectiveSiteId);
  const { generatePDFHTML, PDF_TEMPLATES } = await import("@/lib/pdf/generator");
  const templateConfig = PDF_TEMPLATES[guide.style as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;
  const sections = parseMarkdownToSections(updatedContent);

  const html = generatePDFHTML({
    title: guide.title,
    subtitle: `Your Complete Guide by ${siteConfig?.name || "Yalla London"}`,
    destination: guide.title.split("—")[0]?.trim() || "Travel",
    locale: (guide.language || "en") as "en" | "ar",
    siteId: effectiveSiteId,
    template: guide.style as any,
    sections,
    branding: {
      primaryColor: siteConfig?.primaryColor || templateConfig.primaryColor,
      secondaryColor: siteConfig?.secondaryColor || templateConfig.secondaryColor,
      siteName: siteConfig?.name || "Yalla London",
      website: siteConfig?.domain ? `https://${siteConfig.domain}` : undefined,
    },
    includeAffiliate: true,
  });

  // Regenerate PDF
  let pdfBase64: string | null = null;
  try {
    const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
    const buffer = await generatePdfFromHtml(html);
    pdfBase64 = buffer.toString("base64");
  } catch (pdfErr) {
    console.warn("[pdf-guides] PDF regen failed:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
  }

  await prisma.pdfGuide.update({
    where: { id: guideId },
    data: {
      htmlContent: html,
      contentSections: { sections, lastEdit: editPrompt, editedAt: new Date().toISOString() },
      pdfUrl: pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : guide.htmlContent ? undefined : null,
      status: pdfBase64 ? "ready" : "generated",
    },
  });

  return NextResponse.json({
    success: true,
    guide: { id: guideId, title: guide.title, status: pdfBase64 ? "ready" : "generated", sections: sections.length },
    editApplied: editPrompt,
  });
}

// ─── Publish guide ────────────────────────────────────────────────────────────

async function handlePublish(prisma: any, body: any) {
  const { guideId, price, isGated = false, publishTo = ["shop"] } = body;

  if (!guideId) return NextResponse.json({ error: "guideId required" }, { status: 400 });

  const guide = await prisma.pdfGuide.findUnique({
    where: { id: guideId },
    select: { id: true, title: true, status: true, pdfUrl: true, htmlContent: true },
  });
  if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  // If no PDF exists, generate it now
  if (!guide.pdfUrl && guide.htmlContent) {
    try {
      const { generatePdfFromHtml } = await import("@/lib/pdf/html-to-pdf");
      const buffer = await generatePdfFromHtml(guide.htmlContent);
      await prisma.pdfGuide.update({
        where: { id: guideId },
        data: { pdfUrl: `data:application/pdf;base64,${buffer.toString("base64")}` },
      });
    } catch (pdfErr) {
      console.warn("[pdf-guides] Publish PDF gen failed:", pdfErr instanceof Error ? pdfErr.message : pdfErr);
      return NextResponse.json({ error: "Failed to generate PDF for publishing" }, { status: 500 });
    }
  }

  const updated = await prisma.pdfGuide.update({
    where: { id: guideId },
    data: {
      status: "published",
      price: price ?? undefined,
      isGated,
    },
  });

  return NextResponse.json({
    success: true,
    guide: {
      id: updated.id,
      title: updated.title,
      status: "published",
      price: updated.price,
      isGated: updated.isGated,
    },
    publishedTo: publishTo,
  });
}

// ─── Markdown → PDFSection parser ─────────────────────────────────────────────

function parseMarkdownToSections(markdown: string): PDFSection[] {
  const sections: PDFSection[] = [];
  const h2Regex = /^##\s+(.+)$/gm;
  const matches: { title: string; index: number }[] = [];

  let m;
  while ((m = h2Regex.exec(markdown)) !== null) {
    matches.push({ title: m[1].trim(), index: m.index });
  }

  if (matches.length === 0) {
    // No ## headings — treat entire content as one intro section
    sections.push({ type: "intro", title: "Guide", content: markdown.trim() });
    return sections;
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].title.length + 4; // skip "## title\n"
    const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    const content = markdown.slice(start, end).trim();
    const title = matches[i].title.replace(/[*_#]/g, "").trim();

    // Infer section type from title
    const titleLower = title.toLowerCase();
    const type: PDFSection["type"] =
      titleLower.includes("intro") || titleLower.includes("welcome") || titleLower.includes("overview") ? "intro"
      : titleLower.includes("hotel") || titleLower.includes("resort") || titleLower.includes("stay") ? "resorts"
      : titleLower.includes("restaurant") || titleLower.includes("food") || titleLower.includes("dining") || titleLower.includes("eat") ? "dining"
      : titleLower.includes("activit") || titleLower.includes("thing") || titleLower.includes("attract") || titleLower.includes("experience") ? "activities"
      : titleLower.includes("pack") || titleLower.includes("checklist") ? "packing"
      : titleLower.includes("budget") || titleLower.includes("cost") || titleLower.includes("price") || titleLower.includes("money") ? "budget"
      : titleLower.includes("itinerary") || titleLower.includes("day") || titleLower.includes("schedule") ? "itinerary"
      : titleLower.includes("affiliate") || titleLower.includes("book") || titleLower.includes("link") ? "affiliate"
      : "tips";

    sections.push({ type, title, content });
  }

  return sections;
}

// ─── Fallback content when AI is unavailable ──────────────────────────────────

function buildFallbackContent(
  template: { name: string; sectionTypes: string[]; description: string },
  userInputs: Record<string, string>,
  destination: string,
  locale: "en" | "ar",
  siteName: string,
): string {
  const sections: string[] = [];
  const dest = destination || "your destination";
  const days = userInputs.days || userInputs.duration || "3-5";
  const budget = userInputs.budget || userInputs.budget_level || "moderate";
  const interests = userInputs.interests || userInputs.focus || "culture, food, sightseeing";

  sections.push(`## Welcome to ${dest}`);
  sections.push(`This ${template.name.toLowerCase()} was created by ${siteName}. ` +
    `It covers ${dest} with a focus on ${interests}. ` +
    `Duration: ${days} days. Budget level: ${budget}.`);
  sections.push("");

  for (const sType of template.sectionTypes) {
    const heading = sType.charAt(0).toUpperCase() + sType.slice(1).replace(/_/g, " ");
    sections.push(`## ${heading}`);
    sections.push(`Content for the "${heading}" section of your ${dest} guide will appear here. ` +
      `Use the AI edit feature to expand this section with detailed recommendations, ` +
      `insider tips, and practical information.`);
    sections.push("");
  }

  sections.push(`## Practical Information`);
  sections.push(`Useful tips for visiting ${dest}: local customs, transportation, currency, and more. ` +
    `Edit this guide with AI prompts to add specific details.`);

  if (locale === "ar") {
    sections.push("");
    sections.push(`## ملاحظة`);
    sections.push(`تم إنشاء هذا الدليل كقالب. استخدم ميزة التحرير بالذكاء الاصطناعي لإضافة محتوى مفصل باللغة العربية.`);
  }

  return sections.join("\n\n");
}
