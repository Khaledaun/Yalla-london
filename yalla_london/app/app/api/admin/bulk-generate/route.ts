export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Bulk Article Generator API — Multi-Phased
 *
 * POST — Generates multiple articles in a pipeline with timeout protection.
 *
 * Multi-phase design for Vercel 60s limit:
 *   Phase 1 (start):   Claims topics, generates as many articles as budget allows
 *   Phase 2 (continue): Continues generating remaining articles from a run
 *   Phase 3 (publish_all): Publishes all ready articles
 *
 * Actions:
 *   - start        — Kicks off a bulk generation run (returns runId + partial results)
 *   - continue     — Continues generating remaining articles from a prior run
 *   - status       — Returns current progress for a runId
 *   - publish_all  — Publishes all generated articles from a run
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { logManualAction } from "@/lib/action-logger";

interface BulkArticle {
  index: number;
  keyword: string;
  topicId: string | null;
  pageType: string;
  status: "pending" | "generating" | "generated" | "auditing" | "fixing" | "ready" | "publishing" | "published" | "failed";
  error?: string;
  content?: Record<string, unknown>;
  wordCount?: number;
  seoScore?: number;
  slug?: string;
  blogPostId?: string;
}

interface RunState {
  siteId: string;
  language: string;
  autoPublish: boolean;
  total: number;
  articles: BulkArticle[];
  startedAt: number;
  completedAt?: number;
  phasesCompleted: number;
}

// In-memory run state (survives within a single serverless invocation)
// For cross-invocation persistence, we write to CronJobLog
const activeRuns = new Map<string, RunState>();

