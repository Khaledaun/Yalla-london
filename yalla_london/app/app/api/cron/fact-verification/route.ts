/**
 * Fact Verification Cron Agent
 *
 * Weekly cron job that:
 * 1. Extracts verifiable facts from information hub articles and blog posts
 * 2. Registers new facts in the FactEntry table
 * 3. Cross-checks pending/due facts against trusted websites:
 *    - tfl.gov.uk (transport), gov.uk (regulations), ons.gov.uk (statistics)
 *    - timeout.com, visitlondon.com, visitbritain.com (authority sources)
 *    - tripadvisor.com, booking.com, wikipedia.org (reference sources)
 * 4. Flags outdated or uncorroborated facts for manual review
 *
 * Verification method: DuckDuckGo search → fetch trusted pages → keyword matching
 * No external API keys required.
 *
 * Schedule: 0 3 * * 0 (3 AM every Sunday via Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  informationArticles as baseInfoArticles,
  informationSections,
} from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";
import { blogPosts } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { logCronExecution } from "@/lib/cron-logger";
import { verifyFactViaWeb } from "@/lib/fact-verification/web-verifier";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

// ---------------------------------------------------------------------------
// Merged article sources
// ---------------------------------------------------------------------------

const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];
const allBlogPosts = [...blogPosts, ...extendedBlogPosts];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FactCategory =
  | "price"
  | "schedule"
  | "address"
  | "contact"
  | "transport"
  | "regulation"
  | "statistic";

interface ExtractedFact {
  text: string;
  category: FactCategory;
  location: string; // paragraph or section hint
}

interface VerificationLogEntry {
  date: string;
  source: string;
  result: "verified" | "outdated" | "unverifiable" | "flagged_for_review";
  notes: string;
}

// ---------------------------------------------------------------------------
// Regex patterns for fact extraction
// ---------------------------------------------------------------------------

const FACT_PATTERNS: { pattern: RegExp; category: FactCategory; label: string }[] = [
  // Prices -- matches currency amounts like GBP 25, 25 pounds, 25.50, etc.
  {
    pattern:
      /(?:(?:GBP|gbp)\s*\d[\d,.]*|\d[\d,.]*\s*(?:pounds?|GBP|gbp|per\s+(?:person|adult|child|night|ticket)))/g,
    category: "price",
    label: "price-gbp-word",
  },

  // ---------------------------------------------------------------------------
  // SCHEDULES & TIMES
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:opens?\s+at|closes?\s+at|opening\s+hours?|hours?\s+of\s+operation|open\s+(?:from|daily|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|closing\s+time)[:\s]*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?(?:\s*[-\u2013]\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)?/gi,
    category: "schedule",
    label: "schedule-hours",
  },
  {
    pattern:
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s*[-\u2013]\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))?\s*(?::\s*)?\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?\s*[-\u2013]\s*\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?/gi,
    category: "schedule",
    label: "schedule-day-range",
  },

  // ---------------------------------------------------------------------------
  // ADDRESSES & POSTCODES  (London postcodes: EC, WC, SW, SE, NW, N, E, W)
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:(?:EC|WC|SW|SE|NW|NE|EN|HA|UB|TW|KT|SM|CR|BR|DA|RM|IG|E|W|N)[0-9]{1,2}[A-Z]?\s+[0-9][A-Z]{2})/g,
    category: "address",
    label: "address-postcode",
  },
  {
    pattern:
      /\d{1,4}\s+(?:[A-Z][a-z]+\s+){0,3}(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Place|Pl|Square|Sq|Terrace|Crescent|Gardens|Gdns|Way|Row|Hill|Court|Ct|Close|Mews|Drive|Dr|Boulevard|Blvd|Circus|Gate|Walk|Passage|Yard),?\s*(?:London)?/g,
    category: "address",
    label: "address-street",
  },

  // ---------------------------------------------------------------------------
  // CONTACT: phone numbers (UK format)
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:\+44\s*\(?0?\)?\s*|0)(?:20\s*\d{4}\s*\d{4}|[1-9]\d{2,4}\s*\d{5,6}|\d{3,4}\s+\d{3,4})/g,
    category: "contact",
    label: "contact-phone",
  },

  // ---------------------------------------------------------------------------
  // TRANSPORT references
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:nearest\s+(?:tube|underground|station|stop)|(?:take|catch|board|use)\s+the\s+(?:tube|bus|train|DLR|Overground|Elizabeth\s+line|Northern\s+line|Central\s+line|Piccadilly\s+line|Jubilee\s+line|Victoria\s+line|Circle\s+line|District\s+line|Hammersmith\s+line|Bakerloo\s+line|Metropolitan\s+line))[^.]*\./gi,
    category: "transport",
    label: "transport-directions",
  },
  {
    pattern:
      /(?:Zone\s+[1-9](?:\s*[-\u2013]\s*[1-9])?|Oyster\s+card|Travelcard|contactless\s+(?:payment|travel))\s+[^.]{0,80}\./gi,
    category: "transport",
    label: "transport-fares",
  },

  // ---------------------------------------------------------------------------
  // REGULATION / VISA / REQUIREMENTS
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:visa[-\s]free\s+for\s+(?:up\s+to\s+)?\d+\s+(?:days?|months?|weeks?)|visa\s+(?:required|not\s+required|on\s+arrival)|ETA\s+(?:system|required|applies)|passport\s+(?:valid\s+for|must\s+be|validity)|entry\s+requirements?)[^.]*\./gi,
    category: "regulation",
    label: "regulation-visa",
  },
  {
    pattern:
      /(?:customs?\s+(?:allowance|limit|declaration)|duty[-\s]free\s+(?:allowance|limit)|VAT\s+refund|tax[-\s]free\s+shopping)[^.]*\./gi,
    category: "regulation",
    label: "regulation-customs",
  },

  // ---------------------------------------------------------------------------
  // STATISTICS & NUMBERS  (avoid matching years alone)
  // ---------------------------------------------------------------------------
  {
    pattern:
      /(?:over|more\s+than|approximately|around|nearly|up\s+to|at\s+least)\s+[\d,]+(?:\.\d+)?\s+(?:million|thousand|billion|visitors?|tourists?|people|passengers?|rooms?|restaurants?|shops?|stores?)/gi,
    category: "statistic",
    label: "statistic-count",
  },
  {
    pattern:
      /(?:ranked|rated)\s+(?:#?\d+|number\s+\d+|first|second|third|top\s+\d+)\s+[^.]{0,60}\./gi,
    category: "statistic",
    label: "statistic-ranking",
  },
];

// ---------------------------------------------------------------------------
// Price pattern with the pound sign (separate to avoid encoding issues)
// ---------------------------------------------------------------------------
const PRICE_POUND_PATTERN =
  /\u00a3\s?\d[\d,.]*(?:\s*(?:[-\u2013]\s*\u00a3?\s?\d[\d,.]*)?(?:\s+(?:per\s+(?:person|adult|child|night|ticket)|each|pp))?)/g;

// ---------------------------------------------------------------------------
// Fact extraction
// ---------------------------------------------------------------------------

/**
 * Extracts verifiable facts from English content of an article.
 * Returns deduplicated facts with category labels.
 */
