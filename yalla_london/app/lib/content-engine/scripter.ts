/**
 * Content Engine — Agent 3: Scripter
 *
 * Takes approved content angles (from Agent 2: Ideator) and research data
 * (from Agent 1: Researcher) and produces ready-to-publish content for every
 * platform: social posts, blog articles, email campaigns, and video scripts.
 *
 * This agent does NOT create database records — it only returns structured
 * content. The separate `publishPipeline()` function handles DB persistence.
 *
 * Pipeline position: Researcher -> Ideator -> **Scripter** -> Analyst
 */

import { generateJSON, isAIAvailable } from '@/lib/ai/provider';
import { getSiteConfig, getSiteDomain, getDefaultSiteId } from '@/config/sites';

const TAG = '[content-engine:scripter]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScripterInput {
  contentAngles: any;      // IdeatorOutput.angles (selected subset)
  researchData: any;       // ResearchOutput from Agent 1
  site: string;
  language: "en" | "ar";
}

export interface ScripterOutput {
  socialPosts: {
    angleId: string;
    platform: string;
    format: string;
    copy: {
      hook: string;
      body: string;
      cta: string;
      hashtags: string[];
    };
    designBrief?: {
      type: "single" | "carousel" | "video";
      dimensions: { width: number; height: number };
      imageQuery: string;
      textOverlay?: string;
      slideCount?: number;
    };
    generatedDesignId?: string;
    generatedVideoId?: string;
    scheduledContentId?: string;
    suggestedPostTime: string;
  }[];
  blogArticle?: {
    angleId: string;
    title: string;
    slug: string;
    metaDescription: string;
    content: string;
    seoKeywords: string[];
    internalLinks: string[];
    featuredImageBrief: string;
    generatedArticleId?: string;
    socialDerivatives: {
      platform: string;
      snippet: string;
      cta: string;
    }[];
  };
  emailCampaign?: {
    angleId: string;
    subjectVariants: string[];
    preheader: string;
    blocks: any;
    generatedTemplateId?: string;
    generatedCampaignId?: string;
  };
  videoProjects?: {
    angleId: string;
    platform: string;
    scenes: {
      sceneNumber: number;
      duration: number;
      textOverlay: string;
      imageQuery: string;
      transition: string;
    }[];
    generatedVideoId?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Platform constraints
// ---------------------------------------------------------------------------

const PLATFORM_LIMITS: Record<string, {
  maxChars: number;
  maxHashtags: number;
  tone: string;
  dimensions: { width: number; height: number };
  formats: string[];
}> = {
  twitter: {
    maxChars: 280,
    maxHashtags: 3,
    tone: 'concise, punchy, conversational — every word counts',
    dimensions: { width: 1200, height: 675 },
    formats: ['single-image', 'thread', 'poll'],
  },
  instagram: {
    maxChars: 2200,
    maxHashtags: 20,
    tone: 'aspirational, visual-first, storytelling with emojis and line breaks',
    dimensions: { width: 1080, height: 1080 },
    formats: ['single-image', 'carousel', 'reel'],
  },
  linkedin: {
    maxChars: 3000,
    maxHashtags: 5,
    tone: 'professional yet personal, insight-driven, thought leadership',
    dimensions: { width: 1200, height: 627 },
    formats: ['single-image', 'article', 'document'],
  },
  tiktok: {
    maxChars: 2200,
    maxHashtags: 5,
    tone: 'energetic, trend-aware, fast-paced, hook in first 2 seconds',
    dimensions: { width: 1080, height: 1920 },
    formats: ['short-video', 'photo-carousel'],
  },
};

// Optimal posting times by platform (UTC)
const OPTIMAL_POST_TIMES: Record<string, string[]> = {
  twitter: ['08:00', '12:00', '17:00'],
  instagram: ['09:00', '12:00', '19:00'],
  linkedin: ['07:30', '12:00', '17:30'],
  tiktok: ['10:00', '14:00', '19:00'],
};

// ---------------------------------------------------------------------------
// Slug generation (matches existing codebase pattern)
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// AI prompt builders
// ---------------------------------------------------------------------------

function buildSocialPostPrompt(
  angle: any,
  platform: string,
  researchData: any,
  siteConfig: any,
  language: string,
): string {
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.instagram;
  const destination = siteConfig?.destination || 'luxury travel';

  return `You are a social media content writer for ${siteConfig?.name || 'a luxury travel brand'} covering ${destination}.
Language: ${language === 'ar' ? 'Arabic (Gulf dialect, RTL)' : 'English'}

Write a ${platform} post based on this content angle:

ANGLE:
- Title: ${angle.title || angle.hook || 'Untitled'}
- Hook: ${angle.hook || angle.title || ''}
- Key message: ${angle.keyMessage || angle.description || ''}
- Target audience: ${angle.targetAudience || 'luxury travel enthusiasts'}

RESEARCH CONTEXT:
${JSON.stringify(researchData?.trends?.slice(0, 3) || [], null, 2)}

PLATFORM RULES:
- Maximum ${limits.maxChars} characters for the combined hook + body + CTA
- Maximum ${limits.maxHashtags} hashtags
- Tone: ${limits.tone}
- Format: ${angle.format || limits.formats[0]}

CONTENT REQUIREMENTS:
- Hook: An attention-grabbing opening line (first thing viewers see)
- Body: The main message, information, or story
- CTA: A clear call to action (visit link in bio, book now, save this, etc.)
- Hashtags: Relevant, mix of broad reach and niche destination tags

FIRST-HAND EXPERIENCE (critical for SEO/authenticity):
- Include sensory details (what you see, taste, smell)
- Add at least 1 insider tip
- Reference specific places by name
- NEVER use generic phrases like "nestled in the heart of", "look no further", "whether you're a"

Return ONLY valid JSON:
{
  "hook": "string",
  "body": "string",
  "cta": "string",
  "hashtags": ["string"],
  "imageQuery": "string describing ideal image for this post",
  "textOverlay": "string for image text overlay or null",
  "designType": "single|carousel|video",
  "slideCount": number_or_null
}`;
}

function buildBlogArticlePrompt(
  angle: any,
  researchData: any,
  siteConfig: any,
  language: string,
): string {
  const destination = siteConfig?.destination || 'luxury travel';
  const domain = siteConfig?.domain || getSiteDomain(getDefaultSiteId());
  const affiliatePartners = siteConfig?.affiliateCategories?.join(', ') || 'Booking.com, HalalBooking, GetYourGuide';
  const primaryKeywords = language === 'ar'
    ? (siteConfig?.primaryKeywordsAR?.slice(0, 5)?.join(', ') || '')
    : (siteConfig?.primaryKeywordsEN?.slice(0, 5)?.join(', ') || '');

  return `You are a senior travel content writer for ${siteConfig?.name || 'a luxury travel brand'} covering ${destination}.
Language: ${language === 'ar' ? 'Arabic (Gulf dialect, RTL)' : 'English'}

Write a full SEO-optimized blog article based on this content angle:

ANGLE:
- Title: ${angle.title || angle.hook || 'Untitled'}
- Key message: ${angle.keyMessage || angle.description || ''}
- Target audience: ${angle.targetAudience || 'luxury travel enthusiasts'}
- Content type: ${angle.contentType || 'guide'}

RESEARCH DATA:
- Keywords: ${primaryKeywords}
- Trending topics: ${JSON.stringify(researchData?.trends?.slice(0, 3) || [])}
- Competitor gaps: ${JSON.stringify(researchData?.competitorGaps?.slice(0, 3) || [])}
- Audience interests: ${JSON.stringify(researchData?.audienceInsights?.slice(0, 3) || [])}

ARTICLE REQUIREMENTS:
1. Length: 1,500-2,000 words minimum
2. Heading hierarchy: Exactly 1 H1, 4-6 H2 sections, H3 subsections as needed — NEVER skip heading levels
3. Meta title: 50-60 characters, includes focus keyword
4. Meta description: 120-160 characters, compelling with keyword
5. Focus keyword placement: in title, first paragraph, and at least one H2
6. Internal links: 3+ links to other pages on ${domain} (use descriptive anchor text)
7. Affiliate/booking links: 2+ links to partners (${affiliatePartners}) — integrate naturally
8. Include a "Key Takeaways" summary section near the end
9. End with a clear CTA (book now, explore more, save this guide)

FIRST-HAND EXPERIENCE (Google Jan 2026 Authenticity Update — #1 ranking signal):
- Include sensory details: what you see, taste, smell, hear at each place
- Add 2-3 insider tips that only a local or frequent visitor would know
- Reference specific times, prices, or seasonal details
- Include at least one honest limitation or "what to watch out for"
- NEVER use: "nestled in the heart of", "look no further", "without further ado", "in this comprehensive guide", "whether you're a"

SEO KEYWORDS TO INCORPORATE NATURALLY: ${primaryKeywords}

Return ONLY valid JSON:
{
  "title": "string — the article H1 title",
  "metaDescription": "string — 120-160 chars",
  "content": "string — full HTML article body with H2/H3 headings, paragraphs, lists, links",
  "seoKeywords": ["string — 5-8 target keywords"],
  "internalLinks": ["string — suggested internal link URLs on ${domain}"],
  "featuredImageBrief": "string — description of ideal featured image",
  "socialDerivatives": [
    {
      "platform": "twitter|instagram|linkedin",
      "snippet": "string — short promotional snippet for this platform",
      "cta": "string — call to action for this platform"
    }
  ]
}`;
}

function buildEmailCampaignPrompt(
  angle: any,
  researchData: any,
  siteConfig: any,
  language: string,
): string {
  const destination = siteConfig?.destination || 'luxury travel';

  return `You are an email marketing specialist for ${siteConfig?.name || 'a luxury travel brand'} covering ${destination}.
Language: ${language === 'ar' ? 'Arabic (Gulf dialect, RTL)' : 'English'}

Create an email campaign based on this content angle:

ANGLE:
- Title: ${angle.title || angle.hook || 'Untitled'}
- Key message: ${angle.keyMessage || angle.description || ''}
- Target audience: ${angle.targetAudience || 'luxury travel enthusiasts'}

CONTEXT:
${JSON.stringify(researchData?.trends?.slice(0, 2) || [])}

EMAIL REQUIREMENTS:
- 3 subject line variants (A/B test ready, 40-60 chars each, curiosity-driven)
- Preheader text (40-100 chars, complements subject)
- Email body as structured blocks (hero, text, CTA, testimonial, footer)
- Each block should have: type, heading, body, ctaText, ctaUrl, imageQuery
- Keep email scannable — short paragraphs, bold key phrases
- Include at least 1 affiliate/booking link naturally
- Mobile-first design assumption

Return ONLY valid JSON:
{
  "subjectVariants": ["string", "string", "string"],
  "preheader": "string",
  "blocks": [
    {
      "type": "hero|text|cta|testimonial|divider|footer",
      "heading": "string or null",
      "body": "string",
      "ctaText": "string or null",
      "ctaUrl": "string or null",
      "imageQuery": "string or null"
    }
  ]
}`;
}

function buildVideoScriptPrompt(
  angle: any,
  platform: string,
  researchData: any,
  siteConfig: any,
  language: string,
): string {
  const destination = siteConfig?.destination || 'luxury travel';
  const isShortForm = platform === 'tiktok' || platform === 'instagram';
  const duration = isShortForm ? '15-60 seconds' : '2-5 minutes';
  const dims = PLATFORM_LIMITS[platform]?.dimensions || { width: 1080, height: 1920 };

  return `You are a video content creator for ${siteConfig?.name || 'a luxury travel brand'} covering ${destination}.
Language: ${language === 'ar' ? 'Arabic (Gulf dialect, RTL)' : 'English'}

Create a scene-by-scene video script for ${platform}:

ANGLE:
- Title: ${angle.title || angle.hook || 'Untitled'}
- Key message: ${angle.keyMessage || angle.description || ''}

VIDEO REQUIREMENTS:
- Target duration: ${duration}
- Dimensions: ${dims.width}x${dims.height}
- Hook in first 2 seconds (critical for retention)
- Each scene: text overlay, image/footage description, transition type
- End with clear CTA
- Transitions: cut, fade, zoom, slide, dissolve

Return ONLY valid JSON:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": number_in_seconds,
      "textOverlay": "string — text shown on screen",
      "imageQuery": "string — description of footage/image for this scene",
      "transition": "cut|fade|zoom|slide|dissolve"
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Placeholder generators (when AI is unavailable)
// ---------------------------------------------------------------------------

function generatePlaceholderSocialPost(
  angle: any,
  platform: string,
  siteConfig: any,
): ScripterOutput['socialPosts'][0] {
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.instagram;
  const destination = siteConfig?.destination || 'a top destination';
  const times = OPTIMAL_POST_TIMES[platform] || ['12:00'];
  const angleTitle = angle.title || angle.hook || 'Untitled Angle';
  const angleId = angle.id || angle.angleId || `angle-${Date.now()}`;

  return {
    angleId,
    platform,
    format: angle.format || limits.formats[0],
    copy: {
      hook: `Discover ${destination}'s best-kept secret`,
      body: `${angleTitle} — We explored every corner to bring you this insider guide. From hidden gems to luxury highlights, here is what you need to know before your next trip.`,
      cta: `Save this for your next trip. Link in bio for the full guide.`,
      hashtags: [`#${(siteConfig?.name || 'travel').replace(/\s+/g, '')}`, `#${(destination).replace(/\s+/g, '')}`, '#LuxuryTravel', '#TravelTips'],
    },
    designBrief: {
      type: 'single',
      dimensions: limits.dimensions,
      imageQuery: `luxury ${destination} scenic view golden hour photography`,
      textOverlay: angleTitle,
    },
    suggestedPostTime: times[Math.floor(Math.random() * times.length)],
  };
}

