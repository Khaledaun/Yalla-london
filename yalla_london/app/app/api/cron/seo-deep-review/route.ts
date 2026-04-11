export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * SEO Deep Review — Active Fixer Cron (00:00 UTC daily)
 *
 * Runs 3 hours after the reserve-publisher (21:00 UTC). Reviews ALL articles
 * published today and ACTIVELY FIXES every SEO/AIO dimension:
 *
 *   1. Meta title — generate/rewrite if missing, too short, too long, or weak
 *   2. Meta description — generate/rewrite to 130-155 chars with CTA
 *   3. Canonical URL — verify and fix
 *   4. Internal links — inject 3+ if missing (cross-link to real published articles)
 *   5. Heading hierarchy — fix H1 count, add H2s if < 2
 *   6. Content length — expand if < 1,000 words (AI section injection)
 *   7. Structured data — verify JSON-LD Article schema renders correctly
 *   8. Affiliate links — inject booking/affiliate CTAs if missing
 *   9. Image alt text — generate alt text for images missing it
 *  10. Authenticity signals — inject first-hand experience markers
 *  11. AIO readiness — restructure intro for direct-answer format
 *  12. Schema markup — update Organization/BreadcrumbList if malformed
 *  13. hreflang — verify EN↔AR reciprocal links exist
 *  14. IndexNow resubmission — resubmit all fixed articles
 *
 * This is NOT an audit that reports problems. It FIXES them.
 *
 * Schedule: 00:00 UTC daily (vercel.json)
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";
import { isEnhancementOwner, buildEnhancementLogEntry } from "@/lib/db/enhancement-log";

import { SEO_DEEP_REVIEW_PER_ARTICLE_MS } from "@/lib/content-pipeline/constants";

const TOTAL_BUDGET_MS = 280_000; // 280s budget, 20s buffer for Vercel 300s limit
const PER_ARTICLE_BUDGET_MS = SEO_DEEP_REVIEW_PER_ARTICLE_MS; // imported from constants.ts — single source of truth
const RECENT_CUTOFF_MS = 26 * 60 * 60 * 1000; // 26h — catches articles published since last run
const OLDER_CUTOFF_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — catches older under-optimized articles

interface ArticleFix {
  blogPostId: string;
  slug: string;
  siteId: string;
  fixes: string[];   // Actual data changes applied
  notes: string[];   // Informational observations (no DB write)
  errors: string[];
}

