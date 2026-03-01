import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAdminAuth } from "@/lib/admin-middleware";
import { SITES } from "@/config/sites";

export const dynamic = "force-dynamic";

/**
 * Seed all sites from config/sites.ts into the database.
 * Creates or updates site records to match the central config.
 * Protected by admin auth.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const results: any[] = [];

    for (const [siteId, config] of Object.entries(SITES)) {
      try {
        const site = await prisma.site.upsert({
          where: { slug: config.slug },
          update: {
            name: config.name,
            domain: config.domain,
            is_active: true,
            default_locale: config.locale,
            direction: config.direction,
            primary_color: config.primaryColor,
            secondary_color: config.secondaryColor,
            settings_json: {
              destination: config.destination,
              country: config.country,
              currency: config.currency,
              affiliateCategories: config.affiliateCategories,
              primaryKeywordsEN: config.primaryKeywordsEN,
              primaryKeywordsAR: config.primaryKeywordsAR,
            },
            features_json: {
              contentGeneration: true,
              seoAgent: true,
              affiliateInject: true,
              bilingualContent: true,
            },
          },
          create: {
            name: config.name,
            slug: config.slug,
            domain: config.domain,
            is_active: true,
            default_locale: config.locale,
            direction: config.direction,
            primary_color: config.primaryColor,
            secondary_color: config.secondaryColor,
            settings_json: {
              destination: config.destination,
              country: config.country,
              currency: config.currency,
              affiliateCategories: config.affiliateCategories,
              primaryKeywordsEN: config.primaryKeywordsEN,
              primaryKeywordsAR: config.primaryKeywordsAR,
            },
            homepage_json: {},
            features_json: {
              contentGeneration: true,
              seoAgent: true,
              affiliateInject: true,
              bilingualContent: true,
            },
          },
        });

        results.push({
          siteId,
          name: config.name,
          status: "ok",
          dbId: site.id,
        });
      } catch (error) {
        results.push({
          siteId,
          name: config.name,
          status: "error",
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.filter((r) => r.status === "ok").length}/${results.length} sites`,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
});