function generatePlaceholderBlogArticle(
  angle: any,
  siteConfig: any,
): NonNullable<ScripterOutput['blogArticle']> {
  const destination = siteConfig?.destination || 'luxury travel';
  const domain = siteConfig?.domain || getSiteDomain(getDefaultSiteId());
  const angleTitle = angle.title || angle.hook || 'Untitled Article';
  const angleId = angle.id || angle.angleId || `angle-${Date.now()}`;
  const slug = generateSlug(angleTitle);

  return {
    angleId,
    title: angleTitle,
    slug,
    metaDescription: `Explore ${angleTitle.substring(0, 80)} — your insider guide to ${destination} with tips, recommendations, and booking links.`,
    content: `<h1>${angleTitle}</h1>
<p>This is a placeholder article that will be replaced with AI-generated content once the AI provider is configured. The article will cover ${angleTitle} with a focus on ${destination}.</p>
<h2>What Makes This Special</h2>
<p>Placeholder content section. The final article will include 1,500-2,000 words of SEO-optimized content with internal links, affiliate links, and first-hand experience markers.</p>
<h2>Insider Tips</h2>
<p>Placeholder for insider tips and first-hand experience details.</p>
<h2>How to Book</h2>
<p>Visit <a href="https://www.${domain}">our website</a> for the full guide and booking links.</p>
<h2>Key Takeaways</h2>
<ul>
<li>Placeholder takeaway 1</li>
<li>Placeholder takeaway 2</li>
<li>Placeholder takeaway 3</li>
</ul>`,
    seoKeywords: [destination, 'luxury travel', 'travel guide', 'booking', 'insider tips'],
    internalLinks: [`https://www.${domain}/blog`, `https://www.${domain}/hotels`, `https://www.${domain}/experiences`],
    featuredImageBrief: `Stunning ${destination} landscape or landmark, golden hour lighting, luxury aesthetic`,
    socialDerivatives: [
      { platform: 'twitter', snippet: `New guide: ${angleTitle}. Your insider look at ${destination}.`, cta: 'Read the full guide' },
      { platform: 'instagram', snippet: `We explored ${destination} and found something extraordinary. ${angleTitle} — full guide on our blog.`, cta: 'Link in bio' },
    ],
  };
}