const BUDGET_MS = 50_000; // 50s budget — leaves 10s for CronJobLog write + response + Vercel overhead
const PER_ARTICLE_ESTIMATE_MS = 35_000; // AI call ~25-30s + DB ops ~5s — allows 1-2 articles per invocation

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const action = body.action || "start";
  const { getDefaultSiteId, getSiteConfig, getSiteDomain } = await import("@/config/sites");

  const siteId = body.siteId || getDefaultSiteId();
  const site = getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ success: false, error: `Unknown site: ${siteId}` }, { status: 400 });
  }

  // ─── STATUS ──────────────────────────────────────────────────────────────
  if (action === "status") {
    return handleStatus(body, siteId);
  }

  // ─── CONTINUE ────────────────────────────────────────────────────────────
  if (action === "continue") {
    return handleContinue(body, request, site, siteId);
  }

  // ─── START ───────────────────────────────────────────────────────────────
  if (action === "start") {
    return handleStart(body, request, site, siteId);
  }

  // ─── QUEUE (new fast mode) ─────────────────────────────────────────────
  // Creates ArticleDrafts in the pipeline instead of generating inline.
  // Returns in <3s. The content-builder cron processes them asynchronously.
  if (action === "queue") {
    return handleQueue(body, siteId);
  }

  // ─── PUBLISH_ALL ─────────────────────────────────────────────────────────
  if (action === "publish_all") {
    return handlePublishAll(body, request, siteId, getSiteDomain);
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── STATUS Handler ──────────────────────────────────────────────────────────

async function handleStatus(body: Record<string, unknown>, siteId: string) {
  const runId = body.runId as string;
  if (!runId) {
    return NextResponse.json({ success: false, error: "runId required" }, { status: 400 });
  }

  // Check in-memory first
  const run = activeRuns.get(runId);
  if (run) {
    const pending = run.articles.filter(a => a.status === "pending").length;
    return NextResponse.json({
      success: true,
      runId,
      siteId: run.siteId,
      language: run.language,
      total: run.total,
      completed: run.articles.filter(a => ["published", "ready", "failed"].includes(a.status)).length,
      pending,
      needsContinuation: pending > 0 && !run.completedAt,
      articles: run.articles,
      phasesCompleted: run.phasesCompleted,
      done: run.completedAt != null,
    });
  }

  // Check DB log
  const { prisma } = await import("@/lib/db");
  const recentLogs = await prisma.cronJobLog.findMany({
    where: { job_name: "bulk-generate" },
    orderBy: { completed_at: "desc" },
    take: 20,
  });

  const log = recentLogs.find(l => {
    const summary = l.result_summary as Record<string, unknown> | null;
    return summary?.runId === runId;
  });

  if (log) {
    const summary = log.result_summary as Record<string, unknown> | null;
    const logArticles = (summary?.articles as BulkArticle[]) || [];
    const pending = logArticles.filter(a => a.status === "pending").length;
    return NextResponse.json({
      success: true,
      runId,
      siteId: (summary?.siteId as string) || siteId,
      language: (summary?.language as string) || "en",
      total: (summary?.total as number) || 0,
      completed: (summary?.completed as number) || 0,
      pending,
      needsContinuation: pending > 0,
      articles: logArticles,
      phasesCompleted: (summary?.phasesCompleted as number) || 1,
      done: pending === 0,
    });
  }

  return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
}

// ─── QUEUE Handler (fast mode) ───────────────────────────────────────────────
// Instead of generating content inline (which takes 30-40s per article and
// causes Vercel 504 timeouts), this handler creates ArticleDrafts in the
// content pipeline. The content-builder cron (runs every 15 min) will pick
// them up and process through the 8-phase pipeline automatically.
// Returns in <3s — no timeout risk.

interface ResearchedTopicInput {
  keyword: string;
  longTails?: string[];
  searchVolume?: string;
  estimatedMonthlySearches?: string;
  trend?: string;
  trendEvidence?: string;
  competition?: string;
  relevanceScore?: number;
  suggestedPageType?: string;
  contentAngle?: string;
  rationale?: string;
  questions?: string[];
}

async function handleQueue(
  body: Record<string, unknown>,
  siteId: string,
) {
  const language: "en" | "ar" = (body.language as "en" | "ar") || "en";
  const count = Math.min(Math.max((body.count as number) || 1, 1), 20);
  const topicSource: "auto" | "manual" | "researched" = (body.topicSource as "auto" | "manual" | "researched") || "auto";
  const manualKeywords: string[] = (body.keywords as string[]) || [];
  const researchedTopics: ResearchedTopicInput[] = (body.researchedTopics as ResearchedTopicInput[]) || [];
  const pageType = (body.pageType as string) || "guide";

  const { prisma } = await import("@/lib/db");
  const queued: Array<{ keyword: string; draftId: string; topicId: string | null }> = [];

  // ─── RESEARCHED: Topics from AI topic research with full metadata ────────
  // Creates TopicProposal records + ArticleDrafts with pre-populated research_data.
  // The research phase will skip AI (data already present) → saves ~15s per article.
  if (topicSource === "researched" && researchedTopics.length > 0) {
    for (let i = 0; i < Math.min(researchedTopics.length, count); i++) {
      const topic = researchedTopics[i];
      const keyword = topic.keyword?.trim();
      if (!keyword) continue;

      // 1. Create TopicProposal for tracking and attribution
      const proposal = await prisma.topicProposal.create({
        data: {
          site_id: siteId,
          title: keyword,
          locale: language,
          primary_keyword: keyword,
          longtails: topic.longTails || [],
          featured_longtails: (topic.longTails || []).slice(0, 2),
          questions: topic.questions || [],
          intent: "info",
          suggested_page_type: topic.suggestedPageType || pageType,
          status: "generating",
          confidence_score: (topic.relevanceScore ?? 70) / 100,
          evergreen: topic.trend !== "rising",
          source_weights_json: {
            source: "topic-research-api",
            site: siteId,
            searchVolume: topic.searchVolume || "unknown",
            estimatedMonthlySearches: topic.estimatedMonthlySearches || "unknown",
            trend: topic.trend || "stable",
            trendEvidence: topic.trendEvidence || "",
            competition: topic.competition || "medium",
            contentAngle: topic.contentAngle || "",
            rationale: topic.rationale || "",
          },
          authority_links_json: {},
        },
      });

      // 2. Build pre-populated research_data so the research phase can skip AI
      const prePopulatedResearch = {
        serpInsights: {
          topCompetitorHeadings: [],
          avgWordCount: 1800,
          commonSubtopics: (topic.longTails || []).slice(0, 3),
          contentGaps: [],
        },
        targetAudience: {
          searchIntent: "informational",
          audienceNeeds: topic.questions || [],
          painPoints: [],
        },
        keywordData: {
          primary: keyword,
          secondary: (topic.longTails || []).slice(0, 3),
          longTail: topic.longTails || [],
          questions: topic.questions || [],
        },
        contentStrategy: {
          recommendedWordCount: 1800,
          recommendedHeadings: 8,
          toneGuidance: "luxury, authoritative, helpful for Arab travelers",
          uniqueAngle: topic.contentAngle || "",
          affiliateOpportunities: [],
        },
        _prePopulated: true, // Flag for research phase to detect
        _source: "topic-research-api",
        _searchVolume: topic.searchVolume || "unknown",
        _trend: topic.trend || "stable",
        _competition: topic.competition || "medium",
        _rationale: topic.rationale || "",
      };

      // 3. Create ArticleDraft with research_data already populated
      const draft = await prisma.articleDraft.create({
        data: {
          site_id: siteId,
          keyword,
          locale: language,
          current_phase: "research", // Research phase will see pre-populated data and skip AI
          topic_proposal_id: proposal.id,
          generation_strategy: "bulk_queue_researched",
          research_data: prePopulatedResearch,
          seo_meta: {
            pageType: topic.suggestedPageType || pageType,
            contentAngle: topic.contentAngle || "",
            longTails: topic.longTails || [],
            questions: topic.questions || [],
          },
        },
      });
      queued.push({ keyword, draftId: draft.id, topicId: proposal.id });
    }
  }
  // ─── MANUAL: Keywords typed by user ──────────────────────────────────────
  else if (topicSource === "manual" && manualKeywords.length > 0) {
    for (let i = 0; i < Math.min(manualKeywords.length, count); i++) {
      const keyword = manualKeywords[i].trim();
      if (!keyword) continue;

      const draft = await prisma.articleDraft.create({
        data: {
          site_id: siteId,
          keyword,
          locale: language,
          current_phase: "research",
          generation_strategy: "bulk_queue_manual",
          seo_meta: { pageType },
        },
      });
      queued.push({ keyword, draftId: draft.id, topicId: null });
    }
  }
  // ─── AUTO: Claim from TopicProposal queue ────────────────────────────────
  else {
    const candidates = await prisma.topicProposal.findMany({
      where: {
        status: { in: ["ready", "queued", "planned", "proposed"] },
        locale: language,
        site_id: siteId,
      },
      orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
      take: count,
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No topics available. Generate topics first (Sites tab → Gen Topics), or use manual keywords.",
      }, { status: 404 });
    }

    for (const c of candidates) {
      // Atomically claim the topic
      const claimed = await prisma.topicProposal.updateMany({
        where: { id: c.id, status: { in: ["ready", "queued", "planned", "proposed"] } },
        data: { status: "generating", updated_at: new Date() },
      });
      if (claimed.count === 0) continue;

      // Pre-populate research_data from TopicProposal metadata
      const topicResearch = {
        keywordData: {
          primary: c.primary_keyword,
          secondary: (c.longtails || []).slice(0, 3),
          longTail: c.longtails || [],
          questions: c.questions || [],
        },
        _prePopulated: true,
        _source: "topic_proposal",
      };

      const draft = await prisma.articleDraft.create({
        data: {
          site_id: siteId,
          keyword: c.primary_keyword,
          locale: language,
          current_phase: "research",
          topic_proposal_id: c.id,
          generation_strategy: "bulk_queue_topic",
          research_data: (c.longtails?.length > 0 || c.questions?.length > 0) ? topicResearch : undefined,
          seo_meta: { pageType: c.suggested_page_type || pageType },
        },
      });
      queued.push({ keyword: c.primary_keyword, draftId: draft.id, topicId: c.id });
    }

    if (queued.length === 0) {
      return NextResponse.json({
        success: false,
        error: "All available topics are already being processed.",
      }, { status: 409 });
    }
  }

  if (queued.length === 0) {
    return NextResponse.json({
      success: false,
      error: "No valid topics to queue. Check your input.",
    }, { status: 400 });
  }

  logManualAction(null, { action: "bulk-queue", resource: "draft", siteId, success: true, summary: `Queued ${queued.length} article(s) in pipeline (${topicSource} mode, ${language})`, details: { queued: queued.length, topicSource, language, keywords: queued.map(q => q.keyword) } }).catch(() => {});

  return NextResponse.json({
    success: true,
    mode: "queued",
    queued: queued.length,
    message: `${queued.length} article${queued.length === 1 ? "" : "s"} queued in the content pipeline. The content-builder cron will process them automatically (runs every 15 minutes). Check the Pipeline tab for progress.`,
    articles: queued.map((q) => ({
      keyword: q.keyword,
      draftId: q.draftId,
      topicId: q.topicId,
      status: "queued_in_pipeline",
    })),
  });
}

