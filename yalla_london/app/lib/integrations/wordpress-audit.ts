/**
 * WordPress Site Audit Engine
 *
 * Runs an extensive audit when a WordPress site is added to the system.
 * Analyzes: content, structure, design, SEO, writing style, languages,
 * media assets, plugins, and generates a comprehensive site profile
 * for AI content alignment.
 */

import {
  WordPressClient,
  type WPPost,
  type WPPage,
  type WPMedia,
  type WPCategory,
  type WPTag,
  type WPCredentials,
} from "./wordpress";

// ─── Audit Report Types ──────────────────────────────────────────

export interface WPSiteAudit {
  meta: {
    siteUrl: string;
    siteName: string;
    auditDate: string;
    auditDuration: string;
  };
  overview: SiteOverview;
  content: ContentAnalysis;
  structure: StructureAnalysis;
  seo: SeoAnalysis;
  design: DesignAnalysis;
  media: MediaAnalysis;
  writing: WritingStyleAnalysis;
  languages: LanguageAnalysis;
  technical: TechnicalAnalysis;
  recommendations: string[];
  siteProfile: SiteProfile; // Generated AI prompt/skills document
}

interface SiteOverview {
  totalPosts: number;
  totalPages: number;
  totalMedia: number;
  totalCategories: number;
  totalTags: number;
  totalUsers: number;
  siteLanguage: string;
  timezone: string;
  postsPerPage: number;
  oldestPost: string | null;
  newestPost: string | null;
  publishFrequency: string; // e.g. "~3 posts/week"
}

interface ContentAnalysis {
  niche: string;
  subNiches: string[];
  topCategories: { name: string; count: number; percentage: number }[];
  topTags: { name: string; count: number }[];
  contentTypes: { type: string; count: number }[];
  avgWordCount: number;
  minWordCount: number;
  maxWordCount: number;
  avgReadingTime: string;
  contentPatterns: {
    usesListicles: boolean;
    usesHowTo: boolean;
    usesReviews: boolean;
    usesComparisons: boolean;
    usesGuides: boolean;
    usesNews: boolean;
  };
  topPerformingTopics: string[];
  contentGaps: string[];
}

interface StructureAnalysis {
  siteHierarchy: { page: string; depth: number; children: number }[];
  menuStructure: string[];
  hasHomepage: boolean;
  hasBlog: boolean;
  hasShop: boolean;
  hasContactPage: boolean;
  hasAboutPage: boolean;
  customPostTypes: string[];
  urlStructure: string; // e.g. "/%postname%/", "/%category%/%postname%/"
  paginationStyle: string;
}

interface SeoAnalysis {
  seoPlugin: string | null; // "yoast" | "rankmath" | "aioseo" | null
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  postsWithMetaTitle: number;
  postsWithMetaDesc: number;
  postsWithFocusKeyword: number;
  avgTitleLength: number;
  avgMetaDescLength: number;
  schemaMarkup: boolean;
  ogTags: boolean;
  twitterCards: boolean;
  canonicalUrls: boolean;
  internalLinkingAvg: number;
}

interface DesignAnalysis {
  theme: string;
  themeVersion: string;
  isChildTheme: boolean;
  pageBuilder: string | null; // "elementor" | "wpbakery" | "gutenberg" | "divi" | null
  hasCustomCss: boolean;
  colorScheme: { primary: string; secondary: string; accent: string; background: string; text: string };
  fontPrimary: string;
  fontSecondary: string;
  layoutStyle: string; // "boxed" | "full-width" | "sidebar-left" | "sidebar-right"
  headerStyle: string;
  footerStyle: string;
  hasHeroSection: boolean;
  hasSidebar: boolean;
  responsiveDesign: boolean;
}

interface MediaAnalysis {
  totalImages: number;
  totalVideos: number;
  totalDocuments: number;
  avgImageSize: number;
  formatsUsed: string[];
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  hasWebP: boolean;
  hasLazyLoading: boolean;
  featuredImageUsage: number; // percentage of posts with featured image
}

interface WritingStyleAnalysis {
  tone: string; // "formal" | "casual" | "professional" | "friendly" | "academic"
  perspective: string; // "first-person" | "second-person" | "third-person" | "mixed"
  avgSentenceLength: number;
  avgParagraphLength: number;
  readabilityScore: number; // Flesch-Kincaid approx
  usesSubheadings: boolean;
  usesBulletPoints: boolean;
  usesImages: boolean;
  usesCTA: boolean;
  commonPhrases: string[];
  writingPatterns: string[];
  authorVoice: string;
}

interface LanguageAnalysis {
  primaryLanguage: string;
  detectedLanguages: string[];
  isMultilingual: boolean;
  multilingualPlugin: string | null;
  rtlSupport: boolean;
  hasArabicContent: boolean;
  translationCoverage: number;
}

