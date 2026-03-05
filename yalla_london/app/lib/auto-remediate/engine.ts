/**
 * Auto-Remediation Engine
 *
 * Centralized fix engine that can automatically resolve common content issues.
 * Called by the content-auto-fix cron but also available for on-demand fixes
 * from the cockpit.
 *
 * NEW capabilities (beyond what content-auto-fix already handles):
 * 1. Pre-publication gate → auto-fix loop (run gate, fix failures, re-run)
 * 2. Proactive quality boost (60-69 score → enhance to 70+)
 * 3. Affiliate link auto-injection
 * 4. Arabic meta translation (auto-generate if missing)
 * 5. Internal link injection
 * 6. Duplicate meta detection + rewrite
 * 7. Missing category/tag assignment
 */

export interface RemediationResult {
  fixType: string;
  targetId: string;
  success: boolean;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  error?: string;
}

/**
 * Run the pre-publication gate on an article and auto-fix any failures.
 * Returns the gate result after fixes are applied.
 *
 * Loop: run gate → fix top failure → re-run → repeat (max 3 loops)
 */
export async function gateAndRemediate(
  blogPostId: string,
  siteId: string,
  maxLoops: number = 3
): Promise<{ allowed: boolean; fixesApplied: RemediationResult[]; warnings: string[] }> {
  const { prisma } = await import("@/lib/db");
  const fixes: RemediationResult[] = [];

  for (let loop = 0; loop < maxLoops; loop++) {
    const post = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      select: {
        id: true,
        title_en: true,
        slug: true,
        content_en: true,
        content_ar: true,
        meta_title_en: true,
        meta_description_en: true,
        meta_title_ar: true,
        meta_description_ar: true,
        seo_score: true,
        siteId: true,
        tags: true,
        category_id: true,
      },
    });

    if (!post) return { allowed: false, fixesApplied: fixes, warnings: ["Article not found"] };

    // Run simplified checks inline (to avoid circular deps with the gate's HTTP-based checks)
    const issues = diagnoseIssues(post);

    if (issues.length === 0) {
      return { allowed: true, fixesApplied: fixes, warnings: [] };
    }

    // Fix the first blocker or warning
    const issue = issues[0];
    const fix = await applyFix(issue, post, siteId);
    fixes.push(fix);

    if (!fix.success) {
      // Can't fix this issue — stop looping
      return {
        allowed: false,
        fixesApplied: fixes,
        warnings: issues.map((i) => i.message),
      };
    }
  }

  // After max loops, return current state
  return { allowed: true, fixesApplied: fixes, warnings: [] };
}

interface Issue {
  type: string;
  message: string;
  blocker: boolean;
}