function generatePlaceholderEmailCampaign(
  angle: any,
  siteConfig: any,
): NonNullable<ScripterOutput['emailCampaign']> {
  const destination = siteConfig?.destination || 'luxury travel';
  const angleTitle = angle.title || angle.hook || 'Untitled';
  const angleId = angle.id || angle.angleId || `angle-${Date.now()}`;

  return {
    angleId,
    subjectVariants: [
      `Your ${destination} insider guide just dropped`,
      `We found ${destination}'s best-kept secret`,
      `${angleTitle} — do not miss this`,
    ],
    preheader: `Discover what most travelers never see in ${destination}`,
    blocks: [
      { type: 'hero', heading: angleTitle, body: '', ctaText: null, ctaUrl: null, imageQuery: `${destination} luxury scenic` },
      { type: 'text', heading: 'The Inside Story', body: `Placeholder email body about ${angleTitle}. Will be replaced with AI-generated content.`, ctaText: null, ctaUrl: null, imageQuery: null },
      { type: 'cta', heading: null, body: 'Ready to explore?', ctaText: 'Read the Full Guide', ctaUrl: `https://www.${siteConfig?.domain || getSiteDomain(getDefaultSiteId())}/blog`, imageQuery: null },
      { type: 'footer', heading: null, body: `${siteConfig?.name || getSiteConfig(getDefaultSiteId())?.name || 'Your Site'} — Your luxury travel companion`, ctaText: null, ctaUrl: null, imageQuery: null },
    ],
  };
}

