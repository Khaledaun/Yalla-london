/**
 * Social Media Strategy — Video content planning for Zenitha Luxury Network
 *
 * Defines posting cadence, content mix, platform-specific formats,
 * and how each Canva collection maps to social media use cases.
 *
 * Target audience: International luxury travelers (60-70%) + Arab/Gulf travelers (30-40%)
 * Primary markets: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, UK
 * Peak engagement times: Gulf audience is most active 8-11 PM GST (4-7 PM UTC)
 */

// ============================================================
// POSTING SCHEDULE (per site, per platform)
// ============================================================

export interface PostingSlot {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  timeUtc: string; // "HH:MM" in UTC
  platform: Platform;
  contentType: ContentCategory;
  /** Which video collection to pull from */
  preferredCollection: string;
  notes?: string;
}

export type Platform = "instagram-reels" | "instagram-stories" | "tiktok" | "youtube-shorts" | "twitter-x";

export type ContentCategory =
  | "hero-destination"    // High-production destination showcase (Luxury collection)
  | "daily-aesthetic"     // Quick aesthetic mood clip (Aesthetic collection)
  | "beach-vibes"         // Ocean/beach b-roll (Beach collection)
  | "tips-educational"    // Travel tips, lists, how-tos (Luxury + Aesthetic)
  | "article-promotion"   // Promote a blog article with video background
  | "self-captured"       // Khaled's own footage (highest authenticity)
  | "ugc-style"           // User-generated content feel (Aesthetic templates)
  | "behind-scenes"       // Self-captured BTS content
  | "seasonal"            // Holiday/seasonal content
  | "engagement"          // Polls, questions, interactive content
  ;

// ============================================================
// COLLECTION → USE CASE MAPPING
// ============================================================

export const COLLECTION_USE_CASES: Record<string, {
  primaryUse: ContentCategory[];
  platforms: Platform[];
  frequency: string;
  notes: string;
}> = {
  "60-luxury-travel": {
    primaryUse: ["hero-destination", "tips-educational", "article-promotion"],
    platforms: ["instagram-reels", "tiktok", "youtube-shorts"],
    frequency: "3-4x/week — hero content, high production value",
    notes: "Best for: destination showcases, travel tips carousels, article promotion. Already has text overlays — rebrand with Zenitha/Yalla logo. Use for Instagram feed posts (high engagement) and YouTube Shorts (discoverability).",
  },
  "50-aesthetic-reels": {
    primaryUse: ["daily-aesthetic", "ugc-style", "engagement"],
    platforms: ["instagram-reels", "instagram-stories", "tiktok"],
    frequency: "Daily — quick mood clips, story backgrounds, engagement posts",
    notes: "Template format with editable text boxes. Perfect for: POV reels, 'things I love about [city]' lists, morning routines. Swap placeholder text with branded copy. Stories: use as backgrounds with polls/questions/sliders.",
  },
  "300-beach-clips": {
    primaryUse: ["beach-vibes", "article-promotion", "seasonal"],
    platforms: ["instagram-reels", "instagram-stories", "tiktok", "twitter-x"],
    frequency: "2-3x/week — b-roll backgrounds, summer campaigns, article backgrounds",
    notes: "Raw footage, no text. Use as: b-roll behind article quotes, story backgrounds, transition clips between scenes. 314 clips = ~6 months of daily unique beach content without repeats. Perfect for Arabaldives and Zenitha Yachts.",
  },
  "faceless-ig-templates": {
    primaryUse: ["tips-educational", "engagement", "ugc-style"],
    platforms: ["instagram-reels", "instagram-stories"],
    frequency: "2x/week — tips, lists, branded quotes",
    notes: "Social media post templates. Rebrand with site colors/fonts. Good for: '5 things to know before visiting...', 'insider tips for...', branded travel quotes.",
  },
};

// ============================================================
// WEEKLY POSTING CALENDAR (Yalla London — primary site)
// ============================================================

/**
 * 14 posts/week across platforms:
 * - Instagram: 7 reels + 7 stories
 * - TikTok: 5 videos
 * - YouTube Shorts: 2 videos
 * - Twitter/X: 3 video tweets
 *
 * Gulf prime time: 8-11 PM GST = 4-7 PM UTC
 * UK prime time: 7-9 PM GMT = 7-9 PM UTC
 * Sweet spot: 5-6 PM UTC (9 PM GST, 5-6 PM GMT)
 */
