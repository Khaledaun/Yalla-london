
/**
 * Phase 4B Topic Research API
 * Perplexity-powered topic discovery for London content
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
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
}

const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/chat/completions';

// Topic research prompt templates
const TOPIC_PROMPTS = {
  london_travel: `Find 5 trending London travel topics for ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}. Focus on:
- Hidden gems and local secrets
- Seasonal attractions and events  
- Budget-friendly activities
- Cultural experiences
- Food and dining trends

Format as JSON array with: title, description, category, priority (1-10), keywords (array), searchIntent, locale.`,

  london_events: `Research upcoming London events and cultural happenings for the next 2 weeks. Include:
- Art exhibitions and museum shows
- Theatre and music performances
- Food festivals and markets
- Community events and meetups
- Seasonal celebrations

Format as JSON array with: title, description, category, priority (1-10), keywords (array), searchIntent, locale.`,

  london_football: `Find current London football stories and upcoming matches. Cover:
- Premier League London clubs (Arsenal, Chelsea, Tottenham, etc.)
- Match previews and analysis
- Player news and transfers
- Fan experiences and matchday guides
- Historical moments and rivalries

Format as JSON array with: title, description, category, priority (1-10), keywords (array), searchIntent, locale.`,

  london_hidden_gems: `Discover lesser-known London attractions and experiences. Include:
- Secret gardens and quiet spaces
- Independent shops and boutiques
- Local pubs with character
- Underground culture and subcultures
- Architectural gems and viewpoints

Format as JSON array with: title, description, category, priority (1-10), keywords (array), searchIntent, locale.`
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
    if (!isFeatureEnabled('TOPIC_RESEARCH')) {
      return NextResponse.json(
        { error: 'Topic research feature is disabled' },
        { status: 403 }
      );
    }

    const { category, locale } = await request.json();
    
    // Validate category
    const validCategories = ['london_travel', 'london_events', 'london_football', 'london_hidden_gems'];
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
    
    // Save suggestions to database
    const savedTopics = [];
    for (const suggestion of suggestions) {
      try {
        const topic = await prisma.topicProposal.create({
          data: {
            title: suggestion.title,
            description: suggestion.description,
            category: suggestion.category,
            priority: suggestion.priority,
            keywords: suggestion.keywords,
            searchIntent: suggestion.searchIntent,
            locale: locale || 'en',
            status: 'pending',
            source: 'perplexity',
            metadata: {
              generated_at: new Date().toISOString(),
              prompt_category: category,
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
        { priority: 'desc' },
        { createdAt: 'desc' }
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
