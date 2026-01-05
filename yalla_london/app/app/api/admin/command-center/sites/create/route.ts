/**
 * Create Site API
 *
 * Create a new site with the provided configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateContentIdeas } from '@/lib/ai/content-generator';
import { isAIAvailable } from '@/lib/ai/provider';

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    const {
      name,
      domain,
      siteId,
      locale,
      niche,
      description,
      branding,
      contentPlan,
      affiliates,
      features,
      seo,
      socialMedia,
    } = config;

    // Create the site
    const site = await prisma.site.create({
      data: {
        name,
        slug: siteId,
        domain,
        default_locale: locale,
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        primary_color: branding?.primaryColor,
        secondary_color: branding?.secondaryColor,
        settings_json: {
          niche,
          description,
          branding,
          contentPlan,
          features,
          seo,
          socialMedia,
        },
        features_json: features?.reduce(
          (acc: Record<string, boolean>, f: string) => ({
            ...acc,
            [f.toLowerCase().replace(/\s+/g, '_')]: true,
          }),
          {}
        ),
        is_active: true,
      },
    });

    // Create primary domain
    if (domain) {
      await prisma.domain.create({
        data: {
          site_id: site.id,
          hostname: domain,
          is_primary: true,
          verified: false,
          verification_method: 'dns',
          verification_token: crypto.randomUUID(),
        },
      });
    }

    // Create categories
    if (contentPlan?.categories?.length) {
      for (const categoryName of contentPlan.categories) {
        await prisma.category.create({
          data: {
            name_en: categoryName,
            name_ar: categoryName, // Should be translated
            slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
          },
        }).catch(() => {
          // Category might already exist
        });
      }
    }

    // Set up affiliate partners
    if (affiliates?.length) {
      for (const affiliateName of affiliates) {
        await prisma.affiliatePartner.upsert({
          where: { slug: affiliateName.toLowerCase().replace(/\s+/g, '-') },
          create: {
            name: affiliateName,
            slug: affiliateName.toLowerCase().replace(/\s+/g, '-'),
            partner_type: 'HOTEL',
            is_active: true,
          },
          update: {},
        }).catch(() => {
          // Partner might already exist
        });
      }
    }

    // Generate initial content ideas if AI is available
    let contentIdeas: Array<{ title: string; type: string; priority: number }> = [];

    if (await isAIAvailable()) {
      try {
        const ideas = await generateContentIdeas({
          niche,
          locale,
          count: contentPlan?.initialArticles || 10,
        });

        contentIdeas = ideas.map((idea, index) => ({
          title: idea.title,
          type: idea.difficulty === 'hard' ? 'guide' : 'article',
          priority: index + 1,
        }));

        // Create topic proposals for content queue
        for (const idea of ideas.slice(0, 10)) {
          await prisma.topicProposal.create({
            data: {
              site_id: site.id,
              title: idea.title,
              locale,
              primary_keyword: idea.keywords[0] || idea.title,
              longtails: idea.keywords,
              featured_longtails: idea.keywords.slice(0, 2),
              questions: [],
              authority_links_json: [],
              intent: 'info',
              suggested_page_type: idea.difficulty === 'hard' ? 'guide' : 'list',
              status: 'planned',
              confidence_score: 0.8,
              source_weights_json: {},
            },
          }).catch(() => {
            // Ignore errors
          });
        }
      } catch (error) {
        console.error('Failed to generate content ideas:', error);
      }
    }

    // Create site configuration
    await prisma.siteConfig.upsert({
      where: { site_id: site.id },
      create: {
        site_id: site.id,
        theme_config: branding,
        hero_headline: description,
      },
      update: {
        theme_config: branding,
        hero_headline: description,
      },
    }).catch(() => {
      // Ignore errors
    });

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        domain: domain,
      },
      contentIdeas,
      nextSteps: [
        'Point your domain DNS to Vercel',
        'Configure affiliate partner accounts',
        'Set up Google Analytics',
        'Review and publish initial content',
      ],
    });
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json(
      { error: 'Failed to create site', details: String(error) },
      { status: 500 }
    );
  }
}
