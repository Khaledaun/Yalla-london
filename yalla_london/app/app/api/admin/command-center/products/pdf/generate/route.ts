/**
 * PDF Generation API
 *
 * Generate PDF guides using AI content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generatePDFContent,
  generatePDFHTML,
  PDFGuideConfig,
  PDF_TEMPLATES,
} from '@/lib/pdf';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
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

    // Get site info
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        domain: true,
        brand_color: true,
        secondary_color: true,
        logo_url: true,
      },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
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
        primaryColor: site.brand_color || templateConfig.primaryColor,
        secondaryColor: site.secondary_color || templateConfig.secondaryColor,
        logoUrl: site.logo_url || undefined,
        siteName: site.name,
        website: site.domain ? `https://${site.domain}` : undefined,
      },
      includeAffiliate,
    };

    // Generate HTML
    const html = generatePDFHTML(config);

    // In production, we would use a service like Puppeteer, wkhtmltopdf, or a cloud PDF service
    // For now, return the HTML and config for client-side generation
    const filename = `${destination.toLowerCase().replace(/\s+/g, '-')}-${template}-guide-${locale}.pdf`;

    // Update or create guide record
    let guide;
    if (guideId) {
      guide = await prisma.pdfGuide.update({
        where: { id: guideId },
        data: {
          title,
          destination,
          template,
          locale,
          config_json: config as any,
          status: 'published',
          updated_at: new Date(),
        },
      });
    } else {
      guide = await prisma.pdfGuide.create({
        data: {
          title,
          destination,
          template,
          locale,
          site_id: siteId,
          config_json: config as any,
          file_url: '', // Updated after upload
          file_size: 0,
          download_count: 0,
          status: 'published',
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
    console.error('Failed to generate PDF:', error);
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
    console.error('Failed to generate preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
