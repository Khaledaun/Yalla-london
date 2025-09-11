
/**
 * Phase 4B Topic Research API
 * Perplexity-powered topic discovery for London content
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface TopicSuggestion {
  title: string;
  description: string;
  category: string;
  priority: number;
  keywords: string[];
  searchIntent: 'informational' | 'commercial' | 'navigational' | 'local';
  locale: 'en' | 'ar';
  authorityLinks?: Array<{
    url: string;
    title: string;
    sourceDomain: string;
  }>;
  picanticDescription?: string; // For sports content
  longtails?: string[]; // Long-tail keywords
  questions?: string[]; // PAA-style questions
  suggestedPageType?: string; // guide, place, event, list, faq, news, itinerary
  confidenceScore?: number; // 0.0 - 1.0
  // Additional fields for future schema extension
  [key: string]: any;
}

const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';

// Enhanced topic research prompt templates for comprehensive SEO/AEO optimization
const TOPIC_PROMPTS = {
  weekly_mixed: `Generate 30 London-focused topics for content planning (15 date-relevant for next 2 weeks, 15 evergreen). Include comprehensive SEO/AEO data:

Date-relevant topics (15): Focus on upcoming events, seasonal attractions, current happenings
Evergreen topics (15): Timeless London content - hidden gems, cultural experiences, travel guides

For each topic, provide:
- title: SEO-optimized title
- description: 2-3 sentence summary
- category: london_travel, london_events, london_football, london_dining, london_culture, london_shopping, etc.
- priority: 1-10 (date-relevant = 8-10, evergreen = 5-8)
- keywords: Array of 5-8 primary & long-tail keywords
- searchIntent: informational, commercial, navigational, or local
- locale: 'en' or 'ar'
- authorityLinks: Array of 3-4 authority sources [{url, title, sourceDomain}]
- longtails: Array of 5+ long-tail keyword variations
- questions: Array of 3-5 PAA-style questions people ask
- suggestedPageType: guide, place, event, list, faq, news, itinerary
- confidenceScore: 0.7-1.0 based on search volume/relevance
- picanticDescription: For sports content only - detailed match/player analysis

Format as valid JSON array. Prioritize unique, searchable, and London-specific content.`,

  london_travel: `Find 15 trending London travel topics for ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}. Focus on:
- Hidden gems and local secrets
- Seasonal attractions and events  
- Budget-friendly activities
- Cultural experiences
- Food and dining trends

For each topic provide: title, description, category, priority (1-10), keywords (array), searchIntent, locale, authorityLinks (3-4 sources), longtails (5+ keywords), questions (3-5 PAA), suggestedPageType, confidenceScore.

Format as JSON array with SEO/AEO optimization focus.`,

  london_events: `Research 15 upcoming London events and cultural happenings for the next 2 weeks. Include:
- Art exhibitions and museum shows
- Theatre and music performances
- Food festivals and markets
- Community events and meetups
- Seasonal celebrations

For each topic provide: title, description, category, priority (1-10), keywords (array), searchIntent, locale, authorityLinks (3-4 sources), longtails (5+ keywords), questions (3-5 PAA), suggestedPageType, confidenceScore.

Format as JSON array with SEO/AEO optimization focus.`,

  london_football: `Find 15 current London football stories and upcoming matches. Cover:
- Premier League London clubs (Arsenal, Chelsea, Tottenham, etc.)
- Match previews and analysis
- Player news and transfers
- Fan experiences and matchday guides
- Historical moments and rivalries

For each topic provide: title, description, category, priority (1-10), keywords (array), searchIntent, locale, authorityLinks (3-4 sources), longtails (5+ keywords), questions (3-5 PAA), suggestedPageType, confidenceScore, picanticDescription (detailed sports analysis).

Format as JSON array with SEO/AEO optimization focus.`,

  london_hidden_gems: `Discover 15 lesser-known London attractions and experiences. Include:
- Secret gardens and quiet spaces
- Independent shops and boutiques
- Local pubs with character
- Underground culture and subcultures
- Architectural gems and viewpoints

For each topic provide: title, description, category, priority (1-10), keywords (array), searchIntent, locale, authorityLinks (3-4 sources), longtails (5+ keywords), questions (3-5 PAA), suggestedPageType, confidenceScore.

Format as JSON array with SEO/AEO optimization focus.`
};

async function callPerplexityAPI(prompt: string): Promise<TopicSuggestion[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  try {
    const response = await fetch(PERPLEXITY_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a London content researcher. Return only valid JSON arrays with the requested topic suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data: PerplexityResponse = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from Perplexity API');
    }

    // Parse JSON response
    const cleanedContent = content.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(cleanedContent) as TopicSuggestion[];
    
    return suggestions.map(suggestion => ({
      ...suggestion,
      locale: 'en' as const, // Default to English, can be updated based on brand config
    }));
    
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw new Error(`Failed to fetch topics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic research feature is disabled' },
        { status: 403 }
      );
    }

    const { category, locale } = await request.json();
    
    // Validate category
    const validCategories = [
      'weekly_mixed', 'london_travel', 'london_events', 'london_football', 
      'london_hidden_gems', 'london_dining', 'london_culture', 'london_shopping'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category specified' },
        { status: 400 }
      );
    }

    // Get appropriate prompt
    const prompt = TOPIC_PROMPTS[category as keyof typeof TOPIC_PROMPTS];
    
    // Call Perplexity API
    const suggestions = await callPerplexityAPI(prompt);
    
    // Save suggestions to database with enhanced field mapping
    const savedTopics = [];
    for (const suggestion of suggestions) {
      try {
        const topic = await prisma.topicProposal.create({
          data: {
            locale: locale || suggestion.locale || 'en',
            primary_keyword: suggestion.title, // Using title as primary keyword for now
            longtails: suggestion.longtails || suggestion.keywords || [],
            featured_longtails: suggestion.longtails ? suggestion.longtails.slice(0, 2) : suggestion.keywords?.slice(0, 2) || [],
            questions: suggestion.questions || [],
            authority_links_json: suggestion.authorityLinks || [],
            intent: suggestion.searchIntent || 'informational',
            suggested_page_type: suggestion.suggestedPageType || 'guide',
            confidence_score: suggestion.confidenceScore || 0.8,
            status: 'proposed',
            source_weights_json: {
              source: 'perplexity',
              category: category,
              generated_at: new Date().toISOString(),
              priority: suggestion.priority,
              // Store all original suggestion data for extensibility
              original_data: suggestion,
            },
          },
        });
        savedTopics.push(topic);
      } catch (dbError) {
        console.error('Database error saving topic:', dbError);
        // Continue with other topics even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      topics: savedTopics,
      count: savedTopics.length,
      category,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Topic research error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to research topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.TOPIC_RESEARCH) {
      return NextResponse.json(
        { error: 'Topic research feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = { status };
    if (category) {
      whereClause.category = category;
    }

    const topics = await prisma.topicProposal.findMany({
      where: whereClause,
      orderBy: [
        { confidence_score: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      topics,
      count: topics.length,
      filters: { status, category },
    });

  } catch (error) {
    console.error('Topic fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