function generatePlaceholderVideoProject(
  angle: any,
  platform: string,
): NonNullable<ScripterOutput['videoProjects']>[0] {
  const angleTitle = angle.title || angle.hook || 'Untitled';
  const angleId = angle.id || angle.angleId || `angle-${Date.now()}`;
  const isShortForm = platform === 'tiktok' || platform === 'instagram';

  const scenes: NonNullable<ScripterOutput['videoProjects']>[0]['scenes'] = [
    { sceneNumber: 1, duration: 2, textOverlay: angleTitle, imageQuery: 'luxury destination opening shot dramatic', transition: 'fade' },
    { sceneNumber: 2, duration: isShortForm ? 5 : 15, textOverlay: 'The journey begins here', imageQuery: 'travel exploration scenic walkthrough', transition: 'slide' },
    { sceneNumber: 3, duration: isShortForm ? 5 : 15, textOverlay: 'What we discovered', imageQuery: 'hidden gem reveal luxury experience', transition: 'zoom' },
    { sceneNumber: 4, duration: 3, textOverlay: 'Book your experience today', imageQuery: 'call to action luxury travel branding', transition: 'fade' },
  ];

  return {
    angleId,
    platform,
    scenes,
  };
}

// ---------------------------------------------------------------------------
// Helpers: extract target platforms from angles
// ---------------------------------------------------------------------------

function getTargetPlatforms(angle: any): string[] {
  // Angles from the Ideator may specify platforms in various shapes
  if (Array.isArray(angle.targetPlatforms)) return angle.targetPlatforms;
  if (Array.isArray(angle.platforms)) return angle.platforms;
  if (angle.platformMap && typeof angle.platformMap === 'object') return Object.keys(angle.platformMap);
  // Default: all social platforms
  return ['twitter', 'instagram', 'linkedin'];
}

function shouldGenerateBlog(angle: any): boolean {
  const platforms = getTargetPlatforms(angle);
  const types = [angle.contentType, angle.type, angle.format].map(s => (s || '').toLowerCase());
  return (
    platforms.some(p => p === 'blog' || p === 'website') ||
    types.some(t => ['blog', 'article', 'guide', 'listicle', 'deep-dive', 'comparison'].includes(t))
  );
}

