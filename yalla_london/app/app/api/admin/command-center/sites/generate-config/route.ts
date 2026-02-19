/**
 * AI Site Configuration Generator API
 *
 * Generate site configuration from natural language prompts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSiteConfig } from '@/lib/ai/site-generator';
import { isAIAvailable } from '@/lib/ai/provider';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prompt, preset } = await request.json();

    if (!prompt && !preset) {
      return NextResponse.json(
        { error: 'Either prompt or preset is required' },
        { status: 400 }
      );
    }

    // Check if AI is available
    const aiAvailable = await isAIAvailable();

    if (!aiAvailable) {
      // Return a fallback config if AI is not available
      return NextResponse.json({
        config: generateFallbackConfig(prompt, preset),
        suggestedContent: [],
        estimatedSetupTime: '1-2 hours',
        monetizationPotential: 'Medium - Add API keys to enable full AI features',
        aiGenerated: false,
      });
    }

    // Generate config using AI
    const result = await generateSiteConfig(prompt, preset);

    return NextResponse.json({
      ...result,
      aiGenerated: true,
    });
  } catch (error) {
    console.error('Failed to generate site config:', error);

    // Return fallback on error
    return NextResponse.json({
      config: generateFallbackConfig('', null),
      suggestedContent: [],
      estimatedSetupTime: '1-2 hours',
      monetizationPotential: 'Medium',
      aiGenerated: false,
      error: 'AI generation failed, using fallback config',
    });
  }
}

function generateFallbackConfig(prompt: string, preset: string | null) {
  const isArabic =
    prompt?.toLowerCase().includes('arabic') ||
    prompt?.toLowerCase().includes('arab') ||
    preset?.includes('-ar');

  const isMaldives =
    prompt?.toLowerCase().includes('maldives') || preset?.includes('maldives');

  let name = 'New Travel Site';
  let domain = 'newtravelsite.com';
  let niche = 'Travel & Lifestyle';
  let primaryColor = '#0066CC';

  if (isMaldives) {
    name = isArabic ? 'دليل المالديف' : 'Maldives Guide';
    domain = 'arabaldives.com';
    niche = 'Maldives Luxury Travel';
    primaryColor = '#0891B2';
  }

  return {
    name,
    domain,
    siteId: domain.replace('.com', '').replace(/\./g, '-'),
    locale: isArabic ? 'ar' : 'en',
    niche,
    description: prompt || `A ${niche} website`,
    branding: {
      primaryColor,
      secondaryColor: '#F59E0B',
      fontFamily: isArabic ? 'Cairo' : 'Inter',
      logoStyle: 'modern',
    },
    contentPlan: {
      initialArticles: 20,
      categories: isMaldives
        ? ['Resorts', 'Guides', 'Honeymoon', 'Family', 'Budget']
        : ['Destinations', 'Hotels', 'Food', 'Culture', 'Tips'],
      keywords: isMaldives
        ? [
            'best maldives resorts',
            'maldives honeymoon',
            'luxury maldives',
            'maldives travel guide',
            'maldives budget',
          ]
        : [
            'travel guide',
            'best hotels',
            'local food',
            'travel tips',
            'cultural experiences',
          ],
      contentTypes: ['guide', 'review', 'comparison', 'listicle'],
    },
    affiliates: ['Booking.com', 'Agoda', 'GetYourGuide', 'Viator'],
    features: ['Blog', 'Comparisons', 'PDF Guides', 'Email Capture', 'Affiliate Links'],
    seo: {
      titleTemplate: `%s | ${name}`,
      defaultDescription: `Your ultimate guide to ${niche.toLowerCase()}`,
      keywords: [],
    },
    socialMedia: {
      platforms: ['Instagram', 'Twitter', 'Facebook'],
      postingFrequency: 'daily',
    },
  };
}
