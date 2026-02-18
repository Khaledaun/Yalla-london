export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

/**
 * PDF Guide Generation & Download API
 *
 * POST: Generate a PDF travel guide using AI content + HTML-to-PDF
 * GET: Download a previously generated PDF by token
 *
 * Integrates with:
 * - AI provider for content generation
 * - DigitalProduct & Purchase tables for sales tracking
 * - Lead capture for email collection
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      destination,
      template = "luxury",
      locale = "en",
      customerEmail,
      customerName,
      productId,
      free = false,
    } = body;

    if (!destination) {
      return NextResponse.json(
        { error: "destination is required" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");

    // Step 1: Generate PDF content using AI
    const { generatePDFContent, generatePDFHTML } = await import(
      "@/lib/pdf/generator"
    );
    const sections = await generatePDFContent(
      destination,
      template,
      locale as "ar" | "en",
    );

    const { getSiteDomain, getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
    const currentSiteId = getDefaultSiteId();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(currentSiteId);
    const siteConfig = getSiteConfig(currentSiteId);
    const siteName = siteConfig?.name || "Yalla London";

    // Step 2: Generate HTML
    const html = generatePDFHTML({
      title:
        locale === "ar"
          ? `دليل السفر إلى ${destination}`
          : `${destination} Travel Guide`,
      subtitle:
        locale === "ar"
          ? "دليلك الشامل من يالا لندن"
          : "Your Complete Guide by Yalla London",
      destination,
      locale: locale as "ar" | "en",
      siteId: currentSiteId,
      template: template as any,
      sections,
      branding: {
        primaryColor: siteConfig?.primaryColor || "#7c3aed",
        secondaryColor: siteConfig?.secondaryColor || "#d4af37",
        logoUrl: `${siteUrl}/images/yalla-london-logo.svg`,
        siteName,
        contactEmail: `hello@${siteConfig?.domain || "yalla-london.com"}`,
        website: siteUrl,
      },
      includeAffiliate: true,
    });

    // Step 3: Store the generated HTML as a "PDF" resource
    // In production, this would use Puppeteer/Playwright to convert HTML to PDF
    // For now, we store the HTML and provide it as a downloadable resource
    const downloadToken = generateToken();
    const filename = `${destination.toLowerCase().replace(/\s+/g, "-")}-${template}-guide-${locale}.html`;

    // Step 4: Create or find the digital product
    let product;
    if (productId) {
      product = await prisma.digitalProduct.findUnique({
        where: { id: productId },
      });
    }

    if (!product && !free) {
      // Create a digital product for this guide
      const slug = `${destination.toLowerCase().replace(/\s+/g, "-")}-${template}-guide`;
      product = await prisma.digitalProduct.upsert({
        where: { slug },
        update: {},
        create: {
          name_en: `${destination} ${template.charAt(0).toUpperCase() + template.slice(1)} Travel Guide`,
          name_ar: `دليل السفر ${template === "luxury" ? "الفاخر" : ""} إلى ${destination}`,
          slug,
          description_en: `Complete ${template} travel guide for ${destination}, including hotels, restaurants, activities, and insider tips.`,
          description_ar: `دليل سفر ${template === "luxury" ? "فاخر" : ""} شامل لـ ${destination}`,
          price: free ? 0 : 999, // $9.99
          compare_price: free ? 0 : 1999, // $19.99
          currency: "USD",
          product_type: "PDF_GUIDE",
          is_active: true,
          featured: false,
          features_json: [
            `${sections.length} comprehensive sections`,
            `Available in ${locale === "ar" ? "Arabic" : "English"}`,
            `${template} style recommendations`,
            "Packing checklist included",
            "Offline accessible",
          ],
        },
      });
    }

    // Step 5: Create purchase record (or lead capture for free)
    if (customerEmail) {
      if (product) {
        await prisma.purchase.create({
          data: {
            site_id: currentSiteId,
            product_id: product.id,
            customer_email: customerEmail,
            customer_name: customerName || "",
            amount: free ? 0 : product.price,
            currency: product.currency,
            status: free ? "COMPLETED" : "PENDING",
            download_token: downloadToken,
            download_limit: 5,
          },
        });
      }

      // Capture as lead
      try {
        await prisma.lead.create({
          data: {
            site_id: currentSiteId,
            email: customerEmail,
            name: customerName,
            lead_type: "GUIDE_DOWNLOAD",
            lead_source: "pdf_generator",
            status: "NEW",
            score: 30,
            interests_json: [destination, template, locale],
            landing_page: `/products/pdf/${product?.slug || "guide"}`,
          },
        });
      } catch {
        // Lead might already exist (unique constraint on site_id + email)
      }
    }

    // Step 6: Update digital product with file info if it exists
    if (product) {
      try {
        await prisma.digitalProduct.update({
          where: { id: product.id },
          data: {
            file_url: `/api/products/pdf/download?token=${downloadToken}`,
            file_size: html.length,
            features_json: [
              `${sections.length} comprehensive sections`,
              `Available in ${locale === "ar" ? "Arabic" : "English"}`,
              `${template} style recommendations`,
              "Packing checklist included",
              "Offline accessible",
            ],
          },
        });
      } catch (e) {
        console.warn("Failed to update digital product file info:", e);
      }
    }

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/products/pdf/download?token=${downloadToken}`,
      downloadToken,
      filename,
      product: product
        ? { id: product.id, name: product.name_en, price: product.price }
        : null,
      sections: sections.length,
      locale,
      template,
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF generation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET: Download / validate a purchase by token
 *
 * Used by the /shop/download page to validate the token and show
 * the download UI. The actual file delivery happens either:
 *   - via redirect to file_url (S3/R2 signed URL) if configured, or
 *   - via the /api/products/download/[token] streaming endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Download token required" },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    // Find the purchase
    const purchase = await prisma.purchase.findUnique({
      where: { download_token: token },
      include: { product: true },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Invalid download token" },
        { status: 404 },
      );
    }

    // Check download limit
    if (purchase.download_count >= purchase.download_limit) {
      return NextResponse.json(
        { error: "Download limit reached", code: "LIMIT_REACHED" },
        { status: 403 },
      );
    }

    // Check payment status (allow free or completed)
    if (purchase.amount > 0 && purchase.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Payment not completed", code: "PAYMENT_PENDING" },
        { status: 402 },
      );
    }

    // Increment download count
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { download_count: { increment: 1 } },
    });

    // If the product has an external file URL (S3/R2), redirect to it
    const fileUrl = purchase.product.file_url;
    if (
      fileUrl &&
      (fileUrl.startsWith("https://") || fileUrl.startsWith("http://"))
    ) {
      return NextResponse.redirect(fileUrl);
    }

    // Otherwise return download metadata for the client-side download page
    return NextResponse.json({
      success: true,
      product: {
        name: purchase.product.name_en,
        name_ar: purchase.product.name_ar,
        type: purchase.product.product_type,
        slug: purchase.product.slug,
      },
      downloadsUsed: purchase.download_count + 1,
      downloadsRemaining: purchase.download_limit - purchase.download_count - 1,
      fileUrl: fileUrl || null,
    });
  } catch (error) {
    console.error("Download validation failed:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

function generateToken(): string {
  const { randomBytes } = require("crypto");
  return `pdf_${randomBytes(24).toString("hex")}`;
}