// ─── START Handler ───────────────────────────────────────────────────────────

async function handleStart(
  body: Record<string, unknown>,
  request: NextRequest,
  site: { id: string; name: string; destination: string; systemPromptEN: string; systemPromptAR: string },
  siteId: string,
) {
  const language: "en" | "ar" = (body.language as "en" | "ar") || "en";
  const count = Math.min(Math.max((body.count as number) || 1, 1), 20); // 1-20 articles
  const topicSource: "auto" | "manual" = (body.topicSource as "auto" | "manual") || "auto";
  const manualKeywords: string[] = (body.keywords as string[]) || [];
  const pageType = (body.pageType as string) || "guide";
  const autoPublish = body.autoPublish === true; // Default OFF — require explicit opt-in

  const runId = `bulk-${siteId}-${Date.now()}`;
  const startTime = Date.now();

  // Build topic list
  const articles: BulkArticle[] = [];

  if (topicSource === "manual" && manualKeywords.length > 0) {
    for (let i = 0; i < Math.min(manualKeywords.length, count); i++) {
      articles.push({
        index: i,
        keyword: manualKeywords[i].trim(),
        topicId: null,
        pageType,
        status: "pending",
      });
    }
  } else {
    const { prisma } = await import("@/lib/db");
    const candidates = await prisma.topicProposal.findMany({
      where: {
        status: { in: ["ready", "queued", "planned", "proposed"] },
        locale: language,
        site_id: siteId,
      },
      orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
      take: count,
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No topics available. Generate topics first (Sites tab → Gen Topics), or use manual keywords.",
      }, { status: 404 });
    }

    // Claim topics atomically
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const claimed = await prisma.topicProposal.updateMany({
        where: { id: c.id, status: { in: ["ready", "queued", "planned", "proposed"] } },
        data: { status: "generating", updated_at: new Date() },
      });

      if (claimed.count > 0) {
        articles.push({
          index: i,
          keyword: c.primary_keyword,
          topicId: c.id,
          pageType: c.suggested_page_type || pageType,
          status: "pending",
        });
      }
    }

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: "All available topics are already being processed.",
      }, { status: 409 });
    }
  }

  // Store run state
  const runState: RunState = {
    siteId,
    language,
    autoPublish,
    total: articles.length,
    articles,
    startedAt: startTime,
    phasesCompleted: 0,
  };
  activeRuns.set(runId, runState);

  // Process as many articles as budget allows
  await processArticles(runState, site, siteId, startTime, request);

  // Persist to CronJobLog
  await persistRunState(runId, runState, siteId, startTime);

  const pending = runState.articles.filter(a => a.status === "pending").length;
  const generated = runState.articles.filter(a => ["generated", "ready", "published"].includes(a.status)).length;
  const published = runState.articles.filter(a => a.status === "published").length;
  const failed = runState.articles.filter(a => a.status === "failed").length;

  return NextResponse.json({
    success: true,
    runId,
    total: articles.length,
    generated,
    published,
    failed,
    pending,
    needsContinuation: pending > 0,
    phasesCompleted: runState.phasesCompleted,
    articles: articles.map(a => ({
      index: a.index,
      keyword: a.keyword,
      pageType: a.pageType,
      status: a.status,
      wordCount: a.wordCount,
      seoScore: a.seoScore,
      slug: a.slug,
      blogPostId: a.blogPostId,
      error: a.error,
    })),
    elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    message: pending > 0
      ? `Phase 1 complete: ${generated} generated, ${pending} remaining. Tap "Continue" to generate the rest.`
      : `All ${articles.length} articles processed.`,
  });
}

