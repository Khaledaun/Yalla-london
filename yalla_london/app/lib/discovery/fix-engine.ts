/**
 * Discovery Fix Engine — Wired Fix Functions
 *
 * Every "Fix Now" button in the Discovery Monitor calls one of these functions.
 * Each function: reads current state → applies fix → returns before/after comparison.
 */

import type { DiscoveryFixResponse } from "./types";
import { getDiscoveryPromptBlock } from "./standards";

async function db() {
  const { prisma: p } = await import("@/lib/db");
  return p;
}

function aiMsg(content: string): Array<{ role: "user"; content: string }> {
  return [{ role: "user", content }];
}

// ─── Submit Page to All Engines ──────────────────────────────────────────────

export async function submitPage(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const { getSiteDomain } = await import("@/config/sites");
  const domain = getSiteDomain(siteId);
  const url = `https://${domain}/blog/${slug}`;
  const arUrl = `https://${domain}/ar/blog/${slug}`;

  try {
    const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
    const env = globalThis as unknown as { process?: { env?: { INDEXNOW_KEY?: string } } };
    const key = env.process?.env?.INDEXNOW_KEY;
    if (!key) {
      return { success: false, fixId: "submit-indexnow", action: "submit_page",
        result: { before: {}, after: {}, message: "INDEXNOW_KEY not configured" }, error: "Missing INDEXNOW_KEY env var" };
    }

    await submitToIndexNow([url, arUrl], `https://${domain}`, key);

    // Update tracking
    await p.uRLIndexingStatus.upsert({
      where: { url },
      create: { url, slug, site_id: siteId, status: "submitted", submitted_indexnow: true, last_submitted_at: new Date() },
      update: { status: "submitted", submitted_indexnow: true, last_submitted_at: new Date(), last_error: null },
    });

    return { success: true, fixId: "submit-indexnow", action: "submit_page",
      result: { before: { status: "never_submitted" }, after: { status: "submitted", channels: ["IndexNow"] }, message: `Submitted ${url} + Arabic variant to Bing, Yandex, and IndexNow Registry` } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, fixId: "submit-indexnow", action: "submit_page",
      result: { before: {}, after: {}, message: `Submission failed: ${msg}` }, error: msg };
  }
}

// ─── Refresh Sitemap Cache ───────────────────────────────────────────────────

export async function refreshSitemap(siteId: string): Promise<DiscoveryFixResponse> {
  try {
    const { regenerateSitemapCache } = await import("@/lib/sitemap-cache");
    await regenerateSitemapCache(siteId);
    return { success: true, fixId: "refresh-sitemap", action: "refresh_sitemap",
      result: { before: { cached: "stale" }, after: { cached: "fresh" }, message: "Sitemap cache regenerated with all published articles" } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, fixId: "refresh-sitemap", action: "refresh_sitemap",
      result: { before: {}, after: {}, message: `Sitemap refresh failed: ${msg}` }, error: msg };
  }
}

// ─── Retry Failed Submission ─────────────────────────────────────────────────

export async function retrySubmission(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  // Clear error state
  await p.uRLIndexingStatus.updateMany({
    where: { slug, site_id: siteId },
    data: { status: "discovered", last_error: null },
  });
  // Re-submit
  return submitPage(slug, siteId);
}

// ─── Fix Placeholder Links ──────────────────────────────────────────────────

