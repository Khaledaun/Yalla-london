// ── Perplexity Computer Task Templates ───────────────────────────────────────
// Pre-built templates for the 10 use cases identified in our analysis.
// Each template has a prompt with {{variables}} that get filled at execution time.

import type { TaskTemplate, TaskCategory } from './types'

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: Registration & Form Filling (ROI: 9/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reg-affiliate-apply',
    category: 'registration',
    taskType: 'affiliate-application',
    title: 'Apply to {{programName}} Affiliate Program',
    promptTemplate: `Go to {{applicationUrl}} and complete the affiliate program application for {{programName}}.

Use these details:
- Website: {{siteDomain}}
- Company: Zenitha.Luxury LLC
- Business type: Travel content publisher
- Monthly traffic: {{estimatedTraffic}}
- Content focus: Luxury travel for international visitors with expertise in Arab/Gulf travelers
- Monetization: Affiliate links in editorial content (hotels, experiences, restaurants)

Fill out all required fields. If there's a "describe your website" field, write: "{{siteDomain}} is a premium luxury travel guide covering hotels, restaurants, experiences and cultural insights. Our audience includes high-net-worth international travelers, particularly from the Gulf region. We publish 2-3 in-depth, SEO-optimized articles daily with genuine first-hand recommendations."

Screenshot the confirmation page when done.`,
    priority: 'high',
    estimatedCredits: 15,
    tags: ['affiliate', 'registration', 'revenue'],
    requiresSiteId: true,
    variables: ['programName', 'applicationUrl', 'siteDomain', 'estimatedTraffic'],
    description: 'Submit an affiliate program application with Zenitha business details',
    expectedOutput: 'Confirmation screenshot + application reference number',
    roiRating: 9,
  },
  {
    id: 'reg-directory-submit',
    category: 'registration',
    taskType: 'directory-submission',
    title: 'Submit {{siteDomain}} to {{directoryName}}',
    promptTemplate: `Navigate to {{directoryUrl}} and submit the website {{siteDomain}} to their directory.

Website details:
- Name: {{siteName}}
- URL: https://www.{{siteDomain}}
- Category: Travel / Luxury Travel
- Description: "{{siteName}} is a luxury travel guide for international visitors, featuring curated hotel reviews, restaurant recommendations, cultural experiences, and insider tips. Published by Zenitha.Luxury LLC."
- Contact: hello@{{siteDomain}}

Complete all required fields and submit. Screenshot the confirmation.`,
    priority: 'medium',
    estimatedCredits: 10,
    tags: ['seo', 'backlinks', 'directory'],
    requiresSiteId: true,
    variables: ['siteDomain', 'siteName', 'directoryName', 'directoryUrl'],
    description: 'Submit site to a travel or business directory for backlinks',
    expectedOutput: 'Confirmation of submission + listing URL if immediate',
    roiRating: 7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: SEO/AIO/GEO Monitoring (ROI: 8/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'seo-competitor-audit',
    category: 'seo',
    taskType: 'competitor-analysis',
    title: 'Competitor SEO Audit: {{competitorDomain}}',
    promptTemplate: `Analyze the SEO strategy of {{competitorDomain}} which competes with our site {{siteDomain}} in the {{niche}} niche.

Research and report on:
1. **Content Strategy**: What topics do they cover? How many articles? What's their publishing frequency?
2. **Top Ranking Pages**: What are their top 10 pages by estimated traffic? What keywords do they target?
3. **Content Quality**: Average word count, use of images, heading structure, affiliate integration
4. **Schema Markup**: What structured data types do they use? (Product, Article, FAQPage, etc.)
5. **Meta Tags Pattern**: Analyze their title tag and meta description patterns
6. **Internal Linking**: How do they structure their navigation and internal links?
7. **Affiliate Strategy**: What affiliate programs do they use? How do they integrate links?
8. **Content Gaps**: What topics do they cover that {{siteDomain}} doesn't?

Format as a structured report with actionable recommendations.`,
    priority: 'high',
    estimatedCredits: 25,
    tags: ['seo', 'competitor', 'research'],
    requiresSiteId: true,
    schedule: '0 3 * * 1', // Weekly Monday 3am
    variables: ['competitorDomain', 'siteDomain', 'niche'],
    description: 'Deep competitor SEO analysis with content gap identification',
    expectedOutput: 'Structured report with content gaps, keyword opportunities, and actionable fixes',
    roiRating: 8,
  },
  {
    id: 'seo-ai-citation-check',
    category: 'seo',
    taskType: 'ai-citation-monitoring',
    title: 'AI Citation Check: {{keyword}} across AI platforms',
    promptTemplate: `Search for "{{keyword}}" on each of these AI platforms and check if content from {{siteDomain}} is cited or referenced:

1. **Perplexity**: Search "{{keyword}}" — is {{siteDomain}} cited? Screenshot the answer.
2. **ChatGPT**: Ask "{{keyword}}" — does it mention or reference {{siteDomain}}?
3. **Google AI Overview**: Search "{{keyword}}" on Google — does the AI Overview cite {{siteDomain}}?

For each platform, report:
- Was {{siteDomain}} cited? (Yes/No)
- What position/prominence? (Primary source, supporting source, not cited)
- What competitor domains ARE cited instead?
- What does the cited content do differently that our content doesn't?

Also check: Is the AI-generated answer accurate based on our content? Could our content be improved to be more citable (stats, specific data, expert quotes)?`,
    priority: 'high',
    estimatedCredits: 20,
    tags: ['geo', 'aio', 'ai-monitoring', 'citations'],
    requiresSiteId: true,
    schedule: '0 4 * * 3', // Weekly Wednesday 4am
    variables: ['keyword', 'siteDomain'],
    description: 'Monitor AI search engine citations for specific keywords',
    expectedOutput: 'Per-platform citation report with competitor comparison',
    roiRating: 8,
  },
  {
    id: 'seo-gsc-deep-analysis',
    category: 'seo',
    taskType: 'gsc-analysis',
    title: 'GSC Deep Analysis for {{siteDomain}}',
    promptTemplate: `Go to Google Search Console (search.google.com/search-console) for the property {{siteDomain}}.

Analyze and report on:
1. **Coverage Report**: How many pages are indexed vs. excluded? What are the top exclusion reasons?
2. **Performance**: Top 20 queries by impressions. For each, note clicks, CTR, and average position.
3. **Pages with high impressions but low CTR** (position 4-20): These are our biggest SEO opportunities.
4. **Mobile Usability**: Any issues flagged?
5. **Core Web Vitals**: Are there any failing URLs? What metrics fail (LCP, INP, CLS)?
6. **Sitemaps**: Is the sitemap submitted and successfully processed? How many URLs discovered vs indexed?
7. **Manual Actions**: Any manual actions or security issues?

For the top 5 "high impression, low CTR" pages, suggest specific meta title and description improvements that could increase CTR.`,
    priority: 'high',
    estimatedCredits: 20,
    tags: ['seo', 'gsc', 'analysis'],
    requiresSiteId: true,
    schedule: '0 3 * * 1', // Weekly Monday 3am
    variables: ['siteDomain'],
    description: 'Deep GSC analysis with CTR optimization opportunities',
    expectedOutput: 'Indexed/excluded breakdown, top queries, CTR improvement suggestions',
    roiRating: 9,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 6: Design & UX Review (ROI: 8/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'design-mystery-shopper',
    category: 'design',
    taskType: 'ux-audit',
    title: 'Mystery Shopper UX Audit: {{siteDomain}}',
    promptTemplate: `Visit {{siteDomain}} on a mobile viewport (375px width, iPhone) and perform a user journey audit.

Test these flows:
1. **Homepage → Category → Article → Affiliate Click**: Navigate from homepage to any article. Is the path clear? Can you find affiliate links easily? Are CTAs visible above the fold?
2. **Search → Article**: If there's a search function, search for "{{testQuery}}". Are results relevant?
3. **Arabic Toggle**: Switch to Arabic. Does the layout switch to RTL? Is the content readable?
4. **Navigation**: Is the mobile menu intuitive? Can you reach all major sections within 3 taps?

For each page visited, note:
- Load time perception (fast/medium/slow)
- Visual issues (broken images, overlapping text, cut-off elements)
- Affiliate link visibility (above fold? easy to spot? compelling CTA?)
- Mobile-friendliness (tap targets, scrolling, zoom needed?)

Take screenshots of any issues found. Rate overall UX: A (excellent) to F (broken).`,
    priority: 'medium',
    estimatedCredits: 20,
    tags: ['design', 'ux', 'mobile', 'audit'],
    requiresSiteId: true,
    schedule: '0 5 1 * *', // Monthly 1st at 5am
    variables: ['siteDomain', 'testQuery'],
    description: 'Mobile-first mystery shopper UX audit with screenshots',
    expectedOutput: 'Per-page UX grade, screenshot evidence, specific issues, affiliate visibility rating',
    roiRating: 8,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 7: Content Quality Audit (ROI: 9/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'content-ai-trace-audit',
    category: 'content',
    taskType: 'ai-trace-detection',
    title: 'AI Trace Audit: {{articleUrl}}',
    promptTemplate: `Read the article at {{articleUrl}} and check for AI-generated content traces.

Look for:
1. **Generic AI phrases**: "nestled in the heart of", "whether you're a seasoned traveler", "look no further", "in this comprehensive guide", "without further ado", "it's worth noting", "in conclusion"
2. **Structural patterns**: Does every section follow the same pattern? Are transitions mechanical?
3. **Missing specifics**: Does the article mention specific prices, opening hours, addresses, or personal experiences? Or is everything vague?
4. **Stock-sounding descriptions**: Does it read like a tourism board brochure rather than a personal review?
5. **Word count artifacts**: Is there a word count visible on the page? Any "[X words]" text?
6. **Heading pattern**: Are all H2s the same format (e.g., all start with "The Best..." or "Top...")?

Also check:
- Are there real photos or only stock images?
- Does the article cite specific sources or data?
- Is there an author bio with a real person's name?

Rate the article's authenticity: HIGH (reads like genuine expert), MEDIUM (some AI traces but mostly good), LOW (obvious AI-generated content).

Suggest 3-5 specific edits to improve authenticity.`,
    priority: 'high',
    estimatedCredits: 15,
    tags: ['content', 'quality', 'authenticity', 'audit'],
    requiresSiteId: false,
    variables: ['articleUrl'],
    description: 'Detect AI-generated content traces and suggest authenticity improvements',
    expectedOutput: 'Authenticity rating, specific phrases flagged, improvement suggestions',
    roiRating: 9,
  },
  {
    id: 'content-photo-license-check',
    category: 'content',
    taskType: 'photo-license-audit',
    title: 'Photo License Audit: {{articleUrl}}',
    promptTemplate: `Visit {{articleUrl}} and check every image on the page for potential copyright issues.

For each image:
1. Right-click and look at the image URL / filename
2. Try reverse image search (Google Images or TinEye) to find the original source
3. Check if it's from a stock photo site (Unsplash, Pexels = OK; Shutterstock, Getty = needs license)
4. Check if it has watermarks or copyright notices

Report for each image:
- Image description
- Source identified (if found)
- License status: SAFE (free/licensed), RISKY (unknown source), DANGEROUS (copyrighted/watermarked)
- Recommended action (keep, replace, add attribution)

Also note: Are there enough images? Travel articles should have 3-5+ high-quality images.`,
    priority: 'medium',
    estimatedCredits: 15,
    tags: ['content', 'legal', 'photos', 'audit'],
    requiresSiteId: false,
    variables: ['articleUrl'],
    description: 'Check article images for copyright/licensing issues',
    expectedOutput: 'Per-image license status with recommended actions',
    roiRating: 8,
  },
  {
    id: 'content-fact-check',
    category: 'content',
    taskType: 'fact-verification',
    title: 'Fact Check: {{articleUrl}}',
    promptTemplate: `Read the article at {{articleUrl}} and verify all factual claims.

Check:
1. **Prices**: Are hotel/restaurant/experience prices current? Compare with official websites.
2. **Opening hours**: Are stated hours correct? Check Google Maps or official sites.
3. **Addresses/locations**: Are addresses accurate? Are directions correct?
4. **Rankings/awards**: Are claimed awards or Michelin stars current and accurate?
5. **Statistics**: Are cited statistics real and correctly attributed?
6. **Links**: Do all external links work? Do they point to the right destinations?
7. **Dates**: Are seasonal references still accurate?

For each inaccuracy found:
- What the article says
- What the correct information is
- Source of correct information
- Severity: HIGH (wrong price/closed venue), MEDIUM (outdated detail), LOW (minor inaccuracy)`,
    priority: 'medium',
    estimatedCredits: 15,
    tags: ['content', 'quality', 'fact-check'],
    requiresSiteId: false,
    variables: ['articleUrl'],
    description: 'Verify factual claims in published articles',
    expectedOutput: 'List of inaccuracies with correct information and sources',
    roiRating: 7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 8: Business Intelligence (ROI: 7/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'intel-market-research',
    category: 'intelligence',
    taskType: 'market-research',
    title: 'Market Research: {{topic}} for {{niche}}',
    promptTemplate: `Research the market opportunity for "{{topic}}" in the {{niche}} travel niche.

Analyze:
1. **Market Size**: What is the estimated size of this market segment? Any recent growth data?
2. **Search Volume**: What are the top keywords and their estimated monthly search volumes?
3. **Competition**: Who are the top 5 publishers covering this topic? What's their content quality?
4. **Revenue Potential**: What affiliate programs are relevant? What commission rates?
5. **Content Gaps**: What questions do travelers ask that nobody answers well?
6. **Seasonal Trends**: When does interest peak? (Use Google Trends data if accessible)
7. **GCC/Arab Market Angle**: Is there a specific Arab traveler angle that's underserved?

Provide a recommendation: Is this worth creating content for? What's the estimated monthly traffic potential?`,
    priority: 'medium',
    estimatedCredits: 20,
    tags: ['intelligence', 'market-research', 'strategy'],
    requiresSiteId: true,
    variables: ['topic', 'niche'],
    description: 'Deep market research for content opportunity evaluation',
    expectedOutput: 'Market size, keywords, competition analysis, revenue potential, recommendation',
    roiRating: 7,
  },
  {
    id: 'intel-partnership-scan',
    category: 'intelligence',
    taskType: 'partnership-discovery',
    title: 'Partnership Scan: {{industry}} in {{region}}',
    promptTemplate: `Research potential partnership opportunities for a luxury travel content publisher in the {{industry}} sector of {{region}}.

Find:
1. **Tourism Boards**: Contact info for relevant tourism boards and their content partnership programs
2. **Hotels/Resorts**: Luxury hotel chains with affiliate or content collaboration programs
3. **Experience Platforms**: Companies like GetYourGuide, Viator, Klook — their publisher programs
4. **Travel Brands**: Luxury brands that sponsor travel content (luggage, fashion, wellness)
5. **Media Partnerships**: Travel media networks, content syndication opportunities
6. **PR Agencies**: Travel PR firms that provide press trips, hotel stays, experiences for content creators

For each opportunity, provide:
- Company name and contact method
- Type of partnership available
- Estimated value (commission %, flat fee, in-kind)
- Application process
- Relevance to our audience (1-10)`,
    priority: 'low',
    estimatedCredits: 20,
    tags: ['intelligence', 'partnerships', 'revenue'],
    requiresSiteId: false,
    schedule: '0 4 1 * *', // Monthly 1st at 4am
    variables: ['industry', 'region'],
    description: 'Discover partnership opportunities in travel industry',
    expectedOutput: 'List of partnership opportunities with contact info and estimated value',
    roiRating: 7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 9: AI Revolution Monitoring (ROI: 7/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ai-travel-tool-scan',
    category: 'ai-monitoring',
    taskType: 'ai-tool-monitoring',
    title: 'AI Travel Tool Landscape Scan',
    promptTemplate: `Research the current landscape of AI-powered travel planning tools and how they might affect content publishers.

Scan:
1. **Google AI Travel**: Any updates to Google's AI trip planning features? How do they source hotel/restaurant recommendations?
2. **ChatGPT Travel Plugins**: What travel plugins exist? Do they cite content publishers?
3. **Perplexity Travel**: How does Perplexity handle travel queries? What content gets cited?
4. **Booking.com AI**: Any AI features launched? Do they reduce need for third-party content?
5. **New entrants**: Any new AI travel startups launched in the past month?

For each tool, assess:
- Threat level to content publishers: HIGH / MEDIUM / LOW
- Opportunity level (can we integrate?): HIGH / MEDIUM / LOW
- Action needed: What should we do to adapt?

Key question: Is the role of travel content publishers growing or shrinking in the AI era?`,
    priority: 'medium',
    estimatedCredits: 20,
    tags: ['ai-monitoring', 'strategy', 'trends'],
    requiresSiteId: false,
    schedule: '0 5 15 * *', // Bi-monthly 15th at 5am
    variables: [],
    description: 'Monitor AI travel tool landscape for threats and opportunities',
    expectedOutput: 'Tool-by-tool analysis with threat/opportunity ratings and action items',
    roiRating: 7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 10: Strategy (ROI: 6/10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'strategy-content-gap',
    category: 'strategy',
    taskType: 'content-gap-analysis',
    title: 'Content Gap Analysis: {{siteDomain}} vs Top 3 Competitors',
    promptTemplate: `Compare the content coverage of {{siteDomain}} against its top 3 competitors in the {{niche}} travel niche.

For each competitor:
1. List all their content categories/topics
2. Count approximate number of articles per category
3. Identify their top-performing content (most linked, most shared)
4. Note any content types we don't have (interactive tools, comparison tables, downloadable guides)

Then identify:
- **Topic gaps**: Topics competitors cover that we don't
- **Format gaps**: Content formats they use that we don't
- **Depth gaps**: Topics we cover but they go much deeper
- **Freshness gaps**: Topics where our content is outdated vs theirs

Prioritize the gaps by:
1. Search volume potential
2. Revenue potential (affiliate opportunity)
3. Effort to create
4. Competitive difficulty

List top 10 content pieces we should create, in priority order.`,
    priority: 'medium',
    estimatedCredits: 25,
    tags: ['strategy', 'content-gap', 'competitor'],
    requiresSiteId: true,
    schedule: '0 3 1 * *', // Monthly 1st at 3am
    variables: ['siteDomain', 'niche'],
    description: 'Comprehensive content gap analysis against competitors',
    expectedOutput: 'Gap list with prioritized content creation recommendations',
    roiRating: 7,
  },
  {
    id: 'strategy-revenue-benchmark',
    category: 'strategy',
    taskType: 'revenue-benchmarking',
    title: 'Revenue Benchmarking: Travel Affiliate Publishers',
    promptTemplate: `Research how successful travel affiliate content publishers monetize their sites. Focus on publishers with 10K-100K monthly visitors.

Research:
1. **Revenue per visitor**: What RPV do successful travel affiliate sites achieve?
2. **Affiliate mix**: What % of revenue comes from hotels vs. experiences vs. flights vs. other?
3. **Top programs**: Which affiliate programs pay the most for travel content publishers?
4. **Conversion tactics**: How do top publishers integrate affiliate links (comparison tables, booking widgets, inline links, pop-ups)?
5. **Alternative revenue**: What non-affiliate revenue streams do top travel publishers use? (Sponsored content, display ads, courses, services)

Look at case studies from: The Points Guy, Nomadic Matt, Travel Lemming, Adventurous Kate, or similar.

Provide actionable recommendations for Zenitha.Luxury LLC to increase revenue per visitor.`,
    priority: 'low',
    estimatedCredits: 20,
    tags: ['strategy', 'revenue', 'benchmarking'],
    requiresSiteId: false,
    schedule: '0 4 1 */3 *', // Quarterly
    variables: [],
    description: 'Benchmark revenue strategies of successful travel affiliate publishers',
    expectedOutput: 'RPV benchmarks, affiliate mix data, conversion tactics, revenue optimization recommendations',
    roiRating: 6,
  },
]

// Helper: get templates by category
export function getTemplatesByCategory(category: TaskCategory): TaskTemplate[] {
  return TASK_TEMPLATES.filter(t => t.category === category)
}

// Helper: get template by ID
export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find(t => t.id === id)
}

// Helper: fill template variables
export function fillTemplate(template: TaskTemplate, variables: Record<string, string>): string {
  let prompt = template.promptTemplate
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return prompt
}

// Helper: get all categories with counts
export function getCategorySummary(): Array<{ category: TaskCategory; count: number; avgRoi: number; description: string }> {
  const categoryDescriptions: Record<TaskCategory, string> = {
    'registration': 'Form filling, affiliate signups, directory submissions',
    'email': 'Email marketing setup and management',
    'social': 'Social media account setup and monitoring',
    'seo': 'SEO/AIO/GEO monitoring and optimization',
    'development': 'Development action items and technical research',
    'design': 'Design review and UX audits',
    'content': 'Content quality audits and fact-checking',
    'intelligence': 'Market research and business intelligence',
    'ai-monitoring': 'AI revolution and tool monitoring',
    'strategy': 'Strategic planning and competitive analysis',
  }

  const categories = new Map<TaskCategory, { count: number; totalRoi: number }>()
  for (const t of TASK_TEMPLATES) {
    const entry = categories.get(t.category) || { count: 0, totalRoi: 0 }
    entry.count++
    entry.totalRoi += t.roiRating
    categories.set(t.category, entry)
  }

  return Array.from(categories.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    avgRoi: Math.round((data.totalRoi / data.count) * 10) / 10,
    description: categoryDescriptions[category] || category,
  }))
}
