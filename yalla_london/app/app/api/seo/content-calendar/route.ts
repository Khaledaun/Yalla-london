export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { googleTrends } from '@/lib/integrations/google-trends';

/**
 * Content Calendar API
 * Generates SEO-optimized content calendars based on:
 * - Trending topics from Google Trends
 * - Seasonal events (Ramadan, Christmas, etc.)
 * - Keyword opportunities
 * - Content gaps
 */

interface CalendarEntry {
  date: string;
  title: string;
  description: string;
  keywords: string[];
  category: string;
  locale: 'en' | 'ar';
  priority: 'high' | 'medium' | 'low';
  type: 'blog' | 'guide' | 'listicle' | 'event' | 'seasonal';
  estimatedTraffic: number;
  notes: string;
}

// Seasonal events calendar for 2025-2026
const SEASONAL_EVENTS = [
  { month: 1, name: 'New Year London', keywords: ['new year london', 'nye london'], category: 'events', priority: 'high' as const },
  { month: 2, name: 'Valentine\'s Day London', keywords: ['romantic restaurants london', 'valentines london'], category: 'dining', priority: 'medium' as const },
  { month: 3, name: 'Ramadan London', keywords: ['ramadan london', 'iftar london', 'halal restaurants'], category: 'cultural', priority: 'high' as const },
  { month: 4, name: 'Eid al-Fitr London', keywords: ['eid london', 'eid celebrations london'], category: 'cultural', priority: 'high' as const },
  { month: 4, name: 'Easter London', keywords: ['easter london', 'easter brunch london'], category: 'events', priority: 'medium' as const },
  { month: 5, name: 'Chelsea Flower Show', keywords: ['chelsea flower show', 'london spring events'], category: 'events', priority: 'medium' as const },
  { month: 6, name: 'Summer in London', keywords: ['summer london', 'outdoor dining london'], category: 'seasonal', priority: 'high' as const },
  { month: 7, name: 'Wimbledon', keywords: ['wimbledon london', 'london tennis'], category: 'events', priority: 'medium' as const },
  { month: 8, name: 'Notting Hill Carnival', keywords: ['notting hill carnival', 'london carnival'], category: 'events', priority: 'medium' as const },
  { month: 9, name: 'London Fashion Week', keywords: ['london fashion week', 'fashion london'], category: 'events', priority: 'high' as const },
  { month: 10, name: 'Halloween London', keywords: ['halloween london', 'spooky london'], category: 'events', priority: 'medium' as const },
  { month: 11, name: 'Bonfire Night', keywords: ['guy fawkes london', 'fireworks london'], category: 'events', priority: 'medium' as const },
  { month: 12, name: 'Christmas in London', keywords: ['christmas london', 'winter wonderland', 'christmas markets'], category: 'seasonal', priority: 'high' as const },
];

// Evergreen content topics
const EVERGREEN_TOPICS = [
  { title: 'Best Restaurants in London', keywords: ['best restaurants london', 'top restaurants london'], category: 'dining', priority: 'high' as const },
  { title: 'Luxury Hotels London', keywords: ['luxury hotels london', '5 star hotels london'], category: 'hotels', priority: 'high' as const },
  { title: 'Things to Do in London', keywords: ['things to do london', 'london attractions'], category: 'attractions', priority: 'high' as const },
  { title: 'Halal Food Guide London', keywords: ['halal food london', 'halal restaurants london'], category: 'dining', priority: 'high' as const },
  { title: 'Shopping in London', keywords: ['shopping london', 'luxury shopping london'], category: 'shopping', priority: 'medium' as const },
  { title: 'London Nightlife Guide', keywords: ['nightlife london', 'bars london'], category: 'entertainment', priority: 'medium' as const },
  { title: 'Afternoon Tea London', keywords: ['afternoon tea london', 'best afternoon tea'], category: 'dining', priority: 'high' as const },
  { title: 'London for Arab Travelers', keywords: ['arab london', 'arabic london guide'], category: 'cultural', priority: 'high' as const },
];

