/**
 * Content Selector — Core Logic (extracted from cron route)
 *
 * Callable directly without HTTP. Used by:
 * - /api/cron/content-selector (cron route)
 * - /api/admin/content-generation-monitor (dashboard trigger)
 *
 * Selects highest-quality articles from the ArticleDraft reservoir
 * and promotes them to published BlogPosts.
 *
 * CRITICAL RULES (see docs/CRITICAL-RULES-INDEX.md):
 * - Rule #24: Reservoir promotion uses atomic claiming (updateMany with WHERE current_phase="reservoir")
 * - Rule #25: BlogPost.create + ArticleDraft.update wrapped in $transaction
 * - Rule #33: Pre-pub gate receives POST-SANITIZED titles (after cleanTitle())
 * - Rule #34: Cron schedule staggered 10+ min from other crons writing to BlogPost
 * - Rule #1: BlogPost uses title_en/title_ar, NEVER "title"
 * - Rule #3: title_ar/content_ar are REQUIRED — always provide fallback values
 */

import { logCronExecution } from "@/lib/cron-logger";
import { onPromotionFailure } from "@/lib/ops/failure-hooks";
import { runPrePublicationGate } from "@/lib/seo/orchestrator/pre-publication-gate";
import { enhanceReservoirDraft } from "@/lib/content-pipeline/enhance-runner";
import { sanitizeTitle, sanitizeMetaDescription, sanitizeContentBody } from "@/lib/content-pipeline/title-sanitizer";
import { validatePhaseTransition, SELECTOR_STALE_MARKER_MS, PROMOTING_REVERT_MS } from "@/lib/content-pipeline/constants";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";