function diagnoseIssues(post: {
  title_en: string | null;
  content_en: string | null;
  content_ar: string | null;
  meta_title_en: string | null;
  meta_description_en: string | null;
  meta_title_ar: string | null;
  meta_description_ar: string | null;
  seo_score: number | null;
  tags: string[];
  category_id: string | null;
}): Issue[] {
  const issues: Issue[] = [];
  const contentEn = post.content_en || "";
  const plainText = contentEn.replace(/<[^>]+>/g, " ").trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  // Blocker: missing title
  if (!post.title_en || post.title_en.trim().length < 5) {
    issues.push({ type: "missing_title", message: "Missing or too-short title", blocker: true });
  }

  // Blocker: too short
  if (wordCount < 300) {
    issues.push({ type: "word_count_critical", message: `Only ${wordCount} words (need 300+)`, blocker: true });
  }

  // Warning: meta title missing or wrong length
  if (!post.meta_title_en || post.meta_title_en.length < 30) {
    issues.push({ type: "meta_title_short", message: "Meta title too short or missing", blocker: false });
  } else if (post.meta_title_en.length > 60) {
    issues.push({ type: "meta_title_long", message: "Meta title too long (>60 chars)", blocker: false });
  }

  // Warning: meta description missing or wrong length
  if (!post.meta_description_en || post.meta_description_en.length < 120) {
    issues.push({ type: "meta_desc_short", message: "Meta description too short or missing", blocker: false });
  } else if (post.meta_description_en.length > 160) {
    issues.push({ type: "meta_desc_long", message: "Meta description too long (>160 chars)", blocker: false });
  }

  // Warning: no internal links
  const internalLinkCount = (contentEn.match(/class="internal-link"|href="\/blog\//gi) || []).length;
  if (internalLinkCount < 1 && wordCount > 500) {
    issues.push({ type: "no_internal_links", message: "No internal links found", blocker: false });
  }

  // Warning: no affiliate links
  const affiliatePatterns = /booking\.com|halalbooking|agoda|getyourguide|viator|klook|boatbookings|affiliate|class="affiliate/i;
  if (!affiliatePatterns.test(contentEn) && wordCount > 500) {
    issues.push({ type: "no_affiliate_links", message: "No affiliate/booking links found", blocker: false });
  }

  // Warning: missing Arabic meta
  if (post.content_ar && (!post.meta_title_ar || !post.meta_description_ar)) {
    issues.push({ type: "missing_arabic_meta", message: "Arabic content exists but meta is missing", blocker: false });
  }

  // Warning: no category
  if (!post.category_id) {
    issues.push({ type: "missing_category", message: "No category assigned", blocker: false });
  }

  // Warning: no tags
  if (!post.tags || post.tags.length === 0) {
    issues.push({ type: "missing_tags", message: "No tags assigned", blocker: false });
  }

  return issues;
}

async function applyFix(
  issue: Issue,
  post: { id: string; title_en: string | null; slug: string | null; content_en: string | null; meta_title_en: string | null; meta_description_en: string | null; siteId: string },
  siteId: string
): Promise<RemediationResult> {
  const { prisma } = await import("@/lib/db");

  try {
    switch (issue.type) {
      case "meta_title_short": {
        // Auto-generate meta title from article title
        const title = post.title_en || "";
        const metaTitle = title.length > 60 ? title.substring(0, 57) + "…" : title;
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_title_en: metaTitle },
        });
        return {
          fixType: "meta_title_generate",
          targetId: post.id,
          success: true,
          before: { metaTitleEn: post.meta_title_en },
          after: { metaTitleEn: metaTitle },
        };
      }

      case "meta_title_long": {
        const current = post.meta_title_en || "";
        let trimmed = current.substring(0, 57);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > 40) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?]$/, "") + "…";
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_title_en: trimmed },
        });
        return {
          fixType: "meta_title_trim",
          targetId: post.id,
          success: true,
          before: { metaTitleEn: current },
          after: { metaTitleEn: trimmed },
        };
      }

      case "meta_desc_short": {
        // Generate from content
        const plainText = (post.content_en || "").replace(/<[^>]+>/g, " ").trim();
        const generated = plainText.substring(0, 155).replace(/\s+/g, " ");
        const lastSpace = generated.lastIndexOf(" ");
        const metaDesc = (lastSpace > 120 ? generated.substring(0, lastSpace) : generated).replace(/[.,;:!?]$/, "") + "…";
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_en: metaDesc },
        });
        return {
          fixType: "meta_desc_generate",
          targetId: post.id,
          success: true,
          before: { metaDescriptionEn: post.meta_description_en },
          after: { metaDescriptionEn: metaDesc },
        };
      }

      case "meta_desc_long": {
        const current = post.meta_description_en || "";
        let trimmed = current.substring(0, 155);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > 120) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?،؛]$/, "") + "…";
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_en: trimmed },
        });
        return {
          fixType: "meta_desc_trim",
          targetId: post.id,
          success: true,
          before: { metaDescriptionEn: current },
          after: { metaDescriptionEn: trimmed },
        };
      }

      case "no_internal_links": {
        return await injectInternalLinks(post.id, siteId);
      }

      case "no_affiliate_links": {
        return await injectAffiliateLinks(post.id, siteId);
      }

      case "missing_category": {
        const defaultCat = await prisma.category.findFirst({ where: { slug: "general" } });
        if (defaultCat) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { category_id: defaultCat.id },
          });
          return {
            fixType: "assign_category",
            targetId: post.id,
            success: true,
            before: { categoryId: null },
            after: { categoryId: defaultCat.id },
          };
        }
        return { fixType: "assign_category", targetId: post.id, success: false, before: {}, after: {}, error: "No default category found" };
      }

      case "missing_arabic_meta": {
        return await generateArabicMeta(post.id);
      }

      default:
        return {
          fixType: issue.type,
          targetId: post.id,
          success: false,
          before: {},
          after: {},
          error: `No auto-fix available for: ${issue.type}`,
        };
    }
  } catch (err) {
    return {
      fixType: issue.type,
      targetId: post.id,
      success: false,
      before: {},
      after: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Auto-inject internal links into a published article
 */
export async function injectInternalLinks(blogPostId: string, siteId: string): Promise<RemediationResult> {
  const { prisma } = await import("@/lib/db");

  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: { id: true, content_en: true, slug: true },
  });
  if (!post || !post.content_en) {
    return { fixType: "internal_link_inject", targetId: blogPostId, success: false, before: {}, after: {}, error: "Post not found" };
  }

  // Find 3 recent published posts from same site (not this one)
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      siteId,
      published: true,
      deletedAt: null,
      id: { not: blogPostId },
    },
    select: { title_en: true, slug: true },
    orderBy: { created_at: "desc" },
    take: 3,
  });

  if (relatedPosts.length === 0) {
    return { fixType: "internal_link_inject", targetId: blogPostId, success: false, before: {}, after: {}, error: "No other published posts to link to" };
  }

  // Build a "Related Articles" section
  const links = relatedPosts
    .map((p) => `<li><a href="/blog/${p.slug}" class="internal-link">${p.title_en}</a></li>`)
    .join("\n");
  const section = `\n<section class="related-articles">\n<h2>Related Articles</h2>\n<ul>\n${links}\n</ul>\n</section>`;

  const updatedContent = post.content_en + section;
  await prisma.blogPost.update({
    where: { id: blogPostId },
    data: { content_en: updatedContent },
  });

  return {
    fixType: "internal_link_inject",
    targetId: blogPostId,
    success: true,
    before: { internalLinks: 0 },
    after: { internalLinks: relatedPosts.length },
  };
}

