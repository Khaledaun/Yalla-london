/**
 * AI Site Generator
 *
 * Generate site configuration from natural language prompts.
 */

import { generateJSON, AICompletionOptions } from './provider';

export interface SiteConfig {
  name: string;
  domain: string;
  siteId: string;
  locale: 'ar' | 'en';
  niche: string;
  description: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoStyle: string;
  };
  contentPlan: {
    initialArticles: number;
    categories: string[];
    keywords: string[];
    contentTypes: string[];
  };
  affiliates: string[];
  features: string[];
  seo: {
    titleTemplate: string;
    defaultDescription: string;
    keywords: string[];
  };
  socialMedia: {
    platforms: string[];
    postingFrequency: string;
  };
}

export interface SiteGenerationResult {
  config: SiteConfig;
  suggestedContent: Array<{
    title: string;
    type: string;
    priority: number;
  }>;
  estimatedSetupTime: string;
  monetizationPotential: string;
}

/**
 * Generate site configuration from a prompt
 */
export async function generateSiteConfig(
  prompt: string,
  preset?: string,
  options?: AICompletionOptions
): Promise<SiteGenerationResult> {
  const systemPrompt = `You are an expert in building travel and lifestyle content websites.
Generate comprehensive site configurations that are optimized for SEO, monetization, and user engagement.
Consider the target audience, language requirements, and content strategy.

For Arabic sites:
- Use RTL-friendly fonts like Cairo, Tajawal, or IBM Plex Arabic
- Choose culturally appropriate color schemes
- Consider halal-friendly and family-focused content

For travel sites:
- Recommend relevant affiliate partners (Booking.com, Agoda, GetYourGuide, etc.)
- Plan content around high-value keywords
- Include comparison and guide content types`;

  const presetContext = preset ? `\n\nPreset template selected: ${preset}` : '';

  const fullPrompt = `Generate a complete site configuration based on this description:

"${prompt}"${presetContext}

Analyze the request and create a detailed site configuration including:
1. Site name and domain suggestion
2. Primary locale (ar for Arabic, en for English)
3. Niche identification
4. Branding (colors, fonts appropriate for the locale)
5. Content plan (categories, keywords, content types)
6. Recommended affiliate partners
7. Features to enable
8. SEO configuration
9. Social media strategy

Return as JSON with this structure:
{
  "config": {
    "name": "Site Name",
    "domain": "sitename.com",
    "siteId": "site-name",
    "locale": "ar" or "en",
    "niche": "Description of niche",
    "description": "Site description",
    "branding": {
      "primaryColor": "#hexcolor",
      "secondaryColor": "#hexcolor",
      "fontFamily": "Font Name",
      "logoStyle": "modern/classic/minimal"
    },
    "contentPlan": {
      "initialArticles": 20,
      "categories": ["Category 1", "Category 2"],
      "keywords": ["keyword1", "keyword2"],
      "contentTypes": ["guide", "review", "comparison"]
    },
    "affiliates": ["Booking.com", "Agoda"],
    "features": ["Blog", "Comparisons", "PDF Guides"],
    "seo": {
      "titleTemplate": "%s | Site Name",
      "defaultDescription": "...",
      "keywords": ["keyword1", "keyword2"]
    },
    "socialMedia": {
      "platforms": ["Instagram", "Twitter"],
      "postingFrequency": "daily/weekly"
    }
  },
  "suggestedContent": [
    {"title": "Article Title", "type": "guide", "priority": 1}
  ],
  "estimatedSetupTime": "X hours/days",
  "monetizationPotential": "High/Medium/Low with explanation"
}`;

  return generateJSON<SiteGenerationResult>(fullPrompt, { ...options, systemPrompt });
}

/**
 * Generate content plan for an existing site
 */
export async function generateContentPlan(options: {
  siteId: string;
  niche: string;
  locale: 'ar' | 'en';
  existingCategories?: string[];
  targetArticleCount?: number;
} & AICompletionOptions): Promise<{
  categories: Array<{
    name: string;
    slug: string;
    description: string;
    targetArticles: number;
    keywords: string[];
  }>;
  contentCalendar: Array<{
    week: number;
    articles: Array<{
      title: string;
      category: string;
      type: string;
      keywords: string[];
    }>;
  }>;
  seoStrategy: {
    primaryKeywords: string[];
    longTailKeywords: string[];
    competitorKeywords: string[];
  };
}> {
  const { niche, locale, existingCategories, targetArticleCount = 50 } = options;

  const systemPrompt = locale === 'ar'
    ? `أنت خبير في استراتيجية المحتوى ومحركات البحث للمواقع العربية.`
    : `You are a content strategy and SEO expert.`;

  const prompt = `Create a comprehensive content plan for a ${niche} website.

Target: ${targetArticleCount} articles
Language: ${locale === 'ar' ? 'Arabic' : 'English'}
${existingCategories?.length ? `Existing categories: ${existingCategories.join(', ')}` : ''}

Provide:
1. Category structure with target article counts
2. 12-week content calendar
3. SEO keyword strategy

Return as JSON.`;

  return generateJSON(prompt, { ...options, systemPrompt });
}

/**
 * Generate branding suggestions
 */
export async function generateBrandingSuggestions(options: {
  siteName: string;
  niche: string;
  locale: 'ar' | 'en';
  targetAudience?: string;
} & AICompletionOptions): Promise<{
  colorPalettes: Array<{
    name: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    description: string;
  }>;
  fontPairings: Array<{
    heading: string;
    body: string;
    description: string;
  }>;
  logoStyles: Array<{
    style: string;
    description: string;
    elements: string[];
  }>;
  brandVoice: {
    tone: string;
    personality: string[];
    doList: string[];
    dontList: string[];
  };
}> {
  const { siteName, niche, locale, targetAudience } = options;

  const systemPrompt = `You are a brand identity expert specializing in travel and lifestyle websites.
Consider cultural appropriateness and audience preferences when suggesting branding.`;

  const prompt = `Generate branding suggestions for "${siteName}", a ${niche} website.

Language: ${locale === 'ar' ? 'Arabic' : 'English'}
${targetAudience ? `Target audience: ${targetAudience}` : ''}

Provide:
1. 3 color palette options with hex codes
2. 2-3 font pairing suggestions (appropriate for ${locale === 'ar' ? 'Arabic/RTL' : 'English'})
3. Logo style suggestions
4. Brand voice guidelines

Return as JSON.`;

  return generateJSON(prompt, { ...options, systemPrompt });
}

/**
 * Analyze competitor site and generate recommendations
 */
export async function analyzeCompetitor(options: {
  competitorUrl: string;
  locale: 'ar' | 'en';
} & AICompletionOptions): Promise<{
  strengths: string[];
  weaknesses: string[];
  contentGaps: string[];
  keywordOpportunities: string[];
  recommendations: string[];
  estimatedTraffic: string;
  monetizationMethods: string[];
}> {
  const { competitorUrl, locale } = options;

  const systemPrompt = `You are a competitive analysis expert for travel websites.`;

  const prompt = `Analyze the competitive landscape for a ${locale === 'ar' ? 'Arabic' : 'English'} travel website.

Consider competitor: ${competitorUrl}

Provide:
1. Likely strengths and weaknesses
2. Content gaps to exploit
3. Keyword opportunities
4. Strategic recommendations
5. Estimated traffic range
6. Monetization methods they likely use

Return as JSON.`;

  return generateJSON(prompt, { ...options, systemPrompt });
}