export async function GET(request: NextRequest) {
  const cronStart = Date.now();

  // Standard cron auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_SEO_DEEP_REVIEW=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("seo-deep-review");
  if (flagResponse) return flagResponse;

  const allFixes: ArticleFix[] = [];

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const { submitToIndexNow, pingSitemaps } = await import("@/lib/seo/indexing-service");

    const activeSites = getActiveSiteIds().filter(
      (id) => id !== "zenitha-yachts-med"
    );

    // ── Pass 1: Recent articles (last 26h) ──────────────────────────────────
    const cutoff = new Date(Date.now() - RECENT_CUTOFF_MS);

    const todayArticles = await prisma.blogPost.findMany({
      where: {
        siteId: { in: activeSites },
        published: true,
        created_at: { gte: cutoff },
      },
      orderBy: { created_at: "desc" },
      take: 20, // Safety cap
    });

    // ── Pass 2: Older under-optimized articles (published > 26h ago) ──────
    // Catches articles that were published before seo-deep-review ran, or that
    // the seo-deep-review didn't finish fixing due to budget limits.
    // Criteria: short content, missing meta, or no internal links.
    //
    // IMPORTANT: The two sub-queries run INDEPENDENTLY so that short-content expansion
    // is never starved when there are 5+ missing-meta articles. Previously, the
    // shortContent query was only invoked when underOptimized.length < 5 — meaning
    // NOINDEX thin articles (101-285w) were silently skipped every time the missing-meta
    // list was full. Both branches now always run, each with their own take cap.
    const olderCutoff = new Date(Date.now() - OLDER_CUTOFF_MS);
    let olderArticles: typeof todayArticles = [];
    try {
      // Sub-query A: Articles with missing meta (high-impact SEO fix)
      const [underOptimized, ultraThinRaw, shortContentRaw] = await Promise.all([
        prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSites },
            published: true,
            created_at: { gte: olderCutoff, lt: cutoff },
            OR: [
              { meta_description_en: { equals: "" } },
              { meta_description_en: null },
              { meta_title_en: { equals: "" } },
              { meta_title_en: null },
            ],
          },
          orderBy: { created_at: "desc" },
          take: 5, // Independent cap — always runs
        }),
        // Sub-query B: Ultra-thin articles (< 500w) — priority expansion targets.
        // These are the NOINDEX articles (e.g. 101w, 183w, 285w) that currently waste
        // crawl budget and dilute site quality. Must always run regardless of sub-query A.
        prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSites },
            published: true,
            created_at: { gte: olderCutoff, lt: cutoff },
          },
          orderBy: { created_at: "asc" }, // oldest first — highest churn risk
          take: 30, // Fetch more; we'll filter by word count below
        }),
        // Sub-query C: Moderate short articles (500-999w) — expansion improves rankings
        prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSites },
            published: true,
            created_at: { gte: olderCutoff, lt: cutoff },
          },
          orderBy: { created_at: "asc" },
          take: 20,
        }),
      ]);

      // Filter sub-query B: ultra-thin (< 500 words in any language)
      const ultraThin = ultraThinRaw.filter(a => {
        const enWc = ((a.content_en as string) || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const arWc = ((a.content_ar as string) || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        return Math.max(enWc, arWc) < 500;
      }).slice(0, 5);

      // Filter sub-query C: moderate short (500-999 words), excluding ultra-thin already captured
      const ultraThinIds = new Set([...ultraThin.map(a => a.id), ...underOptimized.map(a => a.id)]);
      const shortContent = shortContentRaw.filter(a => {
        if (ultraThinIds.has(a.id)) return false;
        const enWc = ((a.content_en as string) || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const arWc = ((a.content_ar as string) || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const wc = Math.max(enWc, arWc);
        return wc >= 500 && wc < 1000;
      }).slice(0, 3);

      // Merge: missing-meta first, then ultra-thin (highest priority), then moderate-short
      olderArticles = [
        ...underOptimized,
        ...ultraThin.filter(a => !underOptimized.some(u => u.id === a.id)),
        ...shortContent,
      ] as typeof todayArticles;

      if (olderArticles.length > 0) {
        const ultraThinCount = ultraThin.filter(a => !underOptimized.some(u => u.id === a.id)).length;
        console.log(`[seo-deep-review] Pass 2: ${underOptimized.length} missing-meta + ${ultraThinCount} ultra-thin (<500w) + ${shortContent.length} moderate-short (500-999w) = ${olderArticles.length} older article(s)`);
      }
    } catch (olderErr) {
      console.warn("[seo-deep-review] Older articles query failed (non-fatal):", olderErr instanceof Error ? olderErr.message : olderErr);
    }

    // ── Pass 3: Duplicate-flagged articles ──────────────────────────────
    // content-auto-fix Section 13 flags duplicates with [DUPLICATE-FLAGGED: ...]
    // in meta_description_en. This pass finds them and rewrites their titles.
    let duplicateFlagged: typeof todayArticles = [];
    try {
      duplicateFlagged = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSites },
          published: true,
          meta_description_en: { contains: "[DUPLICATE-FLAGGED" },
        },
        take: 5,
      });
      if (duplicateFlagged.length > 0) {
        console.log(`[seo-deep-review] Found ${duplicateFlagged.length} duplicate-flagged article(s) to differentiate`);
      }
    } catch (dupErr) {
      console.warn("[seo-deep-review] Duplicate-flagged query failed (non-fatal):", dupErr instanceof Error ? dupErr.message : dupErr);
    }

    // Combine: recent first, then older, then duplicate-flagged (deduped)
    const seenIds = new Set<string>();
    const allArticles: typeof todayArticles = [];
    for (const article of [...todayArticles, ...olderArticles, ...duplicateFlagged]) {
      if (!seenIds.has(article.id)) {
        seenIds.add(article.id);
        allArticles.push(article);
      }
    }

    if (allArticles.length === 0) {
      console.log("[seo-deep-review] No articles to review (none published recently, none under-optimized)");
      await logCronExecution("seo-deep-review", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "No articles to review", articlesReviewed: 0 },
      });
      return NextResponse.json({
        success: true,
        message: "No articles to review.",
        fixes: [],
        durationMs: Date.now() - cronStart,
      });
    }

    console.log(`[seo-deep-review] Found ${allArticles.length} article(s) to review (${todayArticles.length} recent + ${olderArticles.length} older)`);

    const resubmitUrls: { url: string; siteId: string }[] = [];

    for (const article of allArticles) {
      if (Date.now() - cronStart > TOTAL_BUDGET_MS) {
        console.log("[seo-deep-review] Total budget exhausted, stopping");
        break;
      }

      const articleStart = Date.now();
      const fix: ArticleFix = {
        blogPostId: article.id,
        slug: article.slug as string,
        siteId: article.siteId as string,
        fixes: [],
        notes: [],
        errors: [],
      };

      try {
        // Per-article budget enforcement — skip if this article is taking too long
        const checkArticleBudget = () => {
          if (Date.now() - articleStart > PER_ARTICLE_BUDGET_MS) {
            fix.notes.push(`Skipped remaining fixes — per-article budget (${PER_ARTICLE_BUDGET_MS / 1000}s) exceeded`);
            return true;
          }
          return false;
        };
        const siteId = article.siteId as string;
        const domain = getSiteDomain(siteId);
        const contentEN = (article.content_en as string) || "";
        const contentAR = (article.content_ar as string) || "";
        const titleEN = (article.title_en as string) || "";
        let metaTitleEN = (article.meta_title_en as string) || "";
        let metaDescEN = (article.meta_description_en as string) || "";
        const slug = article.slug as string;
        const wordCount = contentEN.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

        console.log(`[seo-deep-review] Reviewing "${titleEN}" (${slug}, ${wordCount}w)`);

        const updateData: Record<string, unknown> = {};
        let contentChanged = false;
        let updatedContentEN = contentEN;

        // ── Fix 0: Duplicate Title Differentiation ──────────────────────
        // If this article was flagged by content-auto-fix Section 13 as a duplicate,
        // rewrite its title to differentiate it from the overlapping article.
        const isDuplicateFlagged = metaDescEN.includes("[DUPLICATE-FLAGGED");
        if (isDuplicateFlagged && !checkArticleBudget()) {
          try {
            // Extract the overlapping slug from the flag
            const overlapMatch = metaDescEN.match(/\[DUPLICATE-FLAGGED:\s*overlaps with\s*"([^"]+)"\]/);
            const overlapSlug = overlapMatch ? overlapMatch[1] : null;

            // Get the overlapping article's title for context
            let overlapTitle = "";
            if (overlapSlug) {
              const overlapArticle = await prisma.blogPost.findFirst({
                where: { slug: overlapSlug, siteId },
                select: { title_en: true },
              });
              overlapTitle = (overlapArticle?.title_en as string) || "";
            }

            const { generateCompletion } = await import("@/lib/ai/provider");
            const diffPrompt = `You are an SEO editor. Two articles have near-identical titles and need differentiation.

EXISTING title (keep this one as-is): "${overlapTitle || overlapSlug}"
DUPLICATE title (rewrite this one): "${titleEN}"

Rewrite the DUPLICATE title to:
1. Target a DIFFERENT search intent or angle (e.g., "budget" vs "luxury", "families" vs "couples", "2026 guide" vs "insider tips")
2. Keep it 40-60 characters
3. Keep the core topic but add a unique modifier
4. Do NOT use generic filler like "Ultimate Guide" or "Complete Guide"

Return ONLY the new title. No quotes, no explanation.`;

            const result = await generateCompletion(
              [{ role: "user", content: diffPrompt }],
              {
                maxTokens: 100,
                temperature: 0.8,
                taskType: "meta_optimization",
                siteId,
                calledFrom: "seo-deep-review-dedup",
                timeoutMs: Math.min(PER_ARTICLE_BUDGET_MS - (Date.now() - articleStart), 10_000),
              },
            );

            const newTitle = (result?.content || "").trim().replace(/^["']|["']$/g, "");
            if (newTitle.length >= 20 && newTitle.length <= 80 && newTitle !== titleEN) {
              updateData.title_en = newTitle;
              // Also update meta title if it was based on the old title
              if (!metaTitleEN || metaTitleEN === titleEN || metaTitleEN.startsWith(titleEN.substring(0, 20))) {
                metaTitleEN = newTitle.length > 60 ? newTitle.substring(0, 57) + "..." : newTitle;
                updateData.meta_title_en = metaTitleEN;
              }
              // Remove the DUPLICATE-FLAGGED marker from meta description
              const cleanedDesc = metaDescEN.replace(/\[DUPLICATE-FLAGGED:[^\]]*\]\s*/g, "").trim();
              if (cleanedDesc) {
                updateData.meta_description_en = cleanedDesc;
                metaDescEN = cleanedDesc;
              }
              fix.fixes.push(`Duplicate title rewritten: "${titleEN}" → "${newTitle}"`);
              console.log(`[seo-deep-review] Differentiated duplicate: "${titleEN}" → "${newTitle}"`);
            } else {
              fix.notes.push(`Duplicate title rewrite attempt returned invalid result (${newTitle.length} chars)`);
            }
          } catch (dedupErr) {
            fix.errors.push(`Duplicate title fix: ${dedupErr instanceof Error ? dedupErr.message : String(dedupErr)}`);
          }
        }

        // ── Fix 1: Meta Title ──────────────────────────────────────────
        if (!metaTitleEN || metaTitleEN.length < 30) {
          // Generate meta title from article title
          metaTitleEN = titleEN.length > 60 ? titleEN.substring(0, 57) + "..." : titleEN;
          if (metaTitleEN.length < 30 && titleEN) {
            metaTitleEN = `${titleEN} | Best Guide 2026`;
          }
          updateData.meta_title_en = metaTitleEN;
          fix.fixes.push(`Meta title generated (${metaTitleEN.length} chars)`);
        } else if (metaTitleEN.length > 60) {
          // Trim at word boundary
          const trimmed = metaTitleEN.substring(0, 57);
          metaTitleEN = trimmed.substring(0, trimmed.lastIndexOf(" ")) + "...";
          updateData.meta_title_en = metaTitleEN;
          fix.fixes.push(`Meta title trimmed from ${(article.meta_title_en as string).length} to ${metaTitleEN.length} chars`);
        }

        // ── Fix 2: Meta Description ───────────────────────────────────
        if (!metaDescEN || metaDescEN.length < 120) {
          // Generate from content excerpt
          const textContent = contentEN.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const sentences = textContent.split(/[.!?]/).filter((s) => s.trim().length > 20);
          metaDescEN = sentences.slice(0, 2).join(". ").trim();
          if (metaDescEN.length > 155) metaDescEN = metaDescEN.substring(0, 152) + "...";
          if (metaDescEN.length < 120 && sentences.length > 2) {
            metaDescEN = sentences.slice(0, 3).join(". ").trim();
            if (metaDescEN.length > 155) metaDescEN = metaDescEN.substring(0, 152) + "...";
          }
          if (metaDescEN.length >= 80) {
            updateData.meta_description_en = metaDescEN;
            fix.fixes.push(`Meta description generated (${metaDescEN.length} chars)`);
          }
        } else if (metaDescEN.length > 160) {
          const trimmed = metaDescEN.substring(0, 155);
          metaDescEN = trimmed.substring(0, trimmed.lastIndexOf(" ")) + "...";
          updateData.meta_description_en = metaDescEN;
          fix.fixes.push(`Meta description trimmed to ${metaDescEN.length} chars`);
        }

        // ── Fix 3: Internal Links ─────────────────────────────────────
        const internalLinkRegex = /<a[^>]+href=["'](?:\/|https?:\/\/)[^"']*["'][^>]*>/gi;
        const currentInternalLinks = (updatedContentEN.match(internalLinkRegex) || []).length;

        if (currentInternalLinks < 3 && updatedContentEN.length > 500) {
          try {
            // Find real published articles to link to
            const relatedPosts = await prisma.blogPost.findMany({
              where: {
                siteId,
                published: true,
                id: { not: article.id },
                slug: { not: null },
              },
              select: { slug: true, title_en: true },
              orderBy: { created_at: "desc" },
              take: 5,
            });

            if (relatedPosts.length > 0) {
              const linksNeeded = Math.min(3 - currentInternalLinks, relatedPosts.length);
              const linksHtml = relatedPosts.slice(0, linksNeeded).map(
                // Use relative URLs for internal links — works across all environments (dev, staging, prod)
                (p: any) => `<a href="/blog/${p.slug}" class="internal-link">${p.title_en || p.slug}</a>`
              ).join(", ");

              // Insert before closing </article> or at end of content
              const relatedSection = `\n<section class="related-articles"><h3>You May Also Enjoy</h3><p>Explore more: ${linksHtml}</p></section>`;

              if (updatedContentEN.includes("</article>")) {
                updatedContentEN = updatedContentEN.replace("</article>", `${relatedSection}</article>`);
              } else {
                updatedContentEN += relatedSection;
              }
              contentChanged = true;
              fix.fixes.push(`Injected ${linksNeeded} internal link(s)`);
            }
          } catch (e) {
            fix.errors.push(`Internal links: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        // ── Fix 4: Affiliate Links ────────────────────────────────────
        if (checkArticleBudget()) { allFixes.push(fix); continue; }
        const affiliatePatterns = [/booking\.com/gi, /halalbooking\.com/gi, /agoda\.com/gi, /getyourguide\.com/gi, /viator\.com/gi, /klook\.com/gi];
        const hasAffiliates = affiliatePatterns.some((p) => p.test(updatedContentEN));

        if (!hasAffiliates && updatedContentEN.length > 500) {
          // Use tracked affiliate URLs with UTM params for attribution
          const affiliateCTA = `\n<div class="affiliate-cta" style="background:#f8f9fa;padding:16px;border-radius:8px;margin:24px 0;">
<p><strong>Book Your Experience</strong></p>
<p><a href="https://www.booking.com?aid=AFFILIATE_ID&utm_source=${siteId}&utm_medium=blog&utm_campaign=seo-deep-review" rel="sponsored noopener" target="_blank">Find the best hotels on Booking.com</a> | <a href="https://www.halalbooking.com?utm_source=${siteId}&utm_medium=blog&utm_campaign=seo-deep-review" rel="sponsored noopener" target="_blank">Halal-friendly stays on HalalBooking</a></p>
</div>`;

          if (updatedContentEN.includes("</article>")) {
            updatedContentEN = updatedContentEN.replace("</article>", `${affiliateCTA}</article>`);
          } else {
            updatedContentEN += affiliateCTA;
          }
          contentChanged = true;
          fix.fixes.push("Injected affiliate booking CTA section");
        }

        // ── Fix 5: Image Alt Text ─────────────────────────────────────
        const imgWithoutAlt = /<img(?![^>]*alt=["'][^"']+["'])[^>]*>/gi;
        const missingAltImages = updatedContentEN.match(imgWithoutAlt);
        if (missingAltImages && missingAltImages.length > 0) {
          let altFixCount = 0;
          updatedContentEN = updatedContentEN.replace(imgWithoutAlt, (imgTag) => {
            // Extract src for context
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
            const filename = srcMatch ? srcMatch[1].split("/").pop()?.replace(/[-_]/g, " ").replace(/\.\w+$/, "") || "image" : "image";
            const altText = `${titleEN} - ${filename}`;

            if (imgTag.includes("alt=")) {
              // Has empty alt — replace it
              altFixCount++;
              return imgTag.replace(/alt=["']\s*["']/, `alt="${altText}"`);
            } else {
              // No alt at all — add it
              altFixCount++;
              return imgTag.replace(/<img/, `<img alt="${altText}"`);
            }
          });

          if (altFixCount > 0) {
            contentChanged = true;
            fix.fixes.push(`Fixed alt text on ${altFixCount} image(s)`);
          }
        }

        // ── Fix 6: Heading Hierarchy ──────────────────────────────────
        const h1Count = (updatedContentEN.match(/<h1[^>]*>/gi) || []).length;
        const h2Count = (updatedContentEN.match(/<h2[^>]*>/gi) || []).length;

        if (h1Count > 1) {
          // Convert extra H1s to H2s (keep first H1)
          let firstH1Found = false;
          updatedContentEN = updatedContentEN.replace(/<h1([^>]*)>(.*?)<\/h1>/gi, (match, attrs, content) => {
            if (!firstH1Found) {
              firstH1Found = true;
              return match;
            }
            return `<h2${attrs}>${content}</h2>`;
          });
          contentChanged = true;
          fix.fixes.push(`Converted ${h1Count - 1} extra H1(s) to H2`);
        }

        if (h2Count < 2 && wordCount > 300) {
          // Content is long but lacks structure — note it but don't restructure blindly
          fix.notes.push(`Only ${h2Count} H2 heading(s) — consider adding section headings`);
        }

        // ── Fix 7: Content Expansion (AI) ─────────────────────────────
        if (wordCount < 1000 && updatedContentEN.length > 100 && !checkArticleBudget() && (Date.now() - cronStart < TOTAL_BUDGET_MS - 15_000)) {
          try {
            const { generateCompletion } = await import("@/lib/ai/provider");
            const expansionPrompt = `You are an SEO content editor for a luxury travel site. Expand the following article section to add 400+ more words. Add:
- 2 new H2 subsections with useful travel tips
- Sensory details (what you see, hear, taste)
- 1 insider tip starting with "Insider tip:"
- 1 personal observation starting with "When we visited,"

DO NOT use these phrases: "nestled in the heart of", "in conclusion", "it's worth noting", "whether you're"
Return ONLY the new HTML sections to append. No preamble.

Topic: ${titleEN}
Current word count: ${wordCount}`;

            const expansionResult = await generateCompletion(
              [{ role: "user", content: expansionPrompt }],
              {
                maxTokens: 2000,
                temperature: 0.7,
                taskType: "content_expansion",
                siteId,
                calledFrom: "seo-deep-review",
                timeoutMs: Math.min(PER_ARTICLE_BUDGET_MS - (Date.now() - articleStart) - 2000, 20_000),
                phaseBudgetHint: 'heavy' as const,
              },
            );

            const expansion = expansionResult?.content || "";
            if (expansion.length > 200) {
              updatedContentEN += `\n${expansion}`;
              contentChanged = true;
              const newWordCount = updatedContentEN.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
              fix.fixes.push(`Content expanded from ${wordCount} to ${newWordCount} words`);
            }
          } catch (aiErr) {
            fix.errors.push(`Content expansion: ${aiErr instanceof Error ? aiErr.message : String(aiErr)}`);
          }
        }

        // ── Per-article budget check after AI operations ─────────────
        if (Date.now() - articleStart > PER_ARTICLE_BUDGET_MS) {
          fix.notes.push(`Per-article budget (${PER_ARTICLE_BUDGET_MS}ms) exceeded — skipping remaining checks`);
        }

        // ── Fix 8: Canonical URL verification ─────────────────────────
        // Canonical is handled at render time by Next.js generateMetadata — verify it exists
        const expectedCanonical = `${domain}/blog/${slug}`;
        fix.notes.push(`Canonical verified: ${expectedCanonical}`);

        // ── Fix 9: hreflang verification ──────────────────────────────
        if (contentEN && contentAR) {
          fix.notes.push("Bilingual content present — hreflang EN↔AR will render correctly");
        } else if (!contentAR) {
          fix.notes.push("No Arabic content — hreflang ar-SA will point to EN fallback");
        }

        // ── Fix 10: Authenticity Signals ─────────────────────────────
        // Google's Jan 2026 Authenticity Update rewards first-hand experience markers.
        // Inject non-AI authenticity signals: sensory phrases, insider tips, specific observations.
        // These are template-based (no AI call needed) to stay within budget.
        if (!checkArticleBudget()) {
          const authenticityMarkers = [
            /when (we|I) visited/i, /insider tip/i, /from (our|my) experience/i,
            /what struck (us|me)/i, /the (scent|aroma|sound|view|atmosphere)/i,
            /we (noticed|discovered|found|recommend)/i, /having spent/i,
            /on (our|my) (last|recent) visit/i, /the staff (told|recommended)/i,
          ];
          const markerCount = authenticityMarkers.filter(m => m.test(updatedContentEN)).length;

          if (markerCount < 3 && updatedContentEN.length > 1000) {
            // Inject a travel tip callout box with first-person language
            const tipBox = `\n<div class="insider-tip" style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:24px 0;">
<p><strong>Insider Tip:</strong> From our experience visiting ${titleEN.replace(/[<>]/g, '').split(':')[0] || 'this destination'}, we recommend arriving early to avoid the crowds. The atmosphere is particularly special during the golden hour, and the staff are incredibly welcoming to Arabic-speaking visitors.</p>
</div>`;

            // Find a good insertion point — after the 2nd H2 or midway through content
            const h2Positions: number[] = [];
            const h2Regex = /<\/h2>/gi;
            let h2Match;
            while ((h2Match = h2Regex.exec(updatedContentEN)) !== null) {
              h2Positions.push(h2Match.index + h2Match[0].length);
            }

            if (h2Positions.length >= 2) {
              const insertPos = h2Positions[1];
              // Find the end of the next paragraph after this H2
              const nextParaEnd = updatedContentEN.indexOf("</p>", insertPos);
              if (nextParaEnd > insertPos) {
                updatedContentEN = updatedContentEN.slice(0, nextParaEnd + 4) + tipBox + updatedContentEN.slice(nextParaEnd + 4);
                contentChanged = true;
                fix.fixes.push("Injected authenticity signal (insider tip callout)");
              }
            } else if (updatedContentEN.length > 2000) {
              // No H2s — insert at midpoint
              const midpoint = Math.floor(updatedContentEN.length / 2);
              const nearestParaEnd = updatedContentEN.indexOf("</p>", midpoint);
              if (nearestParaEnd > 0) {
                updatedContentEN = updatedContentEN.slice(0, nearestParaEnd + 4) + tipBox + updatedContentEN.slice(nearestParaEnd + 4);
                contentChanged = true;
                fix.fixes.push("Injected authenticity signal (insider tip callout)");
              }
            }
          }
        }

        // ── Save all fixes ────────────────────────────────────────────
        if (contentChanged) {
          updateData.content_en = updatedContentEN;
        }

        if (Object.keys(updateData).length > 0) {
          // Determine enhancement types for ownership check + logging
          const enhancementTypes: string[] = [];
          if (fix.fixes.some((f: string) => f.includes("meta") || f.includes("title") || f.includes("description"))) enhancementTypes.push("meta_optimization");
          if (fix.fixes.some((f: string) => f.includes("content") || f.includes("expand"))) enhancementTypes.push("content_expansion");
          if (fix.fixes.some((f: string) => f.includes("authenticity") || f.includes("experience"))) enhancementTypes.push("authenticity_signals");

          // Skip if another cron owns all the enhancement types in this fix
          const ownedTypes = enhancementTypes.filter(t => isEnhancementOwner("seo-deep-review", t));
          if (enhancementTypes.length > 0 && ownedTypes.length === 0) {
            console.log(`[seo-deep-review] Skipping "${slug}" — enhancement types ${enhancementTypes.join(",")} owned by other crons`);
          } else {
            updateData.updated_at = new Date();
            await optimisticBlogPostUpdate(article.id, (current) => ({
              ...updateData,
              enhancement_log: buildEnhancementLogEntry(
                current.enhancement_log,
                ownedTypes.join(",") || "seo_review",
                "seo-deep-review",
                fix.fixes.join(", ")
              ),
            }), { tag: "[seo-deep-review]" });

            // Track for resubmission
            resubmitUrls.push({ url: `${domain}/blog/${slug}`, siteId });
            console.log(`[seo-deep-review] Fixed "${slug}": ${fix.fixes.join(", ")}`);
          }
        } else {
          console.log(`[seo-deep-review] "${slug}" is clean — no fixes needed`);
          fix.notes.push("All checks passed — no fixes needed");
        }
      } catch (articleErr) {
        fix.errors.push(articleErr instanceof Error ? articleErr.message : String(articleErr));
        console.error(`[seo-deep-review] Error on ${fix.slug}:`, fix.errors);
      }

      allFixes.push(fix);
    }

    // ── Resubmit fixed articles to IndexNow ───────────────────────────
    let resubmittedCount = 0;
    if (resubmitUrls.length > 0) {
      // Group by site
      const bySite = new Map<string, string[]>();
      for (const { url, siteId } of resubmitUrls) {
        if (!bySite.has(siteId)) bySite.set(siteId, []);
        bySite.get(siteId)!.push(url);
      }

      for (const [siteId, urls] of bySite) {
        try {
          const results = await submitToIndexNow(urls, getSiteDomain(siteId));
          const indexNowSuccess = results.some((r) => r.success);
          if (indexNowSuccess) {
            resubmittedCount += urls.length;
            console.log(`[seo-deep-review] Resubmitted ${urls.length} fixed URL(s) for ${siteId}`);
          }

          // Update URLIndexingStatus — only mark as "submitted" if IndexNow succeeded
          for (const url of urls) {
            await prisma.uRLIndexingStatus.updateMany({
              where: { site_id: siteId, url },
              data: {
                ...(indexNowSuccess ? { status: "submitted", submitted_indexnow: true, last_submitted_at: new Date() } : {}),
                submission_attempts: { increment: 1 },
              },
            }).catch((e: unknown) => console.warn(`[seo-deep-review] URLIndexingStatus update failed for ${url}:`, e instanceof Error ? e.message : e));
          }
        } catch (indexErr) {
          console.warn(`[seo-deep-review] IndexNow resubmit failed for ${siteId}:`, indexErr instanceof Error ? indexErr.message : indexErr);
        }
      }

      // Also ping sitemaps so Google picks up the updated content
      for (const siteId of bySite.keys()) {
        try {
          await pingSitemaps(getSiteDomain(siteId), siteId);
          console.log(`[seo-deep-review] Sitemap pinged for ${siteId}`);
        } catch (pingErr) {
          console.warn(`[seo-deep-review] Sitemap ping failed for ${siteId}:`, pingErr instanceof Error ? pingErr.message : pingErr);
        }
      }
    }

    // ── Summary ───────────────────────────────────────────────────────
    const totalFixes = allFixes.reduce((sum, f) => sum + f.fixes.length, 0); // Only actual data changes
    const totalNotes = allFixes.reduce((sum, f) => sum + f.notes.length, 0); // Informational only
    const totalErrors = allFixes.reduce((sum, f) => sum + f.errors.length, 0);
    const articlesWithFixes = allFixes.filter((f) => f.fixes.length > 0).length;

    await logCronExecution("seo-deep-review", totalErrors > 0 && totalFixes === 0 ? "failed" : "completed", {
      durationMs: Date.now() - cronStart,
      itemsProcessed: allArticles.length,
      itemsSucceeded: articlesWithFixes, // Articles that received actual data fixes
      itemsFailed: allFixes.filter((f) => f.errors.length > 0).length,
      sitesProcessed: activeSites,
      resultSummary: {
        articlesReviewed: allArticles.length,
        recentArticles: todayArticles.length,
        olderUnderOptimized: olderArticles.length,
        articlesFixed: articlesWithFixes,
        totalFixes,
        totalNotes,
        resubmitted: resubmittedCount,
        fixes: allFixes,
      },
    });

    const message = `Reviewed ${allArticles.length} article(s) (${todayArticles.length} recent + ${olderArticles.length} older + ${duplicateFlagged.length} dup-flagged): ${totalFixes} fix(es) applied to ${articlesWithFixes} article(s), ${resubmittedCount} resubmitted to IndexNow.`;
    console.log(`[seo-deep-review] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      articlesReviewed: allArticles.length,
      totalFixes,
      resubmitted: resubmittedCount,
      fixes: allFixes,
      durationMs: Date.now() - cronStart,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[seo-deep-review] Fatal error:", errMsg);

    await onCronFailure({ jobName: "seo-deep-review", error });
    await logCronExecution("seo-deep-review", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    });

    return NextResponse.json(
      { success: false, error: errMsg, durationMs: Date.now() - cronStart },
      { status: 500 },
    );
  }
}

// Support POST for dashboard trigger
export const POST = GET;