export const YALLA_LONDON_WEEKLY_CALENDAR: PostingSlot[] = [
  // MONDAY — Fresh start energy
  { day: "mon", timeUtc: "07:00", platform: "instagram-stories", contentType: "daily-aesthetic", preferredCollection: "50-aesthetic-reels", notes: "Morning motivation reel" },
  { day: "mon", timeUtc: "17:00", platform: "instagram-reels", contentType: "hero-destination", preferredCollection: "60-luxury-travel", notes: "Destination showcase — highest reach day" },
  { day: "mon", timeUtc: "17:30", platform: "tiktok", contentType: "tips-educational", preferredCollection: "60-luxury-travel", notes: "Travel tip / how-to" },

  // TUESDAY — Educational
  { day: "tue", timeUtc: "07:00", platform: "instagram-stories", contentType: "engagement", preferredCollection: "50-aesthetic-reels", notes: "Poll/question with aesthetic background" },
  { day: "tue", timeUtc: "17:00", platform: "instagram-reels", contentType: "article-promotion", preferredCollection: "60-luxury-travel", notes: "Promote latest blog article" },
  { day: "tue", timeUtc: "17:00", platform: "twitter-x", contentType: "article-promotion", preferredCollection: "300-beach-clips", notes: "Article link + short video clip" },

  // WEDNESDAY — Midweek inspiration
  { day: "wed", timeUtc: "07:00", platform: "instagram-stories", contentType: "beach-vibes", preferredCollection: "300-beach-clips", notes: "Beach morning vibes" },
  { day: "wed", timeUtc: "17:00", platform: "instagram-reels", contentType: "ugc-style", preferredCollection: "50-aesthetic-reels", notes: "POV/aesthetic reel" },
  { day: "wed", timeUtc: "17:30", platform: "tiktok", contentType: "hero-destination", preferredCollection: "60-luxury-travel", notes: "Destination discovery" },

  // THURSDAY — Pre-weekend planning (big day for Gulf audience)
  { day: "thu", timeUtc: "07:00", platform: "instagram-stories", contentType: "daily-aesthetic", preferredCollection: "50-aesthetic-reels", notes: "Thursday = Friday eve for Gulf" },
  { day: "thu", timeUtc: "16:00", platform: "instagram-reels", contentType: "tips-educational", preferredCollection: "faceless-ig-templates", notes: "'5 things to do in...' list" },
  { day: "thu", timeUtc: "16:30", platform: "tiktok", contentType: "tips-educational", preferredCollection: "60-luxury-travel", notes: "Educational content" },
  { day: "thu", timeUtc: "17:00", platform: "youtube-shorts", contentType: "hero-destination", preferredCollection: "60-luxury-travel", notes: "Weekly YouTube Short #1" },

  // FRIDAY — Weekend (Gulf weekend day 1)
  { day: "fri", timeUtc: "10:00", platform: "instagram-stories", contentType: "beach-vibes", preferredCollection: "300-beach-clips", notes: "Friday beach vibes (Gulf day off)" },
  { day: "fri", timeUtc: "17:00", platform: "instagram-reels", contentType: "hero-destination", preferredCollection: "60-luxury-travel", notes: "Weekend inspiration" },
  { day: "fri", timeUtc: "17:00", platform: "twitter-x", contentType: "beach-vibes", preferredCollection: "300-beach-clips", notes: "Weekend mood tweet" },

  // SATURDAY — Weekend (Gulf weekend day 2 + UK weekend)
  { day: "sat", timeUtc: "10:00", platform: "instagram-stories", contentType: "self-captured", preferredCollection: "50-aesthetic-reels", notes: "Khaled's own footage if available, else aesthetic" },
  { day: "sat", timeUtc: "17:00", platform: "instagram-reels", contentType: "article-promotion", preferredCollection: "60-luxury-travel", notes: "Weekend article promotion" },
  { day: "sat", timeUtc: "17:30", platform: "tiktok", contentType: "ugc-style", preferredCollection: "50-aesthetic-reels", notes: "Casual weekend content" },

  // SUNDAY — Winding down
  { day: "sun", timeUtc: "07:00", platform: "instagram-stories", contentType: "engagement", preferredCollection: "50-aesthetic-reels", notes: "Week recap / coming next week teaser" },
  { day: "sun", timeUtc: "17:00", platform: "instagram-reels", contentType: "beach-vibes", preferredCollection: "300-beach-clips", notes: "Relaxing Sunday content" },
  { day: "sun", timeUtc: "17:00", platform: "youtube-shorts", contentType: "tips-educational", preferredCollection: "60-luxury-travel", notes: "Weekly YouTube Short #2" },
  { day: "sun", timeUtc: "17:00", platform: "twitter-x", contentType: "tips-educational", preferredCollection: "faceless-ig-templates", notes: "Travel tip tweet" },
];

// ============================================================
// CONTENT MIX RATIOS
// ============================================================

/**
 * Optimal content mix (by percentage of total posts):
 *
 * 40% Inspirational (destination showcases, beach vibes, mood clips)
 * 25% Educational (tips, how-tos, lists, travel hacks)
 * 20% Promotional (article promotion, affiliate CTAs, booking links)
 * 10% Engagement (polls, questions, UGC reposts)
 *  5% Self-captured / Behind the scenes
 *
 * This shifts to 30% promotional during peak booking seasons:
 * - Ramadan (pre-Eid travel planning)
 * - Summer (June-August)
 * - Christmas / New Year (December)
 */