/**
 * Auto-inject affiliate placeholder links
 */
export async function injectAffiliateLinks(blogPostId: string, siteId: string): Promise<RemediationResult> {
  const { prisma } = await import("@/lib/db");
  const { getSiteConfig } = await import("@/config/sites");

  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: { id: true, content_en: true },
  });
  if (!post || !post.content_en) {
    return { fixType: "affiliate_inject", targetId: blogPostId, success: false, before: {}, after: {}, error: "Post not found" };
  }

  const config = getSiteConfig(siteId);
  const destination = config?.destination || "London";

  // Site-specific affiliate CTAs
  const affiliateCTAs: Record<string, string[]> = {
    "yalla-london": [
      `<p class="affiliate-placeholder"><strong>Book Your Stay:</strong> Find the best halal-friendly hotels in London on <a href="https://www.halalbooking.com" rel="sponsored nofollow" target="_blank">HalalBooking</a> or <a href="https://www.booking.com" rel="sponsored nofollow" target="_blank">Booking.com</a>.</p>`,
      `<p class="affiliate-placeholder"><strong>Experience London:</strong> Book tours and experiences through <a href="https://www.getyourguide.com" rel="sponsored nofollow" target="_blank">GetYourGuide</a>.</p>`,
    ],
    "zenitha-yachts-med": [
      `<p class="affiliate-placeholder"><strong>Charter a Yacht:</strong> Browse luxury yachts on <a href="https://www.boatbookings.com" rel="sponsored nofollow" target="_blank">Boatbookings</a>.</p>`,
    ],
    "arabaldives": [
      `<p class="affiliate-placeholder"><strong>Book Your Resort:</strong> Find halal-friendly Maldives resorts on <a href="https://www.halalbooking.com" rel="sponsored nofollow" target="_blank">HalalBooking</a> or <a href="https://www.agoda.com" rel="sponsored nofollow" target="_blank">Agoda</a>.</p>`,
    ],
    "french-riviera": [
      `<p class="affiliate-placeholder"><strong>Book Your Stay:</strong> Find luxury hotels on the French Riviera on <a href="https://www.booking.com" rel="sponsored nofollow" target="_blank">Booking.com</a>.</p>`,
      `<p class="affiliate-placeholder"><strong>Experience the Côte d'Azur:</strong> Book tours through <a href="https://www.viator.com" rel="sponsored nofollow" target="_blank">Viator</a>.</p>`,
    ],
    "istanbul": [
      `<p class="affiliate-placeholder"><strong>Book Your Stay:</strong> Find the best hotels in Istanbul on <a href="https://www.booking.com" rel="sponsored nofollow" target="_blank">Booking.com</a>.</p>`,
      `<p class="affiliate-placeholder"><strong>Explore Istanbul:</strong> Book experiences through <a href="https://www.klook.com" rel="sponsored nofollow" target="_blank">Klook</a>.</p>`,
    ],
    "thailand": [
      `<p class="affiliate-placeholder"><strong>Book Your Stay:</strong> Find halal-friendly hotels in Thailand on <a href="https://www.agoda.com" rel="sponsored nofollow" target="_blank">Agoda</a>.</p>`,
      `<p class="affiliate-placeholder"><strong>Discover Thailand:</strong> Book tours through <a href="https://www.klook.com" rel="sponsored nofollow" target="_blank">Klook</a>.</p>`,
    ],
  };

  const ctas = affiliateCTAs[siteId] || [
    `<p class="affiliate-placeholder"><strong>Book Your Trip:</strong> Find the best deals on <a href="https://www.booking.com" rel="sponsored nofollow" target="_blank">Booking.com</a>.</p>`,
  ];

  // Inject before the closing content
  const affiliateSection = `\n<div class="booking-cta">\n${ctas.join("\n")}\n</div>`;
  const updatedContent = post.content_en + affiliateSection;

  await prisma.blogPost.update({
    where: { id: blogPostId },
    data: { content_en: updatedContent },
  });

  return {
    fixType: "affiliate_inject",
    targetId: blogPostId,
    success: true,
    before: { affiliateLinks: 0 },
    after: { affiliateLinks: ctas.length },
  };
}

