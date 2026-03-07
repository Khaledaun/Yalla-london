/**
 * Content Selector — Core Logic (extracted from cron route)
 *
 * Callable directly without HTTP. Used by:
 * - /api/cron/content-selector (cron route)
 * - /api/admin/content-generation-monitor (dashboard trigger)
 *
 * Selects highest-quality articles from the ArticleDraft reservoir
 * and promotes them to published BlogPosts.
 */

import { logCronExecution } from "@/lib/cron-logger";
import { onPromotionFailure } from "@/lib/ops/failure-hooks";
import { runPrePublicationGate } from "@/lib/seo/orchestrator/pre-publication-gate";
import { enhanceReservoirDraft } from "@/lib/content-pipeline/enhance-runner";
import { sanitizeTitle, sanitizeMetaDescription } from "@/lib/content-pipeline/title-sanitizer";

const DEFAULT_TIMEOUT_MS = 53_000;
const MAX_ARTICLES_PER_RUN = 2;

export interface SelectRunnerResult {
  success: boolean;
  message?: string;
  reservoirCandidates?: number;
  selected?: number;
  published?: number;
  articles?: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }>;
  minQualityScore?: number;
  candidateCount?: number;
  durationMs: number;
}

export async function runContentSelector(
  options: { timeoutMs?: number } = {},
): Promise<SelectRunnerResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");
    // Import quality gate threshold from centralized SEO standards — single source of truth.
    // When standards.ts is updated (e.g., after algorithm changes), this threshold updates automatically.
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    // Use reservoirMinScore (60) to fetch — NOT qualityGateScore (70).
    // The pre-pub gate hard-blocks at seo_score < 50, so articles scoring 60–69 will
    // pass the gate (with warnings) and get published. Using 70 as the DB filter would
    // permanently freeze articles that entered the reservoir under the old threshold.
    const MIN_QUALITY_SCORE = CONTENT_QUALITY.reservoirMinScore;

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      return { success: true, message: "No active sites", durationMs: Date.now() - cronStart };
    }

    // Find reservoir articles with sufficient quality.
    // Articles with 3+ failed enhancement attempts are still included — they may
    // pass the pre-pub gate as-is and should be published rather than zombified.
    const MAX_ENHANCEMENT_ATTEMPTS = 3;
    let candidates: Array<Record<string, unknown>> = [];
    try {
      candidates = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: "reservoir",
          quality_score: { gte: MIN_QUALITY_SCORE },
        },
        orderBy: [
          { quality_score: "desc" },
          { created_at: "asc" },
        ],
        take: MAX_ARTICLES_PER_RUN * 3,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return {
          success: false,
          message: "ArticleDraft table not found. Use Fix Database button.",
          durationMs: Date.now() - cronStart,
        };
      }
      throw e;
    }

    if (candidates.length === 0) {
      // Log WHY no candidates were found — this helps diagnose reservoir stalls
      let totalReservoir = 0;
      let frozenCount = 0;
      let lowScoreCount = 0;
      try {
        [totalReservoir, frozenCount, lowScoreCount] = await Promise.all([
          prisma.articleDraft.count({ where: { current_phase: "reservoir", site_id: { in: activeSites } } }),
          prisma.articleDraft.count({ where: { current_phase: "reservoir", site_id: { in: activeSites }, phase_attempts: { gte: MAX_ENHANCEMENT_ATTEMPTS } } }),
          prisma.articleDraft.count({ where: { current_phase: "reservoir", site_id: { in: activeSites }, quality_score: { lt: MIN_QUALITY_SCORE } } }),
        ]);
      } catch { /* non-fatal */ }

      const reason = totalReservoir === 0
        ? "Reservoir is empty — no articles have reached the reservoir phase"
        : frozenCount > 0
        ? `${totalReservoir} reservoir articles, but ${frozenCount} have exhausted enhancement (3+ attempts) and ${lowScoreCount} below quality threshold (${MIN_QUALITY_SCORE}). Exhausted articles will attempt direct publish if they meet minimum quality.`
        : `${totalReservoir} reservoir articles, but all are below quality threshold (${MIN_QUALITY_SCORE}) or have other issues`;

      console.log(`[content-selector] No publishable candidates: ${reason}`);

      await logCronExecution("content-selector", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: reason, candidateCount: 0, totalReservoir, frozenCount, lowScoreCount },
      });
      return {
        success: true,
        message: reason,
        minQualityScore: MIN_QUALITY_SCORE,
        candidateCount: 0,
        durationMs: Date.now() - cronStart,
      };
    }

    // ── Topical Clustering: prefer publishing articles in the same category ──
    // Google rewards topical authority — 5-6 interlinked articles on the same topic
    // rank better than scattered coverage. (Gemini audit action #3)
    //
    // Strategy: Find the "active cluster" (dominant category in last 5 published articles),
    // then sort candidates so same-category articles are published first.
    // After 6+ articles in one cluster, reset to allow a new topic.
    const CLUSTER_SIZE = 6;
    let activeClusterCategoryId: string | null = null;
    try {
      const recentPublished = await prisma.blogPost.findMany({
        where: { published: true, deletedAt: null, siteId: { in: activeSites } },
        orderBy: { created_at: "desc" },
        select: { category_id: true },
        take: CLUSTER_SIZE,
      });

      if (recentPublished.length > 0) {
        // Find the most frequent category_id in last N published articles
        const categoryFreq: Record<string, number> = {};
        for (const post of recentPublished) {
          categoryFreq[post.category_id] = (categoryFreq[post.category_id] || 0) + 1;
        }
        const sorted = Object.entries(categoryFreq).sort((a, b) => b[1] - a[1]);
        const [topCat, topCount] = sorted[0];

        // Only keep the cluster if fewer than CLUSTER_SIZE articles — otherwise reset
        if (topCount < CLUSTER_SIZE) {
          activeClusterCategoryId = topCat;
          console.log(`[content-selector] Active cluster: category ${topCat} (${topCount}/${CLUSTER_SIZE} articles)`);
        } else {
          console.log(`[content-selector] Cluster complete (${topCount} articles in ${topCat}) — allowing any category`);
        }
      }
    } catch (clusterErr) {
      console.warn("[content-selector] Cluster detection failed (non-fatal):", clusterErr instanceof Error ? clusterErr.message : clusterErr);
    }

    // Sort candidates: same category as active cluster first, then by quality score
    if (activeClusterCategoryId) {
      candidates.sort((a, b) => {
        const aCat = (a as Record<string, unknown>).category_id === activeClusterCategoryId ? 0 : 1;
        const bCat = (b as Record<string, unknown>).category_id === activeClusterCategoryId ? 0 : 1;
        if (aCat !== bCat) return aCat - bCat; // same-cluster first
        return ((b as Record<string, unknown>).quality_score as number || 0) - ((a as Record<string, unknown>).quality_score as number || 0);
      });
    }

    // Separate candidates into publish-ready and needs-enhancement.
    //
    // An article needs enhancement if EITHER:
    //   A. Quality score < 70 (quality gate threshold), OR
    //   B. Word count < 1,000 (pre-pub gate hard block — even a 90-score article
    //      gets blocked at publication time if it has fewer than 1,000 words, since
    //      the quality scorer and pre-pub gate use DIFFERENT word count rules)
    //
    // Enhancement: Grok researches fresh angles, expands to 2,000+ words, adds
    // experience signals, headings, internal links, affiliate placeholders, and
    // rewrites the meta description. Re-scored after enhancement.
    const PUBLISH_THRESHOLD = CONTENT_QUALITY.qualityGateScore; // 70
    const MIN_WORD_COUNT = CONTENT_QUALITY.minWords || 1000; // pre-pub gate hard block
    const publishReady: Array<Record<string, unknown>> = [];
    const needsEnhancement: Array<Record<string, unknown>> = [];

    for (const candidate of candidates) {
      try {
        const score = (candidate.quality_score as number) || 0;
        const html = (candidate.assembled_html as string) || "";
        const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const wouldFailWordCount = wordCount < MIN_WORD_COUNT;
        const attempts = (candidate.phase_attempts as number) || 0;
        const exhaustedEnhancement = attempts >= MAX_ENHANCEMENT_ATTEMPTS;

        if (score >= PUBLISH_THRESHOLD && !wouldFailWordCount) {
          publishReady.push(candidate);
        } else if (exhaustedEnhancement && !wouldFailWordCount && score >= MIN_QUALITY_SCORE) {
          // Enhancement failed 3+ times but article meets minimum quality and word count.
          // Let the pre-pub gate make the final call instead of leaving it zombified.
          console.log(`[content-selector] Draft ${candidate.id} ("${candidate.keyword}"): enhancement exhausted (${attempts} attempts, score ${score}) — attempting direct publish via pre-pub gate`);
          publishReady.push(candidate);
        } else if (!exhaustedEnhancement) {
          const reason = wouldFailWordCount
            ? `word count too low (${wordCount}/${MIN_WORD_COUNT})`
            : `score too low (${score}/${PUBLISH_THRESHOLD})`;
          console.log(`[content-selector] Draft ${candidate.id} ("${candidate.keyword}"): needs enhancement — ${reason}`);
          needsEnhancement.push(candidate);
        } else {
          // Exhausted enhancement AND fails word count or minimum score — truly stuck
          console.log(`[content-selector] Draft ${candidate.id} ("${candidate.keyword}"): exhausted enhancement and still below minimum (score ${score}, words ${wordCount}) — skipping`);
        }
      } catch (sortErr) {
        console.warn(`[content-selector] Error sorting draft ${candidate.id}: ${sortErr instanceof Error ? sortErr.message : sortErr}`);
        // Skip this draft, don't crash the entire run
      }
    }

    // ── PRIORITY: Promote publish-ready articles FIRST ──
    // Enhancement is expensive (30-45s AI call per article) and was consuming the
    // entire budget before any articles got promoted. Now: promote first, enhance
    // only if budget remains. This ensures publishReady articles actually publish.

    // Apply keyword diversity filter to publish-ready candidates first
    const selectedKeywords = new Set<string>();
    const selectedDraftIds = new Set<string>();
    const selected: Array<Record<string, unknown>> = [];

    for (const candidate of publishReady) {
      if (selected.length >= MAX_ARTICLES_PER_RUN) break;

      const candidateId = candidate.id as string;
      const pairedId = candidate.paired_draft_id as string | null;
      if (selectedDraftIds.has(candidateId)) continue;
      if (pairedId && selectedDraftIds.has(pairedId)) continue;

      const keyword = ((candidate.keyword as string) || "").toLowerCase().trim();
      if (!keyword) continue;

      const isDuplicate = Array.from(selectedKeywords).some(
        (k) => k.includes(keyword) || keyword.includes(k),
      );

      if (!isDuplicate) {
        selected.push(candidate);
        selectedKeywords.add(keyword);
        selectedDraftIds.add(candidateId);
        if (pairedId) selectedDraftIds.add(pairedId);
      }
    }

    if (selected.length === 0) {
      return {
        success: true,
        message: "All reservoir articles have keyword overlap. Skipping.",
        candidateCount: candidates.length,
        durationMs: Date.now() - cronStart,
      };
    }

    // Promote selected articles to BlogPost
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }> = [];

    for (const draft of selected) {
      const remainingMs = timeoutMs - (Date.now() - cronStart);
      if (remainingMs < 5000) {
        console.log("[content-selector] Budget running low, stopping promotion loop");
        break;
      }

      try {
        console.log(`[content-selector] Promoting draft ${draft.id} (keyword: "${draft.keyword}", score: ${draft.quality_score}, locale: ${draft.locale})`);
        const result = await promoteToBlogPost(draft, prisma, SITES, getSiteDomain);
        if (result) {
          published.push(result);
        }
      } catch (promoteErr) {
        const errType = promoteErr instanceof Error ? promoteErr.constructor.name : "Unknown";
        const errMsg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
        const errStack = promoteErr instanceof Error ? promoteErr.stack : "";
        console.error(
          `[content-selector] Failed to promote draft ${draft.id} (keyword: "${draft.keyword}") — ${errType}: ${errMsg}`,
        );
        if (errStack) console.error(`[content-selector] Promote stack:\n${errStack}`);
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Promotion failed: ${errMsg}`,
            phase_attempts: { increment: 1 },
          },
        }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));

        // Fire promotion failure hook for immediate recovery
        onPromotionFailure({
          draftId: draft.id as string,
          keyword: draft.keyword as string,
          error: errMsg,
          siteId: draft.site_id as string,
        }).catch(err => console.warn("[select-runner] onPromotionFailure hook failed:", err instanceof Error ? err.message : err));
      }
    }

    // ── Enhancement phase: only if budget remains after promoting publish-ready articles ──
    // Each enhancement costs 30-45s (Grok search + content expansion). Cap at 1 per run.
    let enhancedCount = 0;
    const enhancementQueue = needsEnhancement.slice(0, 1); // Max 1 per run

    for (const candidate of enhancementQueue) {
      const remainingMs = timeoutMs - (Date.now() - cronStart);
      if (remainingMs < 38_000) {
        console.log(`[content-selector] Budget < 38s (${Math.round(remainingMs / 1000)}s remaining) — skipping enhancement, will retry next run`);
        break;
      }
      try {
        console.log(`[content-selector] Enhancing draft ${candidate.id} (score: ${candidate.quality_score}, keyword: "${candidate.keyword}")`);
        const enhResult = await enhanceReservoirDraft(candidate);
        if (enhResult.success) {
          enhancedCount++;
          console.log(`[content-selector] Enhanced draft ${candidate.id}: score ${enhResult.previousScore}→${enhResult.newScore || "?"}`);
        }
        // Count this as an attempt regardless of outcome
        await prisma.articleDraft.update({
          where: { id: candidate.id as string },
          data: { phase_attempts: { increment: 1 }, updated_at: new Date() },
        }).catch(dbErr => console.warn("[content-selector] Failed to update attempt count:", dbErr instanceof Error ? dbErr.message : dbErr));
      } catch (enhErr) {
        const enhErrMsg = enhErr instanceof Error ? enhErr.message : String(enhErr);
        console.warn(`[content-selector] Enhancement failed for draft ${candidate.id}: ${enhErrMsg}`);
        const attemptNum = ((candidate.phase_attempts as number) || 0) + 1;
        await prisma.articleDraft.update({
          where: { id: candidate.id as string },
          data: {
            phase_attempts: { increment: 1 },
            last_error: `Enhancement attempt ${attemptNum}/${MAX_ENHANCEMENT_ATTEMPTS} failed: ${enhErrMsg}`,
            updated_at: new Date(),
          },
        }).catch(dbErr => console.warn("[content-selector] Failed to update enhancement attempt:", dbErr instanceof Error ? dbErr.message : dbErr));
      }
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-selector", "completed", {
      durationMs,
      itemsProcessed: published.length,
      resultSummary: {
        reservoirCandidates: candidates.length,
        publishReady: publishReady.length,
        needsEnhancement: needsEnhancement.length,
        enhancedCount,
        selected: selected.length,
        published: published.length,
        articles: published,
      },
    });

    return {
      success: true,
      reservoirCandidates: candidates.length,
      selected: selected.length,
      published: published.length,
      articles: published,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    // Capture detailed error info to help diagnose SyntaxError and similar runtime crashes
    let errMsg: string;
    let errType = "Unknown";
    let errStack = "";
    if (error instanceof Error) {
      errMsg = error.message;
      errType = error.constructor.name; // e.g. "SyntaxError", "TypeError", "DOMException"
      errStack = error.stack || "";
    } else if (typeof error === "string") {
      errMsg = error;
    } else {
      try { errMsg = JSON.stringify(error); } catch { errMsg = String(error); }
    }
    // Log full error details including type and stack trace — essential for diagnosing
    // the "SyntaxError: The string did not match the expected pattern" crash
    console.error(`[content-selector] CRASH — Type: ${errType}, Message: ${errMsg}`);
    if (errStack) {
      console.error(`[content-selector] Stack trace:\n${errStack}`);
    }

    await logCronExecution("content-selector", "failed", {
      durationMs,
      errorMessage: `[${errType}] ${errMsg}`,
    }).catch(err => console.warn("[select-runner] Failed to log cron execution:", err instanceof Error ? err.message : err));

    return {
      success: false,
      message: `[${errType}] ${errMsg}`,
      durationMs,
    };
  }
}

// ─── Per-site affiliate rules ─────────────────────────────────────────────

function getAffiliateRules(siteId: string) {
  const SITE_AFFILIATES: Record<string, Array<{ kw: string[]; aff: { name: string; url: string; param: string } }>> = {
    'yalla-london': [
      { kw: ["hotel", "accommodation", "stay", "resort"], aff: { name: "Booking.com", url: "https://www.booking.com/city/gb/london.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal"], aff: { name: "TheFork", url: "https://www.thefork.co.uk/london", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "attraction"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/london-l57/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["ticket", "event", "match", "concert", "football"], aff: { name: "StubHub", url: "https://www.stubhub.co.uk", param: `?gcid=${process.env.STUBHUB_AFFILIATE_ID || ""}` } },
      { kw: ["shopping", "shop", "luxury", "Harrods"], aff: { name: "Harrods", url: "https://www.harrods.com", param: "?utm_source=yallalondon" } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/london", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'arabaldives': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["resort", "island", "overwater"], aff: { name: "Agoda", url: "https://www.agoda.com/maldives", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "snorkeling", "diving", "excursion"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/maldives-l97358/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "seaplane", "speedboat", "airport"], aff: { name: "Booking.com Taxi", url: "https://www.booking.com/taxi/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
    ],
    'french-riviera': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/region/fr/cote-d-azur.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal"], aff: { name: "TheFork", url: "https://www.thefork.fr/nice", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "yacht", "boat"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/nice-l176/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/nice", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'istanbul': [
      { kw: ["hotel", "accommodation", "stay", "resort"], aff: { name: "Booking.com", url: "https://www.booking.com/city/tr/istanbul.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal", "kebab"], aff: { name: "TheFork", url: "https://www.thefork.com/istanbul", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "bazaar", "mosque"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/istanbul-l56/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/istanbul", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'thailand': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/country/th.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["resort", "island", "beach"], aff: { name: "Agoda", url: "https://www.agoda.com/thailand", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "temple", "market"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/bangkok-l169/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/bangkok", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'zenitha-yachts-med': [
      { kw: ["yacht", "charter", "sailing", "boat", "catamaran", "gulet"], aff: { name: "Boatbookings", url: "https://www.boatbookings.com", param: `?ref=${process.env.BOATBOOKINGS_AFFILIATE_ID || ""}` } },
      { kw: ["yacht", "boat", "rental", "hire"], aff: { name: "Click&Boat", url: "https://www.clickandboat.com", param: `?aff=${process.env.CLICKANDBOAT_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "excursion", "marine", "snorkeling", "diving"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["hotel", "accommodation", "stay", "marina", "port"], aff: { name: "Booking.com", url: "https://www.booking.com", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
  };
  return SITE_AFFILIATES[siteId] || [];
}

// ─── Promote ArticleDraft → BlogPost ──────────────────────────────────────

export async function promoteToBlogPost(
  draft: Record<string, unknown>,
  prisma: any,
  SITES: Record<string, any>,
  getSiteDomain: (siteId: string) => string,
  options?: { skipGate?: boolean },
): Promise<{ draftId: string; blogPostId: string; keyword: string; score: number } | null> {
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = (draft.site_id as string) || getDefaultSiteId();
  const site = SITES[siteId];
  if (!site) {
    console.warn(`[content-selector] No site config for ${siteId}`);
    return null;
  }

  const locale = (draft.locale as string) || "en";
  const keyword = draft.keyword as string;

  // Look up paired draft for bilingual merging
  let pairedDraft: Record<string, unknown> | null = null;
  const pairedDraftId = draft.paired_draft_id as string | null;
  if (pairedDraftId) {
    try {
      pairedDraft = await prisma.articleDraft.findUnique({ where: { id: pairedDraftId } });
      if (pairedDraft && !(pairedDraft.assembled_html as string)) {
        console.log(`[content-selector] Paired draft ${pairedDraftId} has no assembled HTML yet — publishing single-language`);
        pairedDraft = null;
      }
    } catch (pairErr) {
      console.warn(`[select-runner] Failed to fetch paired draft ${pairedDraftId}:`, pairErr instanceof Error ? pairErr.message : pairErr);
      // Proceed with single language
    }
  }

  // Determine EN and AR content sources
  const enDraft = locale === "en" ? draft : pairedDraft;
  const arDraft = locale === "ar" ? draft : pairedDraft;

  // Demote any <h1> in body content to <h2> — the page template already provides the H1
  // via the article title. Multiple H1s cause SEO issues (detected by audit as "Multiple H1 tags").
  const stripH1 = (html: string) => html.replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
  let enHtml = stripH1((enDraft?.assembled_html as string) || "");
  const arHtml = stripH1((arDraft?.assembled_html as string) || "");

  // ── Internal link validation: replace broken /blog/ links with real published slugs ──
  // Assembly phase may generate: (a) /blog/TOPIC_SLUG placeholders, or (b) AI-hallucinated
  // slugs that look real but don't exist. Validate ALL /blog/ links against published articles.
  if (enHtml) {
    try {
      const recentPosts = await prisma.blogPost.findMany({
        where: { siteId, published: true, deletedAt: null },
        select: { slug: true, title_en: true, keywords_json: true },
        orderBy: { created_at: "desc" },
        take: 100,
      });
      const validSlugs = new Set(recentPosts.map(p => p.slug));

      // Replace ALL broken /blog/ links — both TOPIC_SLUG and hallucinated slugs
      enHtml = enHtml.replace(
        /<a\s+([^>]*?)href="\/blog\/([a-zA-Z0-9_-]+)"([^>]*?)>(.*?)<\/a>/gi,
        (fullMatch, pre, slug, post2, anchor) => {
          // If slug is valid, keep as-is
          if (validSlugs.has(slug)) return fullMatch;
          // Try topic-based matching
          const topic = slug.toLowerCase().replace(/[-_]/g, " ");
          const topicWords = topic.split(" ").filter((w: string) => w.length > 3);
          const match = recentPosts.find(p => {
            const title = (p.title_en || "").toLowerCase();
            return topicWords.length >= 2 && topicWords.filter((w: string) => title.includes(w)).length >= 2;
          });
          if (match) return `<a ${pre}href="/blog/${match.slug}"${post2}>${anchor}</a>`;
          // No match — unwrap the link, keep the anchor text as plain text
          return anchor;
        }
      );
    } catch (linkErr) {
      console.warn("[content-selector] Internal link validation failed (non-fatal):", linkErr instanceof Error ? linkErr.message : linkErr);
    }
  }
  const enTitle = (enDraft?.topic_title as string) || keyword;
  const arTitle = (arDraft?.topic_title as string) || "";
  const enSeoMeta = ((enDraft?.seo_meta || {}) as Record<string, unknown>);
  const arSeoMeta = ((arDraft?.seo_meta || {}) as Record<string, unknown>);
  const outline = (draft.outline_data || {}) as Record<string, unknown>;

  if (!enHtml && !arHtml) {
    console.warn(`[content-selector] Draft ${draft.id} and its pair have no assembled HTML — skipping`);
    return null;
  }

  // Empty content guard — prevent publishing articles with insufficient English content
  if (enHtml && enHtml.trim().length < 500) {
    console.warn(`[content-selector] Skipping draft ${draft.id} — content_en too short (${enHtml.trim().length} chars)`);
    await prisma.articleDraft.update({
      where: { id: draft.id as string },
      data: { last_error: "Empty content_en — skipped promotion" },
    }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
    return null;
  }

  const hasEn = !!enHtml;
  const hasAr = !!arHtml;
  const isBilingual = hasEn && hasAr;

  // Generate slug
  const primarySeoMeta = enSeoMeta.slug ? enSeoMeta : arSeoMeta;
  let slug = (primarySeoMeta.slug as string) || "";
  if (!slug) {
    slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
  }

  // Guard: never produce a slug with empty keyword (e.g. "-2026-02-14")
  if (!slug) {
    const title = enTitle || arTitle || "";
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
    if (!slug) {
      slug = `untitled-${siteId}-${Date.now().toString(36)}`;
      console.warn(`[content-selector] Empty keyword and title for draft ${draft.id} — using fallback slug: ${slug}`);
    }
  }

  // Check for slug collision GLOBALLY — BlogPost.slug is @unique across all sites.
  // If a collision is found, append a suffix with crypto randomness to avoid
  // TOCTOU race conditions where two concurrent promotions pick the same suffix.
  const existingSlug = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existingSlug) {
    // Use crypto random bytes for suffix to avoid race condition where two
    // concurrent promotions generate the same Date.now()-based suffix
    const randomBytes = await import("crypto").then(c => c.randomBytes(4).toString("hex"));
    slug = `${slug}-${randomBytes}`;
    console.log(`[content-selector] Slug collision detected — using "${slug}" instead`);
  }

  // Check for duplicate title — keyword cannibalization prevention.
  // Uses normalized comparison: strips years, common filler words (guide, best, etc.),
  // and punctuation so "Best London Hotels 2026" matches "Top London Hotels Guide 2025".
  // This prevents near-duplicate articles that compete for the same SERP position.
  const normalizeForDedup = (t: string) => t.toLowerCase()
    .replace(/\b20\d{2}\b/g, '')
    .replace(/\b(comparison|guide|review|complete|ultimate|best|top)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const candidateTitle = (enTitle || "").trim();
  if (candidateTitle.length > 5) {
    try {
      const normalizedCandidate = normalizeForDedup(candidateTitle);
      // Fetch recent published titles for this site and compare normalized forms
      const recentTitles = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          deletedAt: null,
        },
        select: { id: true, slug: true, title_en: true },
        orderBy: { created_at: "desc" },
        take: 200,
      });
      const existingMatch = recentTitles.find(
        (p: { title_en: string }) => normalizeForDedup(p.title_en || "") === normalizedCandidate,
      );
      if (existingMatch) {
        console.warn(`[content-selector] SKIPPED draft ${draft.id}: normalized duplicate title "${candidateTitle}" ≈ "${existingMatch.title_en}" — already published as /blog/${existingMatch.slug}`);
        // Mark the draft so it doesn't keep being selected every run
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Normalized duplicate title: "${candidateTitle}" ≈ existing "/blog/${existingMatch.slug}"`,
            updated_at: new Date(),
          },
        }).catch(() => {});
        return null;
      }
    } catch (titleCheckErr) {
      console.warn("[content-selector] Title duplicate check failed (non-fatal):", titleCheckErr instanceof Error ? titleCheckErr.message : titleCheckErr);
    }
  }

  // ── Keyword cannibalization check ─────────────────────────────────────────
  // Beyond title dedup, check keyword-level overlap with published articles.
  // If the candidate targets >60% of the same keywords as an existing article,
  // they'll compete for the same SERP position — skip this draft.
  try {
    const { checkCannibalization } = await import("@/lib/seo/cannibalization-checker");
    const enKeywords = (enSeoMeta.keywords as string[]) || [];
    if (enKeywords.length > 0) {
      const cannibResult = await checkCannibalization(enKeywords, siteId, draft.id as string);
      if (cannibResult.cannibalizes && cannibResult.overlappingArticle) {
        const overlap = cannibResult.overlappingArticle;
        console.warn(`[content-selector] SKIPPED draft ${draft.id}: keyword cannibalization (${overlap.overlapScore}% overlap) with existing "/blog/${overlap.slug}" — shared: ${overlap.sharedKeywords.join(", ")}`);
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Keyword cannibalization: ${overlap.overlapScore}% overlap with "/blog/${overlap.slug}" (${overlap.sharedKeywords.slice(0, 5).join(", ")})`,
            updated_at: new Date(),
          },
        }).catch(() => {});
        return null;
      }
    }
  } catch (cannibErr) {
    console.warn("[content-selector] Cannibalization check failed (non-fatal):", cannibErr instanceof Error ? cannibErr.message : cannibErr);
  }

  // ── Slug artifact rejection ──────────────────────────────────────────────
  // Reject slugs that contain hash/hex artifacts (e.g. "-a1b2c3d4") or
  // malformed suffixes like "-155-chars". These are symptoms of upstream bugs
  // (collision appenders, truncated meta descriptions) that produce ugly URLs
  // which hurt CTR and look unprofessional in SERPs.
  const SLUG_ARTIFACT_PATTERN = /-[0-9a-f]{4,}$|-\d+-chars$/;
  if (SLUG_ARTIFACT_PATTERN.test(slug)) {
    console.warn(`[content-selector] Rejecting artifact slug: ${slug}`);
    await prisma.articleDraft.update({ where: { id: draft.id as string }, data: { last_error: `Slug artifact detected: ${slug}` } });
    return null;
  }

  // Get or create category and system user
  const categorySlug = `auto-generated-${siteId}`;
  let category = await prisma.category.findFirst({ where: { slug: categorySlug } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name_en: site.categoryName.en,
        name_ar: site.categoryName.ar,
        slug: categorySlug,
        description_en: `AI-generated luxury ${site.destination} travel content`,
        description_ar: `محتوى سفر ${site.destination} الفاخر المُنشأ بالذكاء الاصطناعي`,
      },
    });
  }

  const siteEmail = `system@${site.domain}`;
  let systemUser = await prisma.user.findFirst({ where: { email: siteEmail } });
  if (!systemUser) {
    // Fallback: try any system user
    systemUser = await prisma.user.findFirst({ where: { email: { startsWith: "system@" } } });
  }
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: siteEmail,
        name: `${site.name} AI`,
        role: "editor",
      },
    });
  }

  // ── Title cleanup ──────────────────────────────────────────────────────────
  // Pipeline keywords/topic_titles can arrive as raw slugs ("best luxury spas london 2026")
  // or all-lowercase. Clean them to proper Title Case before saving to BlogPost
  // so the blog listing never shows ugly slug-style titles in production.
  const TITLE_SMALL_WORDS = new Set(["in", "for", "and", "the", "of", "to", "a", "an", "with", "by", "at", "on", "is"]);
  const cleanTitle = (t: string): string => {
    if (!t) return t;
    // Already has mixed/upper case — leave as-is (was likely written properly)
    if (/[A-Z]/.test(t) && /[a-z]/.test(t)) return t;
    // All lowercase — title-case it
    const words = t.replace(/-/g, " ").split(/\s+/);
    return words
      .map((w, i) => {
        if (/^\d{4}$/.test(w)) return w;
        if (i > 0 && TITLE_SMALL_WORDS.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  };

  // Extract meta fields — sanitize to strip AI artifacts like "(under 60 chars)"
  const enMetaTitle = sanitizeTitle(cleanTitle((enSeoMeta.metaTitle as string) || enTitle));
  const arMetaTitle = (arSeoMeta.metaTitle as string) || arTitle;
  const enMetaDesc = sanitizeMetaDescription((enSeoMeta.metaDescription as string) || "");
  const arMetaDesc = (arSeoMeta.metaDescription as string) || "";
  const keywords = (enSeoMeta.keywords as string[]) || (arSeoMeta.keywords as string[]) || [keyword];
  const schemaType = (outline.schemaType as string) || "";
  const pageType = schemaType === "FAQPage" ? "faq"
    : schemaType === "HowTo" || schemaType === "Guide" ? "guide"
    : "blog"; // default to blog for standard articles

  const enImages = (enDraft?.images_data || {}) as Record<string, unknown>;
  const arImages = (arDraft?.images_data || {}) as Record<string, unknown>;
  const featuredImage = ((enImages.featured as Record<string, unknown>)?.url as string)
    || ((arImages.featured as Record<string, unknown>)?.url as string)
    || null;

  const cleanedEnTitle = sanitizeTitle(cleanTitle(enTitle || keyword));
  const cleanedArTitle = arTitle; // Arabic doesn't use title case

  // Create the bilingual BlogPost
  const missingLanguageTags = [];
  if (!hasEn) missingLanguageTags.push("missing-english");
  if (!hasAr) missingLanguageTags.push("missing-arabic");

  // ── Pre-Publication SEO Gate (fail CLOSED — don't publish without verification) ──
  // When skipGate is true (admin force-publish), bypass the gate entirely —
  // the admin has explicitly chosen to publish this article regardless of gate checks.
  const targetUrl = `/blog/${slug}`;
  const siteUrl = getSiteDomain(siteId);
  if (options?.skipGate) {
    console.log(`[content-selector] Pre-pub gate SKIPPED for draft ${draft.id} (admin override)`);
  } else {
    try {
      const gateResult = await runPrePublicationGate(
        targetUrl,
        {
          title_en: enTitle,
          title_ar: arTitle,
          meta_title_en: enMetaTitle,
          meta_description_en: enMetaDesc,
          content_en: enHtml,
          content_ar: arHtml,
          locale,
          tags: keywords.slice(0, 5),
          seo_score: Math.round((draft.seo_score as number) || (draft.quality_score as number) || 0),
          author_id: "system", // System-generated content always has author
          keywords_json: keywords,
        },
        siteUrl,
        { skipRouteCheck: true }, // Route will exist once BlogPost is created; HTTP check wastes 5s of budget
      );

      if (!gateResult.allowed) {
        console.warn(
          `[content-selector] Pre-pub gate BLOCKED draft ${draft.id} (keyword: "${keyword}"): ${gateResult.blockers.join("; ")}`,
        );
        if (gateResult.warnings.length > 0) {
          console.warn(
            `[content-selector] Pre-pub gate warnings for draft ${draft.id}: ${gateResult.warnings.join("; ")}`,
          );
        }
        // Mark the draft with the gate failure so it's visible in dashboard
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Pre-pub gate blocked: ${gateResult.blockers.join("; ")}`,
            updated_at: new Date(),
          },
        }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
        return null; // Skip this draft — do not publish
      }

      // Log warnings even when allowed (visible in cron logs for quality monitoring)
      if (gateResult.warnings.length > 0) {
        console.log(
          `[content-selector] Pre-pub gate PASSED draft ${draft.id} with warnings: ${gateResult.warnings.join("; ")}`,
        );
      }
    } catch (gateErr) {
      // Fail CLOSED — if the gate itself errors, do NOT publish
      const gateErrMsg = gateErr instanceof Error ? gateErr.message : String(gateErr);
      console.warn(
        `[content-selector] Pre-pub gate ERROR for draft ${draft.id} — blocking publication: ${gateErrMsg}`,
      );
      await prisma.articleDraft.update({
        where: { id: draft.id as string },
        data: {
          last_error: `Pre-pub gate error (blocked): ${gateErrMsg}`,
          updated_at: new Date(),
        },
      }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
      return null; // Fail closed — don't publish without gate verification
    }
  }

  // Retry blogPost.create() up to 2 times on slug collision (P2002 unique constraint).
  // The pre-check at line 532 handles most collisions, but a race condition can still
  // occur if two concurrent promotions pass the check before either creates.
  let blogPost;
  for (let slugAttempt = 0; slugAttempt < 3; slugAttempt++) {
    try {
      blogPost = await prisma.blogPost.create({
        data: {
          title_en: cleanedEnTitle,
          title_ar: cleanedArTitle || cleanedEnTitle || "",
          slug,
          excerpt_en: enMetaDesc,
          excerpt_ar: arMetaDesc || enMetaDesc || "",
          content_en: enHtml,
          content_ar: arHtml || enHtml || "",
          meta_title_en: enMetaTitle,
          meta_title_ar: arMetaTitle,
          meta_description_en: enMetaDesc,
          meta_description_ar: arMetaDesc,
          tags: (() => {
            // Internal pipeline tags are kept for operational tracking but filtered
            // from public-facing metadata in generateMetadata() and BlogPostClient.
            const INTERNAL_TAGS_SET = new Set(["auto-generated", "reservoir-pipeline", "needs-review", "needs-expansion"]);
            const allTags = [
              ...keywords.slice(0, 5),
              isBilingual ? "bilingual" : `primary-${locale}`,
              ...missingLanguageTags,
              site.destination.toLowerCase(),
            ];
            // Only store clean public tags on BlogPost — internal tags added noise to sitemaps, RSS, and OG tags
            return allTags.filter(t => !INTERNAL_TAGS_SET.has(t) && !t.startsWith("site-") && !t.startsWith("primary-") && !t.startsWith("missing-"));
          })(),
          published: true,
          featured_image: featuredImage,
          siteId,
          category_id: category.id,
          author_id: systemUser.id,
          page_type: pageType,
          seo_score: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
          keywords_json: keywords,
          questions_json: ((draft.research_data as Record<string, unknown>)?.keywordData as Record<string, unknown>)?.questions || [],
        },
      });
      break; // success — exit retry loop
    } catch (createErr) {
      // P2002 = Prisma unique constraint violation (duplicate slug)
      const isP2002 = createErr instanceof Error &&
        (createErr.message.includes("Unique constraint") || (createErr as unknown as Record<string, unknown>).code === "P2002");
      if (isP2002 && slugAttempt < 2) {
        const randomBytes = await import("crypto").then(c => c.randomBytes(4).toString("hex"));
        slug = `${slug.replace(/-[a-f0-9]{8}$/, "")}-${randomBytes}`;
        console.warn(`[content-selector] Slug collision on create (attempt ${slugAttempt + 1}) — retrying with "${slug}"`);
      } else {
        throw createErr; // Non-slug error or exhausted retries — propagate
      }
    }
  }

  // Track URL in indexing system immediately — makes it visible in dashboard
  if (blogPost) {
    const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
    const articleUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    ensureUrlTracked(articleUrl, siteId, `blog/${slug}`).catch(() => {});
    // Also track the Arabic variant
    ensureUrlTracked(`${getSiteDomain(siteId)}/ar/blog/${slug}`, siteId, `ar/blog/${slug}`).catch(() => {});
  }

  // Auto-queue tweet for newly published article (fires when TWITTER_* env vars are set)
  try {
    const twitterEnabled = !!(
      process.env.TWITTER_API_KEY ||
      process.env.TWITTER_ACCESS_TOKEN
    );
    if (twitterEnabled) {
      const articleUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
      // Site-specific hashtags
      const siteHashtag: Record<string, string> = {
        'yalla-london': '#YallaLondon #London',
        'arabaldives': '#Arabaldives #Maldives',
        'french-riviera': '#YallaRiviera #CoteDazur',
        'istanbul': '#YallaIstanbul #Istanbul',
        'thailand': '#YallaThailand #Thailand',
        'zenitha-yachts-med': '#ZenithaYachts #Mediterranean',
      };
      const tagSuffix = siteHashtag[siteId] || '#Zenitha';
      const contentHashtags = keywords
        .slice(0, 2)
        .map(k => '#' + k.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, ''))
        .filter(h => h.length > 1)
        .join(' ');
      // Keep tweet under 280 chars: title (max 100) + newlines + URL (~23 via t.co) + hashtags
      const titleTruncated = enTitle.length > 100 ? enTitle.substring(0, 97) + '...' : enTitle;
      const tweetContent = `${titleTruncated}\n\n${articleUrl}\n\n${contentHashtags} ${tagSuffix}`.trim().substring(0, 280);

      await prisma.scheduledContent.create({
        data: {
          title: (enTitle || keyword).substring(0, 200),
          content: tweetContent,
          content_type: 'twitter_post',
          platform: 'twitter',
          language: 'en',
          status: 'pending',
          published: false,
          site_id: siteId,
          content_id: blogPost.id,
          scheduled_time: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
          generation_source: 'content_pipeline_auto',
          tags: keywords.slice(0, 5),
        },
      });
      console.log(`[content-selector] Auto-queued tweet for BlogPost ${blogPost.id} (keyword: "${keyword}")`);
    }
  } catch (tweetErr) {
    console.warn('[content-selector] Tweet auto-queue failed (non-fatal):', tweetErr instanceof Error ? tweetErr.message : tweetErr);
  }

  // Create SeoMeta entry
  try {
    const schemaData = enSeoMeta.schema || arSeoMeta.schema || null;
    const canonicalUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await prisma.seoMeta.create({
      data: {
        pageId: blogPost.id,
        url: canonicalUrl,
        title: enMetaTitle || arMetaTitle || keyword,
        description: enMetaDesc || arMetaDesc || `${enTitle || arTitle} - ${site.name}`,
        canonical: canonicalUrl,
        metaKeywords: keywords.join(", "),
        ogTitle: enMetaTitle || arMetaTitle || keyword,
        ogDescription: enMetaDesc || arMetaDesc,
        structuredData: schemaData || undefined,
        seoScore: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
      },
    });
  } catch (seoErr) {
    console.warn("[content-selector] SeoMeta creation failed (non-fatal):", seoErr instanceof Error ? seoErr.message : seoErr);
  }

  // Immediately submit to IndexNow + track in URLIndexingStatus
  // Don't wait for the next seo-cron — every minute counts for indexing speed
  try {
    const fullUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    const { submitUrlImmediately } = await import("@/lib/seo/indexing-service");
    const indexResult = await submitUrlImmediately(fullUrl, siteId, getSiteDomain(siteId));
    console.log(`[content-selector] Immediate indexing for ${slug}: IndexNow=${indexResult.indexNow}`);
  } catch (indexErr) {
    console.warn("[content-selector] Immediate indexing failed (non-fatal, seo-cron will catch it):", indexErr instanceof Error ? indexErr.message : indexErr);
  }

  // Auto-inject affiliate links
  try {
    const contentLower = ((enHtml || "") + " " + (arHtml || "")).toLowerCase();
    const AFF_RULES = getAffiliateRules(siteId);
    const matched = AFF_RULES.filter((r) => r.kw.some((k) => contentLower.includes(k))).map((r) => r.aff).slice(0, 3);

    if (matched.length > 0) {
      const partnersHtml = `\n<div class="affiliate-partners-section" style="margin-top:2rem;padding:1.5rem;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h3 style="margin:0 0 1rem;color:#1f2937;">Recommended Partners</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">${matched.map((m) => `<a href="${encodeURI(m.url + m.param)}" target="_blank" rel="noopener sponsored" style="display:block;padding:1rem;background:white;border-radius:8px;border:1px solid #e5e7eb;text-decoration:none;color:inherit;"><strong style="color:#7c3aed;">${m.name}</strong></a>`).join("")}</div></div>`;
      const cleanEn = (enHtml || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");
      const cleanAr = (arHtml || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");
      await prisma.blogPost.update({ where: { id: blogPost.id }, data: { content_en: cleanEn + partnersHtml, content_ar: cleanAr + partnersHtml } });
      console.log(`[content-selector] Injected ${matched.length} affiliate partners into BlogPost ${blogPost.id}`);
    }
  } catch (affErr) {
    console.warn("[content-selector] Affiliate injection failed (non-fatal):", affErr instanceof Error ? affErr.message : affErr);
  }

  // ── Cluster Internal Link Injection ──
  // When publishing an article in a topic cluster, auto-inject links to sibling
  // articles in the same category (published in last 14 days). This strengthens
  // topical authority through dense interlinking within the cluster.
  try {
    const clusterSiblings = await prisma.blogPost.findMany({
      where: {
        category_id: blogPost.category_id,
        siteId,
        published: true,
        deletedAt: null,
        id: { not: blogPost.id },
        created_at: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      select: { slug: true, title_en: true },
      take: 4,
      orderBy: { created_at: "desc" },
    });

    if (clusterSiblings.length > 0) {
      const domain = getSiteDomain(siteId);
      const linksHtml = `\n<section class="cluster-related" style="margin-top:2rem;padding:1.5rem;background:linear-gradient(135deg,#f0f4ff,#fdf4ff);border-radius:12px;border:1px solid #e0e7ff;">
<h3 style="margin:0 0 1rem;font-size:1.1rem;color:#1f2937;">More in this series</h3>
<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem;">
${clusterSiblings.map(s => `<li><a href="${domain}/blog/${s.slug}" style="color:#4f46e5;text-decoration:none;font-weight:500;">${s.title_en}</a></li>`).join("\n")}
</ul></section>`;
      const currentEn = (await prisma.blogPost.findUnique({ where: { id: blogPost.id }, select: { content_en: true } }))?.content_en || "";
      if (!currentEn.includes('class="cluster-related"')) {
        await prisma.blogPost.update({ where: { id: blogPost.id }, data: { content_en: currentEn + linksHtml } });
        console.log(`[content-selector] Injected ${clusterSiblings.length} cluster links into BlogPost ${blogPost.id}`);
      }
    }
  } catch (clErr) {
    console.warn("[content-selector] Cluster link injection failed (non-fatal):", clErr instanceof Error ? clErr.message : clErr);
  }

  // ── Author Assignment ──
  // Replace generic "Editorial" with real author from TeamMember rotation.
  // Creates a ContentCredit record linking author → blog post.
  let authorName = `${site.name} Editorial Team`;
  let authorProfile: { id: string; name: string; slug: string; linkedinUrl: string | null; twitterUrl: string | null; instagramUrl: string | null; websiteUrl: string | null; title: string } | null = null;
  try {
    const { getNextAuthor, assignAuthor } = await import("@/lib/content-pipeline/author-rotation");
    const author = await getNextAuthor(siteId);
    authorName = author.name;
    authorProfile = author;
    if (author.id) {
      await assignAuthor(author.id, "blog_post", blogPost.id, "AUTHOR");
      console.log(`[content-selector] Assigned author "${author.name}" to BlogPost ${blogPost.id}`);
    }
  } catch (authErr) {
    console.warn("[content-selector] Author assignment failed (non-fatal):", authErr instanceof Error ? authErr.message : authErr);
  }

  // Auto-inject structured data
  try {
    const { enhancedSchemaInjector } = await import("@/lib/seo/enhanced-schema-injector");
    const postUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await enhancedSchemaInjector.injectSchemas(
      enHtml || arHtml,
      enTitle || arTitle,
      postUrl,
      blogPost.id,
      {
        author: authorName,
        category: category.name_en,
        tags: keywords.slice(0, 5),
        // Pass author social links for Person schema with sameAs (E-E-A-T)
        authorProfile: authorProfile ? {
          slug: authorProfile.slug,
          title: authorProfile.title,
          sameAs: [authorProfile.linkedinUrl, authorProfile.twitterUrl, authorProfile.instagramUrl, authorProfile.websiteUrl].filter(Boolean),
        } : undefined,
      },
    );
  } catch (schemaErr) {
    console.warn("[select-runner] Schema injection failed (non-fatal):", schemaErr instanceof Error ? schemaErr.message : schemaErr);
  }

  // Update BOTH drafts to published state
  const publishData = {
    current_phase: "published",
    blog_post_id: blogPost.id,
    published_at: new Date(),
    completed_at: new Date(),
    updated_at: new Date(),
    needs_review: true,
  };

  await prisma.articleDraft.update({
    where: { id: draft.id as string },
    data: publishData,
  });

  if (pairedDraft) {
    await prisma.articleDraft.update({
      where: { id: pairedDraft.id as string },
      data: publishData,
    }).catch((err: Error) => {
      console.warn(`[content-selector] Failed to update paired draft ${pairedDraft!.id}:`, err.message);
    });
  }

  if (draft.topic_proposal_id) {
    try {
      await prisma.topicProposal.update({
        where: { id: draft.topic_proposal_id as string },
        data: { status: "published" },
      });
    } catch (topicErr) {
      console.warn(`[select-runner] Failed to update TopicProposal ${draft.topic_proposal_id}:`, topicErr instanceof Error ? topicErr.message : topicErr);
    }
  }

  console.log(
    `[content-selector] Promoted draft ${draft.id}${pairedDraft ? ` + paired ${pairedDraft.id}` : ""} → BlogPost ${blogPost.id} (keyword: "${keyword}", score: ${draft.quality_score}, bilingual: ${isBilingual})`,
  );

  return {
    draftId: draft.id as string,
    blogPostId: blogPost.id,
    keyword,
    score: draft.quality_score as number,
  };
}
