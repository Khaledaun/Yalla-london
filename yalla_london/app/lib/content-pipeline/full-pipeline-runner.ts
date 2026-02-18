/**
 * Full Pipeline Runner — End-to-End Article Generation + Publishing + Indexing
 *
 * Orchestrates the entire content lifecycle in a single call:
 *   1. Pick/create a topic → TopicProposal
 *   2. Create an ArticleDraft and run ALL 8 phases in a loop
 *   3. Promote to BlogPost (published, bilingual, with affiliate links)
 *   4. Submit to IndexNow for Google discovery
 *
 * Designed for Vercel Pro's 60s limit — uses a 55s budget with 5s final buffer.
 * If time runs out mid-pipeline, saves progress so the regular 15-min cron can continue.
 *
 * Callable from:
 * - /api/admin/full-pipeline-run (dedicated route)
 * - /api/admin/content-generation-monitor (action: "full_pipeline")
 * - Dashboard "Generate & Publish" button
 */

import { logCronExecution } from "@/lib/cron-logger";

const DEFAULT_TIMEOUT_MS = 55_000; // 55s budget — 5s buffer for response serialization

export interface FullPipelineStep {
  /** Which phase ran */
  phase: string;
  success: boolean;
  durationMs: number;
  /** Human-readable description of what this step was doing */
  description: string;
  error?: string;
  data?: Record<string, unknown>;
}

/** Detailed failure diagnosis — WHAT failed, WHERE, and WHY */
export interface FailureDiagnosis {
  /** Plain-language summary of the failure */
  summary: string;
  /** WHAT was happening when it failed */
  what: string;
  /** WHERE in the pipeline (phase name + step number) */
  where: string;
  /** WHY it failed (root cause + technical details) */
  why: string;
  /** What to do next to fix it */
  fix: string;
  /** The specific error message from the failed step */
  errorDetail: string;
  /** Successful phases that completed before the failure */
  completedBefore: string[];
}

export interface FullPipelineResult {
  success: boolean;
  message: string;
  draftId?: string;
  pairedDraftId?: string;
  blogPostId?: string;
  blogPostSlug?: string;
  blogPostUrl?: string;
  keyword?: string;
  locale?: string;
  siteId?: string;
  /** Every phase that ran, in order */
  steps: FullPipelineStep[];
  /** Where the pipeline stopped (completed, budget_exhausted, error) */
  stopReason: "completed" | "budget_exhausted" | "error" | "no_topic";
  /** Was the article published as a BlogPost? */
  published: boolean;
  /** Was the URL submitted to IndexNow? */
  indexed: boolean;
  qualityScore?: number;
  seoScore?: number;
  wordCount?: number;
  durationMs: number;
  /** Present only when the pipeline failed — detailed what/where/why */
  failureDiagnosis?: FailureDiagnosis;
}

export interface FullPipelineOptions {
  timeoutMs?: number;
  /** Specific keyword to generate an article about (skips topic queue) */
  keyword?: string;
  /** Target site ID (defaults to first active site) */
  siteId?: string;
  /** Locale for the primary draft (default: "en") */
  locale?: string;
  /** Skip bilingual pairing — generate only one language (faster) */
  singleLanguage?: boolean;
}

/** Human-readable descriptions of what each phase does */
const PHASE_DESCRIPTIONS: Record<string, string> = {
  topic_selection: "Picking a topic/keyword for the article",
  draft_creation: "Creating the article draft record in the database",
  research: "Analyzing the keyword with AI — finding competitors, search intent, long-tail keywords, and content gaps",
  outline: "Planning the article structure — headings, sections, word targets, affiliate placements",
  drafting: "Writing the article content section by section using AI",
  assembly: "Merging all sections into a polished HTML article with transitions and internal links",
  images: "Finding and injecting relevant images from the photo library or Unsplash",
  seo: "Generating SEO metadata — meta title, description, schema markup, keyword optimization",
  scoring: "Quality gate check — scoring word count, headings, meta tags, images, internal links",
  publish: "Promoting the article from reservoir to a live published BlogPost with affiliate links",
  indexing: "Submitting the published URL to IndexNow for Google discovery",
  sweeper: "Running the sweeper agent to recover any stuck or failed drafts in the pipeline",
  fatal: "Pipeline crashed with an unrecoverable error",
};