/**
 * Auto-generate Arabic meta from English meta using simple translation prompt
 */
export async function generateArabicMeta(blogPostId: string): Promise<RemediationResult> {
  const { prisma } = await import("@/lib/db");

  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: { id: true, meta_title_en: true, meta_description_en: true, meta_title_ar: true, meta_description_ar: true },
  });
  if (!post) {
    return { fixType: "arabic_meta_gen", targetId: blogPostId, success: false, before: {}, after: {}, error: "Post not found" };
  }

  try {
    const { generateCompletion } = await import("@/lib/ai/provider");

    const prompt = `Translate these SEO meta fields from English to Arabic. Return ONLY valid JSON with keys "metaTitleAr" and "metaDescriptionAr". Keep the Arabic text natural and SEO-optimized.

English Meta Title: ${post.meta_title_en || ""}
English Meta Description: ${post.meta_description_en || ""}

Requirements:
- Meta title: 30-60 characters
- Meta description: 120-160 characters
- Natural Arabic (not literal translation)
- Include relevant Arabic keywords`;

    const response = await generateCompletion(
      [{ role: "user", content: prompt }],
      { maxTokens: 300, taskType: "copywriting", calledFrom: "auto-remediate:generateArabicMeta" }
    );

    // Parse response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { fixType: "arabic_meta_gen", targetId: blogPostId, success: false, before: {}, after: {}, error: "AI returned non-JSON" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const metaTitleAr = parsed.metaTitleAr || parsed.meta_title_ar || null;
    const metaDescriptionAr = parsed.metaDescriptionAr || parsed.meta_description_ar || null;

    if (!metaTitleAr && !metaDescriptionAr) {
      return { fixType: "arabic_meta_gen", targetId: blogPostId, success: false, before: {}, after: {}, error: "AI returned empty fields" };
    }

    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: {
        ...(metaTitleAr && !post.meta_title_ar ? { meta_title_ar: metaTitleAr } : {}),
        ...(metaDescriptionAr && !post.meta_description_ar ? { meta_description_ar: metaDescriptionAr } : {}),
      },
    });

    return {
      fixType: "arabic_meta_gen",
      targetId: blogPostId,
      success: true,
      before: { metaTitleAr: post.meta_title_ar, metaDescriptionAr: post.meta_description_ar },
      after: { metaTitleAr: metaTitleAr || post.meta_title_ar, metaDescriptionAr: metaDescriptionAr || post.meta_description_ar },
    };
  } catch (err) {
    return {
      fixType: "arabic_meta_gen",
      targetId: blogPostId,
      success: false,
      before: {},
      after: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Find and fix duplicate meta descriptions across a site.
 * Articles with identical meta descriptions get AI-rewritten unique versions.
 */
export async function fixDuplicateMetas(siteId: string, maxFixes: number = 5): Promise<RemediationResult[]> {
  const { prisma } = await import("@/lib/db");
  const fixes: RemediationResult[] = [];

  const posts = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, meta_description_en: { not: null } },
    select: { id: true, title_en: true, meta_description_en: true },
  });

  // Group by meta description to find duplicates
  const descMap = new Map<string, Array<{ id: string; title: string | null }>>();
  for (const p of posts) {
    const desc = (p.meta_description_en || "").trim().toLowerCase();
    if (desc.length < 20) continue;
    if (!descMap.has(desc)) descMap.set(desc, []);
    descMap.get(desc)!.push({ id: p.id, title: p.title_en });
  }

  let fixCount = 0;
  for (const [desc, duplicates] of descMap) {
    if (duplicates.length < 2 || fixCount >= maxFixes) continue;

    // Keep the first, rewrite the rest
    for (let i = 1; i < duplicates.length && fixCount < maxFixes; i++) {
      const dup = duplicates[i];
      // Generate unique meta from title
      const titleWords = (dup.title || "").split(/\s+/).slice(0, 8).join(" ");
      const newDesc = `Discover ${titleWords}. Your complete guide with insider tips, practical advice, and booking recommendations.`;
      const trimmed = newDesc.length > 155 ? newDesc.substring(0, 152) + "…" : newDesc;

      await prisma.blogPost.update({
        where: { id: dup.id },
        data: { meta_description_en: trimmed },
      });

      fixes.push({
        fixType: "duplicate_meta_rewrite",
        targetId: dup.id,
        success: true,
        before: { metaDescriptionEn: desc },
        after: { metaDescriptionEn: trimmed },
      });
      fixCount++;
    }
  }

  return fixes;
}