function extractFacts(
  content: string,
  articleSlug: string,
  articleType: "blog" | "information",
): ExtractedFact[] {
  if (!content || content.length < 50) return [];

  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  // Strip markdown images and links syntax but keep text
  const cleaned = content
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Helper: derive a short location hint from surrounding text
  function locationHint(matchIndex: number): string {
    // Find the nearest preceding heading
    const before = cleaned.slice(0, matchIndex);
    const headingMatch = before.match(/(?:^|\n)#+\s+(.+)/g);
    if (headingMatch && headingMatch.length > 0) {
      const lastHeading = headingMatch[headingMatch.length - 1]
        .replace(/^[\n#]+\s*/, "")
        .trim();
      return lastHeading.slice(0, 80);
    }
    // Fallback: paragraph number estimate
    const paragraphs = before.split(/\n\n+/).length;
    return `paragraph-${paragraphs}`;
  }

  // Helper: add a fact if not already seen
  function addFact(text: string, category: FactCategory, index: number): void {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length < 10 || normalized.length > 500) return;

    const key = `${category}::${normalized.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    facts.push({
      text: normalized,
      category,
      location: locationHint(index),
    });
  }

  // Run all regex patterns
  for (const { pattern, category } of FACT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned)) !== null) {
      // Expand match to sentence boundary for context
      const sentenceStart = cleaned.lastIndexOf(".", match.index - 1);
      const sentenceEnd = cleaned.indexOf(".", match.index + match[0].length);
      const start = sentenceStart >= 0 ? sentenceStart + 1 : match.index;
      const end =
        sentenceEnd >= 0
          ? Math.min(sentenceEnd + 1, start + 500)
          : match.index + match[0].length;
      const sentence = cleaned.slice(start, end).trim();

      // Use the full sentence if reasonably sized, otherwise just the match
      const factText = sentence.length > 10 && sentence.length <= 500 ? sentence : match[0];
      addFact(factText, category, match.index);
    }
  }

  // Pound-sign price pattern (handled separately)
  PRICE_POUND_PATTERN.lastIndex = 0;
  let priceMatch: RegExpExecArray | null;
  while ((priceMatch = PRICE_POUND_PATTERN.exec(cleaned)) !== null) {
    const sentenceStart = cleaned.lastIndexOf(".", priceMatch.index - 1);
    const sentenceEnd = cleaned.indexOf(".", priceMatch.index + priceMatch[0].length);
    const start = sentenceStart >= 0 ? sentenceStart + 1 : priceMatch.index;
    const end =
      sentenceEnd >= 0
        ? Math.min(sentenceEnd + 1, start + 500)
        : priceMatch.index + priceMatch[0].length;
    const sentence = cleaned.slice(start, end).trim();
    const factText =
      sentence.length > 10 && sentence.length <= 500 ? sentence : priceMatch[0];
    addFact(factText, "price", priceMatch.index);
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // ── Authentication ──────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[fact-verification] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET not set" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode — quick DB ping + last run status
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const totalFacts = await prisma.factEntry.count();
      const pendingFacts = await prisma.factEntry.count({ where: { status: "pending" } });
      return NextResponse.json({
        status: "healthy",
        endpoint: "fact-verification",
        totalFacts,
        pendingFacts,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "fact-verification" },
        { status: 503 },
      );
    }
  }

  const { prisma, disconnectDatabase } = await import("@/lib/db");
  const startTime = Date.now();

  // ── Metrics ─────────────────────────────────────────────────────────
  let factsExtracted = 0;
  let newFactsRegistered = 0;
  let factsVerified = 0;
  let factsFlaggedOutdated = 0;
  let articlesScanned = 0;
  let errors: string[] = [];

  try {
    console.log("[fact-verification] Starting weekly fact verification run");

    // ──────────────────────────────────────────────────────────────────
    // PHASE 1: Extract facts from all content sources
    // ──────────────────────────────────────────────────────────────────

    const allFacts: Array<ExtractedFact & { articleSlug: string; articleType: "blog" | "information" }> = [];

    // Process information hub articles
    for (const article of allInfoArticles) {
      if (!article.published) continue;
      const extracted = extractFacts(article.content_en, article.slug, "information");
      for (const fact of extracted) {
        allFacts.push({ ...fact, articleSlug: article.slug, articleType: "information" });
      }
      articlesScanned++;
    }

    // Process information hub sections (subsection content)
    for (const section of informationSections) {
      if (!section.published) continue;
      if (!section.subsections || !Array.isArray(section.subsections)) continue;
      for (const sub of section.subsections) {
        const extracted = extractFacts(sub.content_en, section.slug, "information");
        for (const fact of extracted) {
          allFacts.push({ ...fact, articleSlug: section.slug, articleType: "information" });
        }
      }
      articlesScanned++;
    }

    // Process blog posts
    for (const post of allBlogPosts) {
      if (!post.published) continue;
      const extracted = extractFacts(post.content_en, post.slug, "blog");
      for (const fact of extracted) {
        allFacts.push({ ...fact, articleSlug: post.slug, articleType: "blog" });
      }
      articlesScanned++;
    }

    factsExtracted = allFacts.length;
    console.log(
      `[fact-verification] Extracted ${factsExtracted} facts from ${articlesScanned} articles`,
    );

    // ──────────────────────────────────────────────────────────────────
    // PHASE 2: Register new facts in FactEntry table
    // ──────────────────────────────────────────────────────────────────

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all existing facts in one query for efficient dedup
    const existingFacts = await prisma.factEntry.findMany({
      select: {
        id: true,
        article_slug: true,
        fact_text_en: true,
      },
    });

    const existingFactKeys = new Set(
      existingFacts.map((f) => `${f.article_slug}::${f.fact_text_en}`),
    );

    // Batch-create new facts
    const newFacts = allFacts.filter(
      (f) => !existingFactKeys.has(`${f.articleSlug}::${f.text}`),
    );

    if (newFacts.length > 0) {
      // Process in batches of 50 to avoid oversized queries
      const BATCH_SIZE = 50;
      for (let i = 0; i < newFacts.length; i += BATCH_SIZE) {
        const batch = newFacts.slice(i, i + BATCH_SIZE);
        try {
          const result = await prisma.factEntry.createMany({
            data: batch.map((f) => ({
              article_type: f.articleType,
              article_slug: f.articleSlug,
              fact_text_en: f.text,
              fact_location: f.location,
              category: f.category,
              status: "pending",
              confidence_score: 0,
              next_check_at: sevenDaysFromNow,
              original_value: f.text,
              current_value: f.text,
            })),
            skipDuplicates: true,
          });
          newFactsRegistered += result.count;
        } catch (batchError) {
          const msg = batchError instanceof Error ? batchError.message : String(batchError);
          console.error(`[fact-verification] Batch insert error: ${msg}`);
          errors.push(`Batch insert error at offset ${i}: ${msg}`);
        }
      }

      console.log(
        `[fact-verification] Registered ${newFactsRegistered} new facts`,
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // PHASE 3: Verify pending and due facts
    // ──────────────────────────────────────────────────────────────────

    const dueFacts = await prisma.factEntry.findMany({
      where: {
        OR: [
          { status: "pending" },
          {
            next_check_at: {
              lte: now,
            },
          },
        ],
      },
      take: 30, // Cap per run — each fact involves web searches + page fetches
      orderBy: [
        { verification_count: "asc" }, // Prioritise never-verified facts
        { next_check_at: "asc" },
      ],
    });

    console.log(
      `[fact-verification] Found ${dueFacts.length} facts due for verification`,
    );

    for (const fact of dueFacts) {
      // Rate limit: small delay between web verification requests to avoid throttling
      if (factsVerified > 0 && factsVerified % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Time guard: stop if approaching maxDuration
      if (Date.now() - startTime > 240_000) {
        // 4 min safety margin (web fetches are slower than placeholder)
        console.warn("[fact-verification] Approaching time limit, stopping verification loop");
        break;
      }

      try {
        // ── Web-based cross-verification ────────────────────────────
        // Searches trusted websites (tfl.gov.uk, gov.uk, timeout.com,
        // visitlondon.com, etc.) and checks if the fact is corroborated
        // by multiple independent sources.
        const verificationResult = await verifyFactViaWeb(fact);

        // Build the updated verification log
        const existingLog: VerificationLogEntry[] = Array.isArray(fact.verification_log)
          ? (fact.verification_log as unknown as VerificationLogEntry[])
          : [];

        const newLogEntry: VerificationLogEntry = {
          date: now.toISOString(),
          source: verificationResult.source,
          result: verificationResult.result,
          notes: verificationResult.notes,
        };

        const updatedLog = [...existingLog, newLogEntry];

        // Determine new status
        let newStatus = fact.status;
        let newConfidence = verificationResult.confidence;

        if (verificationResult.result === "outdated") {
          newStatus = "outdated";
          factsFlaggedOutdated++;
        } else if (verificationResult.result === "verified") {
          newStatus = "verified";
        } else if (verificationResult.result === "flagged_for_review") {
          newStatus = "flagged_for_review";
          factsFlaggedOutdated++; // Count flagged facts too for reporting
        }
        // "unverifiable" keeps the current status — will be retried next run

        // Schedule next check based on confidence
        // High confidence → check again in 14 days; low → recheck in 3 days
        const nextCheckDays = newConfidence >= 70 ? 14 : newConfidence >= 50 ? 7 : 3;
        const nextCheckAt = new Date(now.getTime() + nextCheckDays * 24 * 60 * 60 * 1000);

        await prisma.factEntry.update({
          where: { id: fact.id },
          data: {
            status: newStatus,
            confidence_score: newConfidence,
            last_verified_at: now,
            next_check_at: nextCheckAt,
            verification_count: { increment: 1 },
            verification_log: updatedLog as unknown as any,
            agent_notes: verificationResult.notes,
          },
        });

        factsVerified++;
      } catch (verifyError) {
        const msg = verifyError instanceof Error ? verifyError.message : String(verifyError);
        console.error(`[fact-verification] Verification error for fact ${fact.id}: ${msg}`);
        errors.push(`Verify error (${fact.id}): ${msg}`);
      }
    }

    console.log(
      `[fact-verification] Verified ${factsVerified} facts, flagged ${factsFlaggedOutdated} outdated`,
    );

    // ──────────────────────────────────────────────────────────────────
    // PHASE 4: Log the cron run
    // ──────────────────────────────────────────────────────────────────

    const durationMs = Date.now() - startTime;

    await logCronExecution("fact-verification", "completed", {
      durationMs,
      itemsProcessed: factsVerified,
      itemsSucceeded: factsVerified - factsFlaggedOutdated,
      itemsFailed: errors.length,
      resultSummary: {
        articlesScanned,
        factsExtracted,
        newFactsRegistered,
        factsVerified,
        factsFlaggedOutdated,
        errorsCount: errors.length,
      },
    });

    // ── Response ────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      job: "fact-verification",
      durationMs,
      metrics: {
        articles_scanned: articlesScanned,
        facts_extracted: factsExtracted,
        new_facts_registered: newFactsRegistered,
        facts_verified: factsVerified,
        facts_flagged_outdated: factsFlaggedOutdated,
        errors: errors.length,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[fact-verification] Fatal error:", error);

    await logCronExecution("fact-verification", "failed", {
      durationMs,
      itemsProcessed: factsVerified,
      itemsSucceeded: 0,
      itemsFailed: 1,
      errorMessage,
      resultSummary: {
        articlesScanned,
        factsExtracted,
        newFactsRegistered,
        factsVerified,
        factsFlaggedOutdated,
        errorMessage,
      },
    });

    return NextResponse.json(
      {
        success: false,
        job: "fact-verification",
        error: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
        durationMs,
        metrics: {
          articles_scanned: articlesScanned,
          facts_extracted: factsExtracted,
          new_facts_registered: newFactsRegistered,
          facts_verified: factsVerified,
          facts_flagged_outdated: factsFlaggedOutdated,
          errors: errors.length,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  } finally {
    // Release PgBouncer session connection — critical for Supabase session mode
    // where connections are held for the entire session lifetime.
    await disconnectDatabase().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Web verification engine is in lib/fact-verification/web-verifier.ts
// Cross-checks facts against tfl.gov.uk, gov.uk, timeout.com,
// visitlondon.com, tripadvisor.com, ons.gov.uk, etc.
// ---------------------------------------------------------------------------

// POST handler — supports both GET and POST for Vercel cron compatibility
export async function POST(request: NextRequest) {
  return GET(request);
}