/** Build a detailed failure diagnosis from the steps */
function buildFailureDiagnosis(steps: FullPipelineStep[], keyword?: string): FailureDiagnosis {
  const failedStep = [...steps].reverse().find((s) => !s.success);
  const completedBefore = steps.filter((s) => s.success).map((s) => s.phase);

  if (!failedStep) {
    return {
      summary: "No specific failure detected, but the pipeline did not complete successfully.",
      what: "The pipeline stopped without an explicit error.",
      where: "Unknown — check the steps array for details.",
      why: "Possibly ran out of time budget (55s Vercel limit).",
      fix: "Try again — the 15-minute cron will pick up where this left off.",
      errorDetail: "No error captured",
      completedBefore,
    };
  }

  const stepIndex = steps.indexOf(failedStep) + 1;
  const phaseName = failedStep.phase;
  const errorDetail = failedStep.error || "No error details captured";

  // Diagnose the root cause based on the phase and error message
  const { why, fix } = diagnoseError(phaseName, errorDetail);

  return {
    summary: `Pipeline failed at step ${stepIndex} (${phaseName}): ${errorDetail.substring(0, 200)}`,
    what: PHASE_DESCRIPTIONS[phaseName] || `Running the "${phaseName}" phase`,
    where: `Step ${stepIndex} of ${steps.length} — "${phaseName}" phase (after ${completedBefore.length} successful steps: ${completedBefore.join(" → ") || "none"})`,
    why,
    fix,
    errorDetail,
    completedBefore,
  };
}

/** Diagnose specific error causes and suggest fixes */
function diagnoseError(phase: string, error: string): { why: string; fix: string } {
  const errorLower = error.toLowerCase();

  // AI provider errors
  if (errorLower.includes("all ai providers failed") || errorLower.includes("no api key")) {
    return {
      why: "No AI provider is configured. The pipeline needs at least one AI API key (Grok/xAI, Claude, OpenAI, or Gemini) to generate content.",
      fix: "Add an AI API key in Vercel environment variables. Cheapest option: add XAI_API_KEY for Grok ($0.20/1M tokens). Alternatives: ANTHROPIC_API_KEY (Claude), OPENAI_API_KEY, or GOOGLE_API_KEY (Gemini).",
    };
  }

  if (errorLower.includes("grok api error") || errorLower.includes("api.x.ai")) {
    return {
      why: `The Grok/xAI API returned an error. This could be: invalid API key, rate limit exceeded, or the xAI service is down.`,
      fix: "Check that XAI_API_KEY is valid in Vercel env vars. Try the API at https://console.x.ai to verify your key. If rate-limited, wait a few minutes and retry.",
    };
  }

  if (errorLower.includes("claude api error") || errorLower.includes("anthropic")) {
    return {
      why: "The Claude/Anthropic API returned an error. Possible causes: invalid key, billing limit, or service outage.",
      fix: "Check ANTHROPIC_API_KEY in Vercel env vars. Verify at https://console.anthropic.com that your key is active and has credits.",
    };
  }

  if (errorLower.includes("openai api error")) {
    return {
      why: "The OpenAI API returned an error. Possible causes: invalid key, billing limit, rate limit, or model access issue.",
      fix: "Check OPENAI_API_KEY in Vercel env vars. Verify at https://platform.openai.com that your key is active.",
    };
  }

  // JSON parsing errors
  if (errorLower.includes("invalid json") || errorLower.includes("json.parse") || errorLower.includes("unexpected token")) {
    return {
      why: `The AI returned malformed JSON that couldn't be parsed. This happens when the AI produces incomplete output (truncated by token limit) or wraps JSON in markdown.`,
      fix: "This is usually transient — retry the pipeline. If it persists, the AI model may need a higher max_tokens setting for this phase.",
    };
  }

  // Database errors
  if (errorLower.includes("does not exist") || errorLower.includes("p2021")) {
    return {
      why: "A required database table doesn't exist. The Prisma migrations haven't been applied to the production database.",
      fix: "Click 'Fix Database' in the Generation Monitor, or deploy the latest code to trigger automatic migrations.",
    };
  }

  if (errorLower.includes("unique constraint") || errorLower.includes("p2002")) {
    return {
      why: "A database unique constraint was violated — trying to create a record that already exists (likely a duplicate slug or email).",
      fix: "This is usually transient. Retry the pipeline — it will generate a different slug. If it persists, check the BlogPost table for duplicate entries.",
    };
  }

  if (errorLower.includes("prisma") || errorLower.includes("database") || errorLower.includes("connection")) {
    return {
      why: "A database connection or query error occurred. The Supabase PostgreSQL database may be unreachable or the connection pool is exhausted.",
      fix: "Check Supabase dashboard for database health. Verify DATABASE_URL and DIRECT_URL in Vercel env vars. Try again in a minute.",
    };
  }

  // Network/timeout errors
  if (errorLower.includes("timeout") || errorLower.includes("aborterror") || errorLower.includes("timed out")) {
    return {
      why: `An AI API call or network request timed out. Each AI call has a 30s limit. The ${phase} phase may require more time than available.`,
      fix: "Retry — the pipeline saves progress, so subsequent runs continue from where it left off. If the phase consistently times out, the keyword may be too complex.",
    };
  }

  if (errorLower.includes("fetch failed") || errorLower.includes("econnrefused") || errorLower.includes("network")) {
    return {
      why: "A network request failed — the AI API or external service was unreachable.",
      fix: "Check your internet connection and AI provider status pages. Retry in a minute.",
    };
  }

  // Quality gate failures
  if (phase === "scoring" && (errorLower.includes("quality") || errorLower.includes("below threshold"))) {
    return {
      why: "The article didn't pass the quality gate (minimum score: 50/100). Common reasons: too short, missing headings, no internal links, weak SEO metadata.",
      fix: "The pipeline will retry with a different approach. If the keyword consistently fails, try a different topic. Check the quality_score and seo_score in the draft for specific gaps.",
    };
  }

  // Phase-specific generic messages
  const phaseHints: Record<string, string> = {
    research: "The AI couldn't analyze the keyword. This may be a very niche or unusual topic.",
    outline: "The AI couldn't create a structured outline. The research data may have been incomplete.",
    drafting: "The AI couldn't write one or more sections. This could be a token limit issue or the outline was too complex.",
    assembly: "The AI couldn't merge and polish the sections. The draft content may have been too long or malformed.",
    images: "Image selection/injection failed. This is usually non-fatal — articles can publish without images.",
    seo: "SEO metadata generation failed. The AI couldn't produce valid meta tags.",
    publish: "The article couldn't be promoted to a BlogPost. Check for database constraints or missing required fields.",
    indexing: "URL submission to IndexNow failed. Check INDEXNOW_KEY in env vars.",
  };

  return {
    why: phaseHints[phase] || `The "${phase}" phase encountered an unexpected error: ${error.substring(0, 300)}`,
    fix: "Retry the pipeline. The draft's progress is saved, so the 15-minute cron will continue from the last successful phase. If it keeps failing, check the CronJobLog in the dashboard for more details.",
  };
}

