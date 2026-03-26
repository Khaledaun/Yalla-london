/**
 * Campaign Agent — Article Enhancer
 *
 * The core AI engine that enhances PUBLISHED BlogPost content.
 * Unlike enhance-runner.ts (which works on reservoir ArticleDrafts),
 * this operates on live BlogPost records.
 *
 * Each operation is modular and composable — a campaign can apply
 * any combination of operations to each article.
 *
 * Budget: each article enhancement uses ≤ 35s of AI time.
 * The caller (campaign-runner) enforces overall budget.
 */

import type {
  CampaignOperation,
  ArticleSnapshot,
  ItemProcessResult,
  ItemChanges,
  CampaignConfig,
} from './types';
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";

// ─── Snapshot helpers ────────────────────────────────────────────────────────

function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

/** Truncate HTML without breaking tags — finds the last `>` before the limit */
function safeHtmlTruncate(html: string, maxLen: number): string {
  if (html.length <= maxLen) return html;
  const truncated = html.substring(0, maxLen);
  const lastClose = truncated.lastIndexOf('>');
  if (lastClose > maxLen * 0.8) return truncated.substring(0, lastClose + 1);
  return truncated;
}

const AUTHENTICITY_SIGNALS = [
  /insider tip/i, /when (?:we|i) (?:last )?visited/i, /the atmosphere/i,
  /hidden gem/i, /locals (?:love|recommend|know)/i, /our recommendation/i,
  /don't miss/i, /first.?hand/i, /we noticed/i, /what struck (?:us|me)/i,
  /pro tip/i, /little.?known/i, /we recommend/i, /we found/i,
  /the scent of/i, /the sound of/i, /the taste of/i,
];

export function takeSnapshot(contentEn: string, contentAr: string, post: Record<string, unknown>): ArticleSnapshot {
  const authCount = AUTHENTICITY_SIGNALS.filter(r => r.test(contentEn)).length;
  return {
    wordCountEn: wordCount(contentEn),
    wordCountAr: wordCount(contentAr),
    h2Count: countMatches(contentEn, /<h2/gi),
    h3Count: countMatches(contentEn, /<h3/gi),
    internalLinkCount: countMatches(contentEn, /class="internal-link"/gi) +
      countMatches(contentEn, /href="\/blog\//gi) +
      countMatches(contentEn, /(?:yalla-london\.com|arabaldives\.com|yallariviera\.com|yallaistanbul\.com|yallathailand\.com|zenithayachts\.com|zenitha\.luxury)\/blog/gi),
    affiliateLinkCount: countMatches(contentEn, /booking\.com|halalbooking|getyourguide|viator|agoda|klook|boatbookings|anrdoezrs\.net|dpbolvw\.net|tkqlhce\.com|jdoqocy\.com|kqzyfj\.com|affiliate-recommendation|data-affiliate-id/gi),
    seoScore: (post.seo_score as number) || null,
    metaTitleEn: (post.meta_title_en as string) || null,
    metaDescEn: (post.meta_description_en as string) || null,
    metaDescLen: ((post.meta_description_en as string) || '').length,
    hasAuthenticitySignals: authCount >= 3,
    authenticitySignalCount: authCount,
    featuredImage: (post.featured_image as string) || null,
  };
}

// ─── Operation: Determine what needs fixing ──────────────────────────────────

export function diagnoseArticle(snapshot: ArticleSnapshot, config: CampaignConfig): CampaignOperation[] {
  const needed: CampaignOperation[] = [];

  // Check each requested operation against actual article state
  for (const op of config.operations) {
    switch (op) {
      case 'expand_content':
        if (snapshot.wordCountEn < (config.minWordCountTarget || 1500)) needed.push(op);
        break;
      case 'add_authenticity':
        if (snapshot.authenticitySignalCount < 3) needed.push(op);
        break;
      case 'fix_heading_hierarchy':
        if (snapshot.h2Count < 4) needed.push(op);
        break;
      case 'add_internal_links':
        if (snapshot.internalLinkCount < 3) needed.push(op);
        break;
      case 'add_affiliate_links':
        if (snapshot.affiliateLinkCount < 2) needed.push(op);
        break;
      case 'fix_meta_description':
        if (snapshot.metaDescLen < 120 || snapshot.metaDescLen > 160) needed.push(op);
        break;
      case 'fix_meta_title': {
        const titleLen = (snapshot.metaTitleEn || '').length;
        if (titleLen < 30 || titleLen > 60) needed.push(op);
        break;
      }
      case 'expand_arabic':
        if (snapshot.wordCountAr < snapshot.wordCountEn * 0.5) needed.push(op);
        break;
      case 'inject_images':
        // Always include — the enhancer will check actual image count at runtime
        if (!snapshot.featuredImage) needed.push(op);
        break;
      default:
        // Always include operations we can't auto-diagnose
        needed.push(op);
    }
  }

  return needed;
}

// ─── Fetch real published articles for internal link injection ────────────────

async function getRecentSlugs(siteId: string, excludeSlug: string): Promise<Array<{ slug: string; title_en: string }>> {
  const { prisma } = await import('@/lib/db');
  return prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, slug: { not: excludeSlug } },
    select: { slug: true, title_en: true },
    orderBy: { created_at: 'desc' },
    take: 20,
  });
}