interface TechnicalAnalysis {
  wpVersion: string;
  phpVersion: string;
  activePlugins: { name: string; version: string; category: string }[];
  activeTheme: { name: string; version: string };
  cachePlugin: string | null;
  securityPlugin: string | null;
  formPlugin: string | null;
  analyticsSetup: string | null;
  sslEnabled: boolean;
  cdnDetected: string | null;
  pageLoadEstimate: string;
}

export interface SiteProfile {
  siteName: string;
  siteUrl: string;
  niche: string;
  subNiches: string[];
  languages: string[];
  primaryLanguage: string;
  tone: string;
  writingStyle: string;
  contentTypes: string[];
  topCategories: string[];
  designStyle: string;
  colorPalette: Record<string, string>;
  fonts: { heading: string; body: string };
  systemPrompt: string; // AI system prompt for content generation
  contentGuidelines: string; // Detailed content rules
  seoGuidelines: string; // SEO rules
}

// ─── Audit Engine ────────────────────────────────────────────────

export async function runWordPressAudit(
  credentials: WPCredentials,
): Promise<WPSiteAudit> {
  const startTime = Date.now();
  const client = new WordPressClient(credentials);

  // Test connection first
  const connection = await client.testConnection();
  if (!connection.connected) {
    throw new Error(`Cannot connect to WordPress: ${connection.error}`);
  }

  // Fetch all data in parallel
  const [
    settings,
    allPosts,
    allPages,
    categories,
    tags,
    media,
    users,
    plugins,
    themes,
  ] = await Promise.all([
    client.getSettings().catch(() => null),
    client.getAllPosts().catch(() => [] as WPPost[]),
    client.getAllPages().catch(() => [] as WPPage[]),
    client.getCategories().catch(() => [] as WPCategory[]),
    client.getTags().catch(() => [] as WPTag[]),
    client.getMedia({ per_page: 100 }).catch(() => ({ media: [] as WPMedia[], total: 0 })),
    client.getUsers().catch(() => []),
    client.getPlugins().catch(() => []),
    client.getThemes().catch(() => []),
  ]);

  // Also fetch draft posts for completeness
  const draftPosts = await client.getAllPosts("draft").catch(() => []);

  const allContent = [...allPosts, ...draftPosts];

  // ─── Overview ────────────────────────────────────────────────

  const sortedByDate = [...allPosts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const oldestPost = sortedByDate[0]?.date || null;
  const newestPost = sortedByDate[sortedByDate.length - 1]?.date || null;

  let publishFrequency = "unknown";
  if (oldestPost && newestPost && allPosts.length > 1) {
    const daySpan =
      (new Date(newestPost).getTime() - new Date(oldestPost).getTime()) /
      (1000 * 60 * 60 * 24);
    const postsPerWeek = daySpan > 0 ? (allPosts.length / daySpan) * 7 : 0;
    if (postsPerWeek >= 7) publishFrequency = `~${Math.round(postsPerWeek)} posts/week (daily)`;
    else if (postsPerWeek >= 1) publishFrequency = `~${Math.round(postsPerWeek)} posts/week`;
    else publishFrequency = `~${Math.round(postsPerWeek * 4)} posts/month`;
  }

  const overview: SiteOverview = {
    totalPosts: allPosts.length,
    totalPages: allPages.length,
    totalMedia: media.total,
    totalCategories: categories.length,
    totalTags: tags.length,
    totalUsers: users.length,
    siteLanguage: settings?.language || "en-US",
    timezone: settings?.timezone_string || "UTC",
    postsPerPage: settings?.posts_per_page || 10,
    oldestPost,
    newestPost,
    publishFrequency,
  };

  // ─── Content Analysis ────────────────────────────────────────

  const contentAnalysis = analyzeContent(allPosts, categories, tags);

  // ─── Structure Analysis ──────────────────────────────────────

  const structureAnalysis = analyzeStructure(allPages, allPosts);

  // ─── SEO Analysis ────────────────────────────────────────────

  const seoAnalysis = analyzeSeo(allPosts, plugins);

  // ─── Design Analysis ─────────────────────────────────────────

  const designAnalysis = analyzeDesign(themes, plugins, allPosts);

  // ─── Media Analysis ──────────────────────────────────────────

  const mediaAnalysis = analyzeMedia(media.media, allPosts, media.total);

  // ─── Writing Style Analysis ──────────────────────────────────

  const writingAnalysis = analyzeWritingStyle(allPosts);

  // ─── Language Analysis ───────────────────────────────────────

  const languageAnalysis = analyzeLanguages(
    allPosts,
    settings?.language || "en-US",
    plugins,
  );

  // ─── Technical Analysis ──────────────────────────────────────

  const technicalAnalysis = analyzeTechnical(plugins, themes);

  // ─── Generate Site Profile ───────────────────────────────────

  const siteProfile = generateSiteProfile({
    siteName: connection.siteName || settings?.title || "WordPress Site",
    siteUrl: connection.siteUrl || settings?.url || credentials.apiUrl,
    overview,
    content: contentAnalysis,
    design: designAnalysis,
    writing: writingAnalysis,
    languages: languageAnalysis,
    seo: seoAnalysis,
  });

  // ─── Recommendations ─────────────────────────────────────────

  const recommendations = generateRecommendations({
    overview,
    content: contentAnalysis,
    seo: seoAnalysis,
    design: designAnalysis,
    media: mediaAnalysis,
    writing: writingAnalysis,
  });

  const elapsed = Date.now() - startTime;

  return {
    meta: {
      siteUrl: connection.siteUrl || credentials.apiUrl,
      siteName: connection.siteName || settings?.title || "Unknown",
      auditDate: new Date().toISOString(),
      auditDuration: `${(elapsed / 1000).toFixed(1)}s`,
    },
    overview,
    content: contentAnalysis,
    structure: structureAnalysis,
    seo: seoAnalysis,
    design: designAnalysis,
    media: mediaAnalysis,
    writing: writingAnalysis,
    languages: languageAnalysis,
    technical: technicalAnalysis,
    recommendations,
    siteProfile,
  };
}

// ─── Analysis Functions ──────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function analyzeContent(
  posts: WPPost[],
  categories: WPCategory[],
  tags: WPTag[],
): ContentAnalysis {
  // Word counts
  const wordCounts = posts.map((p) => countWords(stripHtml(p.content.rendered)));
  const avgWordCount = wordCounts.length
    ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
    : 0;

  // Top categories
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const catCounts: Record<string, number> = {};
  for (const post of posts) {
    for (const catId of post.categories) {
      const cat = catMap.get(catId);
      if (cat) catCounts[cat.name] = (catCounts[cat.name] || 0) + 1;
    }
  }

  const topCategories = Object.entries(catCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: posts.length ? Math.round((count / posts.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top tags
  const topTags = [...tags]
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((t) => ({ name: t.name, count: t.count }));

  // Detect niche from categories and titles
  const allTitles = posts.map((p) => stripHtml(p.title.rendered).toLowerCase());
  const allCatNames = categories.map((c) => c.name.toLowerCase());
  const niche = detectNiche([...allTitles, ...allCatNames]);

  // Detect content patterns
  const allText = posts.map((p) => stripHtml(p.content.rendered).toLowerCase());
  const contentPatterns = {
    usesListicles: allTitles.some((t) => /\d+\s+(best|top|ways|tips|reasons)/i.test(t)),
    usesHowTo: allTitles.some((t) => /how to|step.by.step|guide to/i.test(t)),
    usesReviews: allTitles.some((t) => /review|rating|comparison/i.test(t)),
    usesComparisons: allTitles.some((t) => /vs\.?|versus|compare|comparison/i.test(t)),
    usesGuides: allTitles.some((t) => /guide|complete|ultimate|beginner/i.test(t)),
    usesNews: allTitles.some((t) => /update|announce|launch|new|breaking/i.test(t)),
  };

  const contentTypes: { type: string; count: number }[] = [];
  if (contentPatterns.usesListicles) contentTypes.push({ type: "listicle", count: allTitles.filter((t) => /\d+\s+(best|top|ways|tips)/i.test(t)).length });
  if (contentPatterns.usesGuides) contentTypes.push({ type: "guide", count: allTitles.filter((t) => /guide|complete|ultimate/i.test(t)).length });
  if (contentPatterns.usesHowTo) contentTypes.push({ type: "how-to", count: allTitles.filter((t) => /how to/i.test(t)).length });
  if (contentPatterns.usesReviews) contentTypes.push({ type: "review", count: allTitles.filter((t) => /review/i.test(t)).length });
  if (contentPatterns.usesComparisons) contentTypes.push({ type: "comparison", count: allTitles.filter((t) => /vs|compare/i.test(t)).length });

  return {
    niche,
    subNiches: topCategories.slice(0, 5).map((c) => c.name),
    topCategories,
    topTags,
    contentTypes,
    avgWordCount,
    minWordCount: wordCounts.length ? Math.min(...wordCounts) : 0,
    maxWordCount: wordCounts.length ? Math.max(...wordCounts) : 0,
    avgReadingTime: `${Math.ceil(avgWordCount / 200)} min`,
    contentPatterns,
    topPerformingTopics: allTitles.slice(0, 5),
    contentGaps: [],
  };
}

function analyzeStructure(pages: WPPage[], posts: WPPost[]): StructureAnalysis {
  const hierarchy = pages.map((p) => ({
    page: stripHtml(p.title.rendered),
    depth: p.parent ? 1 : 0,
    children: pages.filter((c) => c.parent === p.id).length,
  }));

  const pageSlugs = pages.map((p) => p.slug.toLowerCase());

  // Detect URL structure from post links
  let urlStructure = "/%postname%/";
  if (posts.length > 0) {
    const sampleLink = posts[0].link;
    if (sampleLink.includes("/category/")) urlStructure = "/%category%/%postname%/";
    else if (/\/\d{4}\/\d{2}\//.test(sampleLink)) urlStructure = "/%year%/%monthnum%/%postname%/";
  }

  return {
    siteHierarchy: hierarchy,
    menuStructure: pages.filter((p) => !p.parent).map((p) => stripHtml(p.title.rendered)),
    hasHomepage: pageSlugs.some((s) => ["home", "homepage", "front-page"].includes(s)),
    hasBlog: pageSlugs.some((s) => ["blog", "news", "articles", "posts"].includes(s)),
    hasShop: pageSlugs.some((s) => ["shop", "store", "products"].includes(s)),
    hasContactPage: pageSlugs.some((s) => ["contact", "contact-us", "get-in-touch"].includes(s)),
    hasAboutPage: pageSlugs.some((s) => ["about", "about-us", "who-we-are"].includes(s)),
    customPostTypes: [...new Set(posts.map((p) => p.type).filter((t) => t !== "post"))],
    urlStructure,
    paginationStyle: "numeric",
  };
}

function analyzeSeo(posts: WPPost[], plugins: { name: string; status: string }[]): SeoAnalysis {
  const pluginNames = plugins.map((p) => p.name.toLowerCase());
  let seoPlugin: string | null = null;
  if (pluginNames.some((n) => n.includes("yoast"))) seoPlugin = "yoast";
  else if (pluginNames.some((n) => n.includes("rank math"))) seoPlugin = "rankmath";
  else if (pluginNames.some((n) => n.includes("all in one seo"))) seoPlugin = "aioseo";
  else if (pluginNames.some((n) => n.includes("seopress"))) seoPlugin = "seopress";

  let postsWithMetaTitle = 0;
  let postsWithMetaDesc = 0;
  let postsWithFocusKeyword = 0;
  const titleLengths: number[] = [];

  for (const post of posts) {
    const meta = post.yoast_head_json || post.meta || {};
    if ((meta as Record<string, unknown>).title || (meta as Record<string, unknown>).og_title) {
      postsWithMetaTitle++;
      const title = String((meta as Record<string, unknown>).title || "");
      titleLengths.push(title.length);
    }
    if ((meta as Record<string, unknown>).description || (meta as Record<string, unknown>).og_description) {
      postsWithMetaDesc++;
    }
    if ((meta as Record<string, unknown>).focuskw || (meta as Record<string, unknown>).focus_keyword) {
      postsWithFocusKeyword++;
    }
  }

  return {
    seoPlugin,
    hasSitemap: seoPlugin !== null, // SEO plugins typically generate sitemaps
    hasRobotsTxt: true, // WP generates by default
    postsWithMetaTitle,
    postsWithMetaDesc,
    postsWithFocusKeyword,
    avgTitleLength: titleLengths.length
      ? Math.round(titleLengths.reduce((a, b) => a + b, 0) / titleLengths.length)
      : 0,
    avgMetaDescLength: 0,
    schemaMarkup: seoPlugin === "yoast" || seoPlugin === "rankmath",
    ogTags: seoPlugin !== null,
    twitterCards: seoPlugin !== null,
    canonicalUrls: seoPlugin !== null,
    internalLinkingAvg: 0,
  };
}

function analyzeDesign(
  themes: { stylesheet: string; name: { rendered: string }; version: string; status: string; template: string }[],
  plugins: { name: string; status: string }[],
  posts: WPPost[],
): DesignAnalysis {
  const activeTheme = themes.find((t) => t.status === "active");
  const pluginNames = plugins
    .filter((p) => p.status === "active")
    .map((p) => p.name.toLowerCase());

  let pageBuilder: string | null = null;
  if (pluginNames.some((n) => n.includes("elementor"))) pageBuilder = "elementor";
  else if (pluginNames.some((n) => n.includes("wpbakery") || n.includes("visual composer"))) pageBuilder = "wpbakery";
  else if (pluginNames.some((n) => n.includes("divi"))) pageBuilder = "divi";
  else if (pluginNames.some((n) => n.includes("beaver builder"))) pageBuilder = "beaver-builder";

  // Check if Gutenberg blocks are used
  const usesGutenberg = posts.some((p) =>
    p.content.rendered.includes("wp-block-") || p.content.rendered.includes("<!-- wp:"),
  );
  if (!pageBuilder && usesGutenberg) pageBuilder = "gutenberg";

  return {
    theme: activeTheme?.name?.rendered || "Unknown",
    themeVersion: activeTheme?.version || "Unknown",
    isChildTheme: activeTheme?.template !== activeTheme?.stylesheet,
    pageBuilder,
    hasCustomCss: pluginNames.some((n) => n.includes("custom css")),
    colorScheme: {
      primary: "#000000",
      secondary: "#333333",
      accent: "#0073aa",
      background: "#ffffff",
      text: "#333333",
    },
    fontPrimary: "System",
    fontSecondary: "System",
    layoutStyle: "full-width",
    headerStyle: "standard",
    footerStyle: "standard",
    hasHeroSection: false,
    hasSidebar: true,
    responsiveDesign: true,
  };
}

function analyzeMedia(
  mediaItems: WPMedia[],
  posts: WPPost[],
  totalMedia: number,
): MediaAnalysis {
  const images = mediaItems.filter((m) => m.media_type === "image");
  const videos = mediaItems.filter((m) => m.media_type === "video");
  const formats = [...new Set(mediaItems.map((m) => m.mime_type))];

  const withAlt = images.filter((img) => img.alt_text && img.alt_text.trim().length > 0);
  const postsWithFeaturedImage = posts.filter((p) => p.featured_media > 0);

  return {
    totalImages: images.length,
    totalVideos: videos.length,
    totalDocuments: mediaItems.length - images.length - videos.length,
    avgImageSize: 0,
    formatsUsed: formats,
    imagesWithAlt: withAlt.length,
    imagesWithoutAlt: images.length - withAlt.length,
    hasWebP: formats.includes("image/webp"),
    hasLazyLoading: true,
    featuredImageUsage: posts.length
      ? Math.round((postsWithFeaturedImage.length / posts.length) * 100)
      : 0,
  };
}

function analyzeWritingStyle(posts: WPPost[]): WritingStyleAnalysis {
  if (posts.length === 0) {
    return {
      tone: "unknown",
      perspective: "unknown",
      avgSentenceLength: 0,
      avgParagraphLength: 0,
      readabilityScore: 0,
      usesSubheadings: false,
      usesBulletPoints: false,
      usesImages: false,
      usesCTA: false,
      commonPhrases: [],
      writingPatterns: [],
      authorVoice: "unknown",
    };
  }

  // Sample up to 20 posts for analysis
  const sample = posts.slice(0, 20);
  const texts = sample.map((p) => stripHtml(p.content.rendered));

  // Detect perspective
  const allText = texts.join(" ").toLowerCase();
  const firstPerson = (allText.match(/\b(i |we |our |my |us )\b/gi) || []).length;
  const secondPerson = (allText.match(/\b(you |your |you're)\b/gi) || []).length;
  const thirdPerson = (allText.match(/\b(they |their |he |she |it )\b/gi) || []).length;
  const maxPerspective = Math.max(firstPerson, secondPerson, thirdPerson);
  let perspective = "mixed";
  if (maxPerspective === firstPerson && firstPerson > secondPerson * 2) perspective = "first-person";
  else if (maxPerspective === secondPerson && secondPerson > firstPerson * 2) perspective = "second-person";
  else if (maxPerspective === thirdPerson && thirdPerson > firstPerson * 2) perspective = "third-person";

  // Detect tone
  const formalWords = (allText.match(/\b(furthermore|moreover|consequently|therefore|thus|hereby|accordingly)\b/gi) || []).length;
  const casualWords = (allText.match(/\b(awesome|cool|great|love|amazing|hey|totally|definitely|super|really)\b/gi) || []).length;
  let tone = "professional";
  if (formalWords > casualWords * 2) tone = "formal";
  else if (casualWords > formalWords * 2) tone = "casual";
  else if (casualWords > formalWords) tone = "friendly";

  // Sentence & paragraph stats
  const sentences = texts.flatMap((t) => t.split(/[.!?]+/).filter((s) => s.trim().length > 5));
  const avgSentenceLength = sentences.length
    ? Math.round(sentences.reduce((a, s) => a + countWords(s), 0) / sentences.length)
    : 0;

  const paragraphs = texts.flatMap((t) => t.split(/\n\n+/).filter((p) => p.trim().length > 10));
  const avgParagraphLength = paragraphs.length
    ? Math.round(paragraphs.reduce((a, p) => a + countWords(p), 0) / paragraphs.length)
    : 0;

  // Content features
  const htmlSamples = sample.map((p) => p.content.rendered);
  const usesSubheadings = htmlSamples.some((h) => /<h[2-4]/i.test(h));
  const usesBulletPoints = htmlSamples.some((h) => /<(ul|ol)/i.test(h));
  const usesImages = htmlSamples.some((h) => /<img/i.test(h));
  const usesCTA = htmlSamples.some((h) =>
    /call.to.action|subscribe|sign.up|buy.now|learn.more|get.started/i.test(h),
  );

  // Readability (simplified Flesch-Kincaid)
  const totalSentences = sentences.length || 1;
  const totalWords = texts.reduce((a, t) => a + countWords(t), 0) || 1;
  const totalSyllables = totalWords * 1.5; // rough estimate
  const readabilityScore = Math.round(
    206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords),
  );

  // Extract common phrases (bi-grams)
  const wordList = allText.split(/\s+/).filter((w) => w.length > 3);
  const bigrams: Record<string, number> = {};
  for (let i = 0; i < wordList.length - 1; i++) {
    const pair = `${wordList[i]} ${wordList[i + 1]}`;
    bigrams[pair] = (bigrams[pair] || 0) + 1;
  }
  const commonPhrases = Object.entries(bigrams)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([phrase]) => phrase);

  return {
    tone,
    perspective,
    avgSentenceLength,
    avgParagraphLength,
    readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
    usesSubheadings,
    usesBulletPoints,
    usesImages,
    usesCTA,
    commonPhrases,
    writingPatterns: [
      usesSubheadings ? "Uses H2/H3 subheadings" : "Minimal subheadings",
      usesBulletPoints ? "Uses bullet/numbered lists" : "Prose-heavy style",
      usesImages ? "Integrates images in content" : "Text-focused",
      usesCTA ? "Includes calls to action" : "No clear CTAs",
      `Avg ${avgSentenceLength} words/sentence`,
      `Avg ${avgParagraphLength} words/paragraph`,
    ],
    authorVoice: `${tone}, ${perspective} perspective`,
  };
}

function analyzeLanguages(
  posts: WPPost[],
  siteLanguage: string,
  plugins: { name: string; status: string }[],
): LanguageAnalysis {
  const pluginNames = plugins.map((p) => p.name.toLowerCase());

  let multilingualPlugin: string | null = null;
  if (pluginNames.some((n) => n.includes("wpml"))) multilingualPlugin = "WPML";
  else if (pluginNames.some((n) => n.includes("polylang"))) multilingualPlugin = "Polylang";
  else if (pluginNames.some((n) => n.includes("translatepress"))) multilingualPlugin = "TranslatePress";
  else if (pluginNames.some((n) => n.includes("weglot"))) multilingualPlugin = "Weglot";

  // Detect Arabic content
  const allContent = posts.map((p) => stripHtml(p.content.rendered)).join(" ");
  const arabicChars = (allContent.match(/[\u0600-\u06FF]/g) || []).length;
  const hasArabicContent = arabicChars > 50;

  const primaryLang = siteLanguage.split("-")[0] || "en";

  const detectedLanguages = [primaryLang];
  if (hasArabicContent && primaryLang !== "ar") detectedLanguages.push("ar");

  return {
    primaryLanguage: primaryLang,
    detectedLanguages,
    isMultilingual: multilingualPlugin !== null || detectedLanguages.length > 1,
    multilingualPlugin,
    rtlSupport: hasArabicContent || primaryLang === "ar" || primaryLang === "he",
    hasArabicContent,
    translationCoverage: multilingualPlugin ? 50 : 0,
  };
}

function analyzeTechnical(
  plugins: { name: string; version: string; status: string }[],
  themes: { stylesheet: string; name: { rendered: string }; version: string; status: string }[],
): TechnicalAnalysis {
  const active = plugins.filter((p) => p.status === "active");
  const pluginNames = active.map((p) => p.name.toLowerCase());
  const activeTheme = themes.find((t) => t.status === "active");

  const categorizePlugin = (name: string): string => {
    if (/seo|yoast|rank.math|sitemap/i.test(name)) return "SEO";
    if (/cache|speed|optimize|performance|wp.rocket|w3.total|litespeed/i.test(name)) return "Performance";
    if (/security|wordfence|sucuri|ithemes|firewall/i.test(name)) return "Security";
    if (/form|contact|gravity|wpforms|ninja/i.test(name)) return "Forms";
    if (/woocommerce|shop|ecommerce/i.test(name)) return "E-Commerce";
    if (/analytics|google|pixel|tag.manager/i.test(name)) return "Analytics";
    if (/backup|migration|duplicator/i.test(name)) return "Backup";
    if (/elementor|beaver|divi|wpbakery/i.test(name)) return "Page Builder";
    if (/multilingual|wpml|polylang|translate/i.test(name)) return "Multilingual";
    if (/social|share|instagram|facebook/i.test(name)) return "Social";
    if (/media|image|gallery|smush|imagify/i.test(name)) return "Media";
    return "Other";
  };

  return {
    wpVersion: "6.x",
    phpVersion: "8.x",
    activePlugins: active.map((p) => ({
      name: p.name,
      version: p.version,
      category: categorizePlugin(p.name),
    })),
    activeTheme: {
      name: activeTheme?.name?.rendered || "Unknown",
      version: activeTheme?.version || "Unknown",
    },
    cachePlugin: pluginNames.find((n) => /cache|rocket|litespeed|w3.total/i.test(n)) || null,
    securityPlugin: pluginNames.find((n) => /wordfence|sucuri|ithemes|security/i.test(n)) || null,
    formPlugin: pluginNames.find((n) => /form|gravity|wpforms|ninja/i.test(n)) || null,
    analyticsSetup: pluginNames.find((n) => /analytics|google|pixel/i.test(n)) || null,
    sslEnabled: true,
    cdnDetected: null,
    pageLoadEstimate: "unknown",
  };
}

// ─── Niche Detection ─────────────────────────────────────────────

function detectNiche(textSamples: string[]): string {
  const allText = textSamples.join(" ").toLowerCase();

  const nicheKeywords: Record<string, string[]> = {
    "Travel & Tourism": ["travel", "hotel", "resort", "destination", "flight", "vacation", "tour", "booking"],
    "Food & Restaurant": ["restaurant", "recipe", "food", "cooking", "cuisine", "chef", "dining", "menu"],
    "Technology": ["software", "app", "tech", "programming", "digital", "computer", "startup", "code"],
    "Health & Wellness": ["health", "fitness", "wellness", "yoga", "diet", "medical", "exercise", "nutrition"],
    "Fashion & Beauty": ["fashion", "beauty", "style", "clothing", "makeup", "skincare", "outfit", "designer"],
    "Business & Finance": ["business", "finance", "invest", "market", "entrepreneur", "startup", "money"],
    "Education": ["learn", "course", "education", "student", "teaching", "university", "study", "tutorial"],
    "Real Estate": ["property", "real estate", "apartment", "house", "rental", "mortgage", "building"],
    "News & Media": ["news", "breaking", "update", "report", "journalist", "media", "press"],
    "E-Commerce": ["product", "shop", "buy", "price", "discount", "sale", "store", "order"],
    "Lifestyle": ["lifestyle", "home", "family", "diy", "garden", "interior", "decor"],
    "Sports": ["sport", "football", "soccer", "basketball", "fitness", "game", "player", "team"],
  };

  let bestNiche = "General";
  let bestScore = 0;

  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    const score = keywords.reduce(
      (acc, kw) => acc + (allText.match(new RegExp(`\\b${kw}`, "gi")) || []).length,
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestNiche = niche;
    }
  }

  return bestNiche;
}

// ─── Site Profile Generator ──────────────────────────────────────

function generateSiteProfile(data: {
  siteName: string;
  siteUrl: string;
  overview: SiteOverview;
  content: ContentAnalysis;
  design: DesignAnalysis;
  writing: WritingStyleAnalysis;
  languages: LanguageAnalysis;
  seo: SeoAnalysis;
}): SiteProfile {
  const { siteName, siteUrl, content, design, writing, languages } = data;

  const systemPrompt = `You are a content writer for "${siteName}" (${siteUrl}).

SITE IDENTITY:
- Niche: ${content.niche}
- Sub-niches: ${content.subNiches.join(", ")}
- Primary language: ${languages.primaryLanguage}
${languages.hasArabicContent ? "- Arabic content supported (RTL)" : ""}

WRITING STYLE:
- Tone: ${writing.tone}
- Perspective: ${writing.perspective}
- Average article length: ~${content.avgWordCount} words (${content.avgReadingTime} read)
- Sentence style: Avg ${writing.avgSentenceLength} words/sentence
- ${writing.usesSubheadings ? "Uses H2/H3 subheadings to structure content" : "Uses minimal subheadings"}
- ${writing.usesBulletPoints ? "Frequently uses bullet points and numbered lists" : "Prefers prose over lists"}
- ${writing.usesCTA ? "Includes calls to action" : "Informational style without hard CTAs"}

CONTENT PATTERNS:
${content.contentPatterns.usesListicles ? "- Writes listicle-style articles (top X, best X)" : ""}
${content.contentPatterns.usesGuides ? "- Publishes comprehensive guides" : ""}
${content.contentPatterns.usesHowTo ? "- Creates how-to tutorials" : ""}
${content.contentPatterns.usesReviews ? "- Writes reviews and ratings" : ""}
${content.contentPatterns.usesComparisons ? "- Creates comparison articles" : ""}

TOP CATEGORIES: ${content.topCategories.map((c) => c.name).join(", ")}

DESIGN CONTEXT:
- Theme: ${design.theme}
- Page builder: ${design.pageBuilder || "WordPress default"}

Write content that matches this site's established voice, structure, and audience expectations. Always respond with valid JSON when asked for structured content.`;

  const contentGuidelines = `CONTENT GUIDELINES FOR ${siteName.toUpperCase()}:

1. ARTICLE LENGTH: Target ${content.avgWordCount - 200}-${content.avgWordCount + 200} words
2. STRUCTURE: ${writing.usesSubheadings ? "Use H2 for main sections, H3 for subsections" : "Keep structure simple"}
3. LISTS: ${writing.usesBulletPoints ? "Use bullet points for key takeaways and feature lists" : "Prefer flowing prose"}
4. IMAGES: ${writing.usesImages ? "Include 3-5 relevant images per article with descriptive alt text" : "Text-focused content"}
5. TONE: ${writing.tone} — ${writing.perspective} perspective
6. READABILITY: Keep sentences around ${writing.avgSentenceLength} words, paragraphs under ${writing.avgParagraphLength} words
7. CTAs: ${writing.usesCTA ? "Include a clear call to action in every article" : "Focus on information delivery"}
8. CATEGORIES: Assign to one of: ${content.topCategories.map((c) => c.name).join(", ")}
9. TAGS: Use 3-8 relevant tags per post
10. SEO: Include focus keyword in title, first paragraph, and at least 2 subheadings`;

  const seoGuidelines = `SEO GUIDELINES FOR ${siteName.toUpperCase()}:

1. TITLE: 50-60 characters, include primary keyword
2. META DESCRIPTION: 150-160 characters, compelling and keyword-rich
3. URL SLUG: Short, keyword-rich, hyphenated
4. HEADINGS: H1 (title only), H2 (main sections), H3 (subsections)
5. INTERNAL LINKS: Link to 2-3 related articles
6. EXTERNAL LINKS: 1-2 authoritative source links
7. IMAGES: Descriptive filenames, alt text with keywords
8. FOCUS KEYWORD: Natural placement, 1-2% density
9. SCHEMA: ${data.seo.schemaMarkup ? "Article schema is auto-generated" : "Add structured data manually"}
10. SITEMAP: ${data.seo.hasSitemap ? "Auto-generated by " + (data.seo.seoPlugin || "plugin") : "Manual sitemap needed"}`;

  return {
    siteName,
    siteUrl,
    niche: content.niche,
    subNiches: content.subNiches,
    languages: languages.detectedLanguages,
    primaryLanguage: languages.primaryLanguage,
    tone: writing.tone,
    writingStyle: writing.authorVoice,
    contentTypes: content.contentTypes.map((c) => c.type),
    topCategories: content.topCategories.map((c) => c.name),
    designStyle: `${design.theme} with ${design.pageBuilder || "default editor"}`,
    colorPalette: design.colorScheme,
    fonts: { heading: design.fontPrimary, body: design.fontSecondary },
    systemPrompt,
    contentGuidelines,
    seoGuidelines,
  };
}

// ─── Recommendations ─────────────────────────────────────────────

function generateRecommendations(data: {
  overview: SiteOverview;
  content: ContentAnalysis;
  seo: SeoAnalysis;
  design: DesignAnalysis;
  media: MediaAnalysis;
  writing: WritingStyleAnalysis;
}): string[] {
  const recs: string[] = [];

  // Content
  if (data.content.avgWordCount < 800) {
    recs.push("Increase average article length to 1000+ words for better SEO performance");
  }
  if (data.overview.totalPosts < 20) {
    recs.push("Publish more content — sites with 50+ posts rank significantly better");
  }

  // SEO
  if (!data.seo.seoPlugin) {
    recs.push("Install an SEO plugin (Yoast SEO or RankMath) for meta optimization");
  }
  if (data.seo.postsWithMetaDesc < data.overview.totalPosts * 0.5) {
    recs.push("Add meta descriptions to all posts — currently less than 50% have them");
  }

  // Media
  if (data.media.featuredImageUsage < 80) {
    recs.push(`Only ${data.media.featuredImageUsage}% of posts have featured images — aim for 100%`);
  }
  if (data.media.imagesWithoutAlt > data.media.imagesWithAlt) {
    recs.push("Add alt text to images — more than half are missing accessibility text");
  }
  if (!data.media.hasWebP) {
    recs.push("Enable WebP image format for faster loading (use ShortPixel or Imagify)");
  }

  // Writing
  if (!data.writing.usesSubheadings) {
    recs.push("Use H2/H3 subheadings to improve content structure and scannability");
  }
  if (!data.writing.usesCTA) {
    recs.push("Add clear calls to action to improve engagement and conversions");
  }

  // Design
  if (!data.design.pageBuilder) {
    recs.push("Consider a page builder (Elementor, Gutenberg blocks) for richer layouts");
  }

  return recs;
}