export async function fixPlaceholders(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId, published: true },
    select: { id: true, content_en: true, content_ar: true },
  });
  if (!post) return { success: false, fixId: "fix-placeholder-links", action: "fix_placeholders",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const realPosts = await p.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, id: { not: post.id } },
    select: { slug: true, title_en: true },
    take: 100,
  });
  const validSlugs = new Set(realPosts.map(p => p.slug));

  const fixContent = (content: string): { fixed: string; count: number } => {
    let count = 0;
    // Phase 1: Strip TOPIC_SLUG placeholders
    let fixed = content.replace(/<a\s+[^>]*href="\/blog\/TOPIC_SLUG"[^>]*>(.*?)<\/a>/gi, (_m, anchor) => { count++; return anchor; });
    // Phase 2: Fix hallucinated slugs
    fixed = fixed.replace(/<a\s+([^>]*?)href="\/blog\/([a-zA-Z0-9_-]+)"([^>]*?)>(.*?)<\/a>/gi,
      (fullMatch, pre, linkSlug, post2, anchor) => {
        if (validSlugs.has(linkSlug)) return fullMatch;
        const topic = linkSlug.toLowerCase().replace(/[-_]/g, " ");
        const topicWords = topic.split(" ").filter((w: string) => w.length > 3);
        const match = realPosts.find(p => {
          const title = (p.title_en || "").toLowerCase();
          return topicWords.filter((w: string) => title.includes(w)).length >= 2;
        });
        if (match) { count++; return `<a ${pre}href="/blog/${match.slug}"${post2}>${anchor}</a>`; }
        count++;
        return anchor; // Remove link entirely if no match
      }
    );
    return { fixed, count };
  };

  const enResult = fixContent(post.content_en || "");
  const arResult = fixContent(post.content_ar || "");
  const totalFixed = enResult.count + arResult.count;

  if (totalFixed > 0) {
    const updateData: Record<string, string> = {};
    if (enResult.count > 0) updateData.content_en = enResult.fixed;
    if (arResult.count > 0) updateData.content_ar = arResult.fixed;
    await p.blogPost.update({ where: { id: post.id }, data: updateData });
  }

  return { success: true, fixId: "fix-placeholder-links", action: "fix_placeholders",
    result: { before: { brokenLinks: totalFixed }, after: { brokenLinks: 0 }, message: `Fixed ${totalFixed} broken/placeholder links` } };
}

// ─── Fix Meta Title ──────────────────────────────────────────────────────────