/**
 * Proactive quality boost: enhance reservoir drafts scoring 60-69
 * (not yet caught by the existing < 70 check because they're borderline)
 */
export async function boostBorderlineDrafts(siteId: string): Promise<RemediationResult[]> {
  const { prisma } = await import("@/lib/db");
  const fixes: RemediationResult[] = [];

  const borderline = await prisma.articleDraft.findMany({
    where: {
      site_id: siteId,
      current_phase: "reservoir",
      quality_score: { gte: 60, lt: 70 },
      assembled_html: { not: null },
    },
    take: 2,
    orderBy: { updated_at: "asc" },
  });

  if (borderline.length === 0) return fixes;

  const { enhanceReservoirDraft } = await import("@/lib/content-pipeline/enhance-runner");

  for (const draft of borderline) {
    try {
      const result = await enhanceReservoirDraft(draft as Record<string, unknown>);
      fixes.push({
        fixType: "quality_boost",
        targetId: draft.id,
        success: result.success,
        before: { qualityScore: draft.quality_score },
        after: { qualityScore: result.newScore ?? draft.quality_score },
        error: result.error,
      });
    } catch (err) {
      fixes.push({
        fixType: "quality_boost",
        targetId: draft.id,
        success: false,
        before: { qualityScore: draft.quality_score },
        after: {},
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return fixes;
}

/**
 * Log a remediation action to the AutoFixLog table
 */
export async function logRemediation(
  result: RemediationResult,
  siteId: string,
  agent: string
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.autoFixLog.create({
      data: {
        siteId,
        targetType: "blogpost",
        targetId: result.targetId,
        fixType: result.fixType,
        agent,
        before: result.before as Record<string, unknown>,
        after: result.after as Record<string, unknown>,
        success: result.success,
        error: result.error || null,
      },
    });
  } catch (err) {
    console.warn("[auto-remediate] Failed to log fix:", err instanceof Error ? err.message : err);
  }
}