/**
 * Run the full article generation pipeline end-to-end.
 *
 * This is the "one button" version: give it a keyword (or let it pick one)
 * and it produces a published, indexed BlogPost.
 */
export async function runFullPipeline(
  options: FullPipelineOptions = {},
): Promise<FullPipelineResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const pipelineStart = Date.now();
  const steps: FullPipelineStep[] = [];

  const deadline = {
    remainingMs: () => timeoutMs - (Date.now() - pipelineStart),
    isExpired: () => Date.now() - pipelineStart >= timeoutMs,
    /** Check if we have at least `ms` milliseconds remaining */
    hasAtLeast: (ms: number) => (timeoutMs - (Date.now() - pipelineStart)) >= ms,
  };

  const elapsed = () => Date.now() - pipelineStart;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");
    const { runPhase } = await import("@/lib/content-pipeline/phases");

    // ─── Step 0: Resolve site ───────────────────────────────────────
    const activeSites = getActiveSiteIds();
    const siteId = options.siteId || activeSites[0];
    if (!siteId) {
      return {
        success: false,
        message: "No active sites configured",
        steps,
        stopReason: "error",
        published: false,
        indexed: false,
        durationMs: elapsed(),
        failureDiagnosis: {
          summary: "No active sites configured — the pipeline has nothing to generate content for.",
          what: "Checking which sites are active and ready for content generation",
          where: "Step 0 — site resolution (before any content work started)",
          why: "All sites in config/sites.ts have status 'planned' or 'paused'. At least one site must be 'active' for the pipeline to generate content.",
          fix: "In config/sites.ts, change the status of at least one site (e.g., yalla-london) from 'planned' to 'active'. Then redeploy.",
          errorDetail: `Active sites found: ${activeSites.length}. All site statuses: ${Object.entries(SITES).map(([id, s]) => `${id}=${s.status}`).join(", ")}`,
          completedBefore: [],
        },
      };
    }

    const site = SITES[siteId];
    if (!site) {
      return {
        success: false,
        message: `Site config not found for "${siteId}"`,
        steps,
        stopReason: "error",
        published: false,
        indexed: false,
        durationMs: elapsed(),
        failureDiagnosis: {
          summary: `Site "${siteId}" not found in configuration.`,
          what: "Looking up the site configuration to know what content to generate",
          where: "Step 0 — site resolution",
          why: `The site ID "${siteId}" doesn't exist in config/sites.ts. Available sites: ${Object.keys(SITES).join(", ")}`,
          fix: `Use one of the configured site IDs: ${Object.keys(SITES).join(", ")}. Or add a new site config for "${siteId}".`,
          errorDetail: `Requested: "${siteId}", available: [${Object.keys(SITES).join(", ")}]`,
          completedBefore: [],
        },
      };
    }

    const locale = options.locale || "en";

    // ─── Step 1: Resolve keyword ────────────────────────────────────
    let keyword = options.keyword || "";
    let topicProposalId: string | null = null;
    let strategy = "full_pipeline_manual";

    if (!keyword) {
      // Try the topic queue first
      try {
        // Find a candidate topic
        const candidate = await prisma.topicProposal.findFirst({
          where: {
            status: { in: ["ready", "queued", "planned", "proposed"] },
            OR: [{ site_id: siteId }, { site_id: null }],
          },
          orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
        });

        if (candidate) {
          // Atomically claim it — only succeeds if status hasn't changed
          // This prevents race conditions where multiple pipelines grab the same topic
          const claimed = await prisma.topicProposal.updateMany({
            where: {
              id: candidate.id,
              status: { in: ["ready", "queued", "planned", "proposed"] },
            },
            data: {
              status: "generating",
              updated_at: new Date(),
            },
          });

          if (claimed.count === 0) {
            // Another process already claimed this topic — fall through to template
            console.log(`[full-pipeline] Topic ${candidate.id} already claimed by another process, using fallback`);
          } else {
            keyword = candidate.primary_keyword;
            topicProposalId = candidate.id;
            strategy = "full_pipeline_topic_db";
          }
        }
      } catch {
        // TopicProposal table may not exist — fall through to template
      }

      // Fallback to template topics
      if (!keyword) {
        const topics = locale === "ar" ? site.topicsAR : site.topicsEN;
        if (!topics || topics.length === 0) {
          return {
            success: false,
            message: "No topics available — no topic proposals in the database and no template topics configured for this site",
            steps,
            stopReason: "no_topic",
            published: false,
            indexed: false,
            siteId,
            durationMs: elapsed(),
            failureDiagnosis: {
              summary: "No topics available for content generation.",
              what: "Looking for a topic/keyword to write an article about",
              where: "Step 1 — topic selection (before any AI work started)",
              why: "The TopicProposal table has no topics with status 'ready'/'queued'/'planned'/'proposed', and the site has no fallback template topics configured.",
              fix: "Either: (1) Click 'Run Weekly Topics' in the dashboard to generate fresh topics, (2) Provide a keyword directly via the API: POST with {\"keyword\": \"your topic here\"}, or (3) Add template topics to the site config in config/sites.ts.",
              errorDetail: `Site: ${siteId}, locale: ${locale}, template topics: ${topics?.length || 0}`,
              completedBefore: [],
            },
          };
        }
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000,
        );
        const topic = topics[dayOfYear % topics.length];
        keyword = topic.keyword;
        strategy = "full_pipeline_template";
      }
    }

    steps.push({
      phase: "topic_selection",
      success: true,
      description: PHASE_DESCRIPTIONS.topic_selection,
      durationMs: elapsed(),
      data: { keyword, strategy, topicProposalId, siteId },
    });

    console.log(`[full-pipeline] Starting: keyword="${keyword}", site=${siteId}, locale=${locale}`);

    // ─── Step 2: Create ArticleDraft ────────────────────────────────
    let draft = await prisma.articleDraft.create({
      data: {
        site_id: siteId,
        keyword,
        locale,
        current_phase: "research",
        topic_proposal_id: topicProposalId,
        generation_strategy: strategy,
        phase_started_at: new Date(),
      },
    });

    let pairedDraft: Record<string, unknown> | null = null;
    if (!options.singleLanguage) {
      const pairedLocale = locale === "en" ? "ar" : "en";
      pairedDraft = await prisma.articleDraft.create({
        data: {
          site_id: siteId,
          keyword,
          locale: pairedLocale,
          current_phase: "research",
          topic_proposal_id: topicProposalId,
          generation_strategy: strategy + "_paired",
          phase_started_at: new Date(),
          paired_draft_id: draft.id,
        },
      });
      await prisma.articleDraft.update({
        where: { id: draft.id },
        data: { paired_draft_id: (pairedDraft as Record<string, unknown>).id as string },
      });
    }

    // Transition topic from "generating" to "generated" now that drafts are created
    if (topicProposalId) {
      await prisma.topicProposal.update({
        where: { id: topicProposalId },
        data: { status: "generated" },
      }).catch((err: unknown) => {
        console.warn(`[full-pipeline] Failed to mark topic ${topicProposalId} as generated:`, err instanceof Error ? err.message : err);
      });
    }

    steps.push({
      phase: "draft_creation",
      success: true,
      description: PHASE_DESCRIPTIONS.draft_creation,
      durationMs: elapsed(),
      data: {
        draftId: draft.id,
        pairedDraftId: pairedDraft ? (pairedDraft as Record<string, unknown>).id : null,
        locale,
      },
    });

    console.log(`[full-pipeline] Created draft ${draft.id} (paired: ${pairedDraft ? (pairedDraft as Record<string, unknown>).id : "none"})`);

    // ─── Step 3: Run all phases in a loop ───────────────────────────
    const PHASE_ORDER = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
    const TERMINAL_PHASES = ["reservoir", "published", "rejected"];

    // Run primary draft through all phases
    let currentPhase = draft.current_phase as string;
    let phaseAttempts = 0;

    while (!TERMINAL_PHASES.includes(currentPhase) && deadline.hasAtLeast(8_000)) {
      const phaseStart = Date.now();

      console.log(`[full-pipeline] Running phase "${currentPhase}" (budget: ${Math.round(deadline.remainingMs() / 1000)}s left)`);

      // Re-fetch draft to get latest state (phases update data fields)
      const freshDraft = await prisma.articleDraft.findUnique({ where: { id: draft.id } });
      if (!freshDraft) {
        steps.push({ phase: currentPhase, success: false, description: PHASE_DESCRIPTIONS[currentPhase] || currentPhase, durationMs: elapsed(), error: "Draft disappeared from database — it may have been deleted by another process" });
        break;
      }

      try {
        const result = await runPhase(freshDraft as any, site, deadline.remainingMs() - 5_000);

        const phaseDuration = Date.now() - phaseStart;

        // Build update data
        const updateData: Record<string, unknown> = { updated_at: new Date() };

        if (result.success) {
          updateData.current_phase = result.nextPhase;
          updateData.phase_attempts = 0;
          updateData.last_error = null;
          updateData.phase_started_at = new Date();

          // Copy all phase output data
          if (result.data.research_data) updateData.research_data = result.data.research_data;
          if (result.data.outline_data) updateData.outline_data = result.data.outline_data;
          if (result.data.sections_data) updateData.sections_data = result.data.sections_data;
          if (result.data.assembled_html) updateData.assembled_html = result.data.assembled_html;
          if (result.data.assembled_html_alt) updateData.assembled_html_alt = result.data.assembled_html_alt;
          if (result.data.seo_meta) updateData.seo_meta = result.data.seo_meta;
          if (result.data.images_data) updateData.images_data = result.data.images_data;
          if (result.data.topic_title) updateData.topic_title = result.data.topic_title;
          if (result.data.sections_total !== undefined) updateData.sections_total = result.data.sections_total;
          if (result.data.sections_completed !== undefined) updateData.sections_completed = result.data.sections_completed;
          if (result.data.quality_score !== undefined) updateData.quality_score = result.data.quality_score;
          if (result.data.seo_score !== undefined) updateData.seo_score = result.data.seo_score;
          if (result.data.word_count !== undefined) updateData.word_count = result.data.word_count;
          if (result.data.readability_score !== undefined) updateData.readability_score = result.data.readability_score;
          if (result.data.content_depth_score !== undefined) updateData.content_depth_score = result.data.content_depth_score;
          if (result.aiModelUsed) updateData.ai_model_used = result.aiModelUsed;

          if (result.nextPhase === "reservoir" || result.nextPhase === "rejected") {
            updateData.completed_at = new Date();
            if (result.nextPhase === "rejected") {
              updateData.rejection_reason = "Quality score below threshold";
            }
          }

          currentPhase = result.nextPhase;
          phaseAttempts = 0;

          steps.push({
            phase: freshDraft.current_phase as string,
            success: true,
            description: `${PHASE_DESCRIPTIONS[freshDraft.current_phase as string] || freshDraft.current_phase} — completed successfully`,
            durationMs: phaseDuration,
            data: {
              nextPhase: result.nextPhase,
              aiModel: result.aiModelUsed,
              ...(result.data.word_count !== undefined ? { wordCount: result.data.word_count } : {}),
              ...(result.data.quality_score !== undefined ? { qualityScore: result.data.quality_score } : {}),
              ...(result.data.seo_score !== undefined ? { seoScore: result.data.seo_score } : {}),
            },
          });
        } else {
          phaseAttempts++;
          updateData.phase_attempts = phaseAttempts;
          updateData.last_error = result.error || "Phase failed";

          if (phaseAttempts >= 3) {
            updateData.current_phase = "rejected";
            updateData.rejection_reason = `Phase "${currentPhase}" failed after 3 attempts: ${result.error}`;
            updateData.completed_at = new Date();
            currentPhase = "rejected";
          }

          steps.push({
            phase: currentPhase,
            success: false,
            description: `${PHASE_DESCRIPTIONS[currentPhase] || currentPhase} — FAILED (attempt ${phaseAttempts}/3)`,
            durationMs: phaseDuration,
            error: result.error || "Phase failed",
          });

          // If phase failed but we have retries left, try again
          if (phaseAttempts < 3 && !deadline.isExpired()) {
            console.log(`[full-pipeline] Phase "${currentPhase}" failed (attempt ${phaseAttempts}/3), retrying...`);
            // Don't change currentPhase — retry
          }
        }

        // Save phase result
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: updateData,
        });
      } catch (phaseErr) {
        const errMsg = phaseErr instanceof Error ? phaseErr.message : String(phaseErr);
        steps.push({
          phase: currentPhase,
          success: false,
          description: `${PHASE_DESCRIPTIONS[currentPhase] || currentPhase} — CRASHED with exception`,
          durationMs: Date.now() - phaseStart,
          error: errMsg,
        });
        console.error(`[full-pipeline] Phase "${currentPhase}" threw:`, errMsg);

        // Save error state
        phaseAttempts++;
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_attempts: phaseAttempts,
            last_error: errMsg,
            updated_at: new Date(),
            ...(phaseAttempts >= 3 ? {
              current_phase: "rejected",
              rejection_reason: `Phase "${currentPhase}" threw after 3 attempts: ${errMsg}`,
              completed_at: new Date(),
            } : {}),
          },
        });

        if (phaseAttempts >= 3) {
          currentPhase = "rejected";
        }
        break;
      }
    }

    // Determine stop reason
    const finalDraft = await prisma.articleDraft.findUnique({ where: { id: draft.id } });
    const finalPhase = (finalDraft?.current_phase as string) || currentPhase;
    const qualityScore = (finalDraft?.quality_score as number) || undefined;
    const seoScore = (finalDraft?.seo_score as number) || undefined;
    const wordCount = (finalDraft?.word_count as number) || undefined;

    if (finalPhase === "rejected") {
      const diagnosis = buildFailureDiagnosis(steps, keyword);

      await logCronExecution("full-pipeline-run", "failed", {
        durationMs: elapsed(),
        errorMessage: diagnosis.summary,
        resultSummary: { keyword, phase: finalPhase, reason: "rejected", diagnosis },
      });

      return {
        success: false,
        message: `Article "${keyword}" rejected — ${diagnosis.summary}`,
        draftId: draft.id,
        pairedDraftId: pairedDraft ? (pairedDraft as Record<string, unknown>).id as string : undefined,
        keyword,
        locale,
        siteId,
        steps,
        stopReason: "error",
        published: false,
        indexed: false,
        qualityScore,
        seoScore,
        wordCount,
        durationMs: elapsed(),
        failureDiagnosis: diagnosis,
      };
    }

    if (finalPhase !== "reservoir" && !TERMINAL_PHASES.includes(finalPhase)) {
      // Budget ran out mid-pipeline
      await logCronExecution("full-pipeline-run", "completed", {
        durationMs: elapsed(),
        resultSummary: { keyword, phase: finalPhase, reason: "budget_exhausted" },
      });

      return {
        success: true,
        message: `Pipeline paused at "${finalPhase}" phase — budget exhausted after ${Math.round(elapsed() / 1000)}s. The regular 15-min cron will continue from here.`,
        draftId: draft.id,
        pairedDraftId: pairedDraft ? (pairedDraft as Record<string, unknown>).id as string : undefined,
        keyword,
        locale,
        siteId,
        steps,
        stopReason: "budget_exhausted",
        published: false,
        indexed: false,
        qualityScore,
        seoScore,
        wordCount,
        durationMs: elapsed(),
      };
    }

    // ─── Step 4: Promote to BlogPost ────────────────────────────────
    let blogPostId: string | undefined;
    let blogPostSlug: string | undefined;
    let blogPostUrl: string | undefined;
    let published = false;
    let indexed = false;

    if (finalPhase === "reservoir" && deadline.hasAtLeast(5_000)) {
      const promoteStart = Date.now();

      try {
        const { runContentSelector } = await import("@/lib/content-pipeline/select-runner");
        const selectResult = await runContentSelector({ timeoutMs: Math.min(deadline.remainingMs() - 3_000, 25_000) });

        if (selectResult.success && selectResult.articles && selectResult.articles.length > 0) {
          const promoted = selectResult.articles.find((a) => a.draftId === draft.id) || selectResult.articles[0];
          blogPostId = promoted.blogPostId;
          published = true;

          // Fetch the BlogPost to get slug
          try {
            const blogPost = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
            if (blogPost) {
              blogPostSlug = blogPost.slug as string;
              blogPostUrl = `${getSiteDomain(siteId)}/blog/${blogPostSlug}`;
            }
          } catch {
            // Non-fatal
          }

          steps.push({
            phase: "publish",
            success: true,
            description: `${PHASE_DESCRIPTIONS.publish} — article is now live`,
            durationMs: Date.now() - promoteStart,
            data: { blogPostId, blogPostSlug, blogPostUrl, articlesPublished: selectResult.published },
          });

          console.log(`[full-pipeline] Published BlogPost ${blogPostId} (slug: ${blogPostSlug})`);
        } else {
          steps.push({
            phase: "publish",
            success: false,
            description: `${PHASE_DESCRIPTIONS.publish} — FAILED`,
            durationMs: Date.now() - promoteStart,
            error: selectResult.message || "Selector did not promote the article",
          });
        }
      } catch (pubErr) {
        const errMsg = pubErr instanceof Error ? pubErr.message : String(pubErr);
        steps.push({
          phase: "publish",
          success: false,
          description: `${PHASE_DESCRIPTIONS.publish} — CRASHED with exception`,
          durationMs: Date.now() - promoteStart,
          error: errMsg,
        });
      }
    }

    // ─── Step 5: Submit to IndexNow ─────────────────────────────────
    if (published && blogPostUrl && deadline.hasAtLeast(3_000)) {
      const indexStart = Date.now();

      try {
        const indexNowKey = process.env.INDEXNOW_KEY;
        if (indexNowKey && blogPostUrl) {
          const submitUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(blogPostUrl)}&key=${indexNowKey}`;
          const resp = await fetch(submitUrl, {
            method: "GET",
            signal: AbortSignal.timeout(5_000),
          });

          indexed = resp.ok || resp.status === 202;

          // Update URLIndexingStatus if it exists
          try {
            await prisma.uRLIndexingStatus.updateMany({
              where: { url: blogPostUrl },
              data: {
                status: indexed ? "submitted" : "failed",
                last_submitted_at: new Date(),
              },
            });
          } catch {
            // Non-fatal
          }

          steps.push({
            phase: "indexing",
            success: indexed,
            description: indexed
              ? `${PHASE_DESCRIPTIONS.indexing} — URL submitted successfully (HTTP ${resp.status})`
              : `${PHASE_DESCRIPTIONS.indexing} — submission returned HTTP ${resp.status}`,
            durationMs: Date.now() - indexStart,
            data: { url: blogPostUrl, indexNowStatus: resp.status, method: "indexnow" },
          });

          console.log(`[full-pipeline] IndexNow submission: ${resp.status} for ${blogPostUrl}`);
        } else {
          steps.push({
            phase: "indexing",
            success: false,
            description: `${PHASE_DESCRIPTIONS.indexing} — skipped, no INDEXNOW_KEY`,
            durationMs: Date.now() - indexStart,
            error: "INDEXNOW_KEY not configured in Vercel environment variables. Add it to enable automatic Google discovery.",
          });
        }
      } catch (indexErr) {
        const errMsg = indexErr instanceof Error ? indexErr.message : String(indexErr);
        steps.push({
          phase: "indexing",
          success: false,
          description: `${PHASE_DESCRIPTIONS.indexing} — FAILED with network error`,
          durationMs: Date.now() - indexStart,
          error: errMsg,
        });
      }
    }

    // ─── Step 6: Run Sweeper — clean up any failures and stuck drafts ──
    if (deadline.hasAtLeast(3_000)) {
      const sweeperStart = Date.now();
      try {
        const { runSweeper } = await import("@/lib/content-pipeline/sweeper");
        const sweeperResult = await runSweeper();

        steps.push({
          phase: "sweeper",
          success: sweeperResult.success,
          description: sweeperResult.recovered.length > 0
            ? `Sweeper agent recovered ${sweeperResult.recovered.length} stuck/failed draft(s), skipped ${sweeperResult.skipped}`
            : "Sweeper agent ran — no stuck or failed drafts to recover",
          durationMs: Date.now() - sweeperStart,
          data: {
            recovered: sweeperResult.recovered.length,
            skipped: sweeperResult.skipped,
            actions: sweeperResult.recovered.map((a) => ({
              keyword: a.keyword,
              problem: a.problem,
              fix: a.fix,
            })),
          },
        });
      } catch (sweepErr) {
        steps.push({
          phase: "sweeper",
          success: false,
          description: "Sweeper agent failed — non-fatal, pipeline results unaffected",
          durationMs: Date.now() - sweeperStart,
          error: sweepErr instanceof Error ? sweepErr.message : String(sweepErr),
        });
      }
    }

    // ─── Final: Log and return ──────────────────────────────────────
    const totalDuration = elapsed();
    const completedPhases = steps.filter((s) => s.success).length;
    const totalPhases = steps.length;

    await logCronExecution("full-pipeline-run", published ? "completed" : "completed", {
      durationMs: totalDuration,
      itemsProcessed: 1,
      itemsSucceeded: published ? 1 : 0,
      resultSummary: {
        keyword,
        siteId,
        draftId: draft.id,
        blogPostId,
        published,
        indexed,
        qualityScore,
        completedPhases,
        totalPhases,
      },
    });

    const statusParts = [];
    if (published) statusParts.push("published");
    if (indexed) statusParts.push("indexed");
    if (!published && finalPhase === "reservoir") statusParts.push("in reservoir (ready to publish)");

    return {
      success: true,
      message: published
        ? `Article "${keyword}" generated, ${statusParts.join(" & ")}! ${completedPhases}/${totalPhases} steps completed in ${Math.round(totalDuration / 1000)}s.`
        : `Article "${keyword}" reached ${finalPhase} phase. ${completedPhases}/${totalPhases} steps completed in ${Math.round(totalDuration / 1000)}s.`,
      draftId: draft.id,
      pairedDraftId: pairedDraft ? (pairedDraft as Record<string, unknown>).id as string : undefined,
      blogPostId,
      blogPostSlug,
      blogPostUrl,
      keyword,
      locale,
      siteId,
      steps,
      stopReason: published ? "completed" : (deadline.isExpired() ? "budget_exhausted" : "completed"),
      published,
      indexed,
      qualityScore,
      seoScore,
      wordCount,
      durationMs: totalDuration,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[full-pipeline] Fatal error:", errMsg);

    // Add a step for the fatal crash
    steps.push({
      phase: "fatal",
      success: false,
      description: "Pipeline crashed with an unrecoverable error before completing",
      durationMs: elapsed(),
      error: errMsg,
    });

    const diagnosis = buildFailureDiagnosis(steps);

    await logCronExecution("full-pipeline-run", "failed", {
      durationMs: elapsed(),
      errorMessage: diagnosis.summary,
    }).catch(() => {});

    return {
      success: false,
      message: `Pipeline crashed: ${errMsg}`,
      steps,
      stopReason: "error",
      published: false,
      indexed: false,
      durationMs: elapsed(),
      failureDiagnosis: diagnosis,
    };
  }
}