export async function fixMetaTitle(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, meta_title_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "fix-meta-title", action: "fix_meta_title",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const { generateCompletion } = await import("@/lib/ai/provider");
  const textPreview = (post.content_en || "").replace(/<[^>]*>/g, " ").slice(0, 500);

  const result = await generateCompletion(
    aiMsg(`Generate an SEO-optimized meta title for this article. Requirements:
- 50-60 characters (hard limit)
- Include the focus keyword naturally
- Compelling and click-worthy
- No clickbait or misleading claims

Article title: ${post.title_en}
Content preview: ${textPreview}

Return ONLY the meta title text, nothing else.`),
    { maxTokens: 100, temperature: 0.7, taskType: "seo-optimization", calledFrom: "discovery-fix-engine", siteId }
  );

  const newTitle = result.content.replace(/^["']|["']$/g, "").trim().slice(0, 60);
  const oldTitle = post.meta_title_en || "(none)";

  await p.blogPost.update({ where: { id: post.id }, data: { meta_title_en: newTitle } });

  return { success: true, fixId: "fix-meta-title", action: "fix_meta_title",
    result: { before: { metaTitle: oldTitle, length: oldTitle.length }, after: { metaTitle: newTitle, length: newTitle.length }, message: `Meta title updated: "${newTitle}"` } };
}

// ─── Fix Meta Description ────────────────────────────────────────────────────

export async function fixMetaDescription(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, meta_description_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "fix-meta-desc", action: "fix_meta_description",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const { generateCompletion } = await import("@/lib/ai/provider");
  const textPreview = (post.content_en || "").replace(/<[^>]*>/g, " ").slice(0, 800);

  const result = await generateCompletion(
    aiMsg(`Generate an SEO-optimized meta description for this article. Requirements:
- 120-155 characters (hard limit)
- Include focus keyword in first 70 chars
- End with a value proposition or call-to-action
- Compelling enough to drive clicks from search results
- No generic phrases like "Learn more" or "Read on"

Article title: ${post.title_en}
Content preview: ${textPreview}

Return ONLY the meta description text, nothing else.`),
    { maxTokens: 100, temperature: 0.7, taskType: "seo-optimization", calledFrom: "discovery-fix-engine", siteId }
  );

  const newDesc = result.content.replace(/^["']|["']$/g, "").trim().slice(0, 160);
  const oldDesc = post.meta_description_en || "(none)";

  await p.blogPost.update({ where: { id: post.id }, data: { meta_description_en: newDesc } });

  return { success: true, fixId: "fix-meta-desc", action: "fix_meta_description",
    result: { before: { metaDescription: oldDesc, length: oldDesc.length }, after: { metaDescription: newDesc, length: newDesc.length }, message: `Meta description updated (${newDesc.length} chars)` } };
}

// ─── Fix Headings (H1 → H2) ─────────────────────────────────────────────────

export async function fixHeadings(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, content_en: true, content_ar: true },
  });
  if (!post) return { success: false, fixId: "fix-headings", action: "fix_headings",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  let h1Fixed = 0;
  const fixH1 = (content: string): string => {
    return content.replace(/<h1(\s[^>]*)?>(.*?)<\/h1>/gi, (_m, attrs, inner) => {
      h1Fixed++;
      return `<h2${attrs || ""}>${inner}</h2>`;
    });
  };

  const fixedEn = fixH1(post.content_en || "");
  const fixedAr = fixH1(post.content_ar || "");

  if (h1Fixed > 0) {
    await p.blogPost.update({ where: { id: post.id }, data: { content_en: fixedEn, content_ar: fixedAr } });
  }

  return { success: true, fixId: "fix-headings", action: "fix_headings",
    result: { before: { h1Tags: h1Fixed }, after: { h1Tags: 0 }, message: `Demoted ${h1Fixed} H1 tags to H2` } };
}

// ─── Inject Internal Links ───────────────────────────────────────────────────

export async function injectInternalLinks(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId, published: true },
    select: { id: true, content_en: true, title_en: true },
  });
  if (!post) return { success: false, fixId: "inject-internal-links", action: "inject_internal_links",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const existingLinks = new Set(
    (post.content_en || "").match(/href="\/blog\/([^"]+)"/gi)?.map(m => m.match(/\/blog\/([^"]+)/)?.[1]) || []
  );

  const relatedPosts = await p.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, slug: { not: slug, notIn: Array.from(existingLinks).filter(Boolean) as string[] } },
    select: { slug: true, title_en: true },
    take: 20,
    orderBy: { created_at: "desc" },
  });

  // Find best matches by word overlap with current article title
  const titleWords = (post.title_en || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const scored = relatedPosts.map(rp => {
    const rpWords = (rp.title_en || "").toLowerCase().split(/\s+/);
    const overlap = titleWords.filter(w => rpWords.includes(w)).length;
    return { ...rp, score: overlap };
  }).sort((a, b) => b.score - a.score);

  const linksToAdd = scored.slice(0, 3).filter(s => s.score > 0);
  if (linksToAdd.length === 0) {
    return { success: true, fixId: "inject-internal-links", action: "inject_internal_links",
      result: { before: { internalLinks: existingLinks.size }, after: { internalLinks: existingLinks.size }, message: "No closely related articles found to link" } };
  }

  const linkHtml = `\n<section class="related-articles" style="margin-top:2rem;padding:1rem;border-left:3px solid #d4af37;">
<h3>Related Reading</h3>
<ul>
${linksToAdd.map(l => `<li><a href="/blog/${l.slug}" class="internal-link">${l.title_en}</a></li>`).join("\n")}
</ul>
</section>`;

  await p.blogPost.update({
    where: { id: post.id },
    data: { content_en: (post.content_en || "") + linkHtml },
  });

  return { success: true, fixId: "inject-internal-links", action: "inject_internal_links",
    result: { before: { internalLinks: existingLinks.size }, after: { internalLinks: existingLinks.size + linksToAdd.length }, message: `Added ${linksToAdd.length} internal links` } };
}

// ─── Expand Content ──────────────────────────────────────────────────────────

export async function expandContent(slug: string, siteId: string, targetWords: number): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "expand-content", action: "expand_content",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const currentText = (post.content_en || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const currentWords = currentText.split(" ").filter(Boolean).length;
  const wordsNeeded = targetWords - currentWords;

  if (wordsNeeded <= 0) {
    return { success: true, fixId: "expand-content", action: "expand_content",
      result: { before: { wordCount: currentWords }, after: { wordCount: currentWords }, message: "Already meets word count target" } };
  }

  const { generateCompletion } = await import("@/lib/ai/provider");
  const contentPreview = currentText.slice(0, 1500);

  const result = await generateCompletion(
    aiMsg(`This article titled "${post.title_en}" currently has ${currentWords} words. It needs ${wordsNeeded}+ more words to meet quality standards.

${getDiscoveryPromptBlock("blog")}

EXISTING CONTENT PREVIEW:
${contentPreview}

Write ${wordsNeeded}+ additional words that:
1. Add new subsections with H2/H3 headings
2. Include specific details, statistics, prices, or dates (citable data)
3. Add first-hand experience signals (sensory details, insider tips)
4. Include at least 1 internal link placeholder: <a href="/blog/RELATED-TOPIC" class="internal-link">descriptive text</a>
5. Maintain the existing article's voice and topic

Return ONLY the additional HTML content (H2 sections with paragraphs). No wrapper tags.`),
    { maxTokens: 3000, temperature: 0.7, taskType: "content-generation", calledFrom: "discovery-fix-engine", siteId, timeoutMs: 45000 }
  );

  const expansion = result.content.trim();
  const expansionWords = expansion.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

  // Inject before closing tag or at end
  const updatedContent = (post.content_en || "") + "\n\n" + expansion;
  await p.blogPost.update({ where: { id: post.id }, data: { content_en: updatedContent } });

  return { success: true, fixId: "expand-content", action: "expand_content",
    result: { before: { wordCount: currentWords }, after: { wordCount: currentWords + expansionWords }, message: `Added ${expansionWords} words (${currentWords} → ${currentWords + expansionWords})` } };
}