const DEFAULT_TIMEOUT_MS = 53_000;
const MAX_ARTICLES_PER_RUN = 6;        // publish up to 6 per run — drain overflowing reservoir (84-104 articles, cap 80)
const MAX_CANDIDATES_PER_RUN = 15;    // try up to 15 candidates to find 6 publishable

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
  let dedupMarkerId: string | null = null;

  try {
    const { prisma } = await import("@/lib/db");

    // Eagerly connect — prevents "Engine is not yet connected" on cold starts
    try { await prisma.$connect(); } catch { /* already connected */ }

    // ── Cleanup stale "started" markers ──
    // If a previous run crashed without completing, its "started" marker stays forever,
    // blocking all future runs via the dedup guard. Mark any "started" entries older than
    // 90 seconds as "failed" (must be LESS than dedup guard window of 120s).
    // Previously 45s — too tight, causing cleanup to kill still-running promotions.
    try {
      await prisma.cronJobLog.updateMany({
        where: {
          job_name: "content-selector",
          status: "started",
          started_at: { lt: new Date(Date.now() - SELECTOR_STALE_MARKER_MS) },
        },
        data: { status: "failed", result_summary: { error: "Stale marker — run likely crashed" } },
      });
    } catch (cleanupErr) {
      console.warn("[content-selector] Stale marker cleanup failed:", cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
    }

    // ── Revert drafts stuck in "promoting" from crashed runs ──
    // When content-selector crashes mid-promotion, drafts stay in "promoting" forever.
    // Revert any "promoting" drafts older than 60 seconds back to "reservoir".
    // A normal promotion takes <10s, so 60s is very generous.
    try {
      const stuckPromoting = await prisma.articleDraft.updateMany({
        where: {
          current_phase: "promoting",
          updated_at: { lt: new Date(Date.now() - PROMOTING_REVERT_MS) },
        },
        data: {
          current_phase: "reservoir",
          last_error: "Reverted from promoting — previous content-selector run crashed",
          updated_at: new Date(),
        },
      });
      if (stuckPromoting.count > 0) {
        console.log(`[content-selector] Reverted ${stuckPromoting.count} stuck "promoting" draft(s) back to reservoir`);
      }
    } catch (revertErr) {
      console.warn("[content-selector] Promoting revert failed:", revertErr instanceof Error ? revertErr.message : String(revertErr));
    }

    // ── Dedup guard: prevent concurrent content-selector runs ──
    // Write a "started" marker FIRST so concurrent runs can see it immediately.
    // Previous approach only checked for completed logs (written at END), allowing
    // two concurrent Vercel invocations to both pass the check.
    const recentRun = await prisma.cronJobLog.findFirst({
      where: {
        job_name: "content-selector",
        status: "started",
        // Aligned with stale marker cleanup (90s) — previously 120s created a 30s
        // gap where a stale marker was cleaned but a new run was still blocked.
        started_at: { gte: new Date(Date.now() - SELECTOR_STALE_MARKER_MS) },
      },
      orderBy: { started_at: "desc" },
    });
    if (recentRun) {
      console.log(`[content-selector] Another run started within 120s (marker ${recentRun.id} at ${recentRun.started_at?.toISOString()}) — skipping`);
      // CRITICAL: Log to CronJobLog so dashboard sees this run — previously silent (Rule #130).
      await logCronExecution("content-selector", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "Dedup: skipped (recent run exists)", dedupMarkerId: recentRun.id },
      }).catch(() => {});
      return { success: true, message: "Dedup: skipped (recent run exists)", durationMs: Date.now() - cronStart };
    }
    // Write "started" marker immediately so concurrent invocations see it.
    // CRITICAL: Track the marker ID so we can UPDATE it on success/failure
    // instead of creating a new log entry (which leaves this one abandoned
    // and triggers false "Stale marker — run likely crashed" failures).
    try {
      const marker = await prisma.cronJobLog.create({
        data: {
          job_name: "content-selector",
          status: "started",
          started_at: new Date(cronStart),
          duration_ms: 0,
          items_processed: 0,
          items_succeeded: 0,
        },
      });
      dedupMarkerId = marker.id;
    } catch (err) {
      console.warn("[content-selector] Failed to write dedup marker:", err instanceof Error ? err.message : String(err));
    }
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");
    // Import quality gate threshold from centralized SEO standards — single source of truth.
    // When standards.ts is updated (e.g., after algorithm changes), this threshold updates automatically.
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    // Use reservoirMinScore (40) to fetch — NOT qualityGateScore (40).
    // The pre-pub gate hard-blocks at seo_score < 30, so articles scoring 40+ will
    // pass the gate (with warnings) and get published. Using a higher DB filter would
    // permanently freeze articles that entered the reservoir under the old threshold.
    const MIN_QUALITY_SCORE = CONTENT_QUALITY.reservoirMinScore;

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      // CRITICAL: Log to CronJobLog so dashboard sees this run — previously silent (Rule #130).
      await logCronExecution("content-selector", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "No active sites configured" },
      }).catch(() => {});
      return { success: true, message: "No active sites", durationMs: Date.now() - cronStart };
    }

    // Find reservoir articles with sufficient quality.
    // Articles with 3+ failed enhancement attempts are still included — they may
    // pass the pre-pub gate as-is and should be published rather than zombified.
    const MAX_ENHANCEMENT_ATTEMPTS = 2; // Force-publish after 2 failed enhancements (was 3 — too slow)
    let candidates: Array<Record<string, unknown>> = [];
    try {
      // Step 1: Find candidates
      // Use OR to catch articles with NULL quality_score (e.g., reverted from
      // "promoting" by crash recovery, or created by old code paths).
      // NULL is not >= 40 in SQL — without the OR, these articles are invisible.
      const reservoirDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: "reservoir",
          OR: [
            { quality_score: { gte: MIN_QUALITY_SCORE } },
            { quality_score: null, seo_score: { gte: MIN_QUALITY_SCORE } },
            // Articles with BOTH null = old/broken, still include if seo_score exists
            { quality_score: null, seo_score: null },
          ],
        },
        orderBy: [
          { quality_score: "desc" },
          { created_at: "asc" },
        ],
        take: MAX_CANDIDATES_PER_RUN * 2,
      });

      // Step 2: Atomically claim candidates by setting current_phase to "promoting"
      // This prevents concurrent content-selector runs from promoting the same draft.
      // The updateMany WHERE re-checks current_phase="reservoir" — if another process
      // already claimed it, count will be 0 and we skip it.
      for (const rd of reservoirDrafts) {
        validatePhaseTransition("reservoir", "promoting");
        const claimed = await prisma.articleDraft.updateMany({
          where: { id: rd.id as string, current_phase: "reservoir" },
          data: { current_phase: "promoting", updated_at: new Date() },
        });
        if (claimed.count > 0) {
          candidates.push(rd);
        }
      }
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
          prisma.articleDraft.count({ where: { current_phase: "reservoir", site_id: { in: activeSites }, quality_score: { not: null, lt: MIN_QUALITY_SCORE } } }),
        ]);
      } catch (countErr) { console.warn("[select-runner] reservoir count failed:", countErr instanceof Error ? countErr.message : countErr); }

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
    const PUBLISH_THRESHOLD = CONTENT_QUALITY.qualityGateScore; // 55 (lowered from 70 — March 18, 2026)
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
    // Compare against PUBLISHED articles (not just other candidates in this batch).
    // All reservoir articles are London luxury topics — comparing only within the batch
    // caused "All reservoir articles have keyword overlap" blocking ALL publishing.
    const publishedTitles = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, siteId: { in: activeSites } },
      select: { title_en: true },
      take: 200,
      orderBy: { created_at: "desc" },
    });
    const publishedKeywordSets = publishedTitles
      .map((p) => new Set<string>((p.title_en || "").toLowerCase().split(/\s+/).filter((w) => w.length > 2)))
      // Note: site-common stop words stripped during comparison loop below

    const selectedDraftIds = new Set<string>();
    const selected: Array<Record<string, unknown>> = [];

    for (const candidate of publishReady) {
      if (selected.length >= MAX_CANDIDATES_PER_RUN) break;

      const candidateId = candidate.id as string;
      const pairedId = candidate.paired_draft_id as string | null;
      if (selectedDraftIds.has(candidateId)) continue;
      if (pairedId && selectedDraftIds.has(pairedId)) continue;

      const keyword = ((candidate.keyword as string) || "").toLowerCase().trim();
      if (!keyword) continue;

      // Check against PUBLISHED articles for true duplicates.
      // Use Jaccard similarity (intersection/union) — NOT Math.min which caused
      // 100% overlap on short keywords sharing common words like "london", "luxury".
      // Also strip site-common words that EVERY article shares.
      // Expanded stop words: common travel/niche words that EVERY London travel article shares.
      // Without stripping these, Jaccard similarity is inflated and blocks legitimate different topics.
      const SITE_STOP_WORDS = new Set([
        "london", "best", "top", "guide", "luxury", "arab", "halal",
        "2024", "2025", "2026", "2027", "ultimate", "complete",
        "hotel", "hotels", "restaurant", "restaurants", "experience", "experiences",
        "travel", "family", "visit", "visiting", "things",
      ]);
      const keywordWords = new Set<string>(keyword.split(/\s+/).filter(w => w.length > 2 && !SITE_STOP_WORDS.has(w)));
      const isDuplicateOfPublished = keywordWords.size > 0 && publishedKeywordSets.some((existingWords) => {
        if (existingWords.size === 0) return false;
        const filteredExisting = new Set([...existingWords].filter(w => !SITE_STOP_WORDS.has(w)));
        if (filteredExisting.size === 0) return false;
        const shared = [...keywordWords].filter(w => filteredExisting.has(w)).length;
        const union = keywordWords.size + filteredExisting.size - shared;
        const jaccardSimilarity = union === 0 ? 0 : shared / union;
        // 0.92 = only blocks near-identical titles (2-3 unique words all matching).
        // Was 0.85 which blocked 95%+ of candidates on a niche London travel site.
        return jaccardSimilarity > 0.92;
      });

      if (!isDuplicateOfPublished) {
        selected.push(candidate);
        selectedDraftIds.add(candidateId);
        if (pairedId) selectedDraftIds.add(pairedId);
      }
    }

    // FORCE PUBLISH FALLBACK: If overlap filter blocked everything, force-publish the
    // highest-scoring candidate. A published article earning $0.01 > a perfect reservoir
    // earning $0. The overlap check prevents near-identical titles, but 61 articles stuck
    // in reservoir means the threshold is too aggressive for a niche travel site.
    if (selected.length === 0 && publishReady.length > 0) {
      const best = publishReady[0]; // Already sorted by seo_score desc
      selected.push(best);
      selectedDraftIds.add(best.id as string);
      const pairedId = best.paired_draft_id as string | null;
      if (pairedId) selectedDraftIds.add(pairedId);
      console.warn(`[content-selector] All ${publishReady.length} publishReady candidates had keyword overlap — force-publishing best candidate (score: ${best.seo_score})`);
    }

    // LAST RESORT: If publishReady was empty (all candidates below quality/word-count threshold),
    // force-publish the best candidate from ALL reservoir candidates anyway.
    // 65 articles stuck in reservoir earning $0 is worse than 1 imperfect article published.
    // The pre-pub gate will still catch truly broken articles.
    if (selected.length === 0 && candidates.length > 0) {
      // Sort all candidates by quality_score desc
      const sorted = [...candidates].sort((a, b) =>
        ((b.quality_score as number) || 0) - ((a.quality_score as number) || 0)
      );
      const best = sorted[0];
      selected.push(best);
      selectedDraftIds.add(best.id as string);
      const pairedId = best.paired_draft_id as string | null;
      if (pairedId) selectedDraftIds.add(pairedId);
      console.warn(`[content-selector] No publishReady candidates (all below quality/word threshold) — force-publishing best of ${candidates.length} reservoir candidates (score: ${best.quality_score}, keyword: "${best.keyword}")`);
    }

    if (selected.length === 0) {
      // CRITICAL: Log to CronJobLog so dashboard sees this run — previously silent (Rule #130).
      // Also close the dedup marker so it doesn't appear as "stale/crashed".
      const msg = candidates.length > 0
        ? `${candidates.length} reservoir candidates exist but none could be promoted: ${publishReady.length} passed quality gate (all had keyword overlap), ${needsEnhancement.length} need enhancement. Force-publish fallbacks also failed.`
        : `No reservoir candidates available for promotion.`;
      if (dedupMarkerId) {
        await prisma.cronJobLog.update({
          where: { id: dedupMarkerId },
          data: { status: "completed", completed_at: new Date(), duration_ms: Date.now() - cronStart, result_summary: { message: msg, candidateCount: candidates.length } as Record<string, unknown> },
        }).catch(() => {});
      } else {
        await logCronExecution("content-selector", "completed", {
          durationMs: Date.now() - cronStart,
          resultSummary: { message: msg, candidateCount: candidates.length },
        }).catch(() => {});
      }
      // Revert all claimed candidates back to reservoir
      for (const c of candidates) {
        await prisma.articleDraft.updateMany({
          where: { id: c.id as string, current_phase: "promoting" },
          data: { current_phase: "reservoir", updated_at: new Date() },
        }).catch(() => {});
      }
      return {
        success: true,
        message: msg,
        candidateCount: candidates.length,
        durationMs: Date.now() - cronStart,
      };
    }

    // Promote selected articles to BlogPost
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }> = [];
    const skippedReasons: Array<{ draftId: string; keyword: string; reason: string }> = [];

    for (const draft of selected) {
      // Stop after MAX_ARTICLES_PER_RUN successful publications (target: 2)
      if (published.length >= MAX_ARTICLES_PER_RUN) {
        console.log(`[content-selector] Reached ${MAX_ARTICLES_PER_RUN} published articles, stopping`);
        break;
      }
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
        } else {
          // promoteToBlogPost returned null — draft was reverted to reservoir internally.
          // Log the reason so it shows in cron logs (previously silent — caused "published: 0" mystery).
          const draftAfter = await prisma.articleDraft.findUnique({
            where: { id: draft.id as string },
            select: { last_error: true, current_phase: true },
          }).catch(() => null);
          const reason = draftAfter?.last_error || "unknown (no last_error set)";
          console.warn(`[content-selector] Draft ${draft.id} ("${draft.keyword}") promotion returned null — reason: ${reason}`);
          skippedReasons.push({ draftId: draft.id as string, keyword: draft.keyword as string, reason });
        }
      } catch (promoteErr) {
        const errType = promoteErr instanceof Error ? promoteErr.constructor.name : "Unknown";
        const errMsg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
        const errStack = promoteErr instanceof Error ? promoteErr.stack : "";
        console.error(
          `[content-selector] Failed to promote draft ${draft.id} (keyword: "${draft.keyword}") — ${errType}: ${errMsg}`,
        );
        if (errStack) console.error(`[content-selector] Promote stack:\n${errStack}`);
        // Revert from "promoting" back to "reservoir" so the draft is eligible for next run
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            current_phase: "reservoir",
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
    // Each enhancement costs 30-45s (Grok search + content expansion). Cap at 2 per run.
    // With maxDuration: 300 in vercel.json, we have ~240s budget for enhancements.
    let enhancedCount = 0;
    const enhancementQueue = needsEnhancement.slice(0, 2); // Max 2 per run (was 1 — bottleneck)

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

    // Invalidate sitemap cache if new content was published — Google should
    // discover new URLs on its next crawl, not wait for the 4-hour cron cycle.
    if (published.length > 0) {
      try {
        const { regenerateAllSitemapCaches } = await import("@/lib/sitemap-cache");
        await regenerateAllSitemapCaches();
      } catch (err) {
        console.warn("[content-selector] Sitemap cache refresh failed:", err instanceof Error ? err.message : String(err));
      }
    }

    const durationMs = Date.now() - cronStart;

    // CRITICAL: Update the ORIGINAL "started" marker instead of creating a new log entry.
    // Previously logCronExecution() created a NEW entry, leaving the marker abandoned →
    // stale cleanup marked it "failed" with "Stale marker — run likely crashed".
    if (dedupMarkerId) {
      try {
        await prisma.cronJobLog.update({
          where: { id: dedupMarkerId },
          data: {
            status: "completed",
            completed_at: new Date(),
            duration_ms: durationMs,
            items_processed: published.length,
            items_succeeded: published.length,
            result_summary: {
              reservoirCandidates: candidates.length,
              publishReady: publishReady.length,
              needsEnhancement: needsEnhancement.length,
              enhancedCount,
              selected: selected.length,
              published: published.length,
              articles: published,
              skippedReasons: skippedReasons.length > 0 ? skippedReasons : undefined,
            } as Record<string, unknown>,
          },
        });
      } catch (err) {
        console.warn("[content-selector] Failed to close dedup marker:", err instanceof Error ? err.message : String(err));
        // Fallback: create a separate log entry so the run is still recorded
        await logCronExecution("content-selector", "completed", {
          durationMs,
          itemsProcessed: published.length,
          resultSummary: {
            reservoirCandidates: candidates.length,
            published: published.length,
            note: "Marker update failed — created separate log entry",
          },
        }).catch(() => {});
      }
    } else {
      // No marker was created (DB was down during startup) — use legacy approach
      await logCronExecution("content-selector", "completed", {
        durationMs,
        itemsProcessed: published.length,
        resultSummary: {
          reservoirCandidates: candidates.length,
          published: published.length,
        },
      }).catch(() => {});
    }

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

    // Close the dedup marker as "failed" (same fix as success path — update original, don't create new)
    if (dedupMarkerId) {
      try {
        // Re-import prisma — it may not be in scope if the crash happened early
        const { prisma: db } = await import("@/lib/db");
        await db.cronJobLog.update({
          where: { id: dedupMarkerId },
          data: {
            status: "failed",
            completed_at: new Date(),
            duration_ms: durationMs,
            error_message: `[${errType}] ${errMsg}`,
          },
        });
      } catch (markerErr) {
        console.warn("[content-selector] Failed to close dedup marker on error:", markerErr instanceof Error ? markerErr.message : String(markerErr));
        await logCronExecution("content-selector", "failed", {
          durationMs,
          errorMessage: `[${errType}] ${errMsg}`,
        }).catch(() => {});
      }
    } else {
      await logCronExecution("content-selector", "failed", {
        durationMs,
        errorMessage: `[${errType}] ${errMsg}`,
      }).catch(err => console.warn("[select-runner] Failed to log cron execution:", err instanceof Error ? err.message : err));
    }

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
  options?: { skipGate?: boolean; skipDedup?: boolean },
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
        // ── ARABIC PUBLISHING FIX ──
        // Instead of immediately publishing EN-only when AR pair isn't ready,
        // check if the AR draft is still advancing. If it's still in the pipeline
        // (not rejected/stuck), WAIT for it — revert EN to reservoir and let the
        // next content-selector run try again once AR catches up.
        // This prevents publishing articles with empty content_ar.
        const arPhase = pairedDraft.current_phase as string;
        const arAttempts = (pairedDraft.phase_attempts as number) || 0;
        const arError = (pairedDraft.last_error as string) || "";
        const arIsRejected = arPhase === "rejected";
        const arIsStuck = arAttempts >= 5 || arError.includes("MAX_RECOVERIES_EXCEEDED");
        const arUpdatedAt = pairedDraft.updated_at ? new Date(pairedDraft.updated_at as string).getTime() : 0;
        const arStaleHours = (Date.now() - arUpdatedAt) / (1000 * 60 * 60);
        const arIsAbandoned = arStaleHours > 48; // Not touched in 2 days

        if (arIsRejected || arIsStuck || arIsAbandoned) {
          // AR is permanently failed — proceed with EN-only publication
          console.log(`[content-selector] Paired AR draft ${pairedDraftId} is ${arIsRejected ? 'rejected' : arIsStuck ? 'stuck (5+ attempts)' : 'abandoned (48h+)'} — publishing EN-only`);
          pairedDraft = null;
        } else {
          // AR is still advancing — DON'T publish EN yet, wait for AR to catch up
          console.log(`[content-selector] Paired AR draft ${pairedDraftId} still in pipeline (phase: ${arPhase}, attempts: ${arAttempts}) — deferring EN publication to wait for bilingual pair`);
          await prisma.articleDraft.update({
            where: { id: draft.id as string },
            data: {
              current_phase: "reservoir",
              last_error: `Waiting for paired AR draft (phase: ${arPhase}) — will publish together`,
              updated_at: new Date(),
            },
          }).catch(err => console.warn("[select-runner] revert failed:", err instanceof Error ? err.message : err));
          return null;
        }
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
  // ── Title auto-repair ───────────────────────────────────────────────
  // If topic_title is missing or too short (< 10 chars, which blocks the gate),
  // try to recover a title from: (1) seo_meta.metaTitle, (2) keyword, (3) first H1/H2 in content.
  // This prevents articles with good content from being blocked by a missing title.
  let enTitle = (enDraft?.topic_title as string) || "";
  const enSeoMeta = ((enDraft?.seo_meta || {}) as Record<string, unknown>);
  const arSeoMeta = ((arDraft?.seo_meta || {}) as Record<string, unknown>);

  if (enTitle.length < 10) {
    // Try seo_meta.metaTitle first (usually the best formatted)
    const metaTitle = (enSeoMeta.metaTitle as string) || "";
    if (metaTitle.length >= 10) {
      enTitle = metaTitle;
      console.log(`[content-selector] Auto-repaired short title for draft ${draft.id}: using metaTitle "${enTitle}"`);
    } else if (keyword && keyword.length >= 10) {
      enTitle = keyword;
      console.log(`[content-selector] Auto-repaired short title for draft ${draft.id}: using keyword "${enTitle}"`);
    } else if (enHtml) {
      // Extract first heading from content
      const headingMatch = enHtml.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
      if (headingMatch && headingMatch[1].length >= 10) {
        enTitle = headingMatch[1].trim();
        console.log(`[content-selector] Auto-repaired short title for draft ${draft.id}: extracted from heading "${enTitle}"`);
      } else {
        // Last resort: use keyword even if short
        enTitle = keyword || "Untitled Article";
        console.warn(`[content-selector] Draft ${draft.id} has no usable title — using fallback: "${enTitle}"`);
      }
    }
  }
  const arTitle = (arDraft?.topic_title as string) || "";
  const outline = (draft.outline_data || {}) as Record<string, unknown>;

  if (!enHtml && !arHtml) {
    console.warn(`[content-selector] Draft ${draft.id} and its pair have no assembled HTML — skipping`);
    return null;
  }

  // Empty content guard — prevent publishing articles with insufficient English content
  if (enHtml && enHtml.trim().length < 500) {
    console.warn(`[content-selector] Skipping draft ${draft.id} — content_en too short (${enHtml.trim().length} chars)`);
    // Revert from "promoting" back to "reservoir" so the draft isn't orphaned
    await prisma.articleDraft.update({
      where: { id: draft.id as string },
      data: { current_phase: "reservoir", last_error: "Empty content_en — skipped promotion" },
    }).catch(err => console.warn("[select-runner] revert failed:", err instanceof Error ? err.message : err));
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

  // Clean slug: remove date stamps and deduplicate year tokens to avoid
  // Google's "auto-generated content" signals
  slug = slug
    .replace(/-\d{4}-\d{2}-\d{2}$/g, "")  // Strip trailing date stamps (e.g., -2026-02-17)
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  // Deduplicate year tokens (e.g., "ramadan-2026-timetable-2026" → "ramadan-2026-timetable")
  const yearInSlug = slug.match(/\b(20[2-3]\d)\b/);
  if (yearInSlug) {
    let firstYearSeen = false;
    slug = slug.replace(new RegExp(`-?${yearInSlug[1]}`, "g"), (m) => {
      if (!firstYearSeen) { firstYearSeen = true; return m; }
      return "";
    }).replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
  }
  // Cap slug length at 60 chars (shorter = better for SEO)
  if (slug.length > 60) {
    const lastH = slug.lastIndexOf("-", 60);
    slug = lastH > 30 ? slug.slice(0, lastH) : slug.slice(0, 60);
  }

  // Check for slug collision GLOBALLY — BlogPost.slug is @unique across all sites.
  // If a collision is found, append a human-readable suffix (-v2, -v3, etc.)
  // instead of hex bytes which trigger the slug artifact detector.
  const existingSlug = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existingSlug) {
    // Find the next available version suffix
    for (let v = 2; v <= 10; v++) {
      const candidate = `${slug}-v${v}`;
      const collision = await prisma.blogPost.findFirst({
        where: { slug: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!collision) {
        slug = candidate;
        break;
      }
      if (v === 10) slug = `${slug}-v${Date.now().toString(36).slice(-4)}`;
    }
    console.log(`[content-selector] Slug collision detected — using "${slug}" instead`);
  }

  // Check for duplicate title — keyword cannibalization prevention.
  // Uses normalized comparison: strips years, common filler words (guide, best, etc.),
  // and punctuation so "Best London Hotels 2026" matches "Top London Hotels Guide 2025".
  // This prevents near-duplicate articles that compete for the same SERP position.
  // Skipped when admin explicitly chooses to publish via "Fix & Publish" (skipDedup: true).
  if (!options?.skipDedup) {
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
        // Revert from "promoting" back to "reservoir" so the draft isn't orphaned
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            current_phase: "reservoir",
            last_error: `Normalized duplicate title: "${candidateTitle}" ≈ existing "/blog/${existingMatch.slug}"`,
            updated_at: new Date(),
          },
        }).catch(err => console.warn("[select-runner] revert failed:", err instanceof Error ? err.message : err));
        return null;
      }
    } catch (titleCheckErr) {
      console.warn("[content-selector] Title duplicate check failed (non-fatal):", titleCheckErr instanceof Error ? titleCheckErr.message : titleCheckErr);
    }
  }

  // ── Keyword cannibalization check (WARNING ONLY — never blocks publishing) ──
  // The selection-time Jaccard check (threshold 0.92) already filters near-identical
  // keywords. This secondary check compares full keyword arrays and logs a warning
  // for SEO awareness, but does NOT block publishing. Blocking here caused the
  // entire pipeline to freeze: articles passed selection (0.92) then got reverted
  // here (0.85), filling the reservoir with permanently stuck drafts.
  // The pre-pub gate (check #15) already surfaces cannibalization as a warning.
  try {
    const { checkCannibalization } = await import("@/lib/seo/cannibalization-checker");
    const enKeywords = (enSeoMeta.keywords as string[]) || [];
    if (enKeywords.length > 0) {
      const cannibResult = await checkCannibalization(enKeywords, siteId, draft.id as string);
      if (cannibResult.cannibalizes && cannibResult.overlappingArticle) {
        const overlap = cannibResult.overlappingArticle;
        console.warn(`[content-selector] WARNING: keyword overlap (${overlap.overlapScore}%) with "/blog/${overlap.slug}" — shared: ${overlap.sharedKeywords.join(", ")}. Publishing anyway (selection-time Jaccard already filtered near-duplicates).`);
        // Continue to publish — don't revert. SEO impact is minor compared to
        // a frozen pipeline producing zero articles.
      }
    }
  } catch (cannibErr) {
    console.warn("[content-selector] Cannibalization check failed (non-fatal):", cannibErr instanceof Error ? cannibErr.message : cannibErr);
  }
  } // end skipDedup guard

  // ── Slug artifact cleanup ──────────────────────────────────────────────
  // Detect hash/hex artifacts (e.g. "-a1b2c3d4", "-0e0828e5") or
  // malformed suffixes like "-155-chars". These are symptoms of upstream bugs
  // (collision appenders, truncated meta descriptions) that produce ugly URLs.
  // Instead of rejecting the article, STRIP the artifact and try a clean slug.
  // Years (2020-2039) are excluded — "-2024" is a legitimate date, not a hash.
  const SLUG_ARTIFACT_PATTERN = /-[0-9a-f]{5,}$|-\d+-chars$/; // 5+ hex chars (was 4, which caught years like 2024)
  const YEAR_SUFFIX_PATTERN = /-20[2-3]\d$/; // legitimate year suffixes
  if (SLUG_ARTIFACT_PATTERN.test(slug) && !YEAR_SUFFIX_PATTERN.test(slug)) {
    const cleanedSlug = slug.replace(SLUG_ARTIFACT_PATTERN, "");
    if (cleanedSlug && cleanedSlug.length > 5) {
      console.log(`[content-selector] Cleaned artifact from slug: "${slug}" → "${cleanedSlug}"`);
      slug = cleanedSlug;
      // Re-check for collision after cleaning
      const cleanCollision = await prisma.blogPost.findFirst({
        where: { slug: cleanedSlug, deletedAt: null },
        select: { id: true },
      });
      if (cleanCollision) {
        // Use human-readable suffix (-v2, -v3) — NOT hex bytes which re-trigger the artifact detector
        for (let v = 2; v <= 10; v++) {
          const candidate = `${cleanedSlug}-v${v}`;
          const vc = await prisma.blogPost.findFirst({ where: { slug: candidate, deletedAt: null }, select: { id: true } });
          if (!vc) { slug = candidate; break; }
          if (v === 10) slug = `${cleanedSlug}-v${Date.now().toString(36).slice(-4)}`;
        }
        console.log(`[content-selector] Cleaned slug collided — using "${slug}"`);
      }
    } else {
      console.warn(`[content-selector] Slug artifact detected but cleaning produced invalid slug: "${slug}" → "${cleanedSlug}". Skipping.`);
      // Revert from "promoting" back to "reservoir" so the draft isn't orphaned
      await prisma.articleDraft.update({ where: { id: draft.id as string }, data: { current_phase: "reservoir", last_error: `Slug artifact detected: ${slug}` } }).catch(err => console.warn("[select-runner] revert failed:", err instanceof Error ? err.message : err));
      return null;
    }
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
  // Arabic titles MUST also be sanitized — AI generates artifacts in Arabic too (rule #145)
  const enMetaTitle = sanitizeTitle(cleanTitle((enSeoMeta.metaTitle as string) || enTitle));
  const arMetaTitle = sanitizeTitle((arSeoMeta.metaTitle as string) || arTitle || enMetaTitle);
  let enMetaDesc = sanitizeMetaDescription((enSeoMeta.metaDescription as string) || "");
  const arMetaDesc = sanitizeMetaDescription((arSeoMeta.metaDescription as string) || "");

  // ── Auto-generate meta description from content when missing ───────────
  // A missing meta description means Google picks its own snippet (often bad).
  // Extract the first meaningful paragraph from content as a fallback.
  if ((!enMetaDesc || enMetaDesc.length < 50) && enHtml) {
    // Strip tags, get text, take first ~155 chars at word boundary
    const plainText = enHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Skip very short opening lines (e.g. image captions) — find first sentence > 40 chars
    const sentences = plainText.split(/[.!?]\s+/);
    let excerpt = "";
    for (const s of sentences) {
      excerpt += (excerpt ? ". " : "") + s.trim();
      if (excerpt.length >= 120) break;
    }
    if (excerpt.length > 160) {
      const lastSpace = excerpt.substring(0, 155).lastIndexOf(" ");
      excerpt = excerpt.substring(0, lastSpace > 80 ? lastSpace : 155);
    }
    if (excerpt.length >= 50) {
      // Add CTA suffix if space allows (improves CTR vs plain extract)
      if (excerpt.length < 130 && !excerpt.endsWith(".")) excerpt += ".";
      if (excerpt.length < 130) excerpt += " Read our complete guide.";
      enMetaDesc = sanitizeMetaDescription(excerpt);
      console.log(`[content-selector] Auto-generated meta description for draft ${draft.id} (${enMetaDesc.length} chars)`);
    } else {
      // Last resort: template-based CTA description using the keyword
      const kw = keyword.replace(/-/g, " ");
      enMetaDesc = sanitizeMetaDescription(
        `Discover ${kw}. Your expert guide with insider tips, local recommendations, and everything you need to plan your visit.`
      );
      console.log(`[content-selector] Template meta description for draft ${draft.id} (${enMetaDesc.length} chars)`);
    }
  }
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
    // Even on admin force-publish, guard against truly empty titles
    if (!cleanedEnTitle || cleanedEnTitle.length < 3) {
      console.warn(`[content-selector] Admin force-publish BLOCKED — cleanedEnTitle is empty or too short: "${cleanedEnTitle}"`);
      return null;
    }
    console.log(`[content-selector] Pre-pub gate SKIPPED for draft ${draft.id} (admin override)`);
  } else {
    try {
      // Pass POST-sanitized titles to the gate so it checks what will actually be stored.
      // Previously passed raw enTitle/arTitle — a title passing the gate could become
      // empty/short after sanitizeTitle() when stored in the DB.
      const gateResult = await runPrePublicationGate(
        targetUrl,
        {
          title_en: cleanedEnTitle,
          title_ar: cleanedArTitle,
          meta_title_en: enMetaTitle,
          meta_description_en: enMetaDesc,
          content_en: enHtml,
          content_ar: arHtml,
          locale,
          tags: keywords.slice(0, 5),
          seo_score: (draft.seo_score != null || draft.quality_score != null)
            ? Math.round((draft.seo_score as number) ?? (draft.quality_score as number) ?? 50)
            : undefined, // Pass undefined when no score exists — gate skips SEO score check (line 280: seo_score !== undefined)
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
        // Mark the draft with the gate failure and revert from "promoting" to "reservoir"
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            current_phase: "reservoir",
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
          current_phase: "reservoir",
          last_error: `Pre-pub gate error (blocked): ${gateErrMsg}`,
          updated_at: new Date(),
        },
      }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
      return null; // Fail closed — don't publish without gate verification
    }
  }

  // ── CJ Affiliate Link Injection ─────────────────────────────────────────
  // Inject affiliate CTAs into content before publishing. Non-blocking:
  // if injection fails, publish the article without affiliates.
  try {
    const { processContent: injectAffiliateLinks } = await import("@/lib/affiliate/content-processor");
    const domain = getSiteDomain(siteId);

    if (enHtml) {
      const enResult = await injectAffiliateLinks(enHtml, {
        category: category?.slug || "",
        tags: keywords,
        language: "en",
        articleId: draft.id as string,
        baseUrl: `https://${domain}`,
      });
      if (enResult.hasAffiliateContent) {
        enHtml = enResult.html;
        console.log(`[content-selector] Injected ${enResult.injectedLinks.length} CJ affiliate links (EN) into draft ${draft.id}`);
      }
    }
  } catch (affErr) {
    console.warn(`[content-selector] CJ affiliate injection failed (non-blocking):`, affErr instanceof Error ? affErr.message : affErr);
  }

  // Create BlogPost + update draft in a Prisma transaction to prevent orphans.
  // Previously BlogPost was created first, draft updated ~200 lines later. If the process
  // crashed between them, the draft stayed "reservoir" and got promoted again = duplicate.
  // Now both happen atomically — either both succeed or neither does.
  validatePhaseTransition("promoting", "published");
  const publishData = {
    current_phase: "published" as const,
    published_at: new Date(),
    completed_at: new Date(),
    updated_at: new Date(),
    needs_review: true,
  };

  const blogPostData = {
    title_en: cleanedEnTitle,
    title_ar: cleanedArTitle || cleanedEnTitle || "",
    slug,
    excerpt_en: enMetaDesc,
    excerpt_ar: arMetaDesc || enMetaDesc || "",
    content_en: sanitizeContentBody(enHtml),
    content_ar: sanitizeContentBody(arHtml || enHtml || ""),
    meta_title_en: enMetaTitle,
    meta_title_ar: arMetaTitle,
    meta_description_en: enMetaDesc,
    meta_description_ar: arMetaDesc,
    tags: (() => {
      const INTERNAL_TAGS_SET = new Set(["auto-generated", "reservoir-pipeline", "needs-review", "needs-expansion"]);
      const allTags = [
        ...keywords.slice(0, 5),
        isBilingual ? "bilingual" : `primary-${locale}`,
        ...missingLanguageTags,
        site.destination.toLowerCase(),
      ];
      // Keep "missing-arabic" and "missing-english" tags — content-auto-fix uses them
      // to identify articles needing Arabic/English backfill. Only filter internal pipeline tags.
      return allTags.filter(t => !INTERNAL_TAGS_SET.has(t) && !t.startsWith("site-") && !t.startsWith("primary-"));
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
    source_pipeline: "8-phase",
    trace_id: (draft as Record<string, unknown>).trace_id as string || undefined,
  };

  // Retry on slug collision (P2002 unique constraint).
  let blogPost;
  for (let slugAttempt = 0; slugAttempt < 3; slugAttempt++) {
    try {
      // Transaction: BlogPost create + draft status update happen atomically.
      // If either fails, both are rolled back — no orphaned BlogPosts.
      // Timeout raised from default 5s to 30s — BlogPost creation + 2 draft updates
      // can take 20s+ during Supabase pool contention (cold starts, concurrent crons).
      // Error: "Transaction already closed: timeout was 5000 ms, however 21980 ms passed"
      const txResult = await prisma.$transaction(async (tx: typeof prisma) => {
        const bp = await tx.blogPost.create({ data: { ...blogPostData, slug } });
        await tx.articleDraft.update({
          where: { id: draft.id as string },
          data: { ...publishData, blog_post_id: bp.id },
        });
        if (pairedDraft) {
          // No .catch() here — let errors propagate to roll back the entire transaction
          // (Rule #146: paired draft update inside $transaction must NOT swallow errors)
          await tx.articleDraft.update({
            where: { id: pairedDraft.id as string },
            data: { ...publishData, blog_post_id: bp.id },
          });
        }
        return bp;
      }, { timeout: 30000 });
      blogPost = txResult;
      break; // success — exit retry loop
    } catch (createErr) {
      const isP2002 = createErr instanceof Error &&
        (createErr.message.includes("Unique constraint") || (createErr as unknown as Record<string, unknown>).code === "P2002");
      if (isP2002 && slugAttempt < 2) {
        const randomBytes = await import("crypto").then(c => c.randomBytes(4).toString("hex"));
        slug = `${slug.replace(/-[a-f0-9]{8}$/, "")}-${randomBytes}`;
        console.warn(`[content-selector] Slug collision on create (attempt ${slugAttempt + 1}) — retrying with "${slug}"`);
      } else {
        throw createErr;
      }
    }
  }

  // Track URL in indexing system immediately — makes it visible in dashboard
  if (blogPost) {
    const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
    const articleUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    ensureUrlTracked(articleUrl, siteId, `blog/${slug}`).catch((err) => {
      console.warn(`[select-runner] ensureUrlTracked failed for ${articleUrl}:`, err instanceof Error ? err.message : err);
    });
    // Also track the Arabic variant
    ensureUrlTracked(`${getSiteDomain(siteId)}/ar/blog/${slug}`, siteId, `ar/blog/${slug}`).catch((err) => {
      console.warn(`[select-runner] ensureUrlTracked AR failed for ${slug}:`, err instanceof Error ? err.message : err);
    });
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
      await optimisticBlogPostUpdate(blogPost.id, (current) => ({
        content_en: (current.content_en || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "") + partnersHtml,
        content_ar: (current.content_ar || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "") + partnersHtml,
      }), { tag: "[content-selector]" });
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
        await optimisticBlogPostUpdate(blogPost.id, (current) => ({
          content_en: (current.content_en || "") + linksHtml,
        }), { tag: "[content-selector]" });
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

  // Draft status update already happened in the transaction above.
  // Only update TopicProposal (non-critical, outside transaction).
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
