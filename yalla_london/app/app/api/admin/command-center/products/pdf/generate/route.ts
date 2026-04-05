/**
 * PDF Generation API
 *
 * Generate PDF guides using AI content.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import {
  generatePDFContent,
  generatePDFHTML,
  PDFGuideConfig,
  PDF_TEMPLATES,
} from '@/lib/pdf';
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteConfig } from "@/config/sites";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const {
      guideId,
      title,
      subtitle,
      destination,
      template = 'luxury',
      locale = 'en',
      siteId,
      includeAffiliate = true,
      customSections,
    } = await request.json();

    // Get site info from config (no Site model in DB)
    const siteConfig = getSiteConfig(siteId);
    if (!siteConfig) {
      return NextResponse.json(
        { error: 'Site not found in config' },
        { status: 404 }
      );
    }

    // Get template config
    const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;

    // Generate content sections using AI or use custom
    const sections = customSections || await generatePDFContent(destination, template, locale);

    // Add affiliate section if enabled
    if (includeAffiliate) {
      sections.push({
        type: 'affiliate',
        title: locale === 'ar' ? 'احجز رحلتك' : 'Book Your Trip',
        content: locale === 'ar'
          ? 'استمتع بأفضل العروض من شركائنا الموثوقين'
          : 'Enjoy the best deals from our trusted partners',
      });
    }

    // Build PDF config
    const config: PDFGuideConfig = {
      title,
      subtitle,
      destination,
      locale,
      siteId,
      template: template as any,
      sections,
      branding: {
        primaryColor: siteConfig.primaryColor || templateConfig.primaryColor,
        secondaryColor: siteConfig.secondaryColor || templateConfig.secondaryColor,
        siteName: siteConfig.name,
        website: siteConfig.domain ? `https://${siteConfig.domain}` : undefined,
      },
      includeAffiliate,
    };

    // Generate HTML
    const html = generatePDFHTML(config);

    const filename = `${(destination || 'guide').toLowerCase().replace(/\s+/g, '-')}-${template}-guide-${locale}.pdf`;
    const slug = `${(destination || 'guide').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${template}-${locale}`;

    // Update or create guide record
    let guide;
    if (guideId) {
      guide = await prisma.pdfGuide.update({
        where: { id: guideId },
        data: {
          title,
          style: template,
          language: locale,
          contentSections: config as any,
          htmlContent: html,
          status: 'generated',
        },
      });
    } else {
      guide = await prisma.pdfGuide.create({
        data: {
          title,
          slug,
          description: subtitle || null,
          site: siteId,
          style: template,
          language: locale,
          contentSections: sections,
          htmlContent: html,
          status: 'generated',
        },
      });
    }

    return NextResponse.json({
      success: true,
      guideId: guide.id,
      filename,
      html,
      config,
      sections,
      message: 'PDF content generated. Use client-side library or server PDF service to render.',
    });
  } catch (error) {
    console.error('[pdf-generate] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * Preview endpoint - returns just the HTML
 */
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const {
      title,
      destination,
      template = 'luxury',
      locale = 'en',
      sections,
      branding,
    } = await request.json();

    const templateConfig = PDF_TEMPLATES[template as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.luxury;

    const config: PDFGuideConfig = {
      title,
      destination,
      locale,
      siteId: '',
      template: template as any,
      sections: sections || [],
      branding: {
        primaryColor: branding?.primaryColor || templateConfig.primaryColor,
        secondaryColor: branding?.secondaryColor || templateConfig.secondaryColor,
        siteName: branding?.siteName || 'Preview',
      },
    };

    const html = generatePDFHTML(config);

    return NextResponse.json({
      html,
      config,
    });
  } catch (error) {
    console.error('[pdf-generate] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
