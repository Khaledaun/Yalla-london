/**
 * Content Types Registry — Shared by ai-generate and bulk-generate APIs
 *
 * Extensible registry of content types with SEO-specific generation guidelines.
 * Each type gets its own prompt rules, word count targets, and SEO requirements.
 *
 * To add a new content type:
 * 1. Add an entry to CONTENT_TYPES below
 * 2. Optionally add thresholds in lib/seo/standards.ts → CONTENT_TYPE_THRESHOLDS
 * 3. The bulk generator UI will auto-discover the new type via the content_types action
 */

export interface ContentTypeConfig {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  minWords: number;
  targetWords: number;
  requireAffiliateLinks: boolean;
  requireAuthenticitySignals: boolean;
  minInternalLinks: number;
  promptGuidelinesEN: string;
  promptGuidelinesAR: string;
}

export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
  guide: {
    id: "guide",
    label: "Travel Guide",
    labelAr: "دليل سفر",
    description: "Comprehensive travel guides with practical tips, insider advice, and luxury recommendations",
    minWords: 1500,
    targetWords: 2000,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 3,
    promptGuidelinesEN: `Write a comprehensive travel GUIDE about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- 4–6 H2 headings, H3 subheadings where appropriate
- Start with a compelling introduction (50-80 words) that places the reader IN the experience
- Include a "Getting There" or "How to Visit" section with practical logistics
- Include a "What to Expect" section with sensory details
- Include a "Insider Tips" section with 3-5 specific tips
- Include a "Key Takeaways" bulleted section + clear CTA at the end
- 3+ internal links to /blog/*, /hotels, /experiences, /restaurants
- 2+ affiliate/booking links (HalalBooking, Booking.com, GetYourGuide, Viator)

QUALITY:
- 1,500–2,000 words minimum
- Focus keyword "{keyword}" in title, first paragraph, one H2
- Include honest limitations or "what most guides won't tell you" moments
- Specific prices, opening hours, or booking tips where relevant`,
    promptGuidelinesAR: `اكتب دليل سفر شامل عن "{keyword}" لمنصة {siteName}، يستهدف المسافرين العرب.
- 1,500+ كلمة، نصائح عملية، 3+ روابط داخلية، 2+ روابط حجز
- 4-6 عناوين H2، قسم "نصائح داخلية"، قسم "خلاصة النقاط الرئيسية"`,
  },

  comparison: {
    id: "comparison",
    label: "Comparison",
    labelAr: "مقارنة",
    description: "Side-by-side comparisons (e.g., 'Hotel A vs Hotel B', '5 Best Halal Restaurants Compared')",
    minWords: 1200,
    targetWords: 1800,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 3,
    promptGuidelinesEN: `Write a detailed COMPARISON article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- Open with a brief summary table or "Quick Verdict" (who should choose what)
- Compare 3-5 options with consistent criteria (price range, halal options, location, atmosphere, value)
- Each option gets its own H2 section with: Overview, Pros, Cons, Best For
- Include an H2 "Head-to-Head Comparison Table" with emoji ratings or scores
- "Our Verdict" section explaining which is best for different traveler types
- 3+ internal links, 2+ affiliate/booking links per option compared
- "Key Takeaways" + CTA at the end

QUALITY:
- 1,200–1,800 words minimum
- Be specific: actual prices, distances, wait times, specific dish names
- Include at least one "honest surprise" per option (an unexpected pro or con)
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مقالة مقارنة تفصيلية عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 1,200+ كلمة، جدول مقارنة، إيجابيات وسلبيات لكل خيار
- 3+ روابط داخلية، 2+ روابط حجز، قسم "حكمنا النهائي"`,
  },

  "hotel-review": {
    id: "hotel-review",
    label: "Hotel Review",
    labelAr: "مراجعة فندق",
    description: "In-depth hotel reviews with luxury amenities, dining, and practical traveler tips",
    minWords: 1200,
    targetWords: 1800,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write a detailed HOTEL REVIEW about "{keyword}" for {siteName}, targeting luxury travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: First Impressions (lobby, check-in experience, welcome drink)
- H2: Room & Suite Review (size, view, minibar, in-room amenities, comfort details)
- H2: Dining & Restaurants (on-site restaurants, cuisine quality, room service, dietary options)
- H2: Facilities & Amenities (pool, spa, gym, concierge, unique hotel features)
- H2: Location & Access (proximity to attractions, transport links, nearby dining)
- H2: Price & Value (room rates, when to book, money-saving tips)
- "Quick Rating" box: Score out of 10 for Location, Rooms, Dining, Service, Value
- CTA with booking link (Booking.com, HalalBooking where relevant)
- 2+ internal links to related hotel/area content, 2+ affiliate booking links

QUALITY:
- 1,200–1,800 words minimum
- Mention specific room numbers, floor recommendations, or suite types
- Include at least one honest negative (thin walls, slow WiFi, limited breakfast options)
- Specific prices for rooms, restaurants, and services
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مراجعة فندقية تفصيلية عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين.
- 1,200+ كلمة، تقييم المطاعم والمرافق والخدمات
- 2+ روابط حجز، تقييم سريع من 10`,
  },

  "restaurant-review": {
    id: "restaurant-review",
    label: "Restaurant Review",
    labelAr: "مراجعة مطعم",
    description: "Restaurant reviews focused on cuisine quality, atmosphere, and dining experience",
    minWords: 800,
    targetWords: 1500,
    requireAffiliateLinks: false,
    requireAuthenticitySignals: true,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write a detailed RESTAURANT REVIEW about "{keyword}" for {siteName}, targeting luxury travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: The Atmosphere (décor, seating, noise level, privacy, family-friendly)
- H2: The Menu — Our Top Picks (3-5 specific dishes with descriptions and prices)
- H2: Cuisine & Dietary Options (cuisine style, dietary accommodations available, standout flavors)
- H2: Service & Experience (staff attentiveness, language support, overall hospitality)
- H2: Practical Info (address, hours, reservations, dress code, parking)
- Quick rating box: Taste, Ambience, Service, Value, Overall (out of 5)
- 2+ internal links to area dining guides
- Booking/reservation link if available

QUALITY:
- 800–1,500 words minimum
- Name specific dishes, describe flavors and presentation
- Note any dietary accommodations (vegetarian, gluten-free, halal where applicable)
- Include a "Skip this if..." honest caveat
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مراجعة مطعم تفصيلية عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين.
- 800+ كلمة، أطباق محددة بالأسعار، خيارات غذائية
- 2+ روابط داخلية، تقييم سريع من 5`,
  },

  "service-review": {
    id: "service-review",
    label: "Service / Experience Review",
    labelAr: "مراجعة خدمة",
    description: "Reviews of tours, experiences, transport services, and travel services",
    minWords: 800,
    targetWords: 1500,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write a detailed SERVICE/EXPERIENCE REVIEW about "{keyword}" for {siteName}, targeting luxury travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: What Is This Experience? (overview, who it's for, duration)
- H2: Booking & Logistics (how to book, prices, schedule, accessibility)
- H2: The Experience — Step by Step (walk readers through the experience chronologically)
- H2: Accessibility & Accommodations (language support, dietary options, dress code, family-friendliness)
- H2: Is It Worth It? (honest value assessment, alternatives, who should skip it)
- CTA with booking link (GetYourGuide, Viator preferred)
- 2+ internal links to related experiences, 2+ affiliate links

QUALITY:
- 800–1,500 words minimum
- Describe specific moments from the experience with sensory detail
- Include timing tips ("go in the morning to avoid crowds")
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مراجعة تفصيلية عن تجربة/خدمة "{keyword}" لمنصة {siteName}، تستهدف المسافرين.
- 800+ كلمة، خطوات التجربة، نصائح عملية
- 2+ روابط حجز، نصائح توقيت`,
  },

  news: {
    id: "news",
    label: "News Article",
    labelAr: "خبر",
    description: "Timely news updates about travel, events, or destination changes relevant to Arab travelers",
    minWords: 300,
    targetWords: 600,
    requireAffiliateLinks: false,
    requireAuthenticitySignals: false,
    minInternalLinks: 1,
    promptGuidelinesEN: `Write a concise NEWS ARTICLE about "{keyword}" for {siteName}, targeting Arab travelers interested in {destination}.

STRUCTURE (mandatory):
- Lead paragraph: Who, What, Where, When, Why (answer all in first 2 sentences)
- H2: The Details (expanded context)
- H2: What This Means for Travelers (practical impact)
- "Quick Facts" bulleted list at the end
- 1+ internal link to related content

QUALITY:
- 300–600 words (news is short and scannable)
- Use journalistic inverted pyramid: most important info first
- Date-stamp the news clearly
- No fluff, no padding, no opinion (unless editorial)
- Focus keyword "{keyword}" in title and first paragraph`,
    promptGuidelinesAR: `اكتب خبراً موجزاً عن "{keyword}" لمنصة {siteName}.
- 300-600 كلمة، أسلوب صحفي، أهم المعلومات أولاً
- قائمة "حقائق سريعة" في النهاية`,
  },

  events: {
    id: "events",
    label: "Event Guide",
    labelAr: "دليل فعالية",
    description: "Event coverage, festival guides, seasonal happenings for Arab travelers",
    minWords: 600,
    targetWords: 1200,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write an EVENT GUIDE about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: What Is It? (event overview, history, why it matters)
- H2: Dates, Location & Tickets (specific dates, venue, pricing tiers, booking link)
- H2: What to Expect (schedule highlights, not-to-miss moments)
- H2: Practical Tips (food options at venue, nearby facilities, dress code, family areas)
- H2: Getting There & Where to Stay (transport, recommended hotels nearby with booking links)
- "Event Essentials" quick-reference box at the end
- 2+ internal links, 2+ booking/affiliate links

QUALITY:
- 600–1,200 words
- Include specific dates, times, and prices
- Mention family-friendliness and food availability
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب دليل فعالية عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 600-1,200 كلمة، تواريخ وأسعار محددة، نصائح حلال
- 2+ روابط حجز`,
  },

  sales: {
    id: "sales",
    label: "Deal / Offer",
    labelAr: "عرض / صفقة",
    description: "Travel deals, seasonal offers, discount guides, and money-saving content",
    minWords: 500,
    targetWords: 1000,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: false,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write a DEAL/OFFER article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: The Deal at a Glance (what, where, price, savings, validity dates)
- H2: What's Included (detailed breakdown of what you get)
- H2: How to Book (step-by-step, direct booking link with affiliate)
- H2: Is It Worth It? (honest value analysis, who benefits most)
- H2: Similar Deals to Consider (2-3 alternatives with links)
- "Deal Summary" box with price, savings percentage, validity, booking CTA
- 2+ affiliate links, 2+ internal links

QUALITY:
- 500–1,000 words
- Always include specific prices and savings amounts
- Include expiration dates and any fine print
- Be honest if a deal isn't actually good value
- Focus keyword "{keyword}" in title and first paragraph`,
    promptGuidelinesAR: `اكتب مقالة عن عرض/صفقة "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 500-1,000 كلمة، أسعار وتوفير محدد، رابط حجز مباشر
- 2+ روابط تابعة`,
  },

  listicle: {
    id: "listicle",
    label: "Listicle",
    labelAr: "قائمة",
    description: "Numbered lists (e.g., 'Top 10 Restaurants in London', '7 Best Hotels Under £200')",
    minWords: 1200,
    targetWords: 1800,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 3,
    promptGuidelinesEN: `Write a LISTICLE article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- Title must include a number (e.g., "7 Best...", "Top 10...")
- Brief introduction (50-80 words) explaining selection criteria
- Each list item gets its own H2 with: Description (80-150 words), Pros, Cons, Price Range, Booking Link
- Items ordered by quality/recommendation strength (best first)
- "Quick Comparison Table" before the detailed list
- "How We Chose" section (brief methodology)
- CTA at the end
- 3+ internal links, 1+ affiliate link per list item

QUALITY:
- 1,200–1,800 words
- Each item must have specific details (not generic descriptions)
- Include a "Budget Pick" and a "Luxury Pick"
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مقالة قائمة عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 1,200+ كلمة، كل عنصر بإيجابيات وسلبيات ونطاق سعري
- 3+ روابط داخلية، رابط حجز لكل عنصر`,
  },

  "deep-dive": {
    id: "deep-dive",
    label: "Deep Dive",
    labelAr: "تحليل معمق",
    description: "In-depth analysis articles with original research and expert insights",
    minWords: 2000,
    targetWords: 3000,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 4,
    promptGuidelinesEN: `Write an in-depth DEEP DIVE article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- 6–8 H2 headings with H3 sub-sections
- "Executive Summary" or "TL;DR" section at the top (100 words)
- Include data, statistics, or historical context where relevant
- Multiple perspectives or viewpoints presented fairly
- "Expert Opinion" or "Local Insight" callout sections
- "Action Steps" or "Key Takeaways" at the end
- 4+ internal links, 2+ affiliate links where natural

QUALITY:
- 2,000–3,000 words minimum
- This is the most authoritative content type — write like an expert
- Include specific numbers, dates, and verifiable facts
- Focus keyword "{keyword}" in title, first paragraph, two H2s`,
    promptGuidelinesAR: `اكتب مقالة تحليلية معمقة عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 2,000+ كلمة، بيانات وإحصائيات، آراء خبراء
- 4+ روابط داخلية، ملخص تنفيذي`,
  },

  seasonal: {
    id: "seasonal",
    label: "Seasonal",
    labelAr: "موسمي",
    description: "Seasonal travel content (summer, Christmas markets, spring festivals, etc.)",
    minWords: 1000,
    targetWords: 1500,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
    minInternalLinks: 3,
    promptGuidelinesEN: `Write a SEASONAL travel article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- H2: Why Visit During [Season/Event]? (what makes this time special)
- H2: What's Happening (events, festivals, special offerings)
- H2: Weather & What to Pack (practical clothing and weather tips)
- H2: Best Experiences This Season (top 5-7 things to do)
- H2: Where to Stay & Eat (season-specific hotel deals, restaurants with seasonal menus)
- H2: Booking Tips & Budget (when to book, expected prices, money-saving advice)
- "Seasonal Essentials" checklist at the end
- 3+ internal links, 2+ affiliate links

QUALITY:
- 1,000–1,500 words
- Include specific dates and seasonal events
- Mention seasonal or cultural events if relevant to the travel period
- Focus keyword "{keyword}" in title, first paragraph, one H2`,
    promptGuidelinesAR: `اكتب مقالة موسمية عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 1,000+ كلمة، أحداث وتواريخ محددة، نصائح رمضان/عيد إن كان مناسباً
- 3+ روابط داخلية، 2+ روابط حجز`,
  },

  answer: {
    id: "answer",
    label: "Q&A / Answer",
    labelAr: "سؤال وجواب",
    description: "Direct answer articles targeting 'People Also Ask' and featured snippets",
    minWords: 600,
    targetWords: 1200,
    requireAffiliateLinks: false,
    requireAuthenticitySignals: true,
    minInternalLinks: 2,
    promptGuidelinesEN: `Write a direct ANSWER article about "{keyword}" for {siteName}, targeting Arab travelers visiting {destination}.

STRUCTURE (mandatory):
- First paragraph: Direct answer in 40-60 words (optimized for AI Overview / featured snippet)
- H2: The Full Answer (expanded explanation with context)
- H2: Related Questions (3-4 follow-up Q&As as H3 sub-sections)
- H2: Practical Tips (actionable advice related to the question)
- Key points bulleted list at the end
- 2+ internal links to deeper content

QUALITY:
- 600–1,200 words
- Answer the question IMMEDIATELY in the first paragraph
- Use "People Also Ask" format for related questions
- Focus keyword "{keyword}" in title and first sentence
- Write in clear, simple language (Flesch-Kincaid ≤ 10)`,
    promptGuidelinesAR: `اكتب مقالة إجابة مباشرة عن "{keyword}" لمنصة {siteName}، تستهدف المسافرين العرب.
- 600-1,200 كلمة، إجابة مباشرة في أول فقرة
- 3-4 أسئلة متابعة، نصائح عملية`,
  },
};