// Neighborhood guides
const NEIGHBORHOOD_CONTENT = [
  { area: 'Mayfair', topics: ['restaurants', 'hotels', 'shopping', 'attractions'] },
  { area: 'Knightsbridge', topics: ['hotels', 'shopping', 'dining'] },
  { area: 'Chelsea', topics: ['restaurants', 'cafes', 'attractions'] },
  { area: 'Soho', topics: ['restaurants', 'nightlife', 'entertainment'] },
  { area: 'Covent Garden', topics: ['theatre', 'shopping', 'dining'] },
  { area: 'Shoreditch', topics: ['nightlife', 'cafes', 'art'] },
  { area: 'Kensington', topics: ['museums', 'hotels', 'dining'] },
  { area: 'Westminster', topics: ['attractions', 'history', 'tours'] },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const weeks = parseInt(searchParams.get('weeks') || '4');
    const includeArabic = searchParams.get('arabic') === 'true';
    const includeTrends = searchParams.get('trends') !== 'false';

    const calendar = await generateContentCalendar(
      month ? parseInt(month) : undefined,
      weeks,
      includeArabic,
      includeTrends
    );

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totalEntries: calendar.length,
      calendar,
      summary: generateCalendarSummary(calendar),
    });
  } catch (error) {
    console.error('Content calendar generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calendar generation failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, weeks, categories, locales, customKeywords } = body;

    const calendar = await generateCustomCalendar({
      startDate: startDate ? new Date(startDate) : new Date(),
      weeks: weeks || 4,
      categories: categories || ['dining', 'hotels', 'events', 'cultural'],
      locales: locales || ['en'],
      customKeywords: customKeywords || [],
    });

    return NextResponse.json({
      success: true,
      calendar,
      totalEntries: calendar.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calendar generation failed' },
      { status: 500 }
    );
  }
}

async function generateContentCalendar(
  month?: number,
  weeks: number = 4,
  includeArabic: boolean = true,
  includeTrends: boolean = true
): Promise<CalendarEntry[]> {
  const calendar: CalendarEntry[] = [];
  const startDate = new Date();
  const currentMonth = month || startDate.getMonth() + 1;

  // 1. Add seasonal content
  const seasonalEvents = SEASONAL_EVENTS.filter(e =>
    e.month >= currentMonth && e.month <= currentMonth + 2
  );

  seasonalEvents.forEach(event => {
    const eventDate = new Date(startDate.getFullYear(), event.month - 1, 1);

    calendar.push({
      date: eventDate.toISOString().split('T')[0],
      title: `Guide: ${event.name}`,
      description: `Comprehensive guide to ${event.name.toLowerCase()} - what to see, where to eat, and things to do.`,
      keywords: event.keywords,
      category: event.category,
      locale: 'en',
      priority: event.priority,
      type: 'guide',
      estimatedTraffic: event.priority === 'high' ? 5000 : 2000,
      notes: `Publish 2-3 weeks before event for SEO ranking time`,
    });

    // Arabic version for cultural events
    if (includeArabic && ['cultural', 'seasonal'].includes(event.category)) {
      calendar.push({
        date: eventDate.toISOString().split('T')[0],
        title: `دليل: ${event.name}`,
        description: `دليل شامل لـ ${event.name} - ماذا ترى وأين تأكل وأشياء للقيام بها.`,
        keywords: event.keywords.map(k => k + ' عربي'),
        category: event.category,
        locale: 'ar',
        priority: event.priority,
        type: 'guide',
        estimatedTraffic: event.priority === 'high' ? 3000 : 1500,
        notes: 'Arabic version for GCC audience',
      });
    }
  });

  // 2. Add weekly evergreen content
  for (let week = 0; week < weeks; week++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(weekDate.getDate() + week * 7);

    const topicIndex = week % EVERGREEN_TOPICS.length;
    const topic = EVERGREEN_TOPICS[topicIndex];

    calendar.push({
      date: weekDate.toISOString().split('T')[0],
      title: `${topic.title} - ${new Date().getFullYear()} Update`,
      description: `Updated guide to ${topic.title.toLowerCase()} with latest recommendations.`,
      keywords: topic.keywords,
      category: topic.category,
      locale: 'en',
      priority: topic.priority,
      type: 'listicle',
      estimatedTraffic: topic.priority === 'high' ? 3000 : 1500,
      notes: 'Evergreen content - update quarterly',
    });
  }

  // 3. Add neighborhood guides (one per week)
  for (let week = 0; week < Math.min(weeks, NEIGHBORHOOD_CONTENT.length); week++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(weekDate.getDate() + week * 7 + 3); // Mid-week publish

    const neighborhood = NEIGHBORHOOD_CONTENT[week];

    calendar.push({
      date: weekDate.toISOString().split('T')[0],
      title: `Complete Guide to ${neighborhood.area}, London`,
      description: `Everything you need to know about ${neighborhood.area} - best ${neighborhood.topics.join(', ')}.`,
      keywords: [`${neighborhood.area.toLowerCase()} london`, ...neighborhood.topics.map(t => `${t} ${neighborhood.area.toLowerCase()}`)],
      category: 'neighborhood',
      locale: 'en',
      priority: 'medium',
      type: 'guide',
      estimatedTraffic: 2000,
      notes: `Neighborhood guide - great for long-tail keywords`,
    });
  }

  // 4. Add trending topics if available
  if (includeTrends) {
    try {
      const trending = await googleTrends.getTrendingSearches('GB');
      const relevantTrending = trending
        .filter(t => {
          const title = t.title?.toLowerCase() || '';
          return title.includes('london') ||
            title.includes('restaurant') ||
            title.includes('hotel') ||
            title.includes('travel');
        })
        .slice(0, 3);

      relevantTrending.forEach((trend, idx) => {
        const trendDate = new Date(startDate);
        trendDate.setDate(trendDate.getDate() + idx);

        calendar.push({
          date: trendDate.toISOString().split('T')[0],
          title: `Trending: ${trend.title}`,
          description: `Coverage of trending topic "${trend.title}" with London angle.`,
          keywords: [trend.title.toLowerCase(), `${trend.title.toLowerCase()} london`],
          category: 'trending',
          locale: 'en',
          priority: 'high',
          type: 'blog',
          estimatedTraffic: parseInt(trend.traffic?.replace(/[^0-9]/g, '') || '1000'),
          notes: 'URGENT: Trending topic - publish within 24 hours for maximum impact',
        });
      });
    } catch (error) {
      console.log('Trends not available, skipping trending content');
    }
  }

  // Sort by date and priority
  return calendar.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

async function generateCustomCalendar(options: {
  startDate: Date;
  weeks: number;
  categories: string[];
  locales: string[];
  customKeywords: string[];
}): Promise<CalendarEntry[]> {
  const calendar: CalendarEntry[] = [];

  // Add custom keyword content
  options.customKeywords.forEach((keyword, idx) => {
    const date = new Date(options.startDate);
    date.setDate(date.getDate() + idx * 2);

    calendar.push({
      date: date.toISOString().split('T')[0],
      title: `Guide: ${keyword}`,
      description: `Comprehensive guide covering ${keyword}`,
      keywords: [keyword, `best ${keyword}`, `${keyword} london`],
      category: 'custom',
      locale: 'en',
      priority: 'high',
      type: 'guide',
      estimatedTraffic: 2000,
      notes: 'Custom keyword target',
    });
  });

  return calendar;
}

function generateCalendarSummary(calendar: CalendarEntry[]): {
  totalPosts: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byLocale: Record<string, number>;
  estimatedTotalTraffic: number;
  topKeywords: string[];
} {
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  const allKeywords: string[] = [];

  calendar.forEach(entry => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    byPriority[entry.priority] = (byPriority[entry.priority] || 0) + 1;
    byLocale[entry.locale] = (byLocale[entry.locale] || 0) + 1;
    allKeywords.push(...entry.keywords);
  });

  // Get top keywords by frequency
  const keywordCounts: Record<string, number> = {};
  allKeywords.forEach(k => {
    keywordCounts[k] = (keywordCounts[k] || 0) + 1;
  });

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword]) => keyword);

  return {
    totalPosts: calendar.length,
    byCategory,
    byPriority,
    byLocale,
    estimatedTotalTraffic: calendar.reduce((sum, e) => sum + e.estimatedTraffic, 0),
    topKeywords,
  };
}