// ─── CONTINUE Handler ────────────────────────────────────────────────────────

async function handleContinue(
  body: Record<string, unknown>,
  request: NextRequest,
  site: { id: string; name: string; destination: string; systemPromptEN: string; systemPromptAR: string },
  siteId: string,
) {
  const runId = body.runId as string;
  if (!runId) {
    return NextResponse.json({ success: false, error: "runId required" }, { status: 400 });
  }

  let runState = activeRuns.get(runId);

  // If not in memory, try to restore from CronJobLog
  if (!runState) {
    const restored = await restoreRunState(runId);
    if (!restored) {
      return NextResponse.json({ success: false, error: "Run not found or expired" }, { status: 404 });
    }
    runState = restored;
    activeRuns.set(runId, runState);
  }

  const pending = runState.articles.filter(a => a.status === "pending").length;
  if (pending === 0) {
    return NextResponse.json({
      success: true,
      runId,
      message: "All articles already processed",
      needsContinuation: false,
      articles: runState.articles.map(a => ({
        index: a.index, keyword: a.keyword, pageType: a.pageType, status: a.status,
        wordCount: a.wordCount, seoScore: a.seoScore, slug: a.slug, blogPostId: a.blogPostId, error: a.error,
      })),
    });
  }

  const startTime = Date.now();

  // Continue processing (processArticles() increments phasesCompleted internally)
  await processArticles(runState, site, siteId, startTime, request);

  // Persist updated state
  await persistRunState(runId, runState, siteId, runState.startedAt);

  const newPending = runState.articles.filter(a => a.status === "pending").length;
  const generated = runState.articles.filter(a => ["generated", "ready", "published"].includes(a.status)).length;
  const published = runState.articles.filter(a => a.status === "published").length;
  const failed = runState.articles.filter(a => a.status === "failed").length;

  return NextResponse.json({
    success: true,
    runId,
    total: runState.total,
    generated,
    published,
    failed,
    pending: newPending,
    needsContinuation: newPending > 0,
    phasesCompleted: runState.phasesCompleted,
    articles: runState.articles.map(a => ({
      index: a.index, keyword: a.keyword, pageType: a.pageType, status: a.status,
      wordCount: a.wordCount, seoScore: a.seoScore, slug: a.slug, blogPostId: a.blogPostId, error: a.error,
    })),
    elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    message: newPending > 0
      ? `Phase ${runState.phasesCompleted} complete: ${generated} total generated, ${newPending} remaining.`
      : `All ${runState.total} articles processed across ${runState.phasesCompleted} phases.`,
  });
}