function shouldGenerateEmail(angle: any): boolean {
  const platforms = getTargetPlatforms(angle);
  const types = [angle.contentType, angle.type, angle.format].map(s => (s || '').toLowerCase());
  return (
    platforms.some(p => p === 'email' || p === 'newsletter') ||
    types.some(t => ['email', 'newsletter', 'campaign'].includes(t))
  );
}

function shouldGenerateVideo(angle: any): boolean {
  const platforms = getTargetPlatforms(angle);
  const types = [angle.contentType, angle.type, angle.format].map(s => (s || '').toLowerCase());
  return (
    platforms.some(p => ['tiktok', 'youtube', 'reels'].includes(p)) ||
    types.some(t => ['video', 'reel', 'short', 'script'].includes(t))
  );
}

function getSocialPlatforms(angle: any): string[] {
  const all = getTargetPlatforms(angle);
  return all.filter(p => Object.keys(PLATFORM_LIMITS).includes(p));
}

// ---------------------------------------------------------------------------
// Core: runScripter
// ---------------------------------------------------------------------------

export async function runScripter(input: ScripterInput): Promise<ScripterOutput> {
  const { contentAngles, researchData, site, language } = input;

  const siteConfig = getSiteConfig(site) || getSiteConfig(getDefaultSiteId());
  const aiAvailable = await isAIAvailable();

  const angles: any[] = Array.isArray(contentAngles)
    ? contentAngles
    : contentAngles?.angles
      ? contentAngles.angles
      : [contentAngles];

  if (angles.length === 0) {
    console.warn(`${TAG} No content angles provided, returning empty output`);
    return { socialPosts: [], videoProjects: [] };
  }

  console.debug(`${TAG} Processing ${angles.length} angle(s) for site="${site}" language="${language}" ai=${aiAvailable}`);

  const output: ScripterOutput = {
    socialPosts: [],
    videoProjects: [],
  };

  // --- Process each angle ---------------------------------------------------
  for (const angle of angles) {
    const angleId = angle.id || angle.angleId || `angle-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // 1. Social Posts — one per target social platform
    const socialPlatforms = getSocialPlatforms(angle);
    for (const platform of socialPlatforms) {
      try {
        if (aiAvailable) {
          const post = await generateSocialPost(angle, platform, researchData, siteConfig, language);
          output.socialPosts.push({ ...post, angleId });
        } else {
          output.socialPosts.push(generatePlaceholderSocialPost({ ...angle, id: angleId }, platform, siteConfig));
        }
      } catch (err) {
        console.warn(`${TAG} Social post generation failed for ${platform}, using placeholder:`, err instanceof Error ? err.message : err);
        output.socialPosts.push(generatePlaceholderSocialPost({ ...angle, id: angleId }, platform, siteConfig));
      }
    }

    // 2. Blog Article — if angle targets blog/article format
    if (shouldGenerateBlog(angle) && !output.blogArticle) {
      try {
        if (aiAvailable) {
          output.blogArticle = await generateBlogArticle({ ...angle, id: angleId }, researchData, siteConfig, language);
        } else {
          output.blogArticle = generatePlaceholderBlogArticle({ ...angle, id: angleId }, siteConfig);
        }
      } catch (err) {
        console.warn(`${TAG} Blog article generation failed, using placeholder:`, err instanceof Error ? err.message : err);
        output.blogArticle = generatePlaceholderBlogArticle({ ...angle, id: angleId }, siteConfig);
      }
    }

    // 3. Email Campaign — if angle targets email
    if (shouldGenerateEmail(angle) && !output.emailCampaign) {
      try {
        if (aiAvailable) {
          output.emailCampaign = await generateEmailCampaign({ ...angle, id: angleId }, researchData, siteConfig, language);
        } else {
          output.emailCampaign = generatePlaceholderEmailCampaign({ ...angle, id: angleId }, siteConfig);
        }
      } catch (err) {
        console.warn(`${TAG} Email campaign generation failed, using placeholder:`, err instanceof Error ? err.message : err);
        output.emailCampaign = generatePlaceholderEmailCampaign({ ...angle, id: angleId }, siteConfig);
      }
    }

    // 4. Video Projects — if angle targets video platforms
    if (shouldGenerateVideo(angle)) {
      const videoPlatforms = getTargetPlatforms(angle).filter(p => ['tiktok', 'youtube', 'instagram'].includes(p));
      // Default to tiktok if generic "video" type but no specific platform
      const resolvedPlatforms = videoPlatforms.length > 0 ? videoPlatforms : ['tiktok'];

      for (const platform of resolvedPlatforms) {
        try {
          if (aiAvailable) {
            const videoProject = await generateVideoScript({ ...angle, id: angleId }, platform, researchData, siteConfig, language);
            if (!output.videoProjects) output.videoProjects = [];
            output.videoProjects.push(videoProject);
          } else {
            if (!output.videoProjects) output.videoProjects = [];
            output.videoProjects.push(generatePlaceholderVideoProject({ ...angle, id: angleId }, platform));
          }
        } catch (err) {
          console.warn(`${TAG} Video script generation failed for ${platform}, using placeholder:`, err instanceof Error ? err.message : err);
          if (!output.videoProjects) output.videoProjects = [];
          output.videoProjects.push(generatePlaceholderVideoProject({ ...angle, id: angleId }, platform));
        }
      }
    }
  }

  console.debug(
    `${TAG} Scripting complete: ${output.socialPosts.length} social posts, ` +
    `blog=${!!output.blogArticle}, email=${!!output.emailCampaign}, ` +
    `videos=${output.videoProjects?.length || 0}`,
  );

  return output;
}

// ---------------------------------------------------------------------------
// AI generation functions
// ---------------------------------------------------------------------------

async function generateSocialPost(
  angle: any,
  platform: string,
  researchData: any,
  siteConfig: any,
  language: string,
): Promise<ScripterOutput['socialPosts'][0]> {
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.instagram;
  const times = OPTIMAL_POST_TIMES[platform] || ['12:00'];
  const prompt = buildSocialPostPrompt(angle, platform, researchData, siteConfig, language);

  const result = await generateJSON<{
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    imageQuery?: string;
    textOverlay?: string;
    designType?: string;
    slideCount?: number;
  }>(prompt, {
    systemPrompt: siteConfig?.systemPromptEN || `You are a luxury travel social media writer.`,
    temperature: 0.8,
    maxTokens: 1024,
  });

  // Enforce char limits — truncate if AI exceeded them
  const maxLen = limits.maxChars;
  const hookTrimmed = (result.hook || '').substring(0, Math.min(result.hook?.length || 0, maxLen));
  const bodyTrimmed = (result.body || '').substring(0, maxLen);
  const ctaTrimmed = (result.cta || '').substring(0, maxLen);
  const hashtagsTrimmed = (result.hashtags || []).slice(0, limits.maxHashtags);

  const designType = (result.designType === 'carousel' || result.designType === 'video')
    ? result.designType
    : 'single' as const;

  return {
    angleId: angle.id || angle.angleId || '',
    platform,
    format: angle.format || limits.formats[0],
    copy: {
      hook: hookTrimmed,
      body: bodyTrimmed,
      cta: ctaTrimmed,
      hashtags: hashtagsTrimmed,
    },
    designBrief: {
      type: designType,
      dimensions: limits.dimensions,
      imageQuery: result.imageQuery || `luxury ${siteConfig?.destination || 'travel'} ${platform}`,
      textOverlay: result.textOverlay || undefined,
      slideCount: result.slideCount || undefined,
    },
    suggestedPostTime: times[Math.floor(Math.random() * times.length)],
  };
}

async function generateBlogArticle(
  angle: any,
  researchData: any,
  siteConfig: any,
  language: string,
): Promise<NonNullable<ScripterOutput['blogArticle']>> {
  const prompt = buildBlogArticlePrompt(angle, researchData, siteConfig, language);

  const result = await generateJSON<{
    title: string;
    metaDescription: string;
    content: string;
    seoKeywords: string[];
    internalLinks: string[];
    featuredImageBrief: string;
    socialDerivatives?: { platform: string; snippet: string; cta: string }[];
  }>(prompt, {
    systemPrompt: (language === 'ar' ? siteConfig?.systemPromptAR : siteConfig?.systemPromptEN)
      || `You are a senior travel content writer specializing in luxury destinations.`,
    temperature: 0.7,
    maxTokens: 8192,
  });

  const title = result.title || angle.title || angle.hook || 'Untitled Article';

  return {
    angleId: angle.id || angle.angleId || '',
    title,
    slug: generateSlug(title),
    metaDescription: (result.metaDescription || '').substring(0, 160),
    content: result.content || '',
    seoKeywords: Array.isArray(result.seoKeywords) ? result.seoKeywords : [],
    internalLinks: Array.isArray(result.internalLinks) ? result.internalLinks : [],
    featuredImageBrief: result.featuredImageBrief || `Featured image for: ${title}`,
    socialDerivatives: Array.isArray(result.socialDerivatives) ? result.socialDerivatives : [],
  };
}

async function generateEmailCampaign(
  angle: any,
  researchData: any,
  siteConfig: any,
  language: string,
): Promise<NonNullable<ScripterOutput['emailCampaign']>> {
  const prompt = buildEmailCampaignPrompt(angle, researchData, siteConfig, language);

  const result = await generateJSON<{
    subjectVariants: string[];
    preheader: string;
    blocks: any[];
  }>(prompt, {
    systemPrompt: (language === 'ar' ? siteConfig?.systemPromptAR : siteConfig?.systemPromptEN)
      || `You are an email marketing specialist for luxury travel.`,
    temperature: 0.7,
    maxTokens: 4096,
  });

  return {
    angleId: angle.id || angle.angleId || '',
    subjectVariants: Array.isArray(result.subjectVariants) ? result.subjectVariants.slice(0, 5) : [],
    preheader: (result.preheader || '').substring(0, 100),
    blocks: result.blocks || [],
  };
}

async function generateVideoScript(
  angle: any,
  platform: string,
  researchData: any,
  siteConfig: any,
  language: string,
): Promise<NonNullable<ScripterOutput['videoProjects']>[0]> {
  const prompt = buildVideoScriptPrompt(angle, platform, researchData, siteConfig, language);

  const result = await generateJSON<{
    scenes: {
      sceneNumber: number;
      duration: number;
      textOverlay: string;
      imageQuery: string;
      transition: string;
    }[];
  }>(prompt, {
    systemPrompt: (language === 'ar' ? siteConfig?.systemPromptAR : siteConfig?.systemPromptEN)
      || `You are a video content creator for luxury travel.`,
    temperature: 0.8,
    maxTokens: 2048,
  });

  const scenes = Array.isArray(result.scenes)
    ? result.scenes.map((s, i) => ({
        sceneNumber: s.sceneNumber || i + 1,
        duration: Math.max(1, Math.min(s.duration || 5, 120)),
        textOverlay: s.textOverlay || '',
        imageQuery: s.imageQuery || '',
        transition: ['cut', 'fade', 'zoom', 'slide', 'dissolve'].includes(s.transition) ? s.transition : 'cut',
      }))
    : [];

  return {
    angleId: angle.id || angle.angleId || '',
    platform,
    scenes,
  };
}

// ---------------------------------------------------------------------------
// publishPipeline — creates DB records from scripter output
// ---------------------------------------------------------------------------

export async function publishPipeline(
  pipelineId: string,
  scripterOutput: ScripterOutput,
): Promise<{
  socialPostIds: string[];
  articleId?: string;
  emailTemplateId?: string;
  videoProjectIds: string[];
}> {
  const { prisma } = await import('@/lib/db');

  const result: {
    socialPostIds: string[];
    articleId?: string;
    emailTemplateId?: string;
    videoProjectIds: string[];
  } = {
    socialPostIds: [],
    videoProjectIds: [],
  };

  // Look up the pipeline to get site context
  let pipelineSite: string = getDefaultSiteId();
  let pipelineLanguage: string = 'en';
  try {
    const pipeline = await prisma.contentPipeline.findUnique({ where: { id: pipelineId } });
    if (pipeline) {
      pipelineSite = pipeline.site || pipelineSite;
      pipelineLanguage = pipeline.language || pipelineLanguage;
    }
  } catch (err) {
    console.warn(`${TAG} Could not fetch pipeline ${pipelineId}:`, err instanceof Error ? err.message : err);
  }

  const siteConfig = getSiteConfig(pipelineSite);
  const domain = siteConfig?.domain || getSiteDomain(getDefaultSiteId());

  // ---- 1. Social Posts -> ScheduledContent records --------------------------
  for (const post of scripterOutput.socialPosts) {
    try {
      const fullCopy = [post.copy.hook, post.copy.body, post.copy.cta].filter(Boolean).join('\n\n');
      const hashtagStr = post.copy.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      const contentText = `${fullCopy}\n\n${hashtagStr}`;

      // Schedule time: use suggested time for tomorrow
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      const [hours, minutes] = (post.suggestedPostTime || '12:00').split(':').map(Number);
      scheduledTime.setUTCHours(hours || 12, minutes || 0, 0, 0);

      const record = await prisma.scheduledContent.create({
        data: {
          title: post.copy.hook.substring(0, 200) || 'Social Post',
          content: contentText,
          content_type: `${post.platform}_post`,
          language: pipelineLanguage,
          category: 'social',
          tags: post.copy.hashtags,
          metadata: {
            pipelineId,
            angleId: post.angleId,
            platform: post.platform,
            format: post.format,
            designBrief: post.designBrief,
          },
          scheduled_time: scheduledTime,
          status: 'pending',
          platform: post.platform,
          site_id: pipelineSite,
          generation_source: 'content_engine_pipeline',
        },
      });

      result.socialPostIds.push(record.id);
    } catch (err) {
      console.error(`${TAG} Failed to create ScheduledContent for ${post.platform} post:`, err instanceof Error ? err.message : err);
    }
  }

  // ---- 2. Blog Article -> BlogPost record -----------------------------------
  if (scripterOutput.blogArticle) {
    try {
      const article = scripterOutput.blogArticle;

      // Find or create default category
      let category = await prisma.category.findFirst({ where: { slug: 'general' } });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name_en: 'General',
            name_ar: '\u0639\u0627\u0645',
            slug: 'general',
            description_en: 'General content',
            description_ar: '\u0645\u062D\u062A\u0648\u0649 \u0639\u0627\u0645',
          },
        });
      }

      // Find or create system user
      let systemUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (!systemUser) {
        systemUser = await prisma.user.findFirst();
      }
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            email: `system@${domain.replace(/^(www\.)?/, '')}`,
            name: 'Content System',
            role: 'admin',
          },
        });
      }

      // Ensure slug uniqueness by appending a short suffix if needed
      let slug = article.slug;
      const existingSlug = await prisma.blogPost.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const blogPost = await prisma.blogPost.create({
        data: {
          title_en: article.title,
          title_ar: article.title, // Will be translated by downstream pipeline if bilingual
          slug,
          excerpt_en: article.metaDescription,
          content_en: article.content,
          content_ar: article.content, // Will be translated by downstream pipeline if bilingual
          meta_title_en: article.title.substring(0, 60),
          meta_description_en: article.metaDescription.substring(0, 160),
          featured_image: null,
          published: false, // Draft — must pass pre-publication gate before going live
          category_id: category.id,
          author_id: systemUser.id,
          siteId: pipelineSite,
          tags: article.seoKeywords || [],
          keywords_json: article.seoKeywords || [],
          authority_links_json: article.internalLinks || [],
        },
      });

      result.articleId = blogPost.id;
    } catch (err) {
      console.error(`${TAG} Failed to create BlogPost:`, err instanceof Error ? err.message : err);
    }
  }

  // ---- 3. Email Campaign -> EmailTemplate + EmailCampaign records -----------
  if (scripterOutput.emailCampaign) {
    try {
      const email = scripterOutput.emailCampaign;
      const siteName = siteConfig?.name || getSiteConfig(getDefaultSiteId())?.name || 'Your Site';

      // Build HTML from blocks
      const htmlBlocks = (email.blocks || []).map((block: any) => {
        const heading = block.heading ? `<h2>${block.heading}</h2>` : '';
        const body = block.body ? `<p>${block.body}</p>` : '';
        const cta = block.ctaText && block.ctaUrl
          ? `<a href="${block.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#1a365d;color:#fff;text-decoration:none;border-radius:4px;">${block.ctaText}</a>`
          : '';
        return `<div class="email-block email-block--${block.type || 'text'}">${heading}${body}${cta}</div>`;
      }).join('\n');

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;">${htmlBlocks}<footer style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#718096;">${siteName}</footer></body></html>`;

      const template = await prisma.emailTemplate.create({
        data: {
          name: `Pipeline ${pipelineId} — ${email.subjectVariants[0]?.substring(0, 50) || 'Email'}`,
          description: `Auto-generated by content engine pipeline ${pipelineId}`,
          site: pipelineSite,
          type: 'campaign',
          subject: email.subjectVariants[0] || 'New from ' + siteName,
          htmlContent,
          jsonContent: {
            pipelineId,
            angleId: email.angleId,
            subjectVariants: email.subjectVariants,
            preheader: email.preheader,
            blocks: email.blocks,
          },
        },
      });

      result.emailTemplateId = template.id;
    } catch (err) {
      console.error(`${TAG} Failed to create EmailTemplate:`, err instanceof Error ? err.message : err);
    }
  }

  // ---- 4. Video Projects -> VideoProject records ----------------------------
  if (scripterOutput.videoProjects && scripterOutput.videoProjects.length > 0) {
    for (const video of scripterOutput.videoProjects) {
      try {
        const dims = PLATFORM_LIMITS[video.platform]?.dimensions || { width: 1080, height: 1920 };
        const totalDuration = video.scenes.reduce((sum, s) => sum + (s.duration || 3), 0);

        // Map platform to video format
        const formatMap: Record<string, string> = {
          tiktok: 'tiktok-video',
          instagram: 'instagram-reel',
          youtube: 'youtube-short',
        };

        const record = await prisma.videoProject.create({
          data: {
            title: `Pipeline ${pipelineId} — ${video.platform} video`,
            site: pipelineSite,
            category: 'blog-promo',
            format: formatMap[video.platform] || 'instagram-reel',
            language: pipelineLanguage,
            scenes: video.scenes,
            duration: Math.max(1, totalDuration),
            fps: 30,
            width: dims.width,
            height: dims.height,
            status: 'draft',
          },
        });

        result.videoProjectIds.push(record.id);
      } catch (err) {
        console.error(`${TAG} Failed to create VideoProject for ${video.platform}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // ---- Update pipeline record with generated IDs ----------------------------
  try {
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        scripts: scripterOutput as any,
        status: 'complete',
        generatedArticleId: result.articleId || null,
        generatedEmailId: result.emailTemplateId || null,
        generatedVideoIds: result.videoProjectIds.length > 0 ? result.videoProjectIds : undefined,
        generatedPosts: result.socialPostIds.length > 0
          ? scripterOutput.socialPosts.map((post, i) => ({
              platform: post.platform,
              text: [post.copy.hook, post.copy.body, post.copy.cta].filter(Boolean).join('\n\n'),
              designId: post.generatedDesignId || null,
              videoId: post.generatedVideoId || null,
              scheduledContentId: result.socialPostIds[i] || null,
            }))
          : undefined,
      },
    });
  } catch (err) {
    console.error(`${TAG} Failed to update ContentPipeline ${pipelineId} with generated IDs:`, err instanceof Error ? err.message : err);
  }

  console.debug(
    `${TAG} Published pipeline ${pipelineId}: ` +
    `${result.socialPostIds.length} social, ` +
    `article=${result.articleId || 'none'}, ` +
    `email=${result.emailTemplateId || 'none'}, ` +
    `${result.videoProjectIds.length} videos`,
  );

  return result;
}