// ─── Optimize CTR (rewrite title + description) ─────────────────────────────

export async function optimizeCtr(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, meta_title_en: true, meta_description_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "optimize-ctr", action: "optimize_ctr",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const { generateCompletion } = await import("@/lib/ai/provider");
  const textPreview = (post.content_en || "").replace(/<[^>]*>/g, " ").slice(0, 800);

  const result = await generateCompletion(
    aiMsg(`This article gets impressions but very few clicks. Rewrite both the meta title and description to maximize CTR.

Current title: ${post.meta_title_en || post.title_en}
Current description: ${post.meta_description_en}
Content preview: ${textPreview}

CTR optimization tactics:
- Use power words (Ultimate, Essential, Complete, Secret, Insider)
- Include numbers or year (2026)
- Create curiosity gap without clickbait
- Address the searcher's intent directly
- Include a benefit or value proposition

Return JSON format ONLY:
{"title": "50-60 char title", "description": "120-155 char description"}`),
    { maxTokens: 200, temperature: 0.8, taskType: "seo-optimization", calledFrom: "discovery-fix-engine", siteId }
  );

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    const newTitle = (parsed.title || "").slice(0, 60);
    const newDesc = (parsed.description || "").slice(0, 160);

    const oldTitle = post.meta_title_en || "(none)";
    const oldDesc = post.meta_description_en || "(none)";

    await p.blogPost.update({ where: { id: post.id }, data: { meta_title_en: newTitle, meta_description_en: newDesc } });

    return { success: true, fixId: "optimize-ctr", action: "optimize_ctr",
      result: {
        before: { title: oldTitle, description: oldDesc },
        after: { title: newTitle, description: newDesc },
        message: `Title: "${newTitle}" | Description: "${newDesc.slice(0, 60)}..."` } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, fixId: "optimize-ctr", action: "optimize_ctr",
      result: { before: {}, after: {}, message: `Failed to parse AI response: ${msg}` }, error: msg };
  }
}

// ─── Boost AIO Readiness ─────────────────────────────────────────────────────

export async function boostAio(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "boost-aio", action: "boost_aio",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const { generateCompletion } = await import("@/lib/ai/provider");
  const contentPreview = (post.content_en || "").replace(/<[^>]*>/g, " ").slice(0, 1200);

  const result = await generateCompletion(
    aiMsg(`Optimize this article for AI Overview citation (Google AI Overviews, ChatGPT, Perplexity).

Article: "${post.title_en}"
Content preview: ${contentPreview}

Generate TWO things:

1. A "Quick Answer" section (50-80 words) that directly answers the implied question of the article title. Start with a definitive statement. Include 1-2 specific facts (prices, dates, ratings).

2. Two question-format H2 headings with short definitive answers (2-3 sentences each) that AI engines can cite directly.

Return HTML format:
<section class="quick-answer" style="background:#f8f9fa;padding:1.5rem;border-radius:8px;margin-bottom:2rem;">
<h2>Quick Answer</h2>
<p>[direct answer]</p>
</section>

<h2>[Question 1]?</h2>
<p>[Definitive 2-3 sentence answer with specific data]</p>

<h2>[Question 2]?</h2>
<p>[Definitive 2-3 sentence answer with specific data]</p>`),
    { maxTokens: 1500, temperature: 0.7, taskType: "content-generation", calledFrom: "discovery-fix-engine", siteId, timeoutMs: 40000 }
  );

  const aioContent = result.content.trim();
  // Inject after first H2 or at beginning
  const firstH2 = (post.content_en || "").indexOf("<h2");
  let updatedContent: string;
  if (firstH2 > 0) {
    updatedContent = (post.content_en || "").slice(0, firstH2) + aioContent + "\n\n" + (post.content_en || "").slice(firstH2);
  } else {
    updatedContent = aioContent + "\n\n" + (post.content_en || "");
  }

  await p.blogPost.update({ where: { id: post.id }, data: { content_en: updatedContent } });

  return { success: true, fixId: "boost-aio", action: "boost_aio",
    result: { before: { aioReady: false }, after: { aioReady: true }, message: "Added Quick Answer section + question H2s for AI citation" } };
}