// ─── Build AI prompt ─────────────────────────────────────────────────────────

function buildEnhancementPrompt(
  title: string,
  keyword: string,
  currentHtml: string,
  currentMetaDesc: string,
  currentMetaTitle: string,
  operations: CampaignOperation[],
  relatedArticles: Array<{ slug: string; title_en: string }>,
  destination: string,
): { prompt: string; mode: 'patch' | 'full' } {
  const wc = wordCount(currentHtml);
  const ops = operations.map(o => `- ${o}`).join('\n');

  // Build internal link options
  const linkOptions = relatedArticles.slice(0, 8).map(a =>
    `  <a href="/blog/${a.slug}" class="internal-link">${a.title_en}</a>`
  ).join('\n');

  // For articles > 1500 words, use PATCH mode — AI returns only new/changed sections
  // This avoids token truncation (a 3000-word article needs ~7000 output tokens to reproduce)
  const usePatchMode = wc > 1500;

  if (usePatchMode) {
    // Extract H2 sections as anchors for patch insertion
    const h2s = [...currentHtml.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const sectionList = h2s.length > 0 ? h2s.map((h, i) => `  ${i + 1}. "${h}"`).join('\n') : '  (no H2 sections found)';

    const prompt = `You are a senior luxury travel editor enhancing a PUBLISHED article using PATCH MODE.

ARTICLE TITLE: "${title}"
KEYWORD: "${keyword}"
DESTINATION: ${destination}
CURRENT WORD COUNT: ${wc} words
CURRENT META TITLE: "${currentMetaTitle}"
CURRENT META DESCRIPTION: "${currentMetaDesc}" (${currentMetaDesc.length} chars)

OPERATIONS REQUIRED:
${ops}

EXISTING H2 SECTIONS:
${sectionList}

ARTICLE EXCERPT (first 3000 chars for context):
${safeHtmlTruncate(currentHtml, 3000)}

${operations.includes('add_internal_links') ? `AVAILABLE INTERNAL LINKS (use 3-5 with natural anchor text):\n${linkOptions}\n` : ''}

PATCH MODE INSTRUCTIONS:
Return ONLY the new content to INSERT, using these markers:

<!-- INSERT_AFTER: "exact H2 text" -->
<new HTML content to insert after that section>
<!-- END_INSERT -->

<!-- APPEND_TO_END -->
<new sections to add at the end of the article>
<!-- END_APPEND -->

<!-- INJECT_LINKS -->
<p>Read more: <a href="/blog/slug" class="internal-link">Title</a> | <a href="/blog/slug2" class="internal-link">Title2</a></p>
<!-- END_INJECT_LINKS -->

RULES:
1. Do NOT reproduce existing content — only return NEW content to add.
2. Each INSERT_AFTER block should add 150-300 words of new content after the named section.
3. EXPERIENCE SIGNALS: Use "insider tip:", "when we visited", "the atmosphere here", "a hidden gem", "locals recommend", "pro tip:", sensory details (scents, sounds, textures), specific prices in £, specific hours, neighbourhood names.
4. GEO CITABILITY: Include 1+ statistic per new section (price, rating, distance). Attribute facts: "According to [source]". Write self-contained paragraphs (40-80 words each) — AI engines extract these verbatim.
5. BANNED PHRASES: "in conclusion", "look no further", "whether you're a X or a Y", "in this comprehensive guide", "nestled in the heart of", "without further ado", "it's worth noting".
5. AFFILIATE LINKS: Use <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(keyword)}" target="_blank" rel="nofollow sponsored" class="affiliate-link">Book on Booking.com</a> or similar.
6. NO markdown. HTML only. No preamble.

At the end, on separate lines:
META_TITLE: [50-60 chars, keyword near front]
META_DESCRIPTION: [120-155 chars, compelling with keyword]`;

    return { prompt, mode: 'patch' };
  }

  // FULL MODE for short articles (≤1500 words) — AI returns the entire enhanced article
  const prompt = `You are a senior luxury travel editor enhancing a PUBLISHED article for better search rankings and revenue.

ARTICLE TITLE: "${title}"
KEYWORD: "${keyword}"
DESTINATION: ${destination}
CURRENT WORD COUNT: ${wc} words
CURRENT META TITLE: "${currentMetaTitle}"
CURRENT META DESCRIPTION: "${currentMetaDesc}" (${currentMetaDesc.length} chars)

OPERATIONS REQUIRED (only do what's listed):
${ops}

CURRENT ARTICLE (HTML):
${safeHtmlTruncate(currentHtml, 8000)}

${operations.includes('add_internal_links') ? `AVAILABLE INTERNAL LINKS (use 3-5 with natural anchor text):\n${linkOptions}\n` : ''}

RULES:
1. Return the FULL enhanced article as valid HTML. Keep ALL existing content — only ADD to it.
2. Do NOT remove or rewrite existing paragraphs. Insert new content between existing sections.
3. Every new H2 section must address a distinct angle or question travelers have.
4. EXPERIENCE SIGNALS (if required): Use "insider tip:", "when we visited", "the atmosphere here", "a hidden gem", "locals recommend", "pro tip:", sensory details (scents, sounds, textures), specific prices in £, specific opening hours, neighbourhood names.
5. GEO CITABILITY: Add 1+ statistic per new H2 section (price, rating, capacity). Attribute facts: "According to [source]", "As rated by [authority]". Self-contained paragraphs of 40-80 words each.
6. BANNED PHRASES: "in conclusion", "look no further", "whether you're a X or a Y", "in this comprehensive guide", "nestled in the heart of", "without further ado", "it's worth noting".
6. AFFILIATE LINKS (if required): Use <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(keyword)}" target="_blank" rel="nofollow sponsored" class="affiliate-link">Book on Booking.com</a> or similar for HalalBooking, GetYourGuide, Viator.
7. INTERNAL LINKS: Use exactly the href format from the AVAILABLE INTERNAL LINKS list with class="internal-link".
8. Keep the same tone and writing style as the original article.
9. NO markdown. Return only HTML.

At the end, on separate lines return:
META_TITLE: [50-60 chars, keyword near front]
META_DESCRIPTION: [120-155 chars, compelling with keyword]

Return ONLY the enhanced HTML followed by META_TITLE and META_DESCRIPTION lines. No preamble, no explanation.`;

  return { prompt, mode: 'full' };
}

// ─── Main enhancement function ───────────────────────────────────────────────

export async function enhancePublishedArticle(
  postId: string,
  operations: CampaignOperation[],
  config: CampaignConfig,
  budgetMs: number = 40_000,
): Promise<ItemProcessResult> {
  const startTime = Date.now();
  const { prisma } = await import('@/lib/db');

  // ── Load the article ──────────────────────────────────────────────
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true, slug: true, title_en: true, title_ar: true,
      content_en: true, content_ar: true,
      meta_title_en: true, meta_title_ar: true,
      meta_description_en: true, meta_description_ar: true,
      seo_score: true, featured_image: true, siteId: true,
      keywords_json: true,
    },
  });

  if (!post) {
    return {
      success: false, operationsApplied: [], changes: {},
      costUsd: 0, error: `BlogPost ${postId} not found`,
      beforeSnapshot: {} as ArticleSnapshot,
    };
  }

  // Guard: skip unpublished articles. content-auto-fix may have unpublished this
  // article (thin content, duplicate detection) while it was queued for enhancement.
  // Processing unpublished articles wastes AI budget on dead content.
  const publishStatus = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { published: true },
  });
  if (!publishStatus?.published) {
    return {
      success: false, operationsApplied: [], changes: {},
      costUsd: 0, error: `BlogPost ${postId} is unpublished — skipping enhancement`,
      beforeSnapshot: {} as ArticleSnapshot,
    };
  }

  const beforeSnapshot = takeSnapshot(post.content_en, post.content_ar, post as unknown as Record<string, unknown>);

  // Skip if already above threshold
  if (config.skipIfScoreAbove && beforeSnapshot.seoScore && beforeSnapshot.seoScore >= config.skipIfScoreAbove) {
    const ops = diagnoseArticle(beforeSnapshot, config);
    if (ops.length === 0) {
      return {
        success: true, operationsApplied: [], changes: {},
        costUsd: 0, beforeSnapshot, afterSnapshot: beforeSnapshot,
        error: 'Skipped — all metrics already meet thresholds',
      };
    }
  }

  // Diagnose what actually needs fixing
  const neededOps = diagnoseArticle(beforeSnapshot, config);
  if (neededOps.length === 0) {
    return {
      success: true, operationsApplied: [], changes: {},
      costUsd: 0, beforeSnapshot, afterSnapshot: beforeSnapshot,
      error: 'Skipped — no operations needed',
    };
  }

  // ── Get site context ──────────────────────────────────────────────
  let destination = 'luxury travel';
  let siteName = 'travel editorial';
  try {
    const { getSiteConfig } = await import('@/config/sites');
    const siteConfig = getSiteConfig(post.siteId);
    if (siteConfig) {
      destination = siteConfig.destination || destination;
      siteName = siteConfig.name || siteName;
    }
  } catch { /* use defaults */ }

  // ── Get related articles for internal links ────────────────────────
  const relatedArticles = neededOps.includes('add_internal_links')
    ? await getRecentSlugs(post.siteId, post.slug)
    : [];

  // ── Extract keyword ───────────────────────────────────────────────
  let keyword = post.title_en;
  try {
    const kw = post.keywords_json as unknown;
    if (Array.isArray(kw) && kw.length > 0) keyword = kw[0] as string;
    else if (typeof kw === 'object' && kw && 'primary' in kw) keyword = (kw as Record<string, string>).primary;
  } catch { /* use title */ }

  // ── Build prompt and call AI ───────────────────────────────────────
  const { prompt, mode: enhanceMode } = buildEnhancementPrompt(
    post.title_en, keyword, post.content_en,
    post.meta_description_en || '', post.meta_title_en || '',
    neededOps, relatedArticles, destination,
  );

  // Scale maxTokens: patch mode needs less (only new content), full mode scales with article size
  const scaledMaxTokens = enhanceMode === 'patch'
    ? 3000 // Patches are concise — new sections + links only
    : Math.min(Math.ceil(beforeSnapshot.wordCountEn * 2.5), 8000); // Full: scale to article size

  const remainingMs = budgetMs - (Date.now() - startTime);
  if (remainingMs < 10_000) {
    return {
      success: false, operationsApplied: [], changes: {},
      costUsd: 0, error: 'Insufficient budget for AI call',
      beforeSnapshot,
    };
  }

  try {
    const { generateCompletion, getAllCircuitStates } = await import('@/lib/ai/provider');

    // Check if all providers are circuit-open before wasting an attempt
    const circuitState = typeof getAllCircuitStates === 'function' ? getAllCircuitStates() : null;
    if (circuitState && Object.keys(circuitState).length > 0 && Object.values(circuitState).every(s => s.state === 'open')) {
      return {
        success: false, operationsApplied: [], changes: {},
        costUsd: 0, error: 'All AI providers circuit-open — waiting for cooldown (retry in 5 min)',
        beforeSnapshot,
      };
    }

    const aiResult = await generateCompletion(
      [
        { role: 'system', content: `You are a senior luxury travel content editor at ${siteName}, specializing in ${destination} travel for Arab and international travelers. You write with authority, first-hand experience, and specific local knowledge. Your enhancements must significantly improve SEO and reader value while preserving the original article's voice.` },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: scaledMaxTokens,
        temperature: 0.5,
        siteId: post.siteId,
        taskType: 'campaign-enhance',
        calledFrom: 'campaign-agent',
        timeoutMs: Math.min(remainingMs - 5000, 80_000),
        phaseBudgetHint: enhanceMode === 'patch' ? 'medium' : 'heavy',
      },
    );

    if (!aiResult || !aiResult.content || aiResult.content.length < 100) {
      return {
        success: false, operationsApplied: [], changes: {},
        costUsd: 0, error: 'AI returned insufficient content',
        beforeSnapshot,
      };
    }

    const rawOutput = aiResult.content;
    const costUsd = estimateCostFromResult(aiResult);

    // ── Parse output ────────────────────────────────────────────────
    const metaTitleMatch = rawOutput.match(/META_TITLE:\s*(.+?)(?:\n|$)/i);
    const metaDescMatch = rawOutput.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i);

    let enhancedHtml: string;

    if (enhanceMode === 'patch') {
      // ── PATCH MODE: apply insertions to original content ──────────
      enhancedHtml = post.content_en;

      // Apply INSERT_AFTER patches
      const insertPatches = [...rawOutput.matchAll(/<!-- INSERT_AFTER:\s*"([^"]+)"\s*-->([\s\S]*?)<!-- END_INSERT -->/gi)];
      for (const patch of insertPatches) {
        const sectionTitle = patch[1].trim();
        const newContent = patch[2].trim();
        if (!newContent) continue;
        // Find the H2 with this title and insert after the next closing tag
        const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sectionRegex = new RegExp(`(<h2[^>]*>[^<]*${escapedTitle}[^<]*<\\/h2>)`, 'i');
        const sectionMatch = enhancedHtml.match(sectionRegex);
        if (sectionMatch && sectionMatch.index !== undefined) {
          // Find the next </p>, </ul>, </ol>, or </div> after the H2 to insert after the first block
          const afterH2 = enhancedHtml.substring(sectionMatch.index + sectionMatch[0].length);
          const nextBlockEnd = afterH2.match(/<\/(p|ul|ol|div|blockquote)>/i);
          if (nextBlockEnd && nextBlockEnd.index !== undefined) {
            const insertPoint = sectionMatch.index + sectionMatch[0].length + nextBlockEnd.index + nextBlockEnd[0].length;
            enhancedHtml = enhancedHtml.substring(0, insertPoint) + '\n' + newContent + enhancedHtml.substring(insertPoint);
          } else {
            // No block end found — insert right after the H2
            const insertPoint = sectionMatch.index + sectionMatch[0].length;
            enhancedHtml = enhancedHtml.substring(0, insertPoint) + '\n' + newContent + enhancedHtml.substring(insertPoint);
          }
        }
      }

      // Apply APPEND_TO_END
      const appendMatch = rawOutput.match(/<!-- APPEND_TO_END -->([\s\S]*?)<!-- END_APPEND -->/i);
      if (appendMatch?.[1]?.trim()) {
        enhancedHtml += '\n' + appendMatch[1].trim();
      }

      // Apply INJECT_LINKS
      const linksMatch = rawOutput.match(/<!-- INJECT_LINKS -->([\s\S]*?)<!-- END_INJECT_LINKS -->/i);
      if (linksMatch?.[1]?.trim()) {
        // Check if related links section already exists
        if (!enhancedHtml.includes('class="related-articles"') && !enhancedHtml.includes('class="related-link"')) {
          enhancedHtml += '\n<section class="related-articles">' + linksMatch[1].trim() + '</section>';
        }
      }
    } else {
      // ── FULL MODE: use the raw AI output as the new article ──────
      enhancedHtml = rawOutput
        .replace(/META_TITLE:.*$/im, '')
        .replace(/META_DESCRIPTION:.*$/im, '')
        .replace(/^```html?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // Validate full-mode content isn't truncated
      const newWc = wordCount(enhancedHtml);
      if (newWc < beforeSnapshot.wordCountEn * 0.85) {
        return {
          success: false, operationsApplied: [], changes: {},
          costUsd, error: `Enhanced content too short (${newWc}w vs original ${beforeSnapshot.wordCountEn}w) — AI may have truncated`,
          beforeSnapshot,
        };
      }
    }

    // ── Build update data ───────────────────────────────────────────
    const updateData: Record<string, unknown> = {
      content_en: enhancedHtml,
      updated_at: new Date(),
    };

    // Only update meta if AI provided better versions
    const newMetaTitle = metaTitleMatch?.[1]?.trim();
    if (newMetaTitle && newMetaTitle.length >= 30 && newMetaTitle.length <= 65) {
      updateData.meta_title_en = newMetaTitle;
    }

    const newMetaDesc = metaDescMatch?.[1]?.trim();
    if (newMetaDesc && newMetaDesc.length >= 120 && newMetaDesc.length <= 165) {
      updateData.meta_description_en = newMetaDesc;
    }

    // Demote any H1s in body to H2 (page template provides H1)
    if (typeof updateData.content_en === 'string') {
      updateData.content_en = (updateData.content_en as string)
        .replace(/<h1([^>]*)>/gi, '<h2$1>')
        .replace(/<\/h1>/gi, '</h2>');
    }

    // ── Inject Unsplash images if requested ──────────────────────────
    if (neededOps.includes('inject_images') && (Date.now() - startTime) < budgetMs - 12_000) {
      try {
        const injected = await injectUnsplashImages(
          updateData.content_en as string,
          keyword, destination, post.siteId
        );
        if (injected.html !== updateData.content_en) {
          updateData.content_en = injected.html;
          if (injected.featuredImage && !post.featured_image) {
            updateData.featured_image = injected.featuredImage;
          }
        }
      } catch (imgErr) {
        console.warn("[article-enhancer] Image injection failed:", imgErr instanceof Error ? imgErr.message : String(imgErr));
      }
    }

    // ── Save to database ────────────────────────────────────────────
    if (!config.dryRun) {
      await optimisticBlogPostUpdate(postId, () => (updateData), { tag: "[article-enhancer]" });
    }

    // ── Calculate changes ───────────────────────────────────────────
    const afterContent = updateData.content_en as string;
    const afterSnapshot = takeSnapshot(afterContent, post.content_ar, {
      ...post,
      ...updateData,
    } as unknown as Record<string, unknown>);

    const changes: ItemChanges = {
      wordsAdded: afterSnapshot.wordCountEn - beforeSnapshot.wordCountEn,
      h2sAdded: afterSnapshot.h2Count - beforeSnapshot.h2Count,
      h3sAdded: afterSnapshot.h3Count - beforeSnapshot.h3Count,
      internalLinksAdded: afterSnapshot.internalLinkCount - beforeSnapshot.internalLinkCount,
      affiliateLinksAdded: afterSnapshot.affiliateLinkCount - beforeSnapshot.affiliateLinkCount,
      metaDescRewritten: !!newMetaDesc,
      metaTitleRewritten: !!newMetaTitle,
      authenticitySignalsAdded: afterSnapshot.authenticitySignalCount - beforeSnapshot.authenticitySignalCount,
    };

    return {
      success: true,
      operationsApplied: neededOps,
      changes,
      costUsd,
      beforeSnapshot,
      afterSnapshot,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false, operationsApplied: [], changes: {},
      costUsd: 0, error: message, beforeSnapshot,
    };
  }
}

// ─── Arabic expansion (separate AI call) ─────────────────────────────────────

export async function expandArabicContent(
  postId: string,
  budgetMs: number = 30_000,
): Promise<{ success: boolean; wordsAdded: number; costUsd: number; error?: string }> {
  const { prisma } = await import('@/lib/db');

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title_en: true, title_ar: true, content_en: true, content_ar: true, siteId: true },
  });

  if (!post) return { success: false, wordsAdded: 0, costUsd: 0, error: 'Post not found' };

  const enWc = wordCount(post.content_en);
  const arWc = wordCount(post.content_ar);

  // Arabic should be at least 60% of English word count
  if (arWc >= enWc * 0.6) {
    return { success: true, wordsAdded: 0, costUsd: 0, error: 'Arabic content already adequate' };
  }

  try {
    const { generateCompletion } = await import('@/lib/ai/provider');
    const result = await generateCompletion(
      [
        { role: 'system', content: 'أنت محرر محتوى سفر فاخر متخصص في الكتابة باللغة العربية الفصحى للمسافرين العرب. تكتب بأسلوب جذاب وطبيعي.' },
        { role: 'user', content: `Translate and culturally adapt this English travel article to Arabic. The result should be a complete, standalone Arabic article (not a literal translation). Maintain the same structure (H2/H3 headings), but adapt cultural references for Arab readers. Use Modern Standard Arabic. Return only the HTML content.\n\nENGLISH ARTICLE:\n${post.content_en.substring(0, 10000)}` },
      ],
      {
        maxTokens: 5000,
        temperature: 0.5,
        siteId: post.siteId,
        taskType: 'campaign-arabic-expand',
        calledFrom: 'campaign-agent',
        timeoutMs: Math.max(Math.min(budgetMs - 3000, 30_000), 25_000),
        phaseBudgetHint: 'heavy',
      },
    );

    if (!result || !result.content || result.content.length < 200) {
      return { success: false, wordsAdded: 0, costUsd: 0, error: 'AI returned insufficient Arabic content' };
    }

    const newArabic = result.content
      .replace(/^```html?\s*/i, '').replace(/```\s*$/i, '').trim();
    const newArWc = wordCount(newArabic);

    if (newArWc > arWc) {
      await optimisticBlogPostUpdate(postId, () => ({
        content_ar: newArabic,
      }), { tag: "[article-enhancer]" });
      return { success: true, wordsAdded: newArWc - arWc, costUsd: estimateCostFromResult(result) };
    }

    return { success: false, wordsAdded: 0, costUsd: 0, error: 'New Arabic shorter than existing' };
  } catch (err) {
    return { success: false, wordsAdded: 0, costUsd: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Image injection via Unsplash ────────────────────────────────────────────

/**
 * Injects Unsplash images into article HTML.
 * Inserts after every 2nd H2 heading (up to 3 images per article).
 * Sets featured_image from first result if missing.
 * Compliant with Unsplash ToS: CDN hotlink + attribution + download tracking.
 */
async function injectUnsplashImages(
  html: string,
  keyword: string,
  destination: string,
  siteId: string,
): Promise<{ html: string; featuredImage: string | null }> {
  const { searchPhotos, buildImageUrl, buildAttribution, trackDownload } = await import('@/lib/apis/unsplash');

  // Build a search query from keyword + destination
  const searchQuery = `${keyword} ${destination} travel`.substring(0, 80);
  const photos = await searchPhotos(searchQuery, { perPage: 3, orientation: 'landscape' });

  if (photos.length === 0) return { html, featuredImage: null };

  // Find H2 positions to insert images after
  const h2Positions: number[] = [];
  const h2Regex = /<\/h2>/gi;
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(html)) !== null) {
    h2Positions.push(match.index + match[0].length);
  }

  // Insert after every 2nd H2 (positions 1, 3, 5...) — up to 3 images
  let insertedCount = 0;
  let offset = 0;
  for (let i = 1; i < h2Positions.length && insertedCount < photos.length; i += 2) {
    const photo = photos[insertedCount];
    const imgUrl = buildImageUrl(photo.urls.raw, { width: 800, quality: 80, format: 'webp' });
    const altText = photo.altDescription || photo.description || `${keyword} - ${destination}`;
    const attribution = buildAttribution(photo);

    const imgHtml = `\n<figure class="article-image" style="margin:1.5em 0">
  <img src="${imgUrl}" alt="${altText.replace(/"/g, '&quot;')}" width="800" height="${Math.round(800 * (photo.height / photo.width))}" loading="lazy" />
  <figcaption style="font-size:0.8em;color:#666;margin-top:0.3em">${attribution}</figcaption>