// ─── PUBLISH_ALL Handler ─────────────────────────────────────────────────────

async function handlePublishAll(
  body: Record<string, unknown>,
  request: NextRequest,
  siteId: string,
  getSiteDomain: (id: string) => string,
) {
  const runId = body.runId as string;
  if (!runId) {
    return NextResponse.json({ success: false, error: "runId required" }, { status: 400 });
  }

  // Restore from memory or CronJobLog (same pattern as handleContinue)
  let run = activeRuns.get(runId);
  if (!run) {
    const restored = await restoreRunState(runId);
    if (!restored) {
      return NextResponse.json({ success: false, error: "Run not found or expired" }, { status: 404 });
    }
    run = restored;
    activeRuns.set(runId, run);
  }

  // "ready" articles with content in memory can be published directly.
  // Articles restored from CronJobLog have content stripped — re-generate is required.
  const readyWithContent = run.articles.filter(a => a.status === "ready" && a.content);
  const readyWithoutContent = run.articles.filter(a => a.status === "ready" && !a.content);

  if (readyWithContent.length === 0 && readyWithoutContent.length === 0) {
    return NextResponse.json({ success: false, error: "No ready articles to publish" }, { status: 400 });
  }

  if (readyWithContent.length === 0 && readyWithoutContent.length > 0) {
    return NextResponse.json({
      success: false,
      error: `${readyWithoutContent.length} articles are ready but their content was lost (server restarted). Tap "Continue" to re-generate, then "Publish All".`,
      needsRegeneration: true,
      readyCount: readyWithoutContent.length,
    }, { status: 409 });
  }

  const { prisma } = await import("@/lib/db");
  const startTime = Date.now();
  let pubCount = 0;

  for (const article of readyWithContent) {
    // Budget guard for publish_all
    if (Date.now() - startTime > BUDGET_MS) {
      article.error = "Budget exceeded — remaining articles not published";
      break;
    }

    await publishArticle(article, article.content!, siteId, getSiteDomain, prisma);
    if (article.status === "published") pubCount++;
  }

  return NextResponse.json({
    success: true,
    published: pubCount,
    total: readyWithContent.length,
    lostContent: readyWithoutContent.length,
  });
}

// ─── Core Generation Logic ───────────────────────────────────────────────────

