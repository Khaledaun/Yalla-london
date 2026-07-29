/**
 * Daily Events Topics Cron
 *
 * Schedule: 10:00 UTC daily (vercel.json `0 10 * * *`).
 *
 * Generates 2 event-focused topic proposals per site per day. Topics are
 * biased toward live sports / concerts / theatre / festivals in the site's
 * destination, which match the SportsEvents365 affiliate partner (Commit
 * d6be26f) plus existing Tiqets + TicketNetwork programs.
 *
 * The pipeline picks these topics up via the normal content-builder cron
 * — no separate publication path. By the time the article publishes,
 * affiliate-injection has already merged the SportsEvents365 deep links
 * into the tickets-category catch-all, so generated articles ship with
 * live SportsEvents365 affiliate CTAs from day one.
 *
 * Khaled's ask (May 16): "make a campaign to add 2 events per day from
 * this source and add it to our affiliate program."
 *
 * Dedup: skips topic creation for a site if a "daily-events" topic was
 * generated for that site in the last 24h (prevents accidental double-
 * fire on Vercel cron retries).
 *
 * Site filter: only runs for sites whose destination has a SportsEvents365
 * coverage area (London, Istanbul, Bangkok, Maldives, Nice — basically
 * everywhere with a live-events scene). Yacht sites are skipped.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

// Sites that get event topics. zenitha-yachts is excluded — the partner
// isn't a fit for yacht charter content.
const ELIGIBLE_SITES = new Set(["yalla-london", "arabaldives", "french-riviera", "istanbul", "thailand"]);

const TOPICS_PER_SITE = 2;

// Locales generated per site. SiteConfig stores a single `locale` but the
// site rendering supports both `/blog/<slug>` (EN) and `/ar/blog/<slug>` (AR)
// for these bilingual sites — confirmed in CLAUDE.md. AR generation is gated
// per-site so we don't waste budget on sites without Arabic SSR.
const LOCALES: Array<"en" | "ar"> = ["en", "ar"];
const BILINGUAL_SITES = new Set(["yalla-london", "arabaldives"]);

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const startTime = Date.now();

  // Cron auth — standard pattern (allow if CRON_SECRET unset, reject only
  // if set and doesn't match).
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag — can be disabled via DB flag or env var CRON_DAILY_EVENTS_TOPICS=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("daily-events-topics");
  if (flagResponse) return flagResponse;

  const { getActiveSiteIds, getSiteConfig } = await import("@/config/sites");
  const { prisma } = await import("@/lib/db");
  const { generateCompletion } = await import("@/lib/ai/provider");

  const activeSiteIds = getActiveSiteIds().filter((id) => ELIGIBLE_SITES.has(id));
  if (activeSiteIds.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No eligible sites for events topics",
      durationMs: Date.now() - startTime,
    });
  }

  const perSiteResults: Array<{
    siteId: string;
    status: "created" | "skipped_recent" | "skipped_ai_fail" | "failed";
    topicsCreated?: number;
    reason?: string;
    sampleTitles?: string[];
  }> = [];

  let totalCreated = 0;

  for (const siteId of activeSiteIds) {
    try {
      const siteConfig = getSiteConfig(siteId);
      const destination = siteConfig?.destination || "London";
      // Only generate AR topics for sites in our bilingual roster.
      // Other sites get EN only — saves AI budget on monolingual sites.
      const localesForSite: Array<"en" | "ar"> = BILINGUAL_SITES.has(siteId) ? LOCALES : ["en"];

      let siteCreatedTotal = 0;
      const sampleTitlesAll: string[] = [];
      const localeNotes: string[] = [];

      for (const locale of localesForSite) {
        // Dedup PER LOCALE — so AR generation isn't blocked by an EN-only run earlier
        const dedupCutoff = new Date(Date.now() - 22 * 60 * 60 * 1000);
        const recent = await prisma.topicProposal.findFirst({
          where: {
            site_id: siteId,
            locale,
            created_at: { gte: dedupCutoff },
            source_weights_json: { path: ["source"], equals: "daily-events-cron" },
          },
          select: { id: true },
        });
        if (recent) {
          localeNotes.push(`${locale}: skipped (already generated in last 22h)`);
          continue;
        }

        // Locale-specific prompts. AR variants explicitly request Modern Standard
        // Arabic + GCC audience context so titles/keywords ship in fluent Arabic
        // instead of transliterated English.
        const userPrompt =
          locale === "ar"
            ? `أنشئ بالضبط ${TOPICS_PER_SITE} موضوع مقال عن الفعاليات الحية في ${destination} يهم المسافرين العرب الفاخرين. نوّع الفئات: مباريات الدوري الإنجليزي، حفلات موسيقية، عروض مسرح ويست إند، كوميديا، مهرجانات، معارض. فضّل الفعاليات في الـ 30-60 يومًا القادمة؛ اذكر أسماء الفرق/المغنين/العروض عند توفرها.

القيود:
  • يجب أن يكون عنوان كل موضوع بصيغة دليل: "كيف..." أو "أفضل..." أو "أين..." أو "دليل [الفعالية]" أو "تذاكر [الفعالية]". تجنب القوائم البحتة.
  • تجنب المواضيع الدائمة (مثل برج لندن). ركّز على الفعاليات ذات الصلة بتاريخ معين.
  • لكل موضوع أرفق 3 كلمات مفتاحية طويلة و2 كلمات بصيغة سؤال.

أعد فقط مصفوفة JSON المصغّرة هذه — لا نص آخر:
[
  {"title":"...","keyword":"...","longtails":["...","...","..."],"questions":["...","..."],"pageType":"guide","intent":"transactional","rationale":"..."},
  {"title":"...","keyword":"...","longtails":["...","...","..."],"questions":["...","..."],"pageType":"guide","intent":"transactional","rationale":"..."}
]`
            : `Generate exactly ${TOPICS_PER_SITE} timely article topics about LIVE EVENTS in ${destination} that an international luxury traveler would book tickets for. Mix categories: Premier League / football matches, concerts at major venues, West End / theatre shows, comedy, festivals, exhibitions. Prefer events in the next 30–60 days; include named acts/teams/shows when known.

Constraints:
  • Each topic title MUST suggest a guide format: "How to..." OR "Best of..." OR "Where to..." OR "[Event] Guide" OR "Tickets for [Event]". Avoid pure listicles.
  • Avoid topics that are evergreen monuments (e.g., "Tower of London"). Focus on EVENTS with date relevance.
  • For each topic include 3 long-tail keyword variants and 2 question-format keywords.

Return ONLY this minified JSON array — no other text:
[
  {"title":"...","keyword":"...","longtails":["...","...","..."],"questions":["...","..."],"pageType":"guide","intent":"transactional","rationale":"..."},
  {"title":"...","keyword":"...","longtails":["...","...","..."],"questions":["...","..."],"pageType":"guide","intent":"transactional","rationale":"..."}
]`;

        const systemPrompt =
          locale === "ar"
            ? "أنت مخطط تحريري لمنشور سفر فاخر + فعاليات. ترد فقط بمصفوفة JSON مصغّرة — بدون نص توضيحي، بدون علامات ```، بدون شرح."
            : "You are an editorial planner for a luxury travel + events publication. You return ONLY a minified JSON array — no prose, no markdown fences, no explanation.";

        const messages = [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ];

        let aiRaw = "";
        try {
          const aiResp = await generateCompletion(messages, {
            // AR is ~2.5x more token-dense per CLAUDE.md rule #5 — give it room.
            maxTokens: locale === "ar" ? 2200 : 1200,
            taskType: "events-topics-daily",
            calledFrom: `daily-events-topics:${locale}`,
            phaseBudgetHint: "medium",
            timeoutMs: 25_000,
          });
          aiRaw = (aiResp.content || "").trim();
        } catch (aiErr) {
          localeNotes.push(`${locale}: ai_fail (${aiErr instanceof Error ? aiErr.message : String(aiErr)})`);
          continue;
        }

        if (!aiRaw) {
          localeNotes.push(`${locale}: ai_fail (empty response)`);
          continue;
        }

        // Strip code fences and extract first JSON array
        const cleaned = aiRaw
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        const matchJson = cleaned.match(/\[[\s\S]*\]/);
        if (!matchJson) {
          localeNotes.push(`${locale}: ai_fail (no JSON array)`);
          continue;
        }

        let topics: Array<Record<string, unknown>>;
        try {
          topics = JSON.parse(matchJson[0]);
        } catch (parseErr) {
          localeNotes.push(`${locale}: parse_fail (${parseErr instanceof Error ? parseErr.message : parseErr})`);
          continue;
        }

        if (!Array.isArray(topics) || topics.length === 0) {
          localeNotes.push(`${locale}: no topics returned`);
          continue;
        }

        // Validate AR responses contain Arabic-range chars — same guard pattern
        // used in content-auto-fix Section 16b. Catches model refusals that
        // accidentally returned English text in the AR slot.
        if (locale === "ar") {
          const arGuardSample = topics
            .slice(0, 3)
            .map((t) => String(t.title || ""))
            .join(" ");
          if (!/[؀-ۿ]/.test(arGuardSample)) {
            localeNotes.push(`${locale}: skipped (response not Arabic — likely model refusal)`);
            continue;
          }
        }

        // Save each topic as TopicProposal so the content-builder picks it up.
        let localeCreated = 0;
        for (const t of topics.slice(0, TOPICS_PER_SITE)) {
          const title = String(t.title || "").trim();
          const keyword = String(t.keyword || title).trim();
          if (!title || !keyword) continue;
          if (locale === "ar" && !/[؀-ۿ]/.test(title)) continue; // per-topic guard

          const longtails = Array.isArray(t.longtails)
            ? (t.longtails as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 5)
            : [];
          const questions = Array.isArray(t.questions)
            ? (t.questions as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 4)
            : [];

          try {
            await prisma.topicProposal.create({
              data: {
                title,
                primary_keyword: keyword,
                longtails,
                questions,
                intent: "transactional",
                suggested_page_type: "guide",
                locale,
                site_id: siteId,
                status: "ready",
                confidence_score: 0.75,
                evergreen: false,
                source_weights_json: {
                  source: "daily-events-cron",
                  site: siteId,
                  destination,
                  locale,
                  _targetPartner: "sportsevents365",
                },
                authority_links_json: {
                  rationale: String(t.rationale || ""),
                  sources: [],
                },
              },
            });
            localeCreated++;
            siteCreatedTotal++;
            sampleTitlesAll.push(`[${locale}] ${title.slice(0, 70)}`);
          } catch (saveErr) {
            console.warn(
              `[daily-events-topics] save failed for "${title}" (${siteId}, ${locale}):`,
              saveErr instanceof Error ? saveErr.message : saveErr,
            );
          }
        }
        localeNotes.push(`${locale}: created ${localeCreated} topic(s)`);
      }

      totalCreated += siteCreatedTotal;
      perSiteResults.push({
        siteId,
        status: siteCreatedTotal > 0 ? "created" : "skipped_ai_fail",
        topicsCreated: siteCreatedTotal,
        sampleTitles: sampleTitlesAll,
        reason: localeNotes.length > 0 ? localeNotes.join(" | ") : undefined,
      });
    } catch (siteErr) {
      const msg = siteErr instanceof Error ? siteErr.message : String(siteErr);
      perSiteResults.push({ siteId, status: "failed", reason: msg });
      console.warn(`[daily-events-topics] ${siteId} failed:`, msg);
    }
  }

  const duration = Date.now() - startTime;
  const isSuccess = perSiteResults.every((r) => r.status !== "failed");

  await logCronExecution("daily-events-topics", isSuccess ? "completed" : "failed", {
    durationMs: duration,
    itemsProcessed: perSiteResults.length,
    itemsSucceeded: perSiteResults.filter((r) => r.status === "created").length,
    itemsFailed: perSiteResults.filter((r) => r.status === "failed").length,
    errorMessage: isSuccess
      ? undefined
      : perSiteResults
          .filter((r) => r.status === "failed")
          .map((r) => `${r.siteId}: ${r.reason}`)
          .join(" | "),
    resultSummary: {
      totalSites: activeSiteIds.length,
      totalTopicsCreated: totalCreated,
      perSiteResults,
    },
  }).catch((err) =>
    console.warn("[daily-events-topics] logCronExecution failed:", err instanceof Error ? err.message : err),
  );

  return NextResponse.json({
    success: isSuccess,
    durationMs: duration,
    totalSites: activeSiteIds.length,
    totalTopicsCreated: totalCreated,
    perSiteResults,
  });
}