export const CONTENT_MIX = {
  standard: {
    inspirational: 0.40,
    educational: 0.25,
    promotional: 0.20,
    engagement: 0.10,
    selfCaptured: 0.05,
  },
  peakSeason: {
    inspirational: 0.25,
    educational: 0.20,
    promotional: 0.30,
    engagement: 0.10,
    selfCaptured: 0.15, // More personal content during peak = more conversions
  },
};

// ============================================================
// SELF-CAPTURED VIDEO GUIDELINES
// ============================================================

export const SELF_CAPTURED_GUIDELINES = {
  /**
   * When Khaled captures his own video, it gets:
   * 1. VID-SC-XXX code (distinguished from purchased stock)
   * 2. authenticity = "self-captured" (+15 matching score, +E-E-A-T)
   * 3. priority = 10 (always preferred over stock for same-topic match)
   *
   * Self-captured videos are the MOST valuable asset because:
   * - Google Jan 2026 Authenticity Update rewards first-hand content
   * - Audience trusts real footage over stock
   * - Unique content can't be found on competitor sites
   * - Higher engagement rate on social media
   */
  howToAdd: [
    "1. Open admin cockpit → Video Library → Upload",
    "2. Select 'Self-Captured' as source type",
    "3. Add location + scene tags (or let AI auto-tag from metadata)",
    "4. System auto-assigns VID-SC-XXX code",
    "5. Video gets priority=10 and authenticity='self-captured'",
    "6. Matching engine prioritizes it over stock for same-topic articles",
  ],
  suggestedCaptures: [
    "Walking through London neighborhoods (Mayfair, Kensington, Notting Hill)",
    "Hotel room tours and lobby walkthroughs",
    "Restaurant ambiance and food close-ups",
    "London landmarks from unique angles (not tourist-standard shots)",
    "Public transport tips (Oyster card tap, tube navigation)",
    "Shopping districts (Harrods, Bond Street, Westfield)",
    "Afternoon tea setup and pouring",
    "Street markets (Borough Market, Camden, Portobello)",
    "Sunset from specific London viewpoints",
    "Day trip destinations (Stonehenge, Bath, Oxford, Cambridge)",
  ],
  technicalTips: [
    "Shoot vertical (9:16) for reels/shorts — always",
    "60fps if possible — allows slow-motion in editing",
    "Stabilize: use iPhone stabilization or a small gimbal",
    "Natural light preferred — golden hour (1h before sunset) is best",
    "10-30 second clips — short and punchy, not long takes",
    "Capture ambient sound — adds authenticity vs dead silence",
  ],
};

// ============================================================
// PLATFORM-SPECIFIC FORMAT REQUIREMENTS
// ============================================================

export const PLATFORM_SPECS: Record<Platform, {
  aspectRatio: string;
  maxDuration: number;
  idealDuration: string;
  hashtags: number;
  captionLength: string;
  cta: string;
}> = {
  "instagram-reels": {
    aspectRatio: "9:16",
    maxDuration: 90,
    idealDuration: "15-30 seconds",
    hashtags: 5, // Instagram has deprioritized hashtag reach
    captionLength: "50-150 characters + CTA",
    cta: "Link in bio → www.yalla-london.com/blog/[slug]",
  },
  "instagram-stories": {
    aspectRatio: "9:16",
    maxDuration: 60,
    idealDuration: "5-15 seconds",
    hashtags: 2,
    captionLength: "Overlay text + stickers/polls",
    cta: "Swipe up (if 10K+) or 'Link in bio' sticker",
  },
  "tiktok": {
    aspectRatio: "9:16",
    maxDuration: 180,
    idealDuration: "15-60 seconds",
    hashtags: 3,
    captionLength: "50-100 characters",
    cta: "Comment 'LINK' for the full guide",
  },
  "youtube-shorts": {
    aspectRatio: "9:16",
    maxDuration: 60,
    idealDuration: "30-58 seconds",
    hashtags: 3,
    captionLength: "Title-style, keyword-rich",
    cta: "Subscribe + check description for links",
  },
  "twitter-x": {
    aspectRatio: "16:9 or 9:16",
    maxDuration: 140,
    idealDuration: "15-45 seconds",
    hashtags: 2,
    captionLength: "Under 200 characters + link",
    cta: "Direct article URL in tweet",
  },
};

// ============================================================
// ASSET USAGE TRACKING
// ============================================================

/**
 * Prevents overusing the same video across platforms.
 * Each video should have at least 14 days between reuses on the same platform.
 * Cross-platform reuse is OK (same video on IG + TikTok on same day is fine).
 */
export const USAGE_RULES = {
  minDaysBetweenSamePlatform: 14,
  maxUsesPerVideo: 12, // After 12 uses, suggest retiring
  retirementThreshold: 20, // After 20 uses, auto-mark as retired
  selfCapturedBonus: 1.5, // 1.5x more uses allowed (higher engagement per use)
};