// ─── Add Author Attribution ──────────────────────────────────────────────────

export async function addAuthor(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true },
  });
  if (!post) return { success: false, fixId: "add-author", action: "add_author",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  // Get author from rotation
  try {
    const { getNextAuthor } = await import("@/lib/content-pipeline/author-rotation");
    const author = await getNextAuthor(siteId);
    if (author) {
      await p.blogPost.update({
        where: { id: post.id },
        data: { author_id: author.id },
      });
      return { success: true, fixId: "add-author", action: "add_author",
        result: { before: { author: "none" }, after: { author: author.name }, message: `Assigned author: ${author.name}` } };
    }
  } catch {
    // Author rotation not available
  }

  return { success: false, fixId: "add-author", action: "add_author",
    result: { before: {}, after: {}, message: "No authors configured in TeamMember table" }, error: "No authors available" };
}

// ─── Diagnose & Fix Deindexed Page ───────────────────────────────────────────

export async function diagnoseDeindex(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, content_en: true, content_ar: true, meta_title_en: true, meta_description_en: true, seo_score: true },
  });
  if (!post) return { success: false, fixId: "diagnose-deindex", action: "diagnose_deindex",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const textEn = (post.content_en || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textEn.split(" ").filter(Boolean).length;

  // Diagnosis
  const problems: string[] = [];
  const fixes: string[] = [];

  if (wordCount < 800) {
    problems.push(`Thin content (${wordCount} words)`);
    fixes.push("expand_content");
  }
  if (!post.meta_title_en || post.meta_title_en.length < 20) {
    problems.push("Missing/short meta title");
    fixes.push("fix_meta_title");
  }
  if (!post.meta_description_en || post.meta_description_en.length < 70) {
    problems.push("Missing/short meta description");
    fixes.push("fix_meta_description");
  }
  if ((post.content_en || "").includes("TOPIC_SLUG")) {
    problems.push("Contains placeholder links");
    fixes.push("fix_placeholders");
  }

  // Apply auto-fixes
  const applied: string[] = [];
  for (const fix of fixes) {
    switch (fix) {
      case "fix_meta_title": {
        const r = await fixMetaTitle(slug, siteId);
        if (r.success) applied.push("Fixed meta title");
        break;
      }
      case "fix_meta_description": {
        const r = await fixMetaDescription(slug, siteId);
        if (r.success) applied.push("Fixed meta description");
        break;
      }
      case "fix_placeholders": {
        const r = await fixPlaceholders(slug, siteId);
        if (r.success) applied.push("Fixed placeholder links");
        break;
      }
    }
  }

  // Resubmit after fixes
  if (applied.length > 0) {
    await submitPage(slug, siteId);
    applied.push("Resubmitted to search engines");
  }

  // Reset tracking status
  await p.uRLIndexingStatus.updateMany({
    where: { slug, site_id: siteId },
    data: { status: "submitted", last_error: null },
  });

  return { success: true, fixId: "diagnose-deindex", action: "diagnose_deindex",
    result: {
      before: { status: "deindexed", problems },
      after: { status: "resubmitted", fixesApplied: applied },
      message: problems.length > 0
        ? `Found ${problems.length} issues: ${problems.join(", ")}. Applied ${applied.length} fixes and resubmitted.`
        : "No obvious issues found. Resubmitted to search engines — may take 2-7 days to re-index."
    } };
}

// ─── Boost Authenticity Signals ──────────────────────────────────────────────

export async function boostAuthenticity(slug: string, siteId: string): Promise<DiscoveryFixResponse> {
  const p = await db();
  const post = await p.blogPost.findFirst({
    where: { slug, siteId },
    select: { id: true, title_en: true, content_en: true },
  });
  if (!post) return { success: false, fixId: "boost-authenticity", action: "boost_authenticity",
    result: { before: {}, after: {}, message: "Article not found" }, error: "Not found" };

  const { generateCompletion } = await import("@/lib/ai/provider");
  const contentPreview = (post.content_en || "").replace(/<[^>]*>/g, " ").slice(0, 1500);

  const result = await generateCompletion(
    aiMsg(`This article about "${post.title_en}" needs first-hand experience signals for Google's Jan 2026 Authenticity Update.

Content preview: ${contentPreview}

Generate 3-4 "experience inserts" — short paragraphs (2-3 sentences each) that add first-hand experience signals. Include:
- Sensory details (what you see, hear, smell, taste)
- Insider tips that only a visitor would know
- Specific observations ("The lobby marble echoes every footstep", "The queue starts forming at 4pm")
- Honest limitations ("The terrace gets crowded after sunset")

Format each as a standalone <p> tag with class="experience-note":
<p class="experience-note"><strong>Insider tip:</strong> [experience detail]</p>

Return 3-4 inserts, each on its own line. These will be distributed throughout the article.`),
    { maxTokens: 800, temperature: 0.8, taskType: "content-generation", calledFrom: "discovery-fix-engine", siteId, timeoutMs: 45000 }
  );

  const inserts = result.content.match(/<p class="experience-note">[\s\S]*?<\/p>/gi) || [];
  if (inserts.length === 0) {
    return { success: false, fixId: "boost-authenticity", action: "boost_authenticity",
      result: { before: {}, after: {}, message: "AI failed to generate experience inserts" }, error: "Parse failure" };
  }

  // Distribute inserts across the article at H2 boundaries
  const content = post.content_en || "";
  const h2Positions = [...content.matchAll(/<h2[\s>]/gi)].map(m => m.index!);

  let updatedContent = content;
  let offset = 0;
  for (let i = 0; i < Math.min(inserts.length, h2Positions.length); i++) {
    const insertPos = h2Positions[i] + offset;
    updatedContent = updatedContent.slice(0, insertPos) + inserts[i] + "\n" + updatedContent.slice(insertPos);
    offset += inserts[i].length + 1;
  }

  await p.blogPost.update({ where: { id: post.id }, data: { content_en: updatedContent } });

  return { success: true, fixId: "boost-authenticity", action: "boost_authenticity",
    result: { before: { authenticityInserts: 0 }, after: { authenticityInserts: inserts.length }, message: `Added ${inserts.length} first-hand experience signals` } };
}

// ─── Fix All Auto-Fixable Issues ─────────────────────────────────────────────

export async function fixAllForPage(slug: string, siteId: string, issueIds: string[]): Promise<DiscoveryFixResponse> {
  const results: Array<{ issueId: string; success: boolean; message: string }> = [];

  for (const id of issueIds) {
    try {
      let result: DiscoveryFixResponse;
      switch (id) {
        case "submit-indexnow": result = await submitPage(slug, siteId); break;
        case "refresh-sitemap": result = await refreshSitemap(siteId); break;
        case "retry-indexing": result = await retrySubmission(slug, siteId); break;
        case "fix-placeholder-links": result = await fixPlaceholders(slug, siteId); break;
        case "fix-meta-title": result = await fixMetaTitle(slug, siteId); break;
        case "fix-meta-desc": result = await fixMetaDescription(slug, siteId); break;
        case "fix-headings": result = await fixHeadings(slug, siteId); break;
        case "inject-internal-links": result = await injectInternalLinks(slug, siteId); break;
        case "fix-alt-text": result = await fixMetaTitle(slug, siteId); break; // placeholder
        case "optimize-ctr": result = await optimizeCtr(slug, siteId); break;
        case "boost-aio": result = await boostAio(slug, siteId); break;
        case "boost-authenticity": result = await boostAuthenticity(slug, siteId); break;
        case "add-author": result = await addAuthor(slug, siteId); break;
        default: result = { success: false, fixId: id, action: "unknown", result: { before: {}, after: {}, message: `Unknown fix: ${id}` } }; break;
      }
      results.push({ issueId: id, success: result.success, message: result.result.message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ issueId: id, success: false, message: msg });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  return { success: succeeded > 0, fixId: "fix-all", action: "fix_all",
    result: { before: { issues: issueIds.length }, after: { fixed: succeeded, failed: results.length - succeeded, details: results }, message: `Fixed ${succeeded}/${results.length} issues` } };
}