async function processArticles(
  runState: RunState,
  site: { id: string; name: string; destination: string; systemPromptEN: string; systemPromptAR: string },
  siteId: string,
  phaseStartTime: number,
  request: NextRequest,
) {
  const { generateJSON } = await import("@/lib/ai/provider");
  const { CONTENT_TYPES } = await import("@/lib/content-automation/content-types");
  const { getSiteDomain } = await import("@/config/sites");

  const language = runState.language as "en" | "ar";
  const baseSystemPrompt = language === "en"
    ? site.systemPromptEN
    : site.systemPromptAR;

  const systemPrompt = `${baseSystemPrompt}

CONTENT QUALITY REQUIREMENTS:
- First-hand experience is the #1 ranking signal (Google Jan 2026 Authenticity Update)
- Include sensory details: what you see, hear, smell, taste at specific locations
- Add 2-3 "insider tips" per article — real advice a tourist guide would share
- Include at least one honest limitation or "what most guides won't tell you" moment
- NEVER use these AI-generic phrases: "nestled in the heart of", "whether you're a", "look no further", "in conclusion", "it's worth noting"
- Vary sentence length: mix short punchy sentences with longer descriptive ones`;

  const pendingArticles = runState.articles.filter(a => a.status === "pending");

  for (const article of pendingArticles) {
    // Budget check: need at least PER_ARTICLE_ESTIMATE_MS remaining
    const elapsed = Date.now() - phaseStartTime;
    if (elapsed > BUDGET_MS - PER_ARTICLE_ESTIMATE_MS) {
      // Not enough time for another article — stop this phase
      break;
    }

    // ── GENERATE ──
    article.status = "generating";

    try {
      const contentType = CONTENT_TYPES[article.pageType] || CONTENT_TYPES.guide;
      const prompt = buildPrompt(article.keyword, article.pageType, language, {
        name: site.name,
        destination: site.destination,
      }, contentType);

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 6000,
        temperature: 0.7,
        taskType: "content_generation",
        calledFrom: "bulk-generate",
      });

      const bodyHtml = (result.body as string) || (result.bodyTranslation as string) || "";
      article.wordCount = countWords(bodyHtml);
      article.seoScore = (result.seoScore as number) || 80;
      article.content = result;
      article.status = "generated";

    } catch (err) {
      article.status = "failed";
      article.error = err instanceof Error ? err.message : "Generation failed";

      // Revert topic
      if (article.topicId) {
        const { prisma } = await import("@/lib/db");
        await prisma.topicProposal.updateMany({
          where: { id: article.topicId, status: "generating" },
          data: { status: "ready" },
        }).catch((e: unknown) => console.warn("[bulk-generate] Topic revert failed:", e));
      }
      continue;
    }

    // ── AUDIT & FIX ──
    article.status = "auditing";
    const content = article.content!;
    const contentType = CONTENT_TYPES[article.pageType] || CONTENT_TYPES.guide;

    // Check word count against type-specific minimum (80% threshold — below this, content is too thin)
    if (article.wordCount && article.wordCount < contentType.minWords * 0.8) {
      article.status = "failed";
      article.error = `Only ${article.wordCount} words — minimum for ${article.pageType} is ${contentType.minWords}`;
      continue;
    }

    // Auto-fix: trim meta description if too long
    article.status = "fixing";
    const metaDesc = (content.metaDescription as string) || "";
    if (metaDesc.length > 160) {
      content.metaDescription = metaDesc.substring(0, 155).replace(/\s+\S*$/, "") + "…";
    }
    const metaTitle = (content.metaTitle as string) || "";
    if (metaTitle.length > 60) {
      content.metaTitle = metaTitle.substring(0, 57).replace(/\s+\S*$/, "") + "…";
    }

    article.status = "ready";

    // ── AUTO-PUBLISH (if enabled and budget allows) ──
    if (runState.autoPublish) {
      const publishElapsed = Date.now() - phaseStartTime;
      if (publishElapsed < BUDGET_MS - 8000) { // 8s buffer for DB writes during publish
        await publishArticle(article, content, siteId, getSiteDomain);
      }
    }
  }

  // Check if all articles are done
  const stillPending = runState.articles.filter(a => a.status === "pending").length;
  if (stillPending === 0) {
    runState.completedAt = Date.now();
  }
  runState.phasesCompleted++;
}

// ─── Publish a single article ────────────────────────────────────────────────