</figure>\n`;

    const insertPos = h2Positions[i] + offset;
    // Find end of next paragraph after this H2
    const afterH2 = html.substring(insertPos + offset >= 0 ? insertPos : 0);
    const nextPEnd = afterH2.match(/<\/(p|ul|ol|blockquote)>/i);
    const actualInsert = nextPEnd && nextPEnd.index !== undefined
      ? insertPos + nextPEnd.index + nextPEnd[0].length
      : insertPos;

    html = html.substring(0, actualInsert) + imgHtml + html.substring(actualInsert);
    offset += imgHtml.length;
    insertedCount++;

    // Track download per Unsplash ToS (fire-and-forget)
    trackDownload(photo.downloadUrl).catch(() => {});
  }

  // Use first photo as featured image if none exists
  const featuredImage = photos.length > 0
    ? buildImageUrl(photos[0].urls.raw, { width: 1200, quality: 85, format: 'webp' })
    : null;

  return { html, featuredImage };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimateCostFromResult(result: { usage: { promptTokens: number; completionTokens: number } }): number {
  // Default to grok-4-1-fast pricing: $0.20/$0.50 per 1M tokens
  return (result.usage.promptTokens / 1_000_000) * 0.20 + (result.usage.completionTokens / 1_000_000) * 0.50;
}