async function publishArticle(
  article: BulkArticle,
  content: Record<string, unknown>,
  siteId: string,
  getSiteDomain: (id: string) => string,
  prismaInstance?: InstanceType<typeof import("@prisma/client").PrismaClient>,
) {
  article.status = "publishing";

  try {
    const prisma = prismaInstance || (await import("@/lib/db")).prisma;

    const { sanitizeTitle, sanitizeMetaDescription, sanitizeContentBody } = await import("@/lib/content-pipeline/title-sanitizer");
    const titleEn = sanitizeTitle((content.title as string) || article.keyword);
    let slug = titleEn
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);

    // Slug dedup: append -2, -3, etc. if slug already exists (globally unique constraint)
    let slugAttempt = slug;
    let suffix = 1;
    while (true) {
      const existing = await prisma.blogPost.findFirst({
        where: { slug: slugAttempt, siteId, deletedAt: null },
      });
      if (!existing) break;
      suffix++;
      slugAttempt = `${slug.substring(0, 76)}-${suffix}`;
      if (suffix > 10) {
        article.status = "failed";
        article.error = `Slug "${slug}" has 10+ duplicates — skipping`;
        return;
      }
    }
    slug = slugAttempt;

    // Get category + author
    let categoryId: string | undefined;
    const cat = await prisma.category.findFirst({ where: { slug: "general" } });
    categoryId = cat?.id;
    if (!categoryId) {
      const newCat = await prisma.category.create({
        data: { name_en: "General", name_ar: "عام", slug: "general" },
      });
      categoryId = newCat.id;
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
    const authorId = adminUser?.id || (await prisma.user.upsert({
      where: { email: "system@zenitha.luxury" },
      update: {},
      create: { email: "system@zenitha.luxury", name: "Editorial Team", role: "admin" },
    })).id;

    const bodyHtml = (content.body as string) || "";

    // ── Pre-publication gate check ─────────────────────────────────────
    // Run all 14 quality checks before allowing publish. Fail-closed:
    // if the gate fails, article is created as unpublished (draft).
    let passesGate = false;
    try {
      const { runPrePublicationGate } = await import("@/lib/seo/orchestrator/pre-publication-gate");
      const domain = getSiteDomain(siteId);
      const gateResult = await runPrePublicationGate(
        `${domain}/blog/${slug}`,
        {
          title_en: titleEn,
          meta_title_en: (content.metaTitle as string) || titleEn.substring(0, 60),
          meta_description_en: (content.metaDescription as string) || "",
          content_en: bodyHtml,
          seo_score: (content.seoScore as number) || 65,
          locale: "en",
          keywords_json: (content.keywords as string[]) || [],
          siteId,
        },
        domain,
        { skipRouteCheck: true },
      );
      passesGate = gateResult.allowed;
      if (!gateResult.allowed) {
        console.warn(`[bulk-generate] Pre-pub gate BLOCKED "${titleEn}": ${gateResult.checks.filter(c => !c.passed && c.severity !== "warning").map(c => c.name).join(", ")}`);
      }
    } catch (gateErr) {
      // Gate failure = fail-closed → publish as draft
      console.warn("[bulk-generate] Pre-pub gate error (fail-closed):", gateErr instanceof Error ? gateErr.message : String(gateErr));
    }

    // CRITICAL: title_ar and content_ar are required non-nullable String fields
    const blogPost = await prisma.blogPost.create({
      data: {
        title_en: titleEn,
        title_ar: (content.titleTranslation as string) || titleEn,
        excerpt_en: (content.excerpt as string) || null,
        excerpt_ar: (content.excerptTranslation as string) || null,
        content_en: sanitizeContentBody(bodyHtml),
        content_ar: sanitizeContentBody((content.bodyTranslation as string) || bodyHtml),
        meta_title_en: sanitizeTitle((content.metaTitle as string) || titleEn.substring(0, 60)),
        meta_description_en: sanitizeMetaDescription((content.metaDescription as string) || ""),
        meta_title_ar: (content.metaTitleTranslation as string) || null,
        meta_description_ar: (content.metaDescriptionTranslation as string) || null,
        slug,
        tags: [...((content.tags as string[]) || []), "ai-generated", "bulk-generated", `site-${siteId}`],
        published: passesGate,
        siteId,
        category_id: categoryId,
        author_id: authorId,
        page_type: (content.pageType as string) || article.pageType,
        seo_score: (content.seoScore as number) || 65, // Conservative default — don't inflate scores
        keywords_json: (content.keywords as string[]) || [],
        questions_json: (content.questions as string[]) || [],
      },
    });

    article.blogPostId = blogPost.id;
    article.slug = slug;
    article.status = passesGate ? "published" : "ready";

    // Mark topic as published
    if (article.topicId) {
      await prisma.topicProposal.updateMany({
        where: { id: article.topicId },
        data: { status: "published" },
      }).catch((e: unknown) => console.warn("[bulk-generate] Topic status update failed:", e));
    }

    // Track URL in indexing system immediately
    const domain = getSiteDomain(siteId);
    const articleUrl = `${domain}/blog/${slug}`;
    try {
      const { ensureUrlTracked, submitToIndexNow } = await import("@/lib/seo/indexing-service");
      ensureUrlTracked(articleUrl, siteId, `blog/${slug}`).catch(() => {});

      // Submit to IndexNow only if article passed the gate and was published
      if (passesGate) {
        submitToIndexNow([articleUrl]).catch((e: Error) =>
          console.warn("[bulk-generate] IndexNow failed:", e.message)
        );
      }
    } catch (e) {
      console.warn("[bulk-generate] IndexNow/tracking setup failed:", e);
    }
  } catch (err) {
    article.status = "failed";
    article.error = `Publish failed: ${err instanceof Error ? err.message : "Unknown"}`;
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function persistRunState(runId: string, runState: RunState, siteId: string, startTime: number) {
  try {
    const { prisma } = await import("@/lib/db");
    const generated = runState.articles.filter(a => ["generated", "ready", "published"].includes(a.status)).length;
    const published = runState.articles.filter(a => a.status === "published").length;
    const failed = runState.articles.filter(a => a.status === "failed").length;

    await prisma.cronJobLog.create({
      data: {
        job_name: "bulk-generate",
        job_type: "manual",
        status: failed === runState.articles.length ? "failed" : "completed",
        site_id: siteId,
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        items_processed: runState.articles.length,
        items_succeeded: generated,
        items_failed: failed,
        result_summary: {
          runId,
          siteId,
          language: runState.language,
          autoPublish: runState.autoPublish,
          total: runState.articles.length,
          generated,
          published,
          failed,
          completed: generated + failed,
          phasesCompleted: runState.phasesCompleted,
          articles: runState.articles.map(a => ({
            index: a.index,
            keyword: a.keyword,
            topicId: a.topicId,
            pageType: a.pageType,
            status: a.status,
            wordCount: a.wordCount,
            seoScore: a.seoScore,
            slug: a.slug,
            blogPostId: a.blogPostId,
            error: a.error,
            // Don't persist full content — too large for JSON field
          })),
        },
      },
    });
  } catch (e) {
    console.warn("[bulk-generate] CronJobLog write failed:", e);
  }
}

async function restoreRunState(runId: string): Promise<RunState | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const recentLogs = await prisma.cronJobLog.findMany({
      where: { job_name: "bulk-generate" },
      orderBy: { completed_at: "desc" },
      take: 20,
    });

    const log = recentLogs.find(l => {
      const summary = l.result_summary as Record<string, unknown> | null;
      return summary?.runId === runId;
    });

    if (!log) return null;

    const summary = log.result_summary as Record<string, unknown>;
    const articles = (summary.articles as BulkArticle[]) || [];

    return {
      siteId: (summary.siteId as string) || "",
      language: (summary.language as string) || "en",
      autoPublish: (summary.autoPublish as boolean) ?? false,
      total: (summary.total as number) || 0,
      articles,
      startedAt: log.started_at?.getTime() || Date.now(),
      phasesCompleted: (summary.phasesCompleted as number) || 1,
    };
  } catch (e) {
    console.warn("[bulk-generate] restoreRunState failed:", e);
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPrompt(
  keyword: string,
  pageType: string,
  language: "en" | "ar",
  site: { name: string; destination: string },
  contentType: { promptGuidelinesEN: string; promptGuidelinesAR: string; minWords: number },
): string {
  const guidelines = language === "en"
    ? contentType.promptGuidelinesEN
    : contentType.promptGuidelinesAR;

  const filled = guidelines
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{siteName\}/g, site.name)
    .replace(/\{destination\}/g, site.destination);

  const jsonSpec = language === "en"
    ? `

Return JSON:
{
  "title": "Title with keyword (50-60 chars)",
  "titleTranslation": "Arabic title",
  "body": "Full HTML (h2,h3,p,ul/ol,a). MINIMUM ${contentType.minWords} words.",
  "bodyTranslation": "Full Arabic HTML translation",
  "excerpt": "Excerpt (120-160 chars)",
  "excerptTranslation": "Arabic excerpt",
  "metaTitle": "SEO title (50-60 chars)",
  "metaTitleTranslation": "Arabic meta title",
  "metaDescription": "SEO description (120-160 chars)",
  "metaDescriptionTranslation": "Arabic meta description",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "keywords": ["primary","secondary1","secondary2"],
  "questions": ["Q1?","Q2?","Q3?"],
  "pageType": "${pageType}",
  "seoScore": 90
}`
    : `

أرجع JSON:
{
  "title": "عنوان (50-60 حرف)",
  "titleTranslation": "English title",
  "body": "HTML كامل (${contentType.minWords}+ كلمة)",
  "bodyTranslation": "Full English translation",
  "excerpt": "مقتطف (120-160 حرف)",
  "excerptTranslation": "English excerpt",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaTitleTranslation": "English meta title",
  "metaDescription": "وصف SEO (120-160 حرف)",
  "metaDescriptionTranslation": "English meta description",
  "tags": ["وسم1","وسم2","وسم3"],
  "keywords": ["رئيسية","ثانوية"],
  "questions": ["سؤال1؟","سؤال2؟"],
  "pageType": "${pageType}",
  "seoScore": 90
}`;

  return filled + jsonSpec;
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export const POST = withAdminAuth(handlePost);
